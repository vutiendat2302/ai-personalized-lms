import React, { useState } from "react";
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
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { Checkbox } from "@/components/ui/checkbox";
import { attendanceAdminApi } from "@/api/attendance/attendanceApi";
import { FlaskConical, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

import { getThisMonthDateRange } from "@/utils/dateUtils";

interface SimulateAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFromDate?: string;
  defaultToDate?: string;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export const SimulateAttendanceModal: React.FC<SimulateAttendanceModalProps> = ({
  isOpen,
  onClose,
  defaultFromDate,
  defaultToDate,
  onSuccess,
  onError,
}) => {
  const defaultRange = getThisMonthDateRange();

  const [fromDate, setFromDate] = useState(defaultFromDate || defaultRange.dateFrom);
  const [toDate, setToDate] = useState(defaultToDate || defaultRange.dateTo);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  React.useEffect(() => {
    if (isOpen) {
      if (defaultFromDate) setFromDate(defaultFromDate);
      if (defaultToDate) setToDate(defaultToDate);
      setErrorMsg("");
    }
  }, [isOpen, defaultFromDate, defaultToDate]);

  const handleSimulate = async () => {
    if (!fromDate || !toDate) {
      const msg = "Vui lòng chọn đầy đủ khoảng ngày cần sinh dữ liệu giả lập.";
      setErrorMsg(msg);
      onError?.(msg);
      return;
    }
    if (fromDate > toDate) {
      const msg = "Ngày bắt đầu không được sau ngày kết thúc.";
      setErrorMsg(msg);
      onError?.(msg);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const count = await attendanceAdminApi.simulate({
        fromDate,
        toDate,
        overwriteExisting,
      });

      if (count === 0) {
        const msg = "Không có bản ghi nào được sinh mới. Có thể do khoảng ngày đã chọn là ngày nghỉ/cuối tuần hoặc dữ liệu đã tồn tại và chưa bật 'Đè lên dữ liệu đã có'.";
        setErrorMsg(msg);
        onError?.(msg);
        return;
      }

      const msg = `Đã sinh thành công ${count} bản ghi giả lập chấm công từ ${fromDate} đến ${toDate}!`;
      onSuccess?.(msg);
      onClose();
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.error ||
        err?.response?.data?.message ||
        (typeof err === "string" ? err : "Lỗi khi sinh dữ liệu giả lập");
      setErrorMsg(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-purple-600">
            <FlaskConical className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold">Sinh Dữ Liệu Giả Lập (Demo / Dev)</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Tự động tạo các bản ghi chấm công thực tế (80% đúng giờ, 12% đi muộn, 5% nghỉ phép, 3% vắng mặt) cho toàn bộ nhân viên active.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 rounded-xl text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <b>Lưu ý:</b> Tính năng này chỉ hoạt động ở môi trường Dev/Demo và mặc định <b>không ghi đè</b> các bản ghi từ máy chấm công thật hoặc chỉnh sửa thủ công.
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl text-xs">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4 text-xs py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Từ ngày (From)</Label>
              <DatePickerInput
                value={fromDate}
                onChange={setFromDate}
                className="h-9 text-xs rounded-xl bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Đến ngày (To)</Label>
              <DatePickerInput
                value={toDate}
                onChange={setToDate}
                className="h-9 text-xs rounded-xl bg-card"
              />
            </div>
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
              Đè lên dữ liệu đã có (Chỉ áp dụng với dữ liệu giả lập cũ)
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs rounded-xl">
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={handleSimulate}
            disabled={loading}
            className="text-xs gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
            Bắt đầu sinh dữ liệu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
