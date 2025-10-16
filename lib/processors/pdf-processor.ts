import pdf from 'pdf-parse';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Ensure we have a valid Buffer
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Invalid buffer provided to PDF extractor');
    }

    console.log('Buffer received, size:', buffer.length, 'bytes');

    // Parse the PDF buffer using pdf-parse
    const data = await pdf(buffer);

    console.log('PDF parsed successfully, text length:', data.text.length);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validatePDF(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.includes('pdf')) {
    return { valid: false, error: 'File must be a PDF' };
  }

  // Check file size (max 25MB)
  const maxSize = 25 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'PDF must be smaller than 25MB' };
  }

  return { valid: true };
}
