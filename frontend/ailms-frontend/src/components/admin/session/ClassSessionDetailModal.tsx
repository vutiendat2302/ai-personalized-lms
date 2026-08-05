import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateDisplay } from "@/components/ui/DatePickerInput";
import {
  Video,
  ExternalLink,
  Copy,
  Check,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import type { ClassOnlineResponse } from "@/types/admin";

interface ClassSessionDetailModalProps {
  open: boolean;
  onClose: () => void;
  session: ClassOnlineResponse | null;
  onEditSession?: (session: ClassOnlineResponse) => void;
  onDeleteSession?: (sessionId: string) => void;
  onUpdateStatus?: (sessionId: string, newStatus: string) => void;
}

export const ClassSessionDetailModal: React.FC<ClassSessionDetailModalProps> = ({
  open,
  onClose,
  session,
  onEditSession,
  onDeleteSession,
  onUpdateStatus,
}) => {
  const [copiedTopic, setCopiedTopic] = useState(false);
  const [copiedReview, setCopiedReview] = useState(false);

  if (!session) return null;

  const handleCopyTopic = () => {
    const topicStr = `Topic: Buổi dạy ${session.className || session.classCode || "Lớp học"} của giảng viên/mentor ${session.teacherName || "Giảng viên"} vào lúc ${session.scheduledAt ? formatDateDisplay(session.scheduledAt) : ""}`;
    navigator.clipboard.writeText(topicStr);
    setCopiedTopic(true);
    setTimeout(() => setCopiedTopic(false), 2000);
  };

  const handleCopyReview = () => {
    const reviewStr = `Đánh giá: ${session.studentFeedback || "Học viên nhiệt tình học"}\nNhận xét: ${session.teacherNotes || "Học viên tập trung, đã hoàn thành bài tập."}`;
    navigator.clipboard.writeText(reviewStr);
    setCopiedReview(true);
    setTimeout(() => setCopiedReview(false), 2000);
  };

  const formatMoney = (val?: number) => {
    if (val === undefined || val === null) return "Chưa có đơn giá";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const lifecycleStatus = session.lifecycleStatus || session.status;

  const renderStatusBadge = (statusStr: string) => {
    const st = (statusStr || "").toUpperCase();
    if (st === "ACTIVE" || st === "UPCOMING") {
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Sắp diễn ra</span>
        </Badge>
      );
    }
    if (st === "IN_PROGRESS") {
      return (
        <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1 animate-pulse">
          <Video className="h-3.5 w-3.5" />
          <span>Đang diễn ra</span>
        </Badge>
      );
    }
    if (st === "COMPLETED") {
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 font-bold text-xs gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
          <span>Đã diễn ra</span>
        </Badge>
      );
    }
    if (st === "INACTIVE" || st === "CANCELLED" || st === "DELETE" || st === "DELETED") {
      return (
        <Badge variant="destructive" className="font-bold text-xs gap-1">
          <XCircle className="h-3.5 w-3.5" />
          <span>Đã hủy</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="font-bold text-xs">
        {statusStr}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[94vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border border-border/40 shadow-2xl backdrop-blur-xs">
        
        {/* FIXED HEADER */}
        <DialogHeader className="p-6 bg-linear-to-br from-primary/10 via-card to-card border-b border-border/40 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/20 text-primary font-black text-xl flex items-center justify-center border-2 border-primary/30 shrink-0">
                <Video className="h-7 w-7" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                    Buổi học: {session.title || "Buổi học online"}
                  </DialogTitle>
                  {renderStatusBadge(lifecycleStatus)}
                </div>

                <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-4 flex-wrap">
                  <span>Mã buổi học: <strong className="text-foreground font-mono">BH{session.sessionCode || session.id}</strong></span>
                  <span>Lớp: <strong className="text-primary">{session.className || session.classCode || `#${session.classId}`}</strong></span>
                  <span>Gia sư/Mentor: <strong className="text-foreground">{session.teacherName || `#${session.teacherId}`}</strong></span>
                </DialogDescription>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {onEditSession && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditSession(session)}
                  className="font-bold text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Edit2 className="h-4 w-4" /> Chỉnh sửa
                </Button>
              )}

              {onDeleteSession && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDeleteSession(String(session.id))}
                  className="font-bold text-xs gap-1.5"
                >
                  <Trash2 className="h-4 w-4" /> Xóa buổi học
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* SECTION 1: THÔNG TIN BUỔI HỌC */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-primary border-b border-primary/20 pb-1.5 flex items-center gap-2">
              <FileText className="h-4 w-4" /> THÔNG TIN BUỔI HỌC
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="font-bold text-muted-foreground">Mã buổi học:</span>
                <span className="font-mono font-extrabold text-foreground">BH{session.sessionCode || session.id}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="font-bold text-muted-foreground">Gia sư / Mentor:</span>
                <span className="font-bold text-foreground">{session.teacherName || `#${session.teacherId}`}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="font-bold text-muted-foreground">Lớp học:</span>
                <span className="font-bold text-primary">{session.className || session.classCode || `#${session.classId}`}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="font-bold text-muted-foreground">Môn học:</span>
                <span className="font-bold text-foreground">{session.classCode || "Học tập trực tuyến"}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="font-bold text-muted-foreground">Ngày giờ bắt đầu:</span>
                <span className="font-mono font-extrabold text-foreground">{session.scheduledAt ? formatDateDisplay(session.scheduledAt) : "—"}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="font-bold text-muted-foreground">Thời lượng dự kiến:</span>
                <span className="font-bold text-foreground">{session.durationMin || 60} phút</span>
              </div>

              <div className="flex justify-between py-1 border-b border-border/30 md:col-span-2">
                <span className="font-bold text-muted-foreground">Link Google Meet:</span>
                <span className="font-mono text-primary font-bold truncate max-w-md">
                  {session.meetingUrl || "https://meet.google.com/new"}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="font-bold text-muted-foreground">Nền tảng:</span>
                <span className="font-mono font-bold text-foreground">{session.meetingProvider || "GOOGLE_MEET"}</span>
              </div>
            </div>

            {/* Thông tin Google Meet & Copy Topic/Link */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 space-y-2 text-xs">
              <div className="font-bold text-foreground flex items-center justify-between">
                <span>Topic: Buổi dạy {session.className || "Lớp học"} của gia sư/mentor {session.teacherName || "Giảng viên"}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleCopyTopic} className="h-7 text-[11px] font-bold gap-1">
                    {copiedTopic ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedTopic ? "Đã sao chép Topic" : "Sao chép Topic"}</span>
                  </Button>

                  {session.meetingUrl && (
                    <a
                      href={session.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-7 px-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] inline-flex items-center gap-1 hover:opacity-90"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Vào Google Meet</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* LƯU Ý QUAN TRỌNG (Khung đỏ giống hệ thống thật trong ảnh) */}
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs space-y-1.5 text-red-700 dark:text-red-300">
              <div className="font-black flex items-center gap-1.5 uppercase">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>Lưu ý quan trọng đối với buổi học:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 font-medium pl-1 text-[11px] leading-relaxed">
                <li>Google Meet là nền tảng mặc định của hệ thống; nếu không nhập link, backend sẽ dùng link tạo phòng Meet mới.</li>
                <li>Gia sư/Mentor cần cập nhật thông tin sau buổi học để hệ thống có căn cứ tính thù lao.</li>
                <li>Thù lao hiển thị theo đơn giá dạy đang hiệu lực nhân với số giờ dạy của buổi học.</li>
                <li>Gia sư không sử dụng link học khác ngoài link Google Meet đã lưu cho buổi học này.</li>
              </ol>
            </div>
          </div>

          {/* SECTION 2: THÔNG TIN SAU BUỔI HỌC */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-primary border-b border-primary/20 pb-1.5 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> THÔNG TIN SAU BUỔI HỌC & THÙ LAO
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="font-bold text-muted-foreground">Nội dung buổi học:</span>
                <span className="font-bold text-foreground">{session.sessionSummary || "Chữa bài tập chuyên đề & Thực hành"}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="font-bold text-muted-foreground">Thù lao tính toán:</span>
                <span className="font-mono font-black text-emerald-600 text-sm">{formatMoney(session.remuneration)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="font-bold text-muted-foreground">Đánh giá về buổi học:</span>
                <span className="font-bold text-foreground">{session.studentFeedback || "Học viên nhiệt tình học tập, tương tác tốt"}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="font-bold text-muted-foreground">Nhận xét về phiên học:</span>
                <span className="font-bold text-foreground">{session.teacherNotes || "Học viên tập trung, đã chuẩn bị bài trước ở nhà."}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-border/30 md:col-span-2">
                <span className="font-bold text-muted-foreground">Link bản ghi:</span>
                {session.recordUrl ? (
                  <a
                    href={session.recordUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    <span>{session.recordUrl}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground italic">Chưa có record</span>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={handleCopyReview} className="gap-1.5 font-bold text-xs bg-primary text-primary-foreground">
                {copiedReview ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedReview ? "Đã sao chép nhận xét" : "Copy nhận xét"}</span>
              </Button>
            </div>
          </div>

          {/* Status Quick Update */}
          {onUpdateStatus && (
            <div className="p-4 rounded-xl border border-border/40 bg-card space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">Cập nhật nhanh trạng thái buổi học</Label>
              <div className="flex items-center gap-3">
                <Select
                  value={session.status}
                  onValueChange={(val) => onUpdateStatus(String(session.id), val)}
                >
                  <SelectTrigger className="w-64 text-xs font-bold bg-background">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE (Sắp diễn ra)</SelectItem>
                    <SelectItem value="IN_PROGRESS">IN_PROGRESS (Đang diễn ra)</SelectItem>
                    <SelectItem value="COMPLETED">COMPLETED (Đã diễn ra)</SelectItem>
                    <SelectItem value="CANCELLED">CANCELLED (Đã hủy)</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground italic">
                  (Trạng thái sẽ được lưu tức thì vào cơ sở dữ liệu)
                </span>
              </div>
            </div>
          )}

          {/* Audit Timestamp */}
          <div className="pt-4 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
            <div>Ngày tạo: <strong className="text-foreground font-mono">{formatDateDisplay(session.createdAt)}</strong></div>
            <div>Cập nhật gần nhất: <strong className="text-foreground font-mono">{session.updatedAt ? formatDateDisplay(session.updatedAt) : "—"}</strong></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
