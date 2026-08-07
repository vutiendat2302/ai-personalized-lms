import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { formatDateDisplay } from "@/components/ui/DatePickerInput";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Plus,
  Search,
  Trash2,
  Edit,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Eye,
  BarChart3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  User,
  Calendar as CalendarIcon,
  DollarSign,
  Check,
  Filter,
  Layers,
  Star,
  List,
  Grid,
  TrendingUp,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

import { classSessionApi } from "@/api/sessions/classSessionApi";
import type { ClassOnlineResponse } from "@/types/admin";
import { ClassSessionDetailModal } from "@/components/admin/session/ClassSessionDetailModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Form validation schema for Create/Edit session modal
const sessionSchema = z.object({
  classId: z.string().min(1, "Vui lòng chọn Lớp học"),
  teacherId: z.string().min(1, "Vui lòng chọn Giảng viên phụ trách"),
  title: z.string().min(1, "Tiêu đề buổi học không được để trống").max(255, "Tối đa 255 ký tự"),
  meetingUrl: z.string().url("Link phòng học không hợp lệ").or(z.literal("")),
  scheduledAt: z.string().min(1, "Vui lòng chọn thời gian bắt đầu"),
  durationMin: z.number().min(1, "Thời lượng tối thiểu 1 phút").max(480, "Tối đa 480 phút"),
  status: z.string().optional(),
});
type SessionFormValues = z.infer<typeof sessionSchema>;

const getSessionLifecycleStatus = (session: ClassOnlineResponse) => {
  if (session.lifecycleStatus) return session.lifecycleStatus;
  const status = (session.status || "").toUpperCase();
  if (status === "INACTIVE" || status === "DELETE" || status === "DELETED") return "CANCELLED";
  if (!session.scheduledAt) return "UPCOMING";

  const start = new Date(session.scheduledAt).getTime();
  const durationMs = Math.max(session.durationMin || 60, 1) * 60 * 1000;
  const now = Date.now();
  if (now >= start && now < start + durationMs) return "IN_PROGRESS";
  if (now >= start + durationMs) return "COMPLETED";
  return "UPCOMING";
};

const sortSessions = (items: ClassOnlineResponse[], rules: Array<{ field: string; dir: "ASC" | "DESC" }>) => {
  if (rules.length === 0) {
    return items;
  }
  return [...items].sort((a, b) => {
    for (const rule of rules) {
      const dir = rule.dir === "ASC" ? 1 : -1;
      const aVal =
        rule.field === "className" ? a.className || a.classCode || "" :
        rule.field === "teacherName" ? a.teacherName || "" :
        rule.field === "status" ? getSessionLifecycleStatus(a) :
        (a as any)[rule.field] || "";
      const bVal =
        rule.field === "className" ? b.className || b.classCode || "" :
        rule.field === "teacherName" ? b.teacherName || "" :
        rule.field === "status" ? getSessionLifecycleStatus(b) :
        (b as any)[rule.field] || "";
      const cmp = String(aVal).localeCompare(String(bVal), "vi", { numeric: true });
      if (cmp !== 0) return cmp * dir;
    }
    return 0;
  });
};

const toDateParam = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const ClassSessionManagementPage: React.FC = () => {
  // View Mode: 'list' (Bảng), 'chart' (Biểu đồ), 'pivot' (Bảng tổng hợp thù lao)
  const [viewMode, setViewMode] = useState<"list" | "chart" | "pivot">("list");

  // Data States
  const [sessions, setSessions] = useState<ClassOnlineResponse[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);

  // Month & Filter States (Default to Current Month YYYY-MM)
  const getCurrentYearMonth = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentYearMonth());
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterClassId, setFilterClassId] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [quickDateFilter, setQuickDateFilter] = useState<string>("THIS_MONTH");
  const [groupByField, setGroupByField] = useState<"date" | "status" | "teacher" | "class">("date");

  // Multi-column sorting
  const [sortRules, setSortRules] = useState<Array<{ field: string; dir: "ASC" | "DESC" }>>([]);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Loading States
  const [loading, setLoading] = useState(false);
  // Toast Banners
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);

  const showBanner = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(""), 3500);
    } else {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(""), 3500);
    }
  };

  // Session Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<ClassOnlineResponse | null>(null);

  // Form Modal State (Create / Edit)
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassOnlineResponse | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Confirm Delete Dialog State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const sessionForm = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      classId: "",
      teacherId: "",
      title: "",
      meetingUrl: "",
      scheduledAt: "",
      durationMin: 60,
      status: "ACTIVE",
    },
  });

  // Fetch dropdown data for Modal
  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async (classKeyword = "") => {
    try {
      const [clsPage, tchData] = await Promise.all([
        classSessionApi.getClasses({ page: 0, size: 20, keyword: classKeyword || undefined }).catch(() => ({ content: [] })),
        classSessionApi.getTeachers().catch(() => []),
      ]);
      setClassesList(clsPage?.content || []);
      setTeachersList(tchData || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách lớp/giảng viên:", err);
    }
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const py = prevDate.getFullYear();
    const pm = String(prevDate.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${py}-${pm}`);
    setPage(0);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    const ny = nextDate.getFullYear();
    const nm = String(nextDate.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${ny}-${nm}`);
    setPage(0);
  };

  // Fetch Sessions via server-side pagination API
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSessions();
    }, 300);
    return () => clearTimeout(timer);
  }, [
    selectedMonth,
    searchKeyword,
    filterClassId,
    filterStatus,
    quickDateFilter,
    sortRules,
    page,
    pageSize,
  ]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const [yearStr, monthStr] = selectedMonth.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      const lastDay = new Date(year, month, 0).getDate();

      let scheduledFrom = `${selectedMonth}-01T00:00:00`;
      let scheduledTo = `${selectedMonth}-${String(lastDay).padStart(2, "0")}T23:59:59`;

      const now = new Date();
      if (quickDateFilter === "TODAY") {
        const todayStr = toDateParam(now);
        scheduledFrom = `${todayStr}T00:00:00`;
        scheduledTo = `${todayStr}T23:59:59`;
      } else if (quickDateFilter === "YESTERDAY") {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        const yestStr = toDateParam(yest);
        scheduledFrom = `${yestStr}T00:00:00`;
        scheduledTo = `${yestStr}T23:59:59`;
      } else if (quickDateFilter === "LAST_7_DAYS") {
        const d7 = new Date(now);
        d7.setDate(d7.getDate() - 7);
        scheduledFrom = `${toDateParam(d7)}T00:00:00`;
        scheduledTo = `${toDateParam(now)}T23:59:59`;
      }

      const lifecycleFilter =
        filterStatus !== "ALL"
          ? filterStatus
          : ["UPCOMING", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(quickDateFilter)
            ? quickDateFilter
            : undefined;

      const params: any = {
        page,
        size: pageSize,
        keyword: searchKeyword.trim() || undefined,
        classId: filterClassId !== "ALL" ? filterClassId : undefined,
        lifecycleStatus: lifecycleFilter,
        scheduledFrom,
        scheduledTo,
      };

      const res = await classSessionApi.searchSessions(params);

      if (res && res.content) {
        const sortedContent = sortSessions(res.content, sortRules);
        setSessions(sortedContent);
        setTotalPages(res.totalPages || 1);
        setTotalElements(res.totalElements || sortedContent.length);

      } else {
        setSessions([]);
        setTotalPages(1);
        setTotalElements(0);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi tải danh sách buổi học", true);
      setSessions([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedMonth(getCurrentYearMonth());
    setSearchKeyword("");
    setFilterClassId("ALL");
    setFilterStatus("ALL");
    setQuickDateFilter("THIS_MONTH");
    setGroupByField("date");
    setSortRules([]);
    setPage(0);
  };

  const handleOpenCreateModal = () => {
    setEditingSession(null);
    sessionForm.reset({
      classId: classesList.length > 0 ? String(classesList[0].id) : "",
      teacherId: teachersList.length > 0 ? String(teachersList[0].userId || teachersList[0].id) : "",
      title: "",
      meetingUrl: "",
      scheduledAt: new Date().toISOString().slice(0, 16),
      durationMin: 60,
      status: "ACTIVE",
    });
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (session: ClassOnlineResponse) => {
    setEditingSession(session);
    let schedStr = session.scheduledAt || "";
    if (schedStr && schedStr.length >= 16) {
      schedStr = schedStr.slice(0, 16);
    }
    sessionForm.reset({
      classId: String(session.classId),
      teacherId: String(session.teacherId),
      title: session.title || "",
      meetingUrl: session.meetingUrl || "",
      scheduledAt: schedStr,
      durationMin: session.durationMin || 60,
      status: session.status || "ACTIVE",
    });
    setFormModalOpen(true);
  };

  const handleSaveSession = async (values: SessionFormValues) => {
    setFormSubmitting(true);
    try {
      let formattedDate = values.scheduledAt;
      if (formattedDate && formattedDate.length === 16) {
        formattedDate = formattedDate + ":00";
      }

      if (editingSession) {
        await classSessionApi.updateSession(String(editingSession.id), {
          title: values.title.trim(),
          meetingUrl: values.meetingUrl.trim(),
          scheduledAt: formattedDate,
          durationMin: Number(values.durationMin),
          status: values.status || "ACTIVE",
        });
        showBanner("Cập nhật buổi học thành công!");
        fetchSessions();
      } else {
        const created = await classSessionApi.createSession({
          classId: values.classId,
          teacherId: values.teacherId,
          title: values.title.trim(),
          meetingUrl: values.meetingUrl.trim(),
          scheduledAt: formattedDate,
          durationMin: Number(values.durationMin),
        });

        if (created && created.id) {
          setNewlyCreatedId(String(created.id));
          showBanner(`Tạo mới buổi học "${created.title}" thành công!`);
          setTimeout(() => setNewlyCreatedId(null), 4000);
        }
        fetchSessions();
      }
      setFormModalOpen(false);
    } catch (err: any) {
      showBanner(err?.response?.data?.message || err.message || "Lỗi lưu thông tin buổi học", true);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleQuickUpdateStatus = async (sessionId: string, newStatus: string) => {
    try {
      await classSessionApi.updateSession(sessionId, { status: newStatus });
      showBanner(`Đã đổi trạng thái buổi học thành ${newStatus}!`);
      if (selectedSessionForDetail && String(selectedSessionForDetail.id) === sessionId) {
        setSelectedSessionForDetail((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      fetchSessions();
    } catch (err: any) {
      showBanner(err?.response?.data?.message || err.message || "Lỗi cập nhật trạng thái buổi học", true);
    }
  };

  const handleDeleteSession = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDeleteId) return;
    try {
      await classSessionApi.deleteSession(confirmDeleteId);
      showBanner("Đã xóa buổi học thành công!");
      if (detailModalOpen) setDetailModalOpen(false);
      fetchSessions();
    } catch (err: any) {
      showBanner(err.message || "Lỗi xóa buổi học", true);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const confirmBulkDeleteAction = async () => {
    try {
      await classSessionApi.bulkDeleteSessions(selectedSessionIds);
      showBanner("Đã xóa các buổi học đã chọn thành công!");
      setSelectedSessionIds([]);
      fetchSessions();
    } catch (err: any) {
      showBanner("Lỗi xóa hàng loạt buổi học", true);
    } finally {
      setConfirmBulkDelete(false);
    }
  };

  const handleSelectAllSessions = (checked: boolean) => {
    if (checked) setSelectedSessionIds(sessions.map((s) => String(s.id)));
    else setSelectedSessionIds([]);
  };

  const handleSelectSession = (id: string) => {
    if (selectedSessionIds.includes(id)) setSelectedSessionIds(selectedSessionIds.filter((i) => i !== id));
    else setSelectedSessionIds([...selectedSessionIds, id]);
  };

  const handleSort = (field: string) => {
    setSortRules((prevRules) => {
      const existingIndex = prevRules.findIndex((r) => r.field === field);
      if (existingIndex === -1) {
        const filtered = prevRules.filter((r) => r.field !== "scheduledAt");
        return [...filtered, { field, dir: "ASC" }];
      } else {
        const currentRule = prevRules[existingIndex];
        if (currentRule.dir === "ASC") {
          const updated = [...prevRules];
          updated[existingIndex] = { field, dir: "DESC" };
          return updated;
        } else {
          const updated = prevRules.filter((r) => r.field !== field);
          return updated;
        }
      }
    });
    setPage(0);
  };

  const renderSortIcon = (field: string) => {
    const idx = sortRules.findIndex((r) => r.field === field);
    if (idx === -1) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />;
    return (
      <span className="flex items-center gap-0.5 text-primary font-bold text-xs">
        {sortRules[idx].dir === "ASC" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
        {sortRules.length > 1 && <span className="text-[10px]">{idx + 1}</span>}
      </span>
    );
  };

  const renderStatusBadge = (session: ClassOnlineResponse) => {
    const st = getSessionLifecycleStatus(session);
    if (st === "UPCOMING") {
      return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">Sap dien ra</Badge>;
    }
    if (st === "IN_PROGRESS") {
      return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs animate-pulse">Dang dien ra</Badge>;
    }
    if (st === "COMPLETED") {
      return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 font-bold text-xs">Da dien ra</Badge>;
    }
    if (st === "CANCELLED") {
      return <Badge variant="destructive" className="font-bold text-xs">Da huy</Badge>;
    }
    return <Badge variant="outline" className="font-bold text-xs">{session.status}</Badge>;
  };

  const formatMoney = (val?: number) => {
    if (val === undefined || val === null) return "Chua co don gia";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  // Group Sessions dynamically based on user choice in "Nhóm theo"
  const groupSessions = (sessionList: ClassOnlineResponse[]) => {
    const groups: { groupKey: string; groupDisplay: string; items: ClassOnlineResponse[] }[] = [];

    sessionList.forEach((s) => {
      let groupKey = "";
      let groupDisplay = "";

      if (groupByField === "date") {
        groupKey = s.scheduledAt ? s.scheduledAt.slice(0, 10) : "Khác";
        if (groupKey !== "Khác") {
          try {
            const d = new Date(groupKey);
            groupDisplay = d.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "2-digit", day: "2-digit" });
          } catch {
            groupDisplay = groupKey;
          }
        } else {
          groupDisplay = "Khác";
        }
      } else if (groupByField === "status") {
        groupKey = s.status || "ACTIVE";
        groupDisplay = `Trạng thái: ${groupKey}`;
      } else if (groupByField === "teacher") {
        groupKey = s.teacherName || String(s.teacherId);
        groupDisplay = `Giảng viên: ${groupKey}`;
      } else if (groupByField === "class") {
        groupKey = s.className || s.classCode || String(s.classId);
        groupDisplay = `Lớp học: ${groupKey}`;
      }

      const existing = groups.find((g) => g.groupKey === groupKey);
      if (existing) existing.items.push(s);
      else groups.push({ groupKey, groupDisplay, items: [s] });
    });

    return groups;
  };

  const groupedSessionList = groupSessions(sessions);

  // Prepare chart data for Chart View (Stacked Bar Chart by date/week)
  const chartData = groupedSessionList.map((g) => {
    const completed = g.items.filter((i) => getSessionLifecycleStatus(i) === "COMPLETED").length;
    const cancelled = g.items.filter((i) => getSessionLifecycleStatus(i) === "CANCELLED").length;
    const upcoming = g.items.filter((i) => ["UPCOMING", "IN_PROGRESS"].includes(getSessionLifecycleStatus(i))).length;
    return {
      name: g.groupKey.slice(-5),
      "Đã diễn ra": completed,
      "Đã hủy": cancelled,
      "Sắp diễn ra": upcoming,
    };
  });

  return (
    <div className="mx-auto max-w-none w-full px-4 sm:px-6 lg:px-10 py-6 space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Toast Banners */}
      {successBanner && (
        <div className="fixed bottom-6 right-6 z-9999 flex items-center gap-3 rounded-2xl bg-emerald-600 text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="fixed bottom-6 right-6 z-9999 flex items-center gap-3 rounded-2xl bg-red-600 text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{errorBanner}</span>
        </div>
      )}

      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/30 pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-1">
            <Link to="/dashboard" className="flex items-center gap-1 hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay lại Tổng quan</span>
            </Link>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3 mt-2">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <Video className="h-7 w-7" />
            </div>
            <span>Quản lý Buổi Học Online</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => fetchSessions()} variant="outline" size="sm" className="rounded-xl gap-1.5 font-semibold">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới
          </Button>
          <Button onClick={handleOpenCreateModal} size="sm" className="rounded-xl gap-1 font-semibold bg-primary text-primary-foreground cursor-pointer">
            <Plus className="h-4 w-4" /> Thêm Buổi Học Mới
          </Button>
        </div>
      </div>

      {/* ODOO STYLE TOP CONTROL BAR: Bộ lọc | Nhóm theo | Yêu thích | View Modes */}
      <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* ODOO DROPDOWNS */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* 1. BỘ LỌC (Filter Dropdown Menu) */}
            <Select value={quickDateFilter} onValueChange={(val) => {
              setQuickDateFilter(val);
              setPage(0);
            }}>
              <SelectTrigger className="h-9 font-bold text-xs gap-1.5 rounded-xl border-border/50 bg-background w-44">
                <Filter className="h-3.5 w-3.5 text-primary" />
                <SelectValue placeholder="Bộ lọc" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="THIS_MONTH">📅 Trong tháng này ({selectedMonth})</SelectItem>
                <SelectItem value="TODAY">🕒 Tạo hôm nay</SelectItem>
                <SelectItem value="YESTERDAY">🕒 Tạo hôm qua</SelectItem>
                <SelectItem value="LAST_7_DAYS">📆 7 ngày qua</SelectItem>
                <SelectItem value="ACTIVE">✅ Đã lên lịch</SelectItem>
                <SelectItem value="COMPLETED">✔️ Đã diễn ra</SelectItem>
                <SelectItem value="CANCELLED">❌ Đã hủy</SelectItem>
              </SelectContent>
            </Select>

            {/* 2. NHÓM THEO (Group by Dropdown Menu) */}
            <Select value={groupByField} onValueChange={(val: any) => setGroupByField(val)}>
              <SelectTrigger className="h-9 font-bold text-xs gap-1.5 rounded-xl border-border/50 bg-background w-44">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <SelectValue placeholder="Nhóm theo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">📆 Ngày bắt đầu</SelectItem>
                <SelectItem value="status">📌 Trạng thái</SelectItem>
                <SelectItem value="teacher">👨‍🏫 Gia sư / Mentor</SelectItem>
                <SelectItem value="class">📚 Môn học / Lớp</SelectItem>
              </SelectContent>
            </Select>

            {/* 3. YÊU THÍCH (Favorites Preset Menu) */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 text-xs font-bold gap-1.5 rounded-xl border-border/50"
            >
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span>Đặt lại bộ lọc</span>
            </Button>
          </div>

          {/* VIEW MODE TOGGLES (List / Chart / Pivot Table) */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 shrink-0">
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              className={`h-8 px-3 text-xs font-bold gap-1.5 rounded-lg ${
                viewMode === "list" ? "bg-primary text-primary-foreground shadow-xs" : ""
              }`}
            >
              <List className="h-3.5 w-3.5" /> Bảng Dữ Liệu
            </Button>

            <Button
              size="sm"
              variant={viewMode === "chart" ? "default" : "ghost"}
              onClick={() => setViewMode("chart")}
              className={`h-8 px-3 text-xs font-bold gap-1.5 rounded-lg ${
                viewMode === "chart" ? "bg-primary text-primary-foreground shadow-xs" : ""
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Biểu Đồ
            </Button>

            <Button
              size="sm"
              variant={viewMode === "pivot" ? "default" : "ghost"}
              onClick={() => setViewMode("pivot")}
              className={`h-8 px-3 text-xs font-bold gap-1.5 rounded-lg ${
                viewMode === "pivot" ? "bg-primary text-primary-foreground shadow-xs" : ""
              }`}
            >
              <Grid className="h-3.5 w-3.5" /> Bảng Tổng Hợp Thù Lao
            </Button>
          </div>

        </div>
      </div>

      {/* VIEW 1: CHART VIEW (Ảnh 3 - Biểu đồ cột Stacked Bar Chart theo tuần/ngày) */}
      {viewMode === "chart" && (
        <Card className="border-border shadow-xs bg-card p-6 space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between border-b border-border/30 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span>Biểu Đồ Thống Kê Buổi Học Tháng {selectedMonth}</span>
              </h3>
              <p className="text-xs text-muted-foreground">Phân tích buổi học theo trạng thái Đã diễn ra, Đã hủy và Sắp diễn ra.</p>
            </div>
            <Badge variant="outline" className="font-mono font-bold text-xs">{selectedMonth}</Badge>
          </div>

          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: "12px", border: "none" }} />
                <Legend />
                <Bar dataKey="Đã diễn ra" stackId="a" fill="#2563eb" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Đã hủy" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Sắp diễn ra" stackId="a" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* VIEW 2: PIVOT TABLE VIEW (Ảnh 4 - Bảng tổng hợp thù lao theo Mentor / Môn / Học viên) */}
      {viewMode === "pivot" && (
        <Card className="border-border shadow-xs bg-card p-6 space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between border-b border-border/30 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <span>Bảng Tổng Hợp Thù Lao Theo Mentor & Môn Học</span>
              </h3>
              <p className="text-xs text-muted-foreground">Thống kê thù lao chi tiết theo từng mentor, môn học và số lượng học viên.</p>
            </div>
            <Badge className="bg-emerald-600 text-white font-mono font-bold text-xs">{selectedMonth}</Badge>
          </div>

          <div className="rounded-2xl border border-border/40 overflow-hidden overflow-x-auto bg-card">
            <Table>
              <TableHeader className="bg-muted/50 text-xs">
                <TableRow>
                  <TableHead className="font-extrabold w-80">Gia sư / Mentor & Môn học</TableHead>
                  <TableHead className="font-extrabold text-center">Số tập dữ liệu</TableHead>
                  <TableHead className="font-extrabold text-center">Buổi học thử</TableHead>
                  <TableHead className="font-extrabold text-right">Thù lao tính toán</TableHead>
                  <TableHead className="font-extrabold text-right">Thù lao thực tế</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="text-xs">
                {groupedSessionList.map((g, idx) => {
                  const totalCount = g.items.length;
                  const trialCount = g.items.filter((i) => (i.title || "").toLowerCase().includes("thử")).length;
                  const totalMoney = g.items.reduce((sum, item) => sum + (item.remuneration || 0), 0);

                  return (
                    <React.Fragment key={idx}>
                      <TableRow className="bg-muted/20 font-bold border-t border-border/40">
                        <TableCell className="font-bold text-primary flex items-center gap-2">
                          <span>▼ {g.groupDisplay}</span>
                        </TableCell>
                        <TableCell className="text-center font-mono">{totalCount}</TableCell>
                        <TableCell className="text-center font-mono">{trialCount}</TableCell>
                        <TableCell className="text-right font-mono font-extrabold text-emerald-600">
                          {formatMoney(totalMoney)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-extrabold text-emerald-600">
                          {formatMoney(totalMoney)}
                        </TableCell>
                      </TableRow>

                      {g.items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                          <TableCell className="pl-8 text-muted-foreground">
                            • {item.title || "Buổi học"} - <strong className="text-foreground">{item.teacherName || `#${item.teacherId}`}</strong>
                          </TableCell>
                          <TableCell className="text-center font-mono">1</TableCell>
                          <TableCell className="text-center font-mono">{(item.title || "").toLowerCase().includes("thử") ? 1 : 0}</TableCell>
                          <TableCell className="text-right font-mono text-emerald-600">{formatMoney(item.remuneration)}</TableCell>
                          <TableCell className="text-right font-mono text-emerald-600">{formatMoney(item.remuneration)}</TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* VIEW 3: STANDARD DATA TABLE (Chế độ xem Bảng chính) */}
      {viewMode === "list" && (
        <section id="management" className="space-y-6 scroll-mt-36">
          <Card className="border-border shadow-xs bg-card overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40 bg-muted/20">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    <span>Danh sách Buổi học Online</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1">
                    Nhóm theo {groupByField === "date" ? "Ngày bắt đầu" : groupByField === "status" ? "Trạng thái" : groupByField === "teacher" ? "Giảng viên" : "Lớp học"}.
                  </CardDescription>
                </div>

                {/* Bulk Actions */}
                {selectedSessionIds.length > 0 && (
                  <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-2.5 rounded-2xl animate-in fade-in-50">
                    <span className="text-xs font-bold text-red-700 dark:text-red-300">
                      Đã chọn {selectedSessionIds.length} buổi học
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmBulkDelete(true)}
                      className="h-8 text-xs font-bold gap-1.5 rounded-xl cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Xóa các buổi học đã chọn
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* MONTH PICKER & FILTER BAR */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  
                  {/* Month Selector */}
                  <div className="md:col-span-2 flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePrevMonth}
                      className="h-9 px-2 rounded-xl border-border/50 shrink-0"
                      title="Tháng trước"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="relative flex-1">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                      <Input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => {
                          if (e.target.value) {
                            setSelectedMonth(e.target.value);
                            setPage(0);
                          }
                        }}
                        className="pl-9 h-9 text-xs font-bold font-mono rounded-xl bg-background border-primary/30"
                      />
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleNextMonth}
                      className="h-9 px-2 rounded-xl border-border/50 shrink-0"
                      title="Tháng sau"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Search Keyword */}
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={searchKeyword}
                      onChange={(e) => {
                        setSearchKeyword(e.target.value);
                        setPage(0);
                      }}
                      placeholder="Tìm theo tiêu đề, lớp, giảng viên..."
                      className="pl-9 h-9 text-xs rounded-xl bg-background border-border/50"
                    />
                  </div>

                  {/* Filter Class */}
                  <div>
                    <Select
                      value={filterClassId}
                      onValueChange={(val) => {
                        setFilterClassId(val);
                        setPage(0);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/50">
                        <SelectValue placeholder="Chọn Lớp học" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tất cả Lớp học</SelectItem>
                        {classesList.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name || c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filter Status */}
                  <div>
                    <Select
                      value={filterStatus}
                      onValueChange={(val) => {
                        setFilterStatus(val);
                        setPage(0);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/50">
                        <SelectValue placeholder="Trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tất cả Trạng thái</SelectItem>
                        <SelectItem value="ACTIVE">ACTIVE (Sắp diễn ra)</SelectItem>
                        <SelectItem value="IN_PROGRESS">IN_PROGRESS (Đang diễn ra)</SelectItem>
                        <SelectItem value="COMPLETED">COMPLETED (Đã diễn ra)</SelectItem>
                        <SelectItem value="CANCELLED">CANCELLED (Đã hủy)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                </div>
              </div>

              {/* TABLE DISPLAY */}
              <div className="-mx-6 rounded-none border-y border-border/40 bg-card shadow-2xs overflow-x-auto">
                <Table className="min-w-295">
                  <TableHeader className="bg-muted/40">
                    <TableRow className="whitespace-nowrap">
                      <TableHead className="w-10 text-center">
                        <Checkbox
                          checked={sessions.length > 0 && selectedSessionIds.length === sessions.length}
                          onCheckedChange={(checked) => handleSelectAllSessions(!!checked)}
                        />
                      </TableHead>

                      <TableHead className="font-extrabold text-xs">Mã Buổi Học</TableHead>
                      <TableHead className="font-extrabold text-xs">Portal Link</TableHead>
                      <TableHead onClick={() => handleSort("className")} className="cursor-pointer group font-extrabold text-xs">
                        <div className="flex items-center gap-1">
                          <span>Môn Học / Lớp</span>
                          {renderSortIcon("className")}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => handleSort("teacherName")} className="cursor-pointer group font-extrabold text-xs">
                        <div className="flex items-center gap-1">
                          <span>Gia Sư / Mentor</span>
                          {renderSortIcon("teacherName")}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => handleSort("status")} className="cursor-pointer group font-extrabold text-xs">
                        <div className="flex items-center gap-1">
                          <span>Trạng Thái</span>
                          {renderSortIcon("status")}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => handleSort("scheduledAt")} className="cursor-pointer group font-extrabold text-xs">
                        <div className="flex items-center gap-1">
                          <span>Ngày Giờ Bắt Đầu</span>
                          {renderSortIcon("scheduledAt")}
                        </div>
                      </TableHead>
                      <TableHead className="font-extrabold text-xs">Thời Lượng Dự Kiến</TableHead>
                      <TableHead className="font-extrabold text-xs text-right">Thù Lao</TableHead>
                      <TableHead className="text-right font-extrabold text-xs">Thao Tác</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-7 w-7 animate-spin text-primary" />
                            <span className="text-xs font-bold">Đang tải danh sách buổi học...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : sessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Video className="h-10 w-10 text-muted-foreground/40" />
                            <span className="text-xs font-extrabold text-foreground">Không tìm thấy buổi học nào.</span>
                            <span className="text-xs">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      groupedSessionList.map((group) => (
                        <React.Fragment key={group.groupKey}>
                          {/* Group Header Row */}
                          <TableRow className="bg-primary/5 hover:bg-primary/5 border-y border-primary/20">
                            <TableCell colSpan={10} className="py-2.5 px-4">
                              <div className="flex items-center gap-2 font-black text-xs text-primary w-full">
                                <Layers className="h-3.5 w-3.5" />
                                <span className="capitalize">{group.groupDisplay}</span>
                                <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary bg-background">
                                  {group.items.length} buổi học
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Items */}
                          {group.items.map((s) => {
                            const isSelected = selectedSessionIds.includes(String(s.id));
                            const isNewlyCreated = newlyCreatedId === String(s.id);

                            return (
                              <TableRow
                                key={s.id}
                                className={`transition-colors text-xs font-medium whitespace-nowrap ${
                                  isNewlyCreated
                                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-l-emerald-500"
                                    : isSelected
                                    ? "bg-primary/5"
                                    : "hover:bg-muted/30"
                                }`}
                              >
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => handleSelectSession(String(s.id))}
                                  />
                                </TableCell>

                                {/* Mã Buổi Học */}
                                <TableCell className="font-mono font-bold text-foreground">
                                  {s.sessionCode || `BH${s.id}`}
                                </TableCell>

                                {/* Portal link */}
                                <TableCell>
                                  {s.meetingUrl ? (
                                    <a
                                      href={s.meetingUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-primary font-bold hover:underline"
                                    >
                                      <span>link</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground italic text-[11px]">link</span>
                                  )}
                                </TableCell>

                                {/* Môn Học / Lớp */}
                                <TableCell>
                                  <div className="font-extrabold text-foreground max-w-xs truncate" title={s.className || s.title}>
                                    {s.className || s.title || "Lớp học Online"}
                                  </div>
                                  <div className="text-[10px] font-mono text-muted-foreground">
                                    {s.classCode || `#${s.classId}`}
                                  </div>
                                </TableCell>

                                {/* Gia sư / Mentor */}
                                <TableCell>
                                  <div className="font-bold text-foreground flex items-center gap-1">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                    <span>{s.teacherName || `#${s.teacherId}`}</span>
                                  </div>
                                </TableCell>

                                {/* Trạng thái */}
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {renderStatusBadge(s)}
                                    <Select
                                      value={s.status}
                                      onValueChange={(val) => handleQuickUpdateStatus(String(s.id), val)}
                                    >
                                      <SelectTrigger className="h-6 w-6 p-0 rounded-lg border-none shadow-none bg-transparent hover:bg-muted">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="ACTIVE">ACTIVE (Sắp diễn ra)</SelectItem>
                                        <SelectItem value="IN_PROGRESS">IN_PROGRESS (Đang diễn ra)</SelectItem>
                                        <SelectItem value="COMPLETED">COMPLETED (Đã diễn ra)</SelectItem>
                                        <SelectItem value="CANCELLED">CANCELLED (Đã hủy)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </TableCell>

                                {/* Ngày Giờ Bắt Đầu */}
                                <TableCell className="font-mono text-foreground font-bold">
                                  {s.scheduledAt ? formatDateDisplay(s.scheduledAt) : "—"}
                                </TableCell>

                                {/* Thời Lượng Dự Kiến */}
                                <TableCell className="font-bold">
                                  {s.durationMin ? `${s.durationMin} phút` : "60 phút"}
                                </TableCell>

                                {/* Thù Lao */}
                                <TableCell className="text-right font-mono font-extrabold text-emerald-600">
                                  {formatMoney(s.remuneration)}
                                </TableCell>

                                {/* Thao Tác */}
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedSessionForDetail(s);
                                        setDetailModalOpen(true);
                                      }}
                                      className="h-8 px-2 text-xs font-bold gap-1 text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                                      title="Xem chi tiết"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleOpenEditModal(s)}
                                      className="h-8 px-2 text-xs font-bold gap-1 text-amber-600 hover:bg-amber-500/10 rounded-lg cursor-pointer"
                                      title="Chỉnh sửa"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteSession(String(s.id))}
                                      className="h-8 px-2 text-xs font-bold gap-1 text-red-600 hover:bg-red-500/10 rounded-lg cursor-pointer"
                                      title="Xóa"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border/40">
                <div className="text-xs text-muted-foreground font-semibold">
                  Hien thi <strong className="text-foreground">{sessions.length}</strong> / <strong className="text-primary font-mono">{totalElements}</strong> buoi hoc
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground font-semibold">So dong:</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(val) => {
                        setPageSize(Number(val));
                        setPage(0);
                      }}
                    >
                      <SelectTrigger className="h-8 w-20 text-xs rounded-xl border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className="h-8 px-3 rounded-xl text-xs font-bold"
                    >
                      Truoc
                    </Button>
                    <span className="text-xs font-mono text-muted-foreground">
                      {page + 1}/{Math.max(totalPages, 1)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                      className="h-8 px-3 rounded-xl text-xs font-bold"
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </section>
      )}

      {/* CREATE / EDIT SESSION FORM MODAL */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="max-w-2xl w-[94vw] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border border-border/40 shadow-2xl backdrop-blur-xs">
          <DialogHeader className="p-6 bg-linear-to-br from-primary/10 via-card to-card border-b border-border/40 shrink-0">
            <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <span>{editingSession ? "Chỉnh Sửa Buổi Học Online" : "Thêm Buổi Học Online Mới"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingSession
                ? `Cập nhật thông tin buổi học ${editingSession.sessionCode || `BH${editingSession.id}`}`
                : "Điền đầy đủ thông tin để tạo mới lịch học trực tuyến cho lớp."}
            </DialogDescription>
          </DialogHeader>

          <Form {...sessionForm}>
            <form onSubmit={sessionForm.handleSubmit(handleSaveSession)} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* Chọn Lớp Học */}
              <FormField
                control={sessionForm.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-foreground">
                      Lớp Học <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      disabled={Boolean(editingSession)}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-border/50">
                          <SelectValue placeholder="Chọn Lớp học" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classesList.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name || c.code} (ID: {c.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Chọn Giảng Viên */}
              <FormField
                control={sessionForm.control}
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-foreground">
                      Giảng Viên Phụ Trách <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-border/50">
                          <SelectValue placeholder="Chọn Giảng viên" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teachersList.map((t) => (
                          <SelectItem key={t.id || t.userId} value={String(t.userId || t.id)}>
                            {t.fullName || t.employeeCode || t.username || `Teacher #${t.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Tiêu đề buổi học */}
              <FormField
                control={sessionForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-foreground">
                      Tiêu Đề Buổi Học <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Buổi 1 - Giới thiệu về Spring Boot REST API"
                        className="h-10 text-xs font-semibold rounded-xl border-border/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Link Phòng Học */}
              <FormField
                control={sessionForm.control}
                name="meetingUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-foreground">
                      Đường Dẫn Phòng Học (Google Meet)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://meet.google.com/xyz-abc-def"
                        className="h-10 text-xs font-mono rounded-xl border-border/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Grid 2 cột: Ngày Giờ & Thời Lượng */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={sessionForm.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-foreground">
                        Thời Gian Bắt Đầu <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          className="h-10 text-xs font-mono rounded-xl border-border/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={sessionForm.control}
                  name="durationMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-foreground">
                        Thời Lượng (Phút) <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="60"
                          className="h-10 text-xs font-semibold rounded-xl border-border/50"
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Trạng Thái (khi sửa) */}
              {editingSession && (
                <FormField
                  control={sessionForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-foreground">Trạng Thái Buổi Học</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-border/50">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">ACTIVE (Sắp diễn ra)</SelectItem>
                          <SelectItem value="IN_PROGRESS">IN_PROGRESS (Đang diễn ra)</SelectItem>
                          <SelectItem value="COMPLETED">COMPLETED (Đã diễn ra)</SelectItem>
                          <SelectItem value="CANCELLED">CANCELLED (Đã hủy)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter className="pt-4 border-t border-border/30 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-1.5"
                >
                  {formSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                  <span>{editingSession ? "Cập Nhật Buổi Học" : "Tạo Buổi Học Mới"}</span>
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* SESSION DETAIL MODAL */}
      <ClassSessionDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        session={selectedSessionForDetail}
        onEditSession={(s) => {
          setDetailModalOpen(false);
          handleOpenEditModal(s);
        }}
        onDeleteSession={(id) => {
          setDetailModalOpen(false);
          handleDeleteSession(id);
        }}
        onUpdateStatus={handleQuickUpdateStatus}
      />

      {/* CONFIRM DELETE SINGLE DIALOG */}
      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
        title="Xác nhận xóa Buổi Học"
        description="Bạn có chắc chắn muốn xóa buổi học này khỏi hệ thống? Thao tác này không thể hoàn tác."
        confirmText="Xóa buổi học"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeleteAction}
      />

      {/* CONFIRM BULK DELETE DIALOG */}
      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title="Xác nhận xóa hàng loạt Buổi Học"
        description={`Bạn có chắc chắn muốn xóa ${selectedSessionIds.length} buổi học đã chọn? Thao tác này không thể hoàn tác.`}
        confirmText="Xóa tất cả đã chọn"
        cancelText="Hủy bỏ"
        onConfirm={confirmBulkDeleteAction}
      />
    </div>
  );
};
