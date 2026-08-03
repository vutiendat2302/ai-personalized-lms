import type { SalaryStatusEnum, SalaryTypeEnum } from "@/types/salaryManagement";

export const formatVND = (amount?: number): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount) + " đ";
};

export const getStatusBadge = (status: SalaryStatusEnum) => {
  switch (status) {
    case "DRAFT":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
          Nháp (DRAFT)
        </span>
      );
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
          Chờ duyệt (PENDING)
        </span>
      );
    case "CONFIRMED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
          Đã duyệt (CONFIRMED)
        </span>
      );
    case "TRANSFER_EXPORTED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500"></span>
          Đã xuất chuyển khoản
        </span>
      );
    case "PAID":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          Đã thanh toán (PAID)
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
          Từ chối (REJECTED)
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-600 border border-gray-500/20">
          {status}
        </span>
      );
  }
};

export const getSalaryTypeBadge = (type?: SalaryTypeEnum) => {
  switch (type) {
    case "MONTHLY":
      return <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-medium">Cố định tháng</span>;
    case "DAILY":
      return <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 font-medium">Theo ngày</span>;
    case "HOURLY":
      return <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">Theo giờ</span>;
    default:
      return <span className="text-xs text-muted-foreground">--</span>;
  }
};
