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
import { userApi } from "@/api/users/userApi";
import { roleApi } from "@/api/roles/roleApi";
import { departmentApi, type DepartmentResponse } from "@/api/departments/departmentApi";
import type {
  UserResponse,
  RoleResponse,
  UserDetailResponse,
  MonthlyUserCountResponse
} from "@/types/admin";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
  Award,
  BookOpen,
  Star,
  DollarSign,
  ShieldCheck,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
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
  Bar,
  AreaChart,
  Area
} from "recharts";

// Color palettes for Recharts
const ROLE_COLORS = ["#7b2525", "#ba6a4c", "#ff97d0", "#fe7f2d", "#2b5748", "#4e220f"];
const GENDER_COLORS = ["#7b2525", "#ba6a4c", "#ff97d0","#fe7f2d"];
const STATUS_COLORS = ["#ff97d0","#2b5748", "#be1a1a", "#4e220f"];
const AGE_COLORS = ["#7b2525", "#be1a1a", "#ff97d0","#eee0cc"];

const MONTH_NAMES = [
  "Thg 1", "Thg 2", "Thg 3", "Thg 4", "Thg 5", "Thg 6",
  "Thg 7", "Thg 8", "Thg 9", "Thg 10", "Thg 11", "Thg 12"
];

const parseYYYYMMDD = (str: string) => {
  if (!str) return undefined;
  const parts = str.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return undefined;
};

const formatDateDisplay = (str: string) => {
  if (!str) return "";
  const dateObj = parseYYYYMMDD(str);
  if (!dateObj) return str;
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yyyy = dateObj.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const parseDDMMYYYYToYYYYMMDD = (str: string): string | null => {
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
        const mmStr = String(month).padStart(2, '0');
        const ddStr = String(day).padStart(2, '0');
        return `${yyyyStr}-${mmStr}-${ddStr}`;
      }
    }
  }
  return null;
};

const formatAsDDMMYYYYMask = (val: string, prevVal: string = ""): string => {
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

const isInvalidDateInput = (inputVal: string): boolean => {
  if (!inputVal || !inputVal.trim()) return false;
  if (inputVal.length === 10) {
    return parseDDMMYYYYToYYYYMMDD(inputVal) === null;
  }
  return false;
};

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

export const UserManagement: React.FC = () => {
  const location = useLocation();
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
  
  const currentYear = new Date().getFullYear();
  const earliestDataYear = 2023; // năm bắt đầu có dữ liệu, có thể fetch từ API
  const years = Array.from(
    { length: currentYear - earliestDataYear + 1 },
    (_, i) => currentYear - i
  );

  const [showOptionalCharts, setShowOptionalCharts] = useState<boolean>(true);

  // Filters & Sorting
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterDepartmentCode, setFilterDepartmentCode] = useState("");
  const [filterDepartments, setFilterDepartments] = useState<DepartmentResponse[]>([]);
  const [startDate, setStartDate] = useState("");
  const [startDateInput, setStartDateInput] = useState("");
  const [startCalendarMonth, setStartCalendarMonth] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [endCalendarMonth, setEndCalendarMonth] = useState<Date | undefined>(undefined);
  const [sortRules, setSortRules] = useState<Array<{ field: string; dir: "ASC" | "DESC" }>>([
    { field: "id", dir: "DESC" }
  ]);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  // UI Banner & Loading
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [bulkEmailLoading, setBulkEmailLoading] = useState(false);
  const [bulkEmployeeLoading, setBulkEmployeeLoading] = useState(false);
  const [saveUserLoading, setSaveUserLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkAssignRoleLoading, setBulkAssignRoleLoading] = useState(false);
  const [exportCsvLoading, setExportCsvLoading] = useState(false);
  const [assignRoleLoading, setAssignRoleLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [modalDateOfBirth, setModalDateOfBirth] = useState<string>("");
  const [modalDateInputVal, setModalDateInputVal] = useState<string>("");

  useEffect(() => {
    if (userModalOpen) {
      if (editingUser && editingUser.dateOfBirth) {
        const dob = editingUser.dateOfBirth.slice(0, 10);
        setModalDateOfBirth(dob);
        setModalDateInputVal(formatDateDisplay(dob));
      } else {
        setModalDateOfBirth("");
        setModalDateInputVal("");
      }
    }
  }, [editingUser, userModalOpen]);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [createUserRoleId, setCreateUserRoleId] = useState("");

  const [assignRoleModalOpen, setAssignRoleModalOpen] = useState(false);
  const [assigningUser, setAssigningUser] = useState<UserResponse | null>(null);

  const [bulkAssignRoleModalOpen, setBulkAssignRoleModalOpen] = useState(false);
  const [bulkRemoveRoleModalOpen, setBulkRemoveRoleModalOpen] = useState(false);
  const [selectedRemoveRoleId, setSelectedRemoveRoleId] = useState<string>("");
  const [bulkRemoveRoleLoading, setBulkRemoveRoleLoading] = useState(false);
  const [bulkEmailModalOpen, setBulkEmailModalOpen] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState("");
  const [bulkEmailContent, setBulkEmailContent] = useState("");

  const [bulkCreateEmployeesModalOpen, setBulkCreateEmployeesModalOpen] = useState(false);
  const [bulkEmployeeEmails, setBulkEmployeeEmails] = useState("");
  const [bulkEmployeeDeptId, setBulkEmployeeDeptId] = useState("");
  const [bulkEmployeeRoleId, setBulkEmployeeRoleId] = useState("");

  // Dynamic Departments & Roles for Bulk Employee Modal
  const [deptList, setDeptList] = useState<DepartmentResponse[]>([]);
  const [roleList, setRoleList] = useState<RoleResponse[]>([]);
  const [deptSearchTerm, setDeptSearchTerm] = useState("");
  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  const [loadingDeptsAndRoles, setLoadingDeptsAndRoles] = useState(false);

  const fetchDeptsAndRolesForBulkModal = async () => {
    setLoadingDeptsAndRoles(true);
    try {
      const [deptRes, roleRes] = await Promise.all([
        departmentApi.getAllDepartments().catch(() => null),
        roleApi.getAllRoles().catch(() => null),
      ]);
      if (deptRes?.data?.success && deptRes.data.data) {
        setDeptList(deptRes.data.data);
      }
      if (roleRes?.data?.success && roleRes.data.data) {
        setRoleList(roleRes.data.data);
        if (roleRes.data.data.length > 0 && !bulkEmployeeRoleId) {
          setBulkEmployeeRoleId(String(roleRes.data.data[0].id));
        }
      }
    } catch (err: any) {
      console.error("Lỗi lấy danh sách phòng ban và vai trò:", err);
    } finally {
      setLoadingDeptsAndRoles(false);
    }
  };

  useEffect(() => {
    if (bulkCreateEmployeesModalOpen) {
      fetchDeptsAndRolesForBulkModal();
    }
  }, [bulkCreateEmployeesModalOpen]);

  // User Detail Modal
  const [userDetailModalOpen, setUserDetailModalOpen] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetailResponse | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [detailActiveTab, setDetailActiveTab] = useState<"basic" | "system" | "academic" | "work">("basic");

  // Sticky Sub-navbar Tab State & Scroll Handling
  const [activeTab, setActiveTab] = useState<"statistics" | "management">(() => {
    return location.hash === "#management" ? "management" : "statistics";
  });

  const [modalCalendarMonth, setModalCalendarMonth] = useState<Date | undefined>(
    parseYYYYMMDD(modalDateOfBirth) || new Date(2000, 0)
  );

  const scrollToSection = (sectionId: "statistics" | "management") => {
    setActiveTab(sectionId);
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

  useEffect(() => {
    const handleScroll = () => {
      const mgmtEl = document.getElementById("management");
      if (mgmtEl) {
        const rect = mgmtEl.getBoundingClientRect();
        if (rect.top <= 200) {
          setActiveTab("management");
        } else {
          setActiveTab("statistics");
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchStatistics();
    fetchFilterDepartments();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 400); // đợi 400ms rồi gọi fetchUsers()
    
    return () => clearTimeout(timer);
  }, [page, pageSize, filterRole, filterStatus, filterGender, filterDepartmentCode, sortRules, searchKeyword, startDate, endDate]);

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

  const fetchFilterDepartments = async () => {
    try {
      const res = await departmentApi.getAllDepartments().catch(() => null);
      if (res?.data?.success && res.data.data) {
        setFilterDepartments(res.data.data);
      }
    } catch (err: any) {
      console.error("Lỗi lấy danh sách phòng ban cho filter:", err);
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
          name: genderMap[key] || key,
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
      const sortParams = sortRules.length > 0
        ? sortRules.map(r => `${r.field}:${r.dir.toLowerCase()}`)
        : ["id:desc"];
      const params: any = {
        page,
        size: pageSize,
        sort: sortParams,
      };
      if (searchKeyword.trim()) params.keyword = searchKeyword.trim();
      if (filterRole) params.roleIds = [filterRole];
      if (filterStatus) params.statuses = [filterStatus];
      if (filterGender !== "") params.gender = parseInt(filterGender);
      if (filterDepartmentCode) params.departmentCode = filterDepartmentCode;
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

  const removeSortRule = (field: string) => {
    setSortRules(prev => {
      const updated = prev.filter(r => r.field !== field);
      return updated.length === 0 ? [{ field: "id", dir: "DESC" }] : updated;
    });
    setPage(0);
  };

  const getSortRuleInfo = (field: string) => {
    const index = sortRules.findIndex(r => r.field === field);
    if (index === -1) return null;
    return { rule: sortRules[index], index: index + 1 };
  };

  const renderSortIcon = (field: string) => {
    const info = getSortRuleInfo(field);
    if (!info) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return (
      <span className="inline-flex items-center gap-1">
        {info.rule.dir === "ASC" ? (
          <ArrowUp className="h-3.5 w-3.5 text-primary font-bold animate-in fade-in" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-primary font-bold animate-in fade-in" />
        )}
        {sortRules.length > 1 && (
          <span className="h-3.5 min-w-[14px] px-1 rounded-full bg-primary text-[10px] text-primary-foreground font-bold flex items-center justify-center leading-none">
            {info.index}
          </span>
        )}
      </span>
    );
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case "fullName": return "Người dùng";
      case "gender": return "Giới tính";
      case "dateOfBirth": return "Ngày sinh";
      case "status": return "Trạng thái";
      case "createdAt": return "Ngày tham gia";
      default: return field;
    }
  };

  const handleResetFiltersAndSort = () => {
    setSearchKeyword("");
    setFilterRole("");
    setFilterStatus("");
    setFilterGender("");
    setFilterDepartmentCode("");
    setStartDate("");
    setStartDateInput("");
    setEndDate("");
    setEndDateInput("");
    setSortRules([{ field: "id", dir: "DESC" }]);
    setPage(0);
  };

  const isSorted = sortRules.some(r => r.field !== "id" || r.dir !== "DESC");

  const isFilteredOrSorted = Boolean(
    searchKeyword ||
    filterRole ||
    filterStatus ||
    filterGender !== "" ||
    filterDepartmentCode ||
    startDate ||
    startDateInput ||
    endDate ||
    endDateInput ||
    isSorted
  );

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

    setSaveUserLoading(true);
    try {
      if (editingUser) {
        const res = await userApi.updateUser(editingUser.id, { fullName, phone, gender, dateOfBirth });
        if (res.data.success) {
          showBanner("Đã cập nhật thông tin người dùng thành công!");
          fetchUsers();
        }
      } else {
        const username = data.get("username") as string;
        const email = data.get("email") as string;
        const roleIds = createUserRoleId && createUserRoleId !== "none" ? [createUserRoleId] : undefined;
        const res = await userApi.createUser({ username, email, fullName, phone, gender, dateOfBirth, roleIds });
        if (res.data.success) {
          showBanner("Đã thêm người dùng mới thành công!");
          setPage(0);
          fetchUsers();
          fetchStatistics();
          setCreateUserRoleId("");
        }
      }
      setUserModalOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      showBanner(err.message || "Lỗi lưu thông tin người dùng", true);
    } finally {
      setSaveUserLoading(false);
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
    const newStatus = user.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    try {
      const res = await userApi.updateUser(user.id, {
        fullName: user.fullName,
        phone: user.phone,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : undefined,
        status: newStatus
      });
      if (res.data.success) {
        showBanner(`Đã ${newStatus === "LOCKED" ? "khóa" : "mở khóa"} tài khoản ${user.fullName} thành công!`);
        fetchUsers();
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể đổi trạng thái người dùng", true);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      const roleIds = inviteRoleId ? [inviteRoleId] : [];
      const res = await userApi.inviteUser({
        email: inviteEmail.trim(),
        ...(roleIds.length > 0 && { roleIds })
      });
      if (res.data.success) {
        showBanner(`Đã gửi thư mời đăng ký đến: ${inviteEmail}`);
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

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    if (window.confirm(`Bạn có chắc muốn xóa ${selectedUserIds.length} tài khoản đã chọn?`)) {
      setBulkDeleteLoading(true);
      try {
        const res = await userApi.bulkDelete({ userIds: selectedUserIds });
        if (res.data.success) {
          showBanner("Xóa hàng loạt tài khoản thành công!");
          fetchUsers();
          fetchStatistics();
          setSelectedUserIds([]);
        }
      } catch (err: any) {
        showBanner(err.message || "Lỗi xóa hàng loạt", true);
      } finally {
        setBulkDeleteLoading(false);
      }
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
        showBanner(`Gán vai trò ${targetRole} thành công cho ${selectedUserIds.length} người dùng!`);
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
        const { successCount, failureCount, errors } = res.data.data || {};
        if (failureCount > 0 && errors && errors.length > 0) {
          showBanner(`Đã tạo thành công ${successCount || 0} nhân viên. Lỗi ${failureCount} email: ${errors.join("; ")}`, true);
        } else {
          showBanner(`Tạo hàng loạt ${successCount || emailsList.length} nhân viên thành công!`);
        }
        setBulkCreateEmployeesModalOpen(false);
        setBulkEmployeeEmails("");
        fetchUsers();
        fetchStatistics();
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi tạo nhân viên hàng loạt", true);
    } finally {
      setBulkEmployeeLoading(false);
    }
  };

  const handleExportUsersExcel = async () => {
    setExportCsvLoading(true);
    try {
      showBanner("Đang khởi tạo file xuất CSV...");
      const res = await userApi.exportUsersToExcel({
        keyword: searchKeyword,
        role: filterRole,
        status: filterStatus,
        departmentCode: filterDepartmentCode,
        startDate,
        endDate,
        size: 10000
      });
      
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Danh_sach_nguoi_dung_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showBanner("Xuất file CSV thành công!");
    } catch (err: any) {
      showBanner(err.message || "Không thể xuất file CSV", true);
    } finally {
      setExportCsvLoading(false);
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

  const handleSelectAllUsers = (checkedOrEvent: boolean | React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = typeof checkedOrEvent === "boolean" ? checkedOrEvent : checkedOrEvent.target.checked;
    if (isChecked) {
      setSelectedUserIds(users.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  return (
    <div className="mx-auto max-w-none w-full px-4 sm:px-6 lg:px-10 py-6 space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Toast Notification Banners */}
      {successBanner && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-success-forest text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-destructive text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{errorBanner}</span>
        </div>
      )}

      {/* Page Title Header */}
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
            <span>Quản lý Người dùng</span>
          </h1>
        </div>
      </div>

      {/* STICKY SUB-NAVBAR */}
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
                activeTab === "management"
                  ? "border-primary text-primary font-extrabold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-neutral-soft-gray/50"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Danh sách Quản lý</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Section: Stat Boxes */}
      <section id="statistics" className="space-y-8 scroll-mt-36">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-15">
          
          {/* Stat Box 1: Students */}
          <Card className="border-border shadow-sm hover:shadow-md transition-shadow bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-success-forest">
              <GraduationCap className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Học viên
              </CardDescription>
              <CardTitle className="text-4xl font-black text-foreground flex items-center gap-2 mt-1">
                <span className="text-success-forest">{statsLoading ? "..." : studentCount.toLocaleString()}</span>
                <span className="text-sm font-bold text-success-forest bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> Student
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm font-medium text-muted-foreground">Tổng số tài khoản học viên trong hệ thống</p>
            </CardContent>
          </Card>

          {/* Stat Box 2: Employees */}
          <Card className="border-border shadow-sm hover:shadow-md transition-shadow bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-brand-cobalt">
              <Briefcase className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Nhân viên
              </CardDescription>
              <CardTitle className="text-4xl font-bold text-foreground flex items-center gap-2 mt-1">
                <span className="text-brand-cobalt">{statsLoading ? "..." : employeeCount.toLocaleString()}</span>
                <span className="text-sm font-bold text-brand-cobalt bg-indigo-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <UserCheck className="h-3 w-3" /> Staff
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm  font-medium text-muted-foreground">Tổng số  nhân viên</p>
            </CardContent>
          </Card>

          {/* Stat Box 3: Total Accounts */}
          <Card className="border-border shadow-sm hover:shadow-md transition-shadow bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-muted-foreground">
              <Users className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Tổng số tài khoản
              </CardDescription>
              <CardTitle className="text-4xl font-black text-foreground flex items-center gap-2 mt-1">
                <span className="text-muted-foreground">{totalElements.toLocaleString()}</span>
                <span className="text-sm font-bold text-muted-foreground bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Hệ thống
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm font-medium text-muted-foreground">Tài khoản ghi nhận trên hệ thống</p>
            </CardContent>
          </Card>

          {/* Stat Box 4: Active Ratio */}
          <Card className="border-border shadow-sm hover:shadow-md transition-shadow bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-green-300">
              <ShieldCheck className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Trạng thái Hoạt động
              </CardDescription>
              <CardTitle className="text-4xl font-black text-foreground flex items-center gap-2 mt-1">
                <span className="text-green-300">
                  {statusStats.find(s => s.name === "ACTIVE")?.value || totalElements}
                </span>
                <span className="text-sm font-bold text-green-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Tài khoản hoạt động</p>
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
                  <CardTitle className="text-lg font-semibold">Cơ cấu theo Vai trò</CardTitle>
                </div>
              </div>
              <CardDescription className="text-sm">
                Tỷ lệ phân bổ tài khoản người dùng theo vai trò hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex items-center justify-center min-h-[280px]">
              {roleStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={roleStats}  // Dữ liệu hiển thị
                      cx="50%"
                      cy="50%"
                      innerRadius={55} // Bán kính trong
                      outerRadius={85}
                      paddingAngle={4} // Khoảng cách giữa các phần
                      dataKey="value"
                    >
                      {roleStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                      ))}
                    </Pie>

                    {/* Tooltip hiển thị khi di chuột vào từng phần */}
                    <Tooltip
                      formatter={(value: any) => [`${value} người dùng`, "Số lượng"]}
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                    />
                    {/* Chú thích màu tương ứng với từng vai trò */}
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "14px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">
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
                  <TrendingUp className="h-5 w-5 text-success-forest" />
                  <CardTitle className="text-lg font-semibold">Người dùng mới theo tháng</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold text-muted-foreground">Năm:</Label>
                  <Select
                    value={String(selectedYear)}
                    onValueChange={(val) => setSelectedYear(Number(val))}
                  >
                    <SelectTrigger className="w-[100px] h-8 border-border/40 text-sm font-semibold">
                      <SelectValue placeholder="Chọn năm" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CardDescription className="text-sm">
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
                <div className="text-center text-sm text-muted-foreground py-8">
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
              size="lg"
              className="text-lg font-semibold gap-2 text-muted-foreground hover:opacity-80 hover:text-foreground p-0 h-auto"
            >
              {showOptionalCharts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span>Biểu đồ phân bổ  Người dùng</span>
            </Button>
          </div>

          {showOptionalCharts && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in-50 duration-200">
              
              {/* Chart: Users by Gender */}
              <Card className="border-border shadow-sm bg-card">
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg font-semibold flex items-center gap-1.5">
                    <PieIcon className="h-4 w-4 text-sky-500" />
                    <span>Theo Giới tính</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="min-h-[200px] flex items-center justify-center">
                  {genderStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={genderStats}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={65}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {genderStats.map((_, idx) => (
                            <Cell key={`gender-${idx}`} fill={GENDER_COLORS[idx % GENDER_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => [`${v} người`, "Số lượng"]} />
                        <Legend verticalAlign="bottom" height={-20} iconType="circle" wrapperStyle={{ fontSize: "14px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">Không có dữ liệu giới tính</p>
                  )}
                </CardContent>
              </Card>

              {/* Chart: Users by Status */}
              <Card className="border-border shadow-sm bg-card">
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg font-semibold flex items-center gap-1.5">
                    <PieIcon className="h-4 w-4 text-emerald-500" />
                    <span>Theo Trạng thái</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="min-h-[200px] flex items-center justify-center">
                  {statusStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={statusStats}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={65}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {statusStats.map((_, idx) => (
                            <Cell key={`status-${idx}`} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => [`${v} tài khoản`, "Số lượng"]} />
                        <Legend verticalAlign="bottom" height={-20} iconType="circle" wrapperStyle={{ fontSize: "14px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">Không có dữ liệu trạng thái</p>
                  )}
                </CardContent>
              </Card>

              {/* Chart: Employees by Age Group */}
              <Card className="border-border shadow-sm bg-card">
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg font-semibold flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    <span>Theo Độ tuổi</span>
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
                    <p className="text-sm text-muted-foreground">Chưa có thống kê độ tuổi</p>
                  )}
                </CardContent>
              </Card>

            </div>
          )}
        </div>
      </section>

      <section id="management" className="scroll-mt-36">
      {/* Main Table Container */}
      <Card className="border-border shadow-sm bg-card overflow-hidden">
        
        {/* Table Header & Quick Action Buttons */}
        <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border/30 bg-card">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight font-heading flex items-center gap-2">
              <span>Danh sách Người dùng</span>
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-0.5">
              Tìm kiếm, lọc nâng cao, gán vai trò, quản lý trạng thái và thao tác hàng loạt.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Export CSV/Excel Button */}
            <Button
              onClick={handleExportUsersExcel}
              variant="outline"
              size="sm"
              disabled={exportCsvLoading}
              className="h-9 gap-1.5 font-semibold text-success-forest border-emerald-500/30 hover:bg-emerald-500/10 disabled:opacity-60"
            >
              {exportCsvLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              <span>{exportCsvLoading ? "Đang xuất..." : "Xuất File CSV"}</span>
            </Button>

            {/* Bulk Add Employees Button */}
            <Button
              onClick={() => setBulkCreateEmployeesModalOpen(true)}
              variant="outline"
              size="sm"
              disabled={bulkEmployeeLoading}
              className="h-9 gap-1.5 font-semibold text-brand-cobalt border-indigo-500/30 hover:bg-indigo-500/10 disabled:opacity-60"
            >
              {bulkEmployeeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              <span>Thêm nhân viên</span>
            </Button>

            {/* Invite Button */}
            <Button
              onClick={() => setInviteModalOpen(true)}
              variant="outline"
              size="sm"
              disabled={inviteLoading}
              className="h-9 gap-1.5 font-semibold text-brand-primary border-border/40 hover:bg-brand-cobalt/50 disabled:opacity-60"
            >
              {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 text-brand-primary" />}
              <span>{inviteLoading ? "Đang gửi..." : "Mời nhân viên"}</span>
            </Button>

            {/* Add New User */}
            <Button
              onClick={() => { setEditingUser(null); setUserModalOpen(true); }}
              variant="default"
              size="sm"
              disabled={saveUserLoading}
              className="h-9 gap-1.5 font-semibold bg-primary text-primary-foreground hover:bg-accent/70 shadow-xs disabled:opacity-60"
            >
              {saveUserLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Tạo tài khoản</span>
            </Button>
          </div>
        </CardHeader>
        

        {/* Toolbar: Search, Filters & Date Pickers */}
        <form
          onSubmit={handleSearchSubmit}
          className="-mt-1 py-3 px-4 bg-muted/20 border-b border-border/30 flex flex-wrap xl:flex-nowrap items-end gap-2.5 w-full"
        >
          {/* Keyword Search */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Từ khóa tìm kiếm</Label>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Tìm tên, username, email..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-8 h-9 text-sm border border-border/30 bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:opacity-50"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="flex flex-col gap-1 w-[150px] shrink-0">
            <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Vai trò</Label>
            <Select
              value={filterRole || "Tất cả"}
              onValueChange={(val) => setFilterRole(val === "Tất cả" || !val ? "" : val)}
            >
              <SelectTrigger className="h-9! text-sm border border-border/30 bg-background rounded-lg w-full">
                <SelectValue placeholder="Tất cả"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tất cả">Tất cả</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department Filter */}
          <div className="flex flex-col gap-1 w-[170px] shrink-0">
            <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Phòng ban</Label>
            <Select
              value={filterDepartmentCode || "Tất cả"}
              onValueChange={(val) => setFilterDepartmentCode(val === "Tất cả" || !val ? "" : val)}
            >
              <SelectTrigger className="h-9! text-sm border border-border/30 bg-background rounded-lg w-full">
                <SelectValue placeholder="Tất cả phòng ban" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tất cả">Tất cả phòng ban</SelectItem>
                {filterDepartments.map((d) => (
                  <SelectItem key={d.id} value={d.code}>
                    {d.code} – {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1 w-[150px] shrink-0">
            <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Trạng thái</Label>
            <Select
              value={filterStatus || "Tất cả"}
              onValueChange={(val) => setFilterStatus(val === "Tất cả" || !val ? "" : val)}
            >
              <SelectTrigger className="h-9! text-sm border border-border/30 bg-background rounded-lg w-full">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tất cả">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="DELETED">DELETED</SelectItem>
                <SelectItem value="LOCKED">LOCKED</SelectItem>
                <SelectItem value="VERIFICATION">VERIFICATION</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gender Filter */}
          <div className="flex flex-col gap-1 w-[150px] shrink-0">
            <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Giới tính</Label>
            <Select
              value={filterGender || "Tất cả"}
              onValueChange={(val) => setFilterGender(val === "Tất cả" || !val ? "" : val)}
            >
              <SelectTrigger className="h-9! text-sm border border-border/30 bg-background rounded-lg w-full">
                <SelectValue placeholder="Tất cả giới tính" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tất cả">Tất cả giới tính</SelectItem>
                <SelectItem value="0">Nam</SelectItem>
                <SelectItem value="1">Nữ</SelectItem>
                <SelectItem value="2">Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date Filter */}
          <div className="flex flex-col gap-1 w-[150px] shrink-0">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Từ ngày</Label>
              {isInvalidDateInput(startDateInput) && (
                <span className="text-[10px] text-destructive font-semibold">Lỗi</span>
              )}
            </div>
            <Popover>
              <PopoverTrigger
                nativeButton={false}
                render={
                  <div className="relative w-full">
                    <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                    <Input
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={startDateInput}
                      onChange={(e) => {
                        const val = formatAsDDMMYYYYMask(e.target.value, startDateInput);
                        setStartDateInput(val);
                        const yyyymmdd = parseDDMMYYYYToYYYYMMDD(val);
                        if (yyyymmdd) {
                          setStartDate(yyyymmdd);
                          setStartCalendarMonth(parseYYYYMMDD(yyyymmdd));
                        } else if (!val) {
                          setStartDate("");
                        }
                      }}
                      maxLength={10}
                      className={cn(
                        "pl-8 h-9 text-sm border border-border/30 bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:opacity-50",
                        isInvalidDateInput(startDateInput) && "border-destructive text-destructive focus-visible:ring-destructive/30"
                      )}
                    />
                  </div>
                }
              />
              <PopoverContent className="w-auto p-0 z-50 bg-popover border border-border/30 shadow-xl rounded-xl" align="start">
                <CalendarComponent
                  mode="single"
                  captionLayout="dropdown"
                  startMonth={new Date(1990, 0)}
                  endMonth={new Date(2030, 11)}
                  selected={parseYYYYMMDD(startDate)}
                  month={startCalendarMonth}
                  onMonthChange={setStartCalendarMonth}
                  onSelect={(date) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, "0");
                      const dd = String(date.getDate()).padStart(2, "0");
                      const yyyymmdd = `${yyyy}-${mm}-${dd}`;
                      setStartDate(yyyymmdd);
                      setStartDateInput(`${dd}/${mm}/${yyyy}`);
                      setStartCalendarMonth(date);
                    } else {
                      setStartDate("");
                      setStartDateInput("");
                    }
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date Filter */}
          <div className="flex flex-col gap-1 w-[150px] shrink-0">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Đến ngày</Label>
              {isInvalidDateInput(endDateInput) && (
                <span className="text-[10px] text-destructive font-semibold">Lỗi</span>
              )}
            </div>
            <Popover>
              <PopoverTrigger
                nativeButton={false}
                render={
                  <div className="relative w-full">
                    <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                    <Input
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={endDateInput}
                      onChange={(e) => {
                        const val = formatAsDDMMYYYYMask(e.target.value, endDateInput);
                        setEndDateInput(val);
                        const yyyymmdd = parseDDMMYYYYToYYYYMMDD(val);
                        if (yyyymmdd) {
                          setEndDate(yyyymmdd);
                          setEndCalendarMonth(parseYYYYMMDD(yyyymmdd));
                        } else if (!val) {
                          setEndDate("");
                        }
                      }}
                      maxLength={10}
                      className={cn(
                        "pl-8 h-9 text-sm border border-border/30 bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:opacity-50",
                        isInvalidDateInput(endDateInput) && "border-destructive text-destructive focus-visible:ring-destructive/30"
                      )}
                    />
                  </div>
                }
              />
              <PopoverContent className="w-auto p-0 z-50 bg-popover border border-border/30 shadow-xl rounded-xl" align="start">
                <CalendarComponent
                  mode="single"
                  captionLayout="dropdown"
                  startMonth={new Date(1990, 0)}
                  endMonth={new Date(2030, 11)}
                  selected={parseYYYYMMDD(endDate)}
                  month={endCalendarMonth}
                  onMonthChange={setEndCalendarMonth}
                  onSelect={(date) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, "0");
                      const dd = String(date.getDate()).padStart(2, "0");
                      const yyyymmdd = `${yyyy}-${mm}-${dd}`;
                      setEndDate(yyyymmdd);
                      setEndDateInput(`${dd}/${mm}/${yyyy}`);
                      setEndCalendarMonth(date);
                    } else {
                      setEndDate("");
                      setEndDateInput("");
                    }
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Filter Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 self-end">
            <Button
              type="submit"
              size="lg"
              disabled={filterLoading || loading}
              className="h-9 font-semibold bg-primary text-primary-foreground hover:bg-accent/70 text-xs rounded-lg px-3 disabled:opacity-60"
              title="Lọc dữ liệu"
            >
              {(filterLoading || loading) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Filter className="h-3.5 w-3.5 mr-1" />} Lọc
            </Button>

            {isFilteredOrSorted && (
              <Button
                type="button"
                onClick={handleResetFiltersAndSort}
                variant="outline"
                size="lg"
                className="h-9 text-xs text-muted-foreground hover:text-foreground rounded-lg px-2.5 border border-border/30 bg-background flex items-center gap-1"
                title="Đặt lại bộ lọc & sắp xếp về mặc định"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Đặt lại</span>
              </Button>
            )}
          </div>
        </form>

        {/* Active Filter & Sort Chips Bar */}
        {isFilteredOrSorted && (
          <div className="px-4 py-2 bg-muted/40 border-b border-border/30 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in-50">
            <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
              <span className="font-semibold text-foreground">Đang áp dụng:</span>
              {searchKeyword && (
                <span className="px-2 py-0.5 rounded-md bg-background border border-border/40 text-foreground flex items-center gap-1">
                  Từ khóa: <strong className="text-primary">{searchKeyword}</strong>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setSearchKeyword("")} />
                </span>
              )}
              {filterRole && (
                <span className="px-2 py-0.5 rounded-md bg-background border border-border/40 text-foreground flex items-center gap-1">
                  Vai trò: <strong className="text-primary">{roles.find(r => String(r.id) === filterRole)?.code || filterRole}</strong>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setFilterRole("")} />
                </span>
              )}
              {filterStatus && (
                <span className="px-2 py-0.5 rounded-md bg-background border border-border/40 text-foreground flex items-center gap-1">
                  Trạng thái: <strong className="text-primary">{filterStatus}</strong>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setFilterStatus("")} />
                </span>
              )}
              {filterGender !== "" && (
                <span className="px-2 py-0.5 rounded-md bg-background border border-border/40 text-foreground flex items-center gap-1">
                  Giới tính: <strong className="text-primary">{filterGender === "0" ? "Nam" : filterGender === "1" ? "Nữ" : "Khác"}</strong>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setFilterGender("")} />
                </span>
              )}
              {filterDepartmentCode && (
                <span className="px-2 py-0.5 rounded-md bg-background border border-border/40 text-foreground flex items-center gap-1">
                  Phòng ban: <strong className="text-primary">{filterDepartmentCode}</strong>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setFilterDepartmentCode("")} />
                </span>
              )}
              {(startDate || endDate) && (
                <span className="px-2 py-0.5 rounded-md bg-background border border-border/40 text-foreground flex items-center gap-1">
                  Thời gian: <strong className="text-primary">{startDateInput || "Tất cả"} - {endDateInput || "Tất cả"}</strong>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => { setStartDate(""); setStartDateInput(""); setEndDate(""); setEndDateInput(""); }} />
                </span>
              )}
              {isSorted && sortRules.filter(r => r.field !== "id").map((rule, idx) => (
                <span key={rule.field} className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-medium flex items-center gap-1">
                  {sortRules.length > 1 && (
                    <span className="h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                  )}
                  <span>Sắp xếp:</span>
                  <strong>
                    {getFieldLabel(rule.field)} ({rule.dir === "ASC" ? "Tăng ▲" : "Giảm ▼"})
                  </strong>
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive ml-0.5"
                    onClick={() => removeSortRule(rule.field)}
                  />
                </span>
              ))}
            </div>
            <Button
              type="button"
              onClick={handleResetFiltersAndSort}
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] text-destructive hover:bg-destructive/10 px-2 font-medium"
            >
              Xóa tất cả
            </Button>
          </div>
        )}


        {/* Table */}
        {/* Batch Operations Bar (Trục thao tác hàng loạt khi chọn checkbox) */}
        {selectedUserIds.length > 0 && (
          <div className="py-2.5 -mt-4 bg-primary/10 border-b border-primary/20 flex flex-wrap items-center justify-between gap-3 animate-in fade-in-50 duration-200">
            <div className="pl-2 flex items-center gap-2 text-sm font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span>Đã chọn {selectedUserIds.length} tài khoản</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pr-4">
              
              {/* Bulk Assign Role */}
              <Button
                onClick={() => setBulkAssignRoleModalOpen(true)}
                variant="outline"
                size="sm"
                disabled={bulkAssignRoleLoading}
                className="h-8 text-sm gap-1 border-border/30 bg-primary hover:bg-accent/70 text-primary-foreground hover:text-primary-foreground disabled:opacity-60"
              >
                {bulkAssignRoleLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5 text-primary-foreground" />}
                <span>Gán vai trò</span>
              </Button>

              {/* Bulk Remove Role */}
              <Button
                onClick={() => setBulkRemoveRoleModalOpen(true)}
                variant="outline"
                size="sm"
                disabled={bulkRemoveRoleLoading}
                className="h-8 text-sm gap-1 border-border/30 bg-amber-600 hover:bg-amber-700 text-white hover:text-white disabled:opacity-60"
              >
                {bulkRemoveRoleLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                <span>Gỡ vai trò</span>
              </Button>

              {/* Bulk Send Email */}
              <Button
                onClick={() => setBulkEmailModalOpen(true)}
                variant="outline"
                size="sm"
                disabled={bulkEmailLoading}
                className="h-8 text-sm border-border/30 gap-1 bg-primary hover:bg-accent/70 text-primary-foreground hover:text-primary-foreground disabled:opacity-60"
              >
                {bulkEmailLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5 text-primary-foreground" />}
                <span>Gửi Email</span>
              </Button>

              {/* Bulk Delete */}
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                size="sm"
                disabled={bulkDeleteLoading}
                className="h-8 text-sm border-border/30 gap-1 bg-destructive hover:bg-accent/70 text-primary-foreground hover:text-primary-foreground disabled:opacity-60"
              >
                {bulkDeleteLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>{bulkDeleteLoading ? "Đang xóa..." : "Xóa chọn"}</span>
              </Button>

              <Button
                onClick={() => setSelectedUserIds([])}
                variant="ghost"
                size="sm"
                className="h-8 text-sm border-border/30 gap-1 bg-background hover:bg-accent/70 text-primary hover:text-primary-foreground"
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

          <Table containerClassName="max-h-[calc(100vh-240px)] min-h-[240px] overflow-auto border-b border-border/20 ">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
              <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                <TableHead className="w-8 pb-4">
                  <Checkbox
                    checked={users.length > 0 && selectedUserIds.length === users.length}
                    onCheckedChange={(checked) => handleSelectAllUsers(!!checked)}
                    className="translate-y-0.5 border-border/30"
                  />
                </TableHead>
                
                <TableHead
                  className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group"
                  onClick={() => handleSort("fullName")}
                  title="Click 1 lần: Tăng (ASC) | Click 2 lần: Giảm (DESC) | Click 3 lần: Bỏ sắp xếp"
                >
                  <div className="flex items-center gap-1.5 pl-2">
                    <span className={getSortRuleInfo("fullName") ? "text-primary font-bold" : "text-muted-foreground"}>
                      Người dùng
                    </span>
                    {renderSortIcon("fullName")}
                  </div>
                </TableHead>

                <TableHead
                  className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group"
                  onClick={() => handleSort("gender")}
                  title="Click 1 lần: Tăng (ASC) | Click 2 lần: Giảm (DESC) | Click 3 lần: Bỏ sắp xếp"
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className={getSortRuleInfo("gender") ? "text-primary font-bold" : "text-muted-foreground"}>
                      Giới tính
                    </span>
                    {renderSortIcon("gender")}
                  </div>
                </TableHead>

                <TableHead
                  className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group"
                  onClick={() => handleSort("dateOfBirth")}
                  title="Click 1 lần: Tăng (ASC) | Click 2 lần: Giảm (DESC) | Click 3 lần: Bỏ sắp xếp"
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className={getSortRuleInfo("dateOfBirth") ? "text-primary font-bold" : "text-muted-foreground"}>
                      Ngày sinh
                    </span>
                    {renderSortIcon("dateOfBirth")}
                  </div>
                </TableHead>

                <TableHead className="text-sm pb-4 text-center font-semibold text-muted-foreground uppercase tracking-wider">Vai trò</TableHead>

                <TableHead
                  className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group"
                  onClick={() => handleSort("status")}
                  title="Click 1 lần: Tăng (ASC) | Click 2 lần: Giảm (DESC) | Click 3 lần: Bỏ sắp xếp"
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className={getSortRuleInfo("status") ? "text-primary font-bold" : "text-muted-foreground"}>
                      Trạng thái
                    </span>
                    {renderSortIcon("status")}
                  </div>
                </TableHead>

                <TableHead
                  className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group"
                  onClick={() => handleSort("createdAt")}
                  title="Click 1 lần: Tăng (ASC) | Click 2 lần: Giảm (DESC) | Click 3 lần: Bỏ sắp xếp"
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className={getSortRuleInfo("createdAt") ? "text-primary font-bold" : "text-muted-foreground"}>
                      Ngày tham gia
                    </span>
                    {renderSortIcon("createdAt")}
                  </div>
                </TableHead>

                <TableHead className="text-sm text-center pb-4 font-semibold text-muted-foreground uppercase tracking-wider">Thao tác</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="opacity-90">
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground text-sm">
                    Không tìm thấy tài khoản người dùng nào thỏa mãn.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u, index) => (
                  <TableRow key={u.id || index} className="hover:bg-foreground/10 transition-colors border-border/30">
                    <TableCell>
                      <Checkbox
                        checked={selectedUserIds.includes(String(u.id))}
                        onCheckedChange={() => handleSelectUser(u.id)}
                        className="translate-y-0.5 border-border/30"
                      />
                    </TableCell>

                    {/* User Info Column */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs shrink-0 border border-primary/20 overflow-hidden">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.fullName} className="h-full w-full object-cover" />
                          ) : (
                            u.fullName ? u.fullName.charAt(0).toUpperCase() : "U"
                          )}
                        </div>
                        <div className="text-left">
                          <p
                            onClick={() => handleViewUserDetail(u.id)}
                            className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors"
                          >
                            {u.fullName || "Chưa cập nhật"}
                          </p>
                          <p className="text-sm text-muted-foreground">{u.username}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Gender Column */}
                    <TableCell className="text-center">
                      {u.gender === 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-forest/10 text-success-forest border border-sky-500/20">Nam</span>
                      ) : u.gender === 1 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg- text-pink-600 border border-pink-500/20">Nữ</span>
                      ) : u.gender === 2 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 border border-purple-500/20">Khác</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">--</span>
                      )}
                    </TableCell>

                    {/* Date of Birth Column */}
                    <TableCell className="text-center text-sm text-muted-foreground font-medium">
                      {u.dateOfBirth
                        ? (() => {
                            const dateStr = u.dateOfBirth.slice(0, 10);
                            const parts = dateStr.split("-");
                            return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
                          })()
                        : "--"}
                    </TableCell>

                    {/* Roles Column */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {u.roles && u.roles.length > 0 ? (
                          u.roles.map((roleName, rIdx) => (
                            <span
                              key={rIdx}
                              className="px-2 py-0.5 rounded-full text-sm bg-primary/10 text-primary font-semibold uppercase border border-primary/20"
                            >
                              {roleName.replace("ROLE_", "")}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Chưa phân vai trò</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Status Column */}
                    <TableCell className=" text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-semibold text-sm inline-flex items-center gap-1 ${
                          u.status === "ACTIVE"
                            ? "bg-success-forest/10 text-success-forest border border-success-forest/20"
                            : u.status === "LOCKED"
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : u.status === "DELETED"
                            ? "bg-alert-crimson/10 text-alert-crimson border border-alert-crimson/20"
                            : u.status === "VERIFICATION"
                            ? "bg-alert-orange/10 text-alert-orange border border-border/40"
                            : "bg-accent/10 text-accent border border-accent/20"
                            
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            u.status === "ACTIVE"
                              ? "bg-success-forest"
                              : u.status === "LOCKED"
                              ? "bg-destructive"
                              : u.status === "DELETED"
                              ? "bg-alert-crimson"
                              : u.status === "VERIFICATION"
                              ? "bg-alert-orange"
                              : "bg-muted-foreground"
                          }`}
                        />
                        {u.status || "ACTIVE"}
                      </span>
                    </TableCell>

                    {/* Created At */}
                    <TableCell className="text-muted-foreground text-sm font-semibold text-center">
                      {u.createdAt
                        ? (() => {
                            const date = new Date(u.createdAt);
                            const dd = String(date.getDate()).padStart(2, "0");
                            const mm = String(date.getMonth() + 1).padStart(2, "0");
                            const yyyy = date.getFullYear();
                            return `${dd}/${mm}/${yyyy}`;
                          })()
                        : ""}
                    </TableCell>

                    {/* Actions Column */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        

        {/* Modern Table Footer */}
        <div className="px-5 py-3 bg-card/40 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          {/* Left: Total Results Summary */}
          <div className="text-muted-foreground font-medium">
            Hiển thị từ <span className="font-semibold text-foreground">{totalElements === 0 ? 0 : page * pageSize + 1}</span> đến {" "}
            <span className="font-semibold text-foreground">{Math.min((page + 1) * pageSize, totalElements)}</span> trong {" "}
            <span className="font-semibold text-foreground">{totalElements}</span> người.
          </div>

          <div className="flex flex-wrap items-center gap-5">
            {/* Middle: Rows per page Select */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Số hàng:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-auto min-w-[70px] px-2.5 text-sm bg-background border border-border/40 rounded-lg font-semibold">
                  <SelectValue placeholder={String(pageSize)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="9999">Tất cả</SelectItem>
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
              <span className="text-muted-foreground font-medium">Trang:</span>
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
                className="h-8 w-14 text-center text-sm font-semibold bg-background border border-border/40 rounded-lg px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                className="h-8 px-2.5 text-sm font-semibold gap-1 border-border/40 rounded-lg hover:bg-accent/70"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
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
                        : "border-border/40 text-foreground hover:bg-accent/70"
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
                className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-accent/70"
              >
                <ChevronRight className="h-3.5 w-3.5 hover:text-primary-foreground" />
              </Button>
            </div>
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
                  <Select name="gender" defaultValue={String(editingUser?.gender ?? "0")}>
                    <SelectTrigger className="h-9 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Nam</SelectItem>
                      <SelectItem value="1">Nữ</SelectItem>
                      <SelectItem value="2">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Ngày sinh</Label>
                  <input type="hidden" name="dateOfBirth" value={modalDateOfBirth} />
                  <Popover>
                    <PopoverTrigger
                      nativeButton={false}
                      render={
                        <div className="relative w-full">
                          <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                          <Input
                            type="text"
                            placeholder="dd/mm/yyyy"
                            value={modalDateInputVal}
                            onChange={(e) => {
                              const val = formatAsDDMMYYYYMask(e.target.value, modalDateInputVal);
                              setModalDateInputVal(val);
                              const yyyymmdd = parseDDMMYYYYToYYYYMMDD(val);
                              if (yyyymmdd) {
                                setModalDateOfBirth(yyyymmdd);
                                setModalCalendarMonth(parseYYYYMMDD(yyyymmdd));
                              } else if (!val) {
                                setModalDateOfBirth("");
                              }
                            }}
                            maxLength={10}
                            className="pl-8 h-9 text-xs border-border bg-background focus-visible:ring-2 focus-visible:ring-primary/20"
                          />
                        </div>
                      }
                    />
                    <PopoverContent className="w-auto p-0 z-50 bg-popover border border-border shadow-xl rounded-xl" align="start">
                      <CalendarComponent
                        mode="single"
                        captionLayout="dropdown"
                        startMonth={new Date(1950, 0)}
                        endMonth={new Date()}
                        selected={parseYYYYMMDD(modalDateOfBirth)}
                        month={modalCalendarMonth}
                        onMonthChange={setModalCalendarMonth}
                        onSelect={(date) => {
                          if (date) {
                            const yyyy = date.getFullYear();
                            const mm = String(date.getMonth() + 1).padStart(2, "0");
                            const dd = String(date.getDate()).padStart(2, "0");
                            const yyyymmdd = `${yyyy}-${mm}-${dd}`;
                            setModalDateOfBirth(yyyymmdd);
                            setModalDateInputVal(`${dd}/${mm}/${yyyy}`);
                            setModalCalendarMonth(date);
                          } else {
                            setModalDateOfBirth("");
                            setModalDateInputVal("");
                          }
                        }}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Role selection - only for creating new user */}
              {!editingUser && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Vai trò <span className="text-muted-foreground font-normal">(Tùy chọn)</span></Label>
                  <Select value={createUserRoleId} onValueChange={setCreateUserRoleId}>
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
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setUserModalOpen(false)} disabled={saveUserLoading} className="h-9">Hủy</Button>
                <Button type="submit" disabled={saveUserLoading} className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 min-w-[100px] justify-center">
                  {saveUserLoading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Đang lưu...</span></> : <span>Xác nhận</span>}
                </Button>
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
                    {deptList
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
                    {roleList
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
    </section>
    </div>
    
  );
};
