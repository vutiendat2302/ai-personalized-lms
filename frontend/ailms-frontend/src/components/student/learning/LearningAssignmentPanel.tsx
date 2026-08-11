import React, { useState } from "react";
import type { AssignmentResponseDTO } from "../../../api/courses/courseAuthoringApi";
import { fileAdminApi } from "@/api/file/fileAdminApi";
import { useToast } from "@/hooks/useToast";
import { MathRenderer } from "@/components/common/MathRenderer";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { CodeBlockRenderer } from "@/components/common/CodeBlockRenderer";
import {
  CheckSquare,
  Calendar,
  Send,
  CheckCircle2,
  UploadCloud,
  FileText,
  Loader2,
  Award,
  Trash2,
  AlignLeft,
  Code,
  Binary,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { studentApi } from "@/api/student/studentApi";

export interface SubmissionBlock {
  id: string;
  type: "paragraph" | "code" | "math" | "callout" | "image";
  content: string;
}

interface LearningAssignmentPanelProps {
  assignment: AssignmentResponseDTO;
  onComplete: () => void;
}

export const LearningAssignmentPanel: React.FC<LearningAssignmentPanelProps> = ({
  assignment,
  onComplete,
}) => {
  const toast = useToast();
  const [fileUrl, setFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Multi-block submission state for BLOCK_EDITOR mode
  const [blocks, setBlocks] = useState<SubmissionBlock[]>([
    { id: "b1", type: "paragraph", content: "" },
  ]);

  /** Thêm một khối nội dung cục bộ vào trình soạn bài làm. */
  const addBlock = (type: SubmissionBlock["type"]) => {
    const newBlock: SubmissionBlock = {
      id: "b_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      type,
      content: "",
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  /** Cập nhật nội dung của một khối bài làm. */
  const updateBlock = (id: string, newContent: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, content: newContent } : b))
    );
  };

  /** Xóa một khối nhưng luôn giữ tối thiểu một khối soạn thảo. */
  const removeBlock = (id: string) => {
    if (blocks.length <= 1) {
      toast.error("Bài làm phải có ít nhất 1 block nội dung.");
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  /** Tải tệp lên kho tệp trước khi gửi tham chiếu cho API nộp bài. */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const res = await fileAdminApi.uploadFile(file, "DOCUMENT", "ASSIGNMENT_SUBMISSION");
      const keyOrUrl = (res as any).fileUrl || res.fileKey;
      setFileUrl(keyOrUrl);
      toast.success("Tải tệp nộp bài lên thành công!");
    } catch {
      toast.error("Không thể tải tệp nộp bài.");
    } finally {
      setUploading(false);
    }
  };

  /** Đọc cấu hình hình thức nộp bài từ mô tả do backend trả về. */
  const parseAssignmentMeta = () => {
    if (!assignment.description) {
      return {
        instructions: "",
        submissionMode: "FILE_UPLOAD" as "FILE_UPLOAD" | "BLOCK_EDITOR",
      };
    }
    if (assignment.description.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(assignment.description);
        const mode = parsed.submissionMode;
        return {
          instructions: typeof parsed.instructions === "string" ? parsed.instructions : "",
          submissionMode: (mode === "BLOCK_EDITOR" || mode === "TEXT_ONLY" ? "BLOCK_EDITOR" : "FILE_UPLOAD") as "FILE_UPLOAD" | "BLOCK_EDITOR",
        };
      } catch {
        return { instructions: assignment.description, submissionMode: "FILE_UPLOAD" as const };
      }
    }
    return {
      instructions: assignment.description,
      submissionMode: "FILE_UPLOAD" as "FILE_UPLOAD" | "BLOCK_EDITOR",
    };
  };

  const { instructions, submissionMode } = parseAssignmentMeta();

  /** Gửi bài làm thật lên backend rồi mới đánh dấu đã nộp trên giao diện. */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionMode === "FILE_UPLOAD" && !fileUrl) {
      toast.error("Vui lòng chọn tệp bài làm hoặc dán đường dẫn đính kèm.");
      return;
    }
    if (submissionMode === "BLOCK_EDITOR") {
      const hasContent = blocks.some((b) => b.content.trim().length > 0);
      if (!hasContent) {
        toast.error("Vui lòng soạn thảo ít nhất 1 block bài làm.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const contentText = submissionMode === "BLOCK_EDITOR" ? JSON.stringify(blocks) : undefined;
      await studentApi.submitAssignment(assignment.id, { contentText, fileUrl: fileUrl || undefined });
      setSubmitted(true);
      toast.success("Đã gửi bài tập tự luận thành công!");
      onComplete();
    } catch {
      toast.error("Không thể nộp bài. Vui lòng kiểm tra hạn nộp hoặc trạng thái ghi danh.");
    } finally {
      setSubmitting(false);
    }
  };

  /** Định dạng thời hạn nộp bài theo múi giờ trình duyệt. */
  const formatVietnameseDate = (dateStr?: string) => {
    if (!dateStr) return "Không giới hạn";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr.substring(0, 16);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} - ${hours}:${minutes}`;
    } catch (e) {
      return dateStr.substring(0, 16);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto w-full max-w-6xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm my-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl shrink-0">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{assignment.title}</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 font-medium">
              {assignment.maxScore != null && <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-purple-600" /> Điểm tối đa: <strong>{assignment.maxScore} điểm</strong>
              </span>}
              <span className="flex items-center gap-1 text-purple-700">
                <Calendar className="w-3.5 h-3.5" /> Hạn nộp: <strong>{formatVietnameseDate(assignment.dueDate)}</strong>
              </span>
            </div>
          </div>
        </div>

        <div>
          {submitted ? (
            <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold px-3 py-1 text-xs">
              ⏳ Đã nộp bài • Đang chờ Giảng viên chấm điểm
            </Badge>
          ) : (
            <Badge variant="outline" className="text-purple-700 border-purple-300 font-bold px-3 py-1 text-xs">
              {submissionMode === "FILE_UPLOAD" ? "📁 Hình thức 1: Upload tệp đính kèm" : "✍️ Hình thức 2: Soạn thảo Block trực tiếp"}
            </Badge>
          )}
        </div>
      </div>

      {/* Assignment Prompt */}
      {instructions && <div className="p-5 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2">
        <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-purple-700" /> Đề bài & Hướng dẫn tự luận:
        </h4>
        <p className="whitespace-pre-wrap text-xs text-gray-700 leading-relaxed font-sans">
          {instructions}
        </p>
      </div>}

      {submitted ? (
        <div className="p-8 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center space-y-4 shadow-2xs">
          <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
          <div>
            <h4 className="text-lg font-bold text-emerald-950">Đã nộp bài tập tự luận thành công!</h4>
            <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
              Bài nộp của bạn đã được ghi nhận. Giảng viên phụ trách sẽ kiểm tra, chấm điểm và gửi phản hồi chi tiết cho bạn.
            </p>
          </div>

          {submissionMode === "BLOCK_EDITOR" && (
            <div className="p-4 bg-white border border-emerald-200 rounded-xl text-left max-w-3xl mx-auto space-y-3">
              <span className="text-[11px] font-bold text-gray-500 uppercase block border-b pb-1">Các Block bài làm đã gửi:</span>
              {blocks.map((b, idx) => (
                <div key={b.id} className="p-2.5 bg-gray-50 rounded-lg text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase text-purple-700">Block #{idx + 1} ({b.type}):</span>
                  {b.type === "code" ? (
                    <CodeBlockRenderer code={b.content} language="javascript" />
                  ) : b.type === "math" ? (
                    <MathRenderer math={b.content} displayMode={true} />
                  ) : (
                    <MarkdownRenderer content={b.content} />
                  )}
                </div>
              ))}
            </div>
          )}

          {fileUrl && (
            <div className="p-3 bg-emerald-100/60 border border-emerald-200 rounded-xl max-w-2xl mx-auto text-xs font-mono font-bold text-emerald-900 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-emerald-700" /> Tệp đã nộp: {fileUrl}
            </div>
          )}

          <button
            onClick={onComplete}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            Hoàn thành bài học
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* OPTION 1: FILE UPLOAD MODE */}
          {submissionMode === "FILE_UPLOAD" && (
            <div className="p-6 bg-purple-50/40 border border-purple-200/80 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-purple-700" /> 1. Tải tệp bài làm lên (PDF, Word, Zip, v.v.):
              </h4>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <label className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2 transition shadow-xs shrink-0">
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" /> Đang tải tệp bài làm lên...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" /> Chọn tệp từ máy tính
                    </>
                  )}
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>

                <input
                  type="text"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="Hoặc dán URL link tệp đính kèm (https://...)"
                  className="flex-1 px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-mono"
                />
              </div>

              {fileUrl && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-mono font-bold text-emerald-800 flex items-center justify-between">
                  <span className="truncate">✓ Đã đính kèm tệp: {fileUrl}</span>
                  <button
                    type="button"
                    onClick={() => setFileUrl("")}
                    className="text-rose-600 hover:underline text-xs shrink-0 ml-2"
                  >
                    Gỡ bỏ
                  </button>
                </div>
              )}
            </div>
          )}

          {/* OPTION 2: MULTI-BLOCK EDITOR MODE */}
          {submissionMode === "BLOCK_EDITOR" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-700" /> 2. Soạn thảo các Block bài làm trực tiếp ({blocks.length} Blocks):
                </h4>

                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => addBlock("paragraph")} className="h-7 text-xs font-semibold gap-1">
                    <AlignLeft className="w-3.5 h-3.5 text-emerald-600" /> + Block Văn bản
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addBlock("code")} className="h-7 text-xs font-semibold gap-1">
                    <Code className="w-3.5 h-3.5 text-purple-600" /> + Block Mã nguồn
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addBlock("math")} className="h-7 text-xs font-semibold gap-1">
                    <Binary className="w-3.5 h-3.5 text-amber-600" /> + Block Toán LaTeX
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addBlock("callout")} className="h-7 text-xs font-semibold gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-orange-600" /> + Block Ghi chú
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {blocks.map((block, idx) => (
                  <div key={block.id} className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between pb-1 border-b border-gray-200/60">
                      <span className="text-xs font-bold uppercase text-purple-900">
                        Block #{idx + 1}: {block.type === "paragraph" ? "Văn bản (Markdown)" : block.type === "code" ? "Mã nguồn (Code)" : block.type === "math" ? "Công thức Toán (LaTeX)" : "Ghi chú (Callout)"}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded-md hover:bg-rose-50 transition cursor-pointer"
                        title="Xóa block này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {block.type === "paragraph" && (
                      <textarea
                        rows={4}
                        value={block.content}
                        onChange={(e) => updateBlock(block.id, e.target.value)}
                        placeholder="Nhập nội dung bài làm tự luận..."
                        className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-sans"
                      />
                    )}

                    {block.type === "code" && (
                      <textarea
                        rows={4}
                        value={block.content}
                        onChange={(e) => updateBlock(block.id, e.target.value)}
                        placeholder="Dán mã nguồn tại đây..."
                        className="w-full p-3 text-xs font-mono bg-gray-900 text-emerald-400 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    )}

                    {block.type === "math" && (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={block.content}
                          onChange={(e) => updateBlock(block.id, e.target.value)}
                          placeholder="Nhập công thức toán LaTeX (ví dụ: E = mc^2)..."
                          className="w-full p-3 text-xs font-mono border border-amber-300 bg-amber-50/40 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        {block.content && (
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
                            <MathRenderer math={block.content} displayMode={true} />
                          </div>
                        )}
                      </div>
                    )}

                    {block.type === "callout" && (
                      <textarea
                        rows={2}
                        value={block.content}
                        onChange={(e) => updateBlock(block.id, e.target.value)}
                        placeholder="Ghi chú chú thích..."
                        className="w-full p-3 text-xs border border-orange-300 bg-orange-50/50 text-orange-950 font-semibold rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? "Đang nộp bài..." : "Nộp bài tập cho giảng viên"}
          </button>
        </form>
      )}
    </div>
  );
};
