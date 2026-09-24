"use client";

/*
  Ekstraksi teks dari file DI BROWSER (tanpa upload/penyimpanan server).
  Ide: "sekali pilih file → langsung jadi teks" lalu teks itu yang dikirim ke
  AI untuk generate/impor soal. Nol biaya storage.
  Mendukung PDF (berbasis teks) dan .txt. PDF hasil scan (gambar) tidak
  menghasilkan teks — perlu OCR (belum didukung).
*/

export function isSupportedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "application/pdf" ||
    file.type === "text/plain" ||
    name.endsWith(".pdf") ||
    name.endsWith(".txt")
  );
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.type === "text/plain" || name.endsWith(".txt")) {
    return (await file.text()).trim();
  }
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    return extractPdfText(file);
  }
  throw new Error("Format tidak didukung. Gunakan file PDF atau TXT.");
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Worker dari CDN yang versinya persis sama dengan paket terpasang.
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);
  }
  await pdf.destroy();

  return pages.join("\n\n").replace(/[ \t]+/g, " ").trim();
}
