import { db } from './db';
import { embedText } from './openai';

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
    const sourceChunks = await db.$queryRaw<Array<{ embedding: any; classId: string }>>`
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
