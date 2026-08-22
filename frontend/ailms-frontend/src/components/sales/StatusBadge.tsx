import React from "react";
import { cn } from "@/lib/utils";

export type SalesStatusType =
  | "PENDING"
  | "PAID"
  | "SUCCESS"
  | "ACTIVE"
  | "CANCELLED"
  | "DROPPED"
  | "EXPIRED"
  | "REFUNDED"
  | "FAILED"
  | "INACTIVE"
  | "OUT_OF_STOCK"
  | "WAITLISTED"
  | string;

interface StatusBadgeProps {
  status: SalesStatusType;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = "md",
  className,
}) => {
  const normalizedStatus = (status || "").toUpperCase();

  let colorStyle = "bg-gray-100 text-gray-700 border-gray-200";
  let dotStyle = "bg-gray-400";
  let displayLabel = label;

  switch (normalizedStatus) {
    case "PENDING":
      colorStyle = "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50";
      dotStyle = "bg-amber-500 animate-pulse";
      displayLabel = label || "Chờ thanh toán";
      break;
    case "PAID":
    case "SUCCESS":
    case "ACTIVE":
      colorStyle = "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50";
      dotStyle = "bg-emerald-500";
      displayLabel = label || (normalizedStatus === "PAID" ? "Đã thanh toán" : normalizedStatus === "SUCCESS" ? "Thành công" : "Hoạt động");
      break;
    case "CANCELLED":
    case "DROPPED":
      colorStyle = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700";
      dotStyle = "bg-slate-400";
      displayLabel = label || (normalizedStatus === "CANCELLED" ? "Đã hủy" : "Đã thôi học");
      break;
    case "EXPIRED":
      colorStyle = "bg-rose-50 text-rose-600 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50";
      dotStyle = "bg-rose-500";
      displayLabel = label || "Hết hạn";
      break;
    case "REFUNDED":
    case "FAILED":
      colorStyle = "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800";
      dotStyle = "bg-red-600";
      displayLabel = label || (normalizedStatus === "REFUNDED" ? "Đã hoàn tiền" : "Thất bại");
      break;
    case "INACTIVE":
    case "OUT_OF_STOCK":
      colorStyle = "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400";
      dotStyle = "bg-zinc-400";
      displayLabel = label || (normalizedStatus === "INACTIVE" ? "Tạm ngưng" : "Hết hàng");
      break;
    case "WAITLISTED":
      colorStyle = "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50";
      dotStyle = "bg-blue-500";
      displayLabel = label || "Hàng chờ";
      break;
    default:
      displayLabel = label || status;
      break;
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1 font-medium",
    md: "px-2.5 py-1 text-xs gap-1.5 font-semibold",
    lg: "px-3 py-1.5 text-sm gap-2 font-semibold",
  };

  const dotSizeClasses = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border shadow-xs transition-colors select-none",
        sizeClasses[size],
        colorStyle,
        className
      )}
    >
      <span className={cn("rounded-full shrink-0", dotSizeClasses[size], dotStyle)} />
      <span className="truncate">{displayLabel}</span>
    </span>
  );
};
