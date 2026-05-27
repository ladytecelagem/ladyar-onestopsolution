// Engine acústica :: cálculo de RT60 (Sabine), score e metas por ambiente
// RT60 = 0.161 * V / A   (V em m³, A = absorção equivalente em m² sabines)
// O briefing (Fase Briefing) refina o cálculo: pé-direito real, materiais das
// superfícies, ocupação e uso. Sem briefing, usa defaults por tipo de ambiente.

export type RoomType =
  | "open_office"
  | "meeting_room"
  | "call_room"
  | "cafeteria"
  | "reception"
  | "auditorium";

// ---- defaults por tipo de ambiente (usados quando não há briefing) ----

const CEILING_HEIGHT: Record<RoomType, number> = {
  open_office: 2.8,
  meeting_room: 2.8,
  call_room: 2.6,
  cafeteria: 3.2,
  reception: 3.0,
  auditorium: 4.5,
};

export const RT60_TARGET: Record<RoomType, number> = {
  open_office: 0.5,
  meeting_room: 0.6,
  call_room: 0.4,
  cafeteria: 0.8,
  reception: 0.7,
  auditorium: 1.0,
};

// absorção média de uma sala "nua" típica (fallback sem briefing)
const BARE_ALPHA_DEFAULT = 0.12;

// absorção média das superfícies após tratamento acústico Lady
const TREATED_ALPHA = 0.35;

// ---- briefing :: respostas do levantamento acústico ----

export type Briefing = {
  ceiling_height_m?: number; // pé-direito real
  floor?: "carpete" | "vinilico" | "madeira" | "porcelanato";
  walls?: "muito_vidro" | "misto" | "alvenaria";
  ceiling?: "gesso" | "mineral" | "laje_exposta";
  occupancy?: number; // nº de pessoas
  usage?: "foco" | "colaboracao" | "misto";
  complaint?: "eco" | "vazamento" | "ruido_externo" | "sem_queixa";
  budget?: "baixo" | "medio" | "alto";
};

// coeficiente de absorção de cada material de superfície (médio, banda de fala)
const FLOOR_ALPHA = {
  carpete: 0.25,
  vinilico: 0.06,
  madeira: 0.08,
  porcelanato: 0.04,
};
const WALL_ALPHA = {
  muito_vidro: 0.05,
  misto: 0.09,
  alvenaria: 0.07,
};
const CEILING_ALPHA = {
  gesso: 0.07,
  mineral: 0.55, // forro mineral já é bom absorvedor
  laje_exposta: 0.04,
};

// absorção equivalente de uma pessoa sentada (m² sabine)
const PERSON_ABSORPTION = 0.45;

// ajuste do RT60 alvo conforme o uso do espaço
const USAGE_TARGET_FACTOR = {
  foco: 0.85, // ambiente de foco pede RT60 mais curto
  colaboracao: 1.1,
  misto: 1.0,
};

export type AcousticResult = {
  volume_m3: number;
  rt60_before: number;
  rt60_after: number;
  rt60_target: number;
  score_before: number; // 0-100
  score_after: number; // 0-100
  treated_area_m2: number; // área de material acústico recomendada
  used_briefing: boolean; // true se o cálculo usou dados do briefing
};

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// área total de superfícies internas (paredes + teto + piso)
// aproxima a sala como quadrada: lado = sqrt(area)
function surfaceArea(floorArea: number, height: number): number {
  const side = Math.sqrt(floorArea);
  const walls = 4 * side * height;
  return walls + 2 * floorArea;
}

// score 0-100: 100 = RT60 no alvo; cai conforme se afasta
function scoreFromRt60(rt60: number, target: number): number {
  const diff = Math.abs(rt60 - target);
  const score = 100 - (diff / target) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function analyzeRoom(
  floorAreaM2: number,
  roomType: RoomType,
  briefing?: Briefing | null
): AcousticResult {
  const b = briefing ?? null;
  const usedBriefing = !!b;

  // pé-direito: do briefing se informado, senão default por tipo
  const height =
    b?.ceiling_height_m && b.ceiling_height_m > 0
      ? b.ceiling_height_m
      : CEILING_HEIGHT[roomType];

  const volume = floorAreaM2 * height;
  const side = Math.sqrt(floorAreaM2);
  const wallArea = 4 * side * height;
  const totalSurface = surfaceArea(floorAreaM2, height);

  // RT60 alvo: default por tipo, ajustado pelo uso (se houver briefing)
  let target = RT60_TARGET[roomType];
  if (b?.usage) target = target * USAGE_TARGET_FACTOR[b.usage];
  target = round(target);

  // absorção da sala "nua"
  let absorptionBefore: number;
  if (b && (b.floor || b.walls || b.ceiling)) {
    // soma ponderada por superfície usando os materiais do briefing
    const fA = b.floor ? FLOOR_ALPHA[b.floor] : BARE_ALPHA_DEFAULT;
    const wA = b.walls ? WALL_ALPHA[b.walls] : BARE_ALPHA_DEFAULT;
    const cA = b.ceiling ? CEILING_ALPHA[b.ceiling] : BARE_ALPHA_DEFAULT;
    absorptionBefore =
      floorAreaM2 * fA + wallArea * wA + floorAreaM2 * cA;
  } else {
    absorptionBefore = totalSurface * BARE_ALPHA_DEFAULT;
  }

  // pessoas absorvem som — soma à condição atual
  if (b?.occupancy && b.occupancy > 0) {
    absorptionBefore += b.occupancy * PERSON_ABSORPTION;
  }

  const rt60Before = (0.161 * volume) / absorptionBefore;

  // área de tratamento p/ atingir o RT60 alvo
  const targetAbsorption = (0.161 * volume) / target;
  const extraAbsorptionNeeded = Math.max(
    0,
    targetAbsorption - absorptionBefore
  );
  const treatedArea = extraAbsorptionNeeded / (TREATED_ALPHA - BARE_ALPHA_DEFAULT);

  const absorptionAfter =
    absorptionBefore + treatedArea * (TREATED_ALPHA - BARE_ALPHA_DEFAULT);
  const rt60After = (0.161 * volume) / absorptionAfter;

  return {
    volume_m3: round(volume),
    rt60_before: round(rt60Before),
    rt60_after: round(rt60After),
    rt60_target: target,
    score_before: scoreFromRt60(rt60Before, target),
    score_after: scoreFromRt60(rt60After, target),
    treated_area_m2: round(treatedArea),
    used_briefing: usedBriefing,
  };
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

// a queixa do briefing pode sobrepor a categoria recomendada
const COMPLAINT_CATEGORY: Record<string, string> = {
  eco: "paineis",
  vazamento: "divisorias",
  ruido_externo: "revestimentos",
};

export function recommendedCategory(
  roomType: RoomType,
  briefing?: Briefing | null
): string {
  if (briefing?.complaint && briefing.complaint !== "sem_queixa") {
    return COMPLAINT_CATEGORY[briefing.complaint] ?? RECOMMENDED_CATEGORY[roomType];
  }
  return RECOMMENDED_CATEGORY[roomType];
}
