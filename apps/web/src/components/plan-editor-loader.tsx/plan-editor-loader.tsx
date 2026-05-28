"use client";

import dynamic from "next/dynamic";
import type { CanvasState } from "@/lib/editor-types";

// Konva usa <canvas> e window — só pode renderizar no cliente (ssr: false)
const PlanEditor = dynamic(
  () => import("./plan-editor").then((m) => m.PlanEditor),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted">Carregando editor…</p>
    ),
  }
);

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

export function PlanEditorLoader(props: {
  projectId: string;
  products: Product[];
  initialState: CanvasState | null;
}) {
  return <PlanEditor {...props} />;
}
