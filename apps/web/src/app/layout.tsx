import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LADY·AR — Soluções Acústicas Inteligentes",
  description: "Plataforma de design acústico assistido por IA — Lady.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
