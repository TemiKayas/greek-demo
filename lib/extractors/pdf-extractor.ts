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
    const info = metadata.info as Record<string, unknown> | undefined;
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

      // Detect images (simplified - check for image operators in page content)
      const hasImages = await detectImages(page);

      const pdfPage: PDFPage = {
        pageNumber: pageNum,
        text: pageText,
        hasImages,
        images: [], // Image extraction can be added later if needed
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
 * Extract images from a specific PDF page (advanced feature)
 * This requires canvas and is more resource-intensive
 */
export async function extractImagesFromPage(
  buffer: Buffer,
  pageNumber: number
): Promise<string | null> {
  try {
    const typedArray = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({ data: typedArray });
    const pdf = await loadingTask.promise;

    if (pageNumber > pdf.numPages) {
      return null;
    }

    const page = await pdf.getPage(pageNumber);

    // Render page to canvas and extract as image
    // This is a simplified version - full implementation would require canvas setup
    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality

    // For now, return null - full image extraction requires canvas setup
    // which is complex in Node.js environment
    console.log(`[PDF Extractor] Image extraction from page ${pageNumber} requested`);
    console.log(`[PDF Extractor] Full image extraction requires canvas setup (not implemented)`);

    page.cleanup();
    return null;
  } catch (error) {
    console.error(`[PDF Extractor] Error extracting image from page ${pageNumber}:`, error);
    return null;
  }
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
