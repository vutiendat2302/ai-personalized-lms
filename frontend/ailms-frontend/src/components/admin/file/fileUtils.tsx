import React from "react";
import { Badge } from "@/components/ui/badge";
import type { BaseStatusEnum, FileUsageTypeEnum, FileTypeEnum } from "@/types/fileManagement";
import { format } from "date-fns";

export const formatBytes = (bytes?: number | string): string => {
  const num = Number(bytes);
  if (isNaN(num) || num <= 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return format(d, "dd/MM/yyyy HH:mm");
  } catch (e) {
    return dateStr;
  }
};

export const getUsageTypeBadge = (usageType?: FileUsageTypeEnum) => {
  switch (usageType) {
    case "CONTRACT":
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 font-semibold text-[10px]">Hợp đồng</Badge>;
    case "AVATAR":
      return <Badge variant="outline" className="bg-pink-500/10 text-pink-600 border-pink-500/30 font-semibold text-[10px]">Avatar</Badge>;
    case "QUIZ_ATTACHMENT":
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 font-semibold text-[10px]">Quiz</Badge>;
    case "ASSIGNMENT":
    case "ASSIGNMENT_SUBMISSION":
      return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 font-semibold text-[10px]">Assignment</Badge>;
    case "LESSON_RESOURCE":
      return <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/30 font-semibold text-[10px]">Bài học</Badge>;
    default:
      return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30 font-semibold text-[10px]">Khác</Badge>;
  }
};

export const getStatusBadge = (status?: BaseStatusEnum) => {
  switch (status) {
    case "ACTIVE":
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold text-[10px]">Hoạt động</Badge>;
    case "ARCHIVED":
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 font-semibold text-[10px]">Archived</Badge>;
    case "DELETED":
      return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 font-semibold text-[10px]">Đã xoá</Badge>;
    default:
      return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30 font-semibold text-[10px]">N/A</Badge>;
  }
};
