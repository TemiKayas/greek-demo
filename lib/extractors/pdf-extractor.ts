import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { createWorker } from 'tesseract.js';
import { convertPdfToImage } from './poppler-wrapper';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

// Configure worker for PDF.js
if (typeof window === 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
}

// Interfaces (assuming they are defined as before)
export interface PDFPage {
  pageNumber: number;
  text: string;
  hasImages: boolean;
  images: PDFImage[];
  metadata: any;
}
export interface PDFImage {
  pageNumber: number;
  data: Uint8Array;
  width: number;
  height: number;
  mimeType: string;
}
export interface PDFExtractionResult {
  pages: PDFPage[];
  totalPages: number;
  metadata: any;
  fullText: string;
}

async function ocrPdfPage(pdfFilePath: string, pageNum: number): Promise<string> {
  console.log(`[PDF Extractor] OCR on page ${pageNum} via pdf-poppler...`);

  // Use absolute path for tesseract worker in Node.js environment
  const workerPath = path.resolve(process.cwd(), 'node_modules', 'tesseract.js', 'src', 'worker-script', 'node', 'index.js');

  const worker = await createWorker('eng', 1, {
    workerPath: workerPath,
  });

  const outPrefix = `pdf_page_ocr_${Date.now()}`;
  const options = {
    format: 'png' as const,
    out_dir: os.tmpdir(),
    out_prefix: outPrefix,
    page: pageNum,
  };

  await convertPdfToImage(pdfFilePath, options);

  // Construct the expected output file path (pdftocairo names it as prefix-pagenum.png)
  const imagePath = path.join(os.tmpdir(), `${outPrefix}-${pageNum}.png`);

  const { data: { text } } = await worker.recognize(imagePath);

  await fs.unlink(imagePath);
  await worker.terminate();

  return text;
}

export async function extractPDFWithPages(buffer: Buffer): Promise<PDFExtractionResult> {
  const tempFilePath = path.join(os.tmpdir(), `temp_pdf_${Date.now()}.pdf`);
  await fs.writeFile(tempFilePath, buffer);

  try {
    const typedArray = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({ data: typedArray, useSystemFonts: true });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    const metadata = await pdf.getMetadata();
    const info = metadata.info as { [key: string]: string } | undefined;
    const pdfMetadata = {
      title: info?.Title,
      author: info?.Author,
      subject: info?.Subject,
      keywords: info?.Keywords,
    };

    let pages: PDFPage[] = [];
    let fullText = '';

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });

      const textContent = await page.getTextContent();
      let pageText = textContent.items.map(item => (item as TextItem).str || '').join(' ').trim();

      // If text is minimal, perform OCR for this page
      if (pageText.length < 100) {
        console.log(`[PDF Extractor] Minimal text on page ${pageNum}. Performing OCR.`);
        pageText = await ocrPdfPage(tempFilePath, pageNum);
      }

      fullText += `\n\n=== Page ${pageNum} ===\n\n${pageText}`;

      const images: PDFImage[] = [];
      const hasImages = await detectImages(page);
      if (hasImages) {
        console.log(`[PDF Extractor] Extracting image from page ${pageNum} via system Poppler...`);
        const outPrefix = `pdf_page_vision_${Date.now()}`;
        const options = {
          format: 'png' as const,
          out_dir: os.tmpdir(),
          out_prefix: outPrefix,
          page: pageNum,
        };
        await convertPdfToImage(tempFilePath, options);

        // Construct the expected output file path (pdftocairo names it as prefix-pagenum.png)
        const imagePath = path.join(os.tmpdir(), `${outPrefix}-${pageNum}.png`);
        const imageData = await fs.readFile(imagePath);
        images.push({
          pageNumber: pageNum,
          data: new Uint8Array(imageData),
          width: viewport.width,
          height: viewport.height,
          mimeType: 'image/png',
        });
        await fs.unlink(imagePath);
      }

      pages.push({
        pageNumber: pageNum,
        text: pageText,
        hasImages: images.length > 0,
        images,
        metadata: { width: viewport.width, height: viewport.height, rotation: viewport.rotation },
      });
      page.cleanup();
    }

    return { pages, totalPages, metadata: pdfMetadata, fullText: fullText.trim() };
  } catch (error) {
    console.error('[PDF Extractor] Error extracting PDF:', error);
    throw new Error(`Failed to extract PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await fs.unlink(tempFilePath); // Ensure temp file is always deleted
  }
}

async function detectImages(page: pdfjsLib.PDFPageProxy): Promise<boolean> {
  const ops = await page.getOperatorList();
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
      return true;
    }
  }
  return false;
}

/**
 * Detect section headings in text (heuristic-based)
 * Looks for patterns like:
 * - ALL CAPS headings
 * - "Chapter X"
 * - Numbered sections (1. 2. 3. or 1.1, 1.2, etc.)
 */
export function detectSectionHeading(text: string): string | null {
  const lines = text.split('\n').map((line) => line.trim());

  for (const line of lines.slice(0, 3)) {
    // Check first 3 lines
    // Skip empty lines
    if (!line) continue;

    // All caps line (likely a heading)
    if (line === line.toUpperCase() && line.length > 3 && line.length < 100) {
      return line;
    }

    // Chapter heading
    if (/^(chapter|section|part)\s+\d+/i.test(line)) {
      return line;
    }

    // Numbered section
    if (/^(\d+\.)+\s+[A-Z]/.test(line)) {
      return line;
    }
  }

  return null;
}
