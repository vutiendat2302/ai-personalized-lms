import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { courseAuthoringApi } from "../../../api/courses/courseAuthoringApi";
import type { CourseCurriculumResponse } from "../../../api/courses/courseAuthoringApi";
import { CurriculumOutline } from "../../../components/admin/course-builder/CurriculumOutline";
import { LessonEditor } from "../../../components/admin/course-builder/LessonEditor";
import { QuizBuilder } from "../../../components/admin/course-builder/QuizBuilder";
import { AssignmentBuilder } from "../../../components/admin/course-builder/AssignmentBuilder";
import { PublishChecklist } from "../../../components/admin/course-builder/PublishChecklist";
import { CoInstructorManagerModal } from "../../../components/admin/course-builder/CoInstructorManagerModal";
import { ArrowLeft, BookOpen, Layers, CheckCircle, PanelLeftClose, PanelLeftOpen, Eye, Users, Undo2, Edit3, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";

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

      // Create, update, or unlink Quiz for this lesson
      if (updatedData.isQuizAttached && updatedData.quizData) {
        const qData = updatedData.quizData;
        const targetQuizId = updatedData.linkedQuizId || selectedItem?.data?.linkedQuiz?.id;
        if (targetQuizId) {
          await courseAuthoringApi.updateQuiz(targetQuizId, {
            ...qData,
            lessonId: lessonId,
            courseId: id,
          });
        } else {
          await courseAuthoringApi.createQuiz({
            ...qData,
            lessonId: lessonId,
            courseId: id,
          });
        }
      } else if (updatedData.isQuizAttached === false && (updatedData.linkedQuizId || selectedItem?.data?.linkedQuiz?.id)) {
        const targetQuizId = updatedData.linkedQuizId || selectedItem?.data?.linkedQuiz?.id;
        await courseAuthoringApi.updateQuiz(targetQuizId, {
          title: selectedItem?.data?.linkedQuiz?.title || "Quiz",
          lessonId: null,
        });
      }

      // Create, update, or unlink Assignment for this lesson
      if (updatedData.isAssignmentAttached && updatedData.assignmentData) {
        const aData = updatedData.assignmentData;
        const targetAssignmentId = updatedData.linkedAssignmentId || selectedItem?.data?.linkedAssignment?.id;
        if (targetAssignmentId) {
          await courseAuthoringApi.updateAssignment(targetAssignmentId, {
            ...aData,
            lessonId: lessonId,
            courseId: id,
          });
        } else {
          await courseAuthoringApi.createAssignment({
            ...aData,
            lessonId: lessonId,
            courseId: id,
          });
        }
      } else if (updatedData.isAssignmentAttached === false && (updatedData.linkedAssignmentId || selectedItem?.data?.linkedAssignment?.id)) {
        const targetAssignmentId = updatedData.linkedAssignmentId || selectedItem?.data?.linkedAssignment?.id;
        await courseAuthoringApi.updateAssignment(targetAssignmentId, {
          title: selectedItem?.data?.linkedAssignment?.title || "Assignment",
          lessonId: null,
        });
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
      const freshCurriculum = await courseAuthoringApi.getCurriculum(id!);
      setCurriculum(freshCurriculum);

      if (selectedItem && selectedItem.type === "quiz" && String(selectedItem.id) === String(quizId)) {
        let foundQuiz: any = null;
        for (const sec of freshCurriculum.sections || []) {
          const foundChapterQuiz = sec.chapterQuizzes?.find((q: any) => String(q.id) === String(quizId));
          if (foundChapterQuiz) {
            foundQuiz = foundChapterQuiz;
            break;
          }
          for (const l of sec.lessons || []) {
            if (l.linkedQuiz && String(l.linkedQuiz.id) === String(quizId)) {
              foundQuiz = l.linkedQuiz;
              break;
            }
          }
          if (foundQuiz) break;
        }
        if (!foundQuiz && freshCurriculum.finalExamQuizzes) {
          foundQuiz = freshCurriculum.finalExamQuizzes.find((q: any) => String(q.id) === String(quizId));
        }

        if (foundQuiz) {
          setSelectedItem({ type: "quiz", id: String(quizId), data: foundQuiz });
        } else {
          setSelectedItem({
            type: "quiz",
            id: String(quizId),
            data: { ...selectedItem.data, ...updatedData, id: quizId },
          });
        }
      }

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

  const { auth } = useAuth();
  const user = auth.user;
  const isOwner = Boolean(
    user?.id && curriculum?.createdBy && String(user.id) === String(curriculum.createdBy)
  );

  const [isInstructorModalOpen, setIsInstructorModalOpen] = useState(false);

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

  const handleCancelReview = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      await courseAuthoringApi.cancelReview(id);
      toast.success("Đã hủy gửi phê duyệt! Khóa học quay về trạng thái Nháp (DRAFT).");
      fetchCurriculum();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Hủy gửi duyệt thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestEdit = async () => {
    if (!id) return;
    if (
      !window.confirm(
        "LƯU Ý: Chuyển khóa học ACTIVE sang Chế độ chỉnh sửa sẽ làm TẠM ẨN TẤT CẢ GÓI BÁN và lớp học công khai của khóa học này trên hệ thống cho đến khi được phê duyệt lại. Bạn có chắc chắn muốn thực hiện?"
      )
    ) {
      return;
    }

    try {
      setSubmitting(true);
      await courseAuthoringApi.requestEdit(id);
      toast.success("Đã chuyển khóa học sang Chế độ chỉnh sửa! Các gói bán đã được ẩn.");
      fetchCurriculum();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Chuyển chế độ chỉnh sửa thất bại.");
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
            onClick={() => setIsInstructorModalOpen(true)}
            className="h-8 text-xs font-bold gap-1.5 border-gray-300 hover:bg-gray-100 cursor-pointer"
            title="Mời và quản lý danh sách giảng viên phụ trách khóa học"
          >
            <Users className="w-3.5 h-3.5 text-primary" /> Giảng viên phụ trách
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviewCourse}
            className="h-8 text-xs font-bold gap-1.5 text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 cursor-pointer shadow-2xs"
            title="Mở giao diện học viên để xem trước bài giảng & bài tập"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" /> Xem trước giao diện (Preview)
          </Button>

          {/* Status-specific action buttons */}
          {curriculum?.status === "PENDING" && isOwner && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelReview}
              disabled={submitting}
              className="h-8 text-xs font-bold gap-1 text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100 cursor-pointer"
              title="Rút khóa học về trạng thái Nháp DRAFT để chỉnh sửa nội dung"
            >
              <Undo2 className="w-3.5 h-3.5 text-amber-600" /> Hủy gửi duyệt
            </Button>
          )}

          {curriculum?.status === "ACTIVE" && isOwner && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRequestEdit}
              disabled={submitting}
              className="h-8 text-xs font-bold gap-1 text-purple-800 bg-purple-50 border-purple-300 hover:bg-purple-100 cursor-pointer"
              title="Chuyển khóa học về Chế độ chỉnh sửa (Ẩn gói bán)"
            >
              <Edit3 className="w-3.5 h-3.5 text-purple-600" /> Chuyển sang Chế độ chỉnh sửa
            </Button>
          )}

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

      {/* Lock banner if PENDING or ACTIVE */}
      {curriculum?.status === "PENDING" && (
        <div className="bg-amber-500 text-white text-xs px-4 py-2 flex items-center justify-between font-medium shrink-0 shadow-inner">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Khóa học đang trong quá trình <b>Admin chờ duyệt (PENDING)</b>. Nội dung hiện đang khóa chỉnh sửa.</span>
          </div>
          {isOwner && (
            <button
              onClick={handleCancelReview}
              className="underline hover:text-amber-100 text-xs font-bold cursor-pointer"
            >
              Hủy gửi duyệt ngay để tiếp tục chỉnh sửa
            </button>
          )}
        </div>
      )}

      {curriculum?.status === "ACTIVE" && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2 flex items-center justify-between font-medium shrink-0 shadow-inner">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Khóa học <b>đã được duyệt & phát hành (ACTIVE)</b>. Nội dung đang phát hành cho học viên và không thể sửa trực tiếp.</span>
          </div>
          {isOwner && (
            <button
              onClick={handleRequestEdit}
              className="underline hover:text-emerald-100 text-xs font-bold cursor-pointer"
            >
              Bấm vào đây để chuyển sang Chế độ chỉnh sửa (Sẽ tạm ẩn gói bán)
            </button>
          )}
        </div>
      )}

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
          onCancelReview={handleCancelReview}
          onRequestEdit={handleRequestEdit}
          submitting={submitting}
          isOwner={isOwner}
        />
      )}

      {/* Co-Instructor Management Modal */}
      <CoInstructorManagerModal
        isOpen={isInstructorModalOpen}
        onClose={() => setIsInstructorModalOpen(false)}
        courseId={id || ""}
        courseName={curriculum?.courseName || "Khóa học"}
        isOwner={isOwner}
      />
    </div>
  );
};
