// Parser DXF minimal :: extrai pontos das entidades 2D e textos (TEXT, MTEXT).
// DXF é texto ASCII em pares (código\nvalor\n).
// - Geometria: LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC → bounding box + área
//   de polilinha fechada quando houver
// - Textos: TEXT (code 1) e MTEXT (code 1, possivelmente com formatação)
//   → coletados em `texts[]` para detecção de legendas e áreas

export type ParsedDxf = {
  width_m: number;
  height_m: number;
  area_m2: number;
  bbox_area_m2: number;
  polygon_area_m2: number | null;
  units: "m" | "mm" | "cm" | "unknown";
  entity_count: number;
  texts: string[]; // textos brutos encontrados na planta
};

type Pt = { x: number; y: number };

const IGNORED_LAYERS_FOR_GEOMETRY = new Set([
  "DEFPOINTS",
  "VIEWPORT",
  "DIMENSIONS",
  "DIMS",
  "COTAS",
]);

function tokenize(text: string): { code: number; value: string }[] {
  const lines = text.split(/\r?\n/);
  const out: { code: number; value: string }[] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i].trim(), 10);
    const value = lines[i + 1] ?? "";
    if (!Number.isNaN(code)) out.push({ code, value });
  }
  return out;
}

function polygonArea(pts: Pt[]): number {
  if (pts.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

// remove formatação inline do MTEXT: "{\fArial|i0|b0;texto}" → "texto"
function cleanMText(raw: string): string {
  return raw
    .replace(/\\[A-Za-z]+[^;]*;/g, "")
    .replace(/[{}]/g, "")
    .replace(/\\P/g, " ")
    .trim();
}

export function parseDxf(text: string): ParsedDxf {
  const tokens = tokenize(text);
  const allPoints: Pt[] = [];
  const closedPolylines: Pt[][] = [];
  const texts: string[] = [];
  let entityCount = 0;

  let i = 0;
  while (i < tokens.length) {
    const tk = tokens[i];
    if (tk.code === 0 && tk.value === "SECTION") {
      i++;
      continue;
    }
    if (tk.code !== 0) {
      i++;
      continue;
    }

    const ent = tk.value;
    const props: { code: number; value: string }[] = [];
    i++;
    while (i < tokens.length && tokens[i].code !== 0) {
      props.push(tokens[i]);
      i++;
    }

    const layer =
      props.find((p) => p.code === 8)?.value?.toUpperCase() ?? "";

    // ----- Textos -----
    if (ent === "TEXT" || ent === "MTEXT") {
      const raw = props.find((p) => p.code === 1)?.value ?? "";
      const cleaned = ent === "MTEXT" ? cleanMText(raw) : raw.trim();
      if (cleaned) texts.push(cleaned);
      continue;
    }

    // ----- Geometria: pula camadas de cotas/auxiliares -----
    if (IGNORED_LAYERS_FOR_GEOMETRY.has(layer)) continue;

    if (ent === "LINE") {
      const x1 = +(props.find((p) => p.code === 10)?.value ?? "NaN");
      const y1 = +(props.find((p) => p.code === 20)?.value ?? "NaN");
      const x2 = +(props.find((p) => p.code === 11)?.value ?? "NaN");
      const y2 = +(props.find((p) => p.code === 21)?.value ?? "NaN");
      if ([x1, y1, x2, y2].every(Number.isFinite)) {
        allPoints.push({ x: x1, y: y1 }, { x: x2, y: y2 });
        entityCount++;
      }
    } else if (ent === "LWPOLYLINE") {
      const verts: Pt[] = [];
      for (let j = 0; j < props.length; j++) {
        if (props[j].code === 10) {
          const x = +props[j].value;
          const ny = j + 1 < props.length ? props[j + 1] : null;
          const y = ny && ny.code === 20 ? +ny.value : NaN;
          if (Number.isFinite(x) && Number.isFinite(y))
            verts.push({ x, y });
        }
      }
      const flag = +(props.find((p) => p.code === 70)?.value ?? "0");
      const closed = (flag & 1) === 1;
      if (verts.length) {
        allPoints.push(...verts);
        if (closed && verts.length >= 3) closedPolylines.push(verts);
        entityCount++;
      }
    } else if (ent === "POLYLINE") {
      const flag = +(props.find((p) => p.code === 70)?.value ?? "0");
      const closed = (flag & 1) === 1;
      const verts: Pt[] = [];
      while (i < tokens.length && tokens[i].code === 0) {
        if (tokens[i].value === "SEQEND") {
          i++;
          break;
        }
        if (tokens[i].value === "VERTEX") {
          i++;
          let vx = NaN,
            vy = NaN;
          while (i < tokens.length && tokens[i].code !== 0) {
            if (tokens[i].code === 10) vx = +tokens[i].value;
            else if (tokens[i].code === 20) vy = +tokens[i].value;
            i++;
          }
          if (Number.isFinite(vx) && Number.isFinite(vy))
            verts.push({ x: vx, y: vy });
        } else {
          break;
        }
      }
      if (verts.length) {
        allPoints.push(...verts);
        if (closed && verts.length >= 3) closedPolylines.push(verts);
        entityCount++;
      }
    } else if (ent === "CIRCLE" || ent === "ARC") {
      const cx = +(props.find((p) => p.code === 10)?.value ?? "NaN");
      const cy = +(props.find((p) => p.code === 20)?.value ?? "NaN");
      const r = +(props.find((p) => p.code === 40)?.value ?? "NaN");
      if ([cx, cy, r].every(Number.isFinite)) {
        allPoints.push(
          { x: cx - r, y: cy - r },
          { x: cx + r, y: cy + r }
        );
        entityCount++;
      }
    }
  }

  if (allPoints.length === 0) {
    return {
      width_m: 0,
      height_m: 0,
      area_m2: 0,
      bbox_area_m2: 0,
      polygon_area_m2: null,
      units: "unknown",
      entity_count: 0,
      texts,
    };
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of allPoints) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const rawW = maxX - minX;
  const rawH = maxY - minY;

  const refDim = Math.max(rawW, rawH);
  let scale = 1;
  let units: ParsedDxf["units"] = "m";
  if (refDim > 1000) {
    scale = 0.001;
    units = "mm";
  } else if (refDim > 100) {
    scale = 0.01;
    units = "cm";
  } else if (refDim <= 0) {
    units = "unknown";
  }

  const width = rawW * scale;
  const height = rawH * scale;
  const bboxArea = width * height;

  let polyArea: number | null = null;
  if (closedPolylines.length > 0) {
    const areas = closedPolylines
      .map((poly) => polygonArea(poly) * scale * scale)
      .filter((a) => a > 0);
    if (areas.length) polyArea = Math.max(...areas);
  }

  const area = polyArea ?? bboxArea;
  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    width_m: round(width),
    height_m: round(height),
    area_m2: round(area),
    bbox_area_m2: round(bboxArea),
    polygon_area_m2: polyArea != null ? round(polyArea) : null,
    units,
    entity_count: entityCount,
    texts,
  };
}
