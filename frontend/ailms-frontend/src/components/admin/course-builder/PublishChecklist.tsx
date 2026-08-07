import React from "react";
import type { CourseCurriculumResponse } from "../../../api/courses/courseAuthoringApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Send, Undo2, Edit3, Lock, ShieldCheck } from "lucide-react";

interface PublishChecklistProps {
  curriculum: CourseCurriculumResponse | null;
  onSubmitForReview: () => void;
  onCancelReview?: () => void;
  onRequestEdit?: () => void;
  submitting: boolean;
  isOwner?: boolean;
}

export const PublishChecklist: React.FC<PublishChecklistProps> = ({
  curriculum,
  onSubmitForReview,
  onCancelReview,
  onRequestEdit,
  submitting,
  isOwner = true,
}) => {
  const status = curriculum?.status || "DRAFT";
  const sections = curriculum?.sections || [];
  const hasSections = sections.length > 0;
  const totalLessons = curriculum?.totalLessons || 0;
  const hasLessons = totalLessons > 0;
  const emptySections = sections.filter((s) => !s.lessons || s.lessons.length === 0);

  const isReady = hasSections && hasLessons && emptySections.length === 0;

  return (
    <Card className="flex-1 p-8 max-w-3xl mx-auto bg-card border-border/40 rounded-xl shadow-xs my-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Kiểm tra & Xuất bản khóa học</h2>
        <p className="text-xs text-muted-foreground">
          Đảm bảo các yêu cầu chất lượng tối thiểu trước khi gửi phê duyệt hoặc thay đổi trạng thái khóa học.
        </p>
      </div>

      {/* Checklist items */}
      <div className="space-y-4">
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

      {/* Action Footer based on Course Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border/40 pt-6">
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase">Trạng thái hiện tại:</span>
          {status === "PENDING" ? (
            <Badge className="ml-2 bg-amber-100 text-amber-900 border-amber-300 font-bold uppercase">
              <Lock className="w-3 h-3 mr-1 text-amber-600" /> Đang chờ duyệt (PENDING)
            </Badge>
          ) : status === "ACTIVE" ? (
            <Badge className="ml-2 bg-emerald-100 text-emerald-900 border-emerald-300 font-bold uppercase">
              <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" /> Đã phát hành (ACTIVE)
            </Badge>
          ) : (
            <Badge className="ml-2 bg-slate-100 text-slate-800 font-bold uppercase">
              {status}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {status === "PENDING" && (
            <Button
              type="button"
              onClick={onCancelReview}
              disabled={submitting || !isOwner}
              className="h-10 px-5 text-xs font-bold gap-2 bg-amber-600 text-white hover:bg-amber-700 cursor-pointer shadow-xs"
              title={isOwner ? "Rút yêu cầu gửi duyệt để chỉnh sửa khóa học" : "Chỉ người tạo khóa học mới được hủy gửi duyệt"}
            >
              <Undo2 className="w-4 h-4" /> {submitting ? "Đang xử lý..." : "Hủy gửi phê duyệt khóa học"}
            </Button>
          )}

          {status === "ACTIVE" && (
            <Button
              type="button"
              onClick={onRequestEdit}
              disabled={submitting || !isOwner}
              className="h-10 px-5 text-xs font-bold gap-2 bg-purple-600 text-white hover:bg-purple-700 cursor-pointer shadow-xs"
              title={isOwner ? "Chuyển khóa học sang chế độ chỉnh sửa (tạm ẩn gói bán)" : "Chỉ người tạo khóa học mới được chuyển chế độ chỉnh sửa"}
            >
              <Edit3 className="w-4 h-4" /> {submitting ? "Đang xử lý..." : "Chuyển sang Chế độ chỉnh sửa"}
            </Button>
          )}

          {(status === "DRAFT" || status === "REJECTED") && (
            <Button
              type="button"
              onClick={onSubmitForReview}
              disabled={!isReady || submitting || !isOwner}
              className="h-10 px-6 text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
              title={!isOwner ? "Chỉ người tạo khóa học mới được gửi duyệt" : !isReady ? "Chưa đủ điều kiện gửi duyệt" : "Gửi khóa học lên Admin phê duyệt"}
            >
              <Send className="w-4 h-4" /> {submitting ? "Đang gửi..." : "Gửi phê duyệt khóa học"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
