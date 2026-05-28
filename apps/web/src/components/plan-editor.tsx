"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Stage,
  Layer,
  Image as KImage,
  Rect,
  Line,
  Group,
  Text as KText,
  Transformer,
} from "react-konva";
import type Konva from "konva";
import { saveCanvasState } from "@/app/(app)/projects/editor-actions";
import {
  type CanvasState,
  type CanvasElement,
  EMPTY_CANVAS,
} from "@/lib/editor-types";

type Product = {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  nrc: number | null;
  width_m: number | null;
  height_m: number | null;
  symbol_svg_url: string | null;
  icon_url: string | null;
};

type Mode = "select" | "calibrate";

const STAGE_W = 900;
const STAGE_H = 600;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function useHtmlImage(url: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) {
      setImg(null);
      return;
    }
    const im = new window.Image();
    im.crossOrigin = "anonymous";
    im.src = url;
    im.onload = () => setImg(im);
    return () => {
      im.onload = null;
    };
  }, [url]);
  return img;
}

// Rasteriza uma página do PDF em dataURL PNG. pdfjs-dist é importado dinamicamente
// pra não pesar o bundle inicial. Worker via CDN cdnjs.
async function rasterizePdfPage(
  pdfData: ArrayBuffer,
  pageNum: number
): Promise<{ dataUrl: string; w: number; h: number; totalPages: number }> {
  const pdfjs: typeof import("pdfjs-dist") = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" +
      pdfjs.version +
      "/pdf.worker.min.mjs";
  }
  // slice(0) pra clonar — pdfjs pode consumir o ArrayBuffer
  const doc = await pdfjs.getDocument({ data: pdfData.slice(0) }).promise;
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2 }); // 2x para nitidez no canvas
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sem contexto 2D");
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const dataUrl = canvas.toDataURL("image/png");
  const totalPages = doc.numPages;
  await doc.destroy();
  return { dataUrl, w: viewport.width, h: viewport.height, totalPages };
}

export function PlanEditor({
  projectId,
  products,
  initialState,
}: {
  projectId: string;
  products: Product[];
  initialState: CanvasState | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<CanvasState>(
    initialState ?? EMPTY_CANVAS
  );
  const [mode, setMode] = useState<Mode>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [calibPts, setCalibPts] = useState<number[]>([]);

  // PDF: mantemos o ArrayBuffer em memória (não persistido) pra trocar de página
  // sem o usuário precisar re-carregar o arquivo. Ao reabrir o projeto, o
  // background.image_url já tem o PNG da página renderizada — suficiente.
  const [pdfBuf, setPdfBuf] = useState<ArrayBuffer | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotal, setPdfTotal] = useState(1);
  const [pdfBusy, setPdfBusy] = useState(false);

  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);

  const bgImage = useHtmlImage(state.background?.image_url ?? null);

  const bgInputRef = useRef<HTMLInputElement>(null);

  async function loadPdfPage(buf: ArrayBuffer, page: number) {
    setPdfBusy(true);
    try {
      const { dataUrl, w, h, totalPages } = await rasterizePdfPage(buf, page);
      setState((s) => ({
        ...s,
        background: {
          image_url: dataUrl,
          natural_width: w,
          natural_height: h,
        },
      }));
      setPdfTotal(totalPages);
      setPdfPage(page);
    } catch (err) {
      alert("Falha ao ler PDF: " + (err as Error).message);
    } finally {
      setPdfBusy(false);
    }
  }

  async function onBackgroundFile(file: File) {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      const buf = await file.arrayBuffer();
      setPdfBuf(buf);
      await loadPdfPage(buf, 1);
      return;
    }
    // imagem (PNG/JPG/WEBP)
    setPdfBuf(null);
    setPdfTotal(1);
    setPdfPage(1);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const im = new window.Image();
      im.onload = () => {
        setState((s) => ({
          ...s,
          background: {
            image_url: dataUrl,
            natural_width: im.naturalWidth,
            natural_height: im.naturalHeight,
          },
        }));
      };
      im.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  async function changePdfPage(delta: number) {
    if (!pdfBuf || pdfBusy) return;
    const next = Math.min(pdfTotal, Math.max(1, pdfPage + delta));
    if (next === pdfPage) return;
    await loadPdfPage(pdfBuf, next);
  }

  // ---- escala ----
  const pxPerM = state.scale?.px_per_m ?? null;

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (mode === "calibrate") {
      const next = [...calibPts, pos.x, pos.y];
      if (next.length === 4) {
        // dois pontos definidos → pergunta a medida real
        const dx = next[2] - next[0];
        const dy = next[3] - next[1];
        const distPx = Math.sqrt(dx * dx + dy * dy);
        const input = window.prompt(
          "Qual a medida real desta linha em metros?",
          "5"
        );
        const realM = input ? parseFloat(input.replace(",", ".")) : NaN;
        if (Number.isFinite(realM) && realM > 0 && distPx > 0) {
          setState((s) => ({
            ...s,
            scale: {
              px_per_m: distPx / realM,
              calib_line: { x1: next[0], y1: next[1], x2: next[2], y2: next[3] },
              real_m: realM,
            },
          }));
        }
        setCalibPts([]);
        setMode("select");
      } else {
        setCalibPts(next);
      }
      return;
    }

    // clique no vazio deseleciona
    if (e.target === stage || e.target.name() === "bg") {
      setSelectedId(null);
    }
  }

  // ---- drop da biblioteca ----
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const productId = e.dataTransfer.getData("product_id");
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (!pxPerM) {
      alert("Calibre a escala antes de posicionar produtos.");
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.container().getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const el: CanvasElement = {
      id: uid(),
      product_id: product.id,
      name: product.name,
      x,
      y,
      rotation: 0,
      w_m: product.width_m ?? 1,
      h_m: product.height_m ?? 1,
      symbol_svg_url: product.symbol_svg_url,
      icon_url: product.icon_url,
      price: product.price,
      nrc: product.nrc,
    };
    setState((s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedId(el.id);
  }

  // ---- transformer segue seleção ----
  useEffect(() => {
    const tr = trRef.current;
    const layer = layerRef.current;
    if (!tr || !layer) return;
    if (!selectedId) {
      tr.nodes([]);
      return;
    }
    const node = layer.findOne("#" + selectedId);
    if (node) tr.nodes([node]);
    else tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedId, state.elements]);

  function updateElement(id: string, patch: Partial<CanvasElement>) {
    setState((s) => ({
      ...s,
      elements: s.elements.map((el) =>
        el.id === id ? { ...el, ...patch } : el
      ),
    }));
  }

  function deleteElement(id: string) {
    setState((s) => ({
      ...s,
      elements: s.elements.filter((el) => el.id !== id),
    }));
    setSelectedId(null);
  }

  const save = useCallback(async () => {
    setSaving(true);
    const { error } = await saveCanvasState(projectId, state);
    setSaving(false);
    if (error) alert(error);
    else {
      setSavedAt(new Date().toLocaleTimeString("pt-BR"));
      router.refresh();
    }
  }, [projectId, state, router]);

  // tecla Delete remove selecionado
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if ((ev.key === "Delete" || ev.key === "Backspace") && selectedId) {
        const tag = (ev.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        deleteElement(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const totalCost = state.elements.reduce(
    (sum, el) => sum + (el.price ?? 0),
    0
  );

  return (
    <div className="flex gap-4">
      {/* biblioteca lateral */}
      <aside className="w-56 shrink-0">
        <h3 className="mb-2 text-xs uppercase tracking-wide text-muted">
          Biblioteca
        </h3>
        <div className="flex flex-col gap-2">
          {products.length === 0 && (
            <p className="text-xs text-muted">
              Nenhum produto no catálogo. Cadastre em Admin · Produtos.
            </p>
          )}
          {products.map((p) => (
            <div
              key={p.id}
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData("product_id", p.id)
              }
              className="flex cursor-grab items-center gap-2 rounded-lg border border-border bg-surface p-2 hover:border-gold active:cursor-grabbing"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-ink">
                {p.icon_url || p.symbol_svg_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.icon_url ?? p.symbol_svg_url ?? ""}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-[9px] text-muted">—</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-paper">{p.name}</p>
                <p className="text-[10px] text-muted">
                  {p.width_m && p.height_m
                    ? `${p.width_m}×${p.height_m} m`
                    : "sem dimensão"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* canvas + toolbar */}
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            ref={bgInputRef}
            type="file"
            accept="application/pdf,.pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onBackgroundFile(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => bgInputRef.current?.click()}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:text-paper"
          >
            {state.background
              ? "Trocar planta"
              : "Carregar planta (PDF, PNG, JPG)"}
          </button>

          {/* seletor de página do PDF */}
          {pdfBuf && pdfTotal > 1 && (
            <div className="flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted">
              <button
                onClick={() => changePdfPage(-1)}
                disabled={pdfPage <= 1 || pdfBusy}
                className="px-1 text-gold hover:opacity-80 disabled:opacity-30"
                aria-label="Página anterior"
              >
                ‹
              </button>
              <span className="min-w-[110px] text-center">
                {pdfBusy
                  ? "Renderizando…"
                  : `Página ${pdfPage} de ${pdfTotal}`}
              </span>
              <button
                onClick={() => changePdfPage(+1)}
                disabled={pdfPage >= pdfTotal || pdfBusy}
                className="px-1 text-gold hover:opacity-80 disabled:opacity-30"
                aria-label="Próxima página"
              >
                ›
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setMode(mode === "calibrate" ? "select" : "calibrate");
              setCalibPts([]);
            }}
            className={
              "rounded-md border px-3 py-1.5 text-xs " +
              (mode === "calibrate"
                ? "border-gold bg-gold text-ink"
                : "border-gold text-gold hover:bg-gold hover:text-ink")
            }
          >
            {mode === "calibrate" ? "Clique 2 pontos…" : "Calibrar escala"}
          </button>
          {pxPerM && (
            <span className="text-xs text-acoustic-green">
              Escala: {pxPerM.toFixed(1)} px/m
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-gold">
              Orçamento parcial: R${" "}
              {totalCost.toLocaleString("pt-BR")}
            </span>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-gold px-4 py-1.5 text-xs font-medium text-ink hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
        {savedAt && (
          <p className="mb-2 text-[11px] text-muted">Salvo às {savedAt}</p>
        )}

        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="inline-block rounded-xl border border-border bg-ink"
        >
          <Stage
            ref={stageRef}
            width={STAGE_W}
            height={STAGE_H}
            onMouseDown={handleStageClick}
          >
            <Layer ref={layerRef}>
              {/* fundo */}
              {bgImage && (
                <KImage
                  image={bgImage}
                  name="bg"
                  width={STAGE_W}
                  height={
                    state.background
                      ? (STAGE_W * state.background.natural_height) /
                        state.background.natural_width
                      : STAGE_H
                  }
                  listening={mode !== "calibrate"}
                />
              )}

              {/* linha de calibração salva */}
              {state.scale?.calib_line && (
                <Line
                  points={[
                    state.scale.calib_line.x1,
                    state.scale.calib_line.y1,
                    state.scale.calib_line.x2,
                    state.scale.calib_line.y2,
                  ]}
                  stroke="#BD9B60"
                  strokeWidth={2}
                  dash={[6, 4]}
                />
              )}

              {/* linha de calibração em progresso */}
              {calibPts.length === 2 && (
                <Line
                  points={[calibPts[0], calibPts[1], calibPts[0], calibPts[1]]}
                  stroke="#BD9B60"
                  strokeWidth={2}
                />
              )}

              {/* elementos posicionados */}
              {pxPerM &&
                state.elements.map((el) => {
                  const wPx = el.w_m * pxPerM;
                  const hPx = el.h_m * pxPerM;
                  const selected = el.id === selectedId;
                  return (
                    <Group
                      key={el.id}
                      id={el.id}
                      x={el.x}
                      y={el.y}
                      rotation={el.rotation}
                      draggable={mode === "select"}
                      onClick={() => setSelectedId(el.id)}
                      onTap={() => setSelectedId(el.id)}
                      onDragEnd={(e) =>
                        updateElement(el.id, {
                          x: e.target.x(),
                          y: e.target.y(),
                        })
                      }
                      onTransformEnd={(e) => {
                        const node = e.target;
                        const scaleX = node.scaleX();
                        const scaleY = node.scaleY();
                        node.scaleX(1);
                        node.scaleY(1);
                        updateElement(el.id, {
                          x: node.x(),
                          y: node.y(),
                          rotation: node.rotation(),
                          w_m: Math.max(0.05, (wPx * scaleX) / pxPerM),
                          h_m: Math.max(0.05, (hPx * scaleY) / pxPerM),
                        });
                      }}
                    >
                      <Rect
                        width={wPx}
                        height={hPx}
                        fill="rgba(189,155,96,0.25)"
                        stroke={selected ? "#BD9B60" : "#6FB58A"}
                        strokeWidth={selected ? 2 : 1}
                        cornerRadius={2}
                      />
                      <KText
                        text={el.name}
                        fontSize={10}
                        fill="#F7F6F2"
                        width={wPx}
                        align="center"
                        y={Math.max(0, hPx / 2 - 6)}
                        listening={false}
                      />
                    </Group>
                  );
                })}

              <Transformer
                ref={trRef}
                rotateEnabled
                enabledAnchors={[
                  "top-left",
                  "top-right",
                  "bottom-left",
                  "bottom-right",
                ]}
              />
            </Layer>
          </Stage>
        </div>

        {/* painel do elemento selecionado */}
        {selectedId && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs">
            {(() => {
              const el = state.elements.find((e) => e.id === selectedId);
              if (!el) return null;
              return (
                <>
                  <span className="text-paper">{el.name}</span>
                  <span className="text-muted">
                    {el.w_m.toFixed(2)}×{el.h_m.toFixed(2)} m
                  </span>
                  {el.price != null && (
                    <span className="text-gold">
                      R$ {el.price.toLocaleString("pt-BR")}
                    </span>
                  )}
                  <button
                    onClick={() => deleteElement(el.id)}
                    className="ml-auto rounded-md border border-border px-2 py-1 text-acoustic-rose hover:opacity-80"
                  >
                    Remover
                  </button>
                </>
              );
            })()}
          </div>
        )}

        {!pxPerM && state.background && (
          <p className="mt-3 text-xs text-gold">
            Calibre a escala (clique em "Calibrar escala" e marque uma medida
            conhecida) para começar a posicionar produtos.
          </p>
        )}
      </div>
    </div>
  );
}
