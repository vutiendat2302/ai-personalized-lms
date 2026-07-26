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
  Video,
  Users,
  UserCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Calendar,
  X,
  Radio
} from "lucide-react";

export interface ClassroomItem {
  id: string;
  code: string;
  name: string;
  courseName: string;
  teacherName: string;
  assistantName: string;
  scheduleTime: string;
  meetingPlatform: "GOOGLE_MEET" | "ZOOM" | "TEAMS" | "WEBRTC_CUSTOM";
  meetingUrl: string;
  enrolledCount: number;
  maxCapacity: number;
  status: "LIVE" | "SCHEDULED" | "COMPLETED" | "CANCELLED";
  startDate: string;
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

export const ClassroomManagement: React.FC = () => {
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([
    {
      id: "cls-001",
      code: "CLASS-REACT-01",
      name: "Lớp Thực Hành ReactJS & NextJS K14 (Buổi Tối)",
      courseName: "Lập trình ReactJS & NextJS Chuyên Sâu",
      teacherName: "Vũ Tiến Đạt",
      assistantName: "Lê Minh Triết",
      scheduleTime: "Thứ 2 - Thứ 4 - Thứ 6 (19:30 - 21:30)",
      meetingPlatform: "GOOGLE_MEET",
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      enrolledCount: 28,
      maxCapacity: 30,
      status: "LIVE",
      startDate: "2026-06-01",
    },
    {
      id: "cls-002",
      code: "CLASS-AI-02",
      name: "Lớp Chuyên Đề LLM & RAG System Intensive",
      courseName: "Trí Tuệ Nhân Tạo & LLM Production",
      teacherName: "Nguyễn Văn Hùng",
      assistantName: "Phạm Quốc Hùng",
      scheduleTime: "Thứ 3 - Thứ 5 - Thứ 7 (20:00 - 22:00)",
      meetingPlatform: "ZOOM",
      meetingUrl: "https://zoom.us/j/9876543210",
      enrolledCount: 24,
      maxCapacity: 25,
      status: "SCHEDULED",
      startDate: "2026-07-01",
    },
    {
      id: "cls-003",
      code: "CLASS-DATA-03",
      name: "Lớp Analytics & Data Wrangling K08",
      courseName: "Khoa học Dữ liệu & Python Data Analysis",
      teacherName: "Trần Bảo Nam",
      assistantName: "Lê Hoàng Yến",
      scheduleTime: "Chủ Nhật hàng tuần (09:00 - 12:00)",
      meetingPlatform: "WEBRTC_CUSTOM",
      meetingUrl: "https://ailms.edu.vn/live/class-data-03",
      enrolledCount: 35,
      maxCapacity: 40,
      status: "SCHEDULED",
      startDate: "2026-07-15",
    },
    {
      id: "cls-004",
      code: "CLASS-UIUX-04",
      name: "Lớp Design System & Product Prototype K02",
      courseName: "Thiết kế UI/UX Product Design Systems",
      teacherName: "Đỗ Minh Tuấn",
      assistantName: "Nguyễn Thị Mai",
      scheduleTime: "Thứ 2 - Thứ 6 (18:00 - 20:00)",
      meetingPlatform: "TEAMS",
      meetingUrl: "https://teams.microsoft.com/l/meetup-join/123",
      enrolledCount: 20,
      maxCapacity: 20,
      status: "COMPLETED",
      startDate: "2026-05-01",
    },
  ]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassroomItem | null>(null);

  // Form State
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formCourseName, setFormCourseName] = useState("Lập trình ReactJS & NextJS Chuyên Sâu");
  const [formTeacherName, setFormTeacherName] = useState("");
  const [formAssistantName, setFormAssistantName] = useState("");
  const [formScheduleTime, setFormScheduleTime] = useState("");
  const [formMeetingPlatform, setFormMeetingPlatform] = useState<"GOOGLE_MEET" | "ZOOM" | "TEAMS" | "WEBRTC_CUSTOM">("GOOGLE_MEET");
  const [formMeetingUrl, setFormMeetingUrl] = useState("");
  const [formMaxCapacity, setFormMaxCapacity] = useState(30);
  const [formStatus, setFormStatus] = useState<"LIVE" | "SCHEDULED" | "COMPLETED" | "CANCELLED">("SCHEDULED");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  const handleOpenModal = (cls?: ClassroomItem) => {
    if (cls) {
      setEditingClass(cls);
      setFormCode(cls.code);
      setFormName(cls.name);
      setFormCourseName(cls.courseName);
      setFormTeacherName(cls.teacherName);
      setFormAssistantName(cls.assistantName);
      setFormScheduleTime(cls.scheduleTime);
      setFormMeetingPlatform(cls.meetingPlatform);
      setFormMeetingUrl(cls.meetingUrl);
      setFormMaxCapacity(cls.maxCapacity);
      setFormStatus(cls.status);
    } else {
      setEditingClass(null);
      setFormCode(`CLASS-${Math.floor(100 + Math.random() * 900)}`);
      setFormName("");
      setFormCourseName("Lập trình ReactJS & NextJS Chuyên Sâu");
      setFormTeacherName("");
      setFormAssistantName("");
      setFormScheduleTime("Thứ 2 - Thứ 4 - Thứ 6 (19:30 - 21:30)");
      setFormMeetingPlatform("GOOGLE_MEET");
      setFormMeetingUrl("https://meet.google.com/");
      setFormMaxCapacity(30);
      setFormStatus("SCHEDULED");
    }
    setIsModalOpen(true);
  };

  const handleSaveClassroom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Vui lòng nhập tên lớp học!");
      return;
    }

    if (editingClass) {
      setClassrooms((prev) =>
        prev.map((c) =>
          c.id === editingClass.id
            ? {
                ...c,
                code: formCode,
                name: formName,
                courseName: formCourseName,
                teacherName: formTeacherName,
                assistantName: formAssistantName,
                scheduleTime: formScheduleTime,
                meetingPlatform: formMeetingPlatform,
                meetingUrl: formMeetingUrl,
                maxCapacity: formMaxCapacity,
                status: formStatus,
              }
            : c
        )
      );
      alert(`Cập nhật lớp học "${formName}" thành công!`);
    } else {
      const newCls: ClassroomItem = {
        id: `cls-${Date.now()}`,
        code: formCode || `CLASS-${Date.now()}`,
        name: formName,
        courseName: formCourseName,
        teacherName: formTeacherName || "Chưa phân công",
        assistantName: formAssistantName || "Không có",
        scheduleTime: formScheduleTime,
        meetingPlatform: formMeetingPlatform,
        meetingUrl: formMeetingUrl || "#",
        enrolledCount: 0,
        maxCapacity: formMaxCapacity,
        status: formStatus,
        startDate: new Date().toISOString().split("T")[0],
      };
      setClassrooms((prev) => [newCls, ...prev]);
      alert(`Tạo mới lớp học online "${formName}" thành công!`);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClassroom = (id: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa lớp học "${name}"?`)) {
      setClassrooms((prev) => prev.filter((c) => c.id !== id));
      alert("Đã xóa lớp học thành công.");
    }
  };

  const filteredClassrooms = classrooms.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.teacherName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ? true : c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalElements = filteredClassrooms.length;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedClassrooms = filteredClassrooms.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            <span>Quản Lý Lớp Học Online Trực Tuyến (Classroom Management)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tạo và quản lý các lớp học trực tuyến qua Google Meet/Zoom/Teams, phân công Giảng viên & Trợ giảng.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1">
          <Plus className="h-4 w-4" /> Thêm Lớp Học Mới
        </Button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tổng Số Lớp Online</p>
            <p className="text-xl font-extrabold text-foreground">{classrooms.length}</p>
          </div>
        </Card>

        <Card className="p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-600 animate-pulse">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Đang Học Trực Tuyến (LIVE)</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {classrooms.filter((c) => c.status === "LIVE").length} Lớp
            </p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tổng Học Viên Đang Học</p>
            <p className="text-xl font-extrabold text-foreground">
              {classrooms.reduce((acc, cur) => acc + cur.enrolledCount, 0)} Học viên
            </p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Lớp Sắp Diễn Ra</p>
            <p className="text-xl font-extrabold text-foreground">
              {classrooms.filter((c) => c.status === "SCHEDULED").length}
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
                placeholder="Tìm theo Mã lớp (CLASS-...), Tên lớp, Khóa học hoặc Giảng viên đứng lớp..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-8 h-9 text-xs border border-border bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-4">
            <Label className="text-[11px] font-bold text-muted-foreground">Trạng thái lớp học</Label>
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || "ALL"); setPage(0); }}>
              <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="LIVE">Đang diễn ra (LIVE)</SelectItem>
                <SelectItem value="SCHEDULED">Sắp diễn ra (SCHEDULED)</SelectItem>
                <SelectItem value="COMPLETED">Đã kết thúc (COMPLETED)</SelectItem>
                <SelectItem value="CANCELLED">Đã hủy (CANCELLED)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="p-0 relative">
          <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
              <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Mã Lớp & Tên Lớp</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Khóa Học Liên Quan</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Giảng Viên & Trợ Giảng</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lịch Học & Nền Tảng</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sĩ Số Học Viên</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Thao Tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="opacity-90">
              {paginatedClassrooms.length > 0 ? (
                paginatedClassrooms.map((cls) => (
                  <TableRow key={cls.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-extrabold font-mono text-xs border border-primary/20">
                          {cls.code}
                        </span>
                      </div>
                      <div className="font-semibold text-xs text-foreground mt-1 max-w-xs">{cls.name}</div>
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">{cls.courseName}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">GV: {cls.teacherName}</div>
                      <div className="text-[10px] text-muted-foreground">TA: {cls.assistantName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>{cls.scheduleTime}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground">{cls.meetingPlatform}</span>
                        <a
                          href={cls.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-bold"
                        >
                          Vào Lớp <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 font-extrabold text-[10px] border border-indigo-500/20">
                        {cls.enrolledCount} / {cls.maxCapacity} Học viên
                      </span>
                    </TableCell>
                    <TableCell>
                      {cls.status === "LIVE" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-extrabold border border-emerald-500/20 flex items-center gap-1 w-fit animate-pulse">
                          <Radio className="h-3 w-3" /> Đang học (LIVE)
                        </span>
                      )}
                      {cls.status === "SCHEDULED" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold border border-amber-500/20">
                          Sắp diễn ra
                        </span>
                      )}
                      {cls.status === "COMPLETED" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 text-[10px] font-bold border border-slate-500/20">
                          Đã kết thúc
                        </span>
                      )}
                      {cls.status === "CANCELLED" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold border border-rose-500/20">
                          Đã hủy
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          onClick={() => handleOpenModal(cls)}
                          variant="ghost"
                          size="icon"
                          title="Chỉnh sửa"
                          className="h-7 w-7 text-muted-foreground hover:bg-muted"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteClassroom(cls.id, cls.name)}
                          variant="ghost"
                          size="icon"
                          title="Xóa"
                          className="h-7 w-7 text-rose-600 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                    Không tìm thấy lớp học online nào phù hợp.
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

      {/* CLASSROOM EDIT/CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-foreground text-sm">
                  {editingClass ? `Chỉnh Sửa Lớp Học: ${editingClass.name}` : "Tạo Lớp Học Online Mới"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClassroom} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Mã Lớp Học</Label>
                  <Input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="E.g. CLASS-REACT-01"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Trạng Thái</Label>
                  <Select value={formStatus} onValueChange={(val) => setFormStatus((val as any) || "SCHEDULED")}>
                    <SelectTrigger className="h-9 text-xs font-semibold">
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LIVE">Đang diễn ra (LIVE)</SelectItem>
                      <SelectItem value="SCHEDULED">Sắp diễn ra (SCHEDULED)</SelectItem>
                      <SelectItem value="COMPLETED">Đã kết thúc (COMPLETED)</SelectItem>
                      <SelectItem value="CANCELLED">Đã hủy (CANCELLED)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Tên Lớp Học Online</Label>
                <Input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="E.g. Lớp Thực Hành ReactJS & NextJS K14"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Khóa Học Đào Tạo</Label>
                <Input
                  type="text"
                  value={formCourseName}
                  onChange={(e) => setFormCourseName(e.target.value)}
                  placeholder="E.g. Lập trình ReactJS"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Giảng Viên Đứng Lớp</Label>
                  <Input
                    type="text"
                    value={formTeacherName}
                    onChange={(e) => setFormTeacherName(e.target.value)}
                    placeholder="E.g. Vũ Tiến Đạt"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Trợ Giảng (TA)</Label>
                  <Input
                    type="text"
                    value={formAssistantName}
                    onChange={(e) => setFormAssistantName(e.target.value)}
                    placeholder="E.g. Lê Minh Triết"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Lịch Học Trong Tuần</Label>
                <Input
                  type="text"
                  value={formScheduleTime}
                  onChange={(e) => setFormScheduleTime(e.target.value)}
                  placeholder="E.g. Thứ 2 - Thứ 4 - Thứ 6 (19:30 - 21:30)"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Nền Tảng Meeting</Label>
                  <Select value={formMeetingPlatform} onValueChange={(val) => setFormMeetingPlatform((val as any) || "GOOGLE_MEET")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Chọn nền tảng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOOGLE_MEET">Google Meet</SelectItem>
                      <SelectItem value="ZOOM">Zoom Cloud Meeting</SelectItem>
                      <SelectItem value="TEAMS">Microsoft Teams</SelectItem>
                      <SelectItem value="WEBRTC_CUSTOM">AILMS WebRTC Room</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Sĩ Số Tối Đa</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formMaxCapacity}
                    onChange={(e) => setFormMaxCapacity(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Link Phòng Học Trực Tuyến</Label>
                <Input
                  type="text"
                  value={formMeetingUrl}
                  onChange={(e) => setFormMeetingUrl(e.target.value)}
                  placeholder="E.g. https://meet.google.com/abc-defg-hij"
                  className="h-9 text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-9 text-xs font-semibold rounded-xl">
                  Hủy
                </Button>
                <Button type="submit" className="h-9 text-xs font-bold bg-primary text-primary-foreground rounded-xl">
                  Lưu Lớp Học
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
