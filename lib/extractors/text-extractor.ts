import pdf from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extract text from various file types
 * Supports: PDF, DOCX, TXT
 * @param buffer - File buffer
 * @param mimeType - MIME type of the file
 * @returns Extracted text content
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  try {
    switch (mimeType) {
      case 'application/pdf':
        return await extractPDF(buffer);

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/docx':
        return await extractDOCX(buffer);

      case 'text/plain':
        return extractPlainText(buffer);

      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    throw error;
  }
}

/**
 * Extract text from PDF using pdf-parse
 * @param buffer - PDF file buffer
 * @returns Extracted text
 */
async function extractPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from DOCX using mammoth
 * @param buffer - DOCX file buffer
 * @returns Extracted text
 */
async function extractDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting DOCX:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

/**
 * Extract text from plain text file
 * @param buffer - Text file buffer
 * @returns Extracted text
 */
function extractPlainText(buffer: Buffer): string {
  try {
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('Error extracting plain text:', error);
    throw new Error('Failed to extract text from file');
  }
}

/**
 * Get human-readable file type name
 * @param mimeType - MIME type
 * @returns File type name
 */
export function getFileTypeName(mimeType: string): string {
  switch (mimeType) {
    case 'application/pdf':
      return 'PDF';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/docx':
      return 'Word Document';
    case 'text/plain':
      return 'Text File';
    default:
      return 'Unknown';
  }
}

/**
 * Check if file type is supported
 * @param mimeType - MIME type to check
 * @returns True if supported
 */
export function isSupportedFileType(mimeType: string): boolean {
  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/docx',
    'text/plain',
  ];
  return supportedTypes.includes(mimeType);
}
