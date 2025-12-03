// Load environment variables from .env file
import { config } from 'dotenv';
config({ path: '.env' });

import { embedText, chatWithContext } from '../lib/openai';
import { chunkText } from '../lib/chunking/text-chunker';
import { extractText } from '../lib/extractors/text-extractor';

async function testOpenAI() {
  console.log('🧪 Testing OpenAI Integration...\n');

  try {
    // Test 1: Text Embedding
    console.log('Test 1: Text Embedding');
    console.log('------------------------');
    const testText = 'This is a test sentence for embedding.';
    console.log(`Input: "${testText}"`);

    const embedding = await embedText(testText);
    console.log(`✓ Embedding generated successfully!`);
    console.log(`  Dimensions: ${embedding.length}`);
    console.log(`  First 5 values: [${embedding.slice(0, 5).join(', ')}...]\n`);

    // Test 2: Text Chunking
    console.log('Test 2: Text Chunking');
    console.log('------------------------');
    const longText = `
      Artificial intelligence (AI) is intelligence demonstrated by machines, in contrast to the natural intelligence displayed by humans and animals.

      Leading AI textbooks define the field as the study of "intelligent agents": any device that perceives its environment and takes actions that maximize its chance of successfully achieving its goals.

      Colloquially, the term "artificial intelligence" is often used to describe machines (or computers) that mimic "cognitive" functions that humans associate with the human mind, such as "learning" and "problem solving".
    `.trim();

    const chunks = chunkText(longText, { chunkSize: 100, overlap: 20 });
    console.log(`Input text length: ${longText.length} characters`);
    console.log(`✓ Created ${chunks.length} chunks`);
    chunks.forEach((chunk, i) => {
      console.log(`  Chunk ${i + 1}: ${chunk.content.substring(0, 50)}...`);
    });
    console.log();

    // Test 3: Chat with Context
    console.log('Test 3: Chat with Context (RAG)');
    console.log('------------------------');
    const context = [
      'The capital of France is Paris. Paris is known for the Eiffel Tower.',
      'France is a country in Western Europe. It has a population of about 67 million people.',
    ];
    const query = 'What is the capital of France?';

    console.log(`Context chunks: ${context.length}`);
    console.log(`Query: "${query}"`);

    const response = await chatWithContext(query, context);
    console.log(`✓ Response generated successfully!`);
    console.log(`  AI Response: "${response}"\n`);

    // Test 4: Text Extraction (Plain Text)
    console.log('Test 4: Text Extraction (Plain Text)');
    console.log('------------------------');
    const plainTextBuffer = Buffer.from('Hello, this is a plain text file!', 'utf-8');
    const extractedText = await extractText(plainTextBuffer, 'text/plain');
    console.log(`✓ Extracted text: "${extractedText}"\n`);

    console.log('✅ All tests passed successfully!');
    console.log('\n🎉 OpenAI integration is working correctly!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

testOpenAI();
