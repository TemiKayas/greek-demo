type PDF = {
  id: string;
  filename: string;
  fileSize: number;
  uploadedAt: Date;
  filePath: string;
  processedContent: {
    extractedText: string;
  } | null;
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
      <div className="w-80 bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
        <div className="flex items-center justify-center h-full">
          <span className="loading loading-spinner loading-lg text-blue-500"></span>
        </div>
      </div>
    );
  }

  if (pdfs.length === 0) {
    return (
      <div className="w-80 bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
        <h2 className="text-lg font-bold text-blue-400 mb-4">Your PDFs</h2>
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-sm">No PDFs uploaded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col border border-gray-700">
      <div className="p-4 border-b border-gray-700 bg-blue-600 text-white">
        <h2 className="text-lg font-bold">Your PDFs ({pdfs.length})</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {pdfs.map((pdf) => (
          <div
            key={pdf.id}
            className={`p-4 border-b border-gray-700 cursor-pointer transition-colors hover:bg-gray-700/50 ${
              selectedPdf?.id === pdf.id ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : ''
            }`}
            onClick={() => onSelectPdf(pdf)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3
                  className="font-medium text-gray-200 truncate mb-1"
                  title={pdf.filename}
                >
                  {pdf.filename}
                </h3>
                <div className="flex items-center gap-3 text-xs text-gray-400">
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
                className="btn btn-ghost btn-xs text-error hover:bg-error/20"
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
