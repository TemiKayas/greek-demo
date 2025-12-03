/**
 * Represents a text chunk with metadata
 */
export interface Chunk {
  content: string;
  index: number;
  metadata?: {
    startChar: number;
    endChar: number;
    estimatedTokens: number;
  };
}

/**
 * Configuration for text chunking
 */
export interface ChunkConfig {
  chunkSize: number; // Characters per chunk (approx 4 chars = 1 token)
  overlap: number; // Overlap between chunks in characters
  minChunkSize: number; // Minimum chunk size to keep
}

/**
 * Default chunking configuration
 * - chunkSize: 4000 chars ≈ 1000 tokens
 * - overlap: 800 chars ≈ 200 tokens
 * - minChunkSize: 100 chars (skip very small chunks)
 */
export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  chunkSize: 4000,
  overlap: 800,
  minChunkSize: 100,
};

/**
 * Chunk text with overlap for better context preservation
 * @param text - Text to chunk
 * @param config - Chunking configuration (optional)
 * @returns Array of chunks with metadata
 */
export function chunkText(
  text: string,
  config: Partial<ChunkConfig> = {}
): Chunk[] {
  const { chunkSize, overlap, minChunkSize } = {
    ...DEFAULT_CHUNK_CONFIG,
    ...config,
  };

  const chunks: Chunk[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  // Clean up the text (remove excessive whitespace, but preserve structure)
  const cleanedText = text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim();

  while (startIndex < cleanedText.length) {
    const endIndex = Math.min(startIndex + chunkSize, cleanedText.length);
    let content = cleanedText.slice(startIndex, endIndex);

    // If this isn't the last chunk, try to break at a sentence boundary
    if (endIndex < cleanedText.length) {
      content = breakAtSentence(content);
    }

    // Skip very small chunks (likely just whitespace or fragments)
    if (content.trim().length >= minChunkSize) {
      chunks.push({
        content: content.trim(),
        index: chunkIndex,
        metadata: {
          startChar: startIndex,
          endChar: startIndex + content.length,
          estimatedTokens: Math.ceil(content.length / 4), // Rough estimate: 4 chars ≈ 1 token
        },
      });
      chunkIndex++;
    }

    // Move forward by chunkSize - overlap
    startIndex += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Try to break text at a natural sentence boundary
 * Looks for periods, question marks, or exclamation points followed by space
 * @param text - Text to break
 * @returns Text broken at sentence boundary, or original if none found
 */
function breakAtSentence(text: string): string {
  // Look for sentence endings in the last 20% of the text
  const searchStart = Math.floor(text.length * 0.8);
  const searchText = text.slice(searchStart);

  // Try to find sentence boundaries (. ? ! followed by space or newline)
  const sentenceEnd = searchText.search(/[.?!][\s\n]/);

  if (sentenceEnd !== -1) {
    // Break at the sentence boundary
    const breakPoint = searchStart + sentenceEnd + 1;
    return text.slice(0, breakPoint);
  }

  // If no sentence boundary found, try to break at a paragraph
  const paragraphEnd = searchText.lastIndexOf('\n\n');
  if (paragraphEnd !== -1) {
    const breakPoint = searchStart + paragraphEnd;
    return text.slice(0, breakPoint);
  }

  // If no good break point, return original text
  return text;
}

/**
 * Estimate token count for text (rough approximation)
 * @param text - Text to estimate
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Chunk text by paragraphs (alternative strategy)
 * Useful for structured documents
 * @param text - Text to chunk
 * @param maxChunkSize - Maximum chunk size in characters
 * @returns Array of chunks
 */
export function chunkByParagraphs(
  text: string,
  maxChunkSize: number = 4000
): Chunk[] {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks: Chunk[] = [];
  let currentChunk = '';
  let chunkIndex = 0;
  let charIndex = 0;

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed maxChunkSize, save current chunk
    if (
      currentChunk.length > 0 &&
      currentChunk.length + paragraph.length > maxChunkSize
    ) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex,
        metadata: {
          startChar: charIndex - currentChunk.length,
          endChar: charIndex,
          estimatedTokens: estimateTokenCount(currentChunk),
        },
      });
      chunkIndex++;
      currentChunk = '';
    }

    // Add paragraph to current chunk
    currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph;
    charIndex += paragraph.length + 2; // +2 for \n\n
  }

  // Add final chunk if any content remains
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      metadata: {
        startChar: charIndex - currentChunk.length,
        endChar: charIndex,
        estimatedTokens: estimateTokenCount(currentChunk),
      },
    });
  }

  return chunks;
}
