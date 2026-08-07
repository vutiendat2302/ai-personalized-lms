import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AttendanceResponse, AttendanceStatusEnum } from "@/types/attendanceManagement";
import {
  getStatusBadge,
  getSourceBadge,
  formatMinutesToHours,
  formatTimeOnly,
  formatDateVietnamese,
} from "./attendanceUtils";
import { attendanceAdminApi } from "@/api/attendance/attendanceApi";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  User,
  Clock,
  Calendar,
  CheckCircle2,
  Edit3,
  Save,
  ShieldAlert,
  Loader2,
  RotateCcw,
  Check,
  Building2,
  Briefcase,
  X,
} from "lucide-react";

interface AttendanceDetailDrawerProps {
  attendance: AttendanceResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onActionSuccess?: (msg: string) => void;
}

export const AttendanceDetailDrawer: React.FC<AttendanceDetailDrawerProps> = ({
  attendance,
  isOpen,
  onClose,
  onRefresh,
  onActionSuccess,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Edit form state
  const [checkInInput, setCheckInInput] = useState("");
  const [checkOutInput, setCheckOutInput] = useState("");
  const [statusInput, setStatusInput] = useState<AttendanceStatusEnum>("PRESENT");
  const [noteInput, setNoteInput] = useState("");

  // Confirm approve dialog state
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);

  useEffect(() => {
    if (attendance && isOpen) {
      setCheckInInput(attendance.checkInTime ? attendance.checkInTime.slice(0, 16) : "");
      setCheckOutInput(attendance.checkOutTime ? attendance.checkOutTime.slice(0, 16) : "");
      setStatusInput(attendance.status || "PRESENT");
      setNoteInput(attendance.note || "");
      setIsEditing(false);
      setErrorMsg("");
      setSuccessMsg("");
    } else {
      setErrorMsg("");
      setSuccessMsg("");
      setIsEditing(false);
    }
  }, [attendance?.id, isOpen]);

  if (!attendance) return null;

  const isApproved = !!attendance.approvedAt;

  const handleSaveManualEdit = async () => {
    if (!noteInput.trim()) {
      setErrorMsg("Ghi chú là bắt buộc khi thực hiện chỉnh sửa thủ công!");
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      let checkInFormatted = checkInInput ? (checkInInput.length === 16 ? `${checkInInput}:00` : checkInInput) : undefined;
      let checkOutFormatted = checkOutInput ? (checkOutInput.length === 16 ? `${checkOutInput}:00` : checkOutInput) : undefined;

      await attendanceAdminApi.patchUpdate(attendance.id, {
        checkInTime: checkInFormatted,
        checkOutTime: checkOutFormatted,
        status: statusInput,
        note: noteInput.trim(),
      });

      const msg = "Đã điều chỉnh thủ công bản ghi chấm công thành công!";
      setSuccessMsg(msg);
      onActionSuccess?.(msg);
      setIsEditing(false);
      onRefresh?.();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Lỗi khi điều chỉnh bản ghi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      setErrorMsg("");
      await attendanceAdminApi.approve(attendance.id);
      onActionSuccess?.("Đã phê duyệt bản ghi chấm công!");
      onRefresh?.();
      setConfirmApproveOpen(false);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Lỗi khi phê duyệt bản ghi");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-6 space-y-6">
          <SheetHeader className="border-b border-border/60 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-lg font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> Chi Tiết Chấm Công
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                  Mã bản ghi: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{attendance.id}</code>
                </SheetDescription>
              </div>

              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-xs gap-1.5 rounded-xl border-border/80"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Sửa thủ công
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="text-xs gap-1 rounded-xl text-muted-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Hủy
                </Button>
              )}
            </div>
          </SheetHeader>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Chỉnh Sửa Tay HR */}
          {isEditing && (
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3.5 animate-in fade-in duration-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5" /> Chỉnh sửa thủ công (HR / Admin)
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Giờ Check-in</Label>
                  <Input
                    type="datetime-local"
                    value={checkInInput}
                    onChange={(e) => setCheckInInput(e.target.value)}
                    className="h-9 text-xs rounded-xl bg-card"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Giờ Check-out</Label>
                  <Input
                    type="datetime-local"
                    value={checkOutInput}
                    onChange={(e) => setCheckOutInput(e.target.value)}
                    className="h-9 text-xs rounded-xl bg-card"
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <Label className="text-[11px] font-semibold text-muted-foreground">Trạng thái mới</Label>
                <Select value={statusInput} onValueChange={(val) => setStatusInput(val as AttendanceStatusEnum)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-card">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESENT">Đúng giờ (PRESENT)</SelectItem>
                    <SelectItem value="LATE">Đi muộn (LATE)</SelectItem>
                    <SelectItem value="PRESENT_LATE">Có mặt muộn (PRESENT_LATE)</SelectItem>
                    <SelectItem value="HALF_DAY">Nửa ngày (HALF_DAY)</SelectItem>
                    <SelectItem value="ON_LEAVE">Nghỉ phép (ON_LEAVE)</SelectItem>
                    <SelectItem value="ABSENT">Vắng mặt (ABSENT)</SelectItem>
                    <SelectItem value="INVALID">Bất thường / Cần rà soát (INVALID)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 text-xs">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Ghi chú điều chỉnh <span className="text-red-500">* (Bắt buộc)</span>
                </Label>
                <Textarea
                  placeholder="Nhập lý do điều chỉnh tay (VD: Máy chấm công bị lỗi, nhân viên quên dập thẻ...)"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="text-xs rounded-xl bg-card min-h-[70px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleSaveManualEdit}
                  disabled={actionLoading || !noteInput.trim()}
                  className="text-xs gap-1.5 rounded-xl shadow-xs"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Lưu thay đổi thủ công
                </Button>
              </div>
            </div>
          )}

          {/* Thẻ Thông tin Nhân viên */}
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex items-center gap-3.5">
            {attendance.avatarUrl ? (
              <img
                src={attendance.avatarUrl}
                alt={attendance.employeeName}
                className="h-12 w-12 rounded-full object-cover border border-border/80"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
                {attendance.employeeName ? attendance.employeeName.slice(0, 2).toUpperCase() : "NV"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-foreground truncate">
                {attendance.employeeName || `Nhân viên #${attendance.employeeId}`}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded font-semibold">
                  Mã: {attendance.employeeCode || "N/A"}
                </span>
                {attendance.departmentName && (
                  <span className="flex items-center gap-1 font-medium">
                    <Building2 className="h-3 w-3 text-emerald-500" /> {attendance.departmentName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Thống kê Chi tiết Công & Ca */}
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl border border-border/60 space-y-2.5">
              <h4 className="font-bold text-muted-foreground uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Thông tin ca & Thời gian
              </h4>

              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Ngày làm việc:</span>
                <span className="font-bold text-foreground">{formatDateVietnamese(attendance.workDate)}</span>
              </div>

              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Ca làm việc:</span>
                <span className="font-semibold text-foreground">{attendance.workShiftName || "Ca hành chính (08:00 - 17:00)"}</span>
              </div>

              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Giờ vào (Check-in):</span>
                <span className="font-mono font-bold text-emerald-600">
                  {formatTimeOnly(attendance.checkInTime)}
                </span>
              </div>

              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Giờ ra (Check-out):</span>
                <span className="font-mono font-bold text-blue-600">
                  {formatTimeOnly(attendance.checkOutTime)}
                </span>
              </div>

              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Tổng thời gian làm:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatMinutesToHours(attendance.workedMinutes) || "0h"}
                </span>
              </div>

              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Số phút đi muộn:</span>
                <span className={`font-mono font-bold ${attendance.lateMinutes && attendance.lateMinutes > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {attendance.lateMinutes && attendance.lateMinutes > 0 ? `${attendance.lateMinutes} phút` : "--"}
                </span>
              </div>

              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Số phút về sớm:</span>
                <span className={`font-mono font-bold ${attendance.earlyLeaveMinutes && attendance.earlyLeaveMinutes > 0 ? "text-blue-600" : "text-muted-foreground"}`}>
                  {attendance.earlyLeaveMinutes && attendance.earlyLeaveMinutes > 0 ? `${attendance.earlyLeaveMinutes} phút` : "--"}
                </span>
              </div>

              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Số phút làm thêm (OT):</span>
                <span className={`font-mono font-bold ${attendance.overtimeMinutes && attendance.overtimeMinutes > 0 ? "text-purple-600" : "text-muted-foreground"}`}>
                  {attendance.overtimeMinutes && attendance.overtimeMinutes > 0 ? `${attendance.overtimeMinutes} phút` : "--"}
                </span>
              </div>

              <div className="flex justify-between pt-0.5">
                <span className="text-muted-foreground">Trạng thái:</span>
                <span>{getStatusBadge(attendance.status)}</span>
              </div>
            </div>

            {/* Thông tin Phê duyệt & Nguồn */}
            <div className="p-4 rounded-xl border border-border/60 space-y-2.5">
              <h4 className="font-bold text-muted-foreground uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Nguồn dữ liệu & Phê duyệt
              </h4>

              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Nguồn ghi nhận:</span>
                <span>{getSourceBadge(attendance.source)}</span>
              </div>

              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Trạng thái phê duyệt:</span>
                {isApproved ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Đã phê duyệt
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    Chưa phê duyệt
                  </span>
                )}
              </div>

              {isApproved && (
                <div className="flex justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">Người duyệt:</span>
                  <span className="font-medium text-foreground">
                    {attendance.approvedByName || `User #${attendance.approvedBy}`}
                  </span>
                </div>
              )}

              {attendance.note && (
                <div className="pt-1">
                  <span className="text-muted-foreground block mb-1">Ghi chú / Giải trình:</span>
                  <p className="p-2.5 rounded-lg bg-muted/40 text-foreground italic border border-border/40">
                    {attendance.note}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-border/60 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs rounded-xl">
              Đóng
            </Button>

            {!isApproved && (
              <Button
                size="sm"
                onClick={() => setConfirmApproveOpen(true)}
                disabled={actionLoading}
                className="text-xs gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Phê duyệt bản ghi
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm Approve Dialog */}
      <ConfirmDialog
        open={confirmApproveOpen}
        onOpenChange={setConfirmApproveOpen}
        title="Xác nhận Phê duyệt Bản ghi Chấm công"
        description={`Bạn có chắc chắn muốn phê duyệt bản ghi chấm công ngày ${formatDateVietnamese(attendance.workDate)} của nhân viên ${attendance.employeeName || ""}?`}
        variant="warning"
        confirmText="Phê duyệt"
        onConfirm={handleApprove}
      />
    </>
  );
};
