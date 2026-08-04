import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { courseAuthoringApi } from "../../../api/courses/courseAuthoringApi";
import type { CourseCurriculumResponse } from "../../../api/courses/courseAuthoringApi";
import { CurriculumOutline } from "../../../components/admin/course-builder/CurriculumOutline";
import { LessonEditor } from "../../../components/admin/course-builder/LessonEditor";
import { QuizBuilder } from "../../../components/admin/course-builder/QuizBuilder";
import { AssignmentBuilder } from "../../../components/admin/course-builder/AssignmentBuilder";
import { PublishChecklist } from "../../../components/admin/course-builder/PublishChecklist";
import { ArrowLeft, BookOpen, Layers, CheckCircle, PanelLeftClose, PanelLeftOpen, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";

export const CourseBuilderShell: React.FC = () => {
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [curriculum, setCurriculum] = useState<CourseCurriculumResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "publish">("content");
  const [showSidebar, setShowSidebar] = useState(true);

  const [selectedItem, setSelectedItem] = useState<{
    type: "lesson" | "quiz" | "assignment" | "section";
    id: string;
    data?: any;
  } | null>(null);

  const fetchCurriculum = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await courseAuthoringApi.getCurriculum(id);
      setCurriculum(data);
    } catch (err) {
      console.error("Failed to load course curriculum:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculum();
  }, [id]);

  const handleAddSection = async (name: string) => {
    if (!id) return;
    try {
      await courseAuthoringApi.addSection(id, name);
      toast.success("Đã tạo chương mới thành công!");
      fetchCurriculum();
    } catch (err) {
      toast.error("Không thể tạo chương mới.");
    }
  };

  const handleUpdateSection = async (sectionId: string, name: string) => {
    try {
      await courseAuthoringApi.updateSection(sectionId, name, "ACTIVE", id);
      toast.success("Đã cập nhật tên chương!");
      fetchCurriculum();
    } catch (err) {
      toast.error("Cập nhật tên chương thất bại.");
    }
  };

  const handleToggleHideSection = async (sectionId: string, currentStatus?: string, name?: string) => {
    const newStatus = currentStatus === "INACTIVE" ? "ACTIVE" : "INACTIVE";
    try {
      await courseAuthoringApi.updateSection(sectionId, name || "Chương học", newStatus, id);
      toast.success(newStatus === "INACTIVE" ? "Đã ẩn chương học khỏi học viên!" : "Đã hiển thị lại chương học!");
      fetchCurriculum();
    } catch (err) {
      toast.error("Không thể thay đổi trạng thái ẩn/hiện.");
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa chương này?")) return;
    try {
      await courseAuthoringApi.deleteSection(sectionId);
      toast.success("Đã xóa chương học!");
      fetchCurriculum();
    } catch (err) {
      toast.error("Không thể xóa chương học còn chứa bài học.");
    }
  };

  const handleAddLesson = async (sectionId: string, type: string) => {
    try {
      const newLesson = await courseAuthoringApi.addLesson(sectionId, {
        name: `Bài học mới (${type})`,
        contentType: type,
        durationMin: 5,
        previewType: "LOCKED",
      });
      fetchCurriculum();
      setSelectedItem({ type: "lesson", id: newLesson.id, data: newLesson });
      toast.success("Đã thêm bài học mới!");
    } catch (err) {
      toast.error("Không thể thêm bài học.");
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài học này?")) return;
    try {
      await courseAuthoringApi.deleteLesson(lessonId);
      if (selectedItem?.id === lessonId) setSelectedItem(null);
      fetchCurriculum();
      toast.success("Đã xóa bài học!");
    } catch (err) {
      toast.error("Không thể xóa bài học.");
    }
  };

  const handleAddChapterQuiz = async (sectionId: string) => {
    if (!id) return;
    try {
      const newQuiz = await courseAuthoringApi.createQuiz({
        courseId: id,
        sectionId,
        title: "Bài kiểm tra giữa chương",
        timeLimitMin: 15,
        passScore: 8.0,
      });
      fetchCurriculum();
      setSelectedItem({ type: "quiz", id: newQuiz.id, data: newQuiz });
      toast.success("Đã thêm bài kiểm tra giữa chương!");
    } catch (err) {
      toast.error("Không thể thêm Quiz.");
    }
  };

  const handleAddFinalExam = async () => {
    if (!id) return;
    try {
      const newQuiz = await courseAuthoringApi.createQuiz({
        courseId: id,
        title: "Bài kiểm tra cuối khóa (Final Exam)",
        timeLimitMin: 45,
        passScore: 8.0,
      });
      fetchCurriculum();
      setSelectedItem({ type: "quiz", id: newQuiz.id, data: newQuiz });
      toast.success("Đã thêm Bài kiểm tra cuối khóa!");
    } catch (err) {
      toast.error("Không thể thêm Final Exam.");
    }
  };

  const handleSaveLesson = async (lessonId: string, updatedData: any) => {
    try {
      await courseAuthoringApi.updateLesson(lessonId, updatedData);

      // Create or update linked Quiz for this lesson
      if (updatedData.quizData) {
        const qData = updatedData.quizData;
        const targetQuizId = updatedData.linkedQuizId || selectedItem?.data?.linkedQuiz?.id;
        if (targetQuizId) {
          await courseAuthoringApi.updateQuiz(targetQuizId, {
            ...qData,
            lessonId: Number(lessonId),
          });
        } else {
          await courseAuthoringApi.createQuiz({
            ...qData,
            lessonId: Number(lessonId),
          });
        }
      }

      // Create or update linked Assignment for this lesson
      if (updatedData.assignmentData) {
        const aData = updatedData.assignmentData;
        const targetAssignmentId = updatedData.linkedAssignmentId || selectedItem?.data?.linkedAssignment?.id;
        if (targetAssignmentId) {
          await courseAuthoringApi.updateAssignment(targetAssignmentId, {
            ...aData,
            lessonId: Number(lessonId),
          });
        } else {
          await courseAuthoringApi.createAssignment({
            ...aData,
            lessonId: Number(lessonId),
          });
        }
      }

      const freshCurriculum = await courseAuthoringApi.getCurriculum(id!);
      setCurriculum(freshCurriculum);

      if (selectedItem && selectedItem.type === "lesson") {
        for (const sec of freshCurriculum.sections || []) {
          const found = sec.lessons?.find((l: any) => String(l.id) === String(lessonId));
          if (found) {
            setSelectedItem({ type: "lesson", id: String(found.id), data: found });
            break;
          }
        }
      }

      toast.success("Đã lưu bài học & thông tin bài kiểm tra thành công!");
    } catch (err) {
      toast.error("Không thể lưu bài học.");
    }
  };

  const handleSaveQuiz = async (quizId: string, updatedData: any) => {
    try {
      await courseAuthoringApi.updateQuiz(quizId, updatedData);
      fetchCurriculum();
      toast.success("Đã lưu Quiz thành công!");
    } catch (err) {
      toast.error("Không thể lưu Quiz.");
    }
  };

  const handleSaveAssignment = async (assignmentId: string, updatedData: any) => {
    try {
      await courseAuthoringApi.updateAssignment(assignmentId, updatedData);
      fetchCurriculum();
      toast.success("Đã lưu Bài tập thành công!");
    } catch (err) {
      toast.error("Không thể lưu Bài tập.");
    }
  };

  const handleSubmitForReview = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      await courseAuthoringApi.submitForReview(id);
      toast.success("Đã gửi khóa học lên ban quản trị phê duyệt!");
      fetchCurriculum();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gửi duyệt thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviewCourse = () => {
    if (id) {
      window.open(`/learn/courses/${id}`, "course_preview_tab");
    } else {
      toast.error("Không tìm thấy mã khóa học.");
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
      <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition"
            title={showSidebar ? "Ẩn danh sách chương" : "Hiện danh sách chương"}
          >
            {showSidebar ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">
              {curriculum?.courseName || "Soạn thảo khóa học"}
            </h1>
            <span className="text-[11px] text-gray-500 font-medium">Studio Quản trị Nội dung</span>
          </div>
          <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-100 text-amber-800">
            {curriculum?.status || "DRAFT"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviewCourse}
            className="h-8 text-xs font-bold gap-1.5 text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 cursor-pointer shadow-2xs"
            title="Mở giao diện học viên để xem trước bài giảng & bài tập"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" /> Xem trước giao diện học (Preview)
          </Button>

          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("content")}
              className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition ${
                activeTab === "content" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Nội dung bài học
            </button>
            <button
              onClick={() => setActiveTab("publish")}
              className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition ${
                activeTab === "publish" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Kiểm tra & Xuất bản
            </button>
          </div>
        </div>
      </header>

      {activeTab === "content" ? (
        <div className="flex-1 flex overflow-hidden">
          {showSidebar && (
            <CurriculumOutline
              curriculum={curriculum}
              selectedItem={selectedItem}
              onSelectItem={setSelectedItem}
              onAddSection={handleAddSection}
              onUpdateSection={handleUpdateSection}
              onToggleHideSection={handleToggleHideSection}
              onDeleteSection={handleDeleteSection}
              onAddLesson={handleAddLesson}
              onDeleteLesson={handleDeleteLesson}
              onAddChapterQuiz={handleAddChapterQuiz}
              onAddFinalExam={handleAddFinalExam}
            />
          )}

          <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50/40">
            {selectedItem?.type === "lesson" && (
              <LessonEditor lesson={selectedItem.data} onSave={handleSaveLesson} />
            )}
            {selectedItem?.type === "quiz" && (
              <QuizBuilder quiz={selectedItem.data} onSave={handleSaveQuiz} />
            )}
            {selectedItem?.type === "assignment" && (
              <AssignmentBuilder assignment={selectedItem.data} onSave={handleSaveAssignment} />
            )}
            {!selectedItem && (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                <BookOpen className="w-12 h-12 mb-2 stroke-[1.5]" />
                <p className="text-sm font-medium">Chọn một bài học hoặc bài kiểm tra ở cây bên trái để chỉnh sửa</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <PublishChecklist
          curriculum={curriculum}
          onSubmitForReview={handleSubmitForReview}
          submitting={submitting}
        />
      )}
    </div>
  );
};
