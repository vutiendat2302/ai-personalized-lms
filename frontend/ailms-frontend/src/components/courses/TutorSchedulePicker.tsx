import { Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface TutorScheduleSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface TutorSchedulePickerProps {
  value: TutorScheduleSlot[];
  onChange: (value: TutorScheduleSlot[]) => void;
  disabled?: boolean;
}

const DAY_OPTIONS = [
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
  { value: 7, label: "Chủ nhật" },
];

/** Hiển thị và cập nhật các khung lịch học 1-1 lặp theo tuần. */
export function TutorSchedulePicker({ value, onChange, disabled = false }: TutorSchedulePickerProps) {
  /** Thêm một khung lịch trống để học viên khai báo thêm thời gian có thể học. */
  const addSlot = () => {
    if (value.length >= 14) return;
    onChange([...value, { id: globalThis.crypto.randomUUID(), dayOfWeek: 1, startTime: "", endTime: "" }]);
  };

  /** Xóa một khung lịch nhưng luôn giữ lại ít nhất một dòng nhập. */
  const removeSlot = (index: number) => {
    if (value.length <= 1) return;
    onChange(value.filter((_, slotIndex) => slotIndex !== index));
  };

  /** Cập nhật đúng thuộc tính của một khung lịch được chọn. */
  const updateSlot = (index: number, field: keyof TutorScheduleSlot, nextValue: string | number) => {
    onChange(value.map((slot, slotIndex) => (
      slotIndex === index ? { ...slot, [field]: nextValue } : slot
    )));
  };

  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Chọn chính xác từng thứ và khoảng giờ có thể học để hệ thống đối chiếu lịch hiện tại.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={addSlot} disabled={disabled || value.length >= 14}>
          <Plus className="h-4 w-4" />Thêm khung giờ
        </Button>
      </div>

      <div className="space-y-2">
        {value.map((slot, index) => (
          <div key={slot.id} className="grid items-center gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[2rem_10rem_1fr_auto_1fr_2.25rem]">
            <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
            <Select
              value={String(slot.dayOfWeek)}
              onValueChange={(nextValue) => { updateSlot(index, "dayOfWeek", Number(nextValue)); }}
              disabled={disabled}
            >
              <SelectTrigger aria-label={`Ngày có thể học ${String(index + 1)}`}>
                <SelectValue placeholder="Chọn thứ" />
              </SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map((day) => (
                  <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="time"
                aria-label={`Giờ bắt đầu ${String(index + 1)}`}
                value={slot.startTime}
                onChange={(event) => { updateSlot(index, "startTime", event.target.value); }}
                disabled={disabled}
                className="pl-9"
              />
            </div>
            <span className="text-center text-xs text-muted-foreground">đến</span>
            <Input
              type="time"
              aria-label={`Giờ kết thúc ${String(index + 1)}`}
              value={slot.endTime}
              onChange={(event) => { updateSlot(index, "endTime", event.target.value); }}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Xóa khung giờ ${String(index + 1)}`}
              onClick={() => { removeSlot(index); }}
              disabled={disabled || value.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
