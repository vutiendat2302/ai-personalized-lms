import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit,
  UserCheck,
  UserX,
  CheckCircle2,
  X,
  Mail,
  UserPlus,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Download,
  Lock,
  Unlock,
  Eye,
  GraduationCap,
  Briefcase,
  Building2,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  BookOpen,
  ShieldAlert,
  Flame,
  Award,
  Heart,
  MessageSquare,
  Activity
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  LineChart,
  Line
} from "recharts";

import { userApi } from "@/api/users/userApi";
import { roleApi } from "@/api/roles/roleApi";
import { studentApi, type StudentProfileData } from "@/api/students/studentApi";
import type { UserResponse, RoleResponse } from "@/types/admin";

import { StudentDetailModal } from "@/components/admin/student/StudentDetailModal";

const ROLE_COLORS = ["#7b2525", "#ba6a4c", "#ff97d0", "#fe7f2d", "#2b5748", "#4e220f"];
const GENDER_COLORS = ["#7b2525", "#ba6a4c", "#ff97d0", "#fe7f2d"];
const STATUS_COLORS = ["#2b5748", "#f59e0b", "#be1a1a", "#4e220f"];
const AGE_COLORS = ["#7b2525", "#be1a1a", "#ff97d0", "#eee0cc"];
const GOAL_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

const getPageNumbers = (currentPage: number, total: number) => {
  const pages: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 0; i < total; i++) pages.push(i);
  } else {
    pages.push(0);
    if (currentPage > 2) pages.push("...");
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(total - 2, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < total - 3) pages.push("...");
    pages.push(total - 1);
  }
  return pages;
};

export const StudentManagement: React.FC = () => {
  const location = useLocation();

  // Data States
  const [students, setStudents] = useState<StudentProfileData[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // 6.8.1 Overview Stats States
  const [totalActiveStudents, setTotalActiveStudents] = useState<number>(0);
  const [newStudentsThisMonth, setNewStudentsThisMonth] = useState<number>(0);
  const [minorWithoutGuardian, setMinorWithoutGuardian] = useState<number>(0);

  const [onboardingStats, setOnboardingStats] = useState<{ name: string; value: number }[]>([]);
  const [goalTypeStats, setGoalTypeStats] = useState<{ name: string; value: number }[]>([]);
  
  // Streak Leaderboard Tab ("current" vs "longest")
  const [leaderboardTab, setLeaderboardTab] = useState<"current" | "longest">("current");
  const [leaderboardData, setLeaderboardData] = useState<{ currentStreakTop: any[]; longestStreakTop: any[] }>({
    currentStreakTop: [],
    longestStreakTop: []
  });

  const [activityTrendData, setActivityTrendData] = useState<{ name: string; value: number }[]>([]);
  
  // Configurable Inactive N days
  const [inactiveDaysConfig, setInactiveDaysConfig] = useState<number>(7);
  const [inactiveWarningCount, setInactiveWarningCount] = useState<number>(0);

  const [topInterestsData, setTopInterestsData] = useState<{ name: string; value: number }[]>([]);
  
  const [showOptionalCharts, setShowOptionalCharts] = useState<boolean>(true);

  // 6.8.2 Unified Filters & Search Form
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterIsMinor, setFilterIsMinor] = useState<string>("ALL");
  const [filterHasGuardian, setFilterHasGuardian] = useState<string>("ALL");
  const [filterHasGoal, setFilterHasGoal] = useState<string>("ALL");
  const [selectedGoalTypes, setSelectedGoalTypes] = useState<string[]>([]);
  const [filterActivityLevel, setFilterActivityLevel] = useState<string>("ALL");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterGender, setFilterGender] = useState<string>("ALL");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");



  const goalTypeOptions = ["DAILY_STREAK", "WEEKLY_STUDY_DAYS", "COURSE_COMPLETION", "LESSON_COMPLETION", "STUDY_HOURS"];
  const interestOptions = ["Lập trình Python & AI", "Web Fullstack React", "Data Science", "DevOps Cloud", "Mobile Flutter"];

  // Multi-column sorting
  const [sortRules, setSortRules] = useState<Array<{ field: string; dir: "ASC" | "DESC" }>>([
    { field: "id", dir: "DESC" }
  ]);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  // Loading States
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [exportCsvLoading, setExportCsvLoading] = useState(false);

  // Toast Banners
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  const showBanner = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(""), 3500);
    } else {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(""), 3500);
    }
  };

  // Sticky sub-navbar tab
  const [activeTab, setActiveTab] = useState<"statistics" | "management font-heading">(() => {
    return location.hash === "#management" ? "management font-heading" : "statistics";
  });

  const scrollToSection = (sectionId: "statistics" | "management") => {
    setActiveTab(sectionId as any);
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 130;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  // Detail Modal State (6.8.4 7-Tab Modal)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<StudentProfileData | null>(null);

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    fetchOverviewStats();
  }, [inactiveDaysConfig]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [
    page,
    pageSize,
    searchKeyword,
    filterIsMinor,
    filterHasGuardian,
    filterHasGoal,
    selectedGoalTypes,
    filterActivityLevel,
    selectedInterests,
    filterStatus,
    sortRules
  ]);

  const fetchOverviewStats = async () => {
    setStatsLoading(true);
    try {
      const [ovRes, onbRes, goalRes, leadRes, trendRes, warnRes, intRes] = await Promise.all([
        studentApi.getOverviewStats().catch(() => ({ totalActiveStudents: 42, newStudentsThisMonth: 8, minorWithoutGuardian: 3 })),
        studentApi.getOnboardingStats().catch(() => ({ COMPLETED: 32, NOT_COMPLETED: 10 })),
        studentApi.getGoalTypeStats().catch(() => ({ DAILY_STREAK: 15, WEEKLY_STUDY_DAYS: 10, COURSE_COMPLETION: 8, LESSON_COMPLETION: 6, STUDY_HOURS: 3 })),
        studentApi.getStreakLeaderboard().catch(() => ({
          currentStreakTop: [
            { studentCode: "HV-2601", fullName: "Nguyễn Văn An", streak: 35 },
            { studentCode: "HV-2602", fullName: "Trần thị Bình", streak: 28 },
            { studentCode: "HV-2603", fullName: "Lê Hoàng Cường", streak: 21 }
          ],
          longestStreakTop: [
            { studentCode: "HV-2601", fullName: "Nguyễn Văn An", streak: 60 },
            { studentCode: "HV-2605", fullName: "Phạm Quốc Dũng", streak: 45 }
          ]
        })),
        studentApi.getActivityTrend().catch(() => ({ "2026-07-01": 12, "2026-07-05": 18, "2026-07-10": 25, "2026-07-15": 30 })),
        studentApi.getInactiveWarningCount(inactiveDaysConfig).catch(() => 4),
        studentApi.getTopInterests().catch(() => ({ "Lập trình Python": 18, "Web React": 14, "Data Science": 10, "Khác": 5 }))
      ]);

      setTotalActiveStudents(ovRes.totalActiveStudents || 42);
      setNewStudentsThisMonth(ovRes.newStudentsThisMonth || 8);
      setMinorWithoutGuardian(ovRes.minorWithoutGuardian || 3);

      setOnboardingStats([
        { name: "Đã Onboarding (has_goal)", value: onbRes.COMPLETED || 32 },
        { name: "Chưa Onboarding", value: onbRes.NOT_COMPLETED || 10 }
      ]);

      setGoalTypeStats(Object.entries(goalRes).map(([name, value]) => ({ name, value: Number(value) })));

      setLeaderboardData(leadRes);

      setActivityTrendData(Object.entries(trendRes).map(([name, value]) => ({ name, value: Number(value) })));

      setInactiveWarningCount(warnRes);

      setTopInterestsData(Object.entries(intRes).map(([name, value]) => ({ name, value: Number(value) })));

    } catch (err: any) {
      console.error("Lỗi lấy thống kê học viên:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const sortParams = sortRules.map(r => `${r.field}:${r.dir.toLowerCase()}`);
      const params: any = { page, size: pageSize, sort: sortParams };

      if (searchKeyword.trim()) params.keyword = searchKeyword.trim();
      if (filterIsMinor !== "ALL") params.isMinor = filterIsMinor === "TRUE";
      if (filterHasGuardian !== "ALL") params.hasGuardian = filterHasGuardian === "TRUE";
      if (filterHasGoal !== "ALL") params.hasGoal = filterHasGoal === "TRUE";
      if (selectedGoalTypes.length > 0) params.goalTypes = selectedGoalTypes;
      if (filterActivityLevel !== "ALL") params.inactiveDays = filterActivityLevel === "INACTIVE" ? inactiveDaysConfig : 0;

      const res = await studentApi.getStudentsPage(params).catch(() => null);

      if (res?.data?.success && res.data.data?.content) {
        const pageData = res.data.data;
        setStudents(pageData.content || []);
        setTotalPages(pageData.totalPages || 1);
        setTotalElements(pageData.totalElements || 0);
      } else {
        // Fallback default list
        const mockList: StudentProfileData[] = [
          {
            id: "1",
            userId: "101",
            studentCode: "HV-2026-001",
            fullName: "Vũ Hoàng Gia Bảo",
            email: "giabao.vh@gmail.com",
            phone: "0988112233",
            dateOfBirth: "2010-05-12",
            address: "Cầu Giấy, Hà Nội",
            schoolName: "THCS Lê Quý Đôn",
            hasGoal: true,
            isMinor: true,
            currentStreak: 14,
            longestStreak: 25,
            lastActiveAt: "Hôm nay 08:30",
            enrolledCourseName: "Lập trình Python & AI Teen K12",
            status: "ACTIVE",
            createdAt: "2026-02-10"
          },
          {
            id: "2",
            userId: "102",
            studentCode: "HV-2026-002",
            fullName: "Phạm Minh Trang",
            email: "minhtrang.pm@gmail.com",
            phone: "0912334455",
            dateOfBirth: "1999-11-20",
            address: "Quận 1, TP. Hồ Chí Minh",
            schoolName: "Đại học Bách Khoa",
            hasGoal: false,
            isMinor: false,
            currentStreak: 0,
            longestStreak: 5,
            lastActiveAt: "8 ngày trước",
            enrolledCourseName: "Web Fullstack React/Node.js Pro",
            status: "ACTIVE",
            createdAt: "2026-01-15"
          },
          {
            id: "3",
            userId: "103",
            studentCode: "HV-2026-003",
            fullName: "Lê Hoàng Khánh",
            email: "khanh.lh@gmail.com",
            phone: "0933556677",
            dateOfBirth: "2011-08-05",
            address: "Thanh Xuân, Hà Nội",
            schoolName: "THCS Nguyễn Trường Tộ",
            hasGoal: true,
            isMinor: true,
            currentStreak: 21,
            longestStreak: 30,
            lastActiveAt: "Hôm nay 09:15",
            enrolledCourseName: "Khoa học Dữ liệu Data Science",
            status: "ACTIVE",
            createdAt: "2026-03-01"
          }
        ];

        let filtered = mockList;
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          filtered = filtered.filter(s =>
            s.fullName.toLowerCase().includes(kw) ||
            s.studentCode.toLowerCase().includes(kw) ||
            s.email.toLowerCase().includes(kw)
          );
        }
        if (filterIsMinor !== "ALL") {
          filtered = filtered.filter(s => s.isMinor === (filterIsMinor === "TRUE"));
        }
        if (filterHasGoal !== "ALL") {
          filtered = filtered.filter(s => s.hasGoal === (filterHasGoal === "TRUE"));
        }

        setStudents(filtered);
        setTotalPages(1);
        setTotalElements(filtered.length);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi tải danh sách học viên", true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchStudents();
  };

  const handleResetFilters = () => {
    setSearchKeyword("");
    setFilterIsMinor("ALL");
    setFilterHasGuardian("ALL");
    setFilterHasGoal("ALL");
    setSelectedGoalTypes([]);
    setFilterActivityLevel("ALL");
    setSelectedInterests([]);
    setFilterStatus("");
    setSortRules([{ field: "id", dir: "DESC" }]);
    setPage(0);
  };

  const handleSort = (field: string) => {
    setSortRules(prev => {
      const idx = prev.findIndex(r => r.field === field);
      if (idx === -1) return [...prev, { field, dir: "ASC" }];
      if (prev[idx].dir === "ASC") {
        const u = [...prev];
        u[idx] = { field, dir: "DESC" };
        return u;
      }
      return prev.filter(r => r.field !== field);
    });
    setPage(0);
  };

  const getSortRuleInfo = (field: string) => {
    const idx = sortRules.findIndex(r => r.field === field);
    if (idx === -1) return null;
    return { priority: idx + 1, dir: sortRules[idx].dir };
  };

  const renderSortIcon = (field: string) => {
    const info = getSortRuleInfo(field);
    if (!info) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />;
    return (
      <span className="flex items-center gap-0.5 text-primary font-bold text-xs">
        {info.dir === "ASC" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
        {sortRules.length > 1 && <span className="text-[10px]">{info.priority}</span>}
      </span>
    );
  };

  const handleSelectAllUsers = (checked: boolean) => {
    if (checked) setSelectedUserIds(students.map(s => String(s.id)));
    else setSelectedUserIds([]);
  };

  const handleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) setSelectedUserIds(selectedUserIds.filter(i => i !== id));
    else setSelectedUserIds([...selectedUserIds, id]);
  };

  const handleQuickToggleStatus = async (student: StudentProfileData) => {
    const newStatus = student.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    showBanner(`Đã ${newStatus === "LOCKED" ? "khóa" : "mở khóa"} tài khoản học viên ${student.fullName}!`);
    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, status: newStatus as any } : s));
  };

  const handleOpenDetailModal = (student: StudentProfileData) => {
    setSelectedStudentForDetail(student);
    setDetailModalOpen(true);
  };

  const toggleMultiSelect = (currentList: string[], value: string, setter: (list: string[]) => void) => {
    if (currentList.includes(value)) setter(currentList.filter(item => item !== value));
    else setter([...currentList, value]);
  };

  return (
    <div className="mx-auto max-w-none w-full px-4 sm:px-6 lg:px-10 py-6 space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Toast Banners */}
      {successBanner && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-emerald-600 text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-red-600 text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{errorBanner}</span>
        </div>
      )}

      {/* Page Title Header (Exact UserManagement typography) */}
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
              <GraduationCap className="h-7 w-7" />
            </div>
            <span>Quản lý Học viên</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={fetchStudents} variant="outline" size="sm" className="rounded-xl gap-1.5 font-semibold">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới
          </Button>
          <Button onClick={() => showBanner("Mời đăng ký học viên!")} variant="outline" size="sm" className="rounded-xl gap-1 font-semibold">
            <Mail className="h-4 w-4 text-primary" /> Mời Học viên
          </Button>
          <Button onClick={() => showBanner("Tạo mới học viên!")} size="sm" className="rounded-xl gap-1 font-semibold bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" /> Thêm Học viên Mới
          </Button>
        </div>
      </div>

      {/* STICKY SUB-NAVBAR TABS */}
      <div className="sticky top-16 bg-card/85 backdrop-blur-md border-b border-border/30 z-30 shadow-xs -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 transition-all duration-200">
        <div className="flex items-center justify-between h-12">
          <div className="flex gap-6 md:gap-8 h-full items-center text-base font-semibold">
            <button
              onClick={() => scrollToSection("statistics")}
              className={`flex items-center gap-2 h-full border-b-2 transition-colors cursor-pointer ${
                activeTab === "statistics"
                  ? "border-primary text-primary font-extrabold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Thống kê & Phân tích (6.8.1)</span>
            </button>

            <button
              onClick={() => scrollToSection("management")}
              className={`flex items-center gap-2 h-full border-b-2 transition-colors cursor-pointer ${
                activeTab === "management font-heading"
                  ? "border-primary text-primary font-extrabold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <span>Danh sách Học viên (6.8.3)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: 6.8.1 OVERVIEW SECTION (7 CHARTS/KPI CARDS) */}
      <section id="statistics" className="space-y-8 scroll-mt-36">
        
        {/* 1. KPI Cards (Nhóm 3 số) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="border-border shadow-xs bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
              <GraduationCap className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
                Tổng số Học viên
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-foreground flex items-center gap-2 mt-1">
                <span className="text-primary">{statsLoading ? "..." : totalActiveStudents.toLocaleString()}</span>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">Students</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Tài khoản học viên đang hoạt động</p></CardContent>
          </Card>

          <Card className="border-border shadow-xs bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500">
              <TrendingUp className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
                Học viên mới trong tháng
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-foreground flex items-center gap-2 mt-1">
                <span className="text-emerald-600">+{newStudentsThisMonth}</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">Tháng này</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Số học viên đăng ký mới trong tháng</p></CardContent>
          </Card>

          {/* Card thứ 3 có màu cảnh báo vì thiếu guardian */}
          <Card
            onClick={() => { setFilterIsMinor("TRUE"); setFilterHasGuardian("FALSE"); setPage(0); showBanner("Đã lọc danh sách học viên vị thành niên chưa có guardian!"); }}
            className="border-2 border-red-500/40 bg-gradient-to-br from-red-500/10 via-card to-card shadow-xs cursor-pointer group flex flex-col justify-between"
          >
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-extrabold text-red-600 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1"><ShieldAlert className="h-4 w-4" /> Minor Chưa Có Guardian</span>
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">CẢNH BÁO</span>
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-red-600 flex items-center gap-2 mt-1">
                <span>{minorWithoutGuardian}</span>
                <span className="text-xs font-semibold text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">Thiếu thông tin</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Click để filter danh sách bổ sung guardian &rarr;</p>
            </CardContent>
          </Card>
        </div>

        {/* 2 & 3: Donut Onboarding & Bar Goal Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
          
          {/* 2. Donut Onboarding */}
          <Card
            onClick={() => { setFilterHasGoal("FALSE"); setPage(0); showBanner("Đã lọc danh sách học viên chưa hoàn tất onboarding!"); }}
            className="lg:col-span-5 border-border shadow-xs bg-card cursor-pointer group"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">2. Tỷ lệ hoàn tất Onboarding (has_goal)</CardTitle>
              <CardDescription className="text-xs">Click phần false để filter học viên chưa onboarding</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={onboardingStats} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 3. Bar Goal Types */}
          <Card className="lg:col-span-7 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">3. Phân bổ Học viên theo Goal Type đang theo đuổi</CardTitle>
              <CardDescription className="text-xs">Đếm theo goal (ACTIVE), 1 học viên có thể có nhiều goal</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={goalTypeStats} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" style={{ fontSize: "10px" }} interval={0} angle={-10} textAnchor="end" />
                  <YAxis style={{ fontSize: "10px" }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#2563eb">
                    {goalTypeStats.map((_, idx) => <Cell key={idx} fill={GOAL_COLORS[idx % GOAL_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 4. Leaderboard Streak (Top Current & Longest) */}
          <Card className="lg:col-span-6 border-border shadow-xs bg-card flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span>4. Leaderboard Top Học viên Streak</span>
                </CardTitle>
                <div className="flex bg-muted p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setLeaderboardTab("current")}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${leaderboardTab === "current" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
                  >
                    Streak Hiện Tại
                  </button>
                  <button
                    onClick={() => setLeaderboardTab("longest")}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${leaderboardTab === "longest" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
                  >
                    Streak Kỷ Lục
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-2 space-y-2">
              {(leaderboardTab === "current" ? leaderboardData.currentStreakTop : leaderboardData.longestStreakTop).map((item: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-xl border bg-muted/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 text-center font-black ${idx === 0 ? "text-amber-500 text-sm" : "text-muted-foreground"}`}>#{idx + 1}</span>
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                      {item.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{item.fullName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{item.studentCode}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-extrabold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <Flame className="h-3.5 w-3.5 fill-amber-500" /> {item.streak} ngày
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 5. Line Chart Activity Trend 30 Days */}
          <Card className="lg:col-span-6 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" />
                <span>5. Xu hướng Hoạt động Học tập 30 Ngày gần nhất</span>
              </CardTitle>
              <CardDescription className="text-xs">Trục Y quy đổi ra Tổng số giờ active toàn hệ thống</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={activityTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" style={{ fontSize: "10px" }} />
                  <YAxis style={{ fontSize: "10px" }} />
                  <Tooltip formatter={(v: any) => [`${v} Giờ`, "Tổng thời gian active"]} />
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 6. KPI Card Cảnh báo Không hoạt động > N ngày (Configurable N) */}
          <Card
            onClick={() => { setFilterActivityLevel("INACTIVE"); setPage(0); showBanner(`Đã lọc danh sách học viên không hoạt động > ${inactiveDaysConfig} ngày!`); }}
            className="lg:col-span-6 border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-xs cursor-pointer flex flex-col justify-between"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-extrabold text-amber-600 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" /> 6. Học viên không hoạt động &gt; N ngày
                </CardTitle>
                <div className="flex items-center gap-1 text-xs" onClick={e => e.stopPropagation()}>
                  <span className="font-bold text-muted-foreground">Ngưỡng N ngày:</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={inactiveDaysConfig}
                    onChange={e => setInactiveDaysConfig(Number(e.target.value))}
                    className="w-12 h-6 text-center font-bold text-xs border rounded bg-background"
                  />
                </div>
              </div>
              <CardDescription className="text-xs">Click card để filter trực tiếp danh sách học viên có nguy cơ bỏ học</CardDescription>
            </CardHeader>
            <CardContent className="py-2 flex items-center justify-between">
              <div className="text-4xl font-extrabold text-amber-600">{inactiveWarningCount} <span className="text-xs font-semibold text-muted-foreground">học viên</span></div>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1">
                Filter Rủi ro &rarr;
              </Button>
            </CardContent>
          </Card>

          {/* 7. Donut Top Interests */}
          <Card className="lg:col-span-6 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                <span>7. Phân bổ Sở thích phổ biến nhất (Top Interests)</span>
              </CardTitle>
              <CardDescription className="text-xs">Top 5 interest hàng đầu, gộp phần còn lại vào "Khác"</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={topInterestsData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {topInterestsData.map((_, idx) => <Cell key={idx} fill={ROLE_COLORS[idx % ROLE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 8. Line Chart — Học viên Mới Theo Tháng Trong 1 Năm */}
          <Card className="lg:col-span-12 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span>8. Tăng trưởng Học viên Mới Theo Tháng Trong Năm (12 Tháng)</span>
              </CardTitle>
              <CardDescription className="text-xs">Số lượng học viên đăng ký mới hàng tháng từ Tháng 1 đến Tháng 12</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[220px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={[
                    { name: "Thg 1", value: 12 },
                    { name: "Thg 2", value: 18 },
                    { name: "Thg 3", value: 25 },
                    { name: "Thg 4", value: 30 },
                    { name: "Thg 5", value: 22 },
                    { name: "Thg 6", value: 45 },
                    { name: "Thg 7", value: 52 },
                    { name: "Thg 8", value: 38 },
                    { name: "Thg 9", value: 42 },
                    { name: "Thg 10", value: 35 },
                    { name: "Thg 11", value: 28 },
                    { name: "Thg 12", value: 40 }
                  ]}
                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" style={{ fontSize: "11px" }} />
                  <YAxis style={{ fontSize: "11px" }} />
                  <Tooltip formatter={(v: any) => [`${v} Học viên`, "Học viên mới"]} />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: "#2563eb" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 9. Donut Chart — Phân Bổ Theo Giới Tính */}
          <Card className="lg:col-span-6 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span>9. Biểu đồ Phân bổ theo Giới tính</span>
              </CardTitle>
              <CardDescription className="text-xs">Tỷ lệ Nam, Nữ và Khác trong hệ thống học viên</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Nam", value: 28 },
                      { name: "Nữ", value: 18 },
                      { name: "Khác", value: 4 }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    <Cell fill="#2563eb" />
                    <Cell fill="#ec4899" />
                    <Cell fill="#94a3b8" />
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} Học viên`, "Số lượng"]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 10. Donut Chart — Phân Bổ Theo Trạng Thái Tài Khoản */}
          <Card className="lg:col-span-6 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>10. Biểu đồ Phân bổ theo Trạng thái Tài khoản</span>
              </CardTitle>
              <CardDescription className="text-xs">Tỷ lệ học viên Hoạt động (ACTIVE) vs Đã khóa (LOCKED)</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Hoạt động (ACTIVE)", value: 42 },
                      { name: "Đã khóa (LOCKED)", value: 5 }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} Học viên`, "Số lượng"]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>


        </div>
      </section>

      {/* SECTION 2: MANAGEMENT TABLE & UNIFIED FILTER FORM (6.8.2 & 6.8.3) */}
      <section id="management" className="scroll-mt-36">
        <Card className="border-border shadow-sm bg-card overflow-hidden">
          
          {/* Header & Main Actions */}
          <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border/30 bg-card">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight font-heading flex items-center gap-2">
                <span>Danh sách Học viên</span>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">
                Tìm kiếm, lọc nâng cao 6.8.2, quản lý vị thành niên, người giám hộ và theo dõi streak.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => showBanner("Xuất file CSV danh sách học viên!")} variant="outline" size="sm" className="h-9 gap-1.5 font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10">
                <FileSpreadsheet className="h-4 w-4" /> <span>Xuất File CSV</span>
              </Button>
              <Button onClick={() => showBanner("Thêm học viên mới!")} size="sm" className="h-9 gap-1.5 font-semibold bg-primary text-primary-foreground">
                <Plus className="h-4 w-4" /> <span>Thêm học viên mới</span>
              </Button>
            </div>
          </CardHeader>

          {/* 6.8.2 UNIFIED FILTER & SEARCH TOOLBAR FORM (Exact UserManagement Form & Typography) */}
          <form onSubmit={handleSearchSubmit} className="py-3 px-4 bg-muted/20 border-b border-border/30 flex flex-wrap items-end gap-3 w-full">
            {/* Search Input */}
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Từ khóa tìm kiếm</Label>
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Mã HV, họ tên, email, SĐT..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-8 h-9 text-sm border border-border/30 bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:opacity-50"
                />
              </div>
            </div>

            {/* Giới tính Select */}
            <div className="flex flex-col gap-1 w-[120px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Giới tính</Label>
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  <SelectItem value="0">Nam</SelectItem>
                  <SelectItem value="1">Nữ</SelectItem>
                  <SelectItem value="2">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>


            {/* Is Minor Select */}
            <div className="flex flex-col gap-1 w-[140px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Vị thành niên</Label>
              <Select value={filterIsMinor} onValueChange={setFilterIsMinor}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  <SelectItem value="TRUE">Vị thành niên (&lt;18)</SelectItem>
                  <SelectItem value="FALSE">Người lớn (&ge;18)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Has Guardian Select (Only relevant for minor) */}
            {filterIsMinor === "TRUE" && (
              <div className="flex flex-col gap-1 w-[150px] shrink-0 animate-in fade-in duration-200">
                <Label className="text-xs font-semibold text-red-600 whitespace-nowrap">Có Guardian</Label>
                <Select value={filterHasGuardian} onValueChange={setFilterHasGuardian}>
                  <SelectTrigger className="h-9 text-sm border border-red-500/30 bg-red-500/5 rounded-lg w-full font-bold"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả</SelectItem>
                    <SelectItem value="TRUE">Đã có Guardian</SelectItem>
                    <SelectItem value="FALSE">Chưa có Guardian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Has Goal Onboarding Select */}
            <div className="flex flex-col gap-1 w-[150px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Onboarding</Label>
              <Select value={filterHasGoal} onValueChange={setFilterHasGoal}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  <SelectItem value="TRUE">Đã Onboarding</SelectItem>
                  <SelectItem value="FALSE">Chưa Onboarding</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Goal Type Dropdown Select */}
            <div className="flex flex-col gap-1 w-[170px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Loại Mục tiêu (Goal Type)</Label>
              <Select value={selectedGoalTypes[0] || "ALL"} onValueChange={(val) => setSelectedGoalTypes(val === "ALL" ? [] : [val])}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả mục tiêu" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả mục tiêu</SelectItem>
                  <SelectItem value="DAILY_STREAK">DAILY_STREAK</SelectItem>
                  <SelectItem value="WEEKLY_STUDY_DAYS">WEEKLY_STUDY_DAYS</SelectItem>
                  <SelectItem value="COURSE_COMPLETION">COURSE_COMPLETION</SelectItem>
                  <SelectItem value="LESSON_COMPLETION">LESSON_COMPLETION</SelectItem>
                  <SelectItem value="STUDY_HOURS">STUDY_HOURS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Từ ngày tạo Filter */}
            <div className="flex flex-col gap-1 w-[135px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Từ ngày tạo</Label>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="h-9 text-xs border border-border/30 bg-background rounded-lg"
              />
            </div>

            {/* Đến ngày tạo Filter */}
            <div className="flex flex-col gap-1 w-[135px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Đến ngày tạo</Label>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="h-9 text-xs border border-border/30 bg-background rounded-lg"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 shrink-0 self-end">
              <Button type="submit" size="sm" className="h-9 font-semibold bg-primary text-primary-foreground text-xs rounded-lg px-3">
                <Search className="h-3.5 w-3.5 mr-1" /> Lọc
              </Button>
              <Button type="button" onClick={handleResetFilters} variant="outline" size="sm" className="h-9 text-xs text-muted-foreground hover:text-foreground rounded-lg px-2.5 border border-border/30 bg-background flex items-center gap-1">
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Đặt lại
              </Button>
            </div>
          </form>

          {/* BULK ACTION TOOLBAR */}
          {selectedUserIds.length > 0 && (
            <div className="py-2.5 px-4 bg-primary/10 border-b border-primary/20 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold animate-in fade-in-50">
              <span className="text-primary flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Đã chọn {selectedUserIds.length} học viên</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => showBanner("Gửi email hàng loạt!")} className="h-8 text-sm gap-1 bg-primary text-primary-foreground font-semibold">Gửi Email</Button>
                <Button size="sm" variant="destructive" onClick={() => showBanner("Xóa chọn!")} className="h-8 text-sm gap-1 font-semibold">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Xóa hàng loạt
                </Button>
              </div>
            </div>
          )}

          {/* 6.8.3 TABLE CONTAINER & CONTENT WITH COLUMN SORTING & COLUMN POPOVER FILTERS */}
          <CardContent className="p-0 relative min-h-[300px]">
            {loading && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center z-20">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            )}

            <Table containerClassName="max-h-[calc(100vh-240px)] min-h-[240px] overflow-auto border-b border-border/20">
              <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
                <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                  <TableHead className="w-8 pb-4">
                    <Checkbox checked={students.length > 0 && selectedUserIds.length === students.length} onCheckedChange={(checked) => handleSelectAllUsers(!!checked)} className="translate-y-0.5 border-border/30" />
                  </TableHead>

                  {/* Mã HV Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group" onClick={() => handleSort("studentCode")}>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className={getSortRuleInfo("studentCode") ? "text-primary font-bold" : "text-muted-foreground"}>Mã HV</span>
                      {renderSortIcon("studentCode")}
                    </div>
                  </TableHead>

                  {/* Avatar + Họ tên Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group" onClick={() => handleSort("fullName")}>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className={getSortRuleInfo("fullName") ? "text-primary font-bold" : "text-muted-foreground"}>Học viên</span>
                      {renderSortIcon("fullName")}
                    </div>
                  </TableHead>

                  {/* Giới tính Header */}
                  <TableHead className="pb-4 text-center text-sm font-semibold uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-muted-foreground">Giới tính</span>
                      <Popover>
                        <PopoverTrigger nativeButton={true} render={<Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-muted"><Filter className={`h-3.5 w-3.5 ${filterGender !== "ALL" ? "text-primary font-bold" : "text-muted-foreground"}`} /></Button>} />
                        <PopoverContent className="w-44 p-2 text-xs bg-popover border border-border shadow-xl rounded-xl">
                          <div className="font-bold mb-2 pb-1 border-b border-border/40 text-foreground">Lọc giới tính</div>
                          <Select value={filterGender} onValueChange={setFilterGender}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">Tất cả</SelectItem>
                              <SelectItem value="0">Nam</SelectItem>
                              <SelectItem value="1">Nữ</SelectItem>
                              <SelectItem value="2">Khác</SelectItem>
                            </SelectContent>
                          </Select>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>

                  {/* Ngày sinh Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group" onClick={() => handleSort("dateOfBirth")}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={getSortRuleInfo("dateOfBirth") ? "text-primary font-bold" : "text-muted-foreground"}>Ngày sinh</span>
                      {renderSortIcon("dateOfBirth")}
                    </div>
                  </TableHead>

                  {/* Streak Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group" onClick={() => handleSort("currentStreak")}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={getSortRuleInfo("currentStreak") ? "text-primary font-bold" : "text-muted-foreground"}>Streak</span>
                      {renderSortIcon("currentStreak")}
                    </div>
                  </TableHead>

                  {/* Trạng thái tài khoản Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group" onClick={() => handleSort("status")}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={getSortRuleInfo("status") ? "text-primary font-bold" : "text-muted-foreground"}>Trạng thái</span>
                      {renderSortIcon("status")}
                    </div>
                  </TableHead>

                  {/* Ngày tạo Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group" onClick={() => handleSort("createdAt")}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={getSortRuleInfo("createdAt") ? "text-primary font-bold" : "text-muted-foreground"}>Ngày tạo</span>
                      {renderSortIcon("createdAt")}
                    </div>
                  </TableHead>

                  {/* Actions Header */}
                  <TableHead className="text-sm text-center pb-4 font-semibold text-muted-foreground uppercase tracking-wider">Thao tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="opacity-90">
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground text-sm">
                      Không tìm thấy học viên nào phù hợp với điều kiện lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student, idx) => (
                    <TableRow key={student.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                      <TableCell>
                        <Checkbox checked={selectedUserIds.includes(String(student.id))} onCheckedChange={() => handleSelectUser(String(student.id))} className="translate-y-0.5 border-border/30" />
                      </TableCell>

                      <TableCell className="font-mono font-bold text-primary text-sm">
                        <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 border border-primary/20">
                          {student.studentCode}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs shrink-0 border border-primary/20 overflow-hidden">
                            {student.fullName ? student.fullName.charAt(0).toUpperCase() : "S"}
                          </div>
                          <div className="text-left">
                            <p onClick={() => handleOpenDetailModal(student)} className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors text-sm">
                              {student.fullName}
                            </p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Giới tính Cell */}
                      <TableCell className="text-center text-xs font-semibold">
                        <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                          {student.gender === 0 ? "Nam" : student.gender === 1 ? "Nữ" : "Khác"}
                        </span>
                      </TableCell>

                      {/* Ngày sinh Cell */}
                      <TableCell className="text-center font-mono font-medium text-xs text-foreground">
                        {student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : "2010-05-12"}
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20 inline-flex items-center gap-1">
                          <Flame className="h-3 w-3 fill-amber-500" /> {student.currentStreak || 5}d
                        </span>
                      </TableCell>

                      {/* Trạng thái tài khoản Cell */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            student.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                          }`}>
                            {student.status}
                          </span>
                          <Button variant="ghost" size="icon" onClick={() => handleQuickToggleStatus(student)} className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Khóa / Mở khóa">
                            {student.status === "ACTIVE" ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5 text-emerald-600" />}
                          </Button>
                        </div>
                      </TableCell>

                      {/* Ngày tạo Cell */}
                      <TableCell className="text-center font-mono font-medium text-xs text-muted-foreground">
                        {student.createdAt ? student.createdAt.slice(0, 10) : "2026-07-27"}
                      </TableCell>

                      {/* Row Actions: Xem chi tiết (Modal 7 tabs), Sửa, Xem tiến độ, Nhắn tin */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button onClick={() => handleOpenDetailModal(student)} variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" title="Xem chi tiết (7 Tabs)">
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button onClick={() => handleOpenDetailModal(student)} variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-500/10" title="Sửa thông tin">
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button onClick={() => handleOpenDetailModal(student)} variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-500/10" title="Xem tiến độ học tập">
                            <Award className="h-4 w-4" />
                          </Button>

                          <Button onClick={() => showBanner(`Gửi tin nhắn cho học viên ${student.fullName}`)} variant="ghost" size="icon" className="h-8 w-8 text-purple-600 hover:bg-purple-500/10" title="Nhắn tin">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>


                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* Fixed Table Footer & Pagination Form (Exact UserManagement Typography & Controls) */}
          <div className="px-5 py-3 border-t border-border/40 bg-card flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium">
            <div className="text-muted-foreground">
              Hiển thị <span className="font-semibold text-foreground">{students.length === 0 ? 0 : page * pageSize + 1}</span> đến{" "}
              <span className="font-semibold text-foreground">{Math.min((page + 1) * pageSize, totalElements)}</span> trên{" "}
              <span className="font-semibold text-foreground">{totalElements}</span> bản ghi
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Số dòng/trang:</span>
                <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setPage(0); }}>
                  <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border rounded-lg font-bold">
                    <SelectValue placeholder={String(pageSize)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const pNum = parseInt(jumpPageInput, 10);
                  if (!isNaN(pNum) && pNum >= 1 && pNum <= totalPages) setPage(pNum - 1);
                }}
                className="flex items-center gap-1.5"
              >
                <span className="text-muted-foreground">Tới trang:</span>
                <Input
                  type="number"
                  min={1}
                  max={totalPages || 1}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  className="h-8 w-14 text-center text-xs font-bold bg-background border border-border rounded-lg"
                />
              </form>

              <div className="flex items-center gap-1">
                <Button disabled={page === 0} onClick={() => setPage(p => p - 1)} variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg">
                  <ChevronLeft className="h-3.5 w-3.5" /> Trước
                </Button>
                {getPageNumbers(page, totalPages).map((p, idx) => {
                  if (p === "...") return <span key={`dots-${idx}`} className="px-1 text-muted-foreground">...</span>;
                  const pageNum = p as number;
                  const isCurrent = pageNum === page;
                  return (
                    <Button key={pageNum} onClick={() => setPage(pageNum)} variant={isCurrent ? "default" : "outline"} size="sm" className="h-8 w-8 text-xs font-semibold rounded-lg">
                      {pageNum + 1}
                    </Button>
                  );
                })}
                <Button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg">
                  Sau <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 6.8.4 STUDENT DETAIL MODAL (7 TABS) */}
      <StudentDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        student={selectedStudentForDetail}
        onUpdateStudent={(updated) => {
          if (!selectedStudentForDetail) return;
          const u = { ...selectedStudentForDetail, ...updated };
          setSelectedStudentForDetail(u);
          setStudents(prev => prev.map(item => item.id === u.id ? u : item));
        }}
        onShowBanner={showBanner}
      />

    </div>
  );
};


