import React, { useState } from "react";
import type { SalaryResponse } from "@/types/salaryManagement";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getStatusBadge, formatVND } from "./salaryUtils";
import { salaryApi } from "@/api/salary/salaryApi";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  User,
  Calendar,
  Building2,
  CreditCard,
  CheckCircle2,
  DollarSign,
  Loader2,
  X,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";

interface SalaryDetailDrawerProps {
  salary: SalaryResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onActionSuccess?: (msg: string) => void;
}

export const SalaryDetailDrawer: React.FC<SalaryDetailDrawerProps> = ({
  salary,
  isOpen,
  onClose,
  onRefresh,
  onActionSuccess,
}) => {
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [confirmPayOpen, setConfirmPayOpen] = useState<boolean>(false);

  if (!salary) return null;

  const handleApprove = async () => {
    try {
      setLoadingAction(true);
      await salaryApi.approve(salary.id);
      onActionSuccess?.(`Đã phê duyệt thành công phiếu lương của nhân viên ${salary.employeeName || ""}`);
      onRefresh?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to approve salary:", err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      setLoadingAction(true);
      await salaryApi.markPaid(salary.id);
      onActionSuccess?.(`Đã xác nhận thanh toán thành công phiếu lương của nhân viên ${salary.employeeName || ""}`);
      setConfirmPayOpen(false);
      onRefresh?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to mark paid salary:", err);
    } finally {
      setLoadingAction(false);
    }
  };

  // Group breakdown details
  const earningsList = salary.details?.filter((d) =>
    ["BASE_SALARY", "MEAL_ALLOWANCE", "PHONE_ALLOWANCE", "UNIFORM_ALLOWANCE", "RESPONSIBILITY_ALLOWANCE", "PERFORMANCE_ALLOWANCE", "BONUS"].includes(d.itemKey)
  ) || [];

  const deductionsList = salary.details?.filter((d) =>
    ["BHXH_DEDUCTION", "BHYT_DEDUCTION", "BHTN_DEDUCTION", "ABSENT_DEDUCTION", "HALFDAY_DEDUCTION", "LATE_DEDUCTION", "PIT_TAX", "OTHER_DEDUCTION"].includes(d.itemKey)
  ) || [];

  const infoList = salary.details?.filter((d) =>
    ["INSURANCE_SALARY", "PERSONAL_DEDUCTION", "DEPENDENT_DEDUCTION", "TAXABLE_INCOME"].includes(d.itemKey)
  ) || [];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col bg-background">
          <SheetHeader className="p-6 pb-4 border-b border-border/40 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <SheetTitle className="text-lg font-bold">Chi Tiết Phiếu Lương</SheetTitle>
              </div>
              <div>{getStatusBadge(salary.status)}</div>
            </div>
            <SheetDescription className="text-xs text-muted-foreground mt-1">
              Kỳ lương: <b className="text-foreground">{salary.period}</b> • Mã phiếu #{salary.id}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Cảnh báo nếu lương thực nhận âm hoặc bằng 0 */}
            {salary.totalSalary <= 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                <span>Cảnh báo: Tổng lương thực nhận bằng 0 hoặc âm. Vui lòng rà soát khoản khấu trừ!</span>
              </div>
            )}

            {/* Thông tin nhân viên */}
            <div className="flex items-center gap-3 p-4 bg-muted/20 border border-border/40 rounded-xl">
              {salary.avatarUrl ? (
                <img
                  src={salary.avatarUrl}
                  alt={salary.employeeName}
                  className="h-12 w-12 rounded-full object-cover border border-border/60"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                  {salary.employeeName ? salary.employeeName.slice(0, 2).toUpperCase() : "NV"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-base text-foreground">{salary.employeeName || "Chưa cập nhật"}</div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-2">
                  <span>Mã NV: {salary.employeeCode || "N/A"}</span>
                  <span>•</span>
                  <span>Phòng ban: {salary.departmentName || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Tổng lương thực nhận HIGHLIGHT */}
            <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 text-center space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Thực Nhận Kỳ Này</span>
              <div className="text-3xl font-black text-primary">{formatVND(salary.totalSalary)}</div>
              <p className="text-[11px] text-muted-foreground">Lương thực nhận = Lương cứng + Phụ cấp + Thưởng - Khấu trừ</p>
            </div>

            {/* Bảng breakdown chi tiết khoản cộng (Earnings) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" /> Các Khoản Thu Nhập (+)
              </h4>
              <div className="border border-border/40 rounded-xl overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border/40">
                    <tr>
                      <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Khoản mục</th>
                      <th className="py-2 px-3 text-right font-semibold text-muted-foreground">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    <tr className="hover:bg-muted/10">
                      <td className="py-2 px-3 font-medium">Lương cơ bản / Lương hợp đồng</td>
                      <td className="py-2 px-3 text-right font-semibold">{formatVND(salary.baseSalary)}</td>
                    </tr>
                    {earningsList.map((item) => (
                      <tr key={item.id || item.itemKey} className="hover:bg-muted/10">
                        <td className="py-2 px-3 text-muted-foreground">{item.description || item.itemKey}</td>
                        <td className="py-2 px-3 text-right font-medium text-emerald-600">+{formatVND(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bảng breakdown chi tiết khoản trừ (Deductions) */}
            {deductionsList.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Các Khoản Khấu Trừ & Thuyết Thuế (-)
                </h4>
                <div className="border border-border/40 rounded-xl overflow-hidden text-xs">
                  <table className="w-full">
                    <thead className="bg-muted/30 border-b border-border/40">
                      <tr>
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Khoản mục</th>
                        <th className="py-2 px-3 text-right font-semibold text-muted-foreground">Số tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {deductionsList.map((item) => (
                        <tr key={item.id || item.itemKey} className="hover:bg-muted/10">
                          <td className="py-2 px-3 text-muted-foreground">{item.description || item.itemKey}</td>
                          <td className="py-2 px-3 text-right font-medium text-red-600">-{formatVND(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Thông tin tham chiếu bảo hiểm & giảm trừ thuế */}
            {infoList.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Thông Tin Tham Chiếu Nghĩa Vụ</h4>
                <div className="p-3 bg-muted/20 rounded-xl border border-border/30 text-xs space-y-1.5">
                  {infoList.map((item) => (
                    <div key={item.id || item.itemKey} className="flex justify-between text-muted-foreground">
                      <span>{item.description || item.itemKey}:</span>
                      <span className="font-mono font-medium text-foreground">{formatVND(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border/40 bg-card flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs rounded-xl">
              Đóng
            </Button>

            <div className="flex items-center gap-2">
              {(salary.status === "DRAFT" || salary.status === "PENDING") && (
                <Button
                  onClick={handleApprove}
                  disabled={loadingAction}
                  size="sm"
                  className="text-xs font-semibold gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  {loadingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Duyệt phiếu lương
                </Button>
              )}

              {salary.status === "CONFIRMED" && (
                <Button
                  onClick={() => setConfirmPayOpen(true)}
                  disabled={loadingAction}
                  size="sm"
                  className="text-xs font-semibold gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {loadingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                  Xác nhận đã thanh toán
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm Pay Dialog */}
      <ConfirmDialog
        open={confirmPayOpen}
        onOpenChange={setConfirmPayOpen}
        title="XÁC NHẬN THANH TOÁN LƯƠNG"
        description={`Bạn có chắc chắn muốn xác nhận ĐÃ THANH TOÁN ${formatVND(salary.totalSalary)} cho nhân viên ${salary.employeeName || ""}? Hành động này sẽ cập nhật trạng thái phiếu lương thành PAID và không thể hoàn tác.`}
        variant="warning"
        confirmText="Xác nhận thanh toán"
        onConfirm={handleMarkPaid}
      />
    </>
  );
};
