import React from "react";
import { type EmployeeContractResponse } from "@/api/hr/hrApi";
import { Button } from "@/components/ui/button";
import { formatDateDisplay } from "@/components/ui/DatePickerInput";
import {
  X,
  FileText,
  User,
  Building2,
  Briefcase,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  FileDown,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  History,
  FileCheck,
  Loader2,
} from "lucide-react";

interface ContractDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: EmployeeContractResponse | null;
  onOpenPdfPreview?: (contractId: string) => void;
  onDownloadFile?: (contractId: string) => void;
  onSignCompany?: (contractId: string) => void;
  onOpenSigningHistory?: (contractId: string) => void;
  onDeleteAllContracts?: (employeeId: string, employeeName: string) => void;
  documentLoading?: "view" | "download" | null;
}

export const ContractDetailModal: React.FC<ContractDetailModalProps> = ({
  isOpen,
  onClose,
  contract,
  onOpenPdfPreview,
  onDownloadFile,
  onSignCompany,
  onOpenSigningHistory,
  onDeleteAllContracts,
  documentLoading,
}) => {
  if (!isOpen || !contract) return null;

  const pdfUrl =
    contract.downloadUrl ||
    contract.fileUrl ||
    contract.originalFileDownloadUrl ||
    (contract.fileKey ? `/api/v1/files/download?fileKey=${contract.fileKey}` : null);
  const effectiveStartDate = contract.startDate || contract.validFrom;
  const effectiveEndDate = contract.endDate || contract.validTo;

  const getContractTypeName = (type?: string) => {
    switch (type) {
      case "PROBATION":
        return "Hợp đồng thử việc";
      case "OFFICIAL":
        return "Hợp đồng chính thức (Xác định thời hạn)";
      case "INDEFINITE":
        return "Hợp đồng không xác định thời hạn";
      case "SEASONAL":
        return "Hợp đồng thời vụ / Ngắn hạn";
      case "FIXED_TERM":
        return "Hợp đồng có thời hạn cố định";
      default:
        return type || "Hợp đồng lao động";
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Đang hiệu lực
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
            <AlertCircle className="h-3.5 w-3.5" /> Đã hết hạn
          </span>
        );
      case "TERMINATED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
            <AlertTriangle className="h-3.5 w-3.5" /> Đã chấm dứt
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            {status || "Chưa có thông tin"}
          </span>
        );
    }
  };

  const getSigningBadge = (signingStatus?: string) => {
    switch (signingStatus) {
      case "FULLY_SIGNED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Đã ký điện tử 2 bên
          </span>
        );
      case "PENDING_COMPANY_SIGN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3.5 w-3.5 text-amber-600" /> Chờ Công ty ký
          </span>
        );
      case "PENDING_EMPLOYEE_SIGN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="h-3.5 w-3.5 text-blue-600" /> Chờ Nhân viên ký OTP
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200" onMouseDown={onClose}>
      <div className="bg-background w-full max-w-2xl rounded-2xl shadow-2xl border border-border/60 overflow-hidden flex flex-col max-h-[90vh]" onMouseDown={(event) => event.stopPropagation()}>
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-muted/40 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-foreground">
                  Chi Tiết Hợp Đồng: <span className="text-primary font-mono">{contract.id}</span>
                </h3>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {getContractTypeName(contract.contractTypeEnum || (contract.contractType as any))}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* STATUS BANNER */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Trạng thái hợp đồng:</span>
              {getStatusBadge(contract.status)}
            </div>
            {getSigningBadge(contract.signingStatus) && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Ký điện tử:</span>
                {getSigningBadge(contract.signingStatus)}
              </div>
            )}
          </div>

          {/* SECTION 1: THÔNG TIN NHÂN VIÊN */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <User className="h-4 w-4 text-primary" /> Thông Tin Nhân Viên
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-card border border-border/50 shadow-2xs">
              <div>
                <span className="text-xs text-muted-foreground block">Họ và tên nhân viên</span>
                <span className="text-sm font-bold text-foreground block">{contract.fullName || "Chưa ghi nhận"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Mã nhân viên</span>
                <span className="text-sm font-mono font-bold text-primary block">{contract.employeeCode || (contract.employeeId ? `NV-${contract.employeeId}` : "Chưa ghi nhận")}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Phòng ban</span>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {contract.departmentName || "Chưa phân bổ"}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Chức danh / Vị trí</span>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1 mt-0.5">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  {contract.position || "Chưa xếp vị trí"}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: ĐIỀU KHOẢN HỢP ĐỒNG & LƯƠNG */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-emerald-600" /> Điều Khoản & Lương
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-card border border-border/50 shadow-2xs">
              <div>
                <span className="text-xs text-muted-foreground block">Ngày bắt đầu hiệu lực</span>
                <span className="text-sm font-semibold text-foreground">
                  {effectiveStartDate
                    ? formatDateDisplay(effectiveStartDate)
                    : "Chưa ghi nhận"}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Ngày kết thúc</span>
                <span className="text-sm font-semibold text-foreground">
                  {effectiveEndDate
                    ? formatDateDisplay(effectiveEndDate)
                    : "Không xác định thời hạn"}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Mức lương cơ bản</span>
                <span className="text-base font-black text-emerald-600 flex items-center gap-1 mt-0.5">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  {contract.baseSalary ? Number(contract.baseSalary).toLocaleString("vi-VN") + " VNĐ" : "0 VNĐ"}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Hình thức trả lương</span>
                <span className="text-sm font-semibold text-foreground mt-0.5 block">
                  {contract.salaryTypeEnum === "MONTHLY"
                    ? "Hàng tháng (Monthly)"
                    : contract.salaryTypeEnum === "HOURLY"
                    ? "Theo giờ (Hourly)"
                    : contract.salaryTypeEnum === "DAILY"
                    ? "Theo ngày (Daily)"
                    : contract.salaryTypeEnum || "Hàng tháng"}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: AUDIT METADATA & NHẬT KÝ KÝ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <History className="h-4 w-4 text-blue-600" /> Nhật Ký Hệ Thống & Audit Metadata
              </h4>
              {onOpenSigningHistory && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onOpenSigningHistory(contract.id);
                  }}
                  className="h-7 text-xs font-bold gap-1 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
                >
                  <History className="h-3.5 w-3.5" />
                  Xem Audit Log Chi Tiết
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-muted-foreground block">Người khởi tạo:</span>
                <span className="font-semibold text-foreground">{contract.createdByName || contract.createdBy || "Hệ thống"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Thời gian tạo bản ghi:</span>
                <span className="font-medium text-foreground">{contract.createdAt ? new Date(contract.createdAt).toLocaleString("vi-VN") : "Chưa có dữ liệu"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Cập nhật lần cuối bởi:</span>
                <span className="font-semibold text-foreground">{contract.updatedBy || "Chưa có dữ liệu"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Thời gian cập nhật:</span>
                <span className="font-medium text-foreground">{contract.updatedAt ? new Date(contract.updatedAt).toLocaleString("vi-VN") : "Chưa có dữ liệu"}</span>
              </div>
              {contract.signedAt && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-muted-foreground block">Thời điểm hoàn tất ký điện tử:</span>
                  <span className="font-bold text-emerald-600">{new Date(contract.signedAt).toLocaleString("vi-VN")}</span>
                </div>
              )}
              {contract.status === "TERMINATED" && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800 bg-rose-50/50 p-2.5 rounded-lg border border-rose-200">
                  <span className="text-rose-700 font-bold block">Lý do chấm dứt hợp đồng:</span>
                  <span className="text-rose-900 font-medium">{contract.terminationReason || "Không ghi nhận lý do"}</span>
                  {contract.terminatedAt && (
                    <span className="text-rose-600 text-[11px] block mt-1">Ngày chấm dứt: {new Date(contract.terminatedAt).toLocaleString("vi-VN")}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-muted/40 border-t border-border/40">
          <div className="flex items-center gap-2">
            {onDeleteAllContracts && contract.employeeId && contract.status === "TERMINATED" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDeleteAllContracts(contract.employeeId, contract.fullName || contract.employeeCode || "nhân viên")}
                className="h-9 text-xs font-bold rounded-xl"
              >
                Xóa toàn bộ hợp đồng
              </Button>
            )}
            {pdfUrl && onOpenPdfPreview && (
              <Button
                variant="outline"
                size="sm"
                disabled={Boolean(documentLoading)}
                onClick={() => onOpenPdfPreview(contract.id)}
                className="h-9 text-xs font-bold gap-1.5 rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
              >
                {documentLoading === "view" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                <span>Xem Tệp PDF Hợp Đồng</span>
              </Button>
            )}
            {pdfUrl && onDownloadFile && (
              <Button variant="outline" size="sm" disabled={Boolean(documentLoading)} onClick={() => onDownloadFile(contract.id)} className="h-9 text-xs font-bold gap-1.5 rounded-xl">
                {documentLoading === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4 text-slate-600" />}
                <span>Tải File</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {contract.signingStatus === "PENDING_COMPANY_SIGN" && onSignCompany && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onSignCompany(contract.id);
                }}
                className="h-9 text-xs font-bold gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Ký Đại Diện Công Ty</span>
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="h-9 text-xs font-bold rounded-xl cursor-pointer"
            >
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
