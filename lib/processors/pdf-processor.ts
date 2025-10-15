export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import for pdf-parse
    const pdf = (await import('pdf-parse')).default;
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
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
