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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserCheck, Loader2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";

interface ChangeTeacherModalProps {
  open: boolean;
  onClose: () => void;
  classId: string;
  className: string;
  currentTeacherName?: string;
  onSuccess: () => void;
}

const getTeacherUserId = (teacher: any) => {
  const value = teacher?.userId ?? teacher?.userEntity?.id ?? teacher?.user?.id ?? teacher?.id;
  return value === undefined || value === null ? "" : String(value);
};

export const ChangeTeacherModal: React.FC<ChangeTeacherModalProps> = ({
  open,
  onClose,
  classId,
  className,
  currentTeacherName,
  onSuccess,
}) => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Pagination for teacher selection
  const [page, setPage] = useState(0);
  const pageSize = 5;

  const [conflictWarning, setConflictWarning] = useState("");

  useEffect(() => {
    if (open) {
      fetchTeachers();
    }
  }, [open]);

  /** Tải danh sách nhân sự có vai trò người dạy từ backend. */
  const fetchTeachers = async () => {
    setLoading(true);
    setError("");
    try {
      const employeeRows = await adminCourseClassApi.getEmployees();
      const teacherList = employeeRows.filter((emp: any) => {
        const text = [emp.position, ...(emp.roles || [])].join(" ").toUpperCase();
        return text.includes("TEACHER") || text.includes("ROLE_TA") || text.includes("TRỢ GIẢNG") || text.includes("GIẢNG VIÊN");
      });
      setTeachers(teacherList);
    } catch (err: any) {
      setError("Không thể tải danh sách giáo viên");
    } finally {
      setLoading(false);
    }
  };

  /** Chọn ứng viên; backend sẽ kiểm tra lịch atomically khi xác nhận đổi. */
  const handleSelectTeacher = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setConflictWarning("");
  };

  const filteredTeachers = teachers
    .filter((t) => {
      if (!searchKeyword.trim()) return true;
      const kw = searchKeyword.toLowerCase();
      const nameMatch = t.fullName ? t.fullName.toLowerCase().includes(kw) : false;
      const emailMatch = t.email ? t.email.toLowerCase().includes(kw) : false;
      return nameMatch || emailMatch;
    });

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / pageSize));
  const paginatedTeachers = filteredTeachers.slice(page * pageSize, (page + 1) * pageSize);

  const handleSubmit = async () => {
    if (!selectedTeacherId) {
      setError("Vui lòng chọn giảng viên mới");
      return;
    }
    if (conflictWarning) {
      setError("Không thể phân công do giảng viên bị trùng lịch dạy!");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await adminCourseClassApi.replaceClassTeacher(
        classId,
        selectedTeacherId,
        "Thay đổi giáo viên bởi HR/Admin",
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || "Không thể phân công giảng viên mới";
      if (String(message).toLowerCase().includes("trùng lịch")) setConflictWarning(String(message));
      setError(String(message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md rounded-3xl p-6 space-y-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2 text-primary">
            <UserCheck className="h-5 w-5" />
            <span>Phân công / Đổi Giảng viên</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Lớp học: <span className="font-bold text-foreground">{className}</span>
            {currentTeacherName && (
              <span className="block mt-0.5 text-[11px]">
                Giảng viên hiện tại: <span className="font-semibold text-slate-700">{currentTeacherName}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {conflictWarning && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 font-bold leading-relaxed animate-in fade-in duration-200">
            {conflictWarning}
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.target.value);
              setPage(0);
            }}
            placeholder="Tìm theo tên hoặc email giáo viên..."
            className="pl-9 h-10 rounded-xl text-xs"
          />
        </div>

        {/* Teacher Options List */}
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {loading ? (
            <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Đang tải giảng viên...
            </div>
          ) : paginatedTeachers.length > 0 ? (
            paginatedTeachers.map((t, idx) => {
              const teacherIdStr = getTeacherUserId(t);
              const isSelected = teacherIdStr === selectedTeacherId;

              return (
                <Button
                  key={teacherIdStr || `teacher-${idx}`}
                  type="button"
                  variant="outline"
                  onClick={() => handleSelectTeacher(teacherIdStr)}
                  className={`h-auto w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? conflictWarning
                        ? "border-red-500 bg-red-50 text-red-700 font-bold shadow-xs"
                        : "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border/60 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                      {t.avatarUrl ? (
                        <img src={t.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (t.fullName || "GV").substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-xs truncate text-foreground">{t.fullName}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold shrink-0">
                          Kiểm tra khi xác nhận
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{t.email || t.position || "Giảng viên"}</p>
                    </div>
                  </div>

                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                </Button>
              );
            })
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Không tìm thấy giảng viên phù hợp.
            </div>
          )}
        </div>

        {/* Mini Pagination */}
        {filteredTeachers.length > pageSize && (
          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="h-7 px-2 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Trước
            </Button>
            <span className="font-mono text-[11px] font-semibold">
              Trang {page + 1}/{totalPages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 px-2 text-xs"
            >
              Sau <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl">
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={submitting || !selectedTeacherId || Boolean(conflictWarning)}
            onClick={handleSubmit}
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Xác nhận Phân công
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
