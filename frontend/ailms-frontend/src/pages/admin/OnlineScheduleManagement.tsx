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
  Calendar,
  Clock,
  Video,
  UserCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Radio,
  X,
  Grid,
  List
} from "lucide-react";

export interface ScheduleSession {
  id: string;
  classCode: string;
  className: string;
  courseName: string;
  teacherName: string;
  assistantName: string;
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  startTime: string;
  endTime: string;
  meetingPlatform: "GOOGLE_MEET" | "ZOOM" | "TEAMS" | "WEBRTC_CUSTOM";
  meetingUrl: string;
  roomName: string;
  status: "LIVE" | "UPCOMING" | "FINISHED";
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

export const OnlineScheduleManagement: React.FC = () => {
  const [sessions, setSessions] = useState<ScheduleSession[]>([
    {
      id: "sch-1",
      classCode: "CLASS-REACT-01",
      className: "Lớp ReactJS & NextJS K14",
      courseName: "Lập trình ReactJS & NextJS Chuyên Sâu",
      teacherName: "Vũ Tiến Đạt",
      assistantName: "Lê Minh Triết",
      dayOfWeek: "MONDAY",
      startTime: "19:30",
      endTime: "21:30",
      meetingPlatform: "GOOGLE_MEET",
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      roomName: "Phòng Trực Tuyến 01",
      status: "LIVE",
    },
    {
      id: "sch-2",
      classCode: "CLASS-AI-02",
      className: "Lớp LLM & RAG System Intensive",
      courseName: "Trí Tuệ Nhân Tạo & LLM Production",
      teacherName: "Nguyễn Văn Hùng",
      assistantName: "Phạm Quốc Hùng",
      dayOfWeek: "TUESDAY",
      startTime: "20:00",
      endTime: "22:00",
      meetingPlatform: "ZOOM",
      meetingUrl: "https://zoom.us/j/9876543210",
      roomName: "Phòng Trực Tuyến 02",
      status: "UPCOMING",
    },
    {
      id: "sch-3",
      classCode: "CLASS-REACT-01",
      className: "Lớp ReactJS & NextJS K14",
      courseName: "Lập trình ReactJS & NextJS Chuyên Sâu",
      teacherName: "Vũ Tiến Đạt",
      assistantName: "Lê Minh Triết",
      dayOfWeek: "WEDNESDAY",
      startTime: "19:30",
      endTime: "21:30",
      meetingPlatform: "GOOGLE_MEET",
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      roomName: "Phòng Trực Tuyến 01",
      status: "UPCOMING",
    },
    {
      id: "sch-4",
      classCode: "CLASS-DATA-03",
      className: "Lớp Analytics & Data Wrangling K08",
      courseName: "Khoa học Dữ liệu & Python Data Analysis",
      teacherName: "Trần Bảo Nam",
      assistantName: "Lê Hoàng Yến",
      dayOfWeek: "SUNDAY",
      startTime: "09:00",
      endTime: "12:00",
      meetingPlatform: "WEBRTC_CUSTOM",
      meetingUrl: "https://ailms.edu.vn/live/class-data-03",
      roomName: "Phòng Trực Tuyến 03",
      status: "UPCOMING",
    },
  ]);

  // View Mode: Table or Weekly Grid
  const [viewMode, setViewMode] = useState<"TABLE" | "GRID">("TABLE");

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [dayFilter, setDayFilter] = useState("ALL");

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ScheduleSession | null>(null);

  // Form State
  const [formClassCode, setFormClassCode] = useState("CLASS-REACT-01");
  const [formClassName, setFormClassName] = useState("");
  const [formCourseName, setFormCourseName] = useState("Lập trình ReactJS & NextJS Chuyên Sâu");
  const [formTeacherName, setFormTeacherName] = useState("");
  const [formAssistantName, setFormAssistantName] = useState("");
  const [formDayOfWeek, setFormDayOfWeek] = useState<ScheduleSession["dayOfWeek"]>("MONDAY");
  const [formStartTime, setFormStartTime] = useState("19:30");
  const [formEndTime, setFormEndTime] = useState("21:30");
  const [formMeetingPlatform, setFormMeetingPlatform] = useState<ScheduleSession["meetingPlatform"]>("GOOGLE_MEET");
  const [formMeetingUrl, setFormMeetingUrl] = useState("");
  const [formRoomName, setFormRoomName] = useState("Phòng Trực Tuyến 01");
  const [formStatus, setFormStatus] = useState<ScheduleSession["status"]>("UPCOMING");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  const handleOpenModal = (sch?: ScheduleSession) => {
    if (sch) {
      setEditingSession(sch);
      setFormClassCode(sch.classCode);
      setFormClassName(sch.className);
      setFormCourseName(sch.courseName);
      setFormTeacherName(sch.teacherName);
      setFormAssistantName(sch.assistantName);
      setFormDayOfWeek(sch.dayOfWeek);
      setFormStartTime(sch.startTime);
      setFormEndTime(sch.endTime);
      setFormMeetingPlatform(sch.meetingPlatform);
      setFormMeetingUrl(sch.meetingUrl);
      setFormRoomName(sch.roomName);
      setFormStatus(sch.status);
    } else {
      setEditingSession(null);
      setFormClassCode("CLASS-REACT-01");
      setFormClassName("");
      setFormCourseName("Lập trình ReactJS & NextJS Chuyên Sâu");
      setFormTeacherName("");
      setFormAssistantName("");
      setFormDayOfWeek("MONDAY");
      setFormStartTime("19:30");
      setFormEndTime("21:30");
      setFormMeetingPlatform("GOOGLE_MEET");
      setFormMeetingUrl("https://meet.google.com/");
      setFormRoomName("Phòng Trực Tuyến 01");
      setFormStatus("UPCOMING");
    }
    setIsModalOpen(true);
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClassName.trim()) {
      alert("Vui lòng nhập tên ca học!");
      return;
    }

    if (editingSession) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === editingSession.id
            ? {
                ...s,
                classCode: formClassCode,
                className: formClassName,
                courseName: formCourseName,
                teacherName: formTeacherName,
                assistantName: formAssistantName,
                dayOfWeek: formDayOfWeek,
                startTime: formStartTime,
                endTime: formEndTime,
                meetingPlatform: formMeetingPlatform,
                meetingUrl: formMeetingUrl,
                roomName: formRoomName,
                status: formStatus,
              }
            : s
        )
      );
      alert("Cập nhật ca học thành công!");
    } else {
      const newSch: ScheduleSession = {
        id: `sch-${Date.now()}`,
        classCode: formClassCode,
        className: formClassName,
        courseName: formCourseName,
        teacherName: formTeacherName || "Chưa phân công",
        assistantName: formAssistantName || "Không có",
        dayOfWeek: formDayOfWeek,
        startTime: formStartTime,
        endTime: formEndTime,
        meetingPlatform: formMeetingPlatform,
        meetingUrl: formMeetingUrl || "#",
        roomName: formRoomName,
        status: formStatus,
      };
      setSessions((prev) => [newSch, ...prev]);
      alert("Tạo lịch ca học mới thành công!");
    }
    setIsModalOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    if (confirm("Bạn có chắc muốn xóa ca học này khỏi thời khóa biểu?")) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      alert("Đã xóa ca học thành công.");
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.classCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.courseName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDay = dayFilter === "ALL" ? true : s.dayOfWeek === dayFilter;
    return matchesSearch && matchesDay;
  });

  const totalElements = filteredSessions.length;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedSessions = filteredSessions.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  const DAYS_LIST = [
    { key: "MONDAY", label: "Thứ Hai" },
    { key: "TUESDAY", label: "Thứ Ba" },
    { key: "WEDNESDAY", label: "Thứ Tư" },
    { key: "THURSDAY", label: "Thứ Năm" },
    { key: "FRIDAY", label: "Thứ Sáu" },
    { key: "SATURDAY", label: "Thứ Bảy" },
    { key: "SUNDAY", label: "Chủ Nhật" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span>Quản Lý Lịch Học Online (Online Schedule & Timetable)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Thời khóa biểu các buổi học trực tuyến theo tuần, phòng meeting và phân công Giảng viên đứng lớp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border">
            <Button
              onClick={() => setViewMode("TABLE")}
              variant={viewMode === "TABLE" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs font-bold gap-1 rounded-lg"
            >
              <List className="h-3.5 w-3.5" /> Dạng Bảng
            </Button>
            <Button
              onClick={() => setViewMode("GRID")}
              variant={viewMode === "GRID" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs font-bold gap-1 rounded-lg"
            >
              <Grid className="h-3.5 w-3.5" /> Thời Khóa Biểu Tuần
            </Button>
          </div>

          <Button onClick={() => handleOpenModal()} className="rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-1 h-9">
            <Plus className="h-4 w-4" /> Xếp Ca Học Mới
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tổng Số Ca Học Trong Tuần</p>
            <p className="text-xl font-extrabold text-foreground">{sessions.length} Buổi</p>
          </div>
        </Card>

        <Card className="p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-600 animate-pulse">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Ca Đang Học (LIVE)</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {sessions.filter((s) => s.status === "LIVE").length} Buổi
            </p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Ca Sắp Diễn Ra</p>
            <p className="text-xl font-extrabold text-foreground">
              {sessions.filter((s) => s.status === "UPCOMING").length} Buổi
            </p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Giảng Viên Đứng Lớp</p>
            <p className="text-xl font-extrabold text-foreground">
              {new Set(sessions.map((s) => s.teacherName)).size} Giảng viên
            </p>
          </div>
        </Card>
      </div>

      {/* VIEW MODE GRID: Weekly Timetable */}
      {viewMode === "GRID" && (
        <Card className="p-5 border border-border/80 rounded-2xl bg-card space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Lịch Học Trực Tuyến Trong Tuần (Weekly Matrix)
            </h3>
            <span className="text-[10px] font-bold text-muted-foreground">Tuần Hiện Tại: 26/07/2026 - 01/08/2026</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 pt-2">
            {DAYS_LIST.map((day) => {
              const daySessions = sessions.filter((s) => s.dayOfWeek === day.key);
              return (
                <div key={day.key} className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-2 min-h-[220px]">
                  <div className="text-center pb-2 border-b border-border/40 font-extrabold text-xs text-foreground">
                    {day.label}
                  </div>
                  {daySessions.length > 0 ? (
                    daySessions.map((s) => (
                      <div key={s.id} className="p-2.5 rounded-lg bg-card border border-primary/20 shadow-xs space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-extrabold text-primary">{s.startTime} - {s.endTime}</span>
                          {s.status === "LIVE" && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>}
                        </div>
                        <div className="font-bold text-foreground line-clamp-1">{s.className}</div>
                        <div className="text-[10px] text-muted-foreground">GV: {s.teacherName}</div>
                        <a
                          href={s.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5 pt-1"
                        >
                          Vào Học <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-center text-muted-foreground py-8">Không có ca học</div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* VIEW MODE TABLE */}
      {viewMode === "TABLE" && (
        <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
          {/* Toolbar & Filters */}
          <div className="p-4 bg-muted/20 border-b border-border/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
            <div className="flex flex-col gap-1 lg:col-span-8">
              <Label className="text-[11px] font-bold text-muted-foreground">Từ khóa tìm kiếm</Label>
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Tìm theo Mã lớp, Tên ca học, Khóa học hoặc Giảng viên..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                  className="pl-8 h-9 text-xs border border-border bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 lg:col-span-4">
              <Label className="text-[11px] font-bold text-muted-foreground">Thứ trong tuần</Label>
              <Select value={dayFilter} onValueChange={(val) => { setDayFilter(val || "ALL"); setPage(0); }}>
                <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                  <SelectValue placeholder="Tất cả các ngày" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả các ngày</SelectItem>
                  {DAYS_LIST.map((d) => (
                    <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table Content */}
          <CardContent className="p-0 relative">
            <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
              <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
                <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Ca Học & Mã Lớp</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Khóa Học</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Giảng Viên & TA</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thứ & Khung Giờ</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phòng & Link Meeting</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="opacity-90">
                {paginatedSessions.length > 0 ? (
                  paginatedSessions.map((s) => (
                    <TableRow key={s.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                      <TableCell className="pl-4">
                        <div className="font-semibold text-xs text-foreground max-w-xs">{s.className}</div>
                        <div className="font-mono text-[10px] font-bold text-primary mt-0.5">{s.classCode}</div>
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-foreground">{s.courseName}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-foreground">GV: {s.teacherName}</div>
                        <div className="text-[10px] text-muted-foreground">TA: {s.assistantName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-xs text-foreground">
                          {DAYS_LIST.find((d) => d.key === s.dayOfWeek)?.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono font-semibold">{s.startTime} - {s.endTime}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-foreground">{s.roomName}</div>
                        <a
                          href={s.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5"
                        >
                          <Video className="h-3 w-3" /> Link Meeting <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </TableCell>
                      <TableCell>
                        {s.status === "LIVE" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-extrabold border border-emerald-500/20 flex items-center gap-1 w-fit animate-pulse">
                            <Radio className="h-3 w-3" /> Đang học (LIVE)
                          </span>
                        )}
                        {s.status === "UPCOMING" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold border border-amber-500/20">
                            Sắp diễn ra
                          </span>
                        )}
                        {s.status === "FINISHED" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 text-[10px] font-bold border border-slate-500/20">
                            Đã kết thúc
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => handleOpenModal(s)}
                            variant="ghost"
                            size="icon"
                            title="Chỉnh sửa"
                            className="h-7 w-7 text-muted-foreground hover:bg-muted"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteSession(s.id)}
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
                      Không tìm thấy ca học nào phù hợp.
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
      )}

      {/* SESSION EDIT/CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-foreground text-sm">
                  {editingSession ? "Chỉnh Sửa Ca Học Online" : "Xếp Ca Học Online Mới"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Mã Lớp Học</Label>
                  <Input
                    type="text"
                    value={formClassCode}
                    onChange={(e) => setFormClassCode(e.target.value)}
                    placeholder="E.g. CLASS-REACT-01"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Thứ Trong Tuần</Label>
                  <Select value={formDayOfWeek} onValueChange={(val) => setFormDayOfWeek((val as any) || "MONDAY")}>
                    <SelectTrigger className="h-9 text-xs font-semibold">
                      <SelectValue placeholder="Chọn ngày" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_LIST.map((d) => (
                        <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Tên Ca Học / Tên Lớp</Label>
                <Input
                  type="text"
                  value={formClassName}
                  onChange={(e) => setFormClassName(e.target.value)}
                  placeholder="E.g. Lớp ReactJS & NextJS K14"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Giờ Bắt Đầu</Label>
                  <Input
                    type="text"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    placeholder="E.g. 19:30"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Giờ Kết Thúc</Label>
                  <Input
                    type="text"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    placeholder="E.g. 21:30"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Tên Phòng Học</Label>
                  <Input
                    type="text"
                    value={formRoomName}
                    onChange={(e) => setFormRoomName(e.target.value)}
                    placeholder="E.g. Phòng Trực Tuyến 01"
                    className="h-9 text-xs"
                  />
                </div>

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
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Link Phòng Meeting</Label>
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
                  Lưu Ca Học
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
