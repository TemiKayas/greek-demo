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
 * Returns 1536-dimensional vector
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    const openai = getOpenAI();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
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
 * Chat with GPT-4o-mini using RAG context
 * @param query - User's question
 * @param context - Retrieved text chunks from vector search
 * @param conversationHistory - Previous messages in the conversation
 * @returns AI response
 */
export async function chatWithContext(
  query: string,
  context: string[],
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
  try {
    const openai = getOpenAI();

    // Build system prompt with context
    const systemPrompt = `You are a helpful AI tutor assisting students with their coursework. Answer the student's question using ONLY the provided context from class materials.

If the context doesn't contain enough information to answer the question, politely say so and suggest the student ask their teacher or check additional materials.

Be clear, concise, and educational in your responses. When referencing information from the context, you can mention which source it came from.

Context from class materials:
${context.map((chunk, index) => `\n[Source ${index + 1}]\n${chunk}`).join('\n\n---\n')}`;

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
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || 'I apologize, but I was unable to generate a response.';
  } catch (error) {
    console.error('Error in chat completion:', error);
    throw new Error('Failed to generate response');
  }
}

/**
 * Embed multiple text chunks in batch
 * More efficient than calling embedText multiple times
 * @param texts - Array of text chunks to embed
 * @returns Array of embedding vectors
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  try {
    const openai = getOpenAI();

    // OpenAI API has a limit on batch size, so we process in chunks of 100
    const batchSize = 100;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
        encoding_format: 'float',
      });

      results.push(...response.data.map((d) => d.embedding));

      // Add a small delay between batches to avoid rate limits
      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  } catch (error) {
    console.error('Error embedding batch:', error);
    throw new Error('Failed to embed batch');
  }
}
