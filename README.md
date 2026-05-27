# ladyar-onestopsolution

SaaS de soluções acústicas com IA — Lady.

## Stack
Next.js 15 · React 19 · TS · Tailwind v4 · shadcn/ui · Supabase · Railway · Vercel

## Estrutura
- apps/web — frontend Next.js
- services/* — microsserviços (cad-parser, acoustic-engine, ai-engine, render-engine)
- packages/config — config compartilhada

## Rodar local
pnpm install
cp .env.example apps/web/.env.local   # preencher
pnpm dev
