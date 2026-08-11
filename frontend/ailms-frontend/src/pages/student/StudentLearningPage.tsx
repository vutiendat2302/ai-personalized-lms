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
import { ArrowLeft, BookOpen, PanelRightClose, PanelRightOpen, Clock, CheckCircle, HelpCircle, Lock, CheckSquare, Sparkles } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { Skeleton } from "../../components/ui/skeleton";

export const StudentLearningPage: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const user = auth.user;
  const { error: showError } = useToast();

  const [curriculum, setCurriculum] = useState<CourseCurriculumResponse | null>(null);
  const [activeLesson, setActiveLesson] = useState<LessonCurriculumItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [currentWatchPercent, setCurrentWatchPercent] = useState<number>(0);

  /** Tải cây bài học và chỉ chọn bài được backend đánh dấu có quyền mở. */
  const fetchTree = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      setLoadError(null);
      const data = await studentLearningApi.getEnrolledCourseTree(courseId);
      setCurriculum(data);

      if (data.sections && data.sections.length > 0) {
        let targetLesson: LessonCurriculumItem | null = null;

        if (lessonId) {
          for (const s of data.sections) {
            const found = s.lessons?.find((l) => l.id === lessonId);
            if (found?.accessible && !found.locked) {
              targetLesson = found;
              break;
            }
          }
        }

        if (!targetLesson) {
          targetLesson = data.sections.flatMap((section) => section.lessons || [])
            .find((lesson) => lesson.accessible && !lesson.locked) || null;
        }

        setActiveLesson(targetLesson);
      }
    } catch (err) {
      console.error("Failed to load course learning tree:", err);
      setLoadError("Không thể tải không gian học tập. Vui lòng kiểm tra quyền truy cập và thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, [courseId, lessonId, user]);

  /** Gọi API nội dung để backend kiểm tra lại quyền trước khi mở bài. */
  const handleSelectLesson = async (lesson: LessonCurriculumItem) => {
    try {
      const accessible = await studentLearningApi.getAccessibleLesson(lesson.id);
      setActiveLesson({
        ...lesson,
        contentUrl: accessible.contentUrl ?? lesson.contentUrl,
        description: accessible.description ?? lesson.description,
        durationMin: accessible.durationMin ?? lesson.durationMin,
      });
      navigate(`/learn/courses/${courseId}/lessons/${lesson.id}`, { replace: true });
    } catch {
      showError("Bạn cần đăng ký khóa học để mở bài học này.");
    }
  };

  const handleProgressUpdate = async (watchPercent: number, positionSec: number) => {
    setCurrentWatchPercent(watchPercent);
    if (!activeLesson || !user?.id || !curriculum?.enrollmentId) return;
    try {
      await studentLearningApi.updateProgress(activeLesson.id, curriculum.enrollmentId, {
        watchPercent,
        lastPositionSec: positionSec,
      });
    } catch (err) {
      console.error("Progress save failed:", err);
    }
  };

  const handleCompleteLesson = async () => {
    if (!activeLesson || !user?.id || !curriculum?.enrollmentId) return;
    try {
      await studentLearningApi.completeLesson(activeLesson.id, curriculum.enrollmentId);
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

  // Toggle for Admin/Teacher to switch between Admin bypass mode and Student simulation mode
  const [simulateStudentView, setSimulateStudentView] = useState<boolean>(false);
  const canBypassLock = isPrivilegedRole && !simulateStudentView;

  // Reading Timer Enforcement State for TEXT/PDF Lessons
  const [readingTimeLeftSec, setReadingTimeLeftSec] = useState<number>(0);
  const [readingDurationTotalSec, setReadingDurationTotalSec] = useState<number>(0);

  useEffect(() => {
    if (
      activeLesson &&
      (activeLesson.contentType === "TEXT" ||
        activeLesson.contentType === "PDF" ||
        activeLesson.contentType === "DOCUMENT")
    ) {
      if (activeLesson.completed) {
        setReadingTimeLeftSec(0);
        setReadingDurationTotalSec(0);
      } else {
        const durationMin = activeLesson.durationMin && activeLesson.durationMin > 0 ? activeLesson.durationMin : 1;
        const totalSec = durationMin * 60;
        setReadingDurationTotalSec(totalSec);
        setReadingTimeLeftSec(totalSec);
      }
    } else {
      setReadingTimeLeftSec(0);
      setReadingDurationTotalSec(0);
    }
  }, [activeLesson?.id, activeLesson?.completed, activeLesson?.contentType, activeLesson?.durationMin]);

  useEffect(() => {
    if (readingTimeLeftSec <= 0) return;

    const timer = setInterval(() => {
      setReadingTimeLeftSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [readingTimeLeftSec]);

  const formatMMSS = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const renderCompletionButton = () => {
    if (!curriculum?.enrollmentId) return null;
    if (activeLesson?.completed) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-bold text-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Bài học đã hoàn thành</span>
        </div>
      );
    }

    if (readingTimeLeftSec > 0 && !isPrivilegedRole) {
      const progressPercent = Math.min(
        100,
        Math.max(0, ((readingDurationTotalSec - readingTimeLeftSec) / readingDurationTotalSec) * 100)
      );
      return (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] font-bold text-amber-700 block">
              ⏱️ Đang đọc bài: còn {formatMMSS(readingTimeLeftSec)} (yêu cầu {activeLesson?.durationMin || 1} phút)
            </span>
            <div className="w-36 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1 ml-auto">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            disabled
            className="px-5 py-2.5 bg-gray-100 text-gray-400 font-bold text-xs rounded-xl shadow-xs border border-gray-200 cursor-not-allowed flex items-center gap-1.5 opacity-70"
            title={`Vui lòng đọc thêm ${formatMMSS(readingTimeLeftSec)} để mở khóa nút hoàn thành`}
          >
            <Clock className="w-4 h-4 text-gray-400 animate-spin" />
            Đánh dấu đã học xong ({formatMMSS(readingTimeLeftSec)})
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        {isPrivilegedRole && readingTimeLeftSec > 0 && (
          <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            [GV / Admin: Cho phép bỏ qua {formatMMSS(readingTimeLeftSec)}]
          </span>
        )}
        <button
          onClick={handleCompleteLesson}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition"
        >
          <CheckCircle className="w-4 h-4" />
          Đánh dấu đã học xong
        </button>
      </div>
    );
  };

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
      <div className="grid h-screen w-screen grid-cols-[280px_1fr] bg-gray-950" aria-label="Đang tải không gian học tập">
        <div className="space-y-4 border-r border-gray-800 p-4"><Skeleton className="h-10 bg-gray-800" /><Skeleton className="h-16 bg-gray-800" /><Skeleton className="h-16 bg-gray-800" /><Skeleton className="h-16 bg-gray-800" /></div>
        <div className="space-y-5 p-6"><Skeleton className="h-12 bg-gray-800" /><Skeleton className="aspect-video w-full bg-gray-800" /><Skeleton className="h-24 bg-gray-800" /></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-screen w-screen flex flex-col gap-4 items-center justify-center bg-gray-900 text-white px-4 text-center">
        <BookOpen className="h-12 w-12 text-gray-400" />
        <p className="text-sm text-gray-300">{loadError}</p>
        <button onClick={() => void fetchTree()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold">Thử lại</button>
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
              onClick={() => setSimulateStudentView(!simulateStudentView)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                simulateStudentView
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-2xs"
                  : "bg-gray-800 text-amber-300 border-amber-500/40 hover:bg-gray-700"
              }`}
              title="Bật/Tắt chế độ mô phỏng Học sinh để test quy tắc khóa 90% video"
            >
              {simulateStudentView ? "🎓 Đang test góc nhìn Học sinh (Khóa 90%)" : "👑 Góc nhìn Admin (Bypass khóa)"}
            </button>
          )}

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
          onLockedLesson={() => showError("Bạn cần đăng ký khóa học để mở bài học này.")}
          isCanBypassLock={canBypassLock || Boolean(curriculum?.enrollmentId)}
        />

        <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50 p-4 md:p-6">
          {activeLesson ? (
            <>
              {activeLesson.contentType === "VIDEO" && (
                <div className="space-y-6 flex-1 flex flex-col">
                  <LearningVideoPlayer
                    lesson={activeLesson}
                    onProgressUpdate={handleProgressUpdate}
                    onComplete={handleCompleteLesson}
                  />

                  {/* Attached Quiz for Video Lesson */}
                  {activeLesson.linkedQuiz && (
                    <div className="w-full max-w-6xl mx-auto my-4 space-y-4">
                      {canBypassLock || activeLesson.completed || currentWatchPercent >= 90 ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-900 text-sm font-bold shadow-2xs">
                            <Sparkles className="w-5 h-5 text-amber-600 animate-bounce" />
                            <span>🎯 Bài kiểm tra Quiz đính kèm theo bài giảng Video (Đã mở khóa):</span>
                          </div>
                          <LearningQuizPlayer
                            quiz={activeLesson.linkedQuiz}
                            onComplete={handleCompleteLesson}
                            persistAttempt
                          />
                        </div>
                      ) : (
                        <div className="p-5 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-center justify-between shadow-2xs">
                          <div className="flex items-center gap-3">
                            <Lock className="w-6 h-6 text-amber-600 shrink-0" />
                            <div>
                              <h4 className="text-sm font-bold text-amber-950">Bài kiểm tra Quiz đính kèm theo bài giảng (Đang khóa)</h4>
                              <p className="text-xs text-amber-800 mt-0.5">
                                Vui lòng xem đủ <b>90% video bài giảng</b> để tự động mở khóa bài kiểm tra Quiz bên dưới. (Hiện tại: <b>{currentWatchPercent}%</b> / 90%)
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-amber-200 text-amber-900 border-amber-300 font-bold text-xs py-1 px-3">
                            {currentWatchPercent}% / 90%
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Attached Assignment for Video Lesson */}
                  {activeLesson.linkedAssignment && (
                    <div className="w-full max-w-6xl mx-auto my-4 space-y-4">
                      {canBypassLock || activeLesson.completed || currentWatchPercent >= 90 ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 p-3.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-900 text-sm font-bold shadow-2xs">
                            <CheckSquare className="w-5 h-5 text-purple-600" />
                            <span>📝 Bài tập tự luận đính kèm theo bài giảng Video:</span>
                          </div>
                          <LearningAssignmentPanel
                            assignment={activeLesson.linkedAssignment}
                            onComplete={handleCompleteLesson}
                          />
                        </div>
                      ) : (
                        <div className="p-5 bg-purple-50 border border-purple-200/90 rounded-2xl flex items-center justify-between shadow-2xs">
                          <div className="flex items-center gap-3">
                            <Lock className="w-6 h-6 text-purple-600 shrink-0" />
                            <div>
                              <h4 className="text-sm font-bold text-purple-950">Bài tập tự luận đính kèm (Đang khóa)</h4>
                              <p className="text-xs text-purple-800 mt-0.5">
                                Vui lòng xem đủ <b>90% video bài giảng</b> để tự động mở khóa bài tập tự luận bên dưới. (Hiện tại: <b>{currentWatchPercent}%</b> / 90%)
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-purple-200 text-purple-900 border-purple-300 font-bold text-xs py-1 px-3">
                            {currentWatchPercent}% / 90%
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeLesson.contentType === "QUIZ" && (
                activeLesson.linkedQuiz
                  ? <LearningQuizPlayer quiz={activeLesson.linkedQuiz} onComplete={handleCompleteLesson} persistAttempt />
                  : <div className="m-auto text-sm text-gray-500">Bài học chưa có dữ liệu quiz.</div>
              )}

              {activeLesson.contentType === "ASSIGNMENT" && (
                activeLesson.linkedAssignment
                  ? <LearningAssignmentPanel assignment={activeLesson.linkedAssignment} onComplete={handleCompleteLesson} />
                  : <div className="m-auto text-sm text-gray-500">Bài học chưa có dữ liệu bài tập.</div>
              )}

              {/* PDF / Document Lesson */}
              {(activeLesson.contentType === "PDF" || activeLesson.contentType === "DOCUMENT") && (
                <div className="space-y-6">
                  <div className="w-full max-w-6xl mx-auto bg-white border border-gray-200 rounded-2xl p-6 md:p-8 my-2 shadow-xs flex-1 flex flex-col space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <h2 className="text-xl font-bold text-gray-900">{activeLesson.name}</h2>
                      <span className="text-xs font-bold text-blue-600 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">Bài đọc PDF</span>
                    </div>

                    {activeLesson.contentUrl ? (
                      <div className="w-full h-[80vh] min-h-175 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                        {(() => {
                          const url = activeLesson.contentUrl;
                          const lower = url.toLowerCase();
                          const docStreamUrl = url.startsWith("http://") || url.startsWith("https://")
                            ? url
                            : `/api/v1/files/download?fileKey=${encodeURIComponent(url)}`;

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
                      {renderCompletionButton()}
                    </div>
                  </div>

                  {activeLesson.linkedQuiz && (
                    <div className="w-full max-w-6xl mx-auto space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-900 text-sm font-bold">
                        <HelpCircle className="w-5 h-5 text-amber-600" />
                        <span>🎯 Bài kiểm tra Quiz đính kèm theo bài đọc PDF này:</span>
                      </div>
                      <LearningQuizPlayer quiz={activeLesson.linkedQuiz} onComplete={handleCompleteLesson} persistAttempt />
                    </div>
                  )}

                  {activeLesson.linkedAssignment && (
                    <div className="w-full max-w-6xl mx-auto space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-900 text-sm font-bold">
                        <CheckSquare className="w-5 h-5 text-purple-600" />
                        <span>📝 Bài tập tự luận đính kèm theo bài đọc PDF này:</span>
                      </div>
                      <LearningAssignmentPanel assignment={activeLesson.linkedAssignment} onComplete={handleCompleteLesson} />
                    </div>
                  )}
                </div>
              )}

              {/* Text / Markdown Content Lesson */}
              {activeLesson.contentType === "TEXT" && (
                <div className="space-y-6">
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
                      {renderCompletionButton()}
                    </div>
                  </div>

                  {activeLesson.linkedQuiz && (
                    <div className="w-full max-w-6xl mx-auto space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-900 text-sm font-bold">
                        <HelpCircle className="w-5 h-5 text-amber-600" />
                        <span>🎯 Bài kiểm tra Quiz đính kèm theo bài đọc này:</span>
                      </div>
                      <LearningQuizPlayer quiz={activeLesson.linkedQuiz} onComplete={handleCompleteLesson} persistAttempt />
                    </div>
                  )}

                  {activeLesson.linkedAssignment && (
                    <div className="w-full max-w-6xl mx-auto space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-900 text-sm font-bold">
                        <CheckSquare className="w-5 h-5 text-purple-600" />
                        <span>📝 Bài tập tự luận đính kèm theo bài đọc này:</span>
                      </div>
                      <LearningAssignmentPanel assignment={activeLesson.linkedAssignment} onComplete={handleCompleteLesson} />
                    </div>
                  )}
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
