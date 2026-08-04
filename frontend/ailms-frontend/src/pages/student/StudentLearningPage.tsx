import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { studentLearningApi } from "../../api/courses/studentLearningApi";
import type { CourseCurriculumResponse, LessonCurriculumItem } from "../../api/courses/courseAuthoringApi";
import { LearningSidebar } from "../../components/student/learning/LearningSidebar";
import { LearningVideoPlayer } from "../../components/student/learning/LearningVideoPlayer";
import { LearningQuizPlayer } from "../../components/student/learning/LearningQuizPlayer";
import { LearningAssignmentPanel } from "../../components/student/learning/LearningAssignmentPanel";
import { LearningRightPanel } from "../../components/student/learning/LearningRightPanel";
import { MarkdownRenderer } from "../../components/common/MarkdownRenderer";
import { PdfViewer } from "../../components/common/PdfViewer";
import { ArrowLeft, BookOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export const StudentLearningPage: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const user = auth.user;

  const [curriculum, setCurriculum] = useState<CourseCurriculumResponse | null>(null);
  const [activeLesson, setActiveLesson] = useState<LessonCurriculumItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  const fetchTree = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const data = await studentLearningApi.getCourseTree(courseId, user?.id);
      setCurriculum(data);

      if (data.sections && data.sections.length > 0) {
        let targetLesson: LessonCurriculumItem | null = null;

        if (lessonId) {
          for (const s of data.sections) {
            const found = s.lessons?.find((l) => l.id === lessonId);
            if (found) {
              targetLesson = found;
              break;
            }
          }
        }

        if (!targetLesson && data.sections[0].lessons && data.sections[0].lessons.length > 0) {
          targetLesson = data.sections[0].lessons[0];
        }

        setActiveLesson(targetLesson);
      }
    } catch (err) {
      console.error("Failed to load course learning tree:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, [courseId, lessonId, user]);

  const handleSelectLesson = (lesson: LessonCurriculumItem) => {
    setActiveLesson(lesson);
    navigate(`/learn/courses/${courseId}/lessons/${lesson.id}`, { replace: true });
  };

  const handleProgressUpdate = async (watchPercent: number, positionSec: number) => {
    if (!activeLesson || !user?.id) return;
    try {
      await studentLearningApi.updateProgress(activeLesson.id, user.id, "1", {
        watchPercent,
        lastPositionSec: positionSec,
      });
    } catch (err) {
      console.error("Progress save failed:", err);
    }
  };

  const handleCompleteLesson = async () => {
    if (!activeLesson || !user?.id) return;
    try {
      await studentLearningApi.completeLesson(activeLesson.id, user.id, "1");
      setActiveLesson((prev) => (prev ? { ...prev, completed: true } : null));
      fetchTree();
    } catch (err) {
      console.error("Complete lesson failed:", err);
    }
  };

  const userRoles = (user?.roles || []).map((r: any) =>
    (typeof r === "object" ? r?.code || r?.name || "" : String(r)).replace("ROLE_", "").toUpperCase()
  );
  const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("MANAGER");
  const isPrivilegedRole =
    isAdmin ||
    userRoles.includes("TEACHER") ||
    userRoles.includes("TA") ||
    userRoles.includes("HR");

  const handleGoBack = () => {
    // If opened as a new tab from studio, focus parent and close preview tab
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.focus();
        window.close();
        return;
      } catch (e) {
        // Fallback to navigate if window.close is blocked by browser
      }
    }

    if (courseId) {
      if (isAdmin) {
        navigate(`/admin/courses/${courseId}/builder`);
        return;
      }
      if (userRoles.includes("TEACHER") || userRoles.includes("TA") || userRoles.includes("HR")) {
        navigate(`/teacher/courses/${courseId}/builder`);
        return;
      }
    }

    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/student/courses");
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 overflow-hidden">
      <header className="h-14 bg-gray-900 text-white px-4 flex items-center justify-between shrink-0 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={handleGoBack}
            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-300 transition flex items-center gap-1 cursor-pointer"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold hidden sm:inline">Quay lại</span>
          </button>
          <div className="h-4 w-px bg-gray-700" />
          <h1 className="text-sm font-bold truncate max-w-md">{curriculum?.courseName || "Khóa học"}</h1>
          {isPrivilegedRole && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Chế độ Preview (Admin / Giảng viên)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isPrivilegedRole && (
            <button
              onClick={handleGoBack}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              🔙 Quay lại Studio soạn thảo
            </button>
          )}

          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition cursor-pointer"
            title="Ẩn/Hiện bảng phụ"
          >
            {showRightPanel ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <LearningSidebar
          curriculum={curriculum}
          activeLessonId={activeLesson?.id || null}
          onSelectLesson={handleSelectLesson}
          isCanBypassLock={isPrivilegedRole}
        />

        <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50 p-4 md:p-6">
          {activeLesson ? (
            <>
              {activeLesson.contentType === "VIDEO" && (
                <LearningVideoPlayer
                  lesson={activeLesson}
                  onProgressUpdate={handleProgressUpdate}
                  onComplete={handleCompleteLesson}
                />
              )}

              {activeLesson.contentType === "QUIZ" && (
                <LearningQuizPlayer
                  quiz={
                    activeLesson.linkedQuiz || {
                      id: String(activeLesson.id),
                      title: activeLesson.name,
                      description: activeLesson.description || "",
                      timeLimitMin: activeLesson.durationMin || 15,
                      passScore: 8.0,
                      maxAttempts: 3,
                      shuffleQuestions: true,
                    }
                  }
                  onComplete={handleCompleteLesson}
                />
              )}

              {activeLesson.contentType === "ASSIGNMENT" && (
                <LearningAssignmentPanel
                  assignment={
                    activeLesson.linkedAssignment || {
                      id: String(activeLesson.id),
                      title: activeLesson.name,
                      description: activeLesson.description || "",
                      maxScore: 10.0,
                    }
                  }
                  onComplete={handleCompleteLesson}
                />
              )}

              {/* PDF / Document Lesson */}
              {(activeLesson.contentType === "PDF" || activeLesson.contentType === "DOCUMENT") && (
                <div className="w-full max-w-6xl mx-auto bg-white border border-gray-200 rounded-2xl p-6 md:p-8 my-2 shadow-xs flex-1 flex flex-col space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h2 className="text-xl font-bold text-gray-900">{activeLesson.name}</h2>
                    <span className="text-xs font-bold text-blue-600 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">Bài đọc PDF</span>
                  </div>

                  {activeLesson.contentUrl ? (
                    <div className="w-full h-[80vh] min-h-[700px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                      {(() => {
                        const url = activeLesson.contentUrl;
                        const lower = url.toLowerCase();
                        const docStreamUrl = url.startsWith("http://") || url.startsWith("https://")
                          ? url
                          : `http://localhost:8080/api/v1/files/download?fileKey=${encodeURIComponent(url)}`;

                        if (lower.includes(".pdf") || activeLesson.contentType === "PDF") {
                          return <PdfViewer fileKeyOrUrl={url} className="h-full" />;
                        }
                        if (lower.includes(".html") || lower.includes(".htm")) {
                          return <iframe src={docStreamUrl} className="w-full h-full border-0" title="HTML Viewer" />;
                        }
                        return (
                          <iframe
                            src={`https://docs.google.com/viewer?url=${encodeURIComponent(docStreamUrl)}&embedded=true`}
                            className="w-full h-full border-0"
                            title="Document Viewer"
                          />
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic py-8 text-center">Chưa có tệp PDF tài liệu cho bài học này.</p>
                  )}

                  <div className="pt-3 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={handleCompleteLesson}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                    >
                      Đánh dấu đã học xong
                    </button>
                  </div>
                </div>
              )}

              {/* Text / Markdown Content Lesson */}
              {activeLesson.contentType === "TEXT" && (
                <div className="w-full max-w-6xl mx-auto bg-white border border-gray-200 rounded-2xl p-6 md:p-10 my-2 shadow-xs flex-1 space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-100 pb-3">{activeLesson.name}</h2>

                  <div className="space-y-4">
                    {!activeLesson.description ? (
                      <p className="text-xs text-gray-400 italic">Chưa có nội dung bài đọc.</p>
                    ) : (
                      <MarkdownRenderer content={activeLesson.description} />
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={handleCompleteLesson}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                    >
                      Đánh dấu đã học xong
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <BookOpen className="w-12 h-12 mb-2 stroke-[1.5]" />
              <p className="text-sm font-medium">Chọn bài học từ danh sách bên trái để bắt đầu học</p>
            </div>
          )}
        </div>

        {showRightPanel && (
          <LearningRightPanel
            description={activeLesson?.description}
            resources={activeLesson?.resources}
          />
        )}
      </div>
    </div>
  );
};
