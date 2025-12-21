import { db } from './db';
import { embedText, rerankChunks } from './openai';

/**
 * Search result with chunk content and metadata
 */
export interface SearchResult {
  chunkId: string;
  content: string;
  similarity: number;
  fileName: string;
  fileId: string;
  chunkIndex: number;
  pageNumber?: number;
  parentId?: string;
  imageDesc?: string;
  hasImages?: boolean;
}

/**
 * Enhanced search result with parent-child relationship
 */
export interface HierarchicalSearchResult extends SearchResult {
  parentContent?: string;
  parentId?: string;
  chunkType: 'PARENT' | 'CHILD';
  section?: string;
  topic?: string;
  imageDesc?: string;
  hasImages?: boolean;
}

/**
 * Search for similar text chunks in a class using vector similarity
 * Uses pgvector's cosine similarity operator (<=>)
 *
 * @param classId - Class ID to search within
 * @param query - Search query text
 * @param topK - Number of results to return (default: 10)
 * @param minSimilarity - Minimum similarity score to include (0-1, default: 0.5)
 * @returns Array of search results sorted by similarity
 */
export async function searchClassVectors(
  classId: string,
  query: string,
  topK: number = 10,
  minSimilarity: number = 0.5
): Promise<SearchResult[]> {
  try {
    // Embed the query text
    const queryEmbedding = await embedText(query);

    // Perform vector similarity search using pgvector
    // Note: The <=> operator returns distance (0 = identical, 2 = opposite)
    // So we convert to similarity: 1 - distance
    const results = await db.$queryRaw<SearchResult[]>`
      SELECT
        fc.id as "chunkId",
        fc.content,
        1 - (fc.embedding <=> ${queryEmbedding}::vector) as similarity,
        cf."fileName" as "fileName",
        cf.id as "fileId",
        fc."chunkIndex" as "chunkIndex"
      FROM "FileChunk" fc
      JOIN "ClassFile" cf ON fc."fileId" = cf.id
      WHERE fc."classId" = ${classId}
        AND fc.embedding IS NOT NULL
        AND (1 - (fc.embedding <=> ${queryEmbedding}::vector)) >= ${minSimilarity}
      ORDER BY fc.embedding <=> ${queryEmbedding}::vector
      LIMIT ${topK}
    `;

    return results;
  } catch (error) {
    console.error('Error searching vectors:', error);
    throw new Error('Failed to search class materials');
  }
}

/**
 * Hybrid Search: Combines Vector Similarity (dense) with BM25 Full-Text Search (sparse)
 *
 * This solves the "lexical gap" problem where semantically similar text uses different words.
 * By combining both approaches, we get:
 * - Vector search: catches semantic similarity (e.g., "car" matches "automobile")
 * - BM25 search: catches exact term matches and rare keywords
 *
 * Strategy:
 * 1. Perform vector search on CHILD chunks (precise retrieval)
 * 2. Perform BM25 full-text search using PostgreSQL tsvector
 * 3. Merge results with weighted scoring
 * 4. Return parent chunks for context (hierarchical retrieval)
 *
 * @param classId - Class ID to search within
 * @param query - Search query text
 * @param topK - Number of results to return (default: 10)
 * @param vectorWeight - Weight for vector similarity score (default: 0.7)
 * @param bm25Weight - Weight for BM25 score (default: 0.3)
 * @returns Array of hierarchical search results with parent content
 */
export async function hybridSearch(
  classId: string,
  query: string,
  topK: number = 10,
  vectorWeight: number = 0.7,
  bm25Weight: number = 0.3
): Promise<HierarchicalSearchResult[]> {
  try {
    console.log(`[Hybrid Search] Query: "${query}" in class ${classId}`);
    console.log(`[Hybrid Search] Weights: Vector=${vectorWeight}, BM25=${bm25Weight}`);

    // Step 1: Embed query for vector search
    const queryEmbedding = await embedText(query);

    // Step 2: Parallel execution of vector and BM25 search on CHILD chunks only
    const [vectorResults, bm25Results] = await Promise.all([
      // Vector similarity search (child chunks only)
      db.$queryRaw<Array<{
        chunkId: string;
        content: string;
        vectorScore: number;
        fileName: string;
        fileId: string;
        chunkIndex: number;
        pageNumber: number | null;
        parentId: string | null;
        section: string | null;
        topic: string | null;
        hasImages: boolean | null;
        imageDesc: string | null;
      }>>`
        SELECT
          fc.id as "chunkId",
          fc.content,
          (1 - (fc.embedding <=> ${queryEmbedding}::vector)) as "vectorScore",
          cf."fileName" as "fileName",
          cf.id as "fileId",
          fc."chunkIndex" as "chunkIndex",
          fc."pageNumber" as "pageNumber",
          fc."parentId" as "parentId",
          fc.section,
          fc.topic,
          fc."hasImages" as "hasImages",
          fc."imageDesc" as "imageDesc"
        FROM "FileChunk" fc
        JOIN "ClassFile" cf ON fc."fileId" = cf.id
        WHERE fc."classId" = ${classId}
          AND fc."chunkType" = 'CHILD'
          AND fc.embedding IS NOT NULL
        ORDER BY fc.embedding <=> ${queryEmbedding}::vector
        LIMIT ${topK * 3}
      `,

      // BM25 full-text search (child chunks only)
      db.$queryRaw<Array<{
        chunkId: string;
        content: string;
        bm25Score: number;
        fileName: string;
        fileId: string;
        chunkIndex: number;
        pageNumber: number | null;
        parentId: string | null;
        section: string | null;
        topic: string | null;
        hasImages: boolean | null;
        imageDesc: string | null;
      }>>`
        SELECT
          fc.id as "chunkId",
          fc.content,
          ts_rank_cd(fc.content_tsv, plainto_tsquery('english', ${query})) as "bm25Score",
          cf."fileName" as "fileName",
          cf.id as "fileId",
          fc."chunkIndex" as "chunkIndex",
          fc."pageNumber" as "pageNumber",
          fc."parentId" as "parentId",
          fc.section,
          fc.topic,
          fc."hasImages" as "hasImages",
          fc."imageDesc" as "imageDesc"
        FROM "FileChunk" fc
        JOIN "ClassFile" cf ON fc."fileId" = cf.id
        WHERE fc."classId" = ${classId}
          AND fc."chunkType" = 'CHILD'
          AND fc.content_tsv @@ plainto_tsquery('english', ${query})
        ORDER BY ts_rank_cd(fc.content_tsv, plainto_tsquery('english', ${query})) DESC
        LIMIT ${topK * 3}
      `
    ]);

    console.log(`[Hybrid Search] Vector results: ${vectorResults.length}, BM25 results: ${bm25Results.length}`);

    // Step 3: Normalize and combine scores
    const maxVectorScore = Math.max(...vectorResults.map(r => r.vectorScore), 1);
    const maxBm25Score = Math.max(...bm25Results.map(r => r.bm25Score), 1);

    // Merge results by chunk ID
    const combinedMap = new Map<string, {
      chunkId: string;
      content: string;
      fileName: string;
      fileId: string;
      chunkIndex: number;
      pageNumber: number | null;
      parentId: string | null;
      section: string | null;
      topic: string | null;
      hasImages: boolean | null;
      imageDesc: string | null;
      vectorScore: number;
      bm25Score: number;
      combinedScore: number;
    }>();

    // Add vector results
    for (const result of vectorResults) {
      const normalizedVector = result.vectorScore / maxVectorScore;
      combinedMap.set(result.chunkId, {
        ...result,
        vectorScore: normalizedVector,
        bm25Score: 0,
        combinedScore: normalizedVector * vectorWeight,
      });
    }

    // Add/merge BM25 results
    for (const result of bm25Results) {
      const normalizedBm25 = result.bm25Score / maxBm25Score;
      const existing = combinedMap.get(result.chunkId);

      if (existing) {
        // Chunk appears in both searches - combine scores
        existing.bm25Score = normalizedBm25;
        existing.combinedScore = (existing.vectorScore * vectorWeight) + (normalizedBm25 * bm25Weight);
      } else {
        // Chunk only in BM25 search
        combinedMap.set(result.chunkId, {
          ...result,
          vectorScore: 0,
          bm25Score: normalizedBm25,
          combinedScore: normalizedBm25 * bm25Weight,
        });
      }
    }

    // Step 4: Sort by combined score and take top K
    const sortedResults = Array.from(combinedMap.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, topK);

    console.log(`[Hybrid Search] Combined unique chunks: ${combinedMap.size}, returning top ${topK}`);

    // Step 5: Fetch parent chunks for context (hierarchical retrieval)
    const parentIds = sortedResults
      .map(r => r.parentId)
      .filter((id): id is string => id !== null);

    const uniqueParentIds = [...new Set(parentIds)];

    const parentChunks = uniqueParentIds.length > 0
      ? await db.$queryRaw<Array<{
          id: string;
          content: string;
        }>>`
          SELECT id, content
          FROM "FileChunk"
          WHERE id = ANY(${uniqueParentIds}::text[])
        `
      : [];

    const parentMap = new Map(parentChunks.map(p => [p.id, p.content]));

    console.log(`[Hybrid Search] Fetched ${parentChunks.length} parent chunks`);

    // Step 6: Build hierarchical results
    const hierarchicalResults: HierarchicalSearchResult[] = sortedResults.map(result => ({
      chunkId: result.chunkId,
      content: result.content,
      similarity: result.combinedScore,
      fileName: result.fileName,
      fileId: result.fileId,
      chunkIndex: result.chunkIndex,
      pageNumber: result.pageNumber ?? undefined,
      parentId: result.parentId ?? undefined,
      parentContent: result.parentId ? parentMap.get(result.parentId) : undefined,
      chunkType: 'CHILD' as const,
      section: result.section ?? undefined,
      topic: result.topic ?? undefined,
      hasImages: result.hasImages ?? undefined,
      imageDesc: result.imageDesc ?? undefined,
    }));

    console.log(`[Hybrid Search] Returning ${hierarchicalResults.length} hierarchical results`);

    return hierarchicalResults;
  } catch (error) {
    console.error('[Hybrid Search] Error:', error);
    throw new Error('Failed to perform hybrid search');
  }
}

/**
 * Search for similar chunks across all files in a class
 * Groups results by file
 *
 * @param classId - Class ID to search within
 * @param query - Search query text
 * @param topK - Number of results per file (default: 3)
 * @returns Map of fileId to search results
 */
export async function searchByFile(
  classId: string,
  query: string,
  topK: number = 3
): Promise<Map<string, SearchResult[]>> {
  try {
    const results = await searchClassVectors(classId, query, 50); // Get more results
    const fileMap = new Map<string, SearchResult[]>();

    // Group by file and take top K per file
    for (const result of results) {
      if (!fileMap.has(result.fileId)) {
        fileMap.set(result.fileId, []);
      }

      const fileResults = fileMap.get(result.fileId)!;
      if (fileResults.length < topK) {
        fileResults.push(result);
      }
    }

    return fileMap;
  } catch (error) {
    console.error('Error searching by file:', error);
    throw new Error('Failed to search by file');
  }
}

/**
 * Get statistics about vector search results
 * Useful for debugging and analytics
 *
 * @param classId - Class ID
 * @returns Statistics about vectors in the class
 */
export async function getVectorStats(classId: string): Promise<{
  totalChunks: number;
  totalFiles: number;
  chunksWithEmbeddings: number;
  filesWithChunks: number;
}> {
  try {
    const stats = await db.$queryRaw<
      {
        totalChunks: bigint;
        totalFiles: bigint;
        chunksWithEmbeddings: bigint;
        filesWithChunks: bigint;
      }[]
    >`
      SELECT
        COUNT(DISTINCT fc.id) as "totalChunks",
        COUNT(DISTINCT cf.id) as "totalFiles",
        COUNT(DISTINCT CASE WHEN fc.embedding IS NOT NULL THEN fc.id END) as "chunksWithEmbeddings",
        COUNT(DISTINCT CASE WHEN fc.embedding IS NOT NULL THEN cf.id END) as "filesWithChunks"
      FROM "ClassFile" cf
      LEFT JOIN "FileChunk" fc ON cf.id = fc."fileId"
      WHERE cf."classId" = ${classId}
    `;

    const result = stats[0];
    return {
      totalChunks: Number(result.totalChunks),
      totalFiles: Number(result.totalFiles),
      chunksWithEmbeddings: Number(result.chunksWithEmbeddings),
      filesWithChunks: Number(result.filesWithChunks),
    };
  } catch (error) {
    console.error('Error getting vector stats:', error);
    throw new Error('Failed to get vector statistics');
  }
}

/**
 * Find similar chunks to a specific chunk (useful for "related content" features)
 *
 * @param chunkId - Chunk ID to find similar content for
 * @param topK - Number of similar chunks to return
 * @returns Array of similar chunks
 */
export async function findSimilarChunks(
  chunkId: string,
  topK: number = 5
): Promise<SearchResult[]> {
  try {
    // Get the embedding of the source chunk using raw query to handle vector type
    const sourceChunks = await db.$queryRaw<Array<{ embedding: number[]; classId: string }>>`
      SELECT embedding, "classId"
      FROM "FileChunk"
      WHERE id = ${chunkId}
      LIMIT 1
    `;

    if (sourceChunks.length === 0 || !sourceChunks[0].embedding) {
      throw new Error('Chunk not found or has no embedding');
    }

    const sourceChunk = sourceChunks[0];

    // Find similar chunks in the same class
    const results = await db.$queryRaw<SearchResult[]>`
      SELECT
        fc.id as "chunkId",
        fc.content,
        1 - (fc.embedding <=> ${sourceChunk.embedding}::vector) as similarity,
        cf."fileName" as "fileName",
        cf.id as "fileId",
        fc."chunkIndex" as "chunkIndex"
      FROM "FileChunk" fc
      JOIN "ClassFile" cf ON fc."fileId" = cf.id
      WHERE fc."classId" = ${sourceChunk.classId}
        AND fc.id != ${chunkId}
        AND fc.embedding IS NOT NULL
      ORDER BY fc.embedding <=> ${sourceChunk.embedding}::vector
      LIMIT ${topK}
    `;

    return results;
  } catch (error) {
    console.error('Error finding similar chunks:', error);
    throw new Error('Failed to find similar chunks');
  }
}

/**
 * RAG 2.0 Search: Complete Pipeline with Hybrid Search + Reranking
 *
 * This is the main entry point for RAG-based retrieval. It combines:
 * 1. Hybrid search (vector + BM25) for initial recall
 * 2. Cross-encoder reranking for precision
 * 3. Parent-child hierarchical retrieval for context
 *
 * Flow:
 * - Search CHILD chunks (precise, searchable)
 * - Rerank for relevance
 * - Return PARENT chunks (large context for LLM)
 *
 * @param classId - Class ID to search within
 * @param query - User's search query
 * @param options - Search configuration
 * @returns Reranked hierarchical search results
 */
export async function ragSearch(
  classId: string,
  query: string,
  options: {
    initialK?: number;      // Number of chunks to retrieve from hybrid search (default: 30)
    finalK?: number;        // Number of chunks to return after reranking (default: 5)
    vectorWeight?: number;  // Weight for vector similarity (default: 0.7)
    bm25Weight?: number;    // Weight for BM25 score (default: 0.3)
    useReranking?: boolean; // Whether to apply reranking (default: true)
  } = {}
): Promise<HierarchicalSearchResult[]> {
  const {
    initialK = 30,
    finalK = 5,
    vectorWeight = 0.7,
    bm25Weight = 0.3,
    useReranking = true,
  } = options;

  try {
    console.log(`[RAG Search] Query: "${query}"`);
    console.log(`[RAG Search] Config: initialK=${initialK}, finalK=${finalK}, reranking=${useReranking}`);

    // Step 1: Hybrid search (retrieves initialK child chunks)
    const hybridResults = await hybridSearch(
      classId,
      query,
      initialK,
      vectorWeight,
      bm25Weight
    );

    if (hybridResults.length === 0) {
      console.log('[RAG Search] No results found');
      return [];
    }

    console.log(`[RAG Search] Hybrid search returned ${hybridResults.length} results`);

    // Step 2: Optional reranking for better precision
    let finalResults = hybridResults;

    if (useReranking && hybridResults.length > 1) {
      console.log(`[RAG Search] Reranking top ${hybridResults.length} results...`);

      const chunksToRerank = hybridResults.map(result => ({
        content: result.content,
        metadata: {
          fileName: result.fileName,
          pageNumber: result.pageNumber,
          section: result.section,
        },
      }));

      const rerankedIndices = await rerankChunks(query, chunksToRerank, finalK);

      // Reorder results based on reranking scores
      finalResults = rerankedIndices.map(({ index, score }) => {
        const result = hybridResults[index];
        return {
          ...result,
          similarity: score / 10, // Normalize 0-10 score to 0-1
          // Store reranking info in a way that doesn't break the type
        };
      });

      console.log(`[RAG Search] Reranking complete. Top score: ${rerankedIndices[0]?.score || 0}`);
    } else {
      // No reranking, just take top finalK
      finalResults = hybridResults.slice(0, finalK);
    }

    console.log(`[RAG Search] Returning ${finalResults.length} final results with parent context`);

    return finalResults;
  } catch (error) {
    console.error('[RAG Search] Error:', error);
    throw new Error('Failed to perform RAG search');
  }
}
