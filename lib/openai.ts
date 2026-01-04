import OpenAI from 'openai';

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Embed text using OpenAI's text-embedding-3-small model
 * Returns 1536-dimensional vector for semantic understanding
 *
 * NOTE: We use text-embedding-3-small because pgvector has a 2000-dimension
 * index limit. The small model still provides excellent semantic understanding
 * and works well with our hierarchical chunking + hybrid search + reranking pipeline.
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    const openai = getOpenAI();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // 1536 dimensions (pgvector limit: 2000)
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error embedding text:', error);
    throw new Error('Failed to embed text');
  }
}

/**
 * Chat with GPT-4o-mini using RAG context with strict citation enforcement
 * @param query - User's question
 * @param context - Retrieved parent chunks (large context) from hierarchical search
 * @param sourceFiles - Metadata about source files for citations
 * @param conversationHistory - Previous messages in the conversation
 * @returns AI response
 */
export async function chatWithContext(
  query: string,
  context: string[],
  sourceFiles: Array<{ fileName: string; pageNumber?: number }> = [],
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
  try {
    const openai = getOpenAI();

    // Build enhanced system prompt with strict citation requirements
    const systemPrompt = `You are an expert Teaching Assistant for this course. Your goal is to help students learn by answering questions strictly based on the provided context from course materials.

### CRITICAL INSTRUCTIONS (You MUST follow these):

1. **STRICT CONTEXT ADHERENCE:**
   - Answer ONLY using information from the "Context" section below
   - If the answer is not in the context, you MUST say: "I don't have relevant information in the class materials to answer this question. Please consult your teacher or request additional materials."
   - NEVER fabricate information or use outside knowledge
   - Do NOT attempt to answer if the context is insufficient

2. **MANDATORY CITATION:**
   - Every factual claim MUST include a reference to the source (e.g., [Chapter_2.pdf, p.15])
   - Use the exact file names and page numbers provided
   - Format: [FileName, p.XX] after each claim

3. **PEDAGOGICAL TONE:**
   - Be encouraging and supportive
   - Explain concepts clearly and simply
   - Break down complex ideas into understandable parts
   - Use examples from the context when available

4. **NO HALLUCINATION:**
   - If you're unsure, admit it
   - Better to say "I cannot find this information" than to guess
   - Stay strictly within the provided materials

### CONTEXT FROM COURSE MATERIALS:

${context.map((chunk, index) => {
  const source = sourceFiles[index];
  const citation = source
    ? `${source.fileName}${source.pageNumber ? `, p.${source.pageNumber}` : ''}`
    : `Source ${index + 1}`;
  return `[${citation}]\n${chunk}`;
}).join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n')}

### YOUR TASK:
Answer the student's question using ONLY the above context. Remember to cite your sources using [FileName, p.XX] format.`;

    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(
        (msg) =>
          ({
            role: msg.role,
            content: msg.content,
          } as OpenAI.Chat.ChatCompletionMessageParam)
      ),
      { role: 'user', content: query },
    ];

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.5, // Reduced from 0.7 for more consistent, factual responses
      max_tokens: 1200, // Increased for more detailed explanations
    });

    return response.choices[0].message.content || 'I apologize, but I was unable to generate a response. Please try rephrasing your question.';
  } catch (error) {
    console.error('Error in chat completion:', error);
    throw new Error('Failed to generate response');
  }
}

/**
 * Embed multiple text chunks in batch
 * More efficient than calling embedText multiple times
 * @param texts - Array of text chunks to embed
 * @returns Array of embedding vectors (1536 dimensions each)
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  try {
    const openai = getOpenAI();

    // OpenAI API has a limit on batch size, so we process in chunks
    const batchSize = 100; // Can handle more with small model
    const results: number[][] = [];

    console.log(`[Embedding] Starting batch embedding of ${texts.length} chunks...`);

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      console.log(`[Embedding] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)} (${batch.length} chunks)`);

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small', // 1536 dimensions
        input: batch,
        encoding_format: 'float',
      });

      results.push(...response.data.map((d) => d.embedding));

      // Add delay between batches to respect rate limits
      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`[Embedding] Completed embedding ${results.length} chunks`);
    return results;
  } catch (error) {
    console.error('Error embedding batch:', error);
    throw new Error('Failed to embed batch');
  }
}

/**
 * Extract and describe images from a PDF page using GPT-4o
 * This makes diagrams, charts, and figures searchable via text
 *
 * @param imageBase64 - Base64 encoded image from PDF page
 * @param pageNumber - Page number for context
 * @returns Detailed text description of the image
 */
export async function extractImageDescription(
  imageBase64: string,
  pageNumber: number
): Promise<string> {
  try {
    const openai = getOpenAI();

    console.log(`[Image Extraction] Analyzing image on page ${pageNumber}...`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // GPT-4o has strong vision capabilities
      messages: [
        {
          role: 'system',
          content: `You are an expert at describing educational diagrams, charts, and figures for students.
Your descriptions must be detailed enough that a student can understand the visual content without seeing it.
Include all labels, data points, relationships, and key takeaways from the visual.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `This is an image from page ${pageNumber} of an educational document.
Please provide a comprehensive description that captures:
1. The type of visual (diagram, chart, graph, table, etc.)
2. All labels and text visible in the image
3. Key data points or relationships shown
4. The educational concept being illustrated
5. Any important details a student should know

Be thorough but concise. Format your response as a clear description that can be embedded for search.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more accurate descriptions
    });

    const description = response.choices[0].message.content || '';
    console.log(`[Image Extraction] Extracted ${description.length} chars from page ${pageNumber}`);

    return description;
  } catch (error) {
    console.error(`Error extracting image description from page ${pageNumber}:`, error);
    // Return empty string instead of failing - we can still use text content
    return '';
  }
}

/**
 * Cross-Encoder Reranking: Re-score search results for better precision
 *
 * This solves the "ranking quality" problem where initial retrieval (bi-encoder)
 * may not perfectly order results. Cross-encoder reranking uses a more powerful
 * model to score query-document pairs for final ordering.
 *
 * Strategy:
 * - Use GPT-4o-mini to score relevance of each chunk to the query
 * - Score from 0-10 based on how well the chunk answers the query
 * - Reorder chunks by relevance score
 *
 * @param query - User's search query
 * @param chunks - Array of text chunks to rerank
 * @param topK - Number of top results to return after reranking
 * @returns Array of indices in descending order of relevance
 */
export async function rerankChunks(
  query: string,
  chunks: Array<{ content: string; metadata?: Record<string, unknown> }>,
  topK?: number
): Promise<Array<{ index: number; score: number; reasoning: string }>> {
  try {
    const openai = getOpenAI();

    console.log(`[Reranking] Scoring ${chunks.length} chunks for query: "${query.slice(0, 50)}..."`);

    // Build scoring prompt
    const scoringPrompt = `You are an expert at evaluating search result relevance.
Your task is to score how well each text passage answers or relates to the user's query.

USER QUERY: "${query}"

For each passage below, provide:
1. A relevance score from 0-10 (10 = perfect match, 0 = completely irrelevant)
2. Brief reasoning (1 sentence)

Score based on:
- Direct answer to the query (highest priority)
- Semantic relevance to query concepts
- Specificity and detail level
- Contextual usefulness

PASSAGES TO SCORE:

${chunks.map((chunk, index) => `
[Passage ${index + 1}]
${chunk.content.slice(0, 800)}${chunk.content.length > 800 ? '...' : ''}
`).join('\n---\n')}

Respond in this exact JSON format:
{
  "scores": [
    {"passage": 1, "score": 8, "reasoning": "Directly explains..."},
    {"passage": 2, "score": 5, "reasoning": "Related but..."}
  ]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a precise relevance scoring system. Return only valid JSON. Escape all quotes in reasoning text.',
        },
        {
          role: 'user',
          content: scoringPrompt,
        },
      ],
      temperature: 0.2, // Low temperature for consistent scoring
      max_tokens: 2000, // Increased for 50 chunks
      response_format: { type: 'json_object' },
    });

    const rawContent = response.choices[0].message.content || '{"scores":[]}';

    let result;
    try {
      result = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('[Reranking] JSON parse failed, attempting cleanup:', parseError);
      // Try to fix common JSON issues
      const cleaned = rawContent
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/\\'/g, "'") // Fix escaped single quotes
        .replace(/([^\\])"/g, '$1\\"'); // Escape unescaped quotes (careful approach)

      try {
        result = JSON.parse(cleaned);
      } catch (secondError) {
        console.error('[Reranking] Cleanup failed, using fallback');
        throw secondError; // Will hit catch block below
      }
    }

    const scores = result.scores as Array<{ passage: number; score: number; reasoning: string }>;

    // Convert to index-based results (passage numbers are 1-indexed)
    const rankedResults = scores
      .map(s => ({
        index: s.passage - 1,
        score: s.score,
        reasoning: s.reasoning,
      }))
      .filter(s => s.index >= 0 && s.index < chunks.length)
      .sort((a, b) => b.score - a.score);

    const finalResults = topK ? rankedResults.slice(0, topK) : rankedResults;

    console.log(`[Reranking] Completed. Top score: ${finalResults[0]?.score || 0}, Returning ${finalResults.length} results`);

    return finalResults;
  } catch (error) {
    console.error('[Reranking] Error:', error);
    // Fallback: return original order with neutral scores, limited to topK
    console.warn('[Reranking] Falling back to original order');
    const fallbackResults = chunks.map((_, index) => ({
      index,
      score: 5,
      reasoning: 'Reranking failed, using original order',
    }));

    // Respect topK even in fallback
    return topK ? fallbackResults.slice(0, topK) : fallbackResults;
  }
}

/**
 * Batch rerank multiple queries efficiently
 * Useful for processing multiple user queries at once
 *
 * @param queryChunkPairs - Array of query-chunks pairs to rerank
 * @returns Array of reranking results
 */
export async function rerankBatch(
  queryChunkPairs: Array<{
    query: string;
    chunks: Array<{ content: string; metadata?: Record<string, unknown> }>;
  }>,
  topK?: number
): Promise<Array<Array<{ index: number; score: number; reasoning: string }>>> {
  console.log(`[Reranking Batch] Processing ${queryChunkPairs.length} queries`);

  const results = await Promise.all(
    queryChunkPairs.map(pair => rerankChunks(pair.query, pair.chunks, topK))
  );

  console.log(`[Reranking Batch] Completed ${results.length} queries`);
  return results;
}
