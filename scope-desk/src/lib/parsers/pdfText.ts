// pdf-parse (via pdfjs-dist) normally loads its worker as a separate chunk,
// which Next's bundler can't resolve at runtime in this server context.
// pdfjs-dist's "fake worker" path checks globalThis.pdfjsWorker first, so we
// preload the worker's exports into the main thread once, up front, and skip
// the broken dynamic import entirely.
let workerReady: Promise<void> | null = null;
function ensurePdfWorkerLoaded(): Promise<void> {
  if (!workerReady) {
    workerReady = import("pdfjs-dist/legacy/build/pdf.worker.mjs").then((mod) => {
      (globalThis as any).pdfjsWorker = mod;
    });
  }
  return workerReady;
}

/** Extracts the full text layer of a PDF. Returns "" for scanned/image-only PDFs. */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  await ensurePdfWorkerLoaded();
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}
