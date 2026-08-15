import React from "react";
import { HelpCircle, Info } from "lucide-react";

interface DeliveryModeBadgeProps {
  mode: string;
  className?: string;
  showIcon?: boolean;
}

/** Trả về thông tin tiêu đề, màu sắc & giải thích ngắn gọn theo hình thức học */
export const getDeliveryModeInfo = (mode: string) => {
  const m = (mode || "").toUpperCase();

  if (m.includes("ONE") || m.includes("1-1") || m === "ONE_ON_ONE") {
    return {
      label: "Học kèm 1-1",
      code: "ONE_ON_ONE",
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
      title: "Hình thức: Học kèm 1-1 (Gia sư Chuyên sâu)",
      description:
        "Được giảng viên / gia sư kèm cặp trực tiếp 1-1 theo lịch học linh hoạt, theo sát lộ trình cá nhân hóa và giải đáp mọi thắc mắc 24/7.",
    };
  }

  if (m.includes("GROUP") || m === "GROUP_CLASS") {
    return {
      label: "Học nhóm",
      code: "GROUP_CLASS",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
      title: "Hình thức: Lớp học nhóm tương tác",
      description:
        "Học tập theo lớp nhóm giới hạn số lượng học viên, có thời khóa biểu cố định, thảo luận nhóm năng động cùng giảng viên.",
    };
  }

  // Mặc định: SELF_STUDY hoặc SELF_PACED
  return {
    label: "Tự học",
    code: "SELF_STUDY",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    title: "Hình thức: Tự học trực tuyến",
    description:
      "Tự do học qua hệ thống bài giảng video chất lượng cao, tài liệu đầy đủ & bài tập thực hành trực tuyến theo thời gian của bạn.",
  };
};

/** Component Badge hiển thị hình thức học kèm Tooltip Hover giải thích chi tiết */
export const DeliveryModeBadge: React.FC<DeliveryModeBadgeProps> = ({
  mode,
  className = "",
  showIcon = true,
}) => {
  const info = getDeliveryModeInfo(mode);

  return (
    <div className={`group relative inline-flex items-center gap-1 cursor-help ${className}`}>
      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border transition-all ${info.color}`}>
        {info.label}
      </span>
      {showIcon && (
        <HelpCircle className="h-3 w-3 text-muted-foreground/70 group-hover:text-primary transition-colors shrink-0" />
      )}

      {/* Popover / Tooltip giải thích hình thức học khi hover */}
      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-72 p-3.5 bg-popover text-popover-foreground text-xs rounded-xl shadow-xl border border-border/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
        <div className="font-bold text-foreground mb-1 flex items-center gap-1.5 text-xs border-b border-border/40 pb-1.5">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{info.title}</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{info.description}</p>
      </div>
    </div>
  );
};
