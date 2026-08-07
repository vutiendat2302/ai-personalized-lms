import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { courseAuthoringApi } from "../../../api/courses/courseAuthoringApi";
import type { SubmissionResponseDTO } from "../../../api/courses/courseAuthoringApi";
import { ArrowLeft, FileText, Send } from "lucide-react";

export const CourseGradingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<SubmissionResponseDTO[]>([]);
  const [selectedSub, setSelectedSub] = useState<SubmissionResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number>(10.0);
  const [feedback, setFeedback] = useState("");
  const [returnForResubmission, setReturnForResubmission] = useState(false);
  const [grading, setGrading] = useState(false);

  const fetchSubmissions = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await courseAuthoringApi.getSubmissions(id);
      setSubmissions(data || []);
      if (data && data.length > 0) {
        setSelectedSub(data[0]);
        setScore(data[0].score || 10.0);
        setFeedback(data[0].feedback || "");
      }
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [id]);

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    try {
      setGrading(true);
      await courseAuthoringApi.gradeSubmission(selectedSub.id, {
        score,
        feedback,
        returnForResubmission,
      });
      alert("Đã hoàn tất chấm bài!");
      fetchSubmissions();
    } catch (err) {
      alert("Chấm điểm thất bại.");
    } finally {
      setGrading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 overflow-hidden">
      <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-bold text-gray-900">Chấm bài tập tự luận</h1>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto p-4 space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Danh sách bài nộp ({submissions.length})
          </h3>
          {submissions.map((sub) => (
            <div
              key={sub.id}
              onClick={() => {
                setSelectedSub(sub);
                setScore(sub.score || 10.0);
                setFeedback(sub.feedback || "");
              }}
              className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                selectedSub?.id === sub.id
                  ? "bg-blue-50 border-blue-300 text-blue-900 font-medium"
                  : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold">{sub.userName || `Học viên ID ${sub.userId}`}</span>
                {sub.status === 1 ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Đã chấm</span>
                ) : (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Chờ chấm</span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 truncate">{sub.submittedAt ? sub.submittedAt.substring(0, 16) : ""}</p>
            </div>
          ))}
        </div>

        {selectedSub ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200 bg-white">
              <h3 className="text-base font-bold text-gray-900 mb-4">Nội dung bài nộp</h3>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 whitespace-pre-wrap text-sm font-mono text-gray-800 mb-4">
                {selectedSub.content || "Học viên không gửi kèm văn bản nội dung."}
              </div>

              {selectedSub.fileUrl && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Tệp đính kèm:</h4>
                  <a
                    href={selectedSub.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-blue-600 hover:underline bg-blue-50 px-3 py-2 rounded-lg border border-blue-200"
                  >
                    <FileText className="w-4 h-4" /> Tải về tệp bài nộp
                  </a>
                </div>
              )}
            </div>

            <div className="w-96 p-6 bg-gray-50/50 overflow-y-auto">
              <h3 className="text-base font-bold text-gray-900 mb-4">Chấm điểm & Nhận xét</h3>
              <form onSubmit={handleGradeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Điểm số</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={10}
                    value={score}
                    onChange={(e) => setScore(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nhận xét của giảng viên</label>
                  <textarea
                    rows={6}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Ghi nhận xét góp ý..."
                    className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="return"
                    checked={returnForResubmission}
                    onChange={(e) => setReturnForResubmission(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="return" className="text-xs font-medium text-gray-700 cursor-pointer">
                    Yêu cầu học viên nộp lại bài
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={grading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow transition"
                >
                  <Send className="w-4 h-4" /> {grading ? "Đang lưu..." : "Xác nhận chấm bài"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Chọn một bài nộp ở cột bên trái để chấm điểm
          </div>
        )}
      </div>
    </div>
  );
};
