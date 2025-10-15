export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import for pdf-parse - it exports PDFParse as a class
    const { PDFParse, VerbosityLevel } = await import('pdf-parse');
    const parser = new PDFParse({
      verbosity: VerbosityLevel.ERRORS,
    });

    // Load the PDF first
    await parser.load(buffer);

    // Then extract text
    const text = await parser.getText();

    return text;
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
