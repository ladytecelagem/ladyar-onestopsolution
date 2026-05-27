// Parser PDF :: extrai texto consolidado de todas as páginas usando unpdf.
// unpdf é a versão otimizada do pdfjs-dist para ambientes serverless
// (Vercel/Cloudflare). Server-only — não importar no client.
//
// Limites honestos:
// - Extrai apenas TEXTO (cotas, anotações, legendas, áreas escritas).
// - Não vetoriza desenho — geometria real do PDF vetorial é fase futura.
// - PDFs escaneados (imagem) não retornam texto — precisariam de OCR.

export type ParsedPdf = {
  pages: number;
  raw_text: string;
  // texto separado por página (útil para localizar onde algo aparece)
  page_texts: string[];
};

export async function parsePdf(buffer: ArrayBuffer): Promise<ParsedPdf> {
  // import dinâmico para que o bundle do server só carregue unpdf quando
  // realmente precisar (parsing é um caminho frio)
  const { extractText, getDocumentProxy } = await import("unpdf");

  // unpdf aceita Uint8Array
  const doc = await getDocumentProxy(new Uint8Array(buffer));

  // extractText com mergePages=false devolve texto por página
  const result = await extractText(doc, { mergePages: false });
  const pageTexts: string[] = Array.isArray(result.text)
    ? result.text
    : [String(result.text ?? "")];

  return {
    pages: result.totalPages ?? pageTexts.length,
    raw_text: pageTexts.join("\n"),
    page_texts: pageTexts,
  };
}
