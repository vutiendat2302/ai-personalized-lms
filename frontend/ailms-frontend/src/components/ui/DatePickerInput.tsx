import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Utility Functions cho định dạng dd/mm/yyyy ---

/**
 * Chuyển đổi YYYY-MM-DD (ISO) thành Date object
 */
export const parseYYYYMMDD = (str: string): Date | undefined => {
  if (!str) return undefined;
  const clean = str.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  return undefined;
};

/**
 * Format ISO String / YYYY-MM-DD hiển thị dạng dd/mm/yyyy
 */
export const formatDateDisplay = (str: string): string => {
  if (!str) return "";
  const dateObj = parseYYYYMMDD(str);
  if (!dateObj) return str;
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yyyy = dateObj.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

/**
 * Parse dd/mm/yyyy (hoặc yyyy-mm-dd) sang YYYY-MM-DD chuẩn cho API
 */
export const parseDDMMYYYYToYYYYMMDD = (str: string): string | null => {
  if (!str) return null;
  const clean = str.trim();
  const parts = clean.split(/[/.-]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }

    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
      const maxDays = new Date(year, month, 0).getDate();
      if (day >= 1 && day <= maxDays) {
        const yyyyStr = String(year);
        const mmStr = String(month).padStart(2, "0");
        const ddStr = String(day).padStart(2, "0");
        return `${yyyyStr}-${mmStr}-${ddStr}`;
      }
    }
  }
  return null;
};

/**
 * Tự động chèn dấu / khi gõ (gõ 28 -> 28/, gõ 2807 -> 28/07/, gõ 28072026 -> 28/07/2026)
 */
export const formatAsDDMMYYYYMask = (val: string, prevVal: string = ""): string => {
  if (prevVal.length > val.length) {
    return val;
  }
  const digits = val.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 2) {
    if (digits.length === 2) return `${digits}/`;
    return digits;
  }
  if (digits.length <= 4) {
    const day = digits.slice(0, 2);
    const month = digits.slice(2);
    if (month.length === 2) return `${day}/${month}/`;
    return `${day}/${month}`;
  }
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return `${day}/${month}/${year}`;
};

/**
 * Kiểm tra ngày nhập thủ công có hợp lệ hay không
 */
export const isInvalidDateInput = (inputVal: string): boolean => {
  if (!inputVal || !inputVal.trim()) return false;
  if (inputVal.length === 10) {
    return parseDDMMYYYYToYYYYMMDD(inputVal) === null;
  }
  return false;
};

// --- Component Interface ---

export interface DatePickerInputProps {
  value?: string; // YYYY-MM-DD
  onChange?: (isoDate: string) => void; // Emits YYYY-MM-DD
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
  minYear?: number;
  maxYear?: number;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value = "",
  onChange,
  label,
  placeholder = "dd/mm/yyyy",
  className,
  disabled = false,
  clearable = true,
  minYear = 1950,
  maxYear = 2050,
}) => {
  const [inputText, setInputText] = useState<string>("");
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);

  // Sync khi prop `value` thay đổi từ bên ngoài
  useEffect(() => {
    if (value) {
      const formatted = formatDateDisplay(value);
      setInputText(formatted);
      const parsedDate = parseYYYYMMDD(value);
      if (parsedDate) {
        setCalendarMonth(parsedDate);
      }
    } else {
      setInputText("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatAsDDMMYYYYMask(e.target.value, inputText);
    setInputText(val);

    const yyyymmdd = parseDDMMYYYYToYYYYMMDD(val);
    if (yyyymmdd) {
      const parsedDate = parseYYYYMMDD(yyyymmdd);
      if (parsedDate) {
        setCalendarMonth(parsedDate);
      }
      if (onChange) onChange(yyyymmdd);
    } else if (!val) {
      if (onChange) onChange("");
    }
  };

  const handleSelectDate = (date: Date | undefined) => {
    if (date) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const isoStr = `${yyyy}-${mm}-${dd}`;
      setInputText(`${dd}/${mm}/${yyyy}`);
      setCalendarMonth(date);
      if (onChange) onChange(isoStr);
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputText("");
    if (onChange) onChange("");
  };

  const isError = isInvalidDateInput(inputText);

  // Tạo danh sách các năm từ minYear đến maxYear
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  const months = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{label}</Label>
          {isError && <span className="text-[10px] text-destructive font-semibold">Ngày không hợp lệ</span>}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          nativeButton={false}
          render={
            <div className="relative w-full">
              <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                type="text"
                disabled={disabled}
                placeholder={placeholder}
                value={inputText}
                onChange={handleInputChange}
                maxLength={10}
                className={cn(
                  "pl-8 pr-7 h-9 text-sm border border-border/30 bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:opacity-50 font-medium",
                  isError && "border-destructive text-destructive focus-visible:ring-destructive/30",
                  className
                )}
              />
              {clearable && inputText && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer"
                  title="Xóa ngày"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          }
        />
        <PopoverContent className="w-auto p-2 z-50 bg-popover border border-border/30 shadow-xl rounded-xl" align="start">
          {/* Header chọn nhanh Tháng và Năm */}
          <div className="flex items-center justify-between gap-2 p-1 mb-2 border-b border-border/40 pb-2">
            {/* Select Tháng */}
            <select
              value={calendarMonth.getMonth()}
              onChange={(e) => {
                const newMonth = parseInt(e.target.value, 10);
                setCalendarMonth(new Date(calendarMonth.getFullYear(), newMonth, 1));
              }}
              className="h-8 text-xs font-semibold bg-background border border-border/50 rounded-lg px-2 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/30"
            >
              {months.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            {/* Select Năm */}
            <select
              value={calendarMonth.getFullYear()}
              onChange={(e) => {
                const newYear = parseInt(e.target.value, 10);
                setCalendarMonth(new Date(newYear, calendarMonth.getMonth(), 1));
              }}
              className="h-8 text-xs font-semibold bg-background border border-border/50 rounded-lg px-2 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/30"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <CalendarComponent
            mode="single"
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            selected={parseYYYYMMDD(value)}
            onSelect={handleSelectDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DatePickerInput;
