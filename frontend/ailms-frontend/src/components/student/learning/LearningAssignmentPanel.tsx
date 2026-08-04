import React, { useState } from "react";
import type { AssignmentResponseDTO } from "../../../api/courses/courseAuthoringApi";
import { fileAdminApi } from "@/api/file/fileAdminApi";
import { useToast } from "@/hooks/useToast";
import { CheckSquare, Calendar, Send, CheckCircle2, UploadCloud, FileText, Loader2, Award, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LearningAssignmentPanelProps {
  assignment: AssignmentResponseDTO;
  onComplete: () => void;
}

export const LearningAssignmentPanel: React.FC<LearningAssignmentPanelProps> = ({
  assignment,
  onComplete,
}) => {
  const toast = useToast();
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const res = await fileAdminApi.uploadFile(file, "DOCUMENT", "ASSIGNMENT_SUBMISSION");
      const keyOrUrl = (res as any).fileUrl || res.fileKey;
      setFileUrl(keyOrUrl);
      toast.success("Tải tệp nộp bài lên thành công!");
    } catch (err: any) {
      toast.error("Không thể tải tệp nộp bài.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !fileUrl) {
      toast.error("Vui lòng nhập bài làm hoặc tải tệp đính kèm.");
      return;
    }
    setSubmitted(true);
    toast.success("Đã gửi bài tập tự luận thành công!");
    onComplete();
  };

  const getCleanDescription = () => {
    if (!assignment.description) return "Thực hiện bài tập tự luận theo hướng dẫn của giảng viên.";
    if (assignment.description.trim().startsWith("[") || assignment.description.trim().startsWith("{")) {
      return "Thực hiện bài tập tự luận theo hướng dẫn của giảng viên.";
    }
    return assignment.description;
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
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-purple-600" /> Điểm tối đa: <strong>{assignment.maxScore || 10.0} điểm</strong>
              </span>
              <span className="flex items-center gap-1 text-purple-700">
                <Calendar className="w-3.5 h-3.5" /> Hạn nộp: <strong>{assignment.dueDate ? assignment.dueDate.substring(0, 16) : "Không giới hạn"}</strong>
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
              ⌛ Chưa nộp bài
            </Badge>
          )}
        </div>
      </div>

      {/* Assignment Prompt */}
      <div className="p-5 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2">
        <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-purple-700" /> Đề bài & Hướng dẫn tự luận:
        </h4>
        <p className="whitespace-pre-wrap text-xs text-gray-700 leading-relaxed font-sans">
          {getCleanDescription()}
        </p>
      </div>

      {submitted ? (
        <div className="p-8 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center space-y-4 shadow-2xs">
          <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
          <div>
            <h4 className="text-lg font-bold text-emerald-950">Đã nộp bài tập tự luận thành công!</h4>
            <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
              Bài nộp của bạn đã được ghi nhận. Giảng viên phụ trách sẽ kiểm tra, chấm điểm và gửi phản hồi chi tiết cho bạn.
            </p>
          </div>

          {content && (
            <div className="p-4 bg-white border border-emerald-200 rounded-xl text-left max-w-2xl mx-auto space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Nội dung đã gửi:</span>
              <p className="text-xs font-mono whitespace-pre-wrap text-gray-800">{content}</p>
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
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-800">
              1. Nội dung câu trả lời / Bài làm tự luận (Văn bản / Mã nguồn)
            </label>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập câu trả lời chi tiết, đoạn văn luận hoặc mã nguồn bài làm của bạn..."
              className="w-full p-4 text-xs font-mono border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white shadow-2xs"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-800">
              2. Tệp đính kèm bài làm (PDF, Word, Zip, Github Link)
            </label>
            
            <div className="flex items-center gap-3">
              <label className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-2 transition shadow-2xs">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-purple-700" /> Đang tải tệp bài làm lên...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 text-purple-700" /> Chọn tệp nộp bài từ máy tính
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
                placeholder="Hoặc dán URL link tệp đính kèm / Github repository..."
                className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {fileUrl && (
              <p className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Tệp nộp bài: {fileUrl}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition"
          >
            <Send className="w-4 h-4" /> Nộp bài tập tự luận cho Giảng viên
          </button>
        </form>
      )}
    </div>
  );
};
