import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export async function uploadPDF(file: File): Promise<string> {
  // Ensure upload directory exists
  await mkdir(UPLOAD_DIR, { recursive: true });

  // Generate unique filename
  const randomSuffix = randomBytes(8).toString('hex');
  const filename = `${Date.now()}-${randomSuffix}-${file.name}`;
  const filepath = join(UPLOAD_DIR, filename);

  // Convert File to Buffer and save
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(filepath, buffer);

  return filepath;
}

export async function deletePDF(filepath: string): Promise<void> {
  const { unlink } = await import('fs/promises');
  await unlink(filepath);
}
