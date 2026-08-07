import React, { useState } from "react";
import { Check } from "lucide-react";

interface TimeSlotPickerProps {
  selectedSlots: string[];
  onChange: (slots: string[]) => void;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  selectedSlots,
  onChange,
}) => {
  const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
  const timeRanges = [
    "08:00 - 09:30 (Sáng)",
    "10:00 - 11:30 (Sáng)",
    "14:00 - 15:30 (Chiều)",
    "16:00 - 17:30 (Chiều)",
    "19:00 - 20:30 (Tối)",
    "20:30 - 22:00 (Tối)",
  ];

  const toggleSlot = (slotKey: string) => {
    if (selectedSlots.includes(slotKey)) {
      onChange(selectedSlots.filter((s) => s !== slotKey));
    } else {
      onChange([...selectedSlots, slotKey]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-foreground">
          Chọn khung giờ học viên mong muốn kèm 1-1 (ít nhất 2 slot/tuần):
        </label>
        <span className="text-xs font-mono font-bold text-primary">Đã chọn: {selectedSlots.length} slot</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/40 bg-card p-3">
        <table className="w-full text-center border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/40">
              <th className="p-2 text-left text-muted-foreground">Khung giờ</th>
              {days.map((d) => (
                <th key={d} className="p-2 text-muted-foreground font-bold">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeRanges.map((time) => (
              <tr key={time} className="border-b border-border/20">
                <td className="p-2 text-left font-semibold text-foreground whitespace-nowrap">{time}</td>
                {days.map((day) => {
                  const slotKey = `${day} ${time.split(" ")[0]}`;
                  const isSelected = selectedSlots.includes(slotKey);
                  return (
                    <td key={day} className="p-1">
                      <button
                        type="button"
                        onClick={() => toggleSlot(slotKey)}
                        className={`w-full py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                        {isSelected ? "Chọn" : "+"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
