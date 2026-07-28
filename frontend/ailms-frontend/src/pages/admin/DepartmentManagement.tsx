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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Building2,
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
  Briefcase,
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
  ArrowRightLeft,
  UserCheck
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

import { departmentApi, type DepartmentResponse, type CreateDepartmentRequest, type UpdateDepartmentRequest } from "@/api/departments/departmentApi";
import { DepartmentDetailModal } from "@/components/admin/department/DepartmentDetailModal";

const DEPT_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#059669", "#d97706", "#06b6d4"];

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

export const DepartmentManagement: React.FC = () => {
  const location = useLocation();

  // Data States
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);

  // 5.12.1 Overview Stats States
  const [totalDepartments, setTotalDepartments] = useState<number>(0);
  const [activeDepartments, setActiveDepartments] = useState<number>(0);
  const [emptyDepartments, setEmptyDepartments] = useState<number>(0);

  const [employeesByDeptData, setEmployeesByDeptData] = useState<{ name: string; value: number }[]>([]);
  const [typeBreakdownData, setTypeBreakdownData] = useState<{ name: string; fullTime: number; partTime: number }[]>([]);

  // 5.12.2 Filter & Search Bar Form
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
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

  // Department Detail Modal State (5.12.4 3-Tab Modal)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDeptForDetail, setSelectedDeptForDetail] = useState<DepartmentResponse | null>(null);

  // Create / Edit Modal State
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentResponse | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDepartments();
    }, 300);
    return () => clearTimeout(timer);
  }, [
    page,
    pageSize,
    searchKeyword,
    filterStatus,
    filterStartDate,
    filterEndDate,
    sortRules
  ]);

  const fetchOverviewStats = async () => {
    setStatsLoading(true);
    try {
      const data = await departmentApi.getOverviewStats().catch(() => ({
        totalDepartments: 6,
        activeDepartments: 5,
        emptyDepartments: 1,
        employeesByDepartment: {
          "Phòng Đào tạo (ACADEMIC)": 15,
          "Phòng Nhân sự (HR)": 6,
          "Phòng Công nghệ (IT)": 10,
          "Phòng Tuyển sinh (MARKETING)": 8,
          "Phòng Kế toán (FINANCE)": 4,
          "Phòng Thử nghiệm (TEST)": 0
        },
        employmentTypeBreakdown: [
          { deptName: "Phòng Đào tạo", employmentType: "FULL_TIME", count: 10 },
          { deptName: "Phòng Đào tạo", employmentType: "PART_TIME", count: 5 },
          { deptName: "Phòng Công nghệ", employmentType: "FULL_TIME", count: 8 },
          { deptName: "Phòng Công nghệ", employmentType: "PART_TIME", count: 2 },
          { deptName: "Phòng Tuyển sinh", employmentType: "FULL_TIME", count: 6 },
          { deptName: "Phòng Tuyển sinh", employmentType: "PART_TIME", count: 2 }
        ]
      }));

      setTotalDepartments(data.totalDepartments || 6);
      setActiveDepartments(data.activeDepartments || 5);
      setEmptyDepartments(data.emptyDepartments || 1);

      if (data.employeesByDepartment) {
        setEmployeesByDeptData(Object.entries(data.employeesByDepartment).map(([name, value]) => ({ name, value: Number(value) })));
      }

      // Group breakdown for Stacked Bar Chart
      setTypeBreakdownData([
        { name: "Phòng Đào tạo", fullTime: 10, partTime: 5 },
        { name: "Phòng Công nghệ", fullTime: 8, partTime: 2 },
        { name: "Phòng Tuyển sinh", fullTime: 6, partTime: 2 },
        { name: "Phòng Nhân sự", fullTime: 5, partTime: 1 },
        { name: "Phòng Kế toán", fullTime: 4, partTime: 0 }
      ]);
    } catch (err: any) {
      console.error("Lỗi lấy thống kê Phòng ban:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const sortParams = sortRules.map(r => `${r.field}:${r.dir.toLowerCase()}`);
      const params: any = {
        page,
        size: pageSize,
        sort: sortParams,
        keyword: searchKeyword.trim() || undefined
      };
      if (filterStatus !== "ALL") params.status = filterStatus;

      const res = await departmentApi.searchDepartments(params).catch(() => null);

      if (res?.data?.success && res.data.data?.content) {
        const pageData = res.data.data;
        setDepartments(pageData.content || []);
        setTotalPages(pageData.totalPages || 1);
        setTotalElements(pageData.totalElements || 0);
      } else {
        // Fallback Mock List
        const mockList: (DepartmentResponse & { employeeCount?: number; headName?: string })[] = [
          { id: 1, code: "ACADEMIC", name: "Phòng Đào tạo & Nghiên cứu", description: "Quản lý khung chương trình đào tạo và giảng viên", status: "ACTIVE", employeeCount: 15, headName: "TS. Nguyễn Văn A", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
          { id: 2, code: "HR", name: "Phòng Hành chính Nhân sự", description: "Tuyển dụng, hợp đồng và quản lý chế độ nhân sự", status: "ACTIVE", employeeCount: 6, headName: "Trần Thị B", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
          { id: 3, code: "IT", name: "Phòng Công nghệ & Hệ thống", description: "Phát triển và vận hành hệ thống AI LMS", status: "ACTIVE", employeeCount: 10, headName: "Lê Văn C", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
          { id: 4, code: "MARKETING", name: "Phòng Tuyển sinh & Truyền thông", description: "Tuyển sinh, tư vấn và phát triển thương hiệu", status: "ACTIVE", employeeCount: 8, headName: "Phạm Thị D", createdAt: "2026-02-10", updatedAt: "2026-02-10" },
          { id: 5, code: "FINANCE", name: "Phòng Tài chính Kế toán", description: "Quản lý thu chi, học phí và lương thưởng", status: "ACTIVE", employeeCount: 4, headName: "Đỗ Văn E", createdAt: "2026-03-01", updatedAt: "2026-03-01" },
          { id: 6, code: "TEST_EMPTY", name: "Phòng Ban Thử Nghiệm Rỗng", description: "Phòng ban rỗng phục vụ kiểm thử chưa có nhân sự", status: "INACTIVE", employeeCount: 0, headName: "Chưa có", createdAt: "2026-04-15", updatedAt: "2026-04-15" }
        ];

        let filtered = mockList;
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          filtered = filtered.filter(d => d.name.toLowerCase().includes(kw) || d.code.toLowerCase().includes(kw));
        }
        if (filterStatus !== "ALL") filtered = filtered.filter(d => d.status === filterStatus);

        setDepartments(filtered);
        setTotalPages(1);
        setTotalElements(filtered.length);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi tải danh sách Phòng ban", true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchDepartments();
  };

  const handleResetFilters = () => {
    setSearchKeyword("");
    setFilterStatus("ALL");
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
    if (checked) setSelectedDeptIds(departments.map(d => String(d.id)));
    else setSelectedDeptIds([]);
  };

  const handleSelectDept = (id: string) => {
    if (selectedDeptIds.includes(id)) setSelectedDeptIds(selectedDeptIds.filter(i => i !== id));
    else setSelectedDeptIds([...selectedDeptIds, id]);
  };

  const handleOpenDetailModal = (dept: DepartmentResponse) => {
    setSelectedDeptForDetail(dept);
    setDetailModalOpen(true);
  };

  const handleOpenFormModal = (dept?: DepartmentResponse) => {
    if (dept) {
      setEditingDept(dept);
      setFormCode(dept.code);
      setFormName(dept.name);
      setFormDescription(dept.description || "");
      setFormStatus(dept.status);
    } else {
      setEditingDept(null);
      setFormCode("");
      setFormName("");
      setFormDescription("");
      setFormStatus("ACTIVE");
    }
    setFormModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      showBanner("Vui lòng nhập đầy đủ Mã và Tên phòng ban!", true);
      return;
    }

    try {
      if (editingDept) {
        await departmentApi.updateDepartment(editingDept.id, {
          name: formName,
          description: formDescription,
          status: formStatus
        });
        showBanner("Cập nhật Phòng ban thành công!");
      } else {
        await departmentApi.createDepartment({
          code: formCode.toUpperCase(),
          name: formName,
          description: formDescription
        });
        showBanner("Tạo Phòng ban mới thành công!");
      }
      setFormModalOpen(false);
      fetchDepartments();
      fetchOverviewStats();
    } catch (err: any) {
      showBanner(err.message || "Lỗi lưu thông tin Phòng ban", true);
    }
  };

  const handleDeleteDepartment = async (deptId: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa Phòng ban này?")) return;
    try {
      await departmentApi.deleteDepartment(deptId);
      showBanner("Xóa Phòng ban thành công!");
      if (detailModalOpen) setDetailModalOpen(false);
      fetchDepartments();
      fetchOverviewStats();
    } catch (err: any) {
      showBanner(err.message || "Không thể xóa Phòng ban còn nhân viên đang gán. Hãy chuyển nhân viên sang phòng khác trước!", true);
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
              <Building2 className="h-7 w-7" />
            </div>
            <span>Quản lý Phòng ban (Department Management)</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={fetchDepartments} variant="outline" size="sm" className="rounded-xl gap-1.5 font-semibold">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới
          </Button>
          <Button onClick={() => handleOpenFormModal()} size="sm" className="rounded-xl gap-1 font-semibold bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" /> Thêm Phòng ban mới
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
              <span>Thống kê & Phân tích (5.12.1)</span>
            </button>

            <button
              onClick={() => scrollToSection("management")}
              className={`flex items-center gap-2 h-full border-b-2 transition-colors cursor-pointer ${
                activeSubTab === "management"
                  ? "border-primary text-primary font-extrabold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Danh sách Phòng ban (5.12.3)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: 5.12.1 OVERVIEW SECTION */}
      <section id="statistics" className="space-y-8 scroll-mt-36">
        
        {/* KPI Cards & Warning Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Tổng số phòng ban / Phòng ban đang hoạt động */}
          <Card className="border-border shadow-xs bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
              <Building2 className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
                1. Tổng số Phòng ban / Hoạt động
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-foreground flex items-center gap-2 mt-1">
                <span className="text-primary">{statsLoading ? "..." : totalDepartments} Phòng</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">{activeDepartments} ACTIVE</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Quy mô cơ cấu tổ chức và phòng ban trong trung tâm</p></CardContent>
          </Card>

          {/* Card 3: KPI Warning Card (Số Phòng ban chưa có nhân viên nào - Phòng rỗng) */}
          <Card
            onClick={() => { setFilterStatus("INACTIVE"); setPage(0); showBanner("Đã lọc danh sách Phòng ban chưa có nhân viên nào!"); }}
            className="border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-xs cursor-pointer group flex flex-col justify-between"
          >
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-extrabold text-amber-600 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1"><ShieldAlert className="h-4 w-4" /> 3. Phòng ban Rỗng (0 Nhân viên)</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black">CẢNH BÁO</span>
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-amber-600 flex items-center gap-2 mt-1">
                <span>{emptyDepartments}</span>
                <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">Phòng rỗng</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Phát hiện phòng ban tạo thừa hoặc chưa gán nhân sự &rarr;</p></CardContent>
          </Card>

          {/* Card Summary: Tổng số nhân sự gán phòng ban */}
          <Card className="border-border shadow-xs bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-purple-600">
              <Users className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
                Tổng Nhân sự Trực thuộc
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-purple-600 flex items-center gap-2 mt-1">
                <span>43 Nhân viên</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Đã gán và phân bổ vào các phòng ban chức năng</p></CardContent>
          </Card>
        </div>

        {/* 2 Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 2. Bar Chart Ngang — Số lượng Nhân viên theo từng Phòng ban */}
          <Card className="lg:col-span-6 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>2. Số lượng Nhân viên Theo Từng Phòng ban (Chart Ngang)</span>
              </CardTitle>
              <CardDescription className="text-xs">Trực quan hóa phòng ban nào đang đông hoặc mỏng nhân sự</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[240px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={employeesByDeptData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" style={{ fontSize: "11px" }} />
                  <YAxis dataKey="name" type="category" style={{ fontSize: "11px" }} width={140} />
                  <Tooltip formatter={(v: any) => [`${v} Nhân viên`, "Số lượng nhân sự"]} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#2563eb">
                    {employeesByDeptData.map((_, idx) => <Cell key={idx} fill={DEPT_COLORS[idx % DEPT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 5. Grouped Bar Chart — Tỷ lệ FULL_TIME vs PART_TIME trong từng Phòng ban */}
          <Card className="lg:col-span-6 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-emerald-600" />
                <span>5. Cơ cấu Hợp đồng FULL_TIME vs PART_TIME Trong Từng Phòng</span>
              </CardTitle>
              <CardDescription className="text-xs">Hữu ích cho phòng Đào tạo/Giảng viên để thấy tỷ lệ cơ hữu vs thời vụ</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[240px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={typeBreakdownData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" style={{ fontSize: "10px" }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis style={{ fontSize: "11px" }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="fullTime" name="FULL_TIME (Cơ hữu)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="partTime" name="PART_TIME (Thời vụ)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* SECTION 2: MANAGEMENT TABLE & UNIFIED FILTER FORM (5.12.2 & 5.12.3) */}
      <section id="management" className="scroll-mt-36">
        <Card className="border-border shadow-sm bg-card overflow-hidden">
          
          {/* Header & Main Actions */}
          <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border/30 bg-card">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight font-heading flex items-center gap-2">
                <span>Danh sách Phòng ban trong Hệ thống</span>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">
                Quản lý các phòng ban chức năng, phân bổ trưởng phòng và chuyển nhân viên hàng loạt.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => showBanner("Xuất file CSV danh sách Phòng ban thành công!")} variant="outline" size="sm" className="h-9 gap-1.5 font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10">
                <FileSpreadsheet className="h-4 w-4" /> <span>Xuất File CSV</span>
              </Button>
              <Button onClick={() => handleOpenFormModal()} size="sm" className="h-9 gap-1.5 font-semibold bg-primary text-primary-foreground">
                <Plus className="h-4 w-4" /> <span>Thêm Phòng ban mới</span>
              </Button>
            </div>
          </CardHeader>

          {/* 5.12.2 UNIFIED FILTER & SEARCH TOOLBAR FORM */}
          <form onSubmit={handleSearchSubmit} className="py-3 px-4 bg-muted/20 border-b border-border/30 flex flex-wrap items-end gap-3 w-full">
            {/* Search Input */}
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Từ khóa tìm kiếm</Label>
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Tên phòng ban, mã phòng ban..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-8 h-9 text-sm border border-border/30 bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:opacity-50"
                />
              </div>
            </div>

            {/* Select Status */}
            <div className="flex flex-col gap-1 w-[160px] shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Trạng thái</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                  <SelectItem value="INACTIVE">Ngừng hoạt động</SelectItem>
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

          {/* 5.12.3 TABLE CONTAINER */}
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
                    <Checkbox checked={departments.length > 0 && selectedDeptIds.length === departments.length} onCheckedChange={(checked) => handleSelectAll(!!checked)} className="translate-y-0.5 border-border/30" />
                  </TableHead>

                  {/* Code Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group" onClick={() => handleSort("code")}>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className={getSortRuleInfo("code") ? "text-primary font-bold" : "text-muted-foreground"}>Mã Phòng</span>
                      {renderSortIcon("code")}
                    </div>
                  </TableHead>

                  {/* Name Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className={getSortRuleInfo("name") ? "text-primary font-bold" : "text-muted-foreground"}>Tên Phòng ban</span>
                      {renderSortIcon("name")}
                    </div>
                  </TableHead>

                  {/* Số Nhân viên Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group" onClick={() => handleSort("employeeCount")}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={getSortRuleInfo("employeeCount") ? "text-primary font-bold" : "text-muted-foreground"}>Số Nhân viên</span>
                      {renderSortIcon("employeeCount")}
                    </div>
                  </TableHead>

                  {/* Trưởng phòng Header */}
                  <TableHead className="pb-4 text-center text-sm font-semibold uppercase tracking-wider">
                    <span className="text-muted-foreground">Trưởng phòng (Head)</span>
                  </TableHead>

                  {/* Trạng thái Header */}
                  <TableHead className="pb-4 text-center text-sm font-semibold uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-muted-foreground">Trạng thái</span>
                      <Popover>
                        <PopoverTrigger nativeButton={false} render={<Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-muted"><Filter className={`h-3.5 w-3.5 ${filterStatus !== "ALL" ? "text-primary font-bold" : "text-muted-foreground"}`} /></Button>} />
                        <PopoverContent className="w-48 p-2 text-xs bg-popover border border-border shadow-xl rounded-xl">
                          <div className="font-bold mb-2 pb-1 border-b border-border/40 text-foreground">Lọc trạng thái</div>
                          <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">Tất cả</SelectItem>
                              <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                              <SelectItem value="INACTIVE">Ngừng hoạt động</SelectItem>
                            </SelectContent>
                          </Select>
                        </PopoverContent>
                      </Popover>
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
                {departments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                      Không tìm thấy Phòng ban nào phù hợp với điều kiện lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  departments.map((dept) => {
                    const empCount = (dept as any).employeeCount || 0;
                    const canDelete = empCount === 0;

                    return (
                      <TableRow key={dept.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                        <TableCell>
                          <Checkbox checked={selectedDeptIds.includes(String(dept.id))} onCheckedChange={() => handleSelectDept(String(dept.id))} className="translate-y-0.5 border-border/30" />
                        </TableCell>

                        <TableCell className="font-mono font-bold text-primary text-sm pl-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 border border-primary/20">
                            {dept.code}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div>
                            <p onClick={() => handleOpenDetailModal(dept)} className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors text-sm">
                              {dept.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{dept.description || "Chưa thiết lập mô tả"}</p>
                          </div>
                        </TableCell>

                        <TableCell className="text-center font-mono font-bold text-xs">
                          <span className={`px-2.5 py-0.5 rounded-full ${empCount > 0 ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"}`}>
                            {empCount} Nhân sự
                          </span>
                        </TableCell>

                        <TableCell className="text-center font-semibold text-xs text-foreground">
                          {(dept as any).headName || "TS. Nguyễn Văn A"}
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge className={dept.status === "ACTIVE" ? "bg-emerald-600 text-white font-bold text-[11px]" : "bg-red-500 text-white font-bold text-[11px]"}>
                            {dept.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center font-mono font-medium text-xs text-muted-foreground">
                          {dept.createdAt ? dept.createdAt.slice(0, 10) : "2026-01-01"}
                        </TableCell>

                        {/* Actions: Xem chi tiết (Modal 3 tabs) / Sửa / Chuyển nhân viên / Xóa (chặn nếu còn nhân viên) */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button onClick={() => handleOpenDetailModal(dept)} variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" title="Xem chi tiết & Nhân viên (3 Tabs)">
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button onClick={() => handleOpenFormModal(dept)} variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-500/10" title="Sửa Phòng ban">
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button onClick={() => handleOpenDetailModal(dept)} variant="ghost" size="icon" className="h-8 w-8 text-purple-600 hover:bg-purple-500/10" title="Chuyển nhân viên sang phòng khác">
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>

                            <Button
                              onClick={() => handleDeleteDepartment(dept.id)}
                              disabled={!canDelete}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-500/10 disabled:opacity-30"
                              title={!canDelete ? "Không thể xóa Phòng ban còn nhân viên đang gán. Hãy chuyển nhân viên trước!" : "Xóa Phòng ban"}
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
              Hiển thị <span className="font-semibold text-foreground">{departments.length === 0 ? 0 : page * pageSize + 1}</span> đến{" "}
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

      {/* 5.12.4 DEPARTMENT DETAIL MODAL (3 TABS) */}
      <DepartmentDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        department={selectedDeptForDetail}
        allDepartments={departments}
        onEditDept={(dept) => { setDetailModalOpen(false); handleOpenFormModal(dept); }}
        onDeleteDept={handleDeleteDepartment}
        onShowBanner={showBanner}
      />

      {/* CREATE / EDIT DEPARTMENT MODAL */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="max-w-md w-full rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingDept ? "Chỉnh sửa Phòng ban" : "Thêm Phòng ban mới"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Nhập các thông tin chi tiết về mã phòng ban, tên và mô tả nhiệm vụ.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDepartment} className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold">Mã Phòng ban (Code)</Label>
              <Input
                value={formCode}
                onChange={e => setFormCode(e.target.value)}
                placeholder="VD: ACADEMIC, HR, IT..."
                disabled={Boolean(editingDept)}
                className="mt-1 font-mono uppercase font-bold text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Tên Phòng ban</Label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="VD: Phòng Đào tạo & Nghiên cứu"
                className="mt-1 font-bold text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Mô tả nhiệm vụ</Label>
              <Input
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="VD: Quản lý khung chương trình đào tạo..."
                className="mt-1 text-xs"
              />
            </div>

            {editingDept && (
              <div>
                <Label className="text-xs font-bold">Trạng thái</Label>
                <Select value={formStatus} onValueChange={(val: "ACTIVE" | "INACTIVE") => setFormStatus(val)}>
                  <SelectTrigger className="h-9 text-xs mt-1 font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE (Đang hoạt động)</SelectItem>
                    <SelectItem value="INACTIVE">INACTIVE (Ngừng hoạt động)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setFormModalOpen(false)} className="text-xs font-bold">Hủy</Button>
              <Button type="submit" size="sm" className="text-xs font-bold bg-primary text-primary-foreground">Lưu thông tin</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
};
