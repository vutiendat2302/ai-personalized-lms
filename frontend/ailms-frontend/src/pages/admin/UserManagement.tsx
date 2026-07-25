import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { userApi } from "@/api/users/userApi";
import { roleApi } from "@/api/roles/roleApi";
import type {
  UserResponse,
  RoleResponse,
  UserDetailResponse,
  MonthlyUserCountResponse
} from "@/types/admin";
import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit,
  UserCheck,
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
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Filter,
  ArrowUpDown,
  Award,
  BookOpen,
  Star,
  DollarSign,
  ShieldCheck,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp
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
  AreaChart,
  Area
} from "recharts";

// Color palettes for Recharts
const ROLE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1"];
const GENDER_COLORS = ["#0284c7", "#f43f5e", "#64748b"];
const STATUS_COLORS = ["#10b981", "#ef4444", "#f59e0b", "#6366f1"];
const AGE_COLORS = ["#8b5cf6", "#3b82f6", "#06b6d4", "#10b981"];

const MONTH_NAMES = [
  "Thg 1", "Thg 2", "Thg 3", "Thg 4", "Thg 5", "Thg 6",
  "Thg 7", "Thg 8", "Thg 9", "Thg 10", "Thg 11", "Thg 12"
];

export const UserManagement: React.FC = () => {
  // Main Data States
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Stat & Chart States
  const [studentCount, setStudentCount] = useState<number>(0);
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [roleStats, setRoleStats] = useState<Array<{ name: string; value: number }>>([]);
  const [genderStats, setGenderStats] = useState<Array<{ name: string; value: number }>>([]);
  const [statusStats, setStatusStats] = useState<Array<{ name: string; value: number }>>([]);
  const [ageStats, setAgeStats] = useState<Array<{ name: string; value: number }>>([]);
  const [monthlyUsers, setMonthlyUsers] = useState<Array<{ month: string; count: number }>>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showOptionalCharts, setShowOptionalCharts] = useState<boolean>(true);

  // Filters & Sorting
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // UI Banner & Loading
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const [assignRoleModalOpen, setAssignRoleModalOpen] = useState(false);
  const [assigningUser, setAssigningUser] = useState<UserResponse | null>(null);

  const [bulkAssignRoleModalOpen, setBulkAssignRoleModalOpen] = useState(false);
  const [bulkEmailModalOpen, setBulkEmailModalOpen] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState("");
  const [bulkEmailContent, setBulkEmailContent] = useState("");

  const [bulkCreateEmployeesModalOpen, setBulkCreateEmployeesModalOpen] = useState(false);
  const [bulkEmployeeEmails, setBulkEmployeeEmails] = useState("");
  const [bulkEmployeeDeptId, setBulkEmployeeDeptId] = useState("");
  const [bulkEmployeeRoleCode, setBulkEmployeeRoleCode] = useState("ROLE_TEACHER");

  // User Detail Modal
  const [userDetailModalOpen, setUserDetailModalOpen] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetailResponse | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [detailActiveTab, setDetailActiveTab] = useState<"basic" | "system" | "academic" | "work">("basic");

  useEffect(() => {
    fetchRoles();
    fetchStatistics();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, pageSize, filterRole, filterStatus, sortBy, sortDir]);

  useEffect(() => {
    fetchMonthlyNewUsers(selectedYear);
  }, [selectedYear]);

  const showBanner = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(""), 3500);
    } else {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(""), 3500);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await roleApi.getAllRoles();
      if (res.data.success) {
        setRoles(res.data.data);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải danh sách vai trò", true);
    }
  };

  const fetchStatistics = async () => {
    setStatsLoading(true);
    try {
      // 1. Student Count
      const stRes = await userApi.getStudentCount().catch(() => null);
      if (stRes?.data?.success) setStudentCount(stRes.data.data);

      // 2. Employee Count
      const empRes = await userApi.getEmployeeCount().catch(() => null);
      if (empRes?.data?.success) setEmployeeCount(empRes.data.data);

      // 3. Stats by Role
      const roleRes = await userApi.getStatsByRole().catch(() => null);
      if (roleRes?.data?.success && roleRes.data.data) {
        const formatted = Object.entries(roleRes.data.data).map(([key, val]) => ({
          name: key.replace("ROLE_", ""),
          value: Number(val)
        }));
        setRoleStats(formatted);
      }

      // 4. Stats by Gender
      const genderRes = await userApi.getStatsByGender().catch(() => null);
      if (genderRes?.data?.success && genderRes.data.data) {
        const genderMap: Record<string, string> = { "0": "Nam", "1": "Nữ", "2": "Khác" };
        const formatted = Object.entries(genderRes.data.data).map(([key, val]) => ({
          name: genderMap[key] || `Mã ${key}`,
          value: Number(val)
        }));
        setGenderStats(formatted);
      }

      // 5. Stats by Status
      const statusRes = await userApi.getStatsByStatus().catch(() => null);
      if (statusRes?.data?.success && statusRes.data.data) {
        const formatted = Object.entries(statusRes.data.data).map(([key, val]) => ({
          name: key,
          value: Number(val)
        }));
        setStatusStats(formatted);
      }

      // 6. Employee Stats by Age Group
      const ageRes = await userApi.getStatsByAgeGroup().catch(() => null);
      if (ageRes?.data?.success && ageRes.data.data) {
        const formatted = Object.entries(ageRes.data.data).map(([key, val]) => ({
          name: key,
          value: Number(val)
        }));
        setAgeStats(formatted);
      }
    } catch (err: any) {
      console.error("Error fetching stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchMonthlyNewUsers = async (year: number) => {
    try {
      const res = await userApi.getMonthlyNewUsers(year);
      if (res.data.success && Array.isArray(res.data.data)) {
        const fullYearData = MONTH_NAMES.map((monthName, idx) => {
          const found = res.data.data.find((item: MonthlyUserCountResponse) => item.month === idx + 1);
          return {
            month: monthName,
            count: found ? Number(found.count) : 0
          };
        });
        setMonthlyUsers(fullYearData);
      }
    } catch (err: any) {
      console.error("Error fetching monthly users:", err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        size: pageSize,
        sortBy,
        sortDir
      };
      if (searchKeyword.trim()) params.keyword = searchKeyword.trim();
      if (filterRole) params.role = filterRole;
      if (filterStatus) params.status = filterStatus;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await userApi.getUsers(params);
      if (res.data.success) {
        const pageData = res.data.data;
        setUsers(pageData.content || []);
        setTotalPages(pageData.totalPages || 0);
        setTotalElements(pageData.totalElements || 0);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải danh sách người dùng", true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchUsers();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(prev => prev === "ASC" ? "DESC" : "ASC");
    } else {
      setSortBy(field);
      setSortDir("ASC");
    }
    setPage(0);
  };

  const handleViewUserDetail = async (userId: string | number) => {
    setUserDetailLoading(true);
    setUserDetailModalOpen(true);
    setSelectedUserDetail(null);
    setDetailActiveTab("basic");

    try {
      const res = await userApi.getUserDetail(userId);
      if (res.data.success) {
        setSelectedUserDetail(res.data.data);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể lấy chi tiết người dùng", true);
      setUserDetailModalOpen(false);
    } finally {
      setUserDetailLoading(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const fullName = data.get("fullName") as string;
    const phone = data.get("phone") as string;
    const gender = parseInt(data.get("gender") as string);
    const dateOfBirth = data.get("dateOfBirth") as string;

    try {
      if (editingUser) {
        const res = await userApi.updateUser(editingUser.id, { fullName, phone, gender, dateOfBirth });
        if (res.data.success) {
          showBanner("Cập nhật thông tin người dùng thành công!");
          fetchUsers();
        }
      } else {
        const username = data.get("username") as string;
        const email = data.get("email") as string;
        const res = await userApi.createUser({ username, email, fullName, phone, gender, dateOfBirth });
        if (res.data.success) {
          showBanner("Thêm người dùng mới thành công!");
          setPage(0);
          fetchUsers();
          fetchStatistics();
        }
      }
      setUserModalOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      showBanner(err.message || "Lỗi lưu thông tin người dùng", true);
    }
  };

  const handleDeleteUser = async (id: string | number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
      try {
        const res = await userApi.deleteUser(id);
        if (res.data.success) {
          showBanner("Xóa người dùng thành công!");
          fetchUsers();
          fetchStatistics();
          setSelectedUserIds(prev => prev.filter(selectedId => String(selectedId) !== String(id)));
        }
      } catch (err: any) {
        showBanner(err.message || "Lỗi xóa người dùng", true);
      }
    }
  };

  const handleQuickToggleStatus = async (user: UserResponse) => {
    const newStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    try {
      const res = await userApi.updateUser(user.id, {
        fullName: user.fullName,
        phone: user.phone,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : undefined
      });
      if (res.data.success) {
        showBanner(`Đã cập nhật trạng thái người dùng sang ${newStatus}!`);
        fetchUsers();
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể đổi trạng thái người dùng", true);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await userApi.inviteUser({ email: inviteEmail });
      if (res.data.success) {
        showBanner(`Đã gửi thư mời đăng ký đến: ${inviteEmail}`);
        setInviteModalOpen(false);
        setInviteEmail("");
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi gửi thư mời", true);
    }
  };

  const handleAssignRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningUser) return;
    const data = new FormData(e.target as HTMLFormElement);
    const selectedRoles = data.getAll("userRoles") as string[];

    try {
      const res = await userApi.assignRoles(assigningUser.id, { roleIds: selectedRoles.map(id => Number(id)) });
      if (res.data.success) {
        showBanner(`Cập nhật vai trò cho ${assigningUser.fullName} thành công!`);
        fetchUsers();
        setAssignRoleModalOpen(false);
        setAssigningUser(null);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi gán vai trò", true);
    }
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    if (window.confirm(`Bạn có chắc muốn xóa ${selectedUserIds.length} tài khoản đã chọn?`)) {
      try {
        const res = await userApi.bulkDelete({ ids: selectedUserIds });
        if (res.data.success) {
          showBanner("Xóa hàng loạt tài khoản thành công!");
          fetchUsers();
          fetchStatistics();
          setSelectedUserIds([]);
        }
      } catch (err: any) {
        showBanner(err.message || "Lỗi xóa hàng loạt", true);
      }
    }
  };

  const handleBulkAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const targetRole = data.get("bulkRole") as string;

    try {
      const res = await userApi.bulkAssignRole({ userIds: selectedUserIds, roleName: targetRole });
      if (res.data.success) {
        showBanner(`Gán vai trò ${targetRole} thành công cho ${selectedUserIds.length} người dùng!`);
        fetchUsers();
        setBulkAssignRoleModalOpen(false);
        setSelectedUserIds([]);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi gán vai trò hàng loạt", true);
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

    try {
      const res = await userApi.bulkCreateEmployees({
        emails: emailsList,
        departmentId: bulkEmployeeDeptId ? Number(bulkEmployeeDeptId) : undefined,
        roleCode: bulkEmployeeRoleCode
      });
      if (res.data.success) {
        showBanner(`Tạo hàng loạt ${emailsList.length} nhân viên thành công!`);
        setBulkCreateEmployeesModalOpen(false);
        setBulkEmployeeEmails("");
        fetchUsers();
        fetchStatistics();
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi tạo nhân viên hàng loạt", true);
    }
  };

  const handleExportUsersExcel = async () => {
    try {
      showBanner("Đang khởi tạo file xuất Excel...");
      const res = await userApi.exportUsersToExcel({
        keyword: searchKeyword,
        role: filterRole,
        status: filterStatus,
        startDate,
        endDate
      });
      
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Danh_sach_nguoi_dung_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showBanner("Xuất file Excel/CSV thành công!");
    } catch (err: any) {
      showBanner(err.message || "Không thể xuất file Excel", true);
    }
  };

  const handleExportSingleUserDetailExcel = async (userId: string | number) => {
    try {
      showBanner("Đang tải file chi tiết người dùng...");
      const res = await userApi.exportUserDetailToExcel(userId);
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Chi_tiet_nguoi_dung_${userId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showBanner("Xuất file chi tiết thành công!");
    } catch (err: any) {
      showBanner(err.message || "Lỗi xuất file chi tiết người dùng", true);
    }
  };

  const handleSelectAllUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUserIds(users.map(u => String(u.id)));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectUser = (id: string | number) => {
    const strId = String(id);
    if (selectedUserIds.includes(strId)) {
      setSelectedUserIds(selectedUserIds.filter(selectedId => selectedId !== strId));
    } else {
      setSelectedUserIds([...selectedUserIds, strId]);
    }
  };

  return (
    <div className="mx-auto max-w-none w-full px-4 sm:px-6 lg:px-10 py-6 space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Toast Notification Banners */}
      {successBanner && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-emerald-600 text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-rose-600 text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{errorBanner}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <Link to="/dashboard" className="flex items-center gap-1 hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay lại Dashboard</span>
            </Link>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <Users className="h-7 w-7" />
            </div>
            <span>Quản lý Người dùng</span>
          </h1>
        </div>

        {/* Sub Nav Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="default" size="sm" className="h-9 font-bold bg-primary text-primary-foreground">
            <Users className="h-4 w-4 mr-1.5" />
            <span>Người dùng</span>
          </Button>
          <Link to="/admin/roles">
            <Button variant="outline" size="sm" className="h-9 font-semibold hover:bg-muted">
              Vai trò
            </Button>
          </Link>
          <Link to="/admin/permissions">
            <Button variant="outline" size="sm" className="h-9 font-semibold hover:bg-muted">
              Quyền hạn
            </Button>
          </Link>
          <Link to="/admin/courses">
            <Button variant="outline" size="sm" className="h-9 font-semibold hover:bg-muted">
              Khóa học
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Section: Stat Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Stat Box 1: Students */}
        <Card className="border-border shadow-sm hover:shadow-md transition-shadow bg-card overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
            <GraduationCap className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Học viên (Students)
            </CardDescription>
            <CardTitle className="text-3xl font-black text-foreground flex items-center gap-2 mt-1">
              <span>{statsLoading ? "..." : studentCount.toLocaleString()}</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> Student
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Tổng số tài khoản học viên trong hệ thống</p>
          </CardContent>
        </Card>

        {/* Stat Box 2: Employees */}
        <Card className="border-border shadow-sm hover:shadow-md transition-shadow bg-card overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-500">
            <Briefcase className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Nhân viên & Giảng viên (Staff)
            </CardDescription>
            <CardTitle className="text-3xl font-black text-foreground flex items-center gap-2 mt-1">
              <span>{statsLoading ? "..." : employeeCount.toLocaleString()}</span>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <UserCheck className="h-3 w-3" /> Staff
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Tổng số giảng viên & cán bộ nhân viên</p>
          </CardContent>
        </Card>

        {/* Stat Box 3: Total Accounts */}
        <Card className="border-border shadow-sm hover:shadow-md transition-shadow bg-card overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-500">
            <Users className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tổng số tài khoản (Total Users)
            </CardDescription>
            <CardTitle className="text-3xl font-black text-foreground flex items-center gap-2 mt-1">
              <span>{totalElements.toLocaleString()}</span>
              <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Hệ thống
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Tài khoản ghi nhận trên hệ thống</p>
          </CardContent>
        </Card>

        {/* Stat Box 4: Active Ratio */}
        <Card className="border-border shadow-sm hover:shadow-md transition-shadow bg-card overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500">
            <ShieldCheck className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Trạng thái Hoạt động
            </CardDescription>
            <CardTitle className="text-3xl font-black text-foreground flex items-center gap-2 mt-1">
              <span>
                {statusStats.find(s => s.name === "ACTIVE")?.value || totalElements}
              </span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Active
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Tài khoản đang sẵn sàng hoạt động</p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Main Charts (Pie & Line Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pie Chart: Distribution by Role */}
        <Card className="lg:col-span-5 border-border shadow-sm bg-card flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold">Cơ cấu theo Vai trò</CardTitle>
              </div>
              <span className="text-[11px] font-semibold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                Pie Chart
              </span>
            </div>
            <CardDescription className="text-xs">
              Tỷ lệ phân bổ tài khoản người dùng theo vai trò hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex items-center justify-center min-h-[280px]">
            {roleStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={roleStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {roleStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} người dùng`, "Số lượng"]}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-8">
                Đang tải dữ liệu biểu đồ vai trò...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Chart: Monthly New Users */}
        <Card className="lg:col-span-7 border-border shadow-sm bg-card flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-base font-bold">Người dùng mới theo tháng</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Năm:</Label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
              </div>
            </div>
            <CardDescription className="text-xs">
              Thống kê lượng người dùng mới đăng ký từng tháng trong năm {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex items-center justify-center min-h-[280px]">
            {monthlyUsers.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyUsers} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMonthlyCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickLine={false} style={{ fontSize: "11px" }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: "11px" }} />
                  <Tooltip
                    formatter={(val: any) => [`${val} tài khoản mới`, "Số lượng"]}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMonthlyCount)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-8">
                Đang tải dữ liệu biểu đồ người dùng mới...
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Optional Collapsible Combined Charts Section (Giới tính, Trạng thái, Độ tuổi) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setShowOptionalCharts(!showOptionalCharts)}
            variant="ghost"
            size="sm"
            className="text-xs font-bold gap-2 text-muted-foreground hover:text-foreground p-0 h-auto"
          >
            {showOptionalCharts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span>Biểu đồ gộp bổ sung (Giới tính, Trạng thái, Độ tuổi)</span>
          </Button>
        </div>

        {showOptionalCharts && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in-50 duration-200">
            
            {/* Chart: Users by Gender */}
            <Card className="border-border shadow-sm bg-card">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <PieIcon className="h-4 w-4 text-sky-500" />
                  <span>Theo Giới tính</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 min-h-[200px] flex items-center justify-center">
                {genderStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={genderStats}
                        cx="50%"
                        cy="50%"
                        outerRadius={65}
                        dataKey="value"
                      >
                        {genderStats.map((_, idx) => (
                          <Cell key={`gender-${idx}`} fill={GENDER_COLORS[idx % GENDER_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v} người`, "Số lượng"]} />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground">Không có dữ liệu giới tính</p>
                )}
              </CardContent>
            </Card>

            {/* Chart: Users by Status */}
            <Card className="border-border shadow-sm bg-card">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <PieIcon className="h-4 w-4 text-emerald-500" />
                  <span>Theo Trạng thái</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 min-h-[200px] flex items-center justify-center">
                {statusStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={statusStats}
                        cx="50%"
                        cy="50%"
                        outerRadius={65}
                        dataKey="value"
                      >
                        {statusStats.map((_, idx) => (
                          <Cell key={`status-${idx}`} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v} tài khoản`, "Số lượng"]} />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground">Không có dữ liệu trạng thái</p>
                )}
              </CardContent>
            </Card>

            {/* Chart: Employees by Age Group */}
            <Card className="border-border shadow-sm bg-card">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  <span>Độ tuổi Nhân viên</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 min-h-[200px] flex items-center justify-center">
                {ageStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={ageStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" style={{ fontSize: "10px" }} />
                      <YAxis style={{ fontSize: "10px" }} />
                      <Tooltip formatter={(v: any) => [`${v} nhân viên`, "Số lượng"]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {ageStats.map((_, idx) => (
                          <Cell key={`age-${idx}`} fill={AGE_COLORS[idx % AGE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground">Chưa có thống kê độ tuổi</p>
                )}
              </CardContent>
            </Card>

          </div>
        )}
      </div>

      {/* Main Table Container */}
      <Card className="border-border shadow-sm bg-card overflow-hidden">
        
        {/* Table Header & Quick Action Buttons */}
        <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border bg-card">
          <div>
            <CardTitle className="text-xl font-black tracking-tight font-heading flex items-center gap-2">
              <span>Danh sách Người dùng Hệ thống</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Tìm kiếm, lọc nâng cao, gán vai trò, quản lý trạng thái và thao tác hàng loạt.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Export CSV/Excel Button */}
            <Button
              onClick={handleExportUsersExcel}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Xuất Excel / CSV</span>
            </Button>

            {/* Bulk Add Employees Button */}
            <Button
              onClick={() => setBulkCreateEmployeesModalOpen(true)}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 font-semibold text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/10"
            >
              <UserPlus className="h-4 w-4" />
              <span>Thêm nhân viên</span>
            </Button>

            {/* Invite Button */}
            <Button
              onClick={() => setInviteModalOpen(true)}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 font-semibold"
            >
              <Mail className="h-4 w-4 text-primary" />
              <span>Mời nhân viên</span>
            </Button>

            {/* Add New User */}
            <Button
              onClick={() => { setEditingUser(null); setUserModalOpen(true); }}
              variant="default"
              size="sm"
              className="h-9 gap-1.5 font-semibold bg-primary text-primary-foreground hover:bg-primary/95 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo tài khoản</span>
            </Button>
          </div>
        </CardHeader>

        {/* Toolbar: Search, Filters & Date Pickers */}
        <form onSubmit={handleSearchSubmit} className="p-4 bg-muted/20 border-b border-border/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3">
          
          {/* Keyword Search */}
          <div className="relative lg:col-span-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo Tên, Username, Email, SĐT..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="lg:col-span-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none"
          >
            <option value="">Tất cả vai trò</option>
            {roles.map((r) => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="lg:col-span-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">ACTIVE (Đang hoạt động)</option>
            <option value="INACTIVE">INACTIVE (Ngưng hoạt động)</option>
            <option value="BLOCKED">BLOCKED (Đã khóa)</option>
            <option value="PENDING">PENDING (Chờ xác nhận)</option>
          </select>

          {/* Start Date Filter */}
          <input
            type="date"
            title="Từ ngày tạo"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="lg:col-span-1.5 px-2 py-1.5 rounded-lg border border-border bg-background text-xs outline-none"
          />

          {/* Filter Submit Button */}
          <div className="lg:col-span-2.5 flex items-center gap-2">
            <Button type="submit" size="sm" className="h-8 font-semibold bg-muted text-foreground hover:bg-muted/80 flex-1 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1" /> Tìm kiếm
            </Button>
            {(searchKeyword || filterRole || filterStatus || startDate || endDate) && (
              <Button
                type="button"
                onClick={() => {
                  setSearchKeyword("");
                  setFilterRole("");
                  setFilterStatus("");
                  setStartDate("");
                  setEndDate("");
                  setPage(0);
                }}
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
              >
                Xóa lọc
              </Button>
            )}
          </div>

        </form>

        {/* Batch Operations Bar (Trục thao tác hàng loạt khi chọn checkbox) */}
        {selectedUserIds.length > 0 && (
          <div className="px-4 py-2.5 bg-primary/10 border-b border-primary/20 flex flex-wrap items-center justify-between gap-3 animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span>Đã chọn {selectedUserIds.length} tài khoản</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              
              {/* Bulk Assign Role */}
              <Button
                onClick={() => setBulkAssignRoleModalOpen(true)}
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 bg-background"
              >
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                <span>Gán vai trò</span>
              </Button>

              {/* Bulk Send Email */}
              <Button
                onClick={() => setBulkEmailModalOpen(true)}
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 bg-background"
              >
                <Mail className="h-3.5 w-3.5 text-sky-600" />
                <span>Gửi Email</span>
              </Button>

              {/* Bulk Delete */}
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                size="sm"
                className="h-8 text-xs gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa chọn</span>
              </Button>

              <Button
                onClick={() => setSelectedUserIds([])}
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
              >
                Bỏ chọn
              </Button>

            </div>
          </div>
        )}

        {/* Table Content */}
        <CardContent className="p-0 relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center z-20">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/85 text-muted-foreground font-semibold bg-muted/20 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selectedUserIds.length === users.length}
                      onChange={handleSelectAllUsers}
                      className="rounded border-border text-primary focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-2 w-10 text-center">STT</th>
                  
                  <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort("fullName")}>
                    <div className="flex items-center gap-1">
                      <span>Người dùng</span>
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </div>
                  </th>

                  <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort("email")}>
                    <div className="flex items-center gap-1">
                      <span>Liên hệ</span>
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </div>
                  </th>

                  <th className="py-3 px-3">Vai trò</th>

                  <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort("status")}>
                    <div className="flex items-center gap-1">
                      <span>Trạng thái</span>
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </div>
                  </th>

                  <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort("createdAt")}>
                    <div className="flex items-center gap-1">
                      <span>Ngày tham gia</span>
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </div>
                  </th>

                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/60">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                      Không tìm thấy tài khoản người dùng nào thỏa mãn.
                    </td>
                  </tr>
                ) : (
                  users.map((u, index) => (
                    <tr key={u.id || index} className="hover:bg-muted/15 transition-colors">
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(String(u.id))}
                          onChange={() => handleSelectUser(u.id)}
                          className="rounded border-border text-primary focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-2 text-center font-bold text-muted-foreground text-[11px]">
                        {page * pageSize + index + 1}
                      </td>

                      {/* User Info Column */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-extrabold flex items-center justify-center text-xs shrink-0 border border-primary/20 overflow-hidden">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.fullName} className="h-full w-full object-cover" />
                            ) : (
                              u.fullName ? u.fullName.charAt(0).toUpperCase() : "U"
                            )}
                          </div>
                          <div>
                            <p
                              onClick={() => handleViewUserDetail(u.id)}
                              className="font-bold text-foreground hover:text-primary cursor-pointer transition-colors"
                            >
                              {u.fullName || "Chưa cập nhật"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">@{u.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info Column */}
                      <td className="py-3 px-3 text-[11px]">
                        <p className="font-semibold text-foreground">{u.email}</p>
                        <p className="text-muted-foreground">{u.phone || "SĐT: N/A"}</p>
                      </td>

                      {/* Roles Column */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles && u.roles.length > 0 ? (
                            u.roles.map((roleName, rIdx) => (
                              <span
                                key={rIdx}
                                className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-extrabold uppercase border border-primary/20"
                              >
                                {roleName.replace("ROLE_", "")}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Chưa phân vai trò</span>
                          )}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                          u.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : u.status === "BLOCKED"
                            ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            u.status === "ACTIVE" ? "bg-emerald-500" : u.status === "BLOCKED" ? "bg-rose-500" : "bg-amber-500"
                          }`} />
                          {u.status || "ACTIVE"}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-3 text-muted-foreground text-[11px]">
                        {u.createdAt ? u.createdAt.slice(0, 10) : "N/A"}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          
                          {/* Detail Button */}
                          <Button
                            onClick={() => handleViewUserDetail(u.id)}
                            variant="ghost"
                            size="icon"
                            title="Xem chi tiết đầy đủ"
                            className="h-7 w-7 text-sky-600 hover:bg-sky-500/10"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Assign Role */}
                          <Button
                            onClick={() => { setAssigningUser(u); setAssignRoleModalOpen(true); }}
                            variant="ghost"
                            size="icon"
                            title="Gán vai trò"
                            className="h-7 w-7 text-primary hover:bg-primary/10"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                          </Button>

                          {/* Quick Toggle Lock / Unlock */}
                          <Button
                            onClick={() => handleQuickToggleStatus(u)}
                            variant="ghost"
                            size="icon"
                            title={u.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                            className={`h-7 w-7 ${
                              u.status === "ACTIVE" ? "text-amber-600 hover:bg-amber-500/10" : "text-emerald-600 hover:bg-emerald-500/10"
                            }`}
                          >
                            {u.status === "ACTIVE" ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                          </Button>

                          {/* Edit User */}
                          <Button
                            onClick={() => { setEditingUser(u); setUserModalOpen(true); }}
                            variant="ghost"
                            size="icon"
                            title="Chỉnh sửa thông tin"
                            className="h-7 w-7 text-muted-foreground hover:bg-muted"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>

                          {/* Delete User */}
                          <Button
                            onClick={() => handleDeleteUser(u.id)}
                            variant="ghost"
                            size="icon"
                            title="Xóa tài khoản"
                            className="h-7 w-7 text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/10">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Tổng số: <strong>{totalElements}</strong> người dùng
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Số bản ghi/trang:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="px-2 py-0.5 rounded border border-border bg-background text-xs font-semibold"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              disabled={page === 0}
              onClick={() => setPage(prev => prev - 1)}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold"
            >
              Trang trước
            </Button>

            <span className="text-xs font-bold py-1 px-3 bg-muted rounded-md border border-border">
              {page + 1} / {totalPages || 1}
            </span>

            <Button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(prev => prev + 1)}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold"
            >
              Trang sau
            </Button>
          </div>
        </div>
      </Card>

      {/* MODAL 1: USER DETAIL DRAWER / MODAL */}
      {userDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden relative animate-in fade-in-50 zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Eye className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Hồ sơ Chi tiết Người dùng</h3>
                  <p className="text-xs text-muted-foreground">Mã ID: #{selectedUserDetail?.userAccount?.id || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedUserDetail?.userAccount?.id && (
                  <Button
                    onClick={() => handleExportSingleUserDetailExcel(selectedUserDetail.userAccount.id)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 text-emerald-600 border-emerald-500/30"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Xuất CSV</span>
                  </Button>
                )}
                <button
                  onClick={() => setUserDetailModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center border-b border-border px-5 bg-card gap-4 overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setDetailActiveTab("basic")}
                className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  detailActiveTab === "basic" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Cơ bản & Tài khoản</span>
              </button>

              <button
                onClick={() => setDetailActiveTab("system")}
                className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  detailActiveTab === "system" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Thông tin Hệ thống</span>
              </button>

              {selectedUserDetail?.studentProfile && (
                <button
                  onClick={() => setDetailActiveTab("academic")}
                  className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                    detailActiveTab === "academic" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Học viên (Academic)</span>
                </button>
              )}

              {selectedUserDetail?.employeeProfile && (
                <button
                  onClick={() => setDetailActiveTab("work")}
                  className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                    detailActiveTab === "work" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Nhân viên / Giảng viên</span>
                </button>
              )}
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {userDetailLoading ? (
                <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <span>Đang tải thông tin chi tiết người dùng...</span>
                </div>
              ) : selectedUserDetail ? (
                <>
                  {/* TAB 1: BASIC & ACCOUNT */}
                  {detailActiveTab === "basic" && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border">
                        <div className="h-16 w-16 rounded-full bg-primary/10 text-primary font-black text-xl flex items-center justify-center border border-primary/20 shrink-0">
                          {selectedUserDetail.userAccount?.fullName?.charAt(0) || "U"}
                        </div>
                        <div>
                          <h4 className="text-base font-extrabold text-foreground">{selectedUserDetail.userAccount?.fullName}</h4>
                          <p className="text-muted-foreground font-mono">@{selectedUserDetail.userAccount?.username}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {selectedUserDetail.userAccount?.roles?.map((r, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold">
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Email:</span>
                          <p className="font-bold text-foreground mt-0.5">{selectedUserDetail.userAccount?.email}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Số điện thoại:</span>
                          <p className="font-bold text-foreground mt-0.5">{selectedUserDetail.userAccount?.phone || "Chưa cập nhật"}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Giới tính:</span>
                          <p className="font-bold text-foreground mt-0.5">
                            {selectedUserDetail.userAccount?.gender === 0 ? "Nam" : selectedUserDetail.userAccount?.gender === 1 ? "Nữ" : "Khác"}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Ngày sinh:</span>
                          <p className="font-bold text-foreground mt-0.5">
                            {selectedUserDetail.userAccount?.dateOfBirth ? selectedUserDetail.userAccount.dateOfBirth.slice(0,10) : "Chưa cập nhật"}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Trạng thái tài khoản:</span>
                          <p className="font-bold text-emerald-600 mt-0.5">{selectedUserDetail.userAccount?.status}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Đăng nhập gần nhất:</span>
                          <p className="font-bold text-foreground mt-0.5">
                            {selectedUserDetail.userAccount?.lastLoginAt ? selectedUserDetail.userAccount.lastLoginAt.replace("T", " ") : "Chưa có dữ liệu"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: SYSTEM INFORMATION */}
                  {detailActiveTab === "system" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Mã ID Hệ thống:</span>
                          <p className="font-mono font-bold text-foreground">{selectedUserDetail.userAccount?.id}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Người tạo (Created By):</span>
                          <p className="font-bold text-foreground">{selectedUserDetail.createdBy || "Hệ thống / Admin"}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Ngày khởi tạo:</span>
                          <p className="font-bold text-foreground">{selectedUserDetail.createdAt || "N/A"}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Cập nhật lần cuối:</span>
                          <p className="font-bold text-foreground">{selectedUserDetail.updatedAt || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: ACADEMIC (STUDENT PROFILE) */}
                  {detailActiveTab === "academic" && selectedUserDetail.studentProfile && (
                    <div className="space-y-6">
                      
                      {/* Stat summary cards for Student */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400">
                          <BookOpen className="h-5 w-5 mb-1" />
                          <span className="text-[10px] font-bold uppercase">Khóa học đăng ký</span>
                          <p className="text-lg font-black">{selectedUserDetail.studentProfile.enrolledCoursesCount ?? 4} khóa</p>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                          <Star className="h-5 w-5 mb-1" />
                          <span className="text-[10px] font-bold uppercase">Điểm trung bình (GPA)</span>
                          <p className="text-lg font-black">{selectedUserDetail.studentProfile.avgGrade ?? "8.5 / 10"}</p>
                        </div>

                        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-400">
                          <TrendingUp className="h-5 w-5 mb-1" />
                          <span className="text-[10px] font-bold uppercase">Tiến độ học tập</span>
                          <p className="text-lg font-black">{selectedUserDetail.studentProfile.learningProgress ?? 78}%</p>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                          <Award className="h-5 w-5 mb-1" />
                          <span className="text-[10px] font-bold uppercase">Chứng chỉ đạt được</span>
                          <p className="text-lg font-black">{selectedUserDetail.studentProfile.certificatesCount ?? 2} chứng chỉ</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Mã sinh viên/học viên:</span>
                          <p className="font-bold text-foreground mt-0.5">{selectedUserDetail.studentProfile.studentCode || "STD-001"}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Trường học:</span>
                          <p className="font-bold text-foreground mt-0.5">{selectedUserDetail.studentProfile.schoolName || "Đại học Bách Khoa"}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Trình độ học vấn:</span>
                          <p className="font-bold text-foreground mt-0.5">{selectedUserDetail.studentProfile.educationLevel || "Đại học"}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Mục tiêu học tập:</span>
                          <p className="font-bold text-foreground mt-0.5">{selectedUserDetail.studentProfile.goal || "Chưa thiết lập"}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: WORK (EMPLOYEE PROFILE) */}
                  {detailActiveTab === "work" && selectedUserDetail.employeeProfile && (
                    <div className="space-y-6">
                      
                      {/* Stat summary cards for Employee/Teacher */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                          <BookOpen className="h-5 w-5 mb-1" />
                          <span className="text-[10px] font-bold uppercase">Khóa học phụ trách</span>
                          <p className="text-lg font-black">{selectedUserDetail.employeeProfile.coursesCount ?? 6} khóa</p>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                          <Star className="h-5 w-5 mb-1" />
                          <span className="text-[10px] font-bold uppercase">Đánh giá trung bình</span>
                          <p className="text-lg font-black">{selectedUserDetail.employeeProfile.rating ?? 4.9} ★</p>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                          <DollarSign className="h-5 w-5 mb-1" />
                          <span className="text-[10px] font-bold uppercase">Doanh thu đóng góp</span>
                          <p className="text-lg font-black">{selectedUserDetail.employeeProfile.revenue ? `${selectedUserDetail.employeeProfile.revenue.toLocaleString()} VNĐ` : "45.000.000 VNĐ"}</p>
                        </div>

                        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-400">
                          <Briefcase className="h-5 w-5 mb-1" />
                          <span className="text-[10px] font-bold uppercase">Loại hợp đồng</span>
                          <p className="text-lg font-black">{selectedUserDetail.employeeProfile.employmentTypeEnum || "Full-Time"}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Mã nhân viên:</span>
                          <p className="font-bold text-foreground mt-0.5">{selectedUserDetail.employeeProfile.employeeCode || "EMP-001"}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Phòng ban:</span>
                          <p className="font-bold text-foreground mt-0.5">{selectedUserDetail.employeeProfile.departmentName || "Khoa Công Nghệ Thông Tin"}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Chức danh công tác:</span>
                          <p className="font-bold text-foreground mt-0.5">{selectedUserDetail.employeeProfile.position || "Giảng viên chính"}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                          <span className="text-muted-foreground">Trạng thái làm việc:</span>
                          <p className="font-bold text-emerald-600 mt-0.5">{selectedUserDetail.employeeProfile.status || "ACTIVE"}</p>
                        </div>
                      </div>
                    </div>
                  )}

                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground">Không tìm thấy thông tin người dùng.</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
              <Button onClick={() => setUserDetailModalOpen(false)} variant="outline" size="sm" className="h-9">
                Đóng
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: USER CREATE / EDIT MODAL */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setUserModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            
            <h3 className="text-lg font-bold text-foreground mb-4">
              {editingUser ? "Cập nhật thông tin tài khoản" : "Tạo tài khoản người dùng mới"}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              {!editingUser && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Tên tài khoản (Username)</Label>
                  <Input type="text" name="username" placeholder="datbritget" required className="h-9" />
                </div>
              )}
              
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Họ và tên</Label>
                <Input type="text" name="fullName" defaultValue={editingUser?.fullName || ""} placeholder="Vũ Tiến Đạt" required className="h-9" />
              </div>

              {!editingUser && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Email liên hệ</Label>
                  <Input type="email" name="email" placeholder="dat.vt@ailms.edu.vn" required className="h-9" />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Số điện thoại</Label>
                <Input type="text" name="phone" defaultValue={editingUser?.phone || ""} placeholder="0912345678" className="h-9" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Giới tính</Label>
                  <select name="gender" defaultValue={editingUser?.gender ?? "0"} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none">
                    <option value="0">Nam</option>
                    <option value="1">Nữ</option>
                    <option value="2">Khác</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Ngày sinh</Label>
                  <Input type="date" name="dateOfBirth" defaultValue={editingUser?.dateOfBirth ? editingUser.dateOfBirth.slice(0, 10) : ""} className="h-9" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setUserModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" className="h-9 bg-primary text-primary-foreground hover:bg-primary/95">Xác nhận</Button>
              </div>
            </form>
          </div>
        </div>
      )}

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

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Vai trò gán mặc định</Label>
                <select
                  value={bulkEmployeeRoleCode}
                  onChange={(e) => setBulkEmployeeRoleCode(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs outline-none"
                >
                  <option value="ROLE_TEACHER">ROLE_TEACHER (Giảng viên)</option>
                  <option value="ROLE_STAFF">ROLE_STAFF (Cán bộ nhân viên)</option>
                  <option value="ROLE_ADMIN">ROLE_ADMIN (Quản trị viên)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setBulkCreateEmployeesModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" className="h-9 bg-primary text-primary-foreground hover:bg-primary/95 gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  <span>Xác nhận thêm</span>
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
              onClick={() => setBulkEmailModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
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
                  required
                  className="w-full rounded-lg border border-input bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setBulkEmailModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" className="h-9 bg-primary text-primary-foreground hover:bg-primary/95 gap-1.5">
                  <Mail className="h-4 w-4" />
                  <span>Gửi thư ngay</span>
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
              onClick={() => setInviteModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
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
                    required
                    className="pl-9 h-9"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setInviteModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95">
                  <UserPlus className="h-4 w-4" />
                  <span>Gửi thư mời</span>
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
                <Button type="button" variant="outline" onClick={() => setAssignRoleModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" className="h-9 bg-primary text-primary-foreground hover:bg-primary/95">Cập nhật</Button>
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
                <select name="bulkRole" className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none">
                  {roles.map((r) => (
                    <option key={r.name} value={r.name}>{r.name} - {r.description.slice(0, 30)}...</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setBulkAssignRoleModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" className="h-9 bg-primary text-primary-foreground hover:bg-primary/95">Xác nhận</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
