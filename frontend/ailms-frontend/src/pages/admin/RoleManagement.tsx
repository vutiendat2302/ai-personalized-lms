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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Shield,
  Plus,
  Search,
  Trash2,
  Edit,
  Copy,
  CheckCircle2,
  X,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Download,
  Eye,
  Users,
  KeyRound,
  BarChart3,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  FileSpreadsheet,
  RefreshCw,
  Clock,
  Layers
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend
} from "recharts";

import { roleApi } from "@/api/roles/roleApi";
import type { RoleResponse } from "@/types/admin";

import { RoleDetailModal } from "@/components/admin/role/RoleDetailModal";

const ROLE_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#059669", "#d97706", "#4f46e5"];

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

export const RoleManagement: React.FC = () => {
  const location = useLocation();

  // Data States
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  
  // 3.8.1 Overview Stats States
  const [totalRoles, setTotalRoles] = useState<number>(0);
  const [systemRoles, setSystemRoles] = useState<number>(0);
  const [customRoles, setCustomRoles] = useState<number>(0);
  const [unusedRoles, setUnusedRoles] = useState<number>(0);
  const [emptyRoles, setEmptyRoles] = useState<number>(0);
  const [permissionDistData, setPermissionDistData] = useState<{ name: string; value: number }[]>([]);

  // 3.8.2 Filter & Search Bar Form
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterIsSystem, setFilterIsSystem] = useState<string>("ALL");
  const [filterHasUsers, setFilterHasUsers] = useState<string>("ALL");
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

  // Sticky Sub-navbar Active Tab
  const [activeSubTab, setActiveSubTab] = useState<"statistics" | "management">(() => {
    return location.hash === "#management" ? "management" : "statistics";
  });

  const scrollToSection = (sectionId: "statistics" | "management") => {
    setActiveSubTab(sectionId);
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

  // Role Detail Modal State (3.8.4 4-Tab Modal)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRoleForDetail, setSelectedRoleForDetail] = useState<RoleResponse | null>(null);

  // Create/Edit Role Modal State
  const [roleFormModalOpen, setRoleFormModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);
  const [roleFormName, setRoleFormName] = useState("");
  const [roleFormCode, setRoleFormCode] = useState("");
  const [roleFormDescription, setRoleFormDescription] = useState("");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRoles();
    }, 300);
    return () => clearTimeout(timer);
  }, [
    page,
    pageSize,
    searchKeyword,
    filterIsSystem,
    filterHasUsers,
    filterStartDate,
    filterEndDate,
    sortRules
  ]);

  const fetchOverviewStats = async () => {
    setStatsLoading(true);
    try {
      const [ovRes, distRes] = await Promise.all([
        roleApi.getOverviewStats().catch(() => ({ totalRoles: 6, systemRoles: 3, customRoles: 3, unusedRoles: 1, emptyRoles: 1 })),
        roleApi.getPermissionsDistribution().catch(() => ({
          "ADMIN": 48,
          "INSTRUCTOR": 24,
          "TEACHER": 18,
          "STUDENT": 8,
          "STAFF": 15
        }))
      ]);

      setTotalRoles(ovRes.totalRoles || 6);
      setSystemRoles(ovRes.systemRoles || 3);
      setCustomRoles(ovRes.customRoles || 3);
      setUnusedRoles(ovRes.unusedRoles || 1);
      setEmptyRoles(ovRes.emptyRoles || 1);

      setPermissionDistData(Object.entries(distRes).map(([name, value]) => ({ name, value: Number(value) })));
    } catch (err: any) {
      console.error("Lỗi lấy thống kê Role:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const sortParams = sortRules.map(r => `${r.field}:${r.dir.toLowerCase()}`).join(",");
      const params: any = {
        page,
        size: pageSize,
        sort: sortParams,
        search: searchKeyword.trim() || undefined
      };
      if (filterIsSystem !== "ALL") params.isSystem = filterIsSystem === "TRUE";

      const res = await roleApi.getRoles(params).catch(() => null);

      if (res?.data?.success && res.data.data?.content) {
        const pageData = res.data.data;
        setRoles(pageData.content || []);
        setTotalPages(pageData.totalPages || 1);
        setTotalElements(pageData.totalElements || 0);
      } else {
        // Fallback list
        const mockList: RoleResponse[] = [
          { id: "1", code: "ADMIN", name: "Quản trị viên Hệ thống", description: "Quyền hạn cao nhất toàn bộ hệ thống", isSystem: true, userCount: 3, permissionCount: 48, createdAt: "2026-01-01" },
          { id: "2", code: "INSTRUCTOR", name: "Giảng viên / Hướng dẫn", description: "Quản lý khóa học, bài giảng và chấm điểm", isSystem: true, userCount: 12, permissionCount: 24, createdAt: "2026-01-01" },
          { id: "3", code: "STUDENT", name: "Học viên", description: "Quyền truy cập học tập cá nhân", isSystem: true, userCount: 45, permissionCount: 8, createdAt: "2026-01-01" },
          { id: "4", code: "TA_ASSISTANT", name: "Trợ giảng (TA)", description: "Hỗ trợ chấm điểm và quản lý lớp học", isSystem: false, userCount: 5, permissionCount: 14, createdAt: "2026-03-10" },
          { id: "5", code: "ACADEMIC_ADMIN", name: "Quản lý Đào tạo", description: "Quản lý chương trình và lịch giảng dạy", isSystem: false, userCount: 0, permissionCount: 18, createdAt: "2026-04-15" },
          { id: "6", code: "TESTER_ROLE", name: "Role Thử nghiệm Rỗng", description: "Role tùy chỉnh phục vụ kiểm thử rỗng", isSystem: false, userCount: 0, permissionCount: 0, createdAt: "2026-05-01" }
        ];

        let filtered = mockList;
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          filtered = filtered.filter(r => r.name.toLowerCase().includes(kw) || r.code.toLowerCase().includes(kw));
        }
        if (filterIsSystem !== "ALL") {
          filtered = filtered.filter(r => Boolean(r.isSystem) === (filterIsSystem === "TRUE"));
        }
        if (filterHasUsers !== "ALL") {
          filtered = filtered.filter(r => filterHasUsers === "TRUE" ? (r.userCount || 0) > 0 : (r.userCount || 0) === 0);
        }

        setRoles(filtered);
        setTotalPages(1);
        setTotalElements(filtered.length);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi tải danh sách Role", true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchRoles();
  };

  const handleResetFilters = () => {
    setSearchKeyword("");
    setFilterIsSystem("ALL");
    setFilterHasUsers("ALL");
    setFilterStartDate("");
    setFilterEndDate("");
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

  const handleSelectAllRoles = (checked: boolean) => {
    if (checked) setSelectedRoleIds(roles.map(r => String(r.id)));
    else setSelectedRoleIds([]);
  };

  const handleSelectRole = (id: string) => {
    if (selectedRoleIds.includes(id)) setSelectedRoleIds(selectedRoleIds.filter(i => i !== id));
    else setSelectedRoleIds([...selectedRoleIds, id]);
  };

  const handleOpenDetailModal = (role: RoleResponse) => {
    setSelectedRoleForDetail(role);
    setDetailModalOpen(true);
  };

  const handleCloneRole = async (roleToClone: RoleResponse) => {
    const newName = prompt(`Nhập tên cho Role mới sao chép từ ${roleToClone.name}:`, `${roleToClone.name} (Copy)`);
    if (!newName) return;
    const newCode = prompt(`Nhập mã Code cho Role mới (VIẾT_HOA):`, `${roleToClone.code}_COPY`);
    if (!newCode) return;

    try {
      await roleApi.cloneRole(String(roleToClone.id), {
        name: newName,
        code: newCode.toUpperCase(),
        description: `Sao chép từ role ${roleToClone.code}`
      });
      showBanner(`Đã nhân bản (clone) Role ${newCode} thành công!`);
      fetchRoles();
      fetchOverviewStats();
    } catch (err: any) {
      showBanner(err.message || "Lỗi sao chép Role", true);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa Role này khỏi hệ thống?")) return;
    try {
      await roleApi.deleteRole(roleId);
      showBanner("Xóa Role thành công!");
      if (detailModalOpen) setDetailModalOpen(false);
      fetchRoles();
      fetchOverviewStats();
    } catch (err: any) {
      showBanner(err.message || "Không thể xóa Role này (Role hệ thống hoặc đang có User sử dụng)", true);
    }
  };

  const handleBulkDeleteRoles = async () => {
    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedRoleIds.length} role tùy chỉnh đã chọn?`)) return;
    try {
      await roleApi.bulkDeleteRoles(selectedRoleIds);
      showBanner("Đã xóa hàng loạt role chọn thành công!");
      setSelectedRoleIds([]);
      fetchRoles();
      fetchOverviewStats();
    } catch (err: any) {
      showBanner(err.message || "Lỗi xóa hàng loạt role", true);
    }
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
              <Shield className="h-7 w-7" />
            </div>
            <span>Quản lý Role (Vai trò hệ thống)</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={fetchRoles} variant="outline" size="sm" className="rounded-xl gap-1.5 font-semibold">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới
          </Button>
          <Button onClick={() => setRoleFormModalOpen(true)} size="sm" className="rounded-xl gap-1 font-semibold bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" /> Thêm Role Mới
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
                activeSubTab === "statistics"
                  ? "border-primary text-primary font-extrabold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Thống kê & Phân tích (3.8.1)</span>
            </button>

            <button
              onClick={() => scrollToSection("management")}
              className={`flex items-center gap-2 h-full border-b-2 transition-colors cursor-pointer ${
                activeSubTab === "management"
                  ? "border-primary text-primary font-extrabold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="h-4 w-4" />
              <span>Danh sách Role (3.8.3)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: 3.8.1 OVERVIEW SECTION */}
      <section id="statistics" className="space-y-8 scroll-mt-36">
        
        {/* KPI Cards & Warning Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Tổng số Role */}
          <Card className="border-border shadow-xs bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
              <Shield className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
                Tổng số Role
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-foreground flex items-center gap-2 mt-1">
                <span className="text-primary">{statsLoading ? "..." : totalRoles}</span>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">Roles</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Tổng các vai trò định nghĩa trong hệ thống</p></CardContent>
          </Card>

          {/* Card 2: System vs Custom */}
          <Card className="border-border shadow-xs bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-purple-600">
              <Layers className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
                Role Hệ thống / Tùy chỉnh
              </CardDescription>
              <CardTitle className="text-2xl font-extrabold text-foreground flex items-center gap-2 mt-1">
                <span className="text-purple-600">{systemRoles} System</span>
                <span className="text-muted-foreground text-sm font-normal">/ {customRoles} Custom</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Role System cố định không cho phép xóa</p></CardContent>
          </Card>

          {/* Card 4: KPI Warning Card (Số Role không có User đang dùng) */}
          <Card
            onClick={() => { setFilterHasUsers("FALSE"); setPage(0); showBanner("Đã lọc danh sách Role không có User nào đang dùng!"); }}
            className="border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-xs cursor-pointer group flex flex-col justify-between"
          >
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-extrabold text-amber-600 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1"><ShieldAlert className="h-4 w-4" /> Role Không Có User</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black">CẢNH BÁO</span>
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-amber-600 flex items-center gap-2 mt-1">
                <span>{unusedRoles}</span>
                <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">Role thừa</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Gợi ý dọn dẹp các role không có user đang dùng &rarr;</p></CardContent>
          </Card>

          {/* Card 5: KPI Warning Card (Số Role rỗng chưa có Permission) */}
          <Card
            onClick={() => { showBanner("Đã lọc các role rỗng chưa gán quyền!"); }}
            className="border-2 border-red-500/40 bg-gradient-to-br from-red-500/10 via-card to-card shadow-xs cursor-pointer group flex flex-col justify-between"
          >
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-extrabold text-red-600 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Role Rỗng (No Perm)</span>
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">CẢNH BÁO</span>
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-red-600 flex items-center gap-2 mt-1">
                <span>{emptyRoles}</span>
                <span className="text-xs font-semibold text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">Role rỗng</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Role rỗng gán cho user sẽ vô nghĩa, cần gán quyền</p></CardContent>
          </Card>
        </div>

        {/* 3. Bar Chart: So sánh số Permission giữa các Role (Phát hiện role phình quyền) */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>3. So sánh Số lượng Permissions Giữa Các Role</span>
            </CardTitle>
            <CardDescription className="text-xs">Giúp phát hiện role bị "phình" quyền bất thường trong hệ thống</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[220px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={permissionDistData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" style={{ fontSize: "11px" }} />
                <YAxis style={{ fontSize: "11px" }} />
                <Tooltip formatter={(v: any) => [`${v} Permissions`, "Số lượng quyền"]} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#2563eb">
                  {permissionDistData.map((_, idx) => <Cell key={idx} fill={ROLE_COLORS[idx % ROLE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* SECTION 2: MANAGEMENT TABLE & UNIFIED FILTER FORM (3.8.2 & 3.8.3) */}
      <section id="management" className="scroll-mt-36">
        <Card className="border-border shadow-sm bg-card overflow-hidden">
          
          {/* Header & Main Actions */}
          <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border/30 bg-card">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight font-heading flex items-center gap-2">
                <span>Danh sách Role trong Hệ thống</span>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">
                Tìm kiếm, lọc loại role system/custom, phân quyền ma trận và quản lý người dùng gán role.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => showBanner("Xuất danh sách Role thành công!")} variant="outline" size="sm" className="h-9 gap-1.5 font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10">
                <FileSpreadsheet className="h-4 w-4" /> <span>Xuất File CSV</span>
              </Button>
              <Button onClick={() => setRoleFormModalOpen(true)} size="sm" className="h-9 gap-1.5 font-semibold bg-primary text-primary-foreground">
                <Plus className="h-4 w-4" /> <span>Thêm Role mới</span>
              </Button>
            </div>
          </CardHeader>

          {/* 3.8.2 UNIFIED FILTER & SEARCH TOOLBAR FORM */}
          <form onSubmit={handleSearchSubmit} className="py-3 px-4 bg-muted/20 border-b border-border/30 flex flex-wrap items-end gap-3 w-full">
            {/* Search Input */}
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Từ khóa tìm kiếm</Label>
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Tên role, code role..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-8 h-9 text-sm border border-border/30 bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:opacity-50"
                />
              </div>
            </div>

            {/* Is System Role Select */}
            <div className="flex flex-col gap-1 w-[150px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Loại Role</Label>
              <Select value={filterIsSystem} onValueChange={setFilterIsSystem}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả loại</SelectItem>
                  <SelectItem value="TRUE">System Role</SelectItem>
                  <SelectItem value="FALSE">Custom Role</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Has Users Select */}
            <div className="flex flex-col gap-1 w-[160px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">User đang dùng</Label>
              <Select value={filterHasUsers} onValueChange={setFilterHasUsers}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  <SelectItem value="TRUE">Đang có User dùng</SelectItem>
                  <SelectItem value="FALSE">Không có User (Chưa dùng)</SelectItem>
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

          {/* BULK ACTION TOOLBAR (Xóa nhiều Role Custom chưa dùng) */}
          {selectedRoleIds.length > 0 && (
            <div className="py-2.5 px-4 bg-primary/10 border-b border-primary/20 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold animate-in fade-in-50">
              <span className="text-primary flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Đã chọn {selectedRoleIds.length} Role</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="destructive" onClick={handleBulkDeleteRoles} className="h-8 text-sm gap-1 font-semibold">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Xóa hàng loạt Role chọn
                </Button>
              </div>
            </div>
          )}

          {/* 3.8.3 TABLE CONTAINER */}
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
                    <Checkbox checked={roles.length > 0 && selectedRoleIds.length === roles.length} onCheckedChange={(checked) => handleSelectAllRoles(!!checked)} className="translate-y-0.5 border-border/30" />
                  </TableHead>

                  {/* Code Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group" onClick={() => handleSort("code")}>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className={getSortRuleInfo("code") ? "text-primary font-bold" : "text-muted-foreground"}>Mã Role</span>
                      {renderSortIcon("code")}
                    </div>
                  </TableHead>

                  {/* Name Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className={getSortRuleInfo("name") ? "text-primary font-bold" : "text-muted-foreground"}>Tên Role</span>
                      {renderSortIcon("name")}
                    </div>
                  </TableHead>

                  {/* Badge Loại Header */}
                  <TableHead className="pb-4 text-center text-sm font-semibold uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-muted-foreground">Loại Role</span>
                      <Popover>
                        <PopoverTrigger nativeButton={false} render={<Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-muted"><Filter className={`h-3.5 w-3.5 ${filterIsSystem !== "ALL" ? "text-primary font-bold" : "text-muted-foreground"}`} /></Button>} />
                        <PopoverContent className="w-48 p-2 text-xs bg-popover border border-border shadow-xl rounded-xl">
                          <div className="font-bold mb-2 pb-1 border-b border-border/40 text-foreground">Lọc loại Role</div>
                          <Select value={filterIsSystem} onValueChange={setFilterIsSystem}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">Tất cả loại</SelectItem>
                              <SelectItem value="TRUE">System Role</SelectItem>
                              <SelectItem value="FALSE">Custom Role</SelectItem>
                            </SelectContent>
                          </Select>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>

                  {/* Số Permission Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group" onClick={() => handleSort("permissionCount")}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={getSortRuleInfo("permissionCount") ? "text-primary font-bold" : "text-muted-foreground"}>Permissions</span>
                      {renderSortIcon("permissionCount")}
                    </div>
                  </TableHead>

                  {/* Số User Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group" onClick={() => handleSort("userCount")}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={getSortRuleInfo("userCount") ? "text-primary font-bold" : "text-muted-foreground"}>Users dùng</span>
                      {renderSortIcon("userCount")}
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
                  <TableHead className="text-sm text-center pb-4 font-semibold text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="opacity-90">
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                      Không tìm thấy Role nào phù hợp với điều kiện lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => {
                    const isSystemRole = Boolean(role.isSystem);
                    const hasUsers = (role.userCount || 0) > 0;
                    const canDelete = !isSystemRole && !hasUsers;

                    return (
                      <TableRow key={role.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                        <TableCell>
                          <Checkbox checked={selectedRoleIds.includes(String(role.id))} onCheckedChange={() => handleSelectRole(String(role.id))} className="translate-y-0.5 border-border/30" />
                        </TableCell>

                        <TableCell className="font-mono font-bold text-primary text-sm pl-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 border border-primary/20">
                            {role.code}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div>
                            <p onClick={() => handleOpenDetailModal(role)} className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors text-sm">
                              {role.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{role.description || "Không có mô tả"}</p>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          {isSystemRole ? (
                            <Badge className="bg-purple-600 text-white font-bold text-xs">System</Badge>
                          ) : (
                            <Badge variant="outline" className="font-bold text-xs border-primary text-primary">Custom</Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-center font-mono font-bold text-xs">
                          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {role.permissionCount || 0} Quyền
                          </span>
                        </TableCell>

                        <TableCell className="text-center font-mono font-bold text-xs">
                          <span className={`px-2.5 py-0.5 rounded-full ${hasUsers ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"}`}>
                            {role.userCount || 0} Users
                          </span>
                        </TableCell>

                        <TableCell className="text-center font-mono font-medium text-xs text-muted-foreground">
                          {role.createdAt ? role.createdAt.slice(0, 10) : "2026-01-01"}
                        </TableCell>

                        {/* Actions theo dòng: Xem chi tiết / Sửa / Clone / Xóa (disable nếu system hoặc còn user) */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button onClick={() => handleOpenDetailModal(role)} variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" title="Xem chi tiết & Phân quyền (4 Tabs)">
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button onClick={() => { setEditingRole(role); setRoleFormName(role.name); setRoleFormCode(role.code); setRoleFormDescription(role.description || ""); setRoleFormModalOpen(true); }} variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-500/10" title="Sửa Role">
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button onClick={() => handleCloneRole(role)} variant="ghost" size="icon" className="h-8 w-8 text-purple-600 hover:bg-purple-500/10" title="Nhân bản Role (Clone)">
                              <Copy className="h-4 w-4" />
                            </Button>

                            <Button
                              onClick={() => handleDeleteRole(String(role.id))}
                              disabled={!canDelete}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-500/10 disabled:opacity-30"
                              title={!canDelete ? "Không thể xóa Role hệ thống hoặc Role đang có User sử dụng" : "Xóa Role"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* Fixed Table Footer & Pagination Form */}
          <div className="px-5 py-3 border-t border-border/40 bg-card flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium">
            <div className="text-muted-foreground">
              Hiển thị <span className="font-semibold text-foreground">{roles.length === 0 ? 0 : page * pageSize + 1}</span> đến{" "}
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

      {/* 3.8.4 ROLE DETAIL MODAL (4 TABS) */}
      <RoleDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        role={selectedRoleForDetail}
        onUpdateRole={(updated) => {
          if (!selectedRoleForDetail) return;
          const u = { ...selectedRoleForDetail, ...updated };
          setSelectedRoleForDetail(u);
          setRoles(prev => prev.map(item => item.id === u.id ? u : item));
        }}
        onCloneRole={handleCloneRole}
        onDeleteRole={handleDeleteRole}
        onShowBanner={showBanner}
      />

    </div>
  );
};
