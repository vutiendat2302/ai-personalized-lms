import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { salaryApi } from "@/api/salary/salaryApi";
import { Calculator, Loader2, AlertCircle } from "lucide-react";

interface GenerateSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPeriod?: string; // YYYY-MM
  onSuccess?: (msg: string) => void;
}

export const GenerateSalaryModal: React.FC<GenerateSalaryModalProps> = ({
  isOpen,
  onClose,
  defaultPeriod,
  onSuccess,
}) => {
  const currentPeriod = defaultPeriod || new Date().toISOString().slice(0, 7);
  const [period, setPeriod] = useState<string>(currentPeriod);
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (isOpen && defaultPeriod) {
      setPeriod(defaultPeriod);
    }
  }, [isOpen, defaultPeriod]);

  const handleGenerate = async () => {
    if (!period) {
      setErrorMsg("Vui lòng chọn kỳ lương (tháng/năm).");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const count = await salaryApi.generatePeriod({
        period,
        overwriteExisting,
      });

      const msg = `Đã tự động tính toán & khởi tạo thành công ${count} phiếu lương DRAFT cho kỳ ${period}!`;
      onSuccess?.(msg);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Lỗi khi sinh bảng lương kỳ mới.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Calculator className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold">Tạo Bảng Lương Kỳ Mới</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Hệ thống sẽ tổng hợp dữ liệu hợp đồng, số ngày chấm công thực tế và lượt dạy học để tự động tính toán phiếu lương DRAFT cho toàn bộ nhân sự.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 rounded-xl text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <b>Cơ chế tính:</b> Nhân viên FULL_TIME được tính dựa trên hợp đồng + phạt đi muộn/vắng mặt. Nhân viên PART_TIME được tổng hợp từ dữ liệu thù lao buổi dạy đã xác nhận.
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl text-xs">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4 text-xs py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Kỳ lương (Tháng / Năm)</Label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full h-9 px-3 text-sm font-semibold border border-border/50 rounded-xl bg-background focus:outline-hidden focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t border-border/60">
            <Checkbox
              id="overwrite"
              checked={overwriteExisting}
              onCheckedChange={(checked) => setOverwriteExisting(!!checked)}
            />
            <label
              htmlFor="overwrite"
              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Đè lên các bản ghi DRAFT đã tạo trước đó trong kỳ
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs rounded-xl">
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
            className="text-xs gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calculator className="h-3.5 w-3.5" />}
            Bắt đầu tính lương
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
