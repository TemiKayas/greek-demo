/**
 * Enhanced PDF Extraction with Page-Level Metadata
 *
 * This extractor provides:
 * - Page-by-page text extraction with page numbers
 * - Image detection and extraction from PDF pages
 * - Section/heading detection for better chunking
 * - Metadata preservation for citations
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { createWorker } from 'tesseract.js';
import { createCanvas, Canvas, CanvasRenderingContext2D } from 'canvas';

// Configure worker for PDF.js
if (typeof window === 'undefined') {
  // Server-side: Use the worker from the package
  // Using dynamic import to avoid TypeScript error
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
}

export interface PDFPage {
  pageNumber: number;
  text: string;
  hasImages: boolean;
  images: PDFImage[];
  metadata: {
    width: number;
    height: number;
    rotation: number;
  };
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
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
  };
  fullText: string;
}

/**
 * Perform OCR on a PDF, page by page, to ensure accurate text-to-page mapping.
 */
async function ocrPdf(pdf: pdfjsLib.PDFDocumentProxy): Promise<{ fullText: string; pages: PDFPage[] }> {
  console.log('[PDF Extractor] Performing page-by-page OCR on PDF...');
  const worker = await createWorker('eng');
  let fullText = '';
  const pages: PDFPage[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    console.log(`[PDF Extractor] OCR on page ${pageNum}/${pdf.numPages}...`);
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR quality

    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    await page.render({
      canvasContext: context as any,
      viewport,
      canvas: canvas as any,
    }).promise;

    const pageImageBuffer = canvas.toBuffer('image/png');
    const result = await worker.recognize(pageImageBuffer);

    const pageText = result.data.text;
    fullText += `\n\n=== Page ${pageNum} ===\n\n${pageText}`;
    pages.push({
      pageNumber: pageNum,
      text: pageText,
      hasImages: false, // OCR doesn't distinguish images, but we could add this later
      images: [],
      metadata: {
        width: viewport.width,
        height: viewport.height,
        rotation: viewport.rotation,
      },
    });
    page.cleanup();
  }

  await worker.terminate();
  console.log('[PDF Extractor] Page-by-page OCR complete.');
  return { fullText, pages };
}

/**
 * Extract text and metadata from PDF buffer, page by page
 */
export async function extractPDFWithPages(
  buffer: Buffer
): Promise<PDFExtractionResult> {
  try {
    console.log('[PDF Extractor] Starting PDF extraction...');

    // Load PDF document
    const typedArray = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data: typedArray,
      useSystemFonts: true,
      disableFontFace: false,
    });

    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    console.log(`[PDF Extractor] Loaded PDF with ${totalPages} pages`);

    // Extract metadata
    const metadata = await pdf.getMetadata();
    const info = metadata.info as { [key: string]: string } | undefined;
    const pdfMetadata = {
      title: info?.Title as string | undefined,
      author: info?.Author as string | undefined,
      subject: info?.Subject as string | undefined,
      keywords: info?.Keywords as string | undefined,
    };

    // Extract each page
    const pages: PDFPage[] = [];
    let fullText = '';

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });

      console.log(`[PDF Extractor] Extracting page ${pageNum}/${totalPages}...`);

      // Extract text content
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => {
          if ('str' in item) {
            return (item as TextItem).str;
          }
          return '';
        })
        .join(' ')
        .trim();

      const hasImages = await detectImages(page);
      const images: PDFImage[] = [];

      // If the page has images, extract the whole page for vision analysis.
      if (hasImages) {
        console.log(`[PDF Extractor] Extracting image from page ${pageNum} for vision analysis...`);
        const imageData = await extractImagesFromPage(page);
        images.push({
          pageNumber: pageNum,
          data: new Uint8Array(imageData),
          width: viewport.width,
          height: viewport.height,
          mimeType: 'image/png',
        });
      }

      const pdfPage: PDFPage = {
        pageNumber: pageNum,
        text: pageText,
        hasImages: images.length > 0,
        images: images,
        metadata: {
          width: viewport.width,
          height: viewport.height,
          rotation: viewport.rotation,
        },
      };

      pages.push(pdfPage);
      fullText += `\n\n=== Page ${pageNum} ===\n\n${pageText}`;

      // Clean up page resources
      page.cleanup();
    }

    console.log(`[PDF Extractor] Initial extraction complete: ${fullText.length} characters`);

    // Check if extracted text is minimal (likely a scanned PDF)
    if (fullText.trim().length < 100) {
      console.log('[PDF Extractor] Minimal text detected (< 100 characters). Suspected scanned PDF.');
      console.log('[PDF Extractor] Attempting page-by-page OCR fallback...');

      // Use OCR to extract text from scanned PDF
      const ocrResult = await ocrPdf(pdf);

      // Overwrite pages and fullText with OCR results
      pages.length = 0;
      pages.push(...ocrResult.pages);
      fullText = ocrResult.fullText;

      console.log(`[PDF Extractor] OCR complete: ${fullText.length} characters extracted`);
    }

    console.log(`[PDF Extractor] Extraction complete: ${fullText.length} characters`);

    return {
      pages,
      totalPages,
      metadata: pdfMetadata,
      fullText: fullText.trim(),
    };
  } catch (error) {
    console.error('[PDF Extractor] Error extracting PDF:', error);
    throw new Error(`Failed to extract PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Detect if a page contains images (simplified detection)
 */
async function detectImages(page: pdfjsLib.PDFPageProxy): Promise<boolean> {
  try {
    const ops = await page.getOperatorList();

    // Check for image-drawing operations
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      // 85 = paintImageXObject, 86 = paintInlineImageXObject
      if (fn === 85 || fn === 86) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[PDF Extractor] Error detecting images:', error);
    return false;
  }
}

/**
 * Renders a single PDF page to a canvas and extracts it as a PNG image buffer.
 * This is used to generate images for vision model analysis.
 */
export async function extractImagesFromPage(
  page: pdfjsLib.PDFPageProxy
): Promise<Buffer> {
  const viewport = page.getViewport({ scale: 1.5 }); // Use a reasonable scale for quality

  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  await page.render({
    canvasContext: context as any,
    viewport,
    canvas: canvas as any,
  }).promise;

  return canvas.toBuffer('image/png');
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
