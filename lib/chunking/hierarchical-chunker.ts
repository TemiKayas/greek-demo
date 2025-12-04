/**
 * Hierarchical (Parent-Child) Text Chunking for RAG
 *
 * This solves the "lost context" problem where small chunks lose connection to main topics.
 *
 * Strategy:
 * 1. Parent Chunks: Large sections (2000-4000 tokens) representing full chapters/sections
 * 2. Child Chunks: Small searchable chunks (256-512 tokens) for precise retrieval
 * 3. At retrieval time: Search using child chunks, but return parent chunks to LLM
 *
 * This gives us:
 * - Precise semantic search (child chunks)
 * - Rich context for the LLM (parent chunks)
 * - Preserved document structure and flow
 */

export interface ParentChunk {
  content: string;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
  metadata: {
    startChar: number;
    endChar: number;
    estimatedTokens: number;
  };
  children: ChildChunk[];
}

export interface ChildChunk {
  content: string;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
  parentIndex: number;
  metadata: {
    startChar: number;
    endChar: number;
    estimatedTokens: number;
    overlapWithNext: number;
  };
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into sentences for intelligent chunking
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries while preserving them
  return text.match(/[^.!?]+[.!?]+/g) || [text];
}

/**
 * Create parent chunks (large context chunks)
 * Target: 2000-4000 tokens per parent chunk
 */
export function createParentChunks(
  text: string,
  minTokens: number = 2000,
  maxTokens: number = 4000
): ParentChunk[] {
  const parents: ParentChunk[] = [];
  const sentences = splitIntoSentences(text);

  let currentChunk = '';
  let currentStartChar = 0;
  let sentenceIndex = 0;
  let chunkIndex = 0;

  console.log(`[Parent Chunking] Processing ${sentences.length} sentences...`);

  while (sentenceIndex < sentences.length) {
    const sentence = sentences[sentenceIndex];
    const proposedChunk = currentChunk + sentence;
    const proposedTokens = estimateTokens(proposedChunk);

    if (proposedTokens >= minTokens && proposedTokens <= maxTokens) {
      // This chunk is in the sweet spot
      currentChunk = proposedChunk;
      sentenceIndex++;
    } else if (proposedTokens > maxTokens) {
      // Chunk is too large, save current chunk and start new one
      if (currentChunk.length > 0) {
        const endChar = currentStartChar + currentChunk.length;
        parents.push({
          content: currentChunk.trim(),
          startIndex: currentStartChar,
          endIndex: endChar,
          chunkIndex: chunkIndex++,
          metadata: {
            startChar: currentStartChar,
            endChar,
            estimatedTokens: estimateTokens(currentChunk),
          },
          children: [],
        });

        currentStartChar = endChar;
        currentChunk = '';
      } else {
        // Single sentence is too large, use it as a chunk anyway
        const endChar = currentStartChar + sentence.length;
        parents.push({
          content: sentence.trim(),
          startIndex: currentStartChar,
          endIndex: endChar,
          chunkIndex: chunkIndex++,
          metadata: {
            startChar: currentStartChar,
            endChar,
            estimatedTokens: estimateTokens(sentence),
          },
          children: [],
        });

        currentStartChar = endChar;
        sentenceIndex++;
      }
    } else {
      // Chunk is still too small, keep adding
      currentChunk = proposedChunk;
      sentenceIndex++;
    }
  }

  // Save final chunk
  if (currentChunk.trim().length > 0) {
    const endChar = currentStartChar + currentChunk.length;
    parents.push({
      content: currentChunk.trim(),
      startIndex: currentStartChar,
      endIndex: endChar,
      chunkIndex: chunkIndex,
      metadata: {
        startChar: currentStartChar,
        endChar,
        estimatedTokens: estimateTokens(currentChunk),
      },
      children: [],
    });
  }

  console.log(`[Parent Chunking] Created ${parents.length} parent chunks`);
  return parents;
}

/**
 * Create child chunks from a parent chunk (small searchable chunks)
 * Target: 256-512 tokens per child with 50 token overlap
 */
export function createChildChunks(
  parentChunk: ParentChunk,
  targetTokens: number = 400,
  overlapTokens: number = 50
): ChildChunk[] {
  const children: ChildChunk[] = [];
  const text = parentChunk.content;

  // Convert token sizes to approximate character sizes
  const chunkSize = targetTokens * 4; // ~400 tokens = 1600 chars
  const overlap = overlapTokens * 4;   // ~50 tokens = 200 chars

  let startChar = 0;
  let childIndex = 0;

  while (startChar < text.length) {
    const endChar = Math.min(startChar + chunkSize, text.length);
    let content = text.slice(startChar, endChar);

    // Try to break at sentence boundary for cleaner chunks
    if (endChar < text.length) {
      const lastPeriod = content.lastIndexOf('.');
      const lastQuestion = content.lastIndexOf('?');
      const lastExclaim = content.lastIndexOf('!');
      const lastBoundary = Math.max(lastPeriod, lastQuestion, lastExclaim);

      if (lastBoundary > chunkSize / 2) {
        // We found a good break point
        content = content.slice(0, lastBoundary + 1);
      }
    }

    // Skip very small chunks at the end
    if (content.trim().length >= 100) {
      children.push({
        content: content.trim(),
        startIndex: startChar,
        endIndex: startChar + content.length,
        chunkIndex: childIndex,
        parentIndex: parentChunk.chunkIndex,
        metadata: {
          startChar: parentChunk.startIndex + startChar,
          endChar: parentChunk.startIndex + startChar + content.length,
          estimatedTokens: estimateTokens(content),
          overlapWithNext: overlap,
        },
      });
      childIndex++;
    }

    // Move to next chunk with overlap
    const previousStart = startChar;
    const step = content.length - overlap;

    // Ensure we always make forward progress (at least 1 char)
    if (step <= 0) {
      // Overlap is too large or content too small, skip by at least half the content
      startChar += Math.max(1, Math.floor(content.length / 2));
    } else {
      startChar += step;
    }

    // Safety check: if we somehow didn't advance, force progress
    if (startChar <= previousStart) {
      startChar = previousStart + Math.max(1, chunkSize);
    }
  }

  return children;
}

/**
 * Create complete hierarchical chunk structure
 * Returns parents with their child chunks linked
 */
export function createHierarchicalChunks(
  text: string,
  options: {
    parentMinTokens?: number;
    parentMaxTokens?: number;
    childTargetTokens?: number;
    childOverlapTokens?: number;
  } = {}
): ParentChunk[] {
  const {
    parentMinTokens = 2000,
    parentMaxTokens = 4000,
    childTargetTokens = 400,
    childOverlapTokens = 50,
  } = options;

  console.log('[Hierarchical Chunking] Starting...');
  console.log(`  Parent size: ${parentMinTokens}-${parentMaxTokens} tokens`);
  console.log(`  Child size: ${childTargetTokens} tokens (${childOverlapTokens} overlap)`);

  // Create parent chunks
  const parents = createParentChunks(text, parentMinTokens, parentMaxTokens);

  // Create child chunks for each parent
  let totalChildren = 0;
  parents.forEach((parent, index) => {
    const children = createChildChunks(parent, childTargetTokens, childOverlapTokens);
    parent.children = children;
    totalChildren += children.length;

    console.log(`[Parent ${index + 1}/${parents.length}] ${children.length} child chunks (${estimateTokens(parent.content)} tokens)`);
  });

  console.log(`[Hierarchical Chunking] Complete:`);
  console.log(`  ${parents.length} parent chunks`);
  console.log(`  ${totalChildren} child chunks`);
  console.log(`  Average ${(totalChildren / parents.length).toFixed(1)} children per parent`);

  return parents;
}

/**
 * Flatten child chunks for embedding/storage
 * Returns all child chunks with parent reference
 */
export function flattenChildChunks(parents: ParentChunk[]): Array<ChildChunk & { parentContent: string }> {
  const flattened: Array<ChildChunk & { parentContent: string }> = [];

  parents.forEach((parent) => {
    parent.children.forEach((child) => {
      flattened.push({
        ...child,
        parentContent: parent.content,
      });
    });
  });

  return flattened;
}
