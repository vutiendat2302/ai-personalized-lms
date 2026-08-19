import React from "react";
import { Badge } from "@/components/ui/badge";
import type { BaseStatusEnum, FileUsageTypeEnum } from "@/types/fileManagement";
import { format } from "date-fns";

/** Định dạng dung lượng tệp tin sang B, KB, MB, GB, TB */
export const formatBytes = (bytes?: number | string): string => {
  const num = Number(bytes);
  if (isNaN(num) || num <= 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/** Định dạng ngày giờ hiển thị theo chuẩn dd/MM/yyyy HH:mm */
export const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return format(d, "dd/MM/yyyy HH:mm");
  } catch (e) {
    return dateStr;
  }
};

/** Trả về Badge mục đích sử dụng tệp tin theo token màu index.css */
export const getUsageTypeBadge = (usageType?: FileUsageTypeEnum) => {
  switch (usageType) {
    case "CONTRACT":
      return <Badge variant="outline" className="bg-brand-cobalt/10 text-brand-cobalt border-brand-cobalt/30 font-semibold text-[10px]">Hợp đồng</Badge>;
    case "AVATAR":
      return <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/30 font-semibold text-[10px]">Ảnh đại diện</Badge>;
    case "QUIZ_ATTACHMENT":
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold text-[10px]">Bài trắc nghiệm</Badge>;
    case "ASSIGNMENT":
    case "ASSIGNMENT_SUBMISSION":
      return <Badge variant="outline" className="bg-success-forest/10 text-success-forest border-success-forest/30 font-semibold text-[10px]">Bài tập</Badge>;
    case "LESSON_RESOURCE":
      return <Badge variant="outline" className="bg-brand-cobalt/10 text-brand-cobalt border-brand-cobalt/30 font-semibold text-[10px]">Tài liệu bài học</Badge>;
    case "LESSON_VIDEO":
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold text-[10px]">Video bài học</Badge>;
    case "COURSE_LESSON":
      return <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/30 font-semibold text-[10px]">Bài học khóa học</Badge>;
    case "POLICY":
      return <Badge variant="outline" className="bg-success-forest/10 text-success-forest border-success-forest/30 font-semibold text-[10px]">Chính sách</Badge>;
    default:
      return <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-semibold text-[10px]">Khác</Badge>;
  }
};

/** Trả về Badge trạng thái tệp tin theo token màu index.css */
export const getStatusBadge = (status?: BaseStatusEnum) => {
  switch (status) {
    case "ACTIVE":
      return <Badge variant="outline" className="bg-success-forest/10 text-success-forest border-success-forest/30 font-semibold text-[10px]">Hoạt động</Badge>;
    case "ARCHIVED":
      return <Badge variant="outline" className="bg-brand-cobalt/10 text-brand-cobalt border-brand-cobalt/30 font-semibold text-[10px]">Đã lưu trữ</Badge>;
    case "DELETED":
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 font-semibold text-[10px]">Đã xóa</Badge>;
    default:
      return <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-semibold text-[10px]">N/A</Badge>;
  }
};
