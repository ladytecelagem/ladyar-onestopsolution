// Utilitários de texto :: normalização e extração de áreas em m²

// normaliza um texto para matching tolerante:
// - lowercase
// - remove acentos
// - remove espaços, hífens, underscores e pontuação leve
// - útil para que "PA-60", "pa 60", "Pa60" virem todos "pa60"
export function normalizeText(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\-_.,;:/\\|]/g, "")
    .trim();
}

// extrai valores de área (m²) anotados em texto livre
// aceita: "120 m²", "120m2", "45,5 m2", "78.3 m²", "AREA: 200"
const AREA_REGEX = /(\d+(?:[.,]\d+)?)\s*(?:m\s*[²2]|metros?\s*quadrados?)/gi;

export function extractAreas(texts: string[]): number[] {
  const found = new Set<number>();
  for (const t of texts) {
    let m: RegExpExecArray | null;
    AREA_REGEX.lastIndex = 0;
    while ((m = AREA_REGEX.exec(t)) !== null) {
      const num = parseFloat(m[1].replace(",", "."));
      if (Number.isFinite(num) && num > 0 && num < 100000) found.add(num);
    }
  }
  return Array.from(found).sort((a, b) => b - a);
}
