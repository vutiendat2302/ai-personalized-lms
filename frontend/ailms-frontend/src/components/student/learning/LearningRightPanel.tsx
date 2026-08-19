import React, { useState } from "react";
import { FileText, StickyNote, Download, Paperclip } from "lucide-react";

interface LearningRightPanelProps {
  description?: string;
  resources?: any[];
  notes?: string;
  onNotesChange?: (value: string) => void;
}

export const LearningRightPanel: React.FC<LearningRightPanelProps> = ({ description, resources = [], notes = "", onNotesChange }) => {
  const [activeTab, setActiveTab] = useState<"info" | "notes">("info");

  const renderDescription = () => {
    if (!description) {
      return <p className="text-xs text-gray-500 italic">Chưa có thông tin mô tả cho bài học này.</p>;
    }

    try {
      if (description.trim().startsWith("[")) {
        const blocks = JSON.parse(description);
        if (Array.isArray(blocks)) {
          // Extract plain text from paragraph blocks to form a concise summary
          const paragraphText = blocks
            .filter((b: any) => b.type === "paragraph" && b.content)
            .map((b: any) => b.content)
            .join(" ");

          if (paragraphText && paragraphText.trim()) {
            const summary = paragraphText.length > 250 ? paragraphText.substring(0, 250) + "..." : paragraphText;
            return <p className="text-xs text-gray-700 leading-relaxed">{summary}</p>;
          }
          return <p className="text-xs text-gray-500 italic">Nội dung chi tiết bài học đã được trình bày ở khu vực màn hình chính.</p>;
        }
      }
    } catch (e) {}

    return <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{description}</p>;
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full flex flex-col overflow-y-auto">
      <div className="flex border-b border-gray-200 shrink-0">
        <button
          onClick={() => setActiveTab("info")}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === "info" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Thông tin
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === "notes" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <StickyNote className="w-3.5 h-3.5" /> Ghi chú
        </button>
      </div>

      <div className="p-4 flex-1 space-y-6">
        {activeTab === "info" ? (
          <>
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Mô tả bài học</h4>
              <div className="space-y-2">{renderDescription()}</div>
            </div>

            {resources && resources.length > 0 && (
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Tài liệu đính kèm ({resources.length})
                  </h4>
                </div>
                <div className="space-y-1.5">
                  {resources.map((res: any, idx: number) => {
                    const raw = res.fileUrl || res.fileKey || "";
                    let downloadUrl = "#";
                    if (raw) {
                      if (raw.startsWith("/api/v1/files/download")) {
                        downloadUrl = raw;
                      } else if (raw.startsWith("http://") || raw.startsWith("https://")) {
                        if (raw.includes("minio:9000") || raw.includes("localhost:9000")) {
                          try {
                            const urlObj = new URL(raw);
                            const pathParts = urlObj.pathname.split("/").filter(Boolean);
                            const fileKey = pathParts.length > 1 ? pathParts.slice(1).join("/") : pathParts.join("/");
                            downloadUrl = `/api/v1/files/download?fileKey=${encodeURIComponent(fileKey)}`;
                          } catch {
                            downloadUrl = `/api/v1/files/download?fileKey=${encodeURIComponent(raw)}`;
                          }
                        } else {
                          downloadUrl = raw;
                        }
                      } else {
                        downloadUrl = `/api/v1/files/download?fileKey=${encodeURIComponent(raw)}`;
                      }
                    }

                    return (
                      <div key={res.id || idx} className="p-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-800 truncate mr-2">{res.name || "Tài liệu đính kèm"}</span>
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 hover:bg-blue-100 text-blue-600 rounded transition shrink-0 cursor-pointer"
                          title="Tải về"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Ghi chú cá nhân</h4>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange?.(e.target.value)}
              placeholder="Ghi lại các ý chính khi xem bài giảng..."
              className="flex-1 w-full p-3 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
