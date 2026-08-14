import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerInput, formatDateDisplay } from "@/components/ui/DatePickerInput";
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
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit,
  CheckCircle2,
  Mail,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Lock,
  Unlock,
  Eye,
  GraduationCap,
  TrendingUp,
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
  RefreshCw,
  ShieldAlert,
  Flame,
  Award,
  Heart,
  MessageSquare,
  Activity,
  X
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
import { studentApi, type LearningActivityDetailData, type StudentProfileData } from "@/api/students/studentApi";
import { interestApi, type InterestResponse } from "@/api/interests/interestApi";

import { StudentDetailModal } from "@/components/admin/student/StudentDetailModal";
import { useAuth } from "@/hooks/useAuth";

const ROLE_COLORS = ["#7b2525", "#ba6a4c", "#ff97d0", "#fe7f2d", "#2b5748", "#4e220f"];
const GOAL_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
const ACTIVITY_LABELS: Record<string, string> = { LESSON_VIEW: "Xem bài học", LESSON_COMPLETE: "Hoàn thành bài học", QUIZ_SUBMIT: "Nộp bài kiểm tra", RESOURCE_DOWNLOAD: "Tải tài liệu", LEARNING_SESSION_END: "Kết thúc phiên học" };
const GOAL_TYPE_LABELS: Record<string, string> = { DAILY_STREAK: "Streak hằng ngày", WEEKLY_STUDY_DAYS: "Ngày học mỗi tuần", COURSE_COMPLETION: "Hoàn thành khóa", LESSON_COMPLETION: "Hoàn thành bài", STUDY_HOURS: "Giờ học" };

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
  const navigate = useNavigate();
  const { auth } = useAuth();
  const currentRoles = (auth.user?.roles || []).map((role: any) =>
    (typeof role === "object" ? role?.code || role?.name || "" : String(role)).replace("ROLE_", "").toUpperCase()
  );
  const isHrOnly = currentRoles.includes("HR") && !currentRoles.includes("ADMIN");

  // Data States
  const [students, setStudents] = useState<StudentProfileData[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Record<string, string>>({});
  
  // 6.8.1 Overview Stats States
  const [totalActiveStudents, setTotalActiveStudents] = useState<number>(0);
  const [newStudentsThisMonth, setNewStudentsThisMonth] = useState<number>(0);
  const [minorWithoutEnrollment, setMinorWithoutEnrollment] = useState<number>(0);

  const [onboardingStats, setOnboardingStats] = useState<{ name: string; value: number }[]>([]);
  const [goalTypeStats, setGoalTypeStats] = useState<{ name: string; value: number }[]>([]);
  
  // Streak Leaderboard Tab ("current" vs "longest")
  const [leaderboardTab, setLeaderboardTab] = useState<"current" | "longest">("current");
  const [leaderboardData, setLeaderboardData] = useState<{ currentStreakTop: any[]; longestStreakTop: any[] }>({
    currentStreakTop: [],
    longestStreakTop: []
  });

  const [activityTrendData, setActivityTrendData] = useState<{ name: string; value: number }[]>([]);
  const [activityTrendError, setActivityTrendError] = useState("");
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [activityDate, setActivityDate] = useState("");
  const [activityLogs, setActivityLogs] = useState<LearningActivityDetailData[]>([]);
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);
  const [activityLogsError, setActivityLogsError] = useState("");
  const [activityLogPage, setActivityLogPage] = useState(0);
  const activityLogPageSize = 10;
  
  // Configurable Inactive N days
  const [inactiveDaysConfig, setInactiveDaysConfig] = useState<number>(7);
  const [inactiveWarningCount, setInactiveWarningCount] = useState<number>(0);

  const [topInterestsData, setTopInterestsData] = useState<{ name: string; value: number }[]>([]);
  const [monthlyStudentData, setMonthlyStudentData] = useState<{ name: string; value: number }[]>([]);
  const [genderDistribution, setGenderDistribution] = useState<{ name: string; value: number }[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<{ name: string; value: number }[]>([]);
  const [interestOptions, setInterestOptions] = useState<InterestResponse[]>([]);
  

  // 6.8.2 Unified Filters & Search Form
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterIsMinor, setFilterIsMinor] = useState<string>("ALL");
  const [filterHasGuardian, setFilterHasGuardian] = useState<string>("ALL");
  const [filterHasEnrollment, setFilterHasEnrollment] = useState<string>("ALL");
  const [filterHasGoal, setFilterHasGoal] = useState<string>("ALL");
  const [selectedGoalTypes, setSelectedGoalTypes] = useState<string[]>([]);
  const [filterActivityLevel, setFilterActivityLevel] = useState<string>("ALL");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterGender, setFilterGender] = useState<string>("ALL");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");



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
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast Banners
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");
  const [listError, setListError] = useState("");
  const [statsError, setStatsError] = useState("");

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
  const [detailInitialTab, setDetailInitialTab] = useState<"general" | "goals">("general");
  const [messageStudent, setMessageStudent] = useState<StudentProfileData | null>(null);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [messageType, setMessageType] = useState<"ADMIN_ANNOUNCEMENT" | "ADMIN_WARNING">("ADMIN_ANNOUNCEMENT");
  const [messageSending, setMessageSending] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<StudentProfileData | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState("");
  const [bulkEmailContent, setBulkEmailContent] = useState("");
  const [bulkEmailSending, setBulkEmailSending] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newStudent, setNewStudent] = useState({ email: "", fullName: "", dateOfBirth: "" });
  const [newStudentErrors, setNewStudentErrors] = useState<Partial<Record<"email" | "fullName" | "dateOfBirth", string>>>({});
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmailError, setInviteEmailError] = useState("");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    const returningStudentId = (location.state as { studentId?: string } | null)?.studentId;
    if (!returningStudentId) return;
    studentApi.getStudentById(String(returningStudentId)).then(response => {
      if (response.data.data) handleOpenDetailModal(response.data.data);
      navigate(location.pathname, { replace: true, state: null });
    }).catch((err: any) => showBanner(err.message || "Không thể khôi phục chi tiết học viên.", true));
  }, [location.state]);

  useEffect(() => {
    fetchOverviewStats();
  }, [inactiveDaysConfig]);

  useEffect(() => {
    interestApi.getInterests()
      .then(response => setInterestOptions(response.data.data || []))
      .catch(() => setInterestOptions([]));
  }, []);

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
    filterHasEnrollment,
    filterHasGoal,
    selectedGoalTypes,
    filterActivityLevel,
    selectedInterests,
    filterStatus,
    filterGender,
    filterStartDate,
    filterEndDate,
    sortRules
  ]);

  const fetchOverviewStats = async () => {
    setStatsLoading(true);
    setStatsError("");
    try {
      const [overview, onboarding, goals, leaderboard, trend, warning, interests] = await Promise.allSettled([
        studentApi.getOverviewStats(),
        studentApi.getOnboardingStats(),
        studentApi.getGoalTypeStats(),
        studentApi.getStreakLeaderboard(),
        isHrOnly ? Promise.resolve({}) : studentApi.getActivityTrend(),
        studentApi.getInactiveWarningCount(inactiveDaysConfig),
        studentApi.getTopInterests()
      ]);

      const failures = [overview, onboarding, goals, leaderboard, trend, warning, interests].filter(result => result.status === "rejected").length;
      if (overview.status === "fulfilled") {
      const ovRes = overview.value;
      setTotalActiveStudents(Number(ovRes.totalActiveStudents) || 0);
      setNewStudentsThisMonth(ovRes.newStudentsThisMonth || 0);
      setMinorWithoutEnrollment(ovRes.minorWithoutEnrollment || 0);
      setMonthlyStudentData(Object.entries(ovRes.monthlyNewStudents || {}).map(([month, value]) => ({ name: `Thg ${month}`, value: Number(value) })));
      const genderLabels: Record<string, string> = { "0": "Nam", "1": "Nữ", "2": "Khác", UNKNOWN: "Chưa cập nhật" };
      setGenderDistribution(Object.entries(ovRes.genderDistribution || {}).map(([name, value]) => ({ name: genderLabels[name] || name, value: Number(value) })));
      setStatusDistribution(Object.entries(ovRes.statusDistribution || {}).map(([name, value]) => ({ name, value: Number(value) })));
      } else { setTotalActiveStudents(0); setNewStudentsThisMonth(0); setMinorWithoutEnrollment(0); setMonthlyStudentData([]); setGenderDistribution([]); setStatusDistribution([]); }

      if (onboarding.status === "fulfilled") {
      const onbRes = onboarding.value;
      setOnboardingStats([
        { name: "Đã hoàn tất", value: Number(onbRes.COMPLETED) || 0 },
        { name: "Chưa hoàn tất", value: Number(onbRes.NOT_COMPLETED) || 0 }
      ]);
      } else setOnboardingStats([]);

      setGoalTypeStats(goals.status === "fulfilled" ? Object.entries(goals.value).map(([name, value]) => ({ name, value: Number(value) })) : []);
      setLeaderboardData(leaderboard.status === "fulfilled" ? leaderboard.value : { currentStreakTop: [], longestStreakTop: [] });
      if (isHrOnly) {
        setActivityTrendData([]);
        setActivityTrendError("");
      } else if (trend.status === "fulfilled") {
        setActivityTrendData(Object.entries(trend.value || {}).map(([name, value]) => ({ name, value: Number(value) || 0 })));
        setActivityTrendError("");
      } else {
        setActivityTrendData([]);
        setActivityTrendError("Không tải được dữ liệu xu hướng hoạt động.");
      }
      setInactiveWarningCount(warning.status === "fulfilled" ? Number(warning.value) : 0);
      setTopInterestsData(interests.status === "fulfilled" ? Object.entries(interests.value).map(([name, value]) => ({ name, value: Number(value) })) : []);
      if (failures) setStatsError(`Không thể tải ${failures} nhóm dữ liệu thống kê. Các biểu đồ còn lại vẫn được cập nhật.`);

    } catch (err: any) {
      setTotalActiveStudents(0); setNewStudentsThisMonth(0); setMinorWithoutEnrollment(0); setInactiveWarningCount(0);
      setOnboardingStats([]); setGoalTypeStats([]); setLeaderboardData({ currentStreakTop: [], longestStreakTop: [] });
      setActivityTrendData([]); setActivityTrendError("Không tải được dữ liệu xu hướng hoạt động."); setTopInterestsData([]); setMonthlyStudentData([]); setGenderDistribution([]); setStatusDistribution([]);
      const message = err.message || "Không thể tải dữ liệu thống kê học viên.";
      setStatsError(message); showBanner(message, true);
    } finally {
      setStatsLoading(false);
    }
  };

  const openActivityDetails = async (date: string) => {
    if (isHrOnly) return;
    setActivityDate(date); setActivityLogPage(0); setActivityDialogOpen(true); setActivityLogs([]); setActivityLogsError(""); setActivityLogsLoading(true);
    try { setActivityLogs(await studentApi.getActivityLogsByDate(date)); }
    catch (err: any) { setActivityLogsError(err.message || "Không thể tải nhật ký hoạt động học tập."); }
    finally { setActivityLogsLoading(false); }
  };

  const openLeaderboardStudent = async (userId: string) => {
    try {
      const response = await studentApi.getStudentById(userId);
      if (response.data.data) handleOpenDetailModal(response.data.data);
    } catch (err: any) { showBanner(err.message || "Không thể tải chi tiết học viên.", true); }
  };

  const fetchStudents = async () => {
    setLoading(true);
    setListError("");
    try {
      const sortParams = sortRules.map(r => `${r.field}:${r.dir.toLowerCase()}`);
      const params: any = { page, size: pageSize, sort: sortParams };

      if (searchKeyword.trim()) params.keyword = searchKeyword.trim();
      if (filterIsMinor !== "ALL") params.isMinor = filterIsMinor === "TRUE";
      if (filterHasGuardian !== "ALL") params.hasGuardian = filterHasGuardian === "TRUE";
      if (filterHasEnrollment !== "ALL") params.hasEnrollment = filterHasEnrollment === "TRUE";
      if (filterHasGoal !== "ALL") params.hasGoal = filterHasGoal === "TRUE";
      if (selectedGoalTypes.length > 0) params.goalTypes = selectedGoalTypes;
      if (filterActivityLevel !== "ALL") params.inactiveDays = filterActivityLevel === "INACTIVE" ? inactiveDaysConfig : 0;
      if (selectedInterests.length > 0) params.interestIds = selectedInterests;
      if (filterStatus) params.userStatus = filterStatus;
      if (filterGender !== "ALL") params.gender = Number(filterGender);
      if (filterStartDate) params.createdFrom = `${filterStartDate}T00:00:00`;
      if (filterEndDate) params.createdTo = `${filterEndDate}T23:59:59`;

      const res = await studentApi.getStudentsPage(params);

      if (res?.data?.success && res.data.data?.content) {
        const pageData = res.data.data;
        setStudents(pageData.content || []);
        setTotalPages(pageData.totalPages || 1);
        setTotalElements(pageData.totalElements || 0);
      } else {
        setStudents([]);
        setTotalPages(1);
        setTotalElements(0);
        setListError(res?.data?.message || "Không thể tải dữ liệu học viên.");
      }
    } catch (err: any) {
      setStudents([]); setTotalPages(1); setTotalElements(0);
      const message = err.message || "Không thể tải dữ liệu học viên.";
      setListError(message); showBanner(message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
  };

  const handleResetFilters = () => {
    setSearchKeyword("");
    setFilterIsMinor("ALL");
    setFilterHasGuardian("ALL");
    setFilterHasEnrollment("ALL");
    setFilterHasGoal("ALL");
    setSelectedGoalTypes([]);
    setFilterActivityLevel("ALL");
    setSelectedInterests([]);
    setFilterStatus("");
    setFilterGender("ALL");
    setFilterStartDate("");
    setFilterEndDate("");
    setSortRules([{ field: "id", dir: "DESC" }]);
    setPage(0);
  };

  const handleSort = (field: string) => {
    setSortRules(prevRules => {
      const existingIndex = prevRules.findIndex(rule => rule.field === field);
      if (existingIndex === -1) {
        return [...prevRules.filter(rule => rule.field !== "id"), { field, dir: "ASC" }];
      }
      if (prevRules[existingIndex].dir === "ASC") {
        const updated = [...prevRules]; updated[existingIndex] = { field, dir: "DESC" }; return updated;
      }
      const updated = prevRules.filter(rule => rule.field !== field);
      return updated.length ? updated : [{ field: "id", dir: "DESC" }];
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
    if (checked) { setSelectedUserIds(students.map(student => student.id)); setSelectedEmails(Object.fromEntries(students.map(student => [student.id, student.email]))); }
    else { setSelectedUserIds([]); setSelectedEmails({}); }
  };

  const handleSelectUser = (student: StudentProfileData) => {
    if (selectedUserIds.includes(student.id)) { setSelectedUserIds(selectedUserIds.filter(id => id !== student.id)); setSelectedEmails(previous => { const next = { ...previous }; delete next[student.id]; return next; }); }
    else { setSelectedUserIds([...selectedUserIds, student.id]); setSelectedEmails(previous => ({ ...previous, [student.id]: student.email })); }
  };

  const clearSelection = () => { setSelectedUserIds([]); setSelectedEmails({}); };

  const handleQuickToggleStatus = async (student: StudentProfileData) => {
    const newStatus = student.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    setStatusUpdatingId(student.userId);
    try {
      const response = await userApi.updateUser(student.userId, {
        fullName: student.fullName,
        phone: student.phone || "",
        gender: student.gender,
        dateOfBirth: student.dateOfBirth?.slice(0, 10),
        status: newStatus,
      });
      if (response.data.success) {
        showBanner(`Đã ${newStatus === "LOCKED" ? "khóa" : "mở khóa"} tài khoản học viên ${student.fullName}!`);
        setStudents(previous => previous.map(item => item.id === student.id ? { ...item, status: newStatus } : item));
        fetchOverviewStats();
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể cập nhật trạng thái học viên", true);
    } finally { setStatusUpdatingId(null); }
  };

  const handleOpenDetailModal = (student: StudentProfileData, initialTab: "general" | "goals" = "general") => {
    setDetailInitialTab(initialTab);
    setSelectedStudentForDetail(student);
    setDetailModalOpen(true);
  };

  const softDeleteStudent = async (student: StudentProfileData) => {
    setDeleting(true);
    try { await userApi.deleteUser(student.userId); showBanner("Đã chuyển học viên vào thùng rác."); await fetchStudents(); await fetchOverviewStats(); }
    catch (err: any) { showBanner(err.message || "Không thể xóa mềm học viên.", true); }
    finally { setDeleting(false); }
  };

  const bulkSoftDeleteStudents = async () => {
    if (!selectedUserIds.length) return;
    setDeleting(true);
    try { await userApi.bulkDelete({ userIds: selectedUserIds }); clearSelection(); showBanner("Đã xóa mềm các học viên được chọn."); await fetchStudents(); await fetchOverviewStats(); }
    catch (err: any) { showBanner(err.message || "Không thể xóa hàng loạt.", true); }
    finally { setDeleting(false); }
  };

  const sendStudentMessage = async (event: React.FormEvent) => {
    event.preventDefault(); if (!messageStudent) return; setMessageSending(true);
    try { await studentApi.sendNotification(messageStudent.userId, { type: messageType, title: messageTitle.trim(), content: messageContent.trim() }); showBanner(`Đã gửi tin nhắn tới ${messageStudent.fullName}.`); setMessageStudent(null); setMessageTitle(""); setMessageContent(""); }
    catch (err: any) { showBanner(err.message || "Không thể gửi tin nhắn cho học viên.", true); }
    finally { setMessageSending(false); }
  };

  const sendBulkStudentEmail = async (event: React.FormEvent) => {
    event.preventDefault(); const emails = selectedUserIds.map(id => selectedEmails[id]).filter(Boolean);
    if (!emails.length) { showBanner("Không tìm thấy email của các học viên đã chọn.", true); return; }
    setBulkEmailSending(true);
    try { await userApi.sendBulkEmail({ emails, subject: bulkEmailSubject.trim(), content: bulkEmailContent.trim() }); showBanner(`Đã gửi email tới ${emails.length} học viên.`); setBulkEmailOpen(false); setBulkEmailSubject(""); setBulkEmailContent(""); clearSelection(); }
    catch (err: any) { showBanner(err.message || "Không thể gửi email hàng loạt.", true); }
    finally { setBulkEmailSending(false); }
  };

  const exportStudentsCsv = async () => {
    setExportingCsv(true);
    try {
      const baseParams: any = { size: 200, sort: sortRules.map(rule => `${rule.field}:${rule.dir.toLowerCase()}`) };
      if (searchKeyword.trim()) baseParams.keyword = searchKeyword.trim();
      if (filterIsMinor !== "ALL") baseParams.isMinor = filterIsMinor === "TRUE";
      if (filterHasGuardian !== "ALL") baseParams.hasGuardian = filterHasGuardian === "TRUE";
      if (filterHasEnrollment !== "ALL") baseParams.hasEnrollment = filterHasEnrollment === "TRUE";
      if (filterHasGoal !== "ALL") baseParams.hasGoal = filterHasGoal === "TRUE";
      if (selectedGoalTypes.length) baseParams.goalTypes = selectedGoalTypes;
      if (filterActivityLevel === "INACTIVE") baseParams.inactiveDays = inactiveDaysConfig;
      if (selectedInterests.length) baseParams.interestIds = selectedInterests;
      if (filterStatus) baseParams.userStatus = filterStatus;
      if (filterGender !== "ALL") baseParams.gender = Number(filterGender);
      if (filterStartDate) baseParams.createdFrom = `${filterStartDate}T00:00:00`;
      if (filterEndDate) baseParams.createdTo = `${filterEndDate}T23:59:59`;
      const first = await studentApi.getStudentsPage({ ...baseParams, page: 0 });
      const firstPage = first.data.data;
      if (!firstPage) throw new Error("Không tải được dữ liệu để xuất CSV.");
      const pages = await Promise.all(Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) => studentApi.getStudentsPage({ ...baseParams, page: index + 1 })));
      const rows = [...firstPage.content, ...pages.flatMap(response => response.data.data?.content || [])];
      const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
      const csv = "\uFEFF" + [["Mã học viên", "Họ tên", "Email", "Số điện thoại", "Ngày sinh", "Loại mục tiêu", "Trạng thái", "Ngày tạo"].map(escape).join(","), ...rows.map(student => [student.studentCode, student.fullName, student.email, student.phone, student.dateOfBirth ? formatDateDisplay(student.dateOfBirth) : "", (student.goalTypes || []).map(type => GOAL_TYPE_LABELS[type] || type).join("; "), student.status, student.createdAt ? formatDateDisplay(student.createdAt) : ""].map(escape).join(","))].join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `danh-sach-hoc-vien-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
      showBanner(`Đã xuất ${rows.length} học viên theo bộ lọc hiện tại.`);
    } catch (err: any) { showBanner(err.message || "Không thể xuất CSV học viên.", true); }
    finally { setExportingCsv(false); }
  };

  const refreshAll = async () => { await Promise.all([fetchStudents(), fetchOverviewStats()]); };

  const createStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = newStudent.email.trim().toLowerCase();
    const fullName = newStudent.fullName.trim().replace(/\s+/g, " ");
    const errors: typeof newStudentErrors = {};
    if (!email) errors.email = "Email là bắt buộc.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Email không đúng định dạng.";
    if (!fullName) errors.fullName = "Họ và tên là bắt buộc.";
    else if (fullName.length < 2 || !/\p{L}/u.test(fullName)) errors.fullName = "Họ và tên phải có ít nhất 2 ký tự và chứa chữ cái.";
    if (!newStudent.dateOfBirth) errors.dateOfBirth = "Ngày sinh là bắt buộc.";
    else {
      const birthDate = new Date(`${newStudent.dateOfBirth.slice(0, 10)}T00:00:00`);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (Number.isNaN(birthDate.getTime())) errors.dateOfBirth = "Ngày sinh không hợp lệ.";
      else if (birthDate > today) errors.dateOfBirth = "Ngày sinh không được ở tương lai.";
      else if (birthDate.getFullYear() < 1900) errors.dateOfBirth = "Ngày sinh phải từ năm 1900 trở đi.";
    }
    setNewStudentErrors(errors);
    if (Object.keys(errors).length) return;
    setActionLoading(true);
    try {
      const userResponse = await userApi.createUser({ username: email, email, fullName, dateOfBirth: newStudent.dateOfBirth.slice(0, 10), gender: 2 });
      const userId = userResponse.data.data?.id;
      if (!userId) throw new Error("Backend không trả về ID người dùng vừa tạo.");
      await studentApi.createProfile({ userId: String(userId) });
      setStudentFormOpen(false); setNewStudent({ email: "", fullName: "", dateOfBirth: "" }); setNewStudentErrors({});
      showBanner("Đã tạo học viên mới."); await refreshAll();
    } catch (err: any) { showBanner(err.message || "Không thể tạo học viên.", true); }
    finally { setActionLoading(false); }
  };

  const inviteStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) { setInviteEmailError("Email là bắt buộc."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setInviteEmailError("Email không đúng định dạng."); return; }
    setInviteEmailError(""); setActionLoading(true);
    try { await userApi.inviteUser({ email }); setInviteOpen(false); setInviteEmail(""); showBanner("Đã gửi lời mời học viên."); }
    catch (err: any) { showBanner(err.message || "Không thể gửi lời mời.", true); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="mx-auto max-w-none w-full px-4 sm:px-6 lg:px-10 py-6 space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Toast Banners */}
      {successBanner && (
        <div className="fixed top-20 right-6 z-100 flex max-w-[min(420px,calc(100vw-2rem))] items-center gap-3 rounded-2xl bg-emerald-600 px-5 py-3.5 text-white shadow-2xl ring-1 ring-white/20 animate-in slide-in-from-top-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="fixed top-20 right-6 z-100 flex max-w-[min(420px,calc(100vw-2rem))] items-center gap-3 rounded-2xl bg-red-600 px-5 py-3.5 text-white shadow-2xl ring-1 ring-white/20 animate-in slide-in-from-top-5 duration-300">
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
          <Button onClick={refreshAll} disabled={loading || statsLoading} variant="outline" size="sm" className="rounded-xl gap-1.5 font-semibold">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới
          </Button>
          <Button onClick={() => setInviteOpen(true)} variant="outline" size="sm" className="rounded-xl gap-1 font-semibold">
            <Mail className="h-4 w-4 text-primary" /> Mời Học viên
          </Button>
          <Button onClick={() => setStudentFormOpen(true)} size="sm" className="rounded-xl gap-1 font-semibold bg-primary text-primary-foreground">
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
        {statsError && <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-600"><AlertCircle className="h-4 w-4" />{statsError}</div>}
        
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
            onClick={() => { setFilterIsMinor("TRUE"); setFilterHasEnrollment("FALSE"); setPage(0); scrollToSection("management"); showBanner("Đã lọc học viên vị thành niên chưa có khóa học."); }}
            className="border-2 border-red-500/40 bg-linear-to-br from-red-500/10 via-card to-card shadow-xs cursor-pointer group flex flex-col justify-between"
          >
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-extrabold text-red-600 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1"><ShieldAlert className="h-4 w-4" /> Minor Chưa Có Khóa Học</span>
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">CẢNH BÁO</span>
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-red-600 flex items-center gap-2 mt-1">
                <span>{minorWithoutEnrollment}</span>
                <span className="text-xs font-semibold text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">Thiếu thông tin</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Click để xem học viên vị thành niên chưa ghi danh khóa học &rarr;</p>
            </CardContent>
          </Card>
        </div>

        {/* 2 & 3: Donut Onboarding & Bar Goal Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
          
          {/* 2. Donut Onboarding */}
          <Card className="lg:col-span-5 border-border shadow-xs bg-card group">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">2. Tỷ lệ hoàn tất Onboarding (has_goal)</CardTitle>
              <CardDescription className="text-xs">Click phần false để filter học viên chưa onboarding</CardDescription>
            </CardHeader>
            <CardContent className="min-h-50 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={onboardingStats} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value"
                    className="cursor-pointer"
                    onClick={(entry: { name?: string }) => { setFilterHasGoal(entry.name === "Đã hoàn tất" ? "TRUE" : "FALSE"); setPage(0); scrollToSection("management"); }}>
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
            <CardContent className="min-h-50 flex items-center justify-center">
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
                <button key={idx} type="button" onClick={() => openLeaderboardStudent(String(item.userId))} title="Xem chi tiết học viên"
                  className="w-full p-2.5 rounded-xl border bg-muted/10 hover:bg-primary/5 hover:border-primary/30 flex items-center justify-between text-xs text-left transition-colors">
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
                </button>
              ))}
            </CardContent>
          </Card>

          {/* 5. Line Chart Activity Trend 30 Days */}
          {!isHrOnly && <Card className="lg:col-span-6 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" />
                <span>5. Xu hướng Hoạt động Học tập 30 Ngày gần nhất</span>
              </CardTitle>
              <CardDescription className="text-xs">Số sự kiện theo ngày · Click vào điểm dữ liệu để xem nhật ký chi tiết</CardDescription>
            </CardHeader>
            <CardContent className="min-h-50 flex items-center justify-center">
              {activityTrendError ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                  <p className="text-xs font-medium text-destructive">{activityTrendError}</p>
                  <Button size="sm" variant="outline" onClick={() => void fetchOverviewStats()}>Tải lại</Button>
                </div>
              ) : activityTrendData.length === 0 ? (
                <p className="text-xs text-muted-foreground">Chưa có dữ liệu hoạt động trong 30 ngày gần nhất.</p>
              ) : <ResponsiveContainer width="100%" height={170}>
                <LineChart data={activityTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(state: any) => {
                    const selectedDate = state?.activePayload?.[0]?.payload?.name ?? state?.activeLabel;
                    if (selectedDate) void openActivityDetails(String(selectedDate));
                  }} className="cursor-pointer">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" style={{ fontSize: "10px" }} tickFormatter={(value) => formatDateDisplay(String(value)).slice(0, 5)} minTickGap={18} />
                  <YAxis style={{ fontSize: "10px" }} allowDecimals={false} domain={[0, "auto"]} />
                  <Tooltip formatter={(v: any) => [`${v} sự kiện`, "Hoạt động học tập"]} />
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, cursor: "pointer" }} activeDot={{ r: 7, cursor: "pointer" }} />
                </LineChart>
              </ResponsiveContainer>}
            </CardContent>
          </Card>}

          {/* 6. KPI Card Cảnh báo Không hoạt động > N ngày (Configurable N) */}
          <Card
            onClick={() => { setFilterActivityLevel("INACTIVE"); setPage(0); scrollToSection("management"); showBanner(`Đã lọc học viên không hoạt động từ thời điểm hiện tại lùi ${inactiveDaysConfig} ngày.`); }}
            className="lg:col-span-6 border-2 border-amber-500/40 bg-linear-to-br from-amber-500/10 via-card to-card shadow-xs cursor-pointer flex flex-col justify-between"
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

          {/* 7. Horizontal bars work better than a donut when there are many long labels */}
          <Card className="lg:col-span-6 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                <span>7. Phân bổ Sở thích học viên</span>
              </CardTitle>
              <CardDescription className="text-xs">Toàn bộ sở thích trong hệ thống, kể cả nhóm chưa có lượt chọn</CardDescription>
            </CardHeader>
            <CardContent className="min-h-50">
              {topInterestsData.length === 0 ? <p className="py-16 text-center text-xs text-muted-foreground">Chưa có dữ liệu phân bổ sở thích.</p> : <div className="max-h-90 overflow-y-auto pr-2">
              <ResponsiveContainer width="100%" height={Math.max(210, topInterestsData.length * 34)}>
                <BarChart data={topInterestsData} layout="vertical" margin={{ top: 4, right: 32, left: 18, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} style={{ fontSize: "10px" }} />
                  <YAxis type="category" dataKey="name" width={110} style={{ fontSize: "10px" }} tick={{ fill: "currentColor" }} />
                  <Tooltip formatter={(value: any) => [`${value} lượt chọn`, "Học viên"]} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} minPointSize={2} label={{ position: "right", fontSize: 10 }}>
                    {topInterestsData.map((_, idx) => <Cell key={idx} fill={ROLE_COLORS[idx % ROLE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer></div>}
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
            <CardContent className="min-h-55 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={monthlyStudentData}
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
            <CardContent className="min-h-50 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={genderDistribution}
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
            <CardContent className="min-h-50 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
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
              <Button onClick={exportStudentsCsv} disabled={exportingCsv} variant="outline" size="sm" className="h-9 gap-1.5 font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10">
                {exportingCsv ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} <span>{exportingCsv ? "Đang xuất..." : "Xuất File CSV"}</span>
              </Button>
              <Button onClick={() => setStudentFormOpen(true)} size="sm" className="h-9 gap-1.5 font-semibold bg-primary text-primary-foreground">
                <Plus className="h-4 w-4" /> <span>Thêm học viên mới</span>
              </Button>
            </div>
          </CardHeader>

          {(filterIsMinor !== "ALL" || filterHasGuardian !== "ALL" || filterHasEnrollment !== "ALL" || filterActivityLevel !== "ALL") && (
            <div className="px-4 pt-3 flex flex-wrap items-center gap-2 border-b border-border/20 bg-primary/5">
              <span className="text-xs font-semibold text-muted-foreground">Bộ lọc nhanh đang áp dụng:</span>
              {filterIsMinor === "TRUE" && filterHasEnrollment === "FALSE" && <button type="button" onClick={() => { setFilterIsMinor("ALL"); setFilterHasEnrollment("ALL"); setPage(0); }} className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600">Vị thành niên chưa có khóa học <X className="h-3 w-3" /></button>}
              {filterActivityLevel === "INACTIVE" && <button type="button" onClick={() => { setFilterActivityLevel("ALL"); setPage(0); }} className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700">Không hoạt động trong {inactiveDaysConfig} ngày gần nhất <X className="h-3 w-3" /></button>}
            </div>
          )}

          {/* 6.8.2 UNIFIED FILTER & SEARCH TOOLBAR FORM (Exact UserManagement Form & Typography) */}
          <form onSubmit={handleSearchSubmit} className="py-3 px-4 bg-muted/20 border-b border-border/30 flex flex-wrap items-end gap-3 w-full">
            {/* Search Input */}
            <div className="flex flex-col gap-1 flex-1 min-w-50">
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
            <div className="flex flex-col gap-1 w-30 shrink-0">
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
            <div className="flex flex-col gap-1 w-33.75 shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Trạng thái tài khoản</Label>
              <Select value={filterStatus || "ALL"} onValueChange={value => setFilterStatus(value === "ALL" ? "" : value)}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent><SelectItem value="ALL">Tất cả</SelectItem><SelectItem value="ACTIVE">Đang hoạt động</SelectItem><SelectItem value="LOCKED">Đã khóa</SelectItem><SelectItem value="VERIFICATION">Chờ xác thực</SelectItem></SelectContent>
              </Select>
            </div>

            {/* Is Minor Select */}
            <div className="flex flex-col gap-1 w-35 shrink-0">
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
              <div className="flex flex-col gap-1 w-37.5 shrink-0 animate-in fade-in duration-200">
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
            <div className="flex flex-col gap-1 w-37.5 shrink-0">
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
            <div className="flex flex-col gap-1 w-42.5 shrink-0">
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

            <div className="flex flex-col gap-1 w-45 shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Lĩnh vực quan tâm</Label>
              <Select value={selectedInterests[0] || "ALL"} onValueChange={value => setSelectedInterests(value === "ALL" ? [] : [value])}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả sở thích" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả sở thích</SelectItem>
                  {interestOptions.map(interest => <SelectItem key={interest.id} value={interest.id}>{interest.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Từ ngày tạo Filter */}
            <div className="flex flex-col gap-1 w-33.75 shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Từ ngày tạo</Label>
              <DatePickerInput value={filterStartDate} onChange={setFilterStartDate} placeholder="dd/mm/yyyy" className="h-9 text-xs" />
            </div>

            {/* Đến ngày tạo Filter */}
            <div className="flex flex-col gap-1 w-33.75 shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Đến ngày tạo</Label>
              <DatePickerInput value={filterEndDate} onChange={setFilterEndDate} placeholder="dd/mm/yyyy" className="h-9 text-xs" />
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
              <span className="text-primary flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Đã chọn {selectedUserIds.length} học viên <Button type="button" variant="ghost" size="sm" onClick={clearSelection} className="ml-1 h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" />Bỏ chọn tất cả</Button></span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => { setBulkEmailSubject(""); setBulkEmailContent(""); setBulkEmailOpen(true); }} className="h-8 text-sm gap-1 bg-primary text-primary-foreground font-semibold"><Mail className="h-3.5 w-3.5" />Gửi Email</Button>
                <Button size="sm" variant="destructive" disabled={deleting} onClick={() => setBulkDeleteConfirmOpen(true)} className="h-8 text-sm gap-1 font-semibold">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Xóa hàng loạt
                </Button>
              </div>
            </div>
          )}

          {/* 6.8.3 TABLE CONTAINER & CONTENT WITH COLUMN SORTING & COLUMN POPOVER FILTERS */}
          <CardContent className="p-0 relative min-h-75">
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

                  {/* Goal types are multi-valued, so this column is intentionally not sortable. */}
                  <TableHead className="pb-4 text-sm font-semibold uppercase tracking-wider text-center">
                    <span className="text-muted-foreground">Loại mục tiêu</span>
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
                {listError ? (
                  <TableRow><TableCell colSpan={9} className="py-14 text-center"><div className="flex flex-col items-center gap-2 text-red-600"><AlertCircle className="h-7 w-7" /><span className="text-sm font-bold">Không tải được dữ liệu học viên</span><span className="text-xs text-muted-foreground">{listError}</span><Button type="button" variant="outline" size="sm" onClick={() => fetchStudents()} className="mt-2"><RefreshCw className="mr-1 h-3.5 w-3.5" />Thử lại</Button></div></TableCell></TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground text-sm">
                      Không tìm thấy học viên nào phù hợp với điều kiện lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                      <TableCell>
                        <Checkbox checked={selectedUserIds.includes(student.id)} onCheckedChange={() => handleSelectUser(student)} className="translate-y-0.5 border-border/30" />
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
                        {student.dateOfBirth ? formatDateDisplay(student.dateOfBirth) : "--"}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex max-w-55 flex-wrap justify-center gap-1">{student.goalTypes?.length ? student.goalTypes.map(type => <span key={type} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{GOAL_TYPE_LABELS[type] || type}</span>) : <span className="text-xs text-muted-foreground">Chưa có mục tiêu</span>}</div>
                      </TableCell>

                      {/* Trạng thái tài khoản Cell */}
                      <TableCell className="text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            student.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                          }`}>
                            {student.status}
                        </span>
                      </TableCell>

                      {/* Ngày tạo Cell */}
                      <TableCell className="text-center font-mono font-medium text-xs text-muted-foreground">
                        {student.createdAt ? formatDateDisplay(student.createdAt) : "--"}
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

                          <Button onClick={() => handleOpenDetailModal(student, "goals")} variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-500/10" title="Xem tiến độ học tập">
                            <Award className="h-4 w-4" />
                          </Button>

                          <Button variant="ghost" size="icon" disabled={statusUpdatingId === student.userId} onClick={() => handleQuickToggleStatus(student)} className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground" title={student.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
                            {statusUpdatingId === student.userId ? <Loader2 className="h-4 w-4 animate-spin" /> : student.status === "ACTIVE" ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4 text-emerald-600" />}
                          </Button>

                          <Button variant="ghost" size="icon" disabled={deleting} onClick={() => setDeleteCandidate(student)} className="h-8 w-8 text-red-600 hover:bg-red-500/10" title="Xóa mềm (có thể khôi phục)"><Trash2 className="h-4 w-4" /></Button>

                          <Button onClick={() => { setMessageStudent(student); setMessageTitle(""); setMessageContent(""); setMessageType("ADMIN_ANNOUNCEMENT"); }} variant="ghost" size="icon" className="h-8 w-8 text-purple-600 hover:bg-purple-500/10" title="Nhắn tin">
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

      {!isHrOnly && <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b bg-muted/20">
            <DialogTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-emerald-600" /> Nhật ký hoạt động học tập</DialogTitle>
            <DialogDescription>{activityDate ? `Các sự kiện được ghi nhận ngày ${formatDateDisplay(activityDate)}` : "Chi tiết hoạt động"}</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[calc(85vh-90px)] p-4">
            {activityLogsLoading ? <div className="h-48 flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
              : activityLogsError ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 flex gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{activityLogsError}</div>
              : activityLogs.length === 0 ? <div className="h-48 flex flex-col items-center justify-center text-muted-foreground"><Activity className="h-9 w-9 mb-2 opacity-30" /><p>Không có nhật ký hoạt động trong ngày này.</p></div>
              : <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Thời gian</TableHead><TableHead>Học viên</TableHead><TableHead>Sự kiện</TableHead><TableHead>Đối tượng</TableHead><TableHead>Thiết bị</TableHead><TableHead>Thông tin thêm</TableHead></TableRow></TableHeader>
                  <TableBody>{activityLogs.slice(activityLogPage * activityLogPageSize, (activityLogPage + 1) * activityLogPageSize).map(log => <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{log.occurredAt ? new Date(log.occurredAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--"}</TableCell>
                    <TableCell><div className="font-semibold">{log.fullName || "Không rõ học viên"}</div><div className="text-xs text-muted-foreground">{log.email || `ID: ${log.userId}`}</div></TableCell>
                    <TableCell><span className="rounded-md bg-emerald-500/10 text-emerald-700 px-2 py-1 text-xs font-semibold">{ACTIVITY_LABELS[log.eventType] || log.eventType || "--"}</span></TableCell>
                    <TableCell><div className="font-semibold">{log.entityName || "Không xác định được đối tượng"}</div>{log.courseId && <Link to={`/admin/courses/${log.courseId}`} state={{ returnTo: "/admin/students", studentId: log.userId }} className="text-xs text-primary hover:underline">Khóa: {log.courseName || `#${log.courseId}`}</Link>}{log.className && <div className="text-xs text-muted-foreground">Lớp: {log.className}</div>}</TableCell>
                    <TableCell className="max-w-37.5 text-xs">{log.device || "--"}</TableCell>
                    <TableCell className="max-w-55 truncate text-xs" title={log.metadata}>{log.metadata || "--"}</TableCell>
                  </TableRow>)}</TableBody>
                </Table>
                {activityLogs.length > activityLogPageSize && <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-2 text-xs"><span>{activityLogPage * activityLogPageSize + 1}–{Math.min((activityLogPage + 1) * activityLogPageSize, activityLogs.length)} / {activityLogs.length} nhật ký</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={activityLogPage === 0} onClick={() => setActivityLogPage(page => page - 1)}>Trước</Button><Button size="sm" variant="outline" disabled={(activityLogPage + 1) * activityLogPageSize >= activityLogs.length} onClick={() => setActivityLogPage(page => page + 1)}>Sau</Button></div></div>}
              </div>}
          </div>
        </DialogContent>
      </Dialog>}

      <Dialog open={studentFormOpen} onOpenChange={open => { setStudentFormOpen(open); if (!open) setNewStudentErrors({}); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Thêm học viên mới</DialogTitle><DialogDescription>Tên đăng nhập sẽ tự động sử dụng email. Tất cả trường bên dưới đều bắt buộc.</DialogDescription></DialogHeader>
          <form onSubmit={createStudent} noValidate className="grid grid-cols-1 gap-4">
            <div className="space-y-1"><Label>Họ và tên <span className="text-red-500">*</span></Label><Input value={newStudent.fullName} aria-invalid={Boolean(newStudentErrors.fullName)} onChange={event => { setNewStudent(value => ({ ...value, fullName: event.target.value })); setNewStudentErrors(errors => ({ ...errors, fullName: undefined })); }} placeholder="Nguyễn Văn An" className={newStudentErrors.fullName ? "border-red-500 focus-visible:ring-red-500" : ""} />{newStudentErrors.fullName && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{newStudentErrors.fullName}</p>}</div>
            <div className="space-y-1"><Label>Email <span className="text-red-500">*</span></Label><Input type="email" value={newStudent.email} aria-invalid={Boolean(newStudentErrors.email)} onChange={event => { setNewStudent(value => ({ ...value, email: event.target.value })); setNewStudentErrors(errors => ({ ...errors, email: undefined })); }} placeholder="student@example.com" className={newStudentErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""} /><p className="text-[11px] text-muted-foreground">Email này đồng thời là tên đăng nhập.</p>{newStudentErrors.email && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{newStudentErrors.email}</p>}</div>
            <div className="space-y-1"><Label>Ngày sinh <span className="text-red-500">*</span></Label><DatePickerInput value={newStudent.dateOfBirth} onChange={dateOfBirth => { setNewStudent(value => ({ ...value, dateOfBirth })); setNewStudentErrors(errors => ({ ...errors, dateOfBirth: undefined })); }} className={newStudentErrors.dateOfBirth ? "border-red-500" : ""} />{newStudentErrors.dateOfBirth && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{newStudentErrors.dateOfBirth}</p>}</div>
            <div className="col-span-2 flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setStudentFormOpen(false)}>Hủy</Button><Button type="submit" disabled={actionLoading}>{actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Tạo học viên</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={open => { setInviteOpen(open); if (!open) setInviteEmailError(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Mời học viên</DialogTitle><DialogDescription>Hệ thống tạo tài khoản chờ xác minh với vai trò STUDENT và gửi email đặt mật khẩu.</DialogDescription></DialogHeader>
          <form onSubmit={inviteStudent} noValidate className="space-y-4"><div className="space-y-1"><Label>Email học viên <span className="text-red-500">*</span></Label><Input type="email" value={inviteEmail} aria-invalid={Boolean(inviteEmailError)} onChange={event => { setInviteEmail(event.target.value); setInviteEmailError(""); }} placeholder="student@example.com" className={inviteEmailError ? "border-red-500 focus-visible:ring-red-500" : ""} />{inviteEmailError && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{inviteEmailError}</p>}</div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Hủy</Button><Button type="submit" disabled={actionLoading || !inviteEmail.trim()}>{actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Gửi lời mời</Button></div></form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(messageStudent)} onOpenChange={open => { if (!open && !messageSending) setMessageStudent(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-purple-600" />Gửi tin nhắn cho học viên</DialogTitle><DialogDescription>Người nhận: <strong>{messageStudent?.fullName}</strong> · {messageStudent?.email}</DialogDescription></DialogHeader>
          <form onSubmit={sendStudentMessage} className="space-y-4">
            <div className="space-y-1.5"><Label>Loại thông báo</Label><Select value={messageType} onValueChange={value => setMessageType(value as typeof messageType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ADMIN_ANNOUNCEMENT">Thông báo chung</SelectItem><SelectItem value="ADMIN_WARNING">Cảnh báo cá nhân</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Tiêu đề</Label><Input required maxLength={255} value={messageTitle} onChange={event => setMessageTitle(event.target.value)} placeholder="Nhập tiêu đề tin nhắn..." /><div className="text-right text-[10px] text-muted-foreground">{messageTitle.length}/255</div></div>
            <div className="space-y-1.5"><Label>Nội dung</Label><Textarea required rows={6} value={messageContent} onChange={event => setMessageContent(event.target.value)} placeholder="Nhập nội dung gửi tới học viên..." className="resize-none" /></div>
            <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={messageSending} onClick={() => setMessageStudent(null)}>Hủy</Button><Button type="submit" disabled={messageSending || !messageTitle.trim() || !messageContent.trim()} className="gap-2">{messageSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}Gửi tin nhắn</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkEmailOpen} onOpenChange={open => { if (!bulkEmailSending) setBulkEmailOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" />Gửi email hàng loạt</DialogTitle><DialogDescription>Gửi tới {selectedUserIds.length} học viên đã chọn bằng email tài khoản thực tế.</DialogDescription></DialogHeader>
          <form onSubmit={sendBulkStudentEmail} className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-3"><div className="mb-2 text-xs font-semibold text-muted-foreground">Người nhận</div><div className="flex max-h-24 flex-wrap gap-1.5 overflow-auto">{selectedUserIds.map(id => <span key={id} className="rounded-full border bg-background px-2 py-1 text-[10px]">{selectedEmails[id] || `ID ${id}`}</span>)}</div></div>
            <div className="space-y-1.5"><Label>Tiêu đề email</Label><Input required value={bulkEmailSubject} onChange={event => setBulkEmailSubject(event.target.value)} placeholder="Nhập tiêu đề email..." /></div>
            <div className="space-y-1.5"><Label>Nội dung email</Label><Textarea required rows={7} value={bulkEmailContent} onChange={event => setBulkEmailContent(event.target.value)} placeholder="Nhập nội dung gửi tới các học viên..." className="resize-none" /></div>
            <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={bulkEmailSending} onClick={() => setBulkEmailOpen(false)}>Hủy</Button><Button type="submit" disabled={bulkEmailSending || !bulkEmailSubject.trim() || !bulkEmailContent.trim()} className="gap-2">{bulkEmailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}Gửi {selectedUserIds.length} email</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={Boolean(deleteCandidate)} onOpenChange={open => { if (!open) setDeleteCandidate(null); }} title="Xóa mềm học viên" description={`Chuyển học viên ${deleteCandidate?.fullName || "đã chọn"} vào thùng rác? Dữ liệu có thể được khôi phục.`} confirmText="Chuyển vào thùng rác" loading={deleting} onConfirm={async () => { if (deleteCandidate) await softDeleteStudent(deleteCandidate); setDeleteCandidate(null); }} />
      <ConfirmDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen} title="Xóa mềm hàng loạt" description={`Chuyển ${selectedUserIds.length} học viên đã chọn vào thùng rác? Dữ liệu có thể được khôi phục.`} confirmText="Xóa các học viên đã chọn" loading={deleting} onConfirm={bulkSoftDeleteStudents} />

      {/* 6.8.4 STUDENT DETAIL MODAL (7 TABS) */}
      <StudentDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        student={selectedStudentForDetail}
        initialTab={detailInitialTab}
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
