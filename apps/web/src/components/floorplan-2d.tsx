"use client";

import { useEffect, useRef } from "react";

// Visualização 2D :: render esquemático do ambiente + mapa de tratamento.
// A sala é aproximada como quadrada (lado = sqrt(area)), coerente com a engine
// acústica. Os marcadores indicam onde aplicar o tratamento recomendado.

type Props = {
  areaM2: number;
  treatedAreaM2: number; // área de material acústico recomendada
  categoryLabel: string;
};

// cores da marca (lidas via CSS vars com fallback)
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

export function Floorplan2D({ areaM2, treatedAreaM2, categoryLabel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = 600;
    const H = 380;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);

    const gold = cssVar("--color-acoustic-green", "#6FB58A");
    const treat = cssVar("--color-gold", "#BD9B60");
    const line = "#3a4a44";
    const label = "#8a9a92";

    ctx.clearRect(0, 0, W, H);

    // lado real da sala (m) e proporção de tratamento
    const side = Math.sqrt(Math.max(areaM2, 1));
    const treatRatio = Math.min(
      1,
      treatedAreaM2 / Math.max(areaM2, 1)
    );

    // retângulo da sala centralizado, escala para caber no canvas
    const pad = 60;
    const maxDim = Math.min(W, H) - pad * 2;
    const px = maxDim; // sala quadrada
    const x0 = (W - px) / 2;
    const y0 = (H - px) / 2;

    // piso
    ctx.fillStyle = "#1a2620";
    ctx.fillRect(x0, y0, px, px);

    // tratamento: faixas ao longo das paredes proporcionais ao treatRatio
    const bandW = (px / 2) * Math.sqrt(treatRatio);
    ctx.fillStyle = treat + "55";
    // faixa superior e inferior
    ctx.fillRect(x0, y0, px, bandW * 0.5);
    ctx.fillRect(x0, y0 + px - bandW * 0.5, px, bandW * 0.5);
    // faixa esquerda e direita
    ctx.fillRect(x0, y0, bandW * 0.5, px);
    ctx.fillRect(x0 + px - bandW * 0.5, y0, bandW * 0.5, px);

    // contorno da sala
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, px, px);

    // grade interna sutil
    ctx.strokeStyle = line;
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
      const gx = x0 + (px / 4) * i;
      ctx.beginPath();
      ctx.moveTo(gx, y0);
      ctx.lineTo(gx, y0 + px);
      ctx.stroke();
      const gy = y0 + (px / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x0, gy);
      ctx.lineTo(x0 + px, gy);
      ctx.stroke();
    }

    // marcadores de tratamento nas paredes
    const dots = Math.max(4, Math.round(treatRatio * 16));
    ctx.fillStyle = treat;
    for (let i = 0; i < dots; i++) {
      const t = (i + 0.5) / dots;
      const r = 4;
      // distribui ao redor do perímetro
      const perim = t * 4;
      let mx = x0,
        my = y0;
      if (perim < 1) {
        mx = x0 + perim * px;
        my = y0;
      } else if (perim < 2) {
        mx = x0 + px;
        my = y0 + (perim - 1) * px;
      } else if (perim < 3) {
        mx = x0 + px - (perim - 2) * px;
        my = y0 + px;
      } else {
        mx = x0;
        my = y0 + px - (perim - 3) * px;
      }
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // cota: lado da sala
    ctx.fillStyle = label;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(side.toFixed(1) + " m", x0 + px / 2, y0 - 14);
    ctx.save();
    ctx.translate(x0 - 16, y0 + px / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(side.toFixed(1) + " m", 0, 0);
    ctx.restore();

    // legenda
    ctx.textAlign = "left";
    ctx.fillStyle = treat;
    ctx.fillRect(x0, y0 + px + 20, 12, 12);
    ctx.fillStyle = label;
    ctx.fillText(
      categoryLabel + " — tratamento sugerido",
      x0 + 18,
      y0 + px + 30
    );
  }, [areaM2, treatedAreaM2, categoryLabel]);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-ink p-4">
      <canvas ref={canvasRef} />
      <p className="mt-2 text-xs text-muted">
        Planta esquemática — ambiente aproximado como quadrado. O contorno real
        virá do parsing do arquivo CAD em uma próxima fase.
      </p>
    </div>
  );
}
