type PDF = {
  id: string;
  filename: string;
  fileSize: number;
  uploadedAt: Date;
  blobUrl: string;
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
      <div className="w-full lg:w-80 card bg-base-200 shadow-lg p-4">
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </div>
    );
  }

  if (pdfs.length === 0) {
    return (
      <div className="w-full lg:w-80 card bg-base-200 shadow-lg p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold text-primary mb-4">Your PDFs</h2>
        <div className="text-center py-6 sm:py-8">
          <div className="w-12 h-12 bg-base-300 rounded-lg flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-xs sm:text-sm text-base-content/60">No PDFs uploaded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-80 card bg-base-100 border border-base-content/10 shadow-lg overflow-hidden flex flex-col max-h-[400px] lg:max-h-none">
      <div className="p-3 sm:p-4 bg-base-100 border-b border-base-content/10">
        <h2 className="text-base sm:text-lg font-bold text-base-content">Your PDFs <span className="text-primary">({pdfs.length})</span></h2>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-base-content/10">
        {pdfs.map((pdf) => (
          <div
            key={pdf.id}
            className={`p-3 sm:p-4 cursor-pointer transition-all hover:bg-base-300 ${
              selectedPdf?.id === pdf.id ? 'bg-base-300 border-l-4 border-primary' : ''
            }`}
            onClick={() => onSelectPdf(pdf)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3
                  className="font-medium text-sm sm:text-base text-base-content truncate mb-1"
                  title={pdf.filename}
                >
                  {pdf.filename}
                </h3>
                <div className="flex items-center gap-2 sm:gap-3 text-xs text-base-content/60">
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
