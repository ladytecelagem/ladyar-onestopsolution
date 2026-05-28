// Tipos do estado do editor de planta (canvas_state em projects)

export type CanvasScale = {
  px_per_m: number; // pixels por metro (calibrado)
  calib_line: { x1: number; y1: number; x2: number; y2: number } | null;
  real_m: number; // medida real informada para a linha de calibração
};

export type CanvasBackground = {
  image_url: string; // dataURL ou URL pública da imagem de fundo
  natural_width: number;
  natural_height: number;
};

export type CanvasElement = {
  id: string; // uuid local
  product_id: string;
  name: string;
  x: number; // posição no canvas (px)
  y: number;
  rotation: number; // graus
  w_m: number; // dimensão física (m) — vira px via escala
  h_m: number;
  symbol_svg_url: string | null;
  icon_url: string | null;
  price: number | null;
  nrc: number | null;
};

export type CanvasState = {
  background: CanvasBackground | null;
  scale: CanvasScale | null;
  elements: CanvasElement[];
};

export const EMPTY_CANVAS: CanvasState = {
  background: null,
  scale: null,
  elements: [],
};
