import { useState } from "react";
import { courseApi } from "@/api/courses/courseApi";
import { fileAdminApi } from "@/api/file/fileAdminApi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { ImageIcon, Loader2, Settings2, UploadCloud } from "lucide-react";

interface CourseSettingsDialogProps {
  courseId: string;
  onUpdated: () => void;
}

interface CourseSettingsForm {
  name: string;
  description: string;
  thumbnailUrl: string;
  learningObjectives: string;
  prerequisites: string;
  level: string;
  suggestedPrice: number;
}

const EMPTY_FORM: CourseSettingsForm = {
  name: "",
  description: "",
  thumbnailUrl: "",
  learningObjectives: "",
  prerequisites: "",
  level: "BEGINNER",
  suggestedPrice: 0,
};

/** Chỉnh sửa metadata và thumbnail thật của khóa học qua Backend. */
export function CourseSettingsDialog({ courseId, onUpdated }: CourseSettingsDialogProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<CourseSettingsForm>(EMPTY_FORM);

  /** Tải dữ liệu mới nhất trước khi hiển thị form chỉnh sửa. */
  const loadCourse = async () => {
    setLoading(true);
    try {
      const response = await courseApi.getCourseById(courseId);
      const course = response.data.data as unknown as Partial<CourseSettingsForm>;
      setForm({
        name: course.name ?? "",
        description: course.description ?? "",
        thumbnailUrl: course.thumbnailUrl ?? "",
        learningObjectives: course.learningObjectives ?? "",
        prerequisites: course.prerequisites ?? "",
        level: course.level ?? "BEGINNER",
        suggestedPrice: course.suggestedPrice ?? 0,
      });
    } catch {
      toast.error("Không thể tải thông tin khóa học.");
    } finally {
      setLoading(false);
    }
  };

  /** Đồng bộ trạng thái mở và chỉ gọi API khi người dùng chủ động mở dialog. */
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      void loadCourse();
    }
  };

  /** Upload ảnh qua Backend, gắn metadata với Course và lưu URL đọc ổn định. */
  const handleThumbnailUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Thumbnail phải là tệp ảnh.");
      return;
    }
    setUploading(true);
    try {
      const metadata = await fileAdminApi.uploadFile(
        file, "IMAGE", "COURSE_THUMBNAIL", undefined, courseId, "Course",
      );
      setForm((current) => ({
        ...current,
        thumbnailUrl: `/api/v1/files/download?fileKey=${encodeURIComponent(metadata.fileKey)}`,
      }));
      toast.success("Đã tải ảnh khóa học. Nhấn Lưu để hoàn tất.");
    } catch {
      toast.error("Không thể tải ảnh khóa học.");
    } finally {
      setUploading(false);
    }
  };

  /** Lưu metadata khóa học nhưng không thay đổi mã do Backend quản lý. */
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Tên khóa học không được để trống.");
      return;
    }
    setSaving(true);
    try {
      await courseApi.updateCourse(courseId, form);
      toast.success("Đã cập nhật thông tin khóa học.");
      setOpen(false);
      onUpdated();
    } catch {
      toast.error("Không thể cập nhật thông tin khóa học.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
          <Settings2 className="h-4 w-4" /> Thông tin khóa học
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thông tin và ảnh khóa học</DialogTitle>
          <DialogDescription>Dữ liệu được lưu trực tiếp qua Backend và dùng ở catalog học viên.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="overflow-hidden rounded-xl border bg-muted/20">
                {form.thumbnailUrl ? (
                  <img src={form.thumbnailUrl} alt="Thumbnail khóa học" className="aspect-video h-full w-full object-cover" />
                ) : (
                  <div className="flex aspect-video items-center justify-center text-muted-foreground"><ImageIcon className="h-9 w-9" /></div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-thumbnail">Ảnh khóa học</Label>
                <Input id="course-thumbnail" type="file" accept="image/*" disabled={uploading}
                  onChange={(event) => void handleThumbnailUpload(event.target.files?.[0])} />
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <UploadCloud className="h-3.5 w-3.5" /> Ảnh được upload qua Backend và gắn với khóa học hiện tại.
                </p>
              </div>
            </div>
            <div className="space-y-2"><Label htmlFor="course-name">Tên khóa học</Label><Input id="course-name" value={form.name} onChange={(event) => { setForm({ ...form, name: event.target.value }); }} /></div>
            <div className="space-y-2"><Label htmlFor="course-description">Mô tả</Label><Textarea id="course-description" rows={4} value={form.description} onChange={(event) => { setForm({ ...form, description: event.target.value }); }} /></div>
            <div className="space-y-2"><Label htmlFor="course-objectives">Mục tiêu học tập</Label><Textarea id="course-objectives" rows={3} value={form.learningObjectives} onChange={(event) => { setForm({ ...form, learningObjectives: event.target.value }); }} /></div>
            <div className="space-y-2"><Label htmlFor="course-prerequisites">Điều kiện đầu vào</Label><Textarea id="course-prerequisites" rows={3} value={form.prerequisites} onChange={(event) => { setForm({ ...form, prerequisites: event.target.value }); }} /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="course-level">Trình độ</Label><Input id="course-level" value={form.level} onChange={(event) => { setForm({ ...form, level: event.target.value }); }} /></div>
              <div className="space-y-2"><Label htmlFor="course-price">Giá đề xuất</Label><Input id="course-price" type="number" min={0} value={form.suggestedPrice} onChange={(event) => { const price = Number(event.target.value); setForm({ ...form, suggestedPrice: Number.isFinite(price) ? price : 0 }); }} /></div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setOpen(false); }}>Đóng</Button><Button onClick={() => void handleSave()} disabled={saving || uploading}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu thông tin</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
