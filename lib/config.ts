/**
 * Configuration for the RAG (Retrieval-Augmented Generation) system.
 *
 * These parameters are tunable and control the behavior of the search and retrieval process.
 * By externalizing them here, we can easily experiment with different settings to optimize
 * performance for various types of content without modifying the core application logic.
 */
export const RAG_CONFIG = {
  // The number of initial candidates to retrieve from the vector search.
  // A higher 'k' increases the chance of finding relevant documents (recall) but adds latency.
  initialK: 30,

  // The final number of top candidates to pass to the reranker.
  // The reranker is a more sophisticated (and slower) model that re-evaluates the top candidates.
  finalK: 5,

  // The weight to give to the vector similarity score (semantic search).
  // Value should be between 0 and 1.
  vectorWeight: 0.7,

  // The weight to give to the BM25 score (keyword-based search).
  // Value should be between 0 and 1. The sum of vectorWeight and bm25Weight is not required to be 1.
  bm25Weight: 0.3,

  // Enable cross-encoder reranking for better precision.
  // When enabled, the initial candidates are re-evaluated with a more sophisticated model.
  useReranking: true,

  // Number of conversation messages to include for context continuity.
  // Helps the AI maintain conversation flow and reference previous exchanges.
  conversationHistoryLimit: 10,
};
