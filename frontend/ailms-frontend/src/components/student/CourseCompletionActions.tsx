import { useState } from "react";
import axios from "axios";
import { Award, Download, Loader2, MessageSquareText, Star } from "lucide-react";
import { studentApi, type StudentCourseCard, type StudentCourseReview } from "@/api/student/studentApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

interface CourseCompletionActionsProps {
  course: StudentCourseCard;
  onCourseUpdated: (courseId: string, changes: Partial<StudentCourseCard>) => void;
}

/** Hiển thị đánh giá khóa học/giảng viên và thao tác nhận, tải chứng chỉ thật. */
export function CourseCompletionActions({ course, onCourseUpdated }: CourseCompletionActionsProps) {
  const { success, error } = useToast();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [courseRating, setCourseRating] = useState(course.courseRating ?? 0);
  const [courseComment, setCourseComment] = useState(course.courseComment ?? "");
  const [teacherRating, setTeacherRating] = useState(course.teacherRating ?? 0);
  const [teacherComment, setTeacherComment] = useState(course.teacherComment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  /** Lấy thông báo lỗi backend để học viên biết rõ điều kiện chưa đạt. */
  const getErrorMessage = (caught: unknown, fallback: string) => {
    if (!axios.isAxiosError<{ message?: unknown }>(caught)) return fallback;
    const message = caught.response?.data.message;
    return typeof message === "string" && message.length > 0 ? message : fallback;
  };

  /** Chuẩn hóa textarea rỗng thành undefined trước khi gửi backend. */
  const optionalText = (value: string) => value.trim().length > 0 ? value.trim() : undefined;

  /** Gửi một bản ghi gồm đánh giá khóa học và nhận xét giáo viên chính. */
  const submitReview = async () => {
    if (courseRating < 1) {
      error("Vui lòng chọn số sao cho khóa học.");
      return;
    }
    if (course.teacherId && teacherRating < 1) {
      error("Vui lòng chọn số sao cho giảng viên.");
      return;
    }
    try {
      setSubmitting(true);
      const review = await studentApi.createCourseReview(course.id, {
        rating: courseRating,
        comment: optionalText(courseComment),
        teacherRating: course.teacherId ? teacherRating : undefined,
        teacherComment: course.teacherId ? optionalText(teacherComment) : undefined,
      });
      applyReview(review);
      setReviewOpen(false);
      success("Đã gửi đánh giá khóa học và giảng viên.");
    } catch (caught) {
      error(getErrorMessage(caught, "Không thể gửi đánh giá."));
    } finally {
      setSubmitting(false);
    }
  };

  /** Đồng bộ kết quả review backend vào thẻ khóa học mà không tải lại trang. */
  const applyReview = (review: StudentCourseReview) => {
    onCourseUpdated(course.id, {
      reviewId: review.id,
      courseRating: review.rating,
      courseComment: review.comment,
      teacherRating: review.teacherRating,
      teacherComment: review.teacherComment,
    });
  };

  /** Cấp bù chứng chỉ cho khóa đã hoàn thành trước khi cơ chế tự động được bổ sung. */
  const issueCertificate = async () => {
    try {
      setIssuing(true);
      const certificate = await studentApi.issueCertificate(course.enrollmentId);
      onCourseUpdated(course.id, {
        certificateId: certificate.id,
        certificateCode: certificate.certificateCode,
        certificateStatus: certificate.status,
      });
      success("Chứng chỉ của bạn đã được cấp.");
    } catch (caught) {
      error(getErrorMessage(caught, "Bạn chưa đủ điều kiện nhận chứng chỉ."));
    } finally {
      setIssuing(false);
    }
  };

  /** Tải PDF chứng chỉ qua blob để giữ header xác thực của API client. */
  const downloadCertificate = async () => {
    if (!course.certificateId) return;
    try {
      setDownloading(true);
      const blob = await studentApi.downloadCertificate(course.certificateId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `AILMS-certificate-${course.certificateCode ?? course.certificateId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      error(getErrorMessage(caught, "Không thể tải chứng chỉ PDF."));
    } finally {
      setDownloading(false);
    }
  };

  /** Render bộ chọn 1–5 sao bằng Button dùng chung của hệ thống. */
  const renderStars = (value: number, onChange: (rating: number) => void, disabled = false) => (
    <div className="flex gap-1" role="radiogroup" aria-label="Chọn số sao">
      {[1, 2, 3, 4, 5].map((rating) => (
        <Button
          key={rating}
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={disabled}
          aria-label={`${String(rating)} sao`}
          aria-pressed={value === rating}
          onClick={() => { onChange(rating); }}
        >
          <Star className={cn("h-5 w-5", rating <= value && "fill-amber-400 text-amber-500")} />
        </Button>
      ))}
    </div>
  );

  /** Tạo chữ viết tắt để fallback avatar giáo viên. */
  const generatedInitials = course.teacherName?.split(" ").filter(Boolean).slice(-2)
    .map((part) => part[0]).join("").toUpperCase();
  const teacherInitials = generatedInitials && generatedInitials.length > 0 ? generatedInitials : "GV";

  return (
    <>
      <div className="grid grid-cols-2 gap-2 border-t pt-3">
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={Boolean(course.reviewId)}
          onClick={() => { setReviewOpen(true); }}
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          {course.reviewId ? "Đã đánh giá" : "Đánh giá"}
        </Button>
        {course.certificateId && course.certificateStatus === "ISSUED" ? (
          <Button size="sm" className="gap-1" disabled={downloading} onClick={() => { void downloadCertificate(); }}>
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Tải chứng chỉ
          </Button>
        ) : (
          <Button size="sm" className="gap-1" disabled={issuing} onClick={() => { void issueCertificate(); }}>
            {issuing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Award className="h-3.5 w-3.5" />}
            Nhận chứng chỉ
          </Button>
        )}
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Đánh giá sau khóa học</DialogTitle>
            <DialogDescription>{course.title}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <div className="space-y-2">
              <Label>Trải nghiệm khóa học <span className="text-destructive">*</span></Label>
              {renderStars(courseRating, setCourseRating)}
              <Textarea
                value={courseComment}
                maxLength={2000}
                placeholder="Nội dung, bài tập và trải nghiệm học tập của bạn..."
                onChange={(event) => { setCourseComment(event.target.value); }}
              />
            </div>

            {course.teacherId && (
              <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    <AvatarImage src={course.teacherAvatarUrl} alt={course.teacherName ?? "Giảng viên"} />
                    <AvatarFallback>{teacherInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-muted-foreground">Nhận xét giảng viên chính</p>
                    <p className="font-semibold">{course.teacherName}</p>
                  </div>
                </div>
                {renderStars(teacherRating, setTeacherRating)}
                <Textarea
                  value={teacherComment}
                  maxLength={2000}
                  placeholder="Cách hướng dẫn, hỗ trợ và tương tác của giảng viên..."
                  onChange={(event) => { setTeacherComment(event.target.value); }}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewOpen(false); }}>Hủy</Button>
            <Button disabled={submitting} onClick={() => { void submitReview(); }}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Gửi đánh giá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
