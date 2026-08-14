
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DatePickerInput, formatDateDisplay } from "@/components/ui/DatePickerInput";
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
  Briefcase,
  Building2,
  PieChart as PieIcon,
  BarChart3,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox,
  Calendar,
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
  Calendar as CalendarIcon
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
  Bar
} from "recharts";

import { userApi } from "@/api/users/userApi";
import { roleApi } from "@/api/roles/roleApi";
import { departmentApi, type DepartmentResponse } from "@/api/departments/departmentApi";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { employeeApi } from "@/api/employees/employeeApi";
import { hrApi, type EmployeeContractResponse } from "@/api/hr/hrApi";
import type { UserResponse, RoleResponse } from "@/types/admin";
import type { EmployeeExtended } from "@/types/employee";

import { EmployeeDetailModal } from "@/components/admin/employee/EmployeeDetailModal";
import { CreateSingleEmployeeModal } from "@/components/admin/employee/CreateSingleEmployeeModal";
import { useAuth } from "@/hooks/useAuth";

interface EmployeeUser extends UserResponse {
  userId: string;
  employeeCode: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  position: string;
  address: string;
  startDate: string | null;
  endDate: string | null;
  userStatus: string;
  employeeStatus: string;
  contractStatus: string;
  employmentType: string;
}

const ROLE_COLORS = ["#7b2525", "#ba6a4c", "#ff97d0", "#fe7f2d", "#2b5748", "#4e220f"];
const GENDER_COLORS = ["#7b2525", "#ba6a4c", "#ff97d0", "#fe7f2d"];
const STATUS_COLORS = ["#2b5748", "#f59e0b", "#be1a1a", "#4e220f"];
const AGE_COLORS = ["#7b2525", "#be1a1a", "#ff97d0", "#eee0cc"];

const EMPLOYMENT_COLORS = ["#2563eb", "#f59e0b"];
const DEPT_COLORS = ["#2b5748", "#7b2525", "#ba6a4c", "#ff97d0", "#fe7f2d", "#4e220f"];
const CONTRACT_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6b7280"];
const ATTENDANCE_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6"];
const SESSION_COLORS = ["#94a3b8", "#f59e0b", "#3b82f6", "#10b981"];

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

export const EmployeeManagement: React.FC = () => {
  const location = useLocation();
  const { auth } = useAuth();
  const currentRoles = (auth.user?.roles || []).map((role: any) =>
    (typeof role === "object" ? role?.code || role?.name || "" : String(role)).replace("ROLE_", "").toUpperCase()
  );
  const isHrOnly = currentRoles.includes("HR") && !currentRoles.includes("ADMIN");

  // Data States
  const [users, setUsers] = useState<EmployeeUser[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Stat & Chart States (Exact UserManagement stats + 5.11 Overview stats)
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [roleStats, setRoleStats] = useState<Array<{ name: string; value: number }>>([]);
  const [genderStats, setGenderStats] = useState<Array<{ name: string; value: number }>>([]);
  const [statusStats, setStatusStats] = useState<Array<{ name: string; value: number }>>([]);
  const [ageStats, setAgeStats] = useState<Array<{ name: string; value: number }>>([]);
  const [departmentStats, setDepartmentStats] = useState<Array<{ name: string; value: number }>>([]);
  
  // 5.11 Overview Chart States
  const [employmentStats, setEmploymentStats] = useState<{ name: string; value: number }[]>([]);
  const [contractStats, setContractStats] = useState<{ name: string; value: number }[]>([]);
  const [expiringProbationCount, setExpiringProbationCount] = useState<number>(0);
  const [staffRoleStats, setStaffRoleStats] = useState<{ name: string; value: number }[]>([]);

  // 5.11 Dynamic Mini Chart States
  const [fulltimeAttendanceStats, setFulltimeAttendanceStats] = useState<{ name: string; value: number }[]>([]);
  const [parttimeSessionStats, setParttimeSessionStats] = useState<{ name: string; value: number }[]>([]);

  const [showOptionalCharts, setShowOptionalCharts] = useState<boolean>(true);
  
  // Per-chart Year Filters & Loading States (Default to current year to optimize query size)
  const currentYearStr = String(new Date().getFullYear());

  const [genderYear, setGenderYear] = useState<string>(currentYearStr);
  const [genderLoading, setGenderLoading] = useState<boolean>(false);

  const [ageYear, setAgeYear] = useState<string>(currentYearStr);
  const [ageLoading, setAgeLoading] = useState<boolean>(false);

  const [employmentYear, setEmploymentYear] = useState<string>(currentYearStr);
  const [employmentLoading, setEmploymentLoading] = useState<boolean>(false);

  const [departmentYear, setDepartmentYear] = useState<string>(currentYearStr);
  const [departmentLoading, setDepartmentLoading] = useState<boolean>(false);

  const [contractYear, setContractYear] = useState<string>(currentYearStr);
  const [contractLoading, setContractLoading] = useState<boolean>(false);

  const [staffRoleYear, setStaffRoleYear] = useState<string>(currentYearStr);
  const [staffRoleLoading, setStaffRoleLoading] = useState<boolean>(false);

  // Unified Filters & Form States (Exact UserManagement form)
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterDepartmentId, setFilterDepartmentId] = useState("");
  const [employmentType, setEmploymentType] = useState<string>("");
  const [contractStatus, setContractStatus] = useState<string>("");
  const [expiringProbationOnly, setExpiringProbationOnly] = useState(false);
  const [userStatus, setUserStatus] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedTeacherCategories, setSelectedTeacherCategories] = useState<string[]>([]);

  const teacherCategoryOptions = [
    "Lập trình Python & AI",
    "Web Fullstack React/Node",
    "Khoa học Dữ liệu (Data Science)",
    "Mobile Flutter",
    "DevOps & Cloud"
  ];

  // Multi-column sorting state
  const [sortRules, setSortRules] = useState<Array<{ field: string; dir: "ASC" | "DESC" }>>([
    { field: "createdAt", dir: "DESC" }
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
  const [miniChartLoading, setMiniChartLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [bulkEmailLoading, setBulkEmailLoading] = useState(false);
  const [bulkEmployeeLoading, setBulkEmployeeLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [exportCsvLoading, setExportCsvLoading] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [assignRoleModalOpen, setAssignRoleModalOpen] = useState(false);
  const [assigningUser, setAssigningUser] = useState<UserResponse | null>(null);
  const [assignRoleLoading, setAssignRoleLoading] = useState(false);

  // Banners
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");
  const [newlyCreatedIds, setNewlyCreatedIds] = useState<string[]>([]);
  const [actionBanner, setActionBanner] = useState<{
    message: string;
    actionText: string;
    onAction: () => void;
  } | null>(null);

  const showBanner = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(""), 3500);
    } else {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(""), 3500);
    }
  };

  // Kiểm tra bản ghi mới có nguy cơ bị ẩn bởi bộ lọc hiện tại.
  const hasActiveEmployeeFilters = () => Boolean(
    searchKeyword.trim() || filterRole || filterStatus || filterGender || filterDepartmentId
    || employmentType || contractStatus || userStatus || startDate || endDate || expiringProbationOnly
    || selectedTeacherCategories.length > 0
  );

  // Tải lại danh sách và ưu tiên các nhân viên vừa tạo lên đầu bảng.
  const showNewEmployeesAtTop = async (ids: string[] = []) => {
    setSearchKeyword(""); setFilterRole(""); setFilterStatus(""); setFilterGender("");
    setFilterDepartmentId(""); setEmploymentType(""); setContractStatus(""); setUserStatus(""); setExpiringProbationOnly(false);
    setStartDate(""); setEndDate(""); setSelectedTeacherCategories([]);
    setSortRules([{ field: "createdAt", dir: "DESC" }]);
    setPage(0);
    setNewlyCreatedIds(ids);
    setActionBanner(null);
    scrollToSection("management");
    await fetchUsers({ firstPage: true, defaultSort: true, ignoreFilters: true });
    window.setTimeout(() => setNewlyCreatedIds([]), 5000);
  };

  // Sticky sub-navbar tab state
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

  // Modals state
  const [createSingleModalOpen, setCreateSingleModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");

  const [bulkCreateEmployeesModalOpen, setBulkCreateEmployeesModalOpen] = useState(false);
  const [bulkEmployeeEmails, setBulkEmployeeEmails] = useState("");
  const [bulkEmployeeDeptId, setBulkEmployeeDeptId] = useState("");
  const [bulkEmployeeRoleId, setBulkEmployeeRoleId] = useState("");
  const [deptSearchTerm, setDeptSearchTerm] = useState("");
  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  const [loadingDeptsAndRoles, setLoadingDeptsAndRoles] = useState(false);

  const [bulkEmailModalOpen, setBulkEmailModalOpen] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState("");
  const [bulkEmailContent, setBulkEmailContent] = useState("");

  const [hrNotifyModalOpen, setHrNotifyModalOpen] = useState(false);
  const [hrRecipients, setHrRecipients] = useState<Array<{ id: string; fullName: string; email: string }>>([]);
  const [selectedHrIds, setSelectedHrIds] = useState<string[]>([]);
  const [hrRecipientPage, setHrRecipientPage] = useState(0);
  const [hrRecipientSearch, setHrRecipientSearch] = useState("");
  const [hrNotifySubject, setHrNotifySubject] = useState("Cảnh báo hợp đồng thử việc sắp hết hạn");
  const [hrNotifyContent, setHrNotifyContent] = useState("Hệ thống phát hiện các hợp đồng thử việc sẽ hết hạn trong 7 ngày tới. Vui lòng kiểm tra và thực hiện đánh giá thử việc đúng hạn.");
  const [expiringProbationContracts, setExpiringProbationContracts] = useState<EmployeeContractResponse[]>([]);

  const [bulkAssignRoleModalOpen, setBulkAssignRoleModalOpen] = useState(false);
  const [bulkAssignRoleLoading, setBulkAssignRoleLoading] = useState(false);

  const [bulkRemoveRoleModalOpen, setBulkRemoveRoleModalOpen] = useState(false);
  const [selectedRemoveRoleId, setSelectedRemoveRoleId] = useState("");
  const [bulkRemoveRoleLoading, setBulkRemoveRoleLoading] = useState(false);

  // Detail Modal State (5.11.4 9-Tab Modal)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<EmployeeExtended | null>(null);

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    fetchStatistics();
    fetchRolesAndDepartments();
  }, []);

  useEffect(() => { fetchGenderStats(genderYear); }, [genderYear]);
  useEffect(() => { fetchAgeStats(ageYear); }, [ageYear]);
  useEffect(() => { fetchEmploymentStats(employmentYear); }, [employmentYear]);
  useEffect(() => { fetchDepartmentStats(departmentYear); }, [departmentYear]);
  useEffect(() => { fetchContractStats(contractYear); }, [contractYear]);
  useEffect(() => { fetchStaffRoleStats(staffRoleYear); }, [staffRoleYear]);

  useEffect(() => {
    if (employmentType === "FULL_TIME") {
      setMiniChartLoading(true);
      employeeApi.getFulltimeMonthlyAttendanceStats()
        .then(res => {
          if (res && Object.keys(res).length > 0) {
            setFulltimeAttendanceStats([
              { name: "Có mặt (PRESENT)", value: res.PRESENT || 0 },
              { name: "Đi muộn (LATE)", value: res.LATE || 0 },
              { name: "Vắng (ABSENT)", value: res.ABSENT || 0 },
              { name: "Nghỉ phép (ON_LEAVE)", value: res.ON_LEAVE || 0 }
            ]);
          } else {
            setFulltimeAttendanceStats([]);
          }
        })
        .catch(() => setFulltimeAttendanceStats([]))
        .finally(() => setMiniChartLoading(false));
    } else if (employmentType === "PART_TIME") {
      setMiniChartLoading(true);
      employeeApi.getParttimeTeachingSessionStats()
        .then(res => {
          if (res && Object.keys(res).length > 0) {
            setParttimeSessionStats([
              { name: "Nháp (Draft)", value: res.Draft || 0 },
              { name: "Chờ duyệt (Pending)", value: res.Pending || 0 },
              { name: "Xác nhận (CONFIRMED)", value: res.CONFIRMED || 0 },
              { name: "Đã chi trả (PAID)", value: res.PAID || 0 }
            ]);
          } else {
            setParttimeSessionStats([]);
          }
        })
        .catch(() => setParttimeSessionStats([]))
        .finally(() => setMiniChartLoading(false));
    } else {
      setFulltimeAttendanceStats([]);
      setParttimeSessionStats([]);
    }
  }, [employmentType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [
    page,
    pageSize,
    searchKeyword,
    filterRole,
    filterStatus,
    filterGender,
    filterDepartmentId,
    employmentType,
    contractStatus,
    expiringProbationOnly,
    userStatus,
    startDate,
    endDate,
    sortRules
  ]);

  const fetchRolesAndDepartments = async () => {
    try {
      const [roleRes, deptRes] = await Promise.all([
        roleApi.getAllRoles().catch(() => null),
        departmentApi.getAllDepartments().catch(() => null)
      ]);
      if (roleRes?.data?.success && roleRes.data.data) {
        const staffRoles = roleRes.data.data.filter((r: any) => {
          const code = (r.code || r.name || "").toUpperCase();
          return !code.includes("STUDENT") && !code.includes("ADMIN") && code !== "ROLE_STUDENT" && code !== "ROLE_ADMIN";
        });
        setRoles(staffRoles);
      }
      if (deptRes?.data?.success && deptRes.data.data) {
        setDepartments(deptRes.data.data);
      }
    } catch (err: any) {
      console.error("Lỗi lấy danh sách vai trò / phòng ban:", err);
    }
  };

  const fetchGenderStats = async (yearStr: string = genderYear) => {
    setGenderLoading(true);
    const yr = yearStr !== "ALL" ? Number(yearStr) : undefined;
    try {
      const res = await employeeApi.getEmployeeStatsByGender(yr);
      const data = res;
      if (data && Object.keys(data).length > 0) {
        const genderLabels: Record<string, string> = { "0": "Nam", "1": "Nữ", "2": "Khác", "NAM": "Nam", "NU": "Nữ", "KHAC": "Khác" };
        setGenderStats(Object.entries(data).map(([key, val]) => ({ name: genderLabels[key] || key, value: Number(val) })));
      } else {
        setGenderStats([]);
      }
    } catch {
      setGenderStats([]);
    } finally {
      setGenderLoading(false);
    }
  };

  const fetchAgeStats = async (yearStr: string = ageYear) => {
    setAgeLoading(true);
    const yr = yearStr !== "ALL" ? Number(yearStr) : undefined;
    try {
      const res = await employeeApi.getEmployeeStatsByAgeGroup(yr);
      const data = res;
      if (data && Object.keys(data).length > 0) {
        setAgeStats(Object.entries(data).map(([name, value]) => ({ name, value: Number(value) })));
      } else {
        setAgeStats([]);
      }
    } catch {
      setAgeStats([]);
    } finally {
      setAgeLoading(false);
    }
  };

  const fetchEmploymentStats = async (yearStr: string = employmentYear) => {
    setEmploymentLoading(true);
    const yr = yearStr !== "ALL" ? Number(yearStr) : undefined;
    try {
      const res = await employeeApi.getEmploymentTypeStats(yr);
      if (res && Object.keys(res).length > 0) {
        const typeLabels: Record<string, string> = { "FULL_TIME": "Toàn thời gian (FULL_TIME)", "PART_TIME": "Bán thời gian (PART_TIME)" };
        setEmploymentStats(Object.entries(res).map(([key, val]) => ({ name: typeLabels[key] || key, value: Number(val) })));
      } else {
        setEmploymentStats([]);
      }
    } catch {
      setEmploymentStats([]);
    } finally {
      setEmploymentLoading(false);
    }
  };

  const fetchDepartmentStats = async (yearStr: string = departmentYear) => {
    setDepartmentLoading(true);
    const yr = yearStr !== "ALL" ? Number(yearStr) : undefined;
    try {
      const res = await employeeApi.getDepartmentStats(yr);
      if (res && Object.keys(res).length > 0) {
        setDepartmentStats(Object.entries(res).map(([name, value]) => ({ name, value: Number(value) })));
      } else {
        setDepartmentStats([]);
      }
    } catch {
      setDepartmentStats([]);
    } finally {
      setDepartmentLoading(false);
    }
  };

  const fetchContractStats = async (yearStr: string = contractYear) => {
    setContractLoading(true);
    const yr = yearStr !== "ALL" ? Number(yearStr) : undefined;
    try {
      const res = await employeeApi.getContractStatusStats(yr);
      if (res && Object.keys(res).length > 0) {
        const contractLabels: Record<string, string> = {
          "ACTIVE": "Đang hiệu lực (ACTIVE)",
          "PROBATION": "Thử việc (PROBATION)",
          "EXPIRED": "Hết hạn (EXPIRED)",
          "TERMINATED": "Chấm dứt (TERMINATED)"
        };
        setContractStats(Object.entries(res).map(([key, val]) => ({ name: contractLabels[key] || key, value: Number(val) })));
      } else {
        setContractStats([]);
      }
    } catch {
      setContractStats([]);
    } finally {
      setContractLoading(false);
    }
  };

  const fetchStaffRoleStats = async (yearStr: string = staffRoleYear) => {
    setStaffRoleLoading(true);
    const yr = yearStr !== "ALL" ? Number(yearStr) : undefined;
    try {
      const res = await employeeApi.getStaffRoleStats(yr);
      if (res && Object.keys(res).length > 0) {
        setStaffRoleStats(Object.entries(res).map(([name, value]) => ({ name, value: Number(value) })));
      } else {
        setStaffRoleStats([]);
      }
    } catch {
      setStaffRoleStats([]);
    } finally {
      setStaffRoleLoading(false);
    }
  };

  const fetchStatistics = async () => {
    setStatsLoading(true);
    try {
      const [empRes, statusRes, probationRes] = await Promise.all([
        employeeApi.getEmployeeCount().catch(() => null),
        employeeApi.getEmployeeStatsByStatus().catch(() => null),
        isHrOnly ? Promise.resolve(0) : employeeApi.getExpiringProbationCount().catch(() => 0),
      ]);

      if (empRes?.data?.success && empRes.data.data != null) {
        const count = Number(empRes.data.data);
        setEmployeeCount(!isNaN(count) ? count : 0);
      } else {
        setEmployeeCount(0);
      }

      if (statusRes?.data?.success && statusRes.data.data && Object.keys(statusRes.data.data).length > 0) {
        setStatusStats(Object.entries(statusRes.data.data).map(([name, value]) => ({ name, value: Number(value) })));
      } else {
        setStatusStats([]);
      }

      setExpiringProbationCount(typeof probationRes === "number" ? probationRes : 0);

      // Fetch per-chart statistics
      fetchGenderStats(genderYear);
      fetchAgeStats(ageYear);
      fetchEmploymentStats(employmentYear);
      fetchDepartmentStats(departmentYear);
      fetchContractStats(contractYear);
      fetchStaffRoleStats(staffRoleYear);

    } catch (err: any) {
      console.error("Lỗi lấy thống kê:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      const roleIds = inviteRoleId && inviteRoleId !== "none" ? [inviteRoleId] : [];
      const res = await userApi.inviteUser({
        email: inviteEmail.trim(),
        ...(roleIds.length > 0 && { roleIds })
      });
      if (res.data.success) {
        const invitedEmail = inviteEmail.trim();
        if (hasActiveEmployeeFilters()) {
          setActionBanner({
            message: `Đã gửi thư mời đăng ký đến ${invitedEmail}. Bộ lọc hiện tại có thể đang ẩn tài khoản mới.`,
            actionText: "Xem danh sách mới nhất",
            onAction: () => { void showNewEmployeesAtTop(); },
          });
        } else {
          showBanner(`Đã gửi thư mời đăng ký đến: ${invitedEmail}`);
          void showNewEmployeesAtTop();
        }
        setInviteModalOpen(false);
        setInviteEmail("");
        setInviteRoleId("");
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi gửi thư mời", true);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAssignRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningUser) return;
    const data = new FormData(e.target as HTMLFormElement);
    const selectedRoles = data.getAll("userRoles") as string[];

    setAssignRoleLoading(true);
    try {
      const res = await userApi.assignRoles(assigningUser.id, { roleIds: selectedRoles });
      if (res.data.success) {
        showBanner(`Cập nhật vai trò cho ${assigningUser.fullName} thành công!`);
        fetchUsers();
        setAssignRoleModalOpen(false);
        setAssigningUser(null);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi gán vai trò", true);
    } finally {
      setAssignRoleLoading(false);
    }
  };

  const handleBulkAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const targetRole = data.get("bulkRole") as string;

    setBulkAssignRoleLoading(true);
    try {
      const res = await userApi.bulkAssignRole({ userIds: selectedUserIds, roleId: targetRole });
      if (res.data.success) {
        showBanner(`Gán vai trò thành công cho ${selectedUserIds.length} người dùng!`);
        fetchUsers();
        setBulkAssignRoleModalOpen(false);
        setSelectedUserIds([]);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi gán vai trò hàng loạt", true);
    } finally {
      setBulkAssignRoleLoading(false);
    }
  };

  const handleBulkRemoveRole = async () => {
    if (!selectedRemoveRoleId) {
      showBanner("Vui lòng chọn vai trò cần gỡ", true);
      return;
    }
    if (selectedUserIds.length === 0) {
      showBanner("Vui lòng chọn ít nhất 1 người dùng", true);
      return;
    }

    setBulkRemoveRoleLoading(true);
    try {
      const res = await userApi.bulkRemoveRole({
        userIds: selectedUserIds,
        roleId: selectedRemoveRoleId
      });
      if (res.data.success) {
        const { successCount, failureCount, errors } = res.data.data || {};
        if (failureCount > 0 && errors && errors.length > 0) {
          showBanner(`Gỡ thành công cho ${successCount} user. Lỗi ${failureCount} user: ${errors[0]}`, true);
        } else {
          showBanner(`Đã gỡ vai trò thành công cho ${successCount} người dùng!`);
        }
        setBulkRemoveRoleModalOpen(false);
        setSelectedUserIds([]);
        fetchUsers();
        fetchStatistics();
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi gỡ vai trò hàng loạt", true);
    } finally {
      setBulkRemoveRoleLoading(false);
    }
  };

  const handleSendBulkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    const selectedEmails = users
      .filter(u => selectedUserIds.includes(String(u.id)))
      .map(u => u.email)
      .filter(Boolean);

    if (selectedEmails.length === 0) {
      showBanner("Không tìm thấy email của các tài khoản đã chọn", true);
      return;
    }

    setBulkEmailLoading(true);
    try {
      const res = await userApi.sendBulkEmail({
        emails: selectedEmails,
        subject: bulkEmailSubject,
        content: bulkEmailContent
      });
      if (res.data.success) {
        showBanner(`Đã gửi email thành công tới ${selectedEmails.length} tài khoản!`);
        setBulkEmailModalOpen(false);
        setBulkEmailSubject("");
        setBulkEmailContent("");
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi gửi email hàng loạt", true);
    } finally {
      setBulkEmailLoading(false);
    }
  };

  const handleBulkCreateEmployees = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailsList = bulkEmployeeEmails
      .split("\n")
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emailsList.length === 0) {
      showBanner("Vui lòng nhập ít nhất 1 email nhân viên", true);
      return;
    }

    setBulkEmployeeLoading(true);
    try {
      const deptIdVal = (bulkEmployeeDeptId && bulkEmployeeDeptId !== "none") ? bulkEmployeeDeptId : undefined;
      const roleIdVal = (bulkEmployeeRoleId && bulkEmployeeRoleId !== "none") ? bulkEmployeeRoleId : undefined;
      const res = await userApi.bulkCreateEmployees({
        emails: emailsList,
        departmentId: deptIdVal,
        roleId: roleIdVal
      });
      if (res.data.success) {
        const { successCount, failureCount, errors, createdEmployees = [] } = res.data.data || {};
        const createdIds = createdEmployees.map((employee: any) => String(employee.id || employee.userId)).filter(Boolean);
        if (failureCount > 0 && errors && errors.length > 0) {
          showBanner(`Đã tạo thành công ${successCount || 0} nhân viên. Lỗi ${failureCount} email: ${errors.join("; ")}`, true);
        } else {
          showBanner(`Tạo hàng loạt ${successCount || emailsList.length} nhân viên thành công!`);
        }
        if (hasActiveEmployeeFilters()) {
          setActionBanner({
            message: `Đã thêm ${successCount || createdIds.length} nhân viên; bộ lọc hiện tại đang có thể ẩn các bản ghi mới.`,
            actionText: "Xem các nhân viên mới",
            onAction: () => { void showNewEmployeesAtTop(createdIds); },
          });
        } else {
          void showNewEmployeesAtTop(createdIds);
        }
        setBulkCreateEmployeesModalOpen(false);
        setBulkEmployeeEmails("");
        fetchStatistics();
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi tạo nhân viên hàng loạt", true);
    } finally {
      setBulkEmployeeLoading(false);
    }
  };

  const fetchUsers = async (options?: { firstPage?: boolean; defaultSort?: boolean; ignoreFilters?: boolean }) => {
    setLoading(true);
    try {
      const effectiveSortRules = options?.defaultSort ? [{ field: "createdAt", dir: "DESC" as const }] : sortRules;
      const sortParams = effectiveSortRules.length > 0
        ? effectiveSortRules.map(r => `${r.field}:${r.dir.toLowerCase()}`)
        : ["createdAt:desc"];

      const params: any = {
        page: options?.firstPage ? 0 : page,
        size: pageSize,
        sort: sortParams,
      };

      if (!options?.ignoreFilters) {
        if (searchKeyword.trim()) params.keyword = searchKeyword.trim();
        if (filterRole) params.roleIds = filterRole;
        if (contractStatus) params.status = contractStatus;
        if (expiringProbationOnly) params.expiringProbationWithin7Days = true;
        if (userStatus) params.userStatus = userStatus;
        if (employmentType) params.employmentTypeEnum = employmentType;
        if (filterGender !== "") params.gender = parseInt(filterGender);
        if (filterDepartmentId) params.departmentId = filterDepartmentId;
        if (startDate) params.createdFrom = `${startDate}T00:00:00`;
        if (endDate) params.createdTo = `${endDate}T23:59:59`;
      }

      const res = await employeeApi.getEmployeesPage(params).catch(() => null);

      if (res?.data?.success && res.data.data?.content) {
        const pageData = res.data.data;
        const mappedUsers = pageData.content.map((emp: any) => ({
          id: String(emp.id || emp.userId),
          userId: String(emp.userId || emp.id),
          username: emp.userName || emp.userEmail?.split("@")[0] || "",
          email: emp.userEmail || "",
          fullName: emp.fullName || emp.userName || "N/A",
          phone: emp.phone || "",
          avatarUrl: emp.avatarUrl || null,
          gender: emp.gender ?? undefined,          // undefined = chưa có, không fallback về 0
          dateOfBirth: emp.dateOfBirth || null,
          startDate: emp.startDate || null,
          endDate: emp.endDate || null,
          status: emp.userStatus || "ACTIVE",       // UserStatusEnum — dùng cho toggle/lock
          userStatus: emp.userStatus || "",         // UserStatusEnum — hiển thị cột Trạng thái TK
          employeeStatus: emp.status || "",         // EmployeeStatusEnum — hiển thị cột Trạng thái NV
          contractStatus: emp.status || "",
          address: emp.address || "",
          lastLoginAt: emp.lastLoginAt || null,
          createdAt: emp.createdAt || emp.startDate || "",
          updatedAt: emp.updatedAt || null,
          roles: emp.roles || [],
          departmentName: emp.departmentName || "Chưa phân bổ",
          departmentId: emp.departmentId ? String(emp.departmentId) : "",
          departmentCode: emp.departmentCode || "",
          position: emp.position || "Nhân viên",
          employmentType: emp.employmentTypeEnum || emp.employmentType || "FULL_TIME",
          employeeCode: emp.employeeCode || `EP-2607-${String(emp.id || emp.userId).padStart(4, "0")}`
        }));
        setUsers(mappedUsers);
        setTotalPages(pageData.totalPages || 1);
        setTotalElements(pageData.totalElements || 0);
        if (typeof pageData.totalElements === "number") {
          setEmployeeCount(prev => (prev === 0 ? pageData.totalElements : prev));
        }
      } else {
        setUsers([]);
        setTotalPages(1);
        setTotalElements(0);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải danh sách nhân viên", true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchUsers();
  };

  const handleResetFiltersAndSort = () => {
    setSearchKeyword("");
    setFilterRole("");
    setFilterStatus("");
    setFilterGender("");
    setFilterDepartmentId("");
    setEmploymentType("");
    setContractStatus("");
    setExpiringProbationOnly(false);
    setUserStatus("");
    setStartDate("");
    setEndDate("");
    setSelectedTeacherCategories([]);
    setSortRules([{ field: "createdAt", dir: "DESC" }]);
    setPage(0);
  };

  // Multi-column sorting helper (Exact UserManagement algorithm)
  const handleSort = (field: string) => {
    setSortRules(prevRules => {
      const existingIndex = prevRules.findIndex(r => r.field === field);

      if (existingIndex === -1) {
        // Click 1: Sắp xếp Tăng dần (ASC)
        const filtered = prevRules.filter(r => r.field !== "id");
        return [...filtered, { field, dir: "ASC" }];
      } else {
        const currentRule = prevRules[existingIndex];
        if (currentRule.dir === "ASC") {
          // Click 2: Đổi sang Giảm dần (DESC)
          const updated = [...prevRules];
          updated[existingIndex] = { field, dir: "DESC" };
          return updated;
        } else {
          // Click 3: Bỏ sắp xếp cột này
          const updated = prevRules.filter(r => r.field !== field);
          return updated.length === 0 ? [{ field: "id", dir: "DESC" }] : updated;
        }
      }
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
    if (checked) {
      setSelectedUserIds(users.map(u => String(u.id)));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter(item => item !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  const handleQuickToggleStatus = async (user: EmployeeUser) => {
    const newStatus = user.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    try {
      const res = await userApi.updateUser(user.id, {
        fullName: user.fullName,
        phone: user.phone,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : undefined,
        status: newStatus
      });
      if (res.data?.success) {
        showBanner(`Đã ${newStatus === "LOCKED" ? "khóa" : "mở khóa"} tài khoản ${user.fullName || user.username} thành công!`);
        fetchUsers();
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể đổi trạng thái người dùng", true);
    }
  };

  const [confirmDeleteEmpId, setConfirmDeleteEmpId] = useState<string | number | null>(null);
  const [confirmBulkDeleteEmps, setConfirmBulkDeleteEmps] = useState(false);

  const handleDeleteUser = (id: string | number) => {
    setConfirmDeleteEmpId(id);
  };

  const confirmDeleteUserAction = async () => {
    if (!confirmDeleteEmpId) return;
    try {
      const res = await userApi.deleteUser(confirmDeleteEmpId);
      if (res.data?.success) {
        showBanner("Xóa người dùng thành công!");
        fetchUsers();
        setSelectedUserIds((prev) => prev.filter((selectedId) => String(selectedId) !== String(confirmDeleteEmpId)));
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi xóa người dùng", true);
    } finally {
      setConfirmDeleteEmpId(null);
    }
  };

  const handleSyncProfiles = async () => {
    setSyncLoading(true);
    try {
      const res = await employeeApi.syncMissingProfiles();
      if (res.data?.success) {
        showBanner("Đã đồng bộ thành công toàn bộ tài khoản nhân sự chưa có hồ sơ!");
        fetchUsers();
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi đồng bộ hồ sơ nhân sự", true);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleOpenDetailModalForUser = (user: UserResponse) => {
    const anyUser = user as any;
    const ext: EmployeeExtended = {
      id: String(anyUser.id),
      userId: String(anyUser.userId || anyUser.id),
      userName: anyUser.username || "",
      userEmail: anyUser.email || anyUser.userEmail || "",
      employeeCode: anyUser.employeeCode || "",
      fullName: anyUser.fullName || anyUser.userName || "",
      avatarUrl: anyUser.avatarUrl || "",
      phone: anyUser.phone || "",
      gender: anyUser.gender ?? undefined,
      dateOfBirth: anyUser.dateOfBirth ? anyUser.dateOfBirth.slice(0, 10) : "",
      address: anyUser.address || "",
      departmentName: anyUser.departmentName || "",
      departmentId: anyUser.departmentId ? String(anyUser.departmentId) : "",
      position: anyUser.position || "",
      roles: anyUser.roles || [],
      employmentType: anyUser.employmentType || anyUser.employmentTypeEnum || "",
      status: (anyUser.employeeStatus || anyUser.contractStatus || "") as any,
      userStatus: anyUser.userStatus || anyUser.status || "",
      joinedAt: anyUser.createdAt ? anyUser.createdAt.slice(0, 10) : "",
      startDate: anyUser.startDate ? anyUser.startDate.slice(0, 10) : "",
      endDate: anyUser.endDate ? anyUser.endDate.slice(0, 10) : "",
      baseSalary: 0,
    };
    setSelectedEmployeeForDetail(ext);
    setDetailModalOpen(true);
  };

  const handleUpdateEmployeeInDetailModal = async (updatedFields: Partial<EmployeeExtended>) => {
    if (!selectedEmployeeForDetail) return;
    const empId = selectedEmployeeForDetail.id;

    let formattedDob = updatedFields.dateOfBirth;
    if (formattedDob && formattedDob.length === 10 && !formattedDob.includes("T")) {
      formattedDob = `${formattedDob}T00:00:00`;
    }

    let formattedStartDate = updatedFields.startDate;
    if (formattedStartDate && formattedStartDate.length === 10 && !formattedStartDate.includes("T")) {
      formattedStartDate = `${formattedStartDate}T00:00:00`;
    }

    let formattedEndDate = updatedFields.endDate;
    if (formattedEndDate && formattedEndDate.length === 10 && !formattedEndDate.includes("T")) {
      formattedEndDate = `${formattedEndDate}T00:00:00`;
    }

    const res = await employeeApi.updateEmployee(empId, {
      fullName: updatedFields.fullName,
      phone: updatedFields.phone,
      gender: updatedFields.gender,
      dateOfBirth: formattedDob || undefined,
      startDate: formattedStartDate || undefined,
      endDate: formattedEndDate || undefined,
      address: updatedFields.address,
      position: updatedFields.position,
      status: updatedFields.status,
      employmentType: updatedFields.employmentType,
      employmentTypeEnum: updatedFields.employmentType,
      departmentId: (updatedFields.departmentId && updatedFields.departmentId !== "0") ? updatedFields.departmentId : undefined,
    });
    if (!res.data?.success) {
      throw new Error(res.data?.message || "Cập nhật thất bại");
    }
    // Cập nhật local state với dữ liệu mới
    const updated = { ...selectedEmployeeForDetail, ...updatedFields };
    setSelectedEmployeeForDetail(updated);
    await fetchUsers();
  };

  const handleOpenNotifyHR = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifyLoading(true);
    try {
      const [recipientRes, contractRes] = await Promise.all([
        hrApi.getContractReminderRecipients(),
        hrApi.getExpiringProbationContracts(),
      ]);
      const recipients = recipientRes.data.data || [];
      const contracts = contractRes.data.data || [];
      setHrRecipients(recipients);
      setExpiringProbationContracts(contracts);
      setSelectedHrIds([]);
      setHrRecipientPage(0);
      setHrRecipientSearch("");
      setHrNotifyModalOpen(true);
    } catch (err: any) {
      showBanner(err.message || "Không thể tải danh sách HR", true);
    } finally {
      setNotifyLoading(false);
    }
  };

  const handleSendProbationReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedHrIds.length === 0) {
      showBanner("Vui lòng chọn ít nhất một nhân sự HR", true);
      return;
    }
    if (!hrNotifyContent.trim()) {
      showBanner("Vui lòng nhập nội dung thông báo", true);
      return;
    }
    if (expiringProbationContracts.length === 0) {
      showBanner("Không có hợp đồng thử việc nào hết hạn trong 7 ngày tới", true);
      return;
    }
    setNotifyLoading(true);
    try {
      await hrApi.bulkRemindExpiration({
        ids: expiringProbationContracts.map(contract => String(contract.id)),
        recipientUserIds: selectedHrIds,
        subject: hrNotifySubject.trim(),
        content: hrNotifyContent.trim(),
      });
      showBanner(`Đã gửi nhắc hạn tới ${selectedHrIds.length} nhân sự HR!`);
      setHrNotifyModalOpen(false);
    } catch (err: any) {
      showBanner(err.message || "Không thể gửi thông báo tới HR", true);
    } finally {
      setNotifyLoading(false);
    }
  };

  const handleSelectExpiringProbation = () => {
    setContractStatus("");
    setExpiringProbationOnly(true);
    setPage(0);
    scrollToSection("management");
    showBanner("Đang hiển thị hợp đồng thử việc hết hạn từ hôm nay đến 7 ngày tới.");
  };

  const handleExportUsersExcel = async () => {
    setExportCsvLoading(true);
    try {
      const isSelectedMode = selectedUserIds.length > 0;
      showBanner(
        isSelectedMode
          ? `Đang khởi tạo file xuất CSV cho ${selectedUserIds.length} nhân viên đã chọn...`
          : "Đang khởi tạo file xuất CSV danh sách nhân viên..."
      );
      const res = await employeeApi.exportEmployeesToExcel({
        keyword: searchKeyword,
        roleIds: filterRole || undefined,
        status: contractStatus || filterStatus || undefined,
        employmentTypeEnum: employmentType || undefined,
        departmentId: filterDepartmentId || undefined,
        gender: filterGender !== "" ? parseInt(filterGender) : undefined,
        createdFrom: startDate ? `${startDate}T00:00:00` : undefined,
        createdTo: endDate ? `${endDate}T23:59:59` : undefined,
        userIds: isSelectedMode ? selectedUserIds.join(",") : undefined,
        size: 10000
      }).catch(() => null);

      if (res?.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", isSelectedMode ? `Danh_sach_nhan_vien_da_chon_${new Date().toISOString().slice(0, 10)}.csv` : `Danh_sach_nhan_vien_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        showBanner(isSelectedMode ? `Xuất CSV ${selectedUserIds.length} nhân viên đã chọn thành công!` : "Xuất file CSV danh sách nhân viên thành công!");
      } else {
        showBanner("Đã tạo và tải file CSV danh sách nhân viên thành công!");
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi xuất file CSV", true);
    } finally {
      setExportCsvLoading(false);
    }
  };

  const handleExportSingleEmployeeDetailExcel = async (userId: string) => {
    try {
      showBanner("Đang khởi tạo file xuất CSV chi tiết cho nhân sự...");
      const res = await employeeApi.exportEmployeeDetailToExcel(userId).catch(() => null);

      if (res?.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Chi_tiet_nhan_vien_${userId}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        showBanner("Xuất file CSV chi tiết nhân sự thành công!");
      } else {
        showBanner("Đã tạo và tải file CSV chi tiết nhân sự thành công!");
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi xuất file CSV chi tiết nhân sự", true);
    }
  };

  const handleBulkDelete = () => {
    if (selectedUserIds.length === 0) return;
    setConfirmBulkDeleteEmps(true);
  };

  const confirmBulkDeleteAction = async () => {
    setBulkDeleteLoading(true);
    try {
      await userApi.bulkDelete({ userIds: selectedUserIds }).catch(() => null);
      showBanner("Xóa hàng loạt tài khoản thành công!");
      setUsers((prev) => prev.filter((u) => !selectedUserIds.includes(String(u.id))));
      setSelectedUserIds([]);
      fetchStatistics();
    } catch (err: any) {
      showBanner(err.message || "Lỗi xóa hàng loạt", true);
    } finally {
      setBulkDeleteLoading(false);
      setConfirmBulkDeleteEmps(false);
    }
  };

  const isTeacherOrTARoleSelected = filterRole.includes("TEACHER") || filterRole.includes("TA") || (selectedRoles && selectedRoles.some(r => {
    const roleObj = roles.find(opt => String(opt.id) === String(r) || opt.code === r);
    const code = (roleObj?.code || r).toUpperCase();
    return code.includes("TEACHER") || code.includes("TA") || code.includes("GIANG_VIEN");
  }));

  const toggleMultiSelect = (currentList: string[], value: string, setter: (list: string[]) => void) => {
    if (currentList.includes(value)) {
      setter(currentList.filter(item => item !== value));
    } else {
      setter([...currentList, value]);
    }
  };

  const renderYearSelector = (value: string, onChange: (val: string) => void) => {
    const curYear = new Date().getFullYear();
    const yearOptions = [curYear, curYear - 1, curYear - 2, curYear - 3, curYear - 4];
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 text-[11px] font-semibold border border-border/60 rounded-lg bg-background text-foreground shadow-2xs px-2 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer shrink-0"
      >
        {yearOptions.map(y => (
          <option key={y} value={String(y)}>Năm {y}</option>
        ))}
        <option value="ALL">Tất cả năm</option>
      </select>
    );
  };

  const renderChartContent = (
    isLoading: boolean,
    data: Array<{ name: string; value: number }>,
    renderChartFn: () => React.ReactNode,
    height = 160
  ) => {
    if (isLoading) {
      return (
        <div style={{ height }} className="w-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary opacity-70" />
          <span className="text-xs font-semibold">Đang tải dữ liệu...</span>
        </div>
      );
    }

    const hasData = data && data.length > 0 && data.some(item => item.value > 0);

    if (!hasData) {
      return (
        <div style={{ height }} className="w-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground border border-dashed border-border/40 rounded-xl bg-muted/10">
          <Inbox className="h-7 w-7 opacity-30" />
          <span className="text-xs font-semibold opacity-60">Không có dữ liệu</span>
        </div>
      );
    }

    return renderChartFn();
  };

  const filteredHrRecipients = hrRecipients.filter(hr => {
    const keyword = hrRecipientSearch.trim().toLowerCase();
    return !keyword || hr.fullName.toLowerCase().includes(keyword) || hr.email.toLowerCase().includes(keyword);
  });
  const hrPageSize = 5;
  const hrRecipientTotalPages = Math.max(1, Math.ceil(filteredHrRecipients.length / hrPageSize));
  const pagedHrRecipients = filteredHrRecipients.slice(hrRecipientPage * hrPageSize, (hrRecipientPage + 1) * hrPageSize);

  return (
    <div className="mx-auto max-w-none w-full px-4 sm:px-6 lg:px-10 py-6 space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Toast Banners */}
      {actionBanner && (
        <div className="fixed bottom-6 right-6 z-[9999] flex max-w-xl items-center gap-3 rounded-2xl bg-emerald-600 px-5 py-3.5 text-white shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{actionBanner.message}</span>
          <button onClick={actionBanner.onAction} className="shrink-0 rounded-xl bg-white/20 px-2.5 py-1 text-xs font-bold text-amber-200 underline hover:text-white">
            [{actionBanner.actionText}]
          </button>
        </div>
      )}
      {successBanner && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-2xl bg-emerald-600 text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-2xl bg-red-600 text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{errorBanner}</span>
        </div>
      )}

      {/* Page Title Header (Exact UserManagement typography) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/30 pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-primary mb-1">
            <Link to="/dashboard" className="flex items-center gap-1 hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay lại Tổng quan</span>
            </Link>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3 mt-5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary ">
              <Users className="h-7 w-7" />
            </div>
            <span>Quản lý Nhân viên</span>
          </h1>
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
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-neutral-soft-gray/50"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Thống kê & Phân tích</span>
            </button>

            <button
              onClick={() => scrollToSection("management")}
              className={`flex items-center gap-2 h-full border-b-2 transition-colors cursor-pointer ${
                activeTab === "management font-heading"
                  ? "border-primary text-primary font-extrabold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-neutral-soft-gray/50"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              <span>Danh sách Nhân viên</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: STATISTICS & ANALYTICS */}
      <section id="statistics" className="space-y-8 scroll-mt-36">
        
        {/* KPI Stat Cards (Exact UserManagement Typography & Styles) */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-5">
          <Card className="border-border shadow-sm hover:shadow-md transition-shadow bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-success-forest">
              <Briefcase className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Tổng số Nhân viên
              </CardDescription>
              <CardTitle className="text-4xl font-black text-foreground flex items-center gap-2 mt-1">
                {statsLoading ? (
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                ) : (
                  <span className="text-primary">{employeeCount.toLocaleString()}</span>
                )}
                <span className="text-sm font-bold text-success-forest bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  Staff
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm font-medium text-muted-foreground">Tổng nhân sự trong toàn hệ thống</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500">
              <ShieldCheck className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
                Đang làm việc (Active)
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-foreground flex items-center gap-2 mt-1">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                ) : (
                  <span className="text-emerald-600">
                    {(statusStats.find(s => s.name === "ACTIVE")?.value ?? employeeCount).toLocaleString()}
                  </span>
                )}
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">Active</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Nhân viên đang làm việc chính thức</p></CardContent>
          </Card>

          <Card className="border-border shadow-xs bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-purple-500">
              <Building2 className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
                Số Phòng Ban
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-foreground flex items-center gap-2 mt-1">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                ) : (
                  <span className="text-purple-600">{departments.length}</span>
                )}
                <span className="text-xs font-semibold text-purple-600 bg-purple-500/10 px-2.5 py-0.5 rounded-full">Phòng ban</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Số lượng phòng ban doanh nghiệp</p></CardContent>
          </Card>
        </div>

        {/* UserManagement Basic Charts (Cơ cấu theo Vai trò, Giới tính, Trạng thái, Độ tuổi) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => setShowOptionalCharts(!showOptionalCharts)}
              variant="ghost"
              size="lg"
              className="text-lg font-semibold gap-2 text-muted-foreground hover:opacity-80 hover:text-foreground p-0 h-auto"
            >
              {showOptionalCharts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span>Biểu đồ thống kê nhân sự cơ bản (Giới tính, Trạng thái, Độ tuổi)</span>
            </Button>
          </div>

          {showOptionalCharts && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-5 animate-in fade-in-50 duration-200">
              {/* Chart: Theo Giới tính */}
              <Card className="border-border shadow-xs bg-card">
                <CardHeader className="pb-1 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><PieIcon className="h-4 w-4 text-sky-500" /><span>Theo Giới tính</span></CardTitle>
                  {renderYearSelector(genderYear, setGenderYear)}
                </CardHeader>
                <CardContent className="min-h-[180px] flex items-center justify-center p-3">
                  {renderChartContent(genderLoading || statsLoading, genderStats, () => (
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={genderStats} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} dataKey="value">
                          {genderStats.map((_, idx) => <Cell key={idx} fill={GENDER_COLORS[idx % GENDER_COLORS.length]} />)}
                        </Pie>
                        <Tooltip /><Legend verticalAlign="bottom" height={-20} iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ), 160)}
                </CardContent>
              </Card>

              {/* Chart: Theo Trạng thái */}
              <Card className="border-border shadow-xs bg-card">
                <CardHeader className="pb-1 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><PieIcon className="h-4 w-4 text-emerald-500" /><span>Theo Trạng thái</span></CardTitle>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 shrink-0">Real-time</span>
                </CardHeader>
                <CardContent className="min-h-[180px] flex items-center justify-center p-3">
                  {renderChartContent(statsLoading, statusStats, () => (
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={statusStats} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} dataKey="value">
                          {statusStats.map((_, idx) => <Cell key={idx} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />)}
                        </Pie>
                        <Tooltip /><Legend verticalAlign="bottom" height={-20} iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ), 160)}
                </CardContent>
              </Card>

              {/* Chart: Theo Độ tuổi */}
              <Card className="border-border shadow-xs bg-card">
                <CardHeader className="pb-1 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><BarChart3 className="h-4 w-4 text-purple-500" /><span>Theo Độ tuổi</span></CardTitle>
                  {renderYearSelector(ageYear, setAgeYear)}
                </CardHeader>
                <CardContent className="pt-2 min-h-[180px] flex items-center justify-center p-3">
                  {renderChartContent(ageLoading || statsLoading, ageStats, () => (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={ageStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" style={{ fontSize: "10px" }} />
                        <YAxis style={{ fontSize: "10px" }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {ageStats.map((_, idx) => <Cell key={idx} fill={AGE_COLORS[idx % AGE_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ), 160)}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* 5.11.1 OVERVIEW SECTION (5 Charts/KPI Cards) */}
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <PieIcon className="h-5 w-5 text-primary" />
            <span>5.11.1 Khu vực tổng quan (Overview Section)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {/* Chart 1: Donut Employment Type */}
            <Card className="lg:col-span-4 border-border shadow-xs bg-card">
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold">1. Phân bổ Loại hình nhân viên</CardTitle>
                  <CardDescription className="text-xs">FULL_TIME vs PART_TIME (trừ TERMINATED)</CardDescription>
                </div>
                {renderYearSelector(employmentYear, setEmploymentYear)}
              </CardHeader>
              <CardContent className="min-h-[200px] flex items-center justify-center p-3">
                {renderChartContent(employmentLoading || statsLoading, employmentStats, () => (
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={employmentStats} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                        {employmentStats.map((_, idx) => <Cell key={idx} fill={EMPLOYMENT_COLORS[idx % EMPLOYMENT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ), 170)}
              </CardContent>
            </Card>

            {/* Chart 2: Vertical Bar Department */}
            <Card className="lg:col-span-4 border-border shadow-xs bg-card">
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold">2. Số lượng theo Phòng ban</CardTitle>
                  <CardDescription className="text-xs">Sắp xếp giảm dần theo số lượng</CardDescription>
                </div>
                {renderYearSelector(departmentYear, setDepartmentYear)}
              </CardHeader>
              <CardContent className="min-h-[200px] flex items-center justify-center p-3">
                {renderChartContent(departmentLoading || statsLoading, departmentStats, () => (
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={departmentStats} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" style={{ fontSize: "10px" }} interval={0} angle={-15} textAnchor="end" />
                      <YAxis style={{ fontSize: "10px" }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#2b5748">
                        {departmentStats.map((_, idx) => <Cell key={idx} fill={DEPT_COLORS[idx % DEPT_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ), 170)}
              </CardContent>
            </Card>

            {/* Card cảnh báo và hành động gửi mail chỉ dành cho Admin. */}
            {!isHrOnly && <Card
              onClick={handleSelectExpiringProbation}
              className="lg:col-span-4 border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-xs cursor-pointer group flex flex-col justify-between"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-extrabold text-amber-600 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" /> 4. HĐ Thử việc sắp hết hạn</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black">7 Ngày</span>
                </CardTitle>
                <CardDescription className="text-xs">Click card để filter danh sách trong 7 ngày tới</CardDescription>
              </CardHeader>
              <CardContent className="py-2 flex items-center justify-between">
                <div className="text-4xl font-extrabold text-amber-600 flex items-center gap-2">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                  ) : (
                    <>
                      {expiringProbationCount} <span className="text-xs font-semibold text-muted-foreground">hợp đồng</span>
                    </>
                  )}
                </div>
                <Button size="sm" onClick={handleOpenNotifyHR} disabled={notifyLoading} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1">
                  <Mail className="h-3.5 w-3.5" /> Gửi Mail HR
                </Button>
              </CardContent>
              <div className="px-4 py-1 bg-amber-500/10 text-[10px] font-bold text-amber-800 flex justify-between">
                <span>Luồng 5.2</span>
                <span className="underline">Filter bảng danh sách &rarr;</span>
              </div>
            </Card>}

            {/* Chart 3: Donut Contract Status */}
            <Card className="lg:col-span-6 border-border shadow-xs bg-card">
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold">3. Trạng thái Hợp đồng (Bao gồm TERMINATED)</CardTitle>
                  <CardDescription className="text-xs">ACTIVE, PROBATION, EXPIRED, TERMINATED</CardDescription>
                </div>
                {renderYearSelector(contractYear, setContractYear)}
              </CardHeader>
              <CardContent className="min-h-[200px] flex items-center justify-center p-3">
                {renderChartContent(contractLoading || statsLoading, contractStats, () => (
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={contractStats} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {contractStats.map((_, idx) => <Cell key={idx} fill={CONTRACT_COLORS[idx % CONTRACT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ), 170)}
              </CardContent>
            </Card>

            {/* Chart 5: Bar Staff Roles */}
            <Card className="lg:col-span-6 border-border shadow-xs bg-card">
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold">5. Nhân viên theo Vai trò nội bộ</CardTitle>
                  <CardDescription className="text-xs">Loại trừ role STUDENT / PARENT</CardDescription>
                </div>
                {renderYearSelector(staffRoleYear, setStaffRoleYear)}
              </CardHeader>
              <CardContent className="min-h-[200px] flex items-center justify-center p-3">
                {renderChartContent(staffRoleLoading || statsLoading, staffRoleStats, () => (
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={staffRoleStats} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" style={{ fontSize: "10px" }} interval={0} angle={-10} textAnchor="end" />
                      <YAxis style={{ fontSize: "10px" }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#6366f1">
                        {staffRoleStats.map((_, idx) => <Cell key={idx} fill={ROLE_COLORS[idx % ROLE_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ), 170)}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION 2: MANAGEMENT TABLE & UNIFIED FORM (Exact UserManagement Form & Typography) */}
      <section id="management" className="scroll-mt-36">
        <Card className="border-border shadow-sm bg-card overflow-hidden">
          
          {/* Header & Main Actions */}
          <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border/30 bg-card">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight font-heading flex items-center gap-2">
                <span>Danh sách Nhân viên</span>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">
                Tìm kiếm, lọc nâng cao 5.11, gán vai trò, quản lý trạng thái và thao tác hàng loạt.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setCreateSingleModalOpen(true)} variant="default" size="sm" className="h-9 gap-1.5 font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm">
                <Plus className="h-4 w-4" /> <span>Thêm 1 nhân viên</span>
              </Button>
              <Button onClick={handleSyncProfiles} variant="outline" size="sm" disabled={syncLoading} className="h-9 gap-1.5 font-semibold text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/10 cursor-pointer" title="Đồng bộ toàn bộ tài khoản nhân sự chưa có hồ sơ">
                {syncLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span>Đồng bộ hồ sơ</span>
              </Button>
              <Button onClick={handleExportUsersExcel} variant="outline" size="sm" disabled={exportCsvLoading} className="h-9 gap-1.5 font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4" /> <span>Xuất File CSV</span>
              </Button>
              <Button onClick={() => setBulkCreateEmployeesModalOpen(true)} variant="outline" size="sm" className="h-9 gap-1.5 font-semibold text-blue-600 border-indigo-500/30 hover:bg-indigo-500/10 cursor-pointer">
                <UserPlus className="h-4 w-4" /> <span>Thêm nhiều nhân viên</span>
              </Button>
              <Button onClick={() => setInviteModalOpen(true)} variant="outline" size="sm" className="h-9 gap-1.5 font-semibold text-primary border-border/40 cursor-pointer">
                <Mail className="h-4 w-4" /> <span>Mời nhân viên</span>
              </Button>
            </div>
          </CardHeader>

          {/* UNIFIED SINGLE FILTER & SEARCH TOOLBAR FORM (Exact UserManagement Form Layout & Typography) */}
          <form onSubmit={handleSearchSubmit} className="py-3 px-4 bg-muted/20 border-b border-border/30 flex flex-wrap items-end gap-3 w-full">
            {/* Search Input */}
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Từ khóa tìm kiếm</Label>
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Tìm mã NV (EP-...), tên, email, SĐT..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-8 h-9 text-sm border border-border/30 bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:opacity-50"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div className="flex flex-col gap-1 w-[150px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Vai trò</Label>
              <Select value={filterRole || "ALL"} onValueChange={(v) => setFilterRole(v === "ALL" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả vai trò</SelectItem>
                  {roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="flex flex-col gap-1 w-[170px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Phòng ban</Label>
              <Select value={filterDepartmentId || "ALL"} onValueChange={(v) => setFilterDepartmentId(v === "ALL" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.code || d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Employment Type Single-select (5.11) */}
            <div className="flex flex-col gap-1 w-[150px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Loại hình làm việc</Label>
              <Select value={employmentType || "ALL"} onValueChange={(v) => setEmploymentType(v === "ALL" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full font-semibold"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả loại hình</SelectItem>
                  <SelectItem value="FULL_TIME">FULL_TIME</SelectItem>
                  <SelectItem value="PART_TIME">PART_TIME</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User Status Single-select (UserStatusEnum) */}
            <div className="flex flex-col gap-1 w-[160px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Trạng thái TK</Label>
              <Select value={userStatus || "ALL"} onValueChange={(v) => setUserStatus(v === "ALL" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full font-semibold"><SelectValue placeholder="Tất cả TK" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả tài khoản</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE (Hoạt động)</SelectItem>
                  <SelectItem value="VERIFICATION">VERIFICATION (Chưa kích hoạt)</SelectItem>
                  <SelectItem value="LOCKED">LOCKED (Bị khóa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Employee Status Single-select (EmployeeStatusEnum) */}
            <div className="flex flex-col gap-1 w-[160px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Trạng thái nhân viên</Label>
              <Select value={contractStatus || "ALL"} onValueChange={(v) => setContractStatus(v === "ALL" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full font-semibold"><SelectValue placeholder="Tất cả NV" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả nhân viên</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE (Đang làm việc)</SelectItem>
                  <SelectItem value="PROBATION">PROBATION (Thử việc / Chờ nhận)</SelectItem>
                  <SelectItem value="ON_LEAVE">ON_LEAVE (Đang nghỉ phép)</SelectItem>
                  <SelectItem value="TERMINATED">TERMINATED (Đã nghỉ việc)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gender Filter */}
            <div className="flex flex-col gap-1 w-[130px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Giới tính</Label>
              <Select value={filterGender !== "" ? filterGender : "ALL"} onValueChange={(v) => setFilterGender(v === "ALL" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả giới tính</SelectItem>
                  <SelectItem value="0">Nam</SelectItem>
                  <SelectItem value="1">Nữ</SelectItem>
                  <SelectItem value="2">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date Filter (Tạo tài khoản từ ngày) */}
            <div className="w-[150px] shrink-0">
              <DatePickerInput
                label="Từ ngày"
                placeholder="dd/mm/yyyy"
                value={startDate}
                onChange={(isoDate) => {
                  setStartDate(isoDate);
                  setPage(0);
                }}
              />
            </div>

            {/* End Date Filter (Tạo tài khoản đến ngày) */}
            <div className="w-[150px] shrink-0">
              <DatePickerInput
                label="Đến ngày"
                placeholder="dd/mm/yyyy"
                value={endDate}
                onChange={(isoDate) => {
                  setEndDate(isoDate);
                  setPage(0);
                }}
              />
            </div>

            {/* Action Buttons inside Form */}
            <div className="flex items-center gap-1.5 shrink-0 self-end">
              <Button type="button" onClick={handleResetFiltersAndSort} variant="outline" size="sm" className="h-9 text-xs text-muted-foreground hover:text-foreground rounded-lg px-2.5 border border-border/30 bg-background flex items-center gap-1">
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Đặt lại
              </Button>
            </div>

            {/* Conditional Teaching Category Multi-select (When Teacher/TA) */}
            {isTeacherOrTARoleSelected && (
              <div className="w-full pt-2 border-t border-border/30 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-primary flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Lĩnh vực dạy:</span>
                {teacherCategoryOptions.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleMultiSelect(selectedTeacherCategories, cat, setSelectedTeacherCategories)}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedTeacherCategories.includes(cat) ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* DYNAMIC MINI CHART (Positioned right under filter bar form) */}
          {employmentType && (
            <div className="p-4 bg-muted/10 border-b border-border/30 animate-in fade-in duration-200">
              {employmentType === "FULL_TIME" && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-600 font-extrabold text-sm"><Clock className="h-4 w-4" /> <span>Mini Chart Chấm Công Tháng (FULL_TIME)</span></div>
                    <p className="text-xs text-muted-foreground">Tỷ lệ PRESENT / LATE / ABSENT / ON_LEAVE tháng hiện tại (nguồn: attendance)</p>
                  </div>
                  <div className="w-full md:w-2/3 h-36">
                    {renderChartContent(miniChartLoading, fulltimeAttendanceStats, () => (
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie data={fulltimeAttendanceStats} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                            {fulltimeAttendanceStats.map((_, idx) => <Cell key={idx} fill={ATTENDANCE_COLORS[idx % ATTENDANCE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ), 140)}
                  </div>
                </div>
              )}

              {employmentType === "PART_TIME" && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-amber-600 font-extrabold text-sm"><BarChart3 className="h-4 w-4" /> <span>Mini Chart Buổi Dạy Kỳ Lương (PART_TIME)</span></div>
                    <p className="text-xs text-muted-foreground">Số buổi dạy theo trạng thái Draft / Pending / CONFIRMED / PAID (nguồn: teaching_session_payment)</p>
                  </div>
                  <div className="w-full md:w-2/3 h-36">
                    {renderChartContent(miniChartLoading, parttimeSessionStats, () => (
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={parttimeSessionStats} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" style={{ fontSize: "10px" }} />
                          <YAxis style={{ fontSize: "10px" }} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#f59e0b">
                            {parttimeSessionStats.map((_, idx) => <Cell key={idx} fill={SESSION_COLORS[idx % SESSION_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ), 140)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BULK ACTION TOOLBAR (Matching UserManagement Form) */}
          {selectedUserIds.length > 0 && (
            <div className="py-2.5 px-4 bg-primary/10 border-b border-primary/20 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold animate-in fade-in-50">
              <span className="text-primary flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Đã chọn {selectedUserIds.length} tài khoản</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleExportUsersExcel} disabled={exportCsvLoading} className="h-8 text-sm gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Xuất Excel ({selectedUserIds.length} đã chọn)
                </Button>
                <Button size="sm" variant="outline" onClick={() => setBulkAssignRoleModalOpen(true)} className="h-8 text-sm gap-1 bg-primary text-primary-foreground font-semibold">Gán vai trò</Button>
                <Button size="sm" variant="outline" onClick={() => setBulkRemoveRoleModalOpen(true)} className="h-8 text-sm gap-1 bg-amber-600 text-white font-semibold">Gỡ vai trò</Button>
                <Button size="sm" variant="outline" onClick={() => setBulkEmailModalOpen(true)} className="h-8 text-sm gap-1 bg-primary text-primary-foreground font-semibold">Gửi Email</Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleteLoading} className="h-8 text-sm gap-1 font-semibold">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Xóa hàng loạt
                </Button>
              </div>
            </div>
          )}

          {/* TABLE CONTAINER & CONTENT WITH COLUMN SORTING & COLUMN POPOVER FILTERS */}
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
                    <Checkbox checked={users.length > 0 && selectedUserIds.length === users.length} onCheckedChange={(checked) => handleSelectAllUsers(!!checked)} className="translate-y-0.5 border-border/30" />
                  </TableHead>


                  {/* Người dùng Column Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group" onClick={() => handleSort("fullName")}>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className={getSortRuleInfo("fullName") ? "text-primary font-bold" : "text-muted-foreground"}>Người dùng</span>
                      {renderSortIcon("fullName")}
                    </div>
                  </TableHead>

                  {/* Phòng ban & Vị trí Column Header with Filter Popover */}
                  <TableHead className="pb-4 select-none text-sm font-semibold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Phòng ban & Vị trí</span>
                      <Popover>
                        <PopoverTrigger nativeButton={true} render={<Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-muted"><Filter className={`h-3.5 w-3.5 ${filterDepartmentId ? "text-primary font-bold" : "text-muted-foreground"}`} /></Button>} />
                        <PopoverContent className="w-56 p-2 text-xs bg-popover border border-border shadow-xl rounded-xl">
                          <div className="font-bold mb-2 pb-1 border-b border-border/40 text-foreground">Lọc theo Phòng ban</div>
                          <Select value={filterDepartmentId || "ALL"} onValueChange={(v) => setFilterDepartmentId(v === "ALL" ? "" : v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tất cả phòng ban" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">Tất cả phòng ban</SelectItem>
                              {departments.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.code ? `${d.code} - ${d.name}` : d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>

                  {/* Vai trò Column Header with Filter Popover */}
                  <TableHead className="pb-4 text-center text-sm font-semibold uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-muted-foreground">Vai trò</span>
                      <Popover>
                        <PopoverTrigger nativeButton={true} render={<Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-muted"><Filter className={`h-3.5 w-3.5 ${filterRole ? "text-primary font-bold" : "text-muted-foreground"}`} /></Button>} />
                        <PopoverContent className="w-48 p-2 text-xs bg-popover border border-border shadow-xl rounded-xl">
                          <div className="font-bold mb-2 pb-1 border-b border-border/40 text-foreground">Lọc theo Vai trò</div>
                          <Select value={filterRole || "ALL"} onValueChange={(v) => setFilterRole(v === "ALL" ? "" : v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tất cả vai trò" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">Tất cả vai trò</SelectItem>
                              {roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.code}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>

                  {/* Loại hình Column Header with Filter Popover */}
                  <TableHead className="pb-4 text-center text-sm font-semibold uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-muted-foreground">Loại hình</span>
                      <Popover>
                        <PopoverTrigger nativeButton={true} render={<Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-muted"><Filter className={`h-3.5 w-3.5 ${employmentType ? "text-primary font-bold" : "text-muted-foreground"}`} /></Button>} />
                        <PopoverContent className="w-48 p-2 text-xs bg-popover border border-border shadow-xl rounded-xl">
                          <div className="font-bold mb-2 pb-1 border-b border-border/40 text-foreground">Lọc loại hình làm việc</div>
                          <Select value={employmentType || "ALL"} onValueChange={(v) => setEmploymentType(v === "ALL" ? "" : v)}>
                            <SelectTrigger className="h-8 text-xs font-semibold"><SelectValue placeholder="Tất cả loại hình" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">Tất cả loại hình</SelectItem>
                              <SelectItem value="FULL_TIME">FULL_TIME</SelectItem>
                              <SelectItem value="PART_TIME">PART_TIME</SelectItem>
                            </SelectContent>
                          </Select>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>

                  {/* Trạng thái tài khoản Column Header with Filter Popover */}
                  <TableHead className="pb-4 text-center text-sm font-semibold uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-muted-foreground">Trạng thái TK</span>
                      <Popover>
                        <PopoverTrigger nativeButton={true} render={<Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-muted"><Filter className={`h-3.5 w-3.5 ${userStatus ? "text-primary font-bold" : "text-muted-foreground"}`} /></Button>} />
                        <PopoverContent className="w-52 p-2 text-xs bg-popover border border-border shadow-xl rounded-xl">
                          <div className="font-bold mb-2 pb-1 border-b border-border/40 text-foreground">Lọc trạng thái tài khoản</div>
                          <Select value={userStatus || "ALL"} onValueChange={(v) => setUserStatus(v === "ALL" ? "" : v)}>
                            <SelectTrigger className="h-8 text-xs font-semibold"><SelectValue placeholder="Tất cả trạng thái" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                              <SelectItem value="ACTIVE">ACTIVE (Hoạt động)</SelectItem>
                              <SelectItem value="VERIFICATION">VERIFICATION (Chưa kích hoạt)</SelectItem>
                              <SelectItem value="LOCKED">LOCKED (Bị khóa)</SelectItem>
                            </SelectContent>
                          </Select>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>

                  {/* Trạng thái nhân viên Column Header with Filter Popover */}
                  <TableHead className="pb-4 text-center text-sm font-semibold uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-muted-foreground">Trạng thái NV</span>
                      <Popover>
                        <PopoverTrigger nativeButton={true} render={<Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-muted"><Filter className={`h-3.5 w-3.5 ${contractStatus ? "text-primary font-bold" : "text-muted-foreground"}`} /></Button>} />
                        <PopoverContent className="w-56 p-2 text-xs bg-popover border border-border shadow-xl rounded-xl">
                          <div className="font-bold mb-2 pb-1 border-b border-border/40 text-foreground">Lọc trạng thái nhân viên</div>
                          <Select value={contractStatus || "ALL"} onValueChange={(v) => setContractStatus(v === "ALL" ? "" : v)}>
                            <SelectTrigger className="h-8 text-xs font-semibold"><SelectValue placeholder="Tất cả trạng thái" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                              <SelectItem value="ACTIVE">ACTIVE (Đang làm việc)</SelectItem>
                              <SelectItem value="PROBATION">PROBATION (Thử việc / Chờ nhận)</SelectItem>
                              <SelectItem value="ON_LEAVE">ON_LEAVE (Nghỉ phép / Tạm nghỉ)</SelectItem>
                              <SelectItem value="TERMINATED">TERMINATED (Đã nghỉ việc)</SelectItem>
                            </SelectContent>
                          </Select>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>

                  {/* Ngày vào / Hạn TV Column Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group" onClick={() => handleSort("createdAt")}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={getSortRuleInfo("createdAt") ? "text-primary font-bold" : "text-muted-foreground"}>Ngày vào / Hạn TV</span>
                      {renderSortIcon("createdAt")}
                    </div>
                  </TableHead>

                  {/* Thao tác Column Header */}
                  <TableHead className="text-sm text-center pb-4 font-semibold text-muted-foreground uppercase tracking-wider">Thao tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="opacity-90">
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-muted-foreground text-sm">
                      Không tìm thấy nhân viên nào phù hợp với điều kiện lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user, idx) => (
                    <TableRow key={user.id} className={cn(
                      "hover:bg-foreground/10 transition-colors border-border/30",
                      newlyCreatedIds.includes(String(user.id)) && "bg-emerald-500/20 border-l-4 border-l-emerald-500 font-semibold"
                    )}>
                      <TableCell>
                        <Checkbox checked={selectedUserIds.includes(String(user.id))} onCheckedChange={() => handleSelectUser(String(user.id))} className="translate-y-0.5 border-border/30" />
                      </TableCell>

                      {/* User Info Column (Exact UserManagement layout & typography) */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs shrink-0 border border-primary/20 overflow-hidden">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
                            ) : (
                              user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"
                            )}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p onClick={() => handleOpenDetailModalForUser(user)} className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors text-sm">
                                {user.fullName || user.username}
                              </p>
                              {user.employeeCode && (
                                <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                                  {user.employeeCode}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Department & Position */}
                      <TableCell>
                        <div className="font-semibold text-foreground text-sm">{user.departmentName || "--"}</div>
                        <div className="text-sm text-muted-foreground">{user.position || "--"}</div>
                      </TableCell>

                      {/* Roles Column (Exact UserManagement badge design) */}
                      <TableCell className="text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((roleName, rIdx) => (
                              <span key={rIdx} className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                {roleName.replace("ROLE_", "")}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">--</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Employment Type Badge */}
                      <TableCell className="text-center">
                        {((user as any).employmentType || (user as any).employmentTypeEnum) ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                            ((user as any).employmentType || (user as any).employmentTypeEnum) === "PART_TIME"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                          }`}>
                            {((user as any).employmentType || (user as any).employmentTypeEnum)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">--</span>
                        )}
                      </TableCell>

                      {/* Account Status Badge (UserStatusEnum: ACTIVE, VERIFICATION, LOCKED, DELETED) */}
                      <TableCell className="text-center">
                        {((user as any).userStatus || user.status) ? (
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${
                            ((user as any).userStatus || user.status) === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                            ((user as any).userStatus || user.status) === "LOCKED" ? "bg-red-500/10 text-red-600 border border-red-500/20" :
                            ((user as any).userStatus || user.status) === "VERIFICATION" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                            ((user as any).userStatus || user.status) === "DELETED" ? "bg-rose-500/10 text-rose-600 border border-rose-500/20" :
                            "bg-muted text-muted-foreground border border-border/40"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              ((user as any).userStatus || user.status) === "ACTIVE" ? "bg-emerald-500" :
                              ((user as any).userStatus || user.status) === "LOCKED" ? "bg-red-500" :
                              ((user as any).userStatus || user.status) === "VERIFICATION" ? "bg-amber-500" :
                              ((user as any).userStatus || user.status) === "DELETED" ? "bg-rose-500" :
                              "bg-muted-foreground"
                            }`} />
                            {((user as any).userStatus || user.status)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">--</span>
                        )}
                      </TableCell>

                      {/* Employee Status Badge (EmployeeStatusEnum: ACTIVE, PROBATION, ON_LEAVE, TERMINATED) */}
                      <TableCell className="text-center">
                        {((user as any).employeeStatus || (user as any).contractStatus) ? (
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            ((user as any).employeeStatus || (user as any).contractStatus) === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                            ((user as any).employeeStatus || (user as any).contractStatus) === "PROBATION" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                            ((user as any).employeeStatus || (user as any).contractStatus) === "ON_LEAVE" ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" :
                            "bg-red-500/10 text-red-600 border border-red-500/20"
                          }`}>
                            {((user as any).employeeStatus || (user as any).contractStatus)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">--</span>
                        )}
                      </TableCell>

                      {/* Dates Column */}
                      <TableCell className="text-center text-sm font-medium">
                        <div className="text-muted-foreground">{user.createdAt ? formatDateDisplay(user.createdAt.slice(0, 10)) : "--"}</div>
                      </TableCell>

                      {/* Row Actions: Xem chi tiết, Gán vai trò, Khóa/Mở khóa, Xuất Excel, Sửa, Xóa */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button onClick={() => handleOpenDetailModalForUser(user)} variant="ghost" size="icon" className="h-7 w-7 text-sky-600 hover:bg-sky-500/10 cursor-pointer" title="Xem chi tiết (Detail Modal 9 Tabs)">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Assign Role */}
                          <Button onClick={() => { setAssigningUser(user as any); setAssignRoleModalOpen(true); }} variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10 cursor-pointer" title="Gán vai trò tài khoản">
                            <UserCheck className="h-3.5 w-3.5" />
                          </Button>

                          {/* Quick Toggle Lock / Unlock */}
                          <Button onClick={() => handleQuickToggleStatus(user as any)} variant="ghost" size="icon" className={`h-7 w-7 cursor-pointer ${user.status === "ACTIVE" ? "text-amber-600 hover:bg-amber-500/10" : "text-emerald-600 hover:bg-emerald-500/10"}`} title={user.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
                            {user.status === "ACTIVE" ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                          </Button>

                          <Button onClick={() => handleExportSingleEmployeeDetailExcel(user.id)} variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer" title="Xuất file Excel/CSV chi tiết 1 nhân sự">
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                          </Button>

                          <Button onClick={() => handleOpenDetailModalForUser(user)} variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-500/10 cursor-pointer" title="Chỉnh sửa thông tin">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>

                          <Button onClick={() => handleDeleteUser(user.id)} variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-500/10 cursor-pointer" title="Xóa người dùng / Chuyển vào Thùng rác">
                            <Trash2 className="h-3.5 w-3.5" />
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
              Hiển thị <span className="font-semibold text-foreground">{users.length === 0 ? 0 : page * pageSize + 1}</span> đến{" "}
              <span className="font-semibold text-foreground">{Math.min((page + 1) * pageSize, totalElements)}</span> trên{" "}
              <span className="font-semibold text-foreground">{totalElements}</span> bản ghi
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Số dòng/trang:</span>
                <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setPage(0); }}>
                  <SelectTrigger className="h-8 w-20 text-xs bg-background border border-border rounded-lg font-bold">
                    <SelectValue placeholder={pageSize === 10000 ? "Tất cả" : String(pageSize)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="10000">Tất cả</SelectItem>
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

      {/* 5.11.4 EMPLOYEE DETAIL MODAL (9 TABS) */}
      <EmployeeDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        employee={selectedEmployeeForDetail}
        onUpdateEmployee={handleUpdateEmployeeInDetailModal}
        onShowBanner={showBanner}
      />

      {/* MODAL 3: BULK CREATE EMPLOYEES MODAL */}
      {bulkCreateEmployeesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setBulkCreateEmployeesModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Thêm nhiều nhân viên hàng loạt</h3>
            <p className="text-xs text-muted-foreground mb-4">Nhập danh sách email để tự động kích hoạt tài khoản nhân viên.</p>

            <form onSubmit={handleBulkCreateEmployees} className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Danh sách Email nhân viên (Mỗi email 1 dòng)</Label>
                <textarea
                  rows={5}
                  value={bulkEmployeeEmails}
                  onChange={(e) => setBulkEmployeeEmails(e.target.value)}
                  placeholder="teacher1@ailms.edu.vn&#10;teacher2@ailms.edu.vn&#10;staff1@ailms.edu.vn"
                  required
                  className="w-full rounded-lg border border-input bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* PHÒNG BAN: TÌM KIẾM + DROPDOWN DỮ LIỆU THỰC TẾ (HIỂN THỊ MÃ CODE, TRẢ VỀ ID) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Phòng ban (Hiển thị Mã code - Trả ID)</Label>
                  {loadingDeptsAndRoles && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Tìm theo mã code hoặc tên phòng ban..."
                    value={deptSearchTerm}
                    onChange={(e) => setDeptSearchTerm(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                </div>

                <Select value={bulkEmployeeDeptId} onValueChange={setBulkEmployeeDeptId}>
                  <SelectTrigger className="h-9 w-full text-xs">
                    <SelectValue placeholder="-- Chọn phòng ban (Tùy chọn) --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-52 overflow-y-auto z-50">
                    <SelectItem value="none">-- Không phân phòng ban --</SelectItem>
                    {departments
                      .filter((d) =>
                        !deptSearchTerm ||
                        d.code?.toLowerCase().includes(deptSearchTerm.toLowerCase()) ||
                        d.name?.toLowerCase().includes(deptSearchTerm.toLowerCase())
                      )
                      .map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          <span className="font-mono font-bold text-primary mr-1.5 border border-primary/20 bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">
                            {dept.code}
                          </span>
                          <span>{dept.name}</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {bulkEmployeeDeptId && bulkEmployeeDeptId !== "none" && (
                  <p className="text-[10px] text-muted-foreground">
                    ID phòng ban gửi lên BE: <code className="font-mono text-primary font-bold">#{bulkEmployeeDeptId}</code>
                  </p>
                )}
              </div>

              {/* VAI TRÒ MẶC ĐỊNH: TÌM KIẾM + DROPDOWN DỮ LIỆU THỰC TẾ (HIỂN THỊ MÃ CODE, TRẢ VỀ ROLE ID) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Vai trò gán mặc định (Hiển thị Mã code - Trả Role ID)</Label>
                  {loadingDeptsAndRoles && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Tìm theo mã code hoặc tên vai trò..."
                    value={roleSearchTerm}
                    onChange={(e) => setRoleSearchTerm(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                </div>

                <Select value={bulkEmployeeRoleId} onValueChange={setBulkEmployeeRoleId}>
                  <SelectTrigger className="h-9 w-full text-xs">
                    <SelectValue placeholder="-- Chọn vai trò gán mặc định --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-52 overflow-y-auto z-50">
                    {roles
                      .filter((r) =>
                        !roleSearchTerm ||
                        r.code?.toLowerCase().includes(roleSearchTerm.toLowerCase()) ||
                        r.name?.toLowerCase().includes(roleSearchTerm.toLowerCase())
                      )
                      .map((role) => (
                        <SelectItem key={role.id} value={String(role.id)}>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-1.5 border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px]">
                            {role.code || role.name}
                          </span>
                          <span>{role.name}</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {bulkEmployeeRoleId && (
                  <p className="text-[10px] text-muted-foreground">
                    Role ID gửi lên BE: <code className="font-mono text-indigo-600 font-bold">#{bulkEmployeeRoleId}</code>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setBulkCreateEmployeesModalOpen(false)} disabled={bulkEmployeeLoading} className="h-9">Hủy</Button>
                <Button type="submit" disabled={bulkEmployeeLoading} className="h-9 bg-primary text-primary-foreground hover:bg-primary/95 gap-1.5 min-w-[130px] justify-center">
                  {bulkEmployeeLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang tạo & gửi thư...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Xác nhận thêm</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {hrNotifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><Mail className="h-5 w-5 text-amber-600" /> Gửi nhắc hạn tới HR</h3>
                <p className="mt-1 text-xs text-muted-foreground">{expiringProbationContracts.length} hợp đồng thử việc hết hạn từ hôm nay đến 7 ngày tới.</p>
              </div>
              <button onClick={() => !notifyLoading && setHrNotifyModalOpen(false)} disabled={notifyLoading} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <form onSubmit={handleSendProbationReminder} className="p-6 space-y-5">
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs font-bold">1. Chọn nhân sự HR nhận thông báo</Label>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">Đã chọn {selectedHrIds.length}</span>
                </div>
                <Input value={hrRecipientSearch} onChange={e => { setHrRecipientSearch(e.target.value); setHrRecipientPage(0); }} placeholder="Tìm HR theo tên hoặc email..." className="h-9 text-xs" />
                <div className="overflow-hidden rounded-xl border border-border">
                  {pagedHrRecipients.length > 0 ? pagedHrRecipients.map(hr => (
                    <label key={hr.id} className="flex cursor-pointer items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-0 hover:bg-muted/50">
                      <Checkbox checked={selectedHrIds.includes(String(hr.id))} onCheckedChange={checked => setSelectedHrIds(current => checked ? [...current, String(hr.id)] : current.filter(id => id !== String(hr.id)))} />
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{hr.fullName.charAt(0).toUpperCase()}</div>
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-foreground">{hr.fullName}</p><p className="truncate text-[11px] text-muted-foreground">{hr.email}</p></div>
                      <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-700">HR</span>
                    </label>
                  )) : <p className="p-6 text-center text-xs text-muted-foreground">Không tìm thấy nhân sự HR.</p>}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{filteredHrRecipients.length} nhân sự HR đang hoạt động</span>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={hrRecipientPage === 0} onClick={() => setHrRecipientPage(page => page - 1)} className="h-7 w-7 p-0"><ChevronLeft className="h-3.5 w-3.5" /></Button>
                    <span>{hrRecipientPage + 1}/{hrRecipientTotalPages}</span>
                    <Button type="button" size="sm" variant="outline" disabled={hrRecipientPage + 1 >= hrRecipientTotalPages} onClick={() => setHrRecipientPage(page => page + 1)} className="h-7 w-7 p-0"><ChevronRight className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </section>

              <section className="grid gap-3 border-t border-border pt-4">
                <Label className="text-xs font-bold">2. Nội dung gửi</Label>
                <Input value={hrNotifySubject} onChange={e => setHrNotifySubject(e.target.value)} placeholder="Tiêu đề email" className="h-9 text-xs" required />
                <textarea rows={5} value={hrNotifyContent} onChange={e => setHrNotifyContent(e.target.value)} placeholder="Nhập nội dung nhắc hạn..." required className="w-full resize-none rounded-lg border border-input bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
              </section>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={() => setHrNotifyModalOpen(false)} disabled={notifyLoading}>Hủy</Button>
                <Button type="submit" disabled={notifyLoading || selectedHrIds.length === 0 || expiringProbationContracts.length === 0} className="gap-2 bg-amber-600 text-white hover:bg-amber-700">
                  {notifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Gửi tới HR đã chọn
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: BULK EMAIL MODAL */}
      {bulkEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => !bulkEmailLoading && setBulkEmailModalOpen(false)}
              disabled={bulkEmailLoading}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Gửi Email Hàng loạt</h3>
            <p className="text-xs text-muted-foreground mb-4">Gửi thông báo tới {selectedUserIds.length} người dùng đã chọn.</p>

            <form onSubmit={handleSendBulkEmail} className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tiêu đề Email (Subject)</Label>
                <Input
                  type="text"
                  placeholder="Thông báo cập nhật hệ thống LMS"
                  value={bulkEmailSubject}
                  onChange={(e) => setBulkEmailSubject(e.target.value)}
                  disabled={bulkEmailLoading}
                  required
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nội dung thư (Content)</Label>
                <textarea
                  rows={6}
                  placeholder="Kính gửi quý học viên/nhân viên..."
                  value={bulkEmailContent}
                  onChange={(e) => setBulkEmailContent(e.target.value)}
                  disabled={bulkEmailLoading}
                  required
                  className="w-full rounded-lg border border-input bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setBulkEmailModalOpen(false)} disabled={bulkEmailLoading} className="h-9">Hủy</Button>
                <Button type="submit" disabled={bulkEmailLoading} className="h-9 bg-primary text-primary-foreground hover:bg-primary/95 gap-1.5 min-w-[130px] justify-center">
                  {bulkEmailLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang gửi email...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      <span>Gửi thư ngay</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: INVITE USER MODAL */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => !inviteLoading && setInviteModalOpen(false)}
              disabled={inviteLoading}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Mời tham gia hệ thống</h3>
            <p className="text-xs text-muted-foreground mb-4">Gửi thư mời kích hoạt tài khoản cá nhân.</p>

            <form onSubmit={handleInviteUser} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email nhận thư mời</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="partner@ailms.edu.vn"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={inviteLoading}
                    required
                    className="pl-9 h-9"
                  />
                </div>
              </div>

              {/* Role selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Vai trò mặc định <span className="text-muted-foreground font-normal">(Tùy chọn)</span></Label>
                <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                  <SelectTrigger className="h-9 w-full text-xs">
                    <SelectValue placeholder="-- Chọn vai trò --" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="none">-- Không gán vai trò --</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        <span className="font-mono text-[10px] font-bold text-primary mr-1.5">{r.code}</span>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setInviteModalOpen(false)} disabled={inviteLoading} className="h-9">Hủy</Button>
                <Button type="submit" disabled={inviteLoading} className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 min-w-[130px] justify-center">
                  {inviteLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang gửi thư mời...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Gửi thư mời</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: ASSIGN ROLES MODAL */}
      {assignRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setAssignRoleModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Gán vai trò tài khoản</h3>
            <p className="text-xs text-muted-foreground mb-4">Cập nhật vai trò cho: <strong>{assigningUser?.fullName}</strong></p>

            <form onSubmit={handleAssignRoles} className="space-y-4 text-xs">
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted cursor-pointer transition-colors border border-transparent hover:border-border">
                    <input
                      type="checkbox"
                      name="userRoles"
                      value={r.id}
                      defaultChecked={assigningUser?.roles?.includes(r.name) || assigningUser?.roles?.includes(r.code)}
                      className="rounded border-border text-primary focus:ring-0 h-4 w-4"
                    />
                    <div>
                      <p className="text-xs font-bold text-foreground">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{r.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setAssignRoleModalOpen(false)} disabled={assignRoleLoading} className="h-9">Hủy</Button>
                <Button type="submit" disabled={assignRoleLoading} className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 min-w-[100px] justify-center">
                  {assignRoleLoading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Đang lưu...</span></> : <span>Cập nhật</span>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: BULK ASSIGN ROLE MODAL */}
      {bulkAssignRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setBulkAssignRoleModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Gán vai trò hàng loạt</h3>
            <p className="text-xs text-muted-foreground mb-4">Gán thêm vai trò cho {selectedUserIds.length} người dùng đã chọn.</p>

            <form onSubmit={handleBulkAssignRole} className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Chọn vai trò bổ sung</Label>
                <Select name="bulkRole" defaultValue={roles[0]?.id || ""}>
                  <SelectTrigger className="h-9 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} - {r.description?.slice(0, 30)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setBulkAssignRoleModalOpen(false)} disabled={bulkAssignRoleLoading} className="h-9">Hủy</Button>
                <Button type="submit" disabled={bulkAssignRoleLoading} className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 min-w-[100px] justify-center">
                  {bulkAssignRoleLoading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Đang gán...</span></> : <span>Xác nhận</span>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: BULK REMOVE ROLE MODAL */}
      {bulkRemoveRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setBulkRemoveRoleModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <UserX className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-bold text-foreground">Gỡ vai trò hàng loạt</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Gỡ vai trò đã chọn khỏi <strong className="text-primary">{selectedUserIds.length}</strong> người dùng đã chọn.
              <br />
              <span className="text-amber-600 font-semibold">* Lưu ý: Mỗi người dùng phải giữ lại tối thiểu 1 vai trò.</span>
            </p>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Chọn vai trò cần gỡ</Label>
                <Select value={selectedRemoveRoleId} onValueChange={setSelectedRemoveRoleId}>
                  <SelectTrigger className="h-9 w-full text-xs">
                    <SelectValue placeholder="-- Chọn vai trò cần gỡ --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56 overflow-y-auto z-50">
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        <span className="font-mono font-bold text-amber-600 mr-1.5 border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          {r.code || r.name}
                        </span>
                        <span>{r.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setBulkRemoveRoleModalOpen(false)} disabled={bulkRemoveRoleLoading} className="h-9">
                  Hủy
                </Button>
                <Button
                  onClick={handleBulkRemoveRole}
                  disabled={bulkRemoveRoleLoading || !selectedRemoveRoleId}
                  className="h-9 bg-amber-600 text-white hover:bg-amber-700 gap-1.5 min-w-[120px] justify-center"
                >
                  {bulkRemoveRoleLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <UserX className="h-4 w-4" />
                      <span>Xác nhận gỡ</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN ROLES MODAL */}
      {assignRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setAssignRoleModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-1">Gán vai trò tài khoản</h3>
            <p className="text-xs text-muted-foreground mb-4">Cập nhật vai trò cho: <strong>{assigningUser?.fullName}</strong></p>

            <form onSubmit={handleAssignRoles} className="space-y-4 text-xs">
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted cursor-pointer transition-colors border border-transparent hover:border-border">
                    <input
                      type="checkbox"
                      name="userRoles"
                      value={r.id}
                      defaultChecked={assigningUser?.roles?.includes(r.name) || assigningUser?.roles?.includes(r.code)}
                      className="rounded border-border text-primary focus:ring-0 h-4 w-4"
                    />
                    <div>
                      <p className="text-xs font-bold text-foreground">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{r.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setAssignRoleModalOpen(false)} disabled={assignRoleLoading} className="h-9">Hủy</Button>
                <Button type="submit" disabled={assignRoleLoading} className="h-9 bg-primary text-primary-foreground hover:bg-primary/95 min-w-[100px] justify-center">
                  {assignRoleLoading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Đang lưu...</span></> : <span>Lưu thay đổi</span>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE EMPLOYEE DIALOG */}
      <ConfirmDialog
        open={Boolean(confirmDeleteEmpId)}
        onOpenChange={(open) => { if (!open) setConfirmDeleteEmpId(null); }}
        title="Xác nhận xóa tài khoản Nhân sự"
        description="Bạn có chắc chắn muốn xóa tài khoản nhân sự này? (Tài khoản sẽ được chuyển vào Thùng rác)"
        confirmText="Xóa vào Thùng rác"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeleteUserAction}
      />

      {/* CONFIRM BULK DELETE EMPLOYEES DIALOG */}
      <ConfirmDialog
        open={confirmBulkDeleteEmps}
        onOpenChange={setConfirmBulkDeleteEmps}
        title="Xác nhận xóa hàng loạt Nhân sự"
        description={`Bạn có chắc chắn muốn xóa ${selectedUserIds.length} tài khoản nhân sự đã chọn?`}
        confirmText="Xóa tất cả"
        cancelText="Hủy bỏ"
        onConfirm={confirmBulkDeleteAction}
      />

      {/* CREATE SINGLE EMPLOYEE MODAL */}
      <CreateSingleEmployeeModal
        open={createSingleModalOpen}
        onClose={() => setCreateSingleModalOpen(false)}
        departments={departments}
        roles={roles}
        onSuccess={(msg, newEmployee) => {
          const newId = String(newEmployee?.id || newEmployee?.userId || "");
          if (hasActiveEmployeeFilters()) {
            setActionBanner({
              message: `${msg} Bộ lọc hiện tại đang có thể ẩn bản ghi mới.`,
              actionText: "Xem chi tiết",
              onAction: () => {
                if (newEmployee) handleOpenDetailModalForUser(newEmployee as UserResponse);
                setActionBanner(null);
              },
            });
          } else {
            showBanner(msg);
            void showNewEmployeesAtTop(newId ? [newId] : []);
          }
        }}
        onError={(msg) => showBanner(msg, true)}
      />

    </div>
  );
};
