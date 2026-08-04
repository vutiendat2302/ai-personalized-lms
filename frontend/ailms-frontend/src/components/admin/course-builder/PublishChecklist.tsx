import React from "react";
import type { CourseCurriculumResponse } from "../../../api/courses/courseAuthoringApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Send } from "lucide-react";

interface PublishChecklistProps {
  curriculum: CourseCurriculumResponse | null;
  onSubmitForReview: () => void;
  submitting: boolean;
}

export const PublishChecklist: React.FC<PublishChecklistProps> = ({
  curriculum,
  onSubmitForReview,
  submitting,
}) => {
  const sections = curriculum?.sections || [];
  const hasSections = sections.length > 0;
  const totalLessons = curriculum?.totalLessons || 0;
  const hasLessons = totalLessons > 0;
  const emptySections = sections.filter((s) => !s.lessons || s.lessons.length === 0);

  const isReady = hasSections && hasLessons && emptySections.length === 0;

  return (
    <Card className="flex-1 p-8 max-w-3xl mx-auto bg-card border-border/40 rounded-xl shadow-xs my-6">
      <h2 className="text-xl font-bold text-foreground mb-2">Kiểm tra & Gửi phê duyệt</h2>
      <p className="text-xs text-muted-foreground mb-6">
        Vui lòng đảm bảo các điều kiện tối thiểu bên dưới trước khi gửi khóa học lên ban quản trị phê duyệt.
      </p>

      <div className="space-y-4 mb-8">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
          {hasSections ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
          )}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Cấu trúc chương học (Sections)</h4>
            <p className="text-xs text-muted-foreground">
              {hasSections ? `Đã tạo ${sections.length} chương học` : "Cần có ít nhất 1 chương học"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
          {hasLessons ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
          )}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Danh sách bài học (Lessons)</h4>
            <p className="text-xs text-muted-foreground">
              {hasLessons ? `Tổng cộng ${totalLessons} bài học` : "Khóa học chưa có bài học nào"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
          {emptySections.length === 0 ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
          )}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Chương rỗng</h4>
            <p className="text-xs text-muted-foreground">
              {emptySections.length === 0
                ? "Tất cả các chương đều chứa bài học"
                : `Có ${emptySections.length} chương chưa có bài học nào`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/40 pt-6">
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase">Trạng thái hiện tại:</span>
          <Badge className="ml-2 bg-amber-100 text-amber-800 font-bold uppercase">
            {curriculum?.status || "DRAFT"}
          </Badge>
        </div>

        <Button
          onClick={onSubmitForReview}
          disabled={!isReady || submitting}
          className="h-10 px-6 text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
        >
          <Send className="w-4 h-4" /> {submitting ? "Đang gửi..." : "Gửi phê duyệt khóa học"}
        </Button>
      </div>
    </Card>
  );
};
