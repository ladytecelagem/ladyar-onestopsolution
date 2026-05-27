// Engine acústica :: cálculo de RT60 (Sabine), score e metas por ambiente
// Referência: RT60 = 0.161 * V / A   (V em m³, A = área de absorção equivalente em m² sabines)

export type RoomType =
  | "open_office"
  | "meeting_room"
  | "call_room"
  | "cafeteria"
  | "reception"
  | "auditorium";

// pé-direito padrão estimado por tipo de ambiente (m)
const CEILING_HEIGHT: Record<RoomType, number> = {
  open_office: 2.8,
  meeting_room: 2.8,
  call_room: 2.6,
  cafeteria: 3.2,
  reception: 3.0,
  auditorium: 4.5,
};

// RT60 alvo (s) por tipo de ambiente — faixa ideal de conforto acústico
export const RT60_TARGET: Record<RoomType, number> = {
  open_office: 0.5,
  meeting_room: 0.6,
  call_room: 0.4,
  cafeteria: 0.8,
  reception: 0.7,
  auditorium: 1.0,
};

// coeficiente de absorção médio de uma sala "nua" (sem tratamento)
// vidro, drywall, laje, piso duro — ambiente reverberante típico
const BARE_ALPHA = 0.12;

// coeficiente médio das superfícies após tratamento acústico Lady
const TREATED_ALPHA = 0.35;

export type AcousticResult = {
  volume_m3: number;
  rt60_before: number;
  rt60_after: number;
  rt60_target: number;
  score_before: number; // 0-100
  score_after: number; // 0-100
  treated_area_m2: number; // área de material acústico recomendada
};

// área total de superfícies internas (paredes + teto + piso) a partir da planta
function surfaceArea(floorArea: number, height: number): number {
  // aproxima a sala como quadrada: lado = sqrt(area)
  const side = Math.sqrt(floorArea);
  const walls = 4 * side * height;
  return walls + 2 * floorArea; // paredes + teto + piso
}

// score 0-100: 100 = RT60 exatamente no alvo; cai conforme se afasta
function scoreFromRt60(rt60: number, target: number): number {
  const diff = Math.abs(rt60 - target);
  const score = 100 - (diff / target) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function analyzeRoom(
  floorAreaM2: number,
  roomType: RoomType
): AcousticResult {
  const height = CEILING_HEIGHT[roomType];
  const volume = floorAreaM2 * height;
  const totalSurface = surfaceArea(floorAreaM2, height);
  const target = RT60_TARGET[roomType];

  // RT60 antes do tratamento
  const absorptionBefore = totalSurface * BARE_ALPHA;
  const rt60Before = (0.161 * volume) / absorptionBefore;

  // área de tratamento necessária para atingir o RT60 alvo
  // A_total_alvo = 0.161 * V / RT60_alvo
  const targetAbsorption = (0.161 * volume) / target;
  const extraAbsorptionNeeded = Math.max(
    0,
    targetAbsorption - absorptionBefore
  );
  // material acústico adiciona (TREATED_ALPHA - BARE_ALPHA) por m²
  const treatedArea = extraAbsorptionNeeded / (TREATED_ALPHA - BARE_ALPHA);

  // RT60 depois: aplica o material recomendado
  const absorptionAfter =
    absorptionBefore + treatedArea * (TREATED_ALPHA - BARE_ALPHA);
  const rt60After = (0.161 * volume) / absorptionAfter;

  return {
    volume_m3: round(volume),
    rt60_before: round(rt60Before),
    rt60_after: round(rt60After),
    rt60_target: target,
    score_before: scoreFromRt60(rt60Before, target),
    score_after: scoreFromRt60(rt60After, target),
    treated_area_m2: round(treatedArea),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// categoria de produto recomendada por tipo de ambiente
export const RECOMMENDED_CATEGORY: Record<RoomType, string> = {
  open_office: "baffles",
  meeting_room: "paineis",
  call_room: "phone_booths",
  cafeteria: "nuvens",
  reception: "revestimentos",
  auditorium: "paineis",
};
