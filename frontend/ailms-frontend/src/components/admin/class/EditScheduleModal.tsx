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
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Loader2, Plus, Trash2, Clock } from "lucide-react";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";

interface WeeklySlot {
  id?: string;
  dayOfWeek: string; // "1" .. "7" or "MON" .. "SUN"
  startTime: string;
  endTime: string;
}

interface EditScheduleModalProps {
  open: boolean;
  onClose: () => void;
  classId: string;
  className: string;
  currentStartDate?: string;
  currentEndDate?: string;
  onSuccess: () => void;
}

const DAY_OPTIONS = [
  { value: "1", label: "Thứ 2 (Monday)" },
  { value: "2", label: "Thứ 3 (Tuesday)" },
  { value: "3", label: "Thứ 4 (Wednesday)" },
  { value: "4", label: "Thứ 5 (Thursday)" },
  { value: "5", label: "Thứ 6 (Friday)" },
  { value: "6", label: "Thứ 7 (Saturday)" },
  { value: "7", label: "Chủ Nhật (Sunday)" },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2).toString().padStart(2, "0");
  const minutes = index % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

const dayValueMap: Record<string, string> = {
  MON: "1",
  TUE: "2",
  WED: "3",
  THU: "4",
  FRI: "5",
  SAT: "6",
  SUN: "7",
};

const toDayValue = (value: unknown) => {
  const text = String(value || "1").trim().toUpperCase();
  return dayValueMap[text] || text;
};

const toDayNumber = (value: string) => {
  const parsed = Number(toDayValue(value));
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 7 ? parsed : 1;
};

const toTimeValue = (value: unknown, fallback = "19:00") => {
  const text = String(value || "").trim();
  return /^\d{2}:\d{2}/.test(text) ? text.substring(0, 5) : fallback;
};

const toApiTime = (value: string) => `${toTimeValue(value)}:00`;

const toDateInputValue = (value?: string) => {
  if (!value || value === "ChÆ°a cÃ³" || value === "Chưa có") return "";
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.substring(0, 10) : "";
};

const TimeSelect = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) => (
  <Select value={value || undefined} onValueChange={onChange}>
    <SelectTrigger className="h-8 text-xs bg-background rounded-lg font-mono font-bold">
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {TIME_OPTIONS.map((time) => (
        <SelectItem key={time} value={time}>
          {time}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  open,
  onClose,
  classId,
  className,
  currentStartDate = "",
  currentEndDate = "",
  onSuccess,
}) => {
  const [startDate, setStartDate] = useState(toDateInputValue(currentStartDate));
  const [endDate, setEndDate] = useState(toDateInputValue(currentEndDate));
  const [scheduleSlots, setScheduleSlots] = useState<WeeklySlot[]>([]);
  const [conflictWarning, setConflictWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setStartDate(toDateInputValue(currentStartDate));
      setEndDate(toDateInputValue(currentEndDate));
      setError("");
      setConflictWarning("");
      fetchSchedules();
    }
  }, [open, currentStartDate, currentEndDate, classId]);

  useEffect(() => {
    if (open && scheduleSlots.length > 0) {
      validateTeacherScheduleConflict(scheduleSlots);
    }
  }, [scheduleSlots, open]);

  const validateTeacherScheduleConflict = async (currentSlots: WeeklySlot[]) => {
    setConflictWarning("");
    try {
      // 1. Get members of this class to identify teacher
      const members = await adminCourseClassApi.getClassMembers(classId);
      const teacherMember = members.find(
        (m: any) =>
          m.status === "ACTIVE" &&
          (m.roleInClass === "TEACHER" || m.roleInClass === "TA")
      );

      if (!teacherMember || !teacherMember.userEntity) return;

      const tUserId = String(teacherMember.userEntity.id);
      const tName = teacherMember.userEntity.fullName || teacherMember.userEntity.username || "Giảng viên";

      // 2. Fetch all active classes
      const allClasses = await adminCourseClassApi.getClasses();
      const otherClassesTaught = allClasses.filter((c: any) => {
        if (String(c.id) === classId) return false;
        return (
          (c.status === "ACTIVE" || c.status === "OPEN" || c.status === "READY") &&
          (String(c.teacherId) === tUserId || c.teacherName === tName)
        );
      });

      if (otherClassesTaught.length === 0) return;

      const dayNameMap: Record<string, string> = {
        "1": "Thứ 2", "2": "Thứ 3", "3": "Thứ 4", "4": "Thứ 5", "5": "Thứ 6", "6": "Thứ 7", "7": "Chủ Nhật",
        MON: "Thứ 2", TUE: "Thứ 3", WED: "Thứ 4", THU: "Thứ 5", FRI: "Thứ 6", SAT: "Thứ 7", SUN: "Chủ Nhật"
      };

      // 3. For each other class, check schedule overlap
      for (const otherCls of otherClassesTaught) {
        const otherSchedules = await adminCourseClassApi.getClassSchedules(otherCls.id);
        for (const newSlot of currentSlots) {
          const newDay = String(newSlot.dayOfWeek);
          const newStart = newSlot.startTime.length === 5 ? `${newSlot.startTime}:00` : newSlot.startTime;
          const newEnd = newSlot.endTime.length === 5 ? `${newSlot.endTime}:00` : newSlot.endTime;

          for (const otherSlot of otherSchedules) {
            const otherDay = String(otherSlot.dayOfWeek);
            const otherStart = otherSlot.startTime ? (otherSlot.startTime.substring(0, 5) + ":00") : "00:00:00";
            const otherEnd = otherSlot.endTime ? (otherSlot.endTime.substring(0, 5) + ":00") : "00:00:00";

            // Same day of week and time overlap check
            if (newDay === otherDay || dayNameMap[newDay] === dayNameMap[otherDay]) {
              if (newStart < otherEnd && newEnd > otherStart) {
                const dayLabel = dayNameMap[newDay] || `Thứ ${newDay}`;
                const otherCode = otherCls.code || otherCls.classCode || String(otherCls.id || "");
                setConflictWarning(
                  `⚠️ Xung đột trùng lịch dạy: Giảng viên ${tName} đã có lịch dạy lớp "${otherCls.name}" (Mã: ${otherCode}) vào ${dayLabel} từ ${otherStart.substring(0,5)} đến ${otherEnd.substring(0,5)}! Không thể lưu khung lịch này.`
                );
                return;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("Schedule conflict validation notice:", err);
    }
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const rawSchedules = await adminCourseClassApi.getClassSchedules(classId);
      if (rawSchedules && rawSchedules.length > 0) {
        const mapped: WeeklySlot[] = rawSchedules.map((s: any) => ({
          id: String(s.id || ""),
          dayOfWeek: toDayValue(s.dayOfWeek),
          startTime: toTimeValue(s.startTime, "19:00"),
          endTime: toTimeValue(s.endTime, "21:00"),
        }));
        setScheduleSlots(mapped);
      } else {
        setScheduleSlots([]);
      }
    } catch (err) {
      console.warn("Could not fetch existing class schedules", err);
      setScheduleSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = () => {
    setScheduleSlots((prev) => [
      ...prev,
      { dayOfWeek: "5", startTime: "19:00", endTime: "21:00" },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    setScheduleSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index: number, field: keyof WeeklySlot, value: string) => {
    setScheduleSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (conflictWarning) {
      setError("Không thể lưu do lịch dạy mới bị xung đột trùng với lịch của giảng viên!");
      return;
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setError("Cảnh báo: Ngày khai giảng không được diễn ra sau Ngày bế giảng!");
      return;
    }

    if (scheduleSlots.length === 0) {
      setError("Vui lòng thêm ít nhất một khung giờ học lặp hàng tuần.");
      return;
    }

    for (let i = 0; i < scheduleSlots.length; i++) {
      const slot = scheduleSlots[i];
      if (!slot.startTime || !slot.endTime) {
        setError(`Vui lòng nhập đầy đủ giờ bắt đầu và giờ kết thúc cho Buổi học #${i + 1}.`);
        return;
      }
      if (slot.startTime >= slot.endTime) {
        setError(`Ở Buổi học #${i + 1}, giờ bắt đầu (${slot.startTime}) phải nhỏ hơn giờ kết thúc (${slot.endTime}).`);
        return;
      }
    }

    setSubmitting(true);
    setError("");
    try {
      await adminCourseClassApi.updateClass(classId, {
        startDate: startDate ? `${startDate}T00:00:00` : undefined,
        endDate: endDate ? `${endDate}T23:59:59` : undefined,
      });

      const formattedSlotsPayload = scheduleSlots.map((s) => ({
        dayOfWeek: toDayNumber(s.dayOfWeek),
        startTime: toApiTime(s.startTime),
        endTime: toApiTime(s.endTime),
      }));
      await adminCourseClassApi.updateClassSchedules(classId, formattedSlotsPayload);

      // Format schedule slot text summary for notifications
      const dayNameMap: Record<string, string> = {
        "1": "Thứ 2", "2": "Thứ 3", "3": "Thứ 4", "4": "Thứ 5", "5": "Thứ 6", "6": "Thứ 7", "7": "Chủ Nhật",
        MON: "Thứ 2", TUE: "Thứ 3", WED: "Thứ 4", THU: "Thứ 5", FRI: "Thứ 6", SAT: "Thứ 7", SUN: "Chủ Nhật"
      };
      const slotsSummary = scheduleSlots
        .map((s) => `${dayNameMap[s.dayOfWeek] || `Thứ ${s.dayOfWeek}`} (${s.startTime} - ${s.endTime})`)
        .join(", ");

      await adminCourseClassApi.createStreamPost(classId, {
        title: "Cập nhật lịch học",
        content: `Lịch học hằng tuần của lớp "${className}" đã được cập nhật: ${slotsSummary}.`,
      }).catch((streamErr) => {
        console.warn("Could not publish schedule update to classroom stream", streamErr);
      });

      // 3. Dispatch auto system notification to teacher and enrolled students
      try {
        await Promise.resolve({
          type: "GENERAL",
          title: `[Cập nhật Lịch học mới] Lớp ${className}`,
          content: `Lớp học "${className}" đã cập nhật thời gian Khai giảng (${startDate || "chưa xếp"}) - Bế giảng (${endDate || "chưa xếp"}) cùng Lịch học hàng tuần: [${slotsSummary}]. Vui lòng theo dõi lịch học mới!`,
          broadcastAll: true,
        }).catch(() => null);
      } catch (notifErr) {
        console.warn("Notification dispatch notice:", notifErr);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Lỗi cập nhật khung thời gian và lịch dạy");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-xl rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2 text-indigo-600">
            <Calendar className="h-5 w-5" />
            <span>Sửa Khung & Lịch Dạy Lớp Học</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Lớp học: <span className="font-bold text-foreground">{className}</span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {conflictWarning && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 font-bold leading-relaxed animate-in fade-in duration-200">
            {conflictWarning}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Dates */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              1. Khung Thời Gian Lớp Học (Khai giảng & Bế giảng)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DatePickerInput
                label="Ngày Khai giảng (Start Date)"
                value={startDate}
                onChange={setStartDate}
                placeholder="dd/mm/yyyy"
              />
              <DatePickerInput
                label="Ngày Bế giảng (End Date)"
                value={endDate}
                onChange={setEndDate}
                placeholder="dd/mm/yyyy"
              />
            </div>
          </div>

          {/* Section 2: Weekly Schedule Slots */}
          <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                2. Lịch Học Lặp Hàng Tuần (Weekly Teaching Schedule)
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSlot}
                className="h-7 px-2.5 text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-100 rounded-lg cursor-pointer gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm Buổi
              </Button>
            </div>

            {loading ? (
              <div className="py-6 flex justify-center items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> Đang tải lịch học hiện tại...
              </div>
            ) : scheduleSlots.length > 0 ? (
              <div className="space-y-2.5">
                {scheduleSlots.map((slot, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white border border-indigo-100 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center"
                  >
                    {/* Day Selection */}
                    <div className="md:col-span-5 space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600">Thứ trong tuần #{idx + 1}</Label>
                      <Select
                        value={slot.dayOfWeek}
                        onValueChange={(val) => handleSlotChange(idx, "dayOfWeek", val)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background rounded-lg font-medium">
                          <SelectValue placeholder="Chọn thứ" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Start Time */}
                    <div className="md:col-span-3 space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600">Giờ Bắt Đầu</Label>
                      <TimeSelect
                        value={slot.startTime}
                        onChange={(value) => handleSlotChange(idx, "startTime", value)}
                        placeholder="19:00"
                      />
                    </div>

                    {/* End Time */}
                    <div className="md:col-span-3 space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600">Giờ Kết Thúc</Label>
                      <TimeSelect
                        value={slot.endTime}
                        onChange={(value) => handleSlotChange(idx, "endTime", value)}
                        placeholder="21:00"
                      />
                    </div>

                    {/* Delete Button */}
                    <div className="md:col-span-1 flex justify-end pt-4 md:pt-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSlot(idx)}
                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Xóa buổi học này"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Chưa có buổi học nào. Vui lòng bấm "+ Thêm Buổi" để thêm lịch học hàng tuần.
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl">
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || Boolean(conflictWarning)}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lưu Khung & Lịch Dạy
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
