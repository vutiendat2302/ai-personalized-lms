import React, { useState, useEffect } from "react";
import { courseAuthoringApi, type LessonCurriculumItem } from "../../../api/courses/courseAuthoringApi";
import { fileAdminApi } from "../../../api/file/fileAdminApi";
import { useToast } from "@/hooks/useToast";
import { MathRenderer } from "@/components/common/MathRenderer";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { CodeBlockRenderer } from "@/components/common/CodeBlockRenderer";
import { PdfViewer } from "@/components/common/PdfViewer";
import { LearningQuizPlayer } from "@/components/student/learning/LearningQuizPlayer";
import { QuestionBuilderManager, type QuestionItem } from "./QuestionBuilderManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Save,
  FileText,
  Lock,
  Unlock,
  Clock,
  UploadCloud,
  Paperclip,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  AlignLeft,
  Binary,
  Code,
  Image,
  Video,
  AlertCircle,
  Eye,
  Edit3,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Maximize2,
  Minimize2,
  HelpCircle,
  CheckSquare,
  X,
} from "lucide-react";

export interface ContentBlock {
  id: string;
  type: "markdown" | "paragraph" | "heading" | "math" | "code" | "image" | "video" | "callout";
  content: string;
  level?: number; // 1, 2, 3
  language?: string;
  caption?: string;
  align?: "left" | "center" | "right" | "justify";
}

export interface ResourceAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  fileMetadataId?: string | number;
}

interface LessonEditorProps {
  lesson: LessonCurriculumItem | null;
  onSave: (lessonId: string, updatedData: any) => void;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({ lesson, onSave }) => {
  const toast = useToast();
  const [name, setName] = useState("");
  const [contentType, setContentType] = useState("VIDEO");
  const [contentUrl, setContentUrl] = useState("");
  const [durationMin, setDurationMin] = useState(5);
  const [previewType, setPreviewType] = useState("LOCKED");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Video Source Toggle & Upload State
  const [videoSourceMode, setVideoSourceMode] = useState<"URL" | "FILE">("URL");
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Content Blocks State for TEXT Lessons
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [activeEditorTab, setActiveEditorTab] = useState<"edit" | "preview">("edit");

  // Lesson Resources State
  const [resources, setResources] = useState<ResourceAttachment[]>([]);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Quiz Fields
  const [quizTimeLimitMin, setQuizTimeLimitMin] = useState(15);
  const [quizPassScore, setQuizPassScore] = useState(8.0);
  const [quizMaxAttempts, setQuizMaxAttempts] = useState(3);
  const [quizShuffleQuestions, setQuizShuffleQuestions] = useState(true);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [showQuizPreview, setShowQuizPreview] = useState(false);

  // Assignment Fields
  const [assignmentMaxScore, setAssignmentMaxScore] = useState(10.0);
  const [assignmentDueDate, setAssignmentDueDate] = useState("");
  const [assignmentAllowLate, setAssignmentAllowLate] = useState(false);

  // Automatic Video Duration Handler (90% of total duration)
  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoDurationSec = e.currentTarget.duration;
    if (videoDurationSec && !isNaN(videoDurationSec) && videoDurationSec > 0) {
      const ninetyPercentSec = videoDurationSec * 0.9;
      const calculatedMin = Math.max(1, Math.ceil(ninetyPercentSec / 60));
      setDurationMin(calculatedMin);
    }
  };

  // Change Detection (isDirty State)
  const [isDirty, setIsDirty] = useState(false);

  // Resource display name input state
  const [resourceDisplayName, setResourceDisplayName] = useState("Tài liệu tham khảo");

  useEffect(() => {
    if (lesson) {
      setName(lesson.name || "");
      const currentType = lesson.contentType || "VIDEO";
      setContentType(currentType);
      setContentUrl(lesson.contentUrl || "");
      setDurationMin(lesson.durationMin || (currentType === "VIDEO" ? 5 : 5));
      setPreviewType(lesson.previewType || "LOCKED");
      setIsDirty(false);

      if (lesson.description) {
        if (lesson.description.trim().startsWith("[")) {
          try {
            const parsed = JSON.parse(lesson.description);
            if (Array.isArray(parsed)) {
              setBlocks(parsed);
            }
          } catch (e) {
            setBlocks([{ id: "b1", type: "paragraph", content: lesson.description }]);
          }
        } else {
          setBlocks([{ id: "b1", type: "paragraph", content: lesson.description }]);
        }
      } else {
        setBlocks([{ id: "b1", type: "paragraph", content: `### ${lesson.name || "Nội dung bài đọc"}\n\nNhập nội dung bài đọc bằng Markdown ở đây...` }]);
      }

      if (lesson.resources && Array.isArray(lesson.resources)) {
        setResources(
          lesson.resources.map((r: any) => ({
            id: String(r.id),
            name: r.name || "Tài liệu tham khảo",
            url: r.fileUrl || r.fileKey || "",
            size: r.fileSize || 0,
            type: r.fileType || "DOCUMENT",
          }))
        );
      } else {
        setResources([]);
      }

      if (lesson.linkedQuiz) {
        setQuizTimeLimitMin(lesson.linkedQuiz.timeLimitMin || 15);
        setQuizPassScore(lesson.linkedQuiz.passScore || 8.0);
        setQuizMaxAttempts(lesson.linkedQuiz.maxAttempts || 3);
        setQuizShuffleQuestions(lesson.linkedQuiz.shuffleQuestions ?? true);
      }

      if (lesson.linkedAssignment) {
        setAssignmentMaxScore(lesson.linkedAssignment.maxScore || 10.0);
        setAssignmentDueDate(lesson.linkedAssignment.dueDate ? lesson.linkedAssignment.dueDate.substring(0, 16) : "");
        setAssignmentAllowLate(lesson.linkedAssignment.allowLate || false);
      }

      try {
        if (lesson.description && lesson.description.trim().startsWith("[")) {
          const parsed = JSON.parse(lesson.description);
          if (Array.isArray(parsed)) {
            setBlocks(parsed);
          } else {
            setBlocks([{ id: "b1", type: "paragraph", content: lesson.description }]);
          }
        } else if (lesson.description) {
          setBlocks([{ id: "b1", type: "paragraph", content: lesson.description }]);
        } else {
          setBlocks([
            { id: "b1", type: "heading", content: lesson.name || "Tiêu đề bài học", level: 2 },
            { id: "b2", type: "paragraph", content: "Nhập nội dung chi tiết bài học..." },
          ]);
        }
      } catch (err) {
        setBlocks([{ id: "b1", type: "paragraph", content: lesson.description || "" }]);
      }
    }
  }, [lesson]);

  const handlePdfFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPdf(true);
      const res = await fileAdminApi.uploadFile(file, "DOCUMENT", "LESSON_RESOURCE");
      const fileUrl = (res as any).fileUrl || res.fileKey;
      setContentUrl(fileUrl);
      setIsDirty(true);
      toast.success("Tải lên tệp tài liệu thành công!");
    } catch (err: any) {
      toast.error("Tải tệp tài liệu thất bại: " + (err.message || "Lỗi máy chủ"));
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingVideo(true);
      const res = await fileAdminApi.uploadFile(file, "VIDEO", "LESSON_VIDEO");
      const fileUrl = (res as any).fileUrl || res.fileKey;
      setContentUrl(fileUrl);
      toast.success("Tải lên video thành công!");
    } catch (err: any) {
      toast.error("Tải lên video thất bại: " + (err.message || "Lỗi máy chủ"));
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleResourceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingResource(true);
      const res = await fileAdminApi.uploadFile(file, "DOCUMENT", "LESSON_RESOURCE");
      const displayName = resourceDisplayName.trim() || file.name || "Tài liệu tham khảo";
      let createdResource: any = null;

      if (lesson && lesson.id) {
        createdResource = await courseAuthoringApi.addLessonResource(
          String(lesson.id),
          String(res.id),
          displayName
        );
      }

      const newRes: ResourceAttachment = {
        id: String(createdResource?.id || res.id || Date.now()),
        name: displayName,
        url: (res as any).fileUrl || res.fileKey || "",
        size: res.fileSize || file.size || 0,
        type: res.fileType || file.type || "DOCUMENT",
        fileMetadataId: res.id,
      };
      setResources((prev) => [...prev, newRes]);
      setResourceDisplayName("Tài liệu tham khảo");
      setIsDirty(true);
      toast.success("Đã đính kèm tài liệu thành công!");
    } catch (err: any) {
      toast.error("Tải tài liệu thất bại: " + (err.message || "Lỗi máy chủ"));
    } finally {
      setUploadingResource(false);
    }
  };

  const removeResource = async (id: string) => {
    try {
      if (id && !id.startsWith("temp_")) {
        await courseAuthoringApi.deleteLessonResource(id);
      }
      setResources((prev) => prev.filter((r) => r.id !== id));
      toast.success("Đã xóa tài liệu đính kèm!");
    } catch (err: any) {
      toast.error("Xóa tài liệu thất bại.");
    }
  };

  const handlePreviewResource = async (res: ResourceAttachment) => {
    if (!res.url) return;
    if (res.url.startsWith("http://") || res.url.startsWith("https://")) {
      window.open(res.url, "_blank");
      return;
    }
    try {
      const previewUrl = await fileAdminApi.getPreviewUrl(res.url);
      if (previewUrl) {
        window.open(previewUrl, "_blank");
      } else {
        window.open(`http://localhost:8080/api/v1/files/download?fileKey=${encodeURIComponent(res.url)}`, "_blank");
      }
    } catch (e) {
      window.open(`http://localhost:8080/api/v1/files/download?fileKey=${encodeURIComponent(res.url)}`, "_blank");
    }
  };

  const addBlock = (type: ContentBlock["type"]) => {
    const newBlock: ContentBlock = {
      id: "b_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      type,
      content:
        type === "heading"
          ? "Tiêu đề mục mới"
          : type === "math"
          ? "E = mc^2"
          : type === "code"
          ? "// Viết mã nguồn tại đây\nconsole.log('Hello World');"
          : type === "callout"
          ? "Ghi chú lưu ý quan trọng cho học viên."
          : "",
      level: type === "heading" ? 2 : undefined,
      language: type === "code" ? "javascript" : undefined,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setIsDirty(true);
  };

  const updateBlock = (id: string, updatedFields: Partial<ContentBlock>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updatedFields } : b))
    );
    setIsDirty(true);
  };

  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setIsDirty(true);
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === blocks.length - 1)
    )
      return;

    const newBlocks = [...blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
    setBlocks(newBlocks);
    setIsDirty(true);
  };

  // Attach Quiz & Assignment Forms for Any Lesson
  const [showAttachQuizForm, setShowAttachQuizForm] = useState(false);
  const [showAttachAssignmentForm, setShowAttachAssignmentForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson) return;
    const descriptionJson = JSON.stringify(blocks);
    onSave(lesson.id, {
      name,
      contentType,
      contentUrl,
      description: descriptionJson,
      durationMin,
      previewType,
      linkedQuizId: lesson.linkedQuiz?.id,
      linkedAssignmentId: lesson.linkedAssignment?.id,
      quizData: (contentType === "QUIZ" || showAttachQuizForm || lesson.linkedQuiz) ? {
        title: lesson.linkedQuiz?.title || (name + " - Quiz kiểm tra"),
        description: questions.length > 0 ? JSON.stringify(questions) : (contentUrl || "Bài kiểm tra trắc nghiệm theo bài học"),
        questions: questions,
        timeLimitMin: quizTimeLimitMin,
        passScore: quizPassScore,
        maxAttempts: quizMaxAttempts,
        shuffleQuestions: quizShuffleQuestions,
      } : undefined,
      assignmentData: (contentType === "ASSIGNMENT" || showAttachAssignmentForm || lesson.linkedAssignment) ? {
        title: lesson.linkedAssignment?.title || (name + " - Bài tập tự luận"),
        description: contentUrl || "Bài tập tự luận theo bài học",
        maxScore: assignmentMaxScore,
        dueDate: assignmentDueDate || undefined,
        allowLate: assignmentAllowLate,
      } : undefined,
    });

    if (lesson && lesson.id && !lesson.id.toString().startsWith("temp_")) {
      resources.forEach(async (r) => {
        if (r.fileMetadataId) {
          try {
            await courseAuthoringApi.addLessonResource(
              lesson.id,
              String(r.fileMetadataId),
              r.name
            );
          } catch (e) {
            // Resource already linked or queued
          }
        }
      });
    }

    setIsDirty(false);
    toast.success("✅ Đã lưu tất cả thay đổi của bài học!");
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (!lesson) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
        <FileText className="w-12 h-12 mb-2 stroke-[1.5]" />
        <p className="text-sm font-medium">Chọn một bài học từ danh sách bên trái để chỉnh sửa</p>
      </div>
    );
  }

  return (
    <Card
      className={`flex-1 transition-all ${
        isFullscreen
          ? "fixed inset-0 z-50 p-8 bg-background max-w-none my-0 rounded-none overflow-y-auto border-0"
          : "p-6 max-w-5xl mx-auto bg-card border-border/40 rounded-xl shadow-xs my-4 overflow-y-auto"
      }`}
    >
      {/* Top Action Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            Soạn thảo bài học
            {isFullscreen && (
              <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary">
                Chế độ Toàn màn hình Focus
              </Badge>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">ID: {lesson.id}</p>
        </div>

        <div className="flex items-center gap-2">
          {isDirty ? (
            <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold gap-1.5 text-[11px] py-1 px-3 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Có thay đổi chưa lưu
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground border-border/60 font-medium gap-1.5 text-[11px] py-1 px-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Đã đồng bộ tất cả
            </Badge>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-9 text-xs font-bold gap-1.5 cursor-pointer"
            title={isFullscreen ? "Thoát toàn màn hình (Esc)" : "Mở rộng toàn màn hình"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-primary" /> : <Maximize2 className="w-4 h-4 text-primary" />}
            <span>{isFullscreen ? "Thu nhỏ (Esc)" : "Toàn màn hình"}</span>
          </Button>

          <Button
            onClick={handleSubmit}
            size="sm"
            disabled={!isDirty}
            className={`h-9 text-xs font-bold gap-1.5 transition cursor-pointer shadow-2xs ${
              isDirty
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md ring-2 ring-primary/20"
                : "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed opacity-50"
            }`}
          >
            <Save className="w-4 h-4" /> {isDirty ? "Lưu thay đổi" : "Đã lưu tất cả"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lesson Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-bold">Tên bài học</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setIsDirty(true);
              }}
              required
              className="h-9 text-sm"
              placeholder="Nhập tên bài học..."
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Loại bài học</Label>
            <select
              value={contentType}
              onChange={(e) => {
                const newType = e.target.value;
                if (newType !== contentType) {
                  setContentUrl("");
                }
                setContentType(newType);
                if (newType !== "VIDEO") {
                  setDurationMin(5);
                }
                setIsDirty(true);
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold outline-none"
            >
              <option value="VIDEO">Video bài giảng</option>
              <option value="TEXT">Bài đọc Content Block (TipTap / BlockNote Style)</option>
              <option value="PDF">Tài liệu PDF</option>
              <option value="QUIZ">Bài kiểm tra Quiz (Lesson-level)</option>
              <option value="ASSIGNMENT">Bài tập tự luận Assignment (Lesson-level)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-bold">Quyền xem thử</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={previewType === "FREE" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setPreviewType("FREE");
                  setIsDirty(true);
                }}
                className={`flex-1 h-9 text-xs font-bold gap-1.5 cursor-pointer ${
                  previewType === "FREE" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                }`}
              >
                <Unlock className="w-3.5 h-3.5" /> Xem miễn phí
              </Button>
              <Button
                type="button"
                variant={previewType === "LOCKED" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setPreviewType("LOCKED");
                  setIsDirty(true);
                }}
                className={`flex-1 h-9 text-xs font-bold gap-1.5 cursor-pointer ${
                  previewType === "LOCKED" ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                <Lock className="w-3.5 h-3.5" /> Khóa bài học
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Thời lượng ước tính (Phút)</Label>
            <div className="relative w-full">
              <Input
                type="number"
                min={1}
                value={durationMin}
                onChange={(e) => setDurationMin(parseInt(e.target.value) || 1)}
                className="h-9 pl-8 text-sm"
              />
              <Clock className="w-4 h-4 text-muted-foreground absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* 1. VIDEO CONTENT EDITOR + SOURCE SELECTOR + VIDEO NOTES */}
        {contentType === "VIDEO" && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-primary/10 pb-2">
              <Label className="text-xs font-bold text-primary uppercase tracking-wider">
                1. Nguồn Video Bài giảng
              </Label>

              <div className="flex bg-background border border-border/40 p-0.5 rounded-lg text-xs font-bold shadow-2xs">
                <Button
                  type="button"
                  size="sm"
                  variant={videoSourceMode === "URL" ? "default" : "ghost"}
                  onClick={() => setVideoSourceMode("URL")}
                  className="h-7 text-xs font-bold cursor-pointer"
                >
                  🔗 Link URL / YouTube
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={videoSourceMode === "FILE" ? "default" : "ghost"}
                  onClick={() => setVideoSourceMode("FILE")}
                  className="h-7 text-xs font-bold cursor-pointer"
                >
                  ☁️ Upload tệp MinIO
                </Button>
              </div>
            </div>

            {videoSourceMode === "URL" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Đường dẫn Video (YouTube / Direct Link MP4):</Label>
                  {contentUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setContentUrl("")}
                      className="h-6 text-[11px] text-destructive font-bold p-0 cursor-pointer"
                    >
                      Xóa link hiện tại
                    </Button>
                  )}
                </div>
                <Input
                  type="text"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  placeholder="Dán link YouTube (VD: https://youtu.be/...) hoặc link MP4..."
                  className="h-9 text-xs font-mono bg-background"
                />
              </div>
            )}

            {videoSourceMode === "FILE" && (
              <div className="space-y-2">
                {contentUrl && (contentUrl.startsWith("http://") || contentUrl.startsWith("https://")) ? (
                  <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-xs flex items-center justify-between text-amber-900 font-medium shadow-2xs">
                    <span className="truncate pr-2">
                      ⚠️ Đã gắn đường dẫn Video URL. Vui lòng bấm <b>"Xóa link hiện tại"</b> để tải tệp video mới từ máy tính lên MinIO.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setContentUrl("")}
                      className="h-7 text-xs font-bold text-amber-900 border-amber-300 bg-white hover:bg-amber-100 shrink-0 cursor-pointer"
                    >
                      Xóa link hiện tại
                    </Button>
                  </div>
                ) : !contentUrl ? (
                  <div className="border-2 border-dashed border-primary/30 rounded-2xl p-4 flex flex-col items-center justify-center bg-background text-center">
                    <UploadCloud className="w-8 h-8 text-primary mb-1" />
                    <span className="text-xs font-bold text-foreground">Kéo thả hoặc Chọn tệp Video từ máy tính</span>
                    <span className="text-[10px] text-muted-foreground mb-2">Được lưu trực tiếp lên máy chủ MinIO</span>
                    <label className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs">
                      {uploadingVideo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải tệp lên...
                        </>
                      ) : (
                        "Chọn tệp Video tải lên MinIO"
                      )}
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileUpload}
                        disabled={uploadingVideo}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="p-3 bg-background border border-primary/20 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="font-mono truncate">{contentUrl}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setContentUrl("")}
                      className="h-6 text-destructive font-bold cursor-pointer"
                    >
                      Xóa tệp / Chọn tệp khác
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Video Player Preview */}
            {contentUrl && (
              <div className="mt-3 aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-border/40 relative shadow-2xs">
                {(() => {
                  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
                  const match = contentUrl.match(regExp);
                  const ytId = match?.[1] || null;
                  if (ytId) {
                    return (
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${ytId}?controls=1&enablejsapi=1&modestbranding=1&rel=0`}
                        title="YouTube video player"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }

                  let streamUrl = contentUrl;
                  if (contentUrl.includes("s3.lms.com/")) {
                    const key = contentUrl.substring(contentUrl.indexOf("s3.lms.com/") + "s3.lms.com/".length);
                    streamUrl = `http://localhost:8080/api/v1/files/download?fileKey=${encodeURIComponent(key)}`;
                  } else if (!contentUrl.startsWith("http://") && !contentUrl.startsWith("https://")) {
                    streamUrl = `http://localhost:8080/api/v1/files/download?fileKey=${encodeURIComponent(contentUrl)}`;
                  }

                  return (
                    <video
                      key={streamUrl}
                      src={streamUrl}
                      controls
                      onLoadedMetadata={handleVideoLoadedMetadata}
                      onError={() => {
                        console.warn("Video failed to load from URL:", streamUrl);
                      }}
                      className="w-full h-full object-contain"
                    />
                  );
                })()}
              </div>
            )}

            {/* Video Notes & Summary Section */}
            <div className="pt-3 border-t border-primary/10 space-y-2">
              <Label className="block text-xs font-bold text-primary uppercase tracking-wider">
                2. Nội dung tóm tắt & Ghi chú bài giảng Video
              </Label>

              <div className="space-y-3 pt-1">
                <div className="p-2 bg-background border border-border/40 rounded-xl flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-bold text-muted-foreground mr-1">+ Thêm Block Ghi chú:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addBlock("paragraph")}
                    className="h-7 text-xs font-semibold gap-1 cursor-pointer"
                  >
                    <AlignLeft className="w-3.5 h-3.5 text-emerald-600" /> Đoạn văn
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addBlock("callout")}
                    className="h-7 text-xs font-semibold gap-1 cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-orange-600" /> Lưu ý quan trọng
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addBlock("code")}
                    className="h-7 text-xs font-semibold gap-1 cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5 text-purple-600" /> Code ví dụ
                  </Button>
                </div>

                <div className="space-y-2">
                  {blocks.map((block, idx) => (
                    <div key={block.id} className="border border-border/40 rounded-xl p-2.5 bg-background space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                        <span>Block #{idx + 1} ({block.type})</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => deleteBlock(block.id)} className="h-5 p-0 text-destructive font-bold cursor-pointer">Xóa</Button>
                      </div>
                      {block.type === "paragraph" && (
                        <Textarea
                          rows={2}
                          value={block.content}
                          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                          placeholder="Mô tả / Mốc thời gian..."
                          className="text-xs"
                        />
                      )}
                      {block.type === "callout" && (
                        <Textarea
                          rows={2}
                          value={block.content}
                          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                          placeholder="Nhắc nhở lưu ý cho học viên..."
                          className="text-xs bg-orange-50/50 border-orange-300 text-orange-950 font-semibold"
                        />
                      )}
                      {block.type === "code" && (
                        <Textarea
                          rows={3}
                          value={block.content}
                          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                          placeholder="Dán mã mẫu..."
                          className="text-xs font-mono bg-gray-900 text-emerald-400"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. TEXT LESSON: HYBRID BLOCK EDITOR (Markdown Text + Math + Code + Image + Video + Callout) */}
        {contentType === "TEXT" && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-primary" />
                <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Trình soạn thảo Block Bài đọc (Markdown Text + Dedicated Blocks)
                </Label>
              </div>

              <div className="flex bg-muted/40 p-0.5 rounded-lg text-xs font-semibold">
                <Button
                  type="button"
                  size="sm"
                  variant={activeEditorTab === "edit" ? "default" : "ghost"}
                  onClick={() => setActiveEditorTab("edit")}
                  className="h-7 text-xs font-bold cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" /> Soạn thảo ({blocks.length} blocks)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={activeEditorTab === "preview" ? "default" : "ghost"}
                  onClick={() => setActiveEditorTab("preview")}
                  className="h-7 text-xs font-bold cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> Xem trước giao diện học
                </Button>
              </div>
            </div>

            {activeEditorTab === "edit" ? (
              <div className="space-y-3">
                {/* Block Creation Menu Toolbar */}
                <div className="p-2.5 bg-muted/30 border border-border/40 rounded-xl flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] font-bold text-muted-foreground mr-1">+ Thêm Block:</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => addBlock("paragraph")} className="h-7 text-xs font-semibold gap-1 cursor-pointer">
                    <AlignLeft className="w-3.5 h-3.5 text-emerald-600" /> Văn bản (Markdown)
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addBlock("math")} className="h-7 text-xs font-semibold gap-1 cursor-pointer">
                    <Binary className="w-3.5 h-3.5 text-amber-600" /> Công thức Toán (LaTeX)
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addBlock("code")} className="h-7 text-xs font-semibold gap-1 cursor-pointer">
                    <Code className="w-3.5 h-3.5 text-purple-600" /> Mã nguồn (Code Snippet)
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addBlock("image")} className="h-7 text-xs font-semibold gap-1 cursor-pointer">
                    <Image className="w-3.5 h-3.5 text-rose-600" /> Hình ảnh (URL)
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addBlock("video")} className="h-7 text-xs font-semibold gap-1 cursor-pointer">
                    <Video className="w-3.5 h-3.5 text-sky-600" /> Video Embed
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addBlock("callout")} className="h-7 text-xs font-semibold gap-1 cursor-pointer">
                    <AlertCircle className="w-3.5 h-3.5 text-orange-600" /> Ghi chú lưu ý
                  </Button>
                </div>

                {/* Blocks List */}
                <div className="space-y-3 min-h-[250px]">
                  {blocks.map((block, idx) => (
                    <div
                      key={block.id}
                      className="group border border-border/40 hover:border-primary/50 rounded-xl p-3 bg-background shadow-2xs transition relative"
                    >
                      <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] font-extrabold uppercase">
                            #{idx + 1} {block.type === "paragraph" || block.type === "heading" ? "Markdown Text" : block.type}
                          </Badge>

                          {block.type === "code" && (
                            <select
                              value={block.language || "javascript"}
                              onChange={(e) => updateBlock(block.id, { language: e.target.value })}
                              className="text-xs font-bold border border-border bg-background rounded px-1.5 py-0.5 outline-none"
                            >
                              <option value="javascript">JavaScript</option>
                              <option value="java">Java</option>
                              <option value="python">Python</option>
                              <option value="sql">SQL</option>
                              <option value="html">HTML/CSS</option>
                            </select>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          <Button type="button" variant="ghost" size="sm" onClick={() => moveBlock(idx, "up")} disabled={idx === 0} className="h-6 w-6 p-0 cursor-pointer">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => moveBlock(idx, "down")} disabled={idx === blocks.length - 1} className="h-6 w-6 p-0 cursor-pointer">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => deleteBlock(block.id)} className="h-6 w-6 p-0 text-destructive cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Block Input Content */}
                      {(block.type === "paragraph" || block.type === "heading" || block.type === "markdown") && (
                        <div className="space-y-1.5">
                          {/* Markdown Quick Toolbar */}
                          <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/20 border border-border/40 rounded-lg text-[11px]">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Chèn nhanh:</span>
                            {[
                              { label: "# H1", snippet: "# Tiêu đề lớn" },
                              { label: "## H2", snippet: "## Tiêu đề phụ" },
                              { label: "**Bold**", snippet: "**văn bản in đậm**" },
                              { label: "*Italic*", snippet: "*văn bản in nghiêng*" },
                              { label: "~~Strikethrough~~", snippet: "~~văn bản gạch ngang~~" },
                              { label: "• List", snippet: "- Mục 1\n- Mục 2" },
                              { label: "> Blockquote", snippet: "> Ghi chú..." },
                            ].map((item) => (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => updateBlock(block.id, { content: (block.content || "") + "\n" + item.snippet })}
                                className="px-1.5 py-0.5 bg-background hover:bg-muted text-foreground border border-border/40 rounded font-semibold cursor-pointer"
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>

                          <Textarea
                            rows={4}
                            value={block.content}
                            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                            placeholder="Nhập nội dung văn bản bằng Markdown (hỗ trợ # Heading, **In đậm**, *In nghiêng*, list...)"
                            className="text-xs font-mono leading-relaxed"
                          />
                        </div>
                      )}

                      {block.type === "math" && (
                        <div className="space-y-2">
                          <Input
                            type="text"
                            value={block.content}
                            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                            placeholder="Nhập mã công thức LaTeX (vd: E = mc^2, \frac{a}{b}, \sqrt{x}...)"
                            className="h-9 text-xs font-mono bg-amber-50/30 border-amber-300"
                          />
                          {/* Quick LaTeX Insertion Toolbar */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-bold text-amber-800 uppercase mr-1">Chèn nhanh mẫu:</span>
                            {[
                              { label: "Phân số \\frac{a}{b}", snippet: "\\frac{a}{b}" },
                              { label: "Căn thức \\sqrt{x}", snippet: "\\sqrt{x}" },
                              { label: "Số mũ x²", snippet: "x^{2}" },
                              { label: "Tích phân ∫", snippet: "\\int_{0}^{1} f(x) dx" },
                              { label: "Tổng ∑", snippet: "\\sum_{i=1}^{n} i" },
                              { label: "Ký hiệu π, α", snippet: "\\pi, \\alpha, \\beta" },
                            ].map((item) => (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => updateBlock(block.id, { content: (block.content ? block.content + " " : "") + item.snippet })}
                                className="px-2 py-0.5 bg-amber-100/80 hover:bg-amber-200 text-amber-900 rounded text-[11px] font-mono font-medium transition cursor-pointer border border-amber-300/60"
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                          {/* Live Rendered KaTeX Preview */}
                          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-center flex items-center justify-center min-h-[50px] shadow-2xs">
                            {block.content ? (
                              <MathRenderer math={block.content} displayMode={true} />
                            ) : (
                              <span className="text-xs text-amber-600/70 italic">Xem trước công thức Toán sẽ xuất hiện tại đây...</span>
                            )}
                          </div>
                        </div>
                      )}

                      {block.type === "code" && (
                        <Textarea
                          rows={4}
                          value={block.content}
                          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                          placeholder="Dán mã nguồn tại đây..."
                          className="text-xs font-mono bg-gray-900 text-emerald-400"
                        />
                      )}

                      {block.type === "image" && (
                        <div className="space-y-2">
                          <Input
                            type="text"
                            value={block.content}
                            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                            placeholder="URL hình ảnh (https://...)"
                            className="h-8 text-xs"
                          />
                          <Input
                            type="text"
                            value={block.caption || ""}
                            onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                            placeholder="Chú thích hình ảnh..."
                            className="h-7 text-[11px] italic"
                          />
                          {block.content && (
                            <div className="text-center pt-1">
                              <img src={block.content} alt={block.caption} className="max-h-48 mx-auto rounded-lg border border-border/40 shadow-2xs" />
                            </div>
                          )}
                        </div>
                      )}

                      {block.type === "video" && (
                        <div className="space-y-2">
                          <Input
                            type="text"
                            value={block.content}
                            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                            placeholder="URL Embed Video YouTube (https://www.youtube.com/watch?v=...)"
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      )}

                      {block.type === "callout" && (
                        <Textarea
                          rows={2}
                          value={block.content}
                          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                          placeholder="Ghi chú chú ý cho học viên..."
                          className="text-xs border-orange-300 bg-orange-50/50 text-orange-950 font-semibold"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Live Preview Mode */
              <div className="p-6 bg-background border border-border/40 rounded-2xl space-y-4">
                {blocks.map((block) => (
                  <div key={block.id}>
                    {(block.type === "paragraph" || block.type === "heading" || block.type === "markdown") && (
                      <MarkdownRenderer content={block.content} />
                    )}

                    {block.type === "math" && (
                      <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-sm text-amber-950 flex items-center justify-center my-2 shadow-2xs">
                        <MathRenderer math={block.content} displayMode={true} />
                      </div>
                    )}

                    {block.type === "code" && (
                      <CodeBlockRenderer code={block.content} language={block.language} />
                    )}

                    {block.type === "image" && block.content && (
                      <div className="text-center my-3">
                        <img src={block.content} alt={block.caption} className="max-h-80 mx-auto rounded-xl shadow-xs border border-border/40" />
                        {block.caption && <p className="text-[11px] text-muted-foreground italic mt-1">{block.caption}</p>}
                      </div>
                    )}

                    {block.type === "video" && block.content && (
                      <div className="aspect-video bg-black rounded-xl overflow-hidden my-3">
                        {(() => {
                          const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
                          const match = block.content.match(regExp);
                          const ytId = match && match[1] ? match[1] : null;
                          if (ytId) {
                            return (
                              <iframe
                                src={`https://www.youtube.com/embed/${ytId}?autoplay=0&controls=1&rel=0`}
                                title="YouTube video player"
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                            );
                          }
                          return <video src={block.content} controls className="w-full h-full object-contain" />;
                        })()}
                      </div>
                    )}

                    {block.type === "callout" && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-950 font-medium flex gap-2 my-2">
                        <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <span>{block.content}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. PDF / DOCUMENT LESSON CONTENT EDITOR & VIEWER */}
        {(contentType === "PDF" || contentType === "DOCUMENT") && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-primary/10 pb-2">
              <Label className="text-xs font-bold text-primary uppercase tracking-wider">
                Tệp bài học (PDF / Word / Markdown / HTML)
              </Label>
              {contentUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setContentUrl("")}
                  className="h-6 text-xs font-bold text-destructive hover:bg-destructive/10 p-1 cursor-pointer"
                >
                  Xóa tệp hiện tại / Thay tệp khác
                </Button>
              )}
            </div>

            {/* Upload File Zone */}
            {!contentUrl ? (
              <div className="border-2 border-dashed border-primary/30 rounded-2xl p-6 flex flex-col items-center justify-center bg-background text-center">
                <UploadCloud className="w-10 h-10 text-primary mb-2" />
                <span className="text-sm font-bold text-foreground mb-1">
                  Chọn tệp bài học từ máy tính (PDF, Word, Markdown, HTML)
                </span>
                <span className="text-xs text-muted-foreground mb-3">
                  Tệp sẽ được tải lên và lưu trực tiếp trên MinIO Storage
                </span>
                <label className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl cursor-pointer flex items-center gap-2 shadow-2xs transition">
                  {uploadingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang tải tệp lên MinIO...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" /> Chọn tệp PDF / Word / MD / HTML
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.md,.markdown,.html,.htm,text/plain"
                    onChange={handlePdfFileUpload}
                    disabled={uploadingPdf}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-background border border-primary/20 rounded-xl flex items-center justify-between text-xs shadow-2xs">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-mono font-bold truncate text-foreground">{contentUrl}</span>
                  </div>
                  <a
                    href={
                      contentUrl.startsWith("http://") || contentUrl.startsWith("https://")
                        ? contentUrl
                        : `http://localhost:8080/api/v1/files/download?fileKey=${encodeURIComponent(contentUrl)}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline text-xs font-bold shrink-0 ml-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Mở trong tab mới
                  </a>
                </div>

                {/* Render PDF / Word / MD / HTML Viewer */}
                <div className="rounded-2xl border border-border/40 bg-background overflow-hidden shadow-md">
                  {(() => {
                    const lowerUrl = contentUrl.toLowerCase();
                    const docStreamUrl = contentUrl.startsWith("http://") || contentUrl.startsWith("https://")
                      ? contentUrl
                      : `http://localhost:8080/api/v1/files/download?fileKey=${encodeURIComponent(contentUrl)}`;

                    // PDF Viewer (using <PdfViewer /> with presigned URL)
                    if (lowerUrl.includes(".pdf") || lowerUrl.includes("pdf")) {
                      return <PdfViewer fileKeyOrUrl={contentUrl} className="h-[650px]" />;
                    }

                    // HTML Viewer
                    if (lowerUrl.includes(".html") || lowerUrl.includes(".htm")) {
                      return (
                        <div className="w-full h-[600px] bg-white">
                          <iframe
                            src={docStreamUrl}
                            className="w-full h-full border-0"
                            title="Trình xem bài học HTML"
                          />
                        </div>
                      );
                    }

                    // Markdown Viewer
                    if (lowerUrl.includes(".md") || lowerUrl.includes(".markdown")) {
                      return (
                        <div className="p-6 bg-background max-h-[600px] overflow-y-auto">
                          <MarkdownRenderer content={contentUrl} />
                        </div>
                      );
                    }

                    // Word / DOCX / Other Documents Viewer (via Office / Google Docs viewer or iframe)
                    return (
                      <div className="w-full h-[650px] bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                        <iframe
                          src={`https://docs.google.com/viewer?url=${encodeURIComponent(docStreamUrl)}&embedded=true`}
                          className="w-full h-full border-0 rounded-xl"
                          title="Trình xem tài liệu Word"
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. QUIZ LESSON EDITOR */}
        {contentType === "QUIZ" && (
          <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
              <Label className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Thiết lập & Soạn thảo Bài kiểm tra Quiz cho bài học này
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuizPreview(true)}
                  className="h-7 text-xs font-bold text-amber-900 bg-amber-100 border-amber-300 hover:bg-amber-200 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Xem trước Quiz (Preview)
                </Button>
                <Badge className="bg-amber-100 text-amber-900 font-bold">Quiz bài học</Badge>
              </div>
            </div>

            {/* Quiz Preview Modal inside LessonEditor */}
            {showQuizPreview && (
              <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
                <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl border border-gray-200">
                  <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between z-10">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                      <Eye className="w-4 h-4" /> Xem trước giao diện làm bài Quiz (Preview)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQuizPreview(false)}
                      className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full cursor-pointer transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4">
                    <LearningQuizPlayer
                      quiz={{
                        id: String(lesson.id),
                        title: name || "Bài kiểm tra Quiz",
                        description: contentUrl,
                        timeLimitMin: quizTimeLimitMin,
                        passScore: quizPassScore,
                        maxAttempts: quizMaxAttempts,
                        shuffleQuestions: quizShuffleQuestions,
                        questions: questions,
                      }}
                      onComplete={() => setShowQuizPreview(false)}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Tên bài Quiz</Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tiêu đề Bài Quiz..."
                  className="h-9 text-xs bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Thời gian làm bài (Phút)</Label>
                  <Input
                    type="number"
                    value={quizTimeLimitMin}
                    onChange={(e) => setQuizTimeLimitMin(Number(e.target.value))}
                    className="h-9 text-xs bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Điểm đạt tối thiểu (Thang 10)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={quizPassScore}
                    onChange={(e) => setQuizPassScore(Number(e.target.value))}
                    className="h-9 text-xs bg-background"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Số lần làm lại tối đa</Label>
                  <Input
                    type="number"
                    value={quizMaxAttempts}
                    onChange={(e) => setQuizMaxAttempts(Number(e.target.value))}
                    className="h-9 text-xs bg-background"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="shuffleQuestions"
                    checked={quizShuffleQuestions}
                    onChange={(e) => setQuizShuffleQuestions(e.target.checked)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <Label htmlFor="shuffleQuestions" className="text-xs font-bold cursor-pointer">
                    Trộn thứ tự câu hỏi khi thi
                  </Label>
                </div>
              </div>

              {/* Embedded Question Builder */}
              <div className="pt-4 border-t border-amber-200/60 bg-white p-4 rounded-xl border">
                <QuestionBuilderManager
                  questions={questions}
                  onChange={(updatedQ) => {
                    setQuestions(updatedQ);
                    setIsDirty(true);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. ASSIGNMENT LESSON EDITOR */}
        {contentType === "ASSIGNMENT" && (
          <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
              <Label className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                Thiết lập Bài tập tự luận Assignment cho bài học này
              </Label>
              <Badge className="bg-purple-100 text-purple-900 font-bold">Assignment bài học</Badge>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Tên bài tập</Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tiêu đề Bài tập..."
                  className="h-9 text-xs bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Thang điểm tối đa</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={assignmentMaxScore}
                    onChange={(e) => setAssignmentMaxScore(Number(e.target.value))}
                    className="h-9 text-xs bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Hạn nộp bài (DueDate)</Label>
                  <Input
                    type="datetime-local"
                    value={assignmentDueDate}
                    onChange={(e) => setAssignmentDueDate(e.target.value)}
                    className="h-9 text-xs bg-background"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Yêu cầu nộp bài (URL đính kèm / Hướng dẫn)</Label>
                <Input
                  type="text"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  placeholder="Link tài liệu đề bài (https://...)"
                  className="h-9 text-xs bg-background"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. SUPPLEMENTARY LESSON RESOURCES */}
        <div className="pt-4 border-t border-border/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-primary" />
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Tài liệu hỗ trợ đính kèm ({resources.length})
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={resourceDisplayName}
                onChange={(e) => setResourceDisplayName(e.target.value)}
                placeholder="Nhập tên hiển thị (vd: Slide bài giảng...)"
                className="h-8 text-xs w-64 bg-background"
              />
              <label className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 transition shrink-0">
                {uploadingResource ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Tải lên tài liệu
                <input
                  type="file"
                  onChange={handleResourceFileUpload}
                  disabled={uploadingResource}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {resources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {resources.map((res) => (
                <div
                  key={res.id}
                  className="flex items-center justify-between p-2.5 bg-muted/20 border border-border/40 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="truncate">
                      <p className="font-bold text-foreground truncate">{res.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatFileSize(res.size)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handlePreviewResource(res)}
                      className="p-1 text-primary hover:bg-primary/10 rounded cursor-pointer"
                      title="Xem trực tiếp tài liệu"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeResource(res.id)}
                      className="h-6 w-6 p-0 text-destructive cursor-pointer"
                      title="Xóa tài liệu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Chưa có tệp tài liệu hỗ trợ nào được đính kèm.</p>
          )}
        </div>

        {/* 5. ATTACHED QUIZ & ASSIGNMENT (Only for Video, Text, PDF, Document lessons) */}
        {contentType !== "QUIZ" && contentType !== "ASSIGNMENT" && (
          <div className="pt-6 border-t border-border/40 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600" /> TÙY CHỌN ĐÍNH KÈM QUIZ & BÀI TẬP CHO BÀI HỌC
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Bổ sung Bài kiểm tra trắc nghiệm hoặc Bài tập tự luận đính kèm cho bài giảng Video/Tài liệu này.
                </p>
              </div>

              {/* Toggle buttons bar */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={showAttachQuizForm || lesson?.linkedQuiz ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setShowAttachQuizForm((prev) => !prev);
                    setIsDirty(true);
                  }}
                  className={`h-8 text-xs font-bold gap-1.5 cursor-pointer transition ${
                    showAttachQuizForm || lesson?.linkedQuiz
                      ? "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                      : "text-amber-800 border-amber-300 hover:bg-amber-50"
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  {showAttachQuizForm || lesson?.linkedQuiz ? "✓ Đã đính kèm Quiz" : "+ Đính kèm Quiz bài học"}
                </Button>

                <Button
                  type="button"
                  variant={showAttachAssignmentForm || lesson?.linkedAssignment ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setShowAttachAssignmentForm((prev) => !prev);
                    setIsDirty(true);
                  }}
                  className={`h-8 text-xs font-bold gap-1.5 cursor-pointer transition ${
                    showAttachAssignmentForm || lesson?.linkedAssignment
                      ? "bg-purple-600 hover:bg-purple-700 text-white shadow-2xs"
                      : "text-purple-800 border-purple-300 hover:bg-purple-50"
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  {showAttachAssignmentForm || lesson?.linkedAssignment ? "✓ Đã đính kèm Bài tập" : "+ Đính kèm Bài tập tự luận"}
                </Button>
              </div>
            </div>

            {/* Full-Width Quiz Attachment Section (100% width!) */}
            {(showAttachQuizForm || lesson?.linkedQuiz) && (
              <div className="w-full p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-200 text-amber-950 font-bold px-2.5 py-0.5">Bài kiểm tra Quiz đính kèm</Badge>
                    {lesson?.linkedQuiz && (
                      <span className="text-xs text-amber-800 font-medium">ID: {lesson.linkedQuiz.id}</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAttachQuizForm(false);
                      setIsDirty(true);
                    }}
                    className="h-7 text-xs font-bold text-rose-700 hover:bg-rose-100 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Hủy đính kèm Quiz
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-amber-950">Thời gian làm bài (Phút)</Label>
                      <Input
                        type="number"
                        value={quizTimeLimitMin}
                        onChange={(e) => {
                          setQuizTimeLimitMin(Number(e.target.value));
                          setIsDirty(true);
                        }}
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-amber-950">Điểm sàn đạt yêu cầu (Thang 10)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={quizPassScore}
                        onChange={(e) => {
                          setQuizPassScore(Number(e.target.value));
                          setIsDirty(true);
                        }}
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-amber-950">Số lần làm lại tối đa</Label>
                      <Input
                        type="number"
                        value={quizMaxAttempts}
                        onChange={(e) => {
                          setQuizMaxAttempts(Number(e.target.value));
                          setIsDirty(true);
                        }}
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                  </div>

                  {/* Full-width Question Builder Manager */}
                  <div className="p-4 bg-white border border-amber-200/90 rounded-2xl shadow-2xs space-y-2">
                    <Label className="text-xs font-bold text-gray-800 uppercase tracking-wider block mb-2">
                      Soạn thảo danh sách câu hỏi cho bài Quiz này:
                    </Label>
                    <QuestionBuilderManager
                      questions={questions}
                      onChange={(updatedQ) => {
                        setQuestions(updatedQ);
                        setIsDirty(true);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Full-Width Assignment Attachment Section (100% width!) */}
            {(showAttachAssignmentForm || lesson?.linkedAssignment) && (
              <div className="w-full p-5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-purple-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-200 text-purple-950 font-bold px-2.5 py-0.5">Bài tập tự luận đính kèm</Badge>
                    {lesson?.linkedAssignment && (
                      <span className="text-xs text-purple-800 font-medium">ID: {lesson.linkedAssignment.id}</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAttachAssignmentForm(false);
                      setIsDirty(true);
                    }}
                    className="h-7 text-xs font-bold text-rose-700 hover:bg-rose-100 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Hủy đính kèm Bài tập
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-purple-950">Thang điểm tối đa</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={assignmentMaxScore}
                        onChange={(e) => {
                          setAssignmentMaxScore(Number(e.target.value));
                          setIsDirty(true);
                        }}
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-purple-950">Hạn nộp (Due Date)</Label>
                      <Input
                        type="datetime-local"
                        value={assignmentDueDate}
                        onChange={(e) => {
                          setAssignmentDueDate(e.target.value);
                          setIsDirty(true);
                        }}
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </Card>
  );
};
