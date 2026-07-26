import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  UserCheck,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
  Edit,
  TrendingUp
} from "lucide-react";

export interface FulltimeAttendanceRecord {
  id: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  workDate: string;
  checkInTime: string;
  checkOutTime: string;
  lateMinutes: number;
  overtimeHours: number;
  workdayCount: number; // 1.0 = Đủ công, 0.5 = Nửa công, 0.0 = Vắng
  penaltyAmount: number;
  status: "ON_TIME" | "LATE" | "ABSENT" | "LEAVE_APPROVED";
  ipAddress: string;
}

const getPageNumbers = (currentPage: number, total: number) => {
  const pages: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 0; i < total; i++) pages.push(i);
  } else {
    pages.push(0);
    if (currentPage > 2) {
      pages.push("...");
    }
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(total - 2, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < total - 3) {
      pages.push("...");
    }
    pages.push(total - 1);
  }
  return pages;
};

export const FulltimeAttendanceManagement: React.FC = () => {
  const [attendanceLogs, setAttendanceLogs] = useState<FulltimeAttendanceRecord[]>([
    {
      id: "att-ft-01",
      employeeCode: "EMP-FT-001",
      employeeName: "Vũ Tiến Đạt",
      departmentName: "Phòng Công Nghệ & AI",
      workDate: "2026-07-26",
      checkInTime: "07:55:12",
      checkOutTime: "17:30:40",
      lateMinutes: 0,
      overtimeHours: 0.5,
      workdayCount: 1.0,
      penaltyAmount: 0,
      status: "ON_TIME",
      ipAddress: "192.168.1.100 (Wifi Office)",
    },
    {
      id: "att-ft-02",
      employeeCode: "EMP-FT-002",
      employeeName: "Nguyễn Thị Mai",
      departmentName: "Phòng Hành Chính Nhân Sự",
      workDate: "2026-07-26",
      checkInTime: "08:18:05",
      checkOutTime: "17:05:00",
      lateMinutes: 18,
      overtimeHours: 0,
      workdayCount: 1.0,
      penaltyAmount: 50000,
      status: "LATE",
      ipAddress: "192.168.1.105 (Wifi Office)",
    },
    {
      id: "att-ft-03",
      employeeCode: "EMP-FT-003",
      employeeName: "Lê Minh Triết",
      departmentName: "Phòng Đào Tạo & Giảng Viên",
      workDate: "2026-07-26",
      checkInTime: "08:00:00",
      checkOutTime: "18:00:00",
      lateMinutes: 0,
      overtimeHours: 1.0,
      workdayCount: 1.0,
      penaltyAmount: 0,
      status: "ON_TIME",
      ipAddress: "192.168.1.112 (Wifi Office)",
    },
    {
      id: "att-ft-04",
      employeeCode: "EMP-FT-004",
      employeeName: "Trần Bảo Nam",
      departmentName: "Phòng Marketing",
      workDate: "2026-07-26",
      checkInTime: "--:--",
      checkOutTime: "--:--",
      lateMinutes: 0,
      overtimeHours: 0,
      workdayCount: 0.0,
      penaltyAmount: 0,
      status: "LEAVE_APPROVED",
      ipAddress: "N/A (Nghỉ phép có đơn)",
    },
    {
      id: "att-ft-05",
      employeeCode: "EMP-FT-005",
      employeeName: "Phạm Quốc Hùng",
      departmentName: "Phòng Công Nghệ & AI",
      workDate: "2026-07-26",
      checkInTime: "08:35:10",
      checkOutTime: "17:00:00",
      lateMinutes: 35,
      overtimeHours: 0,
      workdayCount: 0.5,
      penaltyAmount: 100000,
      status: "LATE",
      ipAddress: "192.168.1.120 (Wifi Office)",
    },
  ]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  // Edit Modal State
  const [editingLog, setEditingLog] = useState<FulltimeAttendanceRecord | null>(null);
  const [formCheckIn, setFormCheckIn] = useState("");
  const [formCheckOut, setFormCheckOut] = useState("");
  const [formLateMinutes, setFormLateMinutes] = useState(0);
  const [formOvertimeHours, setFormOvertimeHours] = useState(0);
  const [formStatus, setFormStatus] = useState<FulltimeAttendanceRecord["status"]>("ON_TIME");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  const handleOpenEditModal = (log: FulltimeAttendanceRecord) => {
    setEditingLog(log);
    setFormCheckIn(log.checkInTime);
    setFormCheckOut(log.checkOutTime);
    setFormLateMinutes(log.lateMinutes);
    setFormOvertimeHours(log.overtimeHours);
    setFormStatus(log.status);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;

    setAttendanceLogs((prev) =>
      prev.map((a) =>
        a.id === editingLog.id
          ? {
              ...a,
              checkInTime: formCheckIn,
              checkOutTime: formCheckOut,
              lateMinutes: formLateMinutes,
              overtimeHours: formOvertimeHours,
              status: formStatus,
              penaltyAmount: formLateMinutes > 15 ? (formLateMinutes > 30 ? 100000 : 50000) : 0,
            }
          : a
      )
    );
    alert(`Đã cập nhật dữ liệu điểm danh của ${editingLog.employeeName}`);
    setEditingLog(null);
  };

  const filteredLogs = attendanceLogs.filter((log) => {
    const matchesSearch =
      log.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.departmentName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" ? true : log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalElements = filteredLogs.length;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedLogs = filteredLogs.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  const totalLateCount = attendanceLogs.filter((l) => l.status === "LATE").length;
  const totalOnTimeCount = attendanceLogs.filter((l) => l.status === "ON_TIME").length;
  const onTimePercentage = attendanceLogs.length > 0 ? Math.round((totalOnTimeCount / attendanceLogs.length) * 100) : 100;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            <span>Quản Lý Điểm Danh Nhân Viên Full-Time (Timekeeping & Attendance)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Theo dõi giờ Check-in/Check-out tự động qua IP công ty, tính số phút đi muộn, giờ OT và phạt tự động.
          </p>
        </div>
        <Button
          onClick={() => alert("Đang xuất dữ liệu bảng chấm công Excel...")}
          variant="outline"
          className="rounded-xl font-bold text-xs gap-1 h-9"
        >
          <Download className="h-3.5 w-3.5" /> Xuất Bảng Chấm Công Excel
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tổng Số Nhân Viên Full-time</p>
            <p className="text-xl font-extrabold text-foreground">{attendanceLogs.length} Nhân sự</p>
          </div>
        </Card>

        <Card className="p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Tỷ Lệ Đúng Giờ Hôm Nay</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{onTimePercentage}%</p>
          </div>
        </Card>

        <Card className="p-4 border border-rose-500/30 bg-rose-500/5 rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-500/20 text-rose-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-rose-600 uppercase">Số Nhân Viên Đi Muộn</p>
            <p className="text-xl font-extrabold text-rose-600">{totalLateCount} Nhân sự</p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tổng Giờ OT Ghi Nhận</p>
            <p className="text-xl font-extrabold text-foreground">
              {attendanceLogs.reduce((acc, cur) => acc + cur.overtimeHours, 0)} Giờ
            </p>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
        {/* Toolbar & Filters */}
        <div className="p-4 bg-muted/20 border-b border-border/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
          <div className="flex flex-col gap-1 lg:col-span-8">
            <Label className="text-[11px] font-bold text-muted-foreground">Từ khóa tìm kiếm</Label>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Tìm theo Mã NV (EMP-FT-...), Tên nhân viên hoặc Phòng ban..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-8 h-9 text-xs border border-border bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-4">
            <Label className="text-[11px] font-bold text-muted-foreground">Trạng thái điểm danh</Label>
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || "ALL"); setPage(0); }}>
              <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="ON_TIME">Đúng giờ (ON_TIME)</SelectItem>
                <SelectItem value="LATE">Đi muộn (LATE)</SelectItem>
                <SelectItem value="LEAVE_APPROVED">Nghỉ phép (LEAVE)</SelectItem>
                <SelectItem value="ABSENT">Vắng mặt (ABSENT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="p-0 relative">
          <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
              <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Mã NV & Nhân Viên</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phòng Ban</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Check-in / Check-out</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Đi Muộn / OT</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Số Công / Khấu Trừ</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Chỉnh Sửa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="opacity-90">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                    <TableCell className="pl-4">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold font-mono text-[10px] border border-primary/20">
                        {log.employeeCode}
                      </span>
                      <div className="font-semibold text-xs text-foreground mt-0.5">{log.employeeName}</div>
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">{log.departmentName}</TableCell>
                    <TableCell>
                      <div className="font-mono text-xs font-bold text-foreground">
                        In: {log.checkInTime} • Out: {log.checkOutTime}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{log.ipAddress}</div>
                    </TableCell>
                    <TableCell>
                      {log.lateMinutes > 0 ? (
                        <div className="text-rose-600 font-extrabold text-xs">Đi muộn: {log.lateMinutes} phút</div>
                      ) : (
                        <div className="text-emerald-600 font-semibold text-xs">Đúng giờ</div>
                      )}
                      {log.overtimeHours > 0 && (
                        <div className="text-indigo-600 text-[10px] font-bold">Tăng ca OT: +{log.overtimeHours}h</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-xs text-foreground">{log.workdayCount} Công</div>
                      {log.penaltyAmount > 0 && (
                        <div className="text-[10px] text-rose-600 font-semibold">Phạt: -{log.penaltyAmount.toLocaleString()} đ</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.status === "ON_TIME" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                          Đúng giờ
                        </span>
                      )}
                      {log.status === "LATE" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold border border-rose-500/20">
                          Đi muộn
                        </span>
                      )}
                      {log.status === "LEAVE_APPROVED" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-[10px] font-bold border border-indigo-500/20">
                          Nghỉ phép
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        onClick={() => handleOpenEditModal(log)}
                        variant="ghost"
                        size="icon"
                        title="Chỉnh sửa công"
                        className="h-7 w-7 text-muted-foreground hover:bg-muted"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                    Không tìm thấy dữ liệu điểm danh nào phù hợp.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Modern Table Footer */}
        <div className="px-5 py-3 border-t border-border/40 bg-card/40 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          {/* Left: Total Results Summary */}
          <div className="text-muted-foreground font-medium">
            Showing <span className="font-semibold text-foreground">{totalElements === 0 ? 0 : page * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-foreground">{Math.min((page + 1) * pageSize, totalElements)}</span> of{" "}
            <span className="font-semibold text-foreground">{totalElements}</span> results
          </div>

          <div className="flex flex-wrap items-center gap-5">
            {/* Middle: Rows per page Select */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border/40 rounded-lg font-semibold">
                  <SelectValue placeholder={String(pageSize)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Go to Page Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const pageNum = parseInt(jumpPageInput, 10);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                  setPage(pageNum - 1);
                } else {
                  setJumpPageInput(String(page + 1));
                }
              }}
              className="flex items-center gap-1.5"
            >
              <span className="text-muted-foreground font-medium">Go to:</span>
              <Input
                type="number"
                min={1}
                max={totalPages || 1}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                onBlur={() => {
                  const pageNum = parseInt(jumpPageInput, 10);
                  if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                    setPage(pageNum - 1);
                  } else {
                    setJumpPageInput(String(page + 1));
                  }
                }}
                className="h-8 w-14 text-center text-xs font-semibold bg-background border border-border/40 rounded-lg px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                title="Nhập số trang và nhấn Enter"
              />
            </form>

            {/* Right: Numbered Pagination Buttons */}
            <div className="flex items-center gap-1">
              <Button
                disabled={page === 0}
                onClick={() => setPage((prev) => prev - 1)}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </Button>

              {getPageNumbers(page, totalPages).map((p, pIdx) => {
                if (p === "...") {
                  return (
                    <span key={`dots-${pIdx}`} className="px-2 text-muted-foreground font-bold pointer-events-none">
                      ...
                    </span>
                  );
                }
                const pageNum = p as number;
                const isCurrent = pageNum === page;
                return (
                  <Button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    variant={isCurrent ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 min-w-[32px] px-2 text-xs font-semibold rounded-lg transition-all",
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border-border/40 text-foreground hover:bg-muted/70"
                    )}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}

              <Button
                disabled={page >= totalPages - 1 || totalPages === 0}
                onClick={() => setPage((prev) => prev + 1)}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ATTENDANCE EDIT MODAL */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-foreground text-sm">Chỉnh Sửa Công Điểm Danh: {editingLog.employeeName}</h3>
              </div>
              <button onClick={() => setEditingLog(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Giờ Check-in</Label>
                  <Input
                    type="text"
                    value={formCheckIn}
                    onChange={(e) => setFormCheckIn(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Giờ Check-out</Label>
                  <Input
                    type="text"
                    value={formCheckOut}
                    onChange={(e) => setFormCheckOut(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Số Phút Đi Muộn</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formLateMinutes}
                    onChange={(e) => setFormLateMinutes(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Giờ Tăng Ca OT</Label>
                  <Input
                    type="number"
                    step={0.5}
                    min={0}
                    value={formOvertimeHours}
                    onChange={(e) => setFormOvertimeHours(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Trạng Thái Điểm Danh</Label>
                <Select value={formStatus} onValueChange={(val) => setFormStatus((val as any) || "ON_TIME")}>
                  <SelectTrigger className="h-9 text-xs font-semibold">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ON_TIME">Đúng giờ (ON_TIME)</SelectItem>
                    <SelectItem value="LATE">Đi muộn (LATE)</SelectItem>
                    <SelectItem value="LEAVE_APPROVED">Nghỉ phép (LEAVE)</SelectItem>
                    <SelectItem value="ABSENT">Vắng mặt (ABSENT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setEditingLog(null)} className="h-9 text-xs font-semibold rounded-xl">
                  Hủy
                </Button>
                <Button type="submit" className="h-9 text-xs font-bold bg-primary text-primary-foreground rounded-xl">
                  Lưu Chấm Công
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
