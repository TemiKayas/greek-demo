'use client';

interface PDFPreviewProps {
  file: File | null;
}

export default function PDFPreview({ file }: PDFPreviewProps) {
  if (!file || file.type !== 'application/pdf') {
    return null;
  }

  const url = URL.createObjectURL(file);
  // Disable PDF viewer toolbar/sidebar
  const pdfUrl = `${url}#toolbar=0&navpanes=0&scrollbar=1`;

  return (
    <div className="w-full flex flex-col">
      {/* title */}
      <h3 className="text-2xl font-bold text-[#473025] mb-12 text-center">PDF Preview</h3>

      {/* pdf container */}
      <div className="bg-[#fffcf8] border-2 border-[#473025] rounded-2xl shadow-lg overflow-hidden">
        <iframe
          src={pdfUrl}
          title={file.name}
          className="w-full h-[620px] bg-white"
        />
      </div>
    </div>
  );
}
