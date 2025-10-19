type PDF = {
  id: string;
  filename: string;
  fileSize: number;
  uploadedAt: Date;
};

type Props = {
  pdfs: PDF[];
  selectedPdf: PDF | null;
  onSelectPdf: (pdf: PDF) => void;
  onDeletePdf: (pdfId: string) => void;
  isLoading: boolean;
};

export default function PDFListSidebar({
  pdfs,
  selectedPdf,
  onSelectPdf,
  onDeletePdf,
  isLoading,
}: Props) {
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (isLoading) {
    return (
      <div className="w-80 bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-center h-full">
          <span className="loading loading-spinner loading-lg text-greek-blue"></span>
        </div>
      </div>
    );
  }

  if (pdfs.length === 0) {
    return (
      <div className="w-80 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-bold text-greek-blue mb-4">Your PDFs</h2>
        <div className="text-center text-gray-400 py-8">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-sm">No PDFs uploaded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-greek-blue text-white">
        <h2 className="text-lg font-bold">Your PDFs ({pdfs.length})</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {pdfs.map((pdf) => (
          <div
            key={pdf.id}
            className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
              selectedPdf?.id === pdf.id ? 'bg-blue-50 border-l-4 border-l-greek-blue' : ''
            }`}
            onClick={() => onSelectPdf(pdf)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3
                  className="font-medium text-gray-800 truncate mb-1"
                  title={pdf.filename}
                >
                  {pdf.filename}
                </h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{formatFileSize(pdf.fileSize)}</span>
                  <span>•</span>
                  <span>{formatDate(pdf.uploadedAt)}</span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePdf(pdf.id);
                }}
                className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                title="Delete PDF"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
