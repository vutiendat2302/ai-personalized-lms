import React from "react";
import { type EmployeeContractResponse } from "@/api/hr/hrApi";
import { resolveAvatarUrl } from "@/utils/avatarUrl";
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

  /**
   * Lấy tên hiển thị của loại hợp đồng
   */
  const getContractTypeName = (type?: string) => {
    switch (type) {
      case "PROBATION":
        return "Hợp đồng thử việc";
      case "OFFICIAL":
        return "Hợp đồng chính thức";
      case "INDEFINITE":
        return "Hợp đồng không xác định thời hạn";
      case "SEASONAL":
        return "Hợp đồng thời vụ, ngắn hạn";
      case "FIXED_TERM":
        return "Hợp đồng có thời hạn cố định";
      default:
        return type || "Hợp đồng lao động";
    }
  };

  /**
   * Render badge trạng thái hiệu lực hợp đồng
   */
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-success-forest/10 text-success-forest border border-success-forest/30">
            <CheckCircle2 className="h-3.5 w-3.5" /> Đang hiệu lực
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-chart-1/10 text-chart-1 border border-chart-1/30">
            <AlertCircle className="h-3.5 w-3.5" /> Đã hết hạn
          </span>
        );
      case "TERMINATED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/30">
            <AlertTriangle className="h-3.5 w-3.5" /> Đã chấm dứt
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
            {status || "Chưa có thông tin"}
          </span>
        );
    }
  };

  /**
   * Render badge trạng thái ký điện tử
   */
  const getSigningBadge = (signingStatus?: string) => {
    switch (signingStatus) {
      case "FULLY_SIGNED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-success-forest/10 text-success-forest border border-success-forest/20">
            <ShieldCheck className="h-3.5 w-3.5 text-success-forest" /> Đã ký đủ hai bên
          </span>
        );
      case "PENDING_COMPANY_SIGN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-chart-1/10 text-chart-1 border border-chart-1/20">
            <Clock className="h-3.5 w-3.5 text-chart-1" /> Chờ Công ty ký
          </span>
        );
      case "PENDING_EMPLOYEE_SIGN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-brand-cobalt/10 text-brand-cobalt border border-brand-cobalt/20">
            <Clock className="h-3.5 w-3.5 text-brand-cobalt" /> Chờ nhân viên ký
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
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0 overflow-hidden">
              {resolveAvatarUrl(contract.avatarUrl) ? (
                <img src={resolveAvatarUrl(contract.avatarUrl)} alt={contract.fullName || "Nhân sự"} className="h-full w-full object-cover" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                Chi tiết hợp đồng: <span className="text-primary font-mono">{contract.id}</span>
              </h3>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span className="font-semibold">{contract.fullName || "Nhân sự"}</span>
                <span>&bull;</span>
                {getContractTypeName(contract.contractTypeEnum || (contract.contractType as any))}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STATUS BANNER */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Trạng thái hiệu lực:</span>
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
              <User className="h-4 w-4 text-primary" /> Thông Tin Nhân Viên Thụ Hưởng
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-muted/40 border border-border/40 text-xs">
              <div>
                <span className="text-muted-foreground block">Họ và tên:</span>
                <span className="text-sm font-bold text-foreground block">{contract.fullName || "Chưa ghi nhận"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Mã số nhân viên:</span>
                <span className="text-sm font-mono font-bold text-primary block">{contract.employeeCode || (contract.employeeId ? `NV-${contract.employeeId}` : "Chưa ghi nhận")}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Phòng ban làm việc:</span>
                <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {contract.departmentName || "Chưa phân bổ"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Chức danh / Vị trí:</span>
                <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  {contract.position || "Chưa xếp vị trí"}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: ĐIỀU KHOẢN HỢP ĐỒNG & LƯƠNG */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-success-forest" /> Điều Khoản &amp; Chế Độ Đãi Ngộ
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-muted/40 border border-border/40 text-xs">
              <div>
                <span className="text-muted-foreground block">Ngày bắt đầu hiệu lực:</span>
                <span className="font-bold text-foreground font-mono flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {effectiveStartDate ? new Date(effectiveStartDate).toLocaleDateString("vi-VN") : "Chưa xác định"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Ngày hết hạn hợp đồng:</span>
                <span className="font-bold text-foreground font-mono flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-destructive" />
                  {effectiveEndDate ? new Date(effectiveEndDate).toLocaleDateString("vi-VN") : "Không xác định (Vô thời hạn)"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Mức lương cơ bản:</span>
                <span className="text-sm font-black text-primary font-mono flex items-center gap-1 mt-0.5">
                  <DollarSign className="h-4 w-4 text-primary" />
                  {contract.baseSalary ? Number(contract.baseSalary).toLocaleString("vi-VN") + " VNĐ" : "0 VNĐ"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Hình thức trả lương:</span>
                <span className="font-bold text-foreground block mt-0.5">
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

          {/* SECTION 3: LỊCH SỬ THAY ĐỔI */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <History className="h-4 w-4 text-brand-cobalt" /> Lịch sử thay đổi hệ thống
              </h4>
              {onOpenSigningHistory && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onOpenSigningHistory(contract.id);
                  }}
                  className="h-7 text-xs font-bold gap-1 rounded-lg border-brand-cobalt/30 text-brand-cobalt hover:bg-brand-cobalt/10 cursor-pointer"
                >
                  <History className="h-3.5 w-3.5" />
                  Xem lịch sử thay đổi
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-muted/40 border border-border/40 text-xs">
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
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-border/40">
                  <span className="text-muted-foreground block">Thời điểm hoàn tất ký điện tử:</span>
                  <span className="font-bold text-success-forest">{new Date(contract.signedAt).toLocaleString("vi-VN")}</span>
                </div>
              )}
              {contract.status === "TERMINATED" && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-border/40 bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                  <span className="text-destructive font-bold block">Lý do chấm dứt hợp đồng:</span>
                  <span className="text-foreground font-medium">{contract.terminationReason || "Không ghi nhận lý do"}</span>
                  {contract.terminatedAt && (
                    <span className="text-destructive/80 text-[11px] block mt-1">Ngày chấm dứt: {new Date(contract.terminatedAt).toLocaleString("vi-VN")}</span>
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
                className="h-9 text-xs font-bold gap-1.5 rounded-xl border-brand-cobalt/30 text-brand-cobalt hover:bg-brand-cobalt/10 cursor-pointer"
              >
                {documentLoading === "view" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                <span>Xem Tệp PDF Hợp Đồng</span>
              </Button>
            )}
            {pdfUrl && onDownloadFile && (
              <Button variant="outline" size="sm" disabled={Boolean(documentLoading)} onClick={() => onDownloadFile(contract.id)} className="h-9 text-xs font-bold gap-1.5 rounded-xl">
                {documentLoading === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4 text-muted-foreground" />}
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
                className="h-9 text-xs font-bold gap-1.5 rounded-xl bg-chart-1 hover:bg-chart-1/90 text-white shadow-xs cursor-pointer"
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
