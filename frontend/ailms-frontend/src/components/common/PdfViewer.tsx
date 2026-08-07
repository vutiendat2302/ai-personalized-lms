import React, { useState, useEffect } from "react";
import { fileAdminApi } from "@/api/file/fileAdminApi";
import { ExternalLink, Loader2, FileText } from "lucide-react";

interface PdfViewerProps {
  fileKeyOrUrl: string;
  className?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ fileKeyOrUrl, className = "h-[650px]" }) => {
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const resolvePdfUrl = async () => {
      if (!fileKeyOrUrl) {
        setLoading(false);
        return;
      }

      if (fileKeyOrUrl.startsWith("http://") || fileKeyOrUrl.startsWith("https://")) {
        if (isMounted) {
          setPdfUrl(fileKeyOrUrl);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        // Try getting MinIO presigned URL
        const presignedUrl = await fileAdminApi.getPreviewUrl(fileKeyOrUrl);
        if (isMounted) {
          if (presignedUrl) {
            setPdfUrl(presignedUrl);
          } else {
            setPdfUrl(`/api/v1/files/download?fileKey=${encodeURIComponent(fileKeyOrUrl)}`);
          }
        }
      } catch (err) {
        if (isMounted) {
          setPdfUrl(`/api/v1/files/download?fileKey=${encodeURIComponent(fileKeyOrUrl)}`);
          setError(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    resolvePdfUrl();

    return () => {
      isMounted = false;
    };
  }, [fileKeyOrUrl]);

  if (loading) {
    return (
      <div className={`w-full ${className} bg-muted/20 border border-border/40 rounded-2xl flex flex-col items-center justify-center text-muted-foreground p-6`}>
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <span className="text-xs font-bold">Đang tải tài liệu PDF...</span>
      </div>
    );
  }

  const rawUrl = pdfUrl || (
    fileKeyOrUrl.startsWith("http://") || fileKeyOrUrl.startsWith("https://")
      ? fileKeyOrUrl
      : `/api/v1/files/download?fileKey=${encodeURIComponent(fileKeyOrUrl)}`
  );

  // Append #toolbar=0&navpanes=0 to strip away Chrome's dark embedded window header & toolbar controls
  const cleanPdfUrl = rawUrl.includes("#") ? rawUrl : `${rawUrl}#toolbar=0&navpanes=0&view=FitH`;

  return (
    <div className={`w-full ${className} bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs`}>
      <embed
        src={cleanPdfUrl}
        type="application/pdf"
        className="w-full h-full border-0"
      />
    </div>
  );
};
