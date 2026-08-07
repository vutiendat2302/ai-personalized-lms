import React from "react";
import { Badge } from "@/components/ui/badge";
import type { AttendanceStatusEnum, AttendanceSourceEnum } from "@/types/attendanceManagement";
import { AlertTriangle, FlaskConical, Cpu, Edit3 } from "lucide-react";

export const getStatusBadge = (status: AttendanceStatusEnum) => {
  switch (status) {
    case "PRESENT":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-[10px]">
          ĐÚNG GIỜ (PRESENT)
        </Badge>
      );
    case "LATE":
    case "PRESENT_LATE":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold text-[10px]">
          ĐI MUỘN ({status === "LATE" ? "LATE" : "PRESENT_LATE"})
        </Badge>
      );
    case "HALF_DAY":
    case "HALF_DAY_LATE":
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold text-[10px]">
          NỬA NGÀY ({status})
        </Badge>
      );
    case "ON_LEAVE":
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 font-bold text-[10px]">
          NGHỈ PHÉP (ON LEAVE)
        </Badge>
      );
    case "ABSENT":
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 font-bold text-[10px]">
          VẮNG MẶT (ABSENT)
        </Badge>
      );
    case "CANCELLED":
    case "INVALID":
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20 font-bold text-[10px] gap-1">
          <AlertTriangle className="h-3 w-3 text-amber-500" />
          CẦN RÀ SOÁT ({status})
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground font-medium text-[10px]">
          {status}
        </Badge>
      );
  }
};

export const getSourceBadge = (source: AttendanceSourceEnum) => {
  switch (source) {
    case "DEVICE":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
          <Cpu className="h-3 w-3 text-gray-500" /> Máy chấm công
        </span>
      );
    case "MANUAL":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
          <Edit3 className="h-3 w-3 text-blue-500" /> Sửa thủ công
        </span>
      );
    case "SIMULATED":
      return (
        <span
          title="Dữ liệu giả lập, dùng cho demo"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 cursor-help"
        >
          <FlaskConical className="h-3 w-3 text-purple-500" /> Giả lập
        </span>
      );
    default:
      return null;
  }
};

export const formatMinutesToHours = (minutes?: number) => {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m} phút`;
};

export const formatTimeOnly = (dateTimeStr?: string) => {
  if (!dateTimeStr) return "--:--";
  try {
    const parts = dateTimeStr.split("T");
    if (parts.length > 1) {
      return parts[1].substring(0, 5);
    }
  } catch (e) {
    // fallback
  }
  return dateTimeStr;
};

export const formatDateVietnamese = (dateStr?: string) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
};
