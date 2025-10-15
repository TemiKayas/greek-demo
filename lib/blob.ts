import { put, del } from '@vercel/blob';

export async function uploadPDF(file: File): Promise<string> {
  const blob = await put(`pdfs/${file.name}`, file, {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'application/pdf',
  });
  return blob.url;
}

export async function deletePDF(url: string): Promise<void> {
  await del(url);
}
