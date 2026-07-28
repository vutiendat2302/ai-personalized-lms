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
  FileKey,
  Plus,
  Search,
  Trash2,
  Edit,
  CheckCircle2,
  X,
  ArrowLeft,
  Loader2,
  AlertCircle,
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
  Layers,
  PieChart as PieIcon,
  Tag
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
  Legend,
  PieChart,
  Pie
} from "recharts";

import { permissionApi } from "@/api/permissions/permissionApi";
import type { PermissionResponse } from "@/types/admin";
import { PermissionDetailModal } from "@/components/admin/permission/PermissionDetailModal";

const PERM_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#059669", "#d97706", "#06b6d4"];

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

export const PermissionManagement: React.FC = () => {
  const location = useLocation();

  // Data States
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  
  // 3.9.1 Overview Stats States
  const [totalPermissions, setTotalPermissions] = useState<number>(0);
  const [totalEntities, setTotalEntities] = useState<number>(0);
  const [orphanPermissions, setOrphanPermissions] = useState<number>(0);
  
  const [byEntityData, setByEntityData] = useState<{ name: string; value: number }[]>([]);
  const [topUsedData, setTopUsedData] = useState<{ name: string; value: number }[]>([]);
  const [byActionData, setByActionData] = useState<{ name: string; value: number }[]>([]);

  // 3.9.2 Filter & Search Bar Form
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterEntity, setFilterEntity] = useState<string>("ALL");
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [filterIsUsed, setFilterIsUsed] = useState<string>("ALL");
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

  // Permission Detail Modal State (3.9.4 Modal)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPermForDetail, setSelectedPermForDetail] = useState<PermissionResponse | null>(null);

  // Create/Edit Modal
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState<PermissionResponse | null>(null);

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPermissions();
    }, 300);
    return () => clearTimeout(timer);
  }, [
    page,
    pageSize,
    searchKeyword,
    filterEntity,
    filterAction,
    filterIsUsed,
    filterStartDate,
    filterEndDate,
    sortRules
  ]);

  const fetchOverviewStats = async () => {
    setStatsLoading(true);
    try {
      const data = await permissionApi.getOverviewStats();

      setTotalPermissions(data?.totalPermissions || 0);
      setTotalEntities(data?.totalEntities || 0);
      setOrphanPermissions(data?.orphanPermissions || 0);

      if (data?.permissionsByEntity) {
        setByEntityData(Object.entries(data.permissionsByEntity).map(([name, value]) => ({ name, value: Number(value) })));
      } else {
        setByEntityData([]);
      }
      if (data?.topUsedPermissions) {
        setTopUsedData(Object.entries(data.topUsedPermissions).map(([name, value]) => ({ name, value: Number(value) })));
      } else {
        setTopUsedData([]);
      }
      if (data?.permissionsByAction) {
        setByActionData(Object.entries(data.permissionsByAction).map(([name, value]) => ({ name, value: Number(value) })));
      } else {
        setByActionData([]);
      }
    } catch (err: any) {
      console.error("Lỗi lấy thống kê Permission:", err);
      setTotalPermissions(0);
      setTotalEntities(0);
      setOrphanPermissions(0);
      setByEntityData([]);
      setTopUsedData([]);
      setByActionData([]);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const sortParams = sortRules.map(r => `${r.field}:${r.dir.toLowerCase()}`).join(",");
      const params: any = {
        page,
        size: pageSize,
        sort: sortParams,
        keyword: searchKeyword.trim() || undefined,
        search: searchKeyword.trim() || undefined
      };
      if (filterEntity !== "ALL") params.entity = filterEntity;
      if (filterAction !== "ALL") params.action = filterAction;

      const res = await permissionApi.getPermissions(params);

      if (res?.data?.success && res.data.data?.content) {
        const pageData = res.data.data;
        setPermissions(pageData.content || []);
        setTotalPages(pageData.totalPages || 1);
        setTotalElements(pageData.totalElements || 0);
      } else {
        setPermissions([]);
        setTotalPages(1);
        setTotalElements(0);
      }
    } catch (err: any) {
      showBanner(err?.response?.data?.message || err.message || "Lỗi tải danh sách Permission", true);
      setPermissions([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchPermissions();
  };

  const handleResetFilters = () => {
    setSearchKeyword("");
    setFilterEntity("ALL");
    setFilterAction("ALL");
    setFilterIsUsed("ALL");
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedPermIds(permissions.map(p => String(p.id)));
    else setSelectedPermIds([]);
  };

  const handleSelectPerm = (id: string) => {
    if (selectedPermIds.includes(id)) setSelectedPermIds(selectedPermIds.filter(i => i !== id));
    else setSelectedPermIds([...selectedPermIds, id]);
  };

  const handleOpenDetailModal = (perm: PermissionResponse) => {
    setSelectedPermForDetail(perm);
    setDetailModalOpen(true);
  };

  const handleDeletePermission = async (permId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa Permission này?")) return;
    try {
      await permissionApi.deletePermission(permId);
      showBanner("Xóa Permission thành công!");
      fetchPermissions();
      fetchOverviewStats();
    } catch (err: any) {
      showBanner(err.message || "Không thể xóa Permission đang được gán cho Role", true);
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
              <FileKey className="h-7 w-7" />
            </div>
            <span>Quản lý Permission (Quyền hạn chi tiết)</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => { fetchPermissions(); fetchOverviewStats(); }} variant="outline" size="sm" className="rounded-xl gap-1.5 font-semibold">
            <RefreshCw className={`h-4 w-4 ${loading || statsLoading ? "animate-spin" : ""}`} /> Làm mới
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
              <span>Thống kê & Phân tích (3.9.1)</span>
            </button>

            <button
              onClick={() => scrollToSection("management")}
              className={`flex items-center gap-2 h-full border-b-2 transition-colors cursor-pointer ${
                activeSubTab === "management"
                  ? "border-primary text-primary font-extrabold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileKey className="h-4 w-4" />
              <span>Danh sách Permission (3.9.3)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: 3.9.1 OVERVIEW SECTION (5 CHARTS/CARDS) */}
      <section id="statistics" className="space-y-8 scroll-mt-36">
        
        {/* Top 2 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Tổng số Permission / Số Entity */}
          <Card className="border-border shadow-xs bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
              <FileKey className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
                1. Tổng số Permission / Thực thể Entity
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-foreground flex items-center gap-3 mt-1">
                {statsLoading ? (
                  <div className="flex items-center gap-2 text-primary">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-base font-normal">Đang tải...</span>
                  </div>
                ) : (
                  <>
                    <span className="text-primary">{totalPermissions} Permissions</span>
                    <span className="text-sm font-bold text-muted-foreground">/ {totalEntities} Entities</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Danh mục quyền hạn định nghĩa qua mã nguồn và migration hệ thống</p></CardContent>
          </Card>

          {/* Card 4: KPI Warning Card (Số Permission Mồ Côi Chưa Gán Role) */}
          <Card
            onClick={() => { setFilterIsUsed("ORPHAN"); setPage(0); showBanner("Đã lọc danh sách Permission mồ côi chưa được gán cho role nào!"); }}
            className="border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-xs cursor-pointer group flex flex-col justify-between"
          >
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-extrabold text-amber-600 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1"><ShieldAlert className="h-4 w-4" /> 4. Permission Mồ Côi (No Role)</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black">CẢNH BÁO</span>
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-amber-600 flex items-center gap-2 mt-1">
                {statsLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-base font-normal">Đang tải...</span>
                  </div>
                ) : (
                  <>
                    <span>{orphanPermissions}</span>
                    <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">Chưa gán Role</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Có thể do tạo thừa hoặc chưa seed data vào role_permission &rarr;</p></CardContent>
          </Card>
        </div>

        {/* 3 Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 2. Bar Chart (Số lượng Permission theo Entity) */}
          <Card className="lg:col-span-6 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>2. Số lượng Permission Theo Entity</span>
              </CardTitle>
              <CardDescription className="text-xs">Phát hiện Entity nào chứa nhiều action quyền hạn nhất</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[220px] flex items-center justify-center">
              {statsLoading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs">Đang tải thống kê entity...</span>
                </div>
              ) : byEntityData.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-muted-foreground text-xs py-10 gap-2">
                  <BarChart3 className="h-8 w-8 opacity-40" />
                  <span>Không có dữ liệu thống kê entity</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byEntityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" style={{ fontSize: "11px" }} />
                    <YAxis style={{ fontSize: "11px" }} />
                    <Tooltip formatter={(v: any) => [`${v} Quyền`, "Số lượng permission"]} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#2563eb">
                      {byEntityData.map((_, idx) => <Cell key={idx} fill={PERM_COLORS[idx % PERM_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* 3. Horizontal Bar Chart (Top Permission Được Dùng Nhiều Nhất) */}
          <Card className="lg:col-span-6 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                <span>3. Top Permission Được Dùng Nhiều Nhất (Gán Cho Nhiều Role)</span>
              </CardTitle>
              <CardDescription className="text-xs">Danh sách các quyền phổ biến nhất trong các vai trò hệ thống</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[220px] flex items-center justify-center">
              {statsLoading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  <span className="text-xs">Đang tải top permission...</span>
                </div>
              ) : topUsedData.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-muted-foreground text-xs py-10 gap-2">
                  <Layers className="h-8 w-8 opacity-40" />
                  <span>Không có dữ liệu top permission</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topUsedData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" style={{ fontSize: "11px" }} />
                    <YAxis dataKey="name" type="category" style={{ fontSize: "11px" }} width={80} />
                    <Tooltip formatter={(v: any) => [`${v} Roles`, "Số role gán"]} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#7c3aed" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* 5. Donut Chart (Phân bổ Permission theo Loại Action) */}
          <Card className="lg:col-span-12 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-emerald-600" />
                <span>5. Phân bổ Permission Theo Loại Action (VIEW / CREATE / EDIT / DELETE / APPROVE)</span>
              </CardTitle>
              <CardDescription className="text-xs">Tỷ lệ các loại hành động trong toàn bộ hệ thống phân quyền</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px] flex items-center justify-center">
              {statsLoading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <span className="text-xs">Đang tải phân bổ action...</span>
                </div>
              ) : byActionData.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-muted-foreground text-xs py-10 gap-2">
                  <PieIcon className="h-8 w-8 opacity-40" />
                  <span>Không có dữ liệu thống kê action</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byActionData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                      {byActionData.map((_, idx) => <Cell key={idx} fill={PERM_COLORS[idx % PERM_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} Quyền`, "Số lượng"]} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* SECTION 2: MANAGEMENT TABLE & UNIFIED FILTER FORM (3.9.2 & 3.9.3) */}
      <section id="management" className="scroll-mt-36">
        <Card className="border-border shadow-sm bg-card overflow-hidden">
          
          {/* Header & Main Actions */}
          <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border/30 bg-card">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight font-heading flex items-center gap-2">
                <span>Danh sách Permission trong Hệ thống</span>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">
                Các quyền hạn được định nghĩa cho từng Entity và Action. Chỉ xem và gán vào Role, hạn chế thêm sửa xóa trực tiếp qua UI.
              </CardDescription>
            </div>
          </CardHeader>

          {/* 3.9.2 UNIFIED FILTER & SEARCH TOOLBAR FORM */}
          <form onSubmit={handleSearchSubmit} className="py-3 px-4 bg-muted/20 border-b border-border/30 flex flex-wrap items-end gap-3 w-full">
            {/* Search Input */}
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Từ khóa tìm kiếm</Label>
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Mã code, entity, action..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-8 h-9 text-sm border border-border/30 bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:opacity-50"
                />
              </div>
            </div>

            {/* Select Entity */}
            <div className="flex flex-col gap-1 w-[150px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Thực thể (Entity)</Label>
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả Entity</SelectItem>
                  <SelectItem value="USER">USER</SelectItem>
                  <SelectItem value="STUDENT">STUDENT</SelectItem>
                  <SelectItem value="COURSE">COURSE</SelectItem>
                  <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
                  <SelectItem value="ROLE">ROLE</SelectItem>
                  <SelectItem value="SALARY">SALARY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Select Action */}
            <div className="flex flex-col gap-1 w-[140px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Hành động (Action)</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả Action</SelectItem>
                  <SelectItem value="VIEW">VIEW</SelectItem>
                  <SelectItem value="CREATE">CREATE</SelectItem>
                  <SelectItem value="EDIT">EDIT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="APPROVE">APPROVE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Select Is Used */}
            <div className="flex flex-col gap-1 w-[160px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Trạng thái Gán Role</Label>
              <Select value={filterIsUsed} onValueChange={setFilterIsUsed}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  <SelectItem value="USED">Đang gán cho Role</SelectItem>
                  <SelectItem value="ORPHAN">Mồ côi (Chưa gán Role)</SelectItem>
                </SelectContent>
              </Select>
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

          {/* 3.9.3 TABLE CONTAINER */}
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
                    <Checkbox checked={permissions.length > 0 && selectedPermIds.length === permissions.length} onCheckedChange={(checked) => handleSelectAll(!!checked)} className="translate-y-0.5 border-border/30" />
                  </TableHead>

                  {/* Entity Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group" onClick={() => handleSort("entity")}>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className={getSortRuleInfo("entity") ? "text-primary font-bold" : "text-muted-foreground"}>Entity</span>
                      {renderSortIcon("entity")}
                    </div>
                  </TableHead>

                  {/* Action Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group" onClick={() => handleSort("action")}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={getSortRuleInfo("action") ? "text-primary font-bold" : "text-muted-foreground"}>Action</span>
                      {renderSortIcon("action")}
                    </div>
                  </TableHead>

                  {/* Code / Name Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group" onClick={() => handleSort("code")}>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className={getSortRuleInfo("code") ? "text-primary font-bold" : "text-muted-foreground"}>Mã Code / Tên hiển thị</span>
                      {renderSortIcon("code")}
                    </div>
                  </TableHead>

                  {/* Số Role đang dùng Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group" onClick={() => handleSort("roleCount")}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={getSortRuleInfo("roleCount") ? "text-primary font-bold" : "text-muted-foreground"}>Số Roles gán</span>
                      {renderSortIcon("roleCount")}
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-muted-foreground text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        <span>Đang tải danh sách permission...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : permissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-muted-foreground text-sm">
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <FileKey className="h-10 w-10 text-muted-foreground/40" />
                        <p className="font-semibold text-foreground">Không có dữ liệu permission</p>
                        <p className="text-xs text-muted-foreground">Không tìm thấy permission nào phù hợp với điều kiện tìm kiếm/lọc.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  permissions.map((perm) => {
                    const isUsed = (perm.roleCount || 0) > 0;

                    return (
                      <TableRow key={perm.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                        <TableCell>
                          <Checkbox checked={selectedPermIds.includes(String(perm.id))} onCheckedChange={() => handleSelectPerm(String(perm.id))} className="translate-y-0.5 border-border/30" />
                        </TableCell>

                        <TableCell className="font-mono font-bold text-foreground text-xs uppercase pl-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-muted border">
                            {perm.entity}
                          </span>
                        </TableCell>

                        <TableCell className="text-center font-mono font-extrabold text-xs uppercase">
                          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {perm.action}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div>
                            <p onClick={() => handleOpenDetailModal(perm)} className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors text-sm">
                              {perm.name || perm.code}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">{perm.code}</p>
                          </div>
                        </TableCell>

                        <TableCell className="text-center font-mono font-bold text-xs">
                          {isUsed ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              {perm.roleCount} Roles
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              0 (Mồ côi)
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-center font-mono font-medium text-xs text-muted-foreground">
                          {perm.createdAt ? perm.createdAt.slice(0, 10) : "2026-01-01"}
                        </TableCell>

                        {/* Actions theo dòng: Xem chi tiết (Modal 3.9.4) / Sửa / Xóa (chặn nếu đang được role tham chiếu) */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button onClick={() => handleOpenDetailModal(perm)} variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" title="Xem chi tiết (Danh sách Role dùng)">
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button onClick={() => handleOpenDetailModal(perm)} variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-500/10" title="Sửa Permission">
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              onClick={() => handleDeletePermission(String(perm.id))}
                              disabled={isUsed}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-500/10 disabled:opacity-30"
                              title={isUsed ? "Không thể xóa Permission đang được gán cho Role" : "Xóa Permission"}
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
              Hiển thị <span className="font-semibold text-foreground">{permissions.length === 0 ? 0 : page * pageSize + 1}</span> đến{" "}
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

      {/* 3.9.4 PERMISSION DETAIL MODAL */}
      <PermissionDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        permission={selectedPermForDetail}
      />

    </div>
  );
};
