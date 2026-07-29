import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
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
import { cn } from "@/lib/utils";
import {
  FileKey,
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
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  RefreshCw,
  Layers,
  PieChart as PieIcon,
  X,
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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

  // Dynamic Metadata from BE (with rich default fallbacks so dropdowns are never empty)
  const [availableEntities, setAvailableEntities] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<string[]>([]);

  // Newly Created Record Highlight ID
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);

  // Multi-column sorting (EmployeeManagement pattern)
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
  const [actionBanner, setActionBanner] = useState<{
    message: string;
    actionText?: string;
    onAction?: () => void;
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

  // Create/Edit Modal State
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState<PermissionResponse | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const permissionSchema = z.object({
    name: z.string().min(1, "Tên quyền không được để trống").max(100, "Tối đa 100 ký tự"),
    entity: z
      .string()
      .min(1, "Entity không được để trống")
      .max(50)
      .regex(/^[A-Z][A-Z0-9_]*$/, "Chỉ chấp nhận chữ HOA, số và dấu _ (VD: COURSE, USER)"),
    action: z
      .string()
      .min(1, "Action không được để trống")
      .max(50)
      .regex(/^[A-Z][A-Z0-9_]*$/, "Chỉ chấp nhận chữ HOA, số và dấu _ (VD: CREATE, VIEW)"),
    description: z.string().max(255, "Tối đa 255 ký tự").optional(),
  });

  type PermissionFormValues = z.infer<typeof permissionSchema>;

  const permForm = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionSchema),
    defaultValues: { name: "", entity: "USER", action: "VIEW", description: "" },
  });

  const handleOpenCreateModal = () => {
    setEditingPerm(null);
    permForm.reset({ name: "", entity: "USER", action: "VIEW", description: "" });
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (perm: PermissionResponse) => {
    setEditingPerm(perm);
    permForm.reset({
      name: perm.name || "",
      entity: perm.entity || "USER",
      action: perm.action || "VIEW",
      description: perm.description || "",
    });
    setFormModalOpen(true);
  };

  const doesPermissionMatchFilters = (perm: PermissionResponse): boolean => {
    if (!perm) return false;

    if (filterEntity !== "ALL" && perm.entity && perm.entity.toLowerCase() !== filterEntity.toLowerCase()) {
      return false;
    }
    if (filterAction !== "ALL" && perm.action && perm.action.toLowerCase() !== filterAction.toLowerCase()) {
      return false;
    }

    const roleCount = perm.roleCount || 0;
    if (filterIsUsed === "USED" && roleCount === 0) return false;
    if (filterIsUsed === "ORPHAN" && roleCount > 0) return false;

    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      const nameMatch = perm.name ? perm.name.toLowerCase().includes(kw) : false;
      const codeMatch = perm.code ? perm.code.toLowerCase().includes(kw) : false;
      const descMatch = perm.description ? perm.description.toLowerCase().includes(kw) : false;
      if (!nameMatch && !codeMatch && !descMatch) return false;
    }

    if (filterStartDate && perm.createdAt) {
      if (perm.createdAt.slice(0, 10) < filterStartDate) return false;
    }
    if (filterEndDate && perm.createdAt) {
      if (perm.createdAt.slice(0, 10) > filterEndDate) return false;
    }

    return true;
  };

  const handleSavePermission = async (values: PermissionFormValues) => {
    setFormSubmitting(true);
    try {
      const payload: any = {
        name: values.name.trim(),
        entity: values.entity.trim(),
        action: values.action.trim(),
        description: (values.description ?? "").trim(),
      };
      if (editingPerm) {
        payload.code = editingPerm.code;
        const res = await permissionApi.updatePermission(String(editingPerm.id), payload);
        showBanner("Cập nhật Permission thành công!");
        const updated = res?.data?.data || (res as any)?.data || res;
        if (updated && updated.id) {
          setPermissions(prev => prev.map(p => String(p.id) === String(updated.id) ? { ...p, ...updated } : p));
        } else {
          fetchPermissions();
        }
        fetchOverviewStats();
        fetchMetadata();
      } else {
        const res = await permissionApi.createPermission(payload);
        const newPerm = res?.data?.data || (res as any)?.data || res;

        if (newPerm && newPerm.id) {
          const isMatch = doesPermissionMatchFilters(newPerm);

          if (isMatch) {
            setNewlyCreatedId(String(newPerm.id));
            setPermissions(prev => [newPerm, ...prev.filter(p => String(p.id) !== String(newPerm.id))]);
            setTotalElements(prev => prev + 1);
            showBanner(`Tạo mới Permission ${newPerm.code} thành công!`);
            setTimeout(() => setNewlyCreatedId(null), 2500);
          } else {
            setActionBanner({
              message: `Đã tạo "${newPerm.name || newPerm.code}" thành công.`,
              actionText: "Xem bản ghi này",
              onAction: () => {
                setSearchKeyword("");
                if (newPerm.entity) setFilterEntity(newPerm.entity);
                if (newPerm.action) setFilterAction(newPerm.action);
                setFilterIsUsed("ALL");
                setFilterStartDate("");
                setFilterEndDate("");
                setSortRules([{ field: "id", dir: "DESC" }]);
                setPage(0);
                setNewlyCreatedId(String(newPerm.id));
                setPermissions(prev => [newPerm, ...prev.filter(p => String(p.id) !== String(newPerm.id))]);
                scrollToSection("management");
                setActionBanner(null);
                setTimeout(() => setNewlyCreatedId(null), 4000);
              },
            });
            setTimeout(() => setActionBanner(null), 7000);
          }
        } else {
          fetchPermissions();
        }
        fetchOverviewStats();
        fetchMetadata();
      }
      setFormModalOpen(false);
    } catch (err: any) {
      showBanner(err?.response?.data?.message || err.message || "Lỗi lưu Permission", true);
    } finally {
      setFormSubmitting(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const res = await permissionApi.getMetadata();
      const data = (res as any)?.data || res;
      if (data?.entities && Array.isArray(data.entities)) {
        setAvailableEntities(data.entities);
      }
      if (data?.actions && Array.isArray(data.actions)) {
        setAvailableActions( data.actions);
      }
    } catch (err) {
      console.error("Lỗi lấy metadata permission:", err);
    }
  };

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    fetchOverviewStats();
    fetchMetadata();
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

  const fetchPermissions = async (overrideParams?: { sort?: string; page?: number; resetFilters?: boolean }) => {
    setLoading(true);
    try {
      const sortParams = overrideParams?.sort
        ? (Array.isArray(overrideParams.sort) ? overrideParams.sort : [overrideParams.sort])
        : (sortRules.length > 0
            ? sortRules.map(r => `${r.field}:${r.dir.toLowerCase()}`)
            : ["id:desc"]);
      const activePage = overrideParams?.page !== undefined ? overrideParams.page : page;

      const params: any = {
        page: activePage,
        size: pageSize,
        sort: sortParams,
        keyword: overrideParams?.resetFilters ? undefined : (searchKeyword.trim() || undefined)
      };
      if (!overrideParams?.resetFilters) {
        if (filterEntity !== "ALL") params.entity = filterEntity;
        if (filterAction !== "ALL") params.action = filterAction;
        if (filterIsUsed !== "ALL") params.assignedStatus = filterIsUsed;
      }

      const res = await permissionApi.getPermissions(params);

      if (res?.data?.success && res.data.data?.content) {
        const pageData = res.data.data;
        let content: PermissionResponse[] = pageData.content || [];

        // Apply date range filters
        if (filterStartDate) {
          content = content.filter(p => p.createdAt && p.createdAt.slice(0, 10) >= filterStartDate);
        }
        // Apply client-side multi-column sorting
        if (sortRules.length > 0) {
          content.sort((a: any, b: any) => {
            for (const rule of sortRules) {
              const field = rule.field;
              const isAsc = rule.dir === "ASC";
              let valA = a[field];
              let valB = b[field];

              const numA = (valA !== null && valA !== undefined && valA !== "") ? Number(valA) : NaN;
              const numB = (valB !== null && valB !== undefined && valB !== "") ? Number(valB) : NaN;

              let cmp = 0;
              if (!isNaN(numA) && !isNaN(numB)) {
                cmp = numA - numB;
              } else {
                if (valA === undefined || valA === null) valA = "";
                if (valB === undefined || valB === null) valB = "";
                const strA = String(valA).toLowerCase();
                const strB = String(valB).toLowerCase();
                if (strA < strB) cmp = -1;
                else if (strA > strB) cmp = 1;
              }

              if (cmp !== 0) {
                return isAsc ? cmp : -cmp;
              }
            }
            return 0;
          });
        }

        setPermissions(content);
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

  // Multi-column sorting helper (Exact EmployeeManagement algorithm)
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

  const [confirmDeletePermId, setConfirmDeletePermId] = useState<string | null>(null);
  const [confirmBulkDeletePerms, setConfirmBulkDeletePerms] = useState(false);

  const handleDeletePermission = (permId: string) => {
    setConfirmDeletePermId(permId);
  };

  const confirmDeletePermission = async () => {
    if (!confirmDeletePermId) return;
    try {
      await permissionApi.deletePermission(confirmDeletePermId);
      showBanner("Xóa Permission thành công!");
      fetchPermissions();
      fetchOverviewStats();
      fetchMetadata();
    } catch (err: any) {
      showBanner(err?.response?.data?.message || err.message || "Không thể xóa Permission đang được gán cho Role", true);
    } finally {
      setConfirmDeletePermId(null);
    }
  };

  const handleBulkDeletePermissions = () => {
    if (selectedPermIds.length === 0) return;

    // Check if any selected permission is currently assigned to a role (roleCount > 0)
    const selectedPerms = permissions.filter(p => selectedPermIds.includes(String(p.id)));
    const usedPerms = selectedPerms.filter(p => (p.roleCount || 0) > 0);

    if (usedPerms.length > 0) {
      showBanner(`Không thể xóa! Có ${usedPerms.length} Permission đang được gán cho Role (${usedPerms.map(p => p.code).join(", ")}). Vui lòng gỡ gán Role trước khi xóa!`, true);
      return;
    }

    setConfirmBulkDeletePerms(true);
  };

  const confirmBulkDeletePermissionsAction = async () => {
    try {
      await permissionApi.bulkDeletePermissions(selectedPermIds);
      showBanner(`Đã xóa thành công ${selectedPermIds.length} Permission!`);
      setSelectedPermIds([]);
      fetchPermissions();
      fetchOverviewStats();
      fetchMetadata();
    } catch (err: any) {
      showBanner(err?.response?.data?.message || err.message || "Lỗi xóa hàng loạt Permission", true);
    } finally {
      setConfirmBulkDeletePerms(false);
    }
  };

  return (
    <div className="mx-auto max-w-none w-full px-4 sm:px-6 lg:px-10 py-6 space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Toast Banners */}
      {actionBanner && (
        <div className="fixed bottom-6 right-6 z-9999 flex items-center gap-3 rounded-2xl bg-emerald-600 text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-100" />
          <div className="flex items-center gap-3 flex-wrap text-sm font-semibold">
            <span>{actionBanner.message}</span>
            {actionBanner.actionText && actionBanner.onAction && (
              <button
                onClick={actionBanner.onAction}
                className="underline font-bold text-amber-200 hover:text-white transition-colors cursor-pointer bg-white/20 px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 shadow-xs"
              >
                <span>[{actionBanner.actionText}]</span>
              </button>
            )}
          </div>
        </div>
      )}
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
          <Button onClick={handleOpenCreateModal} size="sm" className="rounded-xl gap-1.5 font-semibold bg-primary text-primary-foreground cursor-pointer">
            <Plus className="h-4 w-4" /> Thêm Permission
          </Button>
          <Button onClick={() => { fetchPermissions(); fetchOverviewStats(); }} variant="outline" size="sm" className="rounded-xl gap-1.5 font-semibold cursor-pointer">
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
          <Card
            onClick={() => {
              handleResetFilters();
              scrollToSection("management");
              showBanner("Đã hiển thị danh sách tất cả Permission!");
            }}
            className="border-border shadow-xs bg-card overflow-hidden relative cursor-pointer hover:border-primary/50 transition-all"
          >
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
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Danh mục quyền hạn định nghĩa qua mã nguồn và migration hệ thống &rarr;</p></CardContent>
          </Card>

          {/* Card 4: KPI Warning Card (Số Permission Mồ Côi Chưa Gán Role) */}
          <Card
            onClick={() => {
              setFilterIsUsed("ORPHAN");
              setPage(0);
              scrollToSection("management");
              showBanner("Đã lọc danh sách Permission mồ côi chưa được gán cho role nào!");
            }}
            className="border-2 border-amber-500/40 bg-linear-to-br from-amber-500/10 via-card to-card shadow-xs cursor-pointer hover:border-amber-500 hover:shadow-md hover:scale-[1.005] transition-all group flex flex-col justify-between"
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
            <CardContent className="min-h-55 flex items-center justify-center">
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
            <CardContent className="min-h-55 flex items-center justify-center">
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
            <CardContent className="min-h-50 flex items-center justify-center">
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

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => {
                  fetchPermissions();
                  fetchOverviewStats();
                  fetchMetadata();
                  showBanner("Đã làm mới dữ liệu bảng và bộ lọc!");
                }}
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 font-semibold text-xs border-border/40 hover:bg-muted cursor-pointer shadow-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading || statsLoading ? "animate-spin" : ""}`} />
                <span>Làm mới</span>
              </Button>
              <Button onClick={handleOpenCreateModal} size="sm" className="rounded-xl gap-1.5 font-semibold bg-primary text-primary-foreground cursor-pointer shadow-xs">
                <Plus className="h-4 w-4" /> Thêm Permission
              </Button>
            </div>
          </CardHeader>

          {/* 3.9.2 UNIFIED FILTER & SEARCH TOOLBAR FORM */}
          <form onSubmit={handleSearchSubmit} className="py-3 px-4 bg-muted/20 border-b border-border/30 flex flex-wrap items-end gap-3 w-full">
            {/* Search Input */}
            <div className="flex flex-col gap-1 flex-1 min-w-50">
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

            {/* Select Entity (Dynamic Metadata from BE) */}
            <div className="flex flex-col gap-1 w-37.5 shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Thực thể (Entity)</Label>
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả Entity</SelectItem>
                  {availableEntities.map(ent => (
                    <SelectItem key={ent} value={ent}>{ent}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select Action (Dynamic Metadata from BE) */}
            <div className="flex flex-col gap-1 w-35 shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Hành động (Action)</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả Action</SelectItem>
                  {availableActions.map(act => (
                    <SelectItem key={act} value={act}>{act}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select Is Used */}
            <div className="flex flex-col gap-1 w-40 shrink-0">
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

            {/* Filter Start Date */}
            <div className="w-35 shrink-0">
              <DatePickerInput
                label="Từ ngày"
                placeholder="dd/mm/yyyy"
                value={filterStartDate}
                onChange={(isoDate) => {
                  setFilterStartDate(isoDate);
                  setPage(0);
                }}
              />
            </div>

            {/* Filter End Date */}
            <div className="w-35 shrink-0">
              <DatePickerInput
                label="Đến ngày"
                placeholder="dd/mm/yyyy"
                value={filterEndDate}
                onChange={(isoDate) => {
                  setFilterEndDate(isoDate);
                  setPage(0);
                }}
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

          {/* 3.9.3 TABLE CONTAINER */}
          <CardContent className="p-0 relative min-h-75">
            {selectedPermIds.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/10 border-b border-primary/20 text-xs animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-2 font-bold text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Đã chọn {selectedPermIds.length} Permission</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setSelectedPermIds([])}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-semibold text-muted-foreground hover:text-foreground border-border/40 bg-background rounded-lg cursor-pointer gap-1"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Bỏ chọn tất cả</span>
                  </Button>
                  <Button
                    onClick={handleBulkDeletePermissions}
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs font-semibold gap-1.5 rounded-lg cursor-pointer shadow-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xóa hàng loạt ({selectedPermIds.length})
                  </Button>
                </div>
              </div>
            )}
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
                    const isNewlyCreated = String(perm.id) === newlyCreatedId;

                    return (
                      <TableRow
                        key={perm.id}
                        className={cn(
                          "transition-all duration-700 border-border/30",
                          isNewlyCreated
                            ? "bg-emerald-500/20 dark:bg-emerald-950/40 border-l-4 border-l-emerald-500 font-semibold shadow-xs"
                            : "hover:bg-foreground/10"
                        )}
                      >
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
                              {perm.name}
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
                              0
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-center font-mono font-medium text-xs text-muted-foreground">
                          {perm.createdAt ? formatDateDisplay(perm.createdAt) : "—"}
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button onClick={() => handleOpenDetailModal(perm)} variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 cursor-pointer" title="Xem chi tiết (Danh sách Role dùng)">
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button onClick={() => handleOpenEditModal(perm)} variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-500/10 cursor-pointer" title="Sửa Permission">
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              onClick={() => handleDeletePermission(String(perm.id))}
                              disabled={isUsed}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-500/10 disabled:opacity-30 cursor-pointer"
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
        onPermissionUpdated={() => { fetchPermissions(); fetchOverviewStats(); }}
      />

      {/* CREATE / EDIT PERMISSION MODAL */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="max-w-md w-[90vw] p-6 rounded-2xl bg-card border border-border/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {editingPerm ? "Sửa Permission" : "Thêm Permission Mới"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingPerm ? "Cập nhật thông tin quyền hạn hệ thống." : "Nhập đầy đủ thông tin quyền hạn chi tiết cho thực thể và hành động."}
            </DialogDescription>
          </DialogHeader>

          <Form {...permForm}>
            <form onSubmit={permForm.handleSubmit(handleSavePermission)} className="space-y-4 py-2">

              <FormField
                control={permForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">Tên Quyền (Name) *</FormLabel>
                    <FormControl>
                      <Input placeholder="VD: course:create, user:view" className="h-9 text-sm border-border/30" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">Mã Code Duy Nhất (Code)</Label>
                <Input
                  placeholder={editingPerm ? (editingPerm.code ?? "") : "Tự động sinh (VD: PERM-2607-A1B2C3)"}
                  value={editingPerm ? (editingPerm.code ?? "") : ""}
                  disabled
                  className="h-9 text-sm font-mono uppercase border-border/30 bg-muted/40 text-muted-foreground cursor-not-allowed"
                />
                <p className="text-[11px] text-muted-foreground italic">
                  {editingPerm ? "Mã code cố định, không thể chỉnh sửa." : "Mã code sẽ được tự động sinh bằng CodeGenerator (định dạng PERM-yyMM-XXXXXX)."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={permForm.control}
                  name="entity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground">Thực thể (Entity)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="VD: COURSE, USER, ROLE"
                          className="h-9 text-sm font-mono uppercase border-border/30"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={permForm.control}
                  name="action"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground">Hành động (Action)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="VD: CREATE, VIEW, EDIT"
                          className="h-9 text-sm font-mono uppercase border-border/30"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={permForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">Mô tả chức năng</FormLabel>
                    <FormControl>
                      <Input placeholder="Mô tả scope và mục đích của quyền..." className="h-9 text-sm border-border/30" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setFormModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" size="sm" disabled={formSubmitting} className="bg-primary text-primary-foreground font-semibold">
                  {formSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {editingPerm ? "Lưu thay đổi" : "Tạo Permission"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE PERMISSION DIALOG */}
      <ConfirmDialog
        open={Boolean(confirmDeletePermId)}
        onOpenChange={(open) => { if (!open) setConfirmDeletePermId(null); }}
        title="Xác nhận xóa Permission"
        description="Bạn có chắc chắn muốn xóa Permission này? Thao tác không thể hoàn tác."
        confirmText="Xóa ngay"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeletePermission}
      />

      {/* CONFIRM BULK DELETE PERMISSIONS DIALOG */}
      <ConfirmDialog
        open={confirmBulkDeletePerms}
        onOpenChange={setConfirmBulkDeletePerms}
        title="Xác nhận xóa hàng loạt Permission"
        description={`Bạn có chắc chắn muốn xóa ${selectedPermIds.length} Permission đã chọn khỏi hệ thống?`}
        confirmText="Xóa tất cả"
        cancelText="Hủy bỏ"
        onConfirm={confirmBulkDeletePermissionsAction}
      />

    </div>
  );
};
