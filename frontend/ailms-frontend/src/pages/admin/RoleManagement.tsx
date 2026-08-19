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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Eye,
  Users,
  BarChart3,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  RefreshCw,
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
} from "recharts";

import { roleApi } from "@/api/roles/roleApi";
import type { RoleResponse } from "@/types/admin";

import { RoleDetailModal } from "@/components/admin/role/RoleDetailModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const ROLE_COLORS = [
  "var(--primary)",
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--brand-cobalt)"
];

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
  const [userDistData, setUserDistData] = useState<{ name: string; value: number }[]>([]);

  // 3.8.2 Filter & Search Bar Form
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterIsSystem, setFilterIsSystem] = useState<string>("ALL");
  const [filterHasUsers, setFilterHasUsers] = useState<string>("ALL");
  const [filterHasPermissions, setFilterHasPermissions] = useState<string>("ALL");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

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

  // Toast Banners & Newly Created Item Highlight
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
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

  const doesRoleMatchFilters = (r: RoleResponse): boolean => {
    if (!r) return false;
    if (filterIsSystem !== "ALL") {
      if (Boolean(r.isSystem) !== (filterIsSystem === "TRUE")) return false;
    }
    if (filterHasUsers !== "ALL") {
      const hasU = (r.userCount || 0) > 0;
      if (hasU !== (filterHasUsers === "TRUE")) return false;
    }
    if (filterHasPermissions !== "ALL") {
      const hasP = (r.permissionCount || 0) > 0;
      if (hasP !== (filterHasPermissions === "TRUE")) return false;
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      const nameMatch = r.name ? r.name.toLowerCase().includes(kw) : false;
      const codeMatch = r.code ? r.code.toLowerCase().includes(kw) : false;
      const descMatch = r.description ? r.description.toLowerCase().includes(kw) : false;
      if (!nameMatch && !codeMatch && !descMatch) return false;
    }
    if (filterStartDate && r.createdAt) {
      if (r.createdAt.slice(0, 10) < filterStartDate) return false;
    }
    if (filterEndDate && r.createdAt) {
      if (r.createdAt.slice(0, 10) > filterEndDate) return false;
    }
    return true;
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
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Clone Role Modal State
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneSourceRole, setCloneSourceRole] = useState<RoleResponse | null>(null);
  const [cloneSubmitting, setCloneSubmitting] = useState(false);

  /**
   * Zod Validation Schemas cho form tạo/sửa/nhân bản vai trò
   */
  const roleSchema = z.object({
    name: z.string().min(1, "Tên Vai trò không được để trống").max(100, "Tối đa 100 ký tự"),
    description: z.string().max(255, "Tối đa 255 ký tự").optional(),
  });
  type RoleFormValues = z.infer<typeof roleSchema>;

  const cloneSchema = z.object({
    name: z.string().min(1, "Tên Vai trò mới không được để trống").max(100, "Tối đa 100 ký tự"),
    description: z.string().max(255, "Tối đa 255 ký tự").optional(),
  });
  type CloneFormValues = z.infer<typeof cloneSchema>;

  const roleForm = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", description: "" },
  });

  const cloneForm = useForm<CloneFormValues>({
    resolver: zodResolver(cloneSchema),
    defaultValues: { name: "", description: "" },
  });

  /**
   * Mở modal tạo vai trò mới
   */
  const handleOpenCreateModal = () => {
    setEditingRole(null);
    roleForm.reset({ name: "", description: "" });
    setRoleFormModalOpen(true);
  };

  /**
   * Đóng modal form vai trò
   */
  const handleCloseRoleFormModal = () => {
    setRoleFormModalOpen(false);
    setEditingRole(null);
    roleForm.reset({ name: "", description: "" });
  };

  /**
   * Mở modal chỉnh sửa vai trò
   */
  const handleOpenEditModal = (role: RoleResponse) => {
    setEditingRole(role);
    roleForm.reset({
      name: role.name || "",
      description: role.description || "",
    });
    setRoleFormModalOpen(true);
  };

  /**
   * Xử lý lưu vai trò (Tạo mới hoặc Cập nhật)
   */
  const handleSaveRole = async (values: RoleFormValues) => {
    setFormSubmitting(true);
    try {
      if (editingRole) {
        await roleApi.updateRole(String(editingRole.id), {
          name: values.name.trim(),
          description: (values.description ?? "").trim(),
        });
        showBanner("Cập nhật Vai trò thành công!");
        fetchRoles();
      } else {
        const res = await roleApi.createRole({
          name: values.name.trim(),
          description: (values.description ?? "").trim(),
        });
        const newRole = res?.data?.data || (res as any)?.data || res;

        if (newRole && newRole.id) {
          const isMatch = doesRoleMatchFilters(newRole);
          if (isMatch) {
            setNewlyCreatedId(String(newRole.id));
            setRoles(prev => [newRole, ...prev.filter(r => String(r.id) !== String(newRole.id))]);
            setTotalElements(prev => prev + 1);
            showBanner(`Tạo mới Vai trò ${newRole.name || newRole.code} thành công!`);
            setTimeout(() => setNewlyCreatedId(null), 3500);
          } else {
            setActionBanner({
              message: `Đã tạo Vai trò "${newRole.name || newRole.code}" thành công.`,
              actionText: "Xem bản ghi này",
              onAction: () => {
                handleResetFilters();
                setNewlyCreatedId(String(newRole.id));
                setRoles(prev => [newRole, ...prev.filter(r => String(r.id) !== String(newRole.id))]);
                scrollToSection("management");
                setActionBanner(null);
                setTimeout(() => setNewlyCreatedId(null), 4000);
              },
            });
            setTimeout(() => setActionBanner(null), 7000);
          }
        } else {
          fetchRoles();
        }
      }
      handleCloseRoleFormModal();
      fetchOverviewStats();
    } catch (err: any) {
      showBanner(err?.response?.data?.message || err.message || "Lỗi lưu Vai trò", true);
    } finally {
      setFormSubmitting(false);
    }
  };

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
    filterHasPermissions,
    filterStartDate,
    filterEndDate,
    sortRules
  ]);

  const fetchOverviewStats = async () => {
    setStatsLoading(true);
    try {
      const [ovRes, distRes, userDistRes] = await Promise.all([
        roleApi.getOverviewStats().catch(() => ({ totalRoles: 0, systemRoles: 0, customRoles: 0, unusedRoles: 0, emptyRoles: 0 })),
        roleApi.getPermissionsDistribution().catch(() => ({})),
        roleApi.getUsersDistribution().catch(() => ({}))
      ]);

      setTotalRoles(ovRes.totalRoles || 0);
      setSystemRoles(ovRes.systemRoles || 0);
      setCustomRoles(ovRes.customRoles || 0);
      setUnusedRoles(ovRes.unusedRoles || 0);
      setEmptyRoles(ovRes.emptyRoles || 0);

      if (distRes) {
        setPermissionDistData(Object.entries(distRes).map(([name, value]) => ({ name, value: Number(value) })));
      }
      if (userDistRes) {
        setUserDistData(Object.entries(userDistRes).map(([name, value]) => ({ name, value: Number(value) })));
      }
    } catch (err: any) {
      console.error("Lỗi lấy thống kê Vai trò:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchRoles = async (overrideParams?: { resetFilters?: boolean }) => {
    setLoading(true);
    try {
      const sortParams = sortRules.length > 0
        ? sortRules.map(r => `${r.field}:${r.dir.toLowerCase()}`)
        : ["id:desc"];
      const isReset = overrideParams?.resetFilters;
      const activeSearch = isReset ? "" : searchKeyword.trim();
      const activeIsSystem = isReset ? "ALL" : filterIsSystem;
      const activeHasUsers = isReset ? "ALL" : filterHasUsers;
      const activeHasPerms = isReset ? "ALL" : filterHasPermissions;
      const activeStartDate = isReset ? "" : filterStartDate;
      const activeEndDate = isReset ? "" : filterEndDate;

      const isCustomFilterActive = activeHasUsers !== "ALL" || activeHasPerms !== "ALL" || Boolean(activeStartDate) || Boolean(activeEndDate);
      const params: any = {
        page: isCustomFilterActive ? 0 : page,
        size: isCustomFilterActive ? 1000 : pageSize,
        sort: sortParams,
        keyword: activeSearch || undefined
      };
      if (activeIsSystem !== "ALL") params.isSystem = activeIsSystem === "TRUE";

      const res = await roleApi.getRoles(params).catch(() => null);

      if (res?.data?.success && res.data.data?.content) {
        const pageData = res.data.data;
        let content: RoleResponse[] = pageData.content || [];

        // Client-side Keyword Filter Fallback (search name, code, description)
        if (activeSearch) {
          const kw = activeSearch.toLowerCase();
          content = content.filter(r =>
            (r.name && r.name.toLowerCase().includes(kw)) ||
            (r.code && r.code.toLowerCase().includes(kw)) ||
            (r.description && r.description.toLowerCase().includes(kw))
          );
        }

        // Filter by isSystem
        if (activeIsSystem !== "ALL") {
          content = content.filter(r => Boolean(r.isSystem) === (activeIsSystem === "TRUE"));
        }

        // Filter by Has Users
        if (activeHasUsers !== "ALL") {
          content = content.filter(r => {
            const uCount = Number(r.userCount || 0);
            return activeHasUsers === "TRUE" ? uCount > 0 : uCount === 0;
          });
        }

        // Filter by Has Permissions (Role rỗng vs Role đã gán quyền)
        if (activeHasPerms !== "ALL") {
          content = content.filter(r => {
            const pCount = Number(r.permissionCount || 0);
            return activeHasPerms === "TRUE" ? pCount > 0 : pCount === 0;
          });
        }

        // Filter by Date Range
        if (activeStartDate) {
          content = content.filter(r => r.createdAt && r.createdAt.slice(0, 10) >= activeStartDate);
        }
        if (activeEndDate) {
          content = content.filter(r => r.createdAt && r.createdAt.slice(0, 10) <= activeEndDate);
        }

        // Apply Client-Side Multi-Column Sorting
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

        setRoles(content);
        setTotalPages(pageData.totalPages || 1);
        setTotalElements(pageData.totalElements || content.length);
      } else {
        setRoles([]);
        setTotalPages(1);
        setTotalElements(0);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi tải danh sách Vai trò", true);
      setRoles([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Xử lý gửi form tìm kiếm
   */
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchRoles();
  };

  /**
   * Đặt lại bộ lọc và ô tìm kiếm về mặc định
   */
  const handleResetFilters = () => {
    setSearchKeyword("");
    setFilterIsSystem("ALL");
    setFilterHasUsers("ALL");
    setFilterHasPermissions("ALL");
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

  /**
   * Lấy thông tin thứ tự và chiều sắp xếp của trường
   */
  const getSortRuleInfo = (field: string) => {
    const idx = sortRules.findIndex(r => r.field === field);
    if (idx === -1) return null;
    return { priority: idx + 1, dir: sortRules[idx].dir };
  };

  /**
   * Render icon sắp xếp cho cột trong bảng
   */
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

  /**
   * Chọn/bỏ chọn tất cả vai trò trên trang
   */
  const handleSelectAllRoles = (checked: boolean) => {
    if (checked) setSelectedRoleIds(roles.map(r => String(r.id)));
    else setSelectedRoleIds([]);
  };

  /**
   * Chọn/bỏ chọn từng vai trò theo ID
   */
  const handleSelectRole = (id: string) => {
    if (selectedRoleIds.includes(id)) setSelectedRoleIds(selectedRoleIds.filter(i => i !== id));
    else setSelectedRoleIds([...selectedRoleIds, id]);
  };

  /**
   * Mở modal chi tiết vai trò
   */
  const handleOpenDetailModal = (role: RoleResponse) => {
    setSelectedRoleForDetail(role);
    setDetailModalOpen(true);
  };

  /**
   * Mở modal nhân bản (clone) vai trò
   */
  const handleCloneRole = (roleToClone: RoleResponse) => {
    setCloneSourceRole(roleToClone);
    cloneForm.reset({
      name: `${roleToClone.name} (Copy)`,
      description: `Sao chép từ Vai trò ${roleToClone.code}`,
    });
    setCloneModalOpen(true);
  };

  /**
   * Đóng modal nhân bản vai trò
   */
  const handleCloseCloneModal = () => {
    setCloneModalOpen(false);
    setCloneSourceRole(null);
    cloneForm.reset({ name: "", description: "" });
  };

  /**
   * Gửi request nhân bản vai trò
   */
  const handleSubmitClone = async (values: CloneFormValues) => {
    if (!cloneSourceRole) return;
    setCloneSubmitting(true);
    try {
      await roleApi.cloneRole(String(cloneSourceRole.id), {
        name: values.name.trim(),
        description: (values.description ?? "").trim() || `Sao chép từ Vai trò ${cloneSourceRole.code}`,
      });
      showBanner(`Đã nhân bản Vai trò "${values.name.trim()}" thành công!`);
      handleCloseCloneModal();
      fetchRoles();
      fetchOverviewStats();
    } catch (err: any) {
      showBanner(err?.response?.data?.message || err.message || "Lỗi sao chép Vai trò", true);
    } finally {
      setCloneSubmitting(false);
    }
  };

  const [confirmDeleteRoleId, setConfirmDeleteRoleId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  /**
   * Chuẩn bị xóa một vai trò theo ID
   */
  const handleDeleteRole = (roleId: string) => {
    setConfirmDeleteRoleId(roleId);
  };

  /**
   * Xác nhận và thực hiện xóa vai trò
   */
  const confirmDeleteRole = async () => {
    if (!confirmDeleteRoleId) return;
    try {
      await roleApi.deleteRole(confirmDeleteRoleId);
      showBanner("Xóa Vai trò thành công!");
      if (detailModalOpen) setDetailModalOpen(false);
      fetchRoles();
      fetchOverviewStats();
    } catch (err: any) {
      showBanner(err.message || "Không thể xóa Vai trò này (Vai trò hệ thống hoặc đang có Người dùng sử dụng)", true);
    } finally {
      setConfirmDeleteRoleId(null);
    }
  };

  /**
   * Chuẩn bị xóa hàng loạt các vai trò đã chọn
   */
  const handleBulkDeleteRoles = () => {
    setConfirmBulkDelete(true);
  };

  /**
   * Xác nhận và thực hiện xóa hàng loạt vai trò
   */
  const confirmBulkDeleteRoles = async () => {
    try {
      await roleApi.bulkDeleteRoles(selectedRoleIds);
      showBanner("Đã xóa hàng loạt vai trò đã chọn thành công!");
      setSelectedRoleIds([]);
      fetchRoles();
      fetchOverviewStats();
    } catch (err: any) {
      showBanner(err?.response?.data?.message || err.message || "Lỗi xóa hàng loạt vai trò", true);
    } finally {
      setConfirmBulkDelete(false);
    }
  };

  return (
    <div className="mx-auto max-w-none w-full px-4 sm:px-6 lg:px-10 py-6 space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Toast Banners */}
      {actionBanner && (
        <div className="fixed bottom-6 right-6 z-9999 flex items-center gap-3 rounded-2xl bg-success-forest text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-white/80" />
          <div className="flex items-center gap-3 flex-wrap text-sm font-semibold">
            <span>{actionBanner.message}</span>
            {actionBanner.actionText && actionBanner.onAction && (
              <button
                onClick={actionBanner.onAction}
                className="underline font-bold text-chart-1 hover:text-white transition-colors cursor-pointer bg-white/20 px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 shadow-xs"
              >
                <span>[{actionBanner.actionText}]</span>
              </button>
            )}
          </div>
        </div>
      )}
      {successBanner && (
        <div className="fixed bottom-6 right-6 z-9999 flex items-center gap-3 rounded-2xl bg-success-forest text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="fixed bottom-6 right-6 z-9999 flex items-center gap-3 rounded-2xl bg-destructive text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{errorBanner}</span>
        </div>
      )}

      {/* Page Title Header (Exact UserManagement typography) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/30 pb-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3 mt-2">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <Shield className="h-7 w-7" />
            </div>
            <span>Quản lý vai trò</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => fetchRoles()} variant="outline" size="sm" className="rounded-xl gap-1.5 font-semibold">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới
          </Button>
          <Button onClick={handleOpenCreateModal} size="sm" className="rounded-xl gap-1 font-semibold bg-primary text-primary-foreground cursor-pointer">
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
              <span>Thống kê & Phân tích</span>
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
              <span>Danh sách vai trò</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: 3.8.1 OVERVIEW SECTION */}
      <section id="statistics" className="space-y-8 scroll-mt-36">
        
        {/* KPI Cards & Warning Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Tổng số Role */}
          <Card
            onClick={() => {
              handleResetFilters();
              scrollToSection("management");
              showBanner("Đã hiển thị danh sách tất cả Vai trò!");
            }}
            className="border-border shadow-xs bg-card overflow-hidden relative cursor-pointer hover:border-primary/50 transition-all"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
              <Shield className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
                Tổng số vai trò
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-foreground flex items-center gap-2 mt-1">
                <span className="text-primary">{statsLoading ? "..." : totalRoles}</span>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">Vai trò</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Tổng các vai trò định nghĩa trong hệ thống &rarr;</p></CardContent>
          </Card>

          {/* Card 2: System vs Custom */}
          <Card
            onClick={() => {
              handleResetFilters();
              setFilterIsSystem("TRUE");
              setPage(0);
              scrollToSection("management");
              showBanner("Đã lọc danh sách Vai trò Hệ thống!");
            }}
            className="border-border shadow-xs bg-card overflow-hidden relative cursor-pointer hover:border-primary/50 transition-all"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
              <Layers className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
                Vai trò hệ thống / Tùy chỉnh
              </CardDescription>
              <CardTitle className="text-2xl font-extrabold text-foreground flex items-center gap-2 mt-1">
                <span className="text-primary">{systemRoles} Hệ thống </span>
                <span className="text-muted-foreground text-sm font-normal">/ {customRoles} Tùy chỉnh</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Vai trò hệ thống cố định không cho phép xóa &rarr;</p></CardContent>
          </Card>

          {/* Card 4: KPI Warning Card (Số Role không có User đang dùng) */}
          <Card
            onClick={() => {
              setFilterHasUsers("FALSE");
              setPage(0);
              scrollToSection("management");
              showBanner("Đã lọc danh sách Vai trò không có Người dùng nào đang dùng!");
            }}
            className="border-2 border-chart-1/40 bg-linear-to-br from-chart-1/10 via-card to-card shadow-xs cursor-pointer hover:border-chart-1 hover:shadow-md hover:scale-[1.005] transition-all group flex flex-col justify-between"
          >
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-extrabold text-chart-1 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1"><ShieldAlert className="h-4 w-4" /> Vai trò chưa dùng </span>
                <span className="px-2 py-0.5 rounded-full bg-chart-1 text-white text-[10px] font-black">CẢNH BÁO</span>
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-chart-1 flex items-center gap-2 mt-1">
                <span>{unusedRoles}</span>
                <span className="text-xs font-semibold text-chart-1 bg-chart-1/10 px-2 py-0.5 rounded-full">Vai trò chưa dùng</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Gợi ý dọn dẹp các vai trò không có người dùng đang dùng &rarr;</p></CardContent>
          </Card>

          {/* Card 5: KPI Warning Card (Số Role rỗng chưa có Permission) */}
          <Card
            onClick={() => {
              setFilterHasPermissions("FALSE");
              setPage(0);
              scrollToSection("management");
              showBanner("Đã lọc danh sách Vai trò rỗng chưa được gán quyền!");
            }}
            className="border-2 border-destructive/40 bg-linear-to-br from-destructive/10 via-card to-card shadow-xs cursor-pointer hover:border-destructive hover:shadow-md hover:scale-[1.005] transition-all group flex flex-col justify-between"
          >
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-extrabold text-destructive uppercase flex items-center justify-between">
                <span className="flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Vai trò Rỗng (Chưa gán Quyền)</span>
                <span className="px-2 py-0.5 rounded-full bg-destructive text-white text-[10px] font-black">CẢNH BÁO</span>
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-destructive flex items-center gap-2 mt-1">
                <span>{emptyRoles}</span>
                <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Vai trò rỗng</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Vai trò rỗng gán cho người dùng sẽ vô nghĩa, cần gán quyền &rarr;</p></CardContent>
          </Card>
        </div>

        {/* 2 CHARTS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Chart 1: So sánh số Permission giữa các Role */}
          <Card className="lg:col-span-6 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>1. So sánh Số lượng Quyền Giữa Các Vai trò</span>
              </CardTitle>
              <CardDescription className="text-xs">Giúp phát hiện vai trò bị "phình" quyền bất thường trong hệ thống</CardDescription>
            </CardHeader>
            <CardContent className="min-h-55 flex items-center justify-center">
              {statsLoading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs">Đang tải thống kê quyền...</span>
                </div>
              ) : permissionDistData.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-muted-foreground text-xs py-10 gap-2">
                  <BarChart3 className="h-8 w-8 opacity-40" />
                  <span>Không có dữ liệu thống kê quyền</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={permissionDistData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" style={{ fontSize: "11px" }} />
                    <YAxis style={{ fontSize: "11px" }} />
                    <Tooltip formatter={(v: any) => [`${v} Quyền`, "Số lượng quyền"]} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--primary)">
                      {permissionDistData.map((_, idx) => <Cell key={idx} fill={ROLE_COLORS[idx % ROLE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Chart 2: Phân bổ Số lượng User theo từng Role (BE & FE) */}
          <Card className="lg:col-span-6 border-border shadow-xs bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-success-forest" />
                <span>2. Phân bổ Số lượng Người dùng Theo Từng Vai trò</span>
              </CardTitle>
              <CardDescription className="text-xs">Thống kê số lượng tài khoản người dùng gắn với từng vai trò</CardDescription>
            </CardHeader>
            <CardContent className="min-h-55 flex items-center justify-center">
              {statsLoading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-success-forest" />
                  <span className="text-xs">Đang tải thống kê người dùng...</span>
                </div>
              ) : userDistData.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-muted-foreground text-xs py-10 gap-2">
                  <Users className="h-8 w-8 opacity-40" />
                  <span>Không có dữ liệu thống kê người dùng</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={userDistData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" style={{ fontSize: "11px" }} />
                    <YAxis style={{ fontSize: "11px" }} />
                    <Tooltip formatter={(v: any) => [`${v} Người dùng`, "Số người dùng"]} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--chart-2)">
                      {userDistData.map((_, idx) => <Cell key={idx} fill={ROLE_COLORS[(idx + 1) % ROLE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* SECTION 2: MANAGEMENT TABLE & UNIFIED FILTER FORM (3.8.2 & 3.8.3) */}
      <section id="management" className="scroll-mt-36">
        <Card className="border-border shadow-sm bg-card overflow-hidden">
          
          {/* Header & Main Actions */}
          <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border/30 bg-card">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight font-heading flex items-center gap-2">
                <span>Danh sách Vai trò trong Hệ thống</span>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">
                Tìm kiếm, lọc loại vai trò hệ thống/tùy chỉnh, phân quyền ma trận và quản lý người dùng gán vai trò.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleOpenCreateModal} size="sm" className="h-9 gap-1.5 font-semibold bg-primary text-primary-foreground cursor-pointer">
                <Plus className="h-4 w-4" /> <span>Thêm Vai trò mới</span>
              </Button>
            </div>
          </CardHeader>

          {/* 3.8.2 UNIFIED FILTER & SEARCH TOOLBAR FORM */}
          <form onSubmit={handleSearchSubmit} className="py-3 px-4 bg-muted/20 border-b border-border/30 flex flex-wrap items-end gap-3 w-full">
            {/* Search Input */}
            <div className="flex flex-col gap-1 flex-1 min-w-50">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Từ khóa tìm kiếm</Label>
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Tên vai trò, mã vai trò..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-8 h-9 text-sm border border-border/30 bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:opacity-50"
                />
              </div>
            </div>

            {/* Is System Role Select */}
            <div className="flex flex-col gap-1 w-37.5 shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Loại Vai trò</Label>
              <Select value={filterIsSystem} onValueChange={setFilterIsSystem}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả loại</SelectItem>
                  <SelectItem value="TRUE">Vai trò Hệ thống</SelectItem>
                  <SelectItem value="FALSE">Vai trò Tùy chỉnh</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Has Users Select */}
            <div className="flex flex-col gap-1 w-40 shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Người dùng</Label>
              <Select value={filterHasUsers} onValueChange={setFilterHasUsers}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  <SelectItem value="TRUE">Đang có Người dùng</SelectItem>
                  <SelectItem value="FALSE">Không có Người dùng (Chưa dùng)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Has Permissions Select (Quyền / Permission) */}
            <div className="flex flex-col gap-1 w-42.5 shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Trạng thái Quyền</Label>
              <Select value={filterHasPermissions} onValueChange={setFilterHasPermissions}>
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="TRUE">Đã gán Quyền</SelectItem>
                  <SelectItem value="FALSE">Vai trò rỗng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Từ ngày tạo Filter */}
            <div className="w-35 shrink-0">
              <DatePickerInput
                label="Từ ngày tạo"
                placeholder="dd/mm/yyyy"
                value={filterStartDate}
                onChange={(isoDate) => {
                  setFilterStartDate(isoDate);
                  setPage(0);
                }}
              />
            </div>

            {/* Đến ngày tạo Filter */}
            <div className="w-35 shrink-0">
              <DatePickerInput
                label="Đến ngày tạo"
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

          {/* BULK ACTION TOOLBAR (Xóa nhiều Role Custom chưa dùng + Nút Bỏ chọn tất cả) */}
          {selectedRoleIds.length > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/10 border-b border-primary/20 text-xs animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2 font-bold text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <span>Đã chọn {selectedRoleIds.length} Vai trò</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setSelectedRoleIds([])}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-semibold text-muted-foreground hover:text-foreground border-border/40 bg-background rounded-lg cursor-pointer gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Bỏ chọn tất cả</span>
                </Button>
                <Button
                  onClick={handleBulkDeleteRoles}
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs font-semibold gap-1.5 rounded-lg cursor-pointer shadow-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Xóa hàng loạt ({selectedRoleIds.length})
                </Button>
              </div>
            </div>
          )}

          {/* 3.8.3 TABLE CONTAINER */}
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
                    <Checkbox checked={roles.length > 0 && selectedRoleIds.length === roles.length} onCheckedChange={(checked) => handleSelectAllRoles(!!checked)} className="translate-y-0.5 border-border/30" />
                  </TableHead>

                  {/* Code Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group" onClick={() => handleSort("code")}>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className={getSortRuleInfo("code") ? "text-primary font-bold" : "text-muted-foreground"}>Mã Vai trò</span>
                      {renderSortIcon("code")}
                    </div>
                  </TableHead>

                  {/* Name Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className={getSortRuleInfo("name") ? "text-primary font-bold" : "text-muted-foreground"}>Tên Vai trò</span>
                      {renderSortIcon("name")}
                    </div>
                  </TableHead>

                  {/* Badge Loại Header */}
                  <TableHead className="pb-4 text-center text-sm font-semibold uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-muted-foreground">Loại Vai trò</span>
                      <Popover>
                        <PopoverTrigger nativeButton={true} render={<Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-muted"><Filter className={`h-3.5 w-3.5 ${filterIsSystem !== "ALL" ? "text-primary font-bold" : "text-muted-foreground"}`} /></Button>} />
                        <PopoverContent className="w-48 p-2 text-xs bg-popover border border-border shadow-xl rounded-xl">
                          <div className="font-bold mb-2 pb-1 border-b border-border/40 text-foreground">Lọc loại Vai trò</div>
                          <Select value={filterIsSystem} onValueChange={setFilterIsSystem}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">Tất cả loại</SelectItem>
                              <SelectItem value="TRUE">Vai trò Hệ thống</SelectItem>
                              <SelectItem value="FALSE">Vai trò Tùy chỉnh</SelectItem>
                            </SelectContent>
                          </Select>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>

                  {/* Số Permission Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group" onClick={() => handleSort("permissionCount")}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={getSortRuleInfo("permissionCount") ? "text-primary font-bold" : "text-muted-foreground"}>Quyền</span>
                      {renderSortIcon("permissionCount")}
                    </div>
                  </TableHead>

                  {/* Số User Header */}
                  <TableHead className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group" onClick={() => handleSort("userCount")}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={getSortRuleInfo("userCount") ? "text-primary font-bold" : "text-muted-foreground"}>Người dùng</span>
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
                  <TableHead className="text-sm text-center pb-4 font-semibold text-muted-foreground uppercase tracking-wider">Thao tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="opacity-90">
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                      Không tìm thấy Vai trò nào phù hợp với điều kiện lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => {
                    const isSystemRole = Boolean(role.isSystem);
                    const hasUsers = (role.userCount || 0) > 0;
                    const canDelete = !isSystemRole && !hasUsers;
                    const isNewlyCreated = String(role.id) === newlyCreatedId;

                    return (
                      <TableRow
                        key={role.id}
                        className={cn(
                          "transition-all duration-700 border-border/30",
                          isNewlyCreated
                            ? "bg-success-forest/20 dark:bg-success-forest/40 border-l-4 border-l-success-forest font-semibold shadow-xs"
                            : "hover:bg-foreground/10"
                        )}
                      >
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
                            <Badge className="bg-primary text-primary-foreground font-bold text-xs">Hệ thống</Badge>
                          ) : (
                            <Badge variant="outline" className="font-bold text-xs border-primary text-primary">Tùy chỉnh</Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-center font-mono font-bold text-xs">
                          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {role.permissionCount || 0} Quyền
                          </span>
                        </TableCell>

                        <TableCell className="text-center font-mono font-bold text-xs">
                          <span className={`px-2.5 py-0.5 rounded-full ${hasUsers ? "bg-success-forest/10 text-success-forest border border-success-forest/20" : "bg-chart-1/10 text-chart-1 border border-chart-1/20"}`}>
                            {role.userCount || 0} Người dùng
                          </span>
                        </TableCell>

                        <TableCell className="text-center font-mono font-medium text-xs text-muted-foreground">
                          {role.createdAt ? formatDateDisplay(role.createdAt) : "—"}
                        </TableCell>

                        {/* Actions theo dòng: Xem chi tiết / Sửa / Clone / Xóa (disable nếu system hoặc còn user) */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button onClick={() => handleOpenDetailModal(role)} variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 cursor-pointer" title="Xem chi tiết & Phân quyền (4 Tabs)">
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button onClick={() => handleOpenEditModal(role)} variant="ghost" size="icon" className="h-8 w-8 text-brand-cobalt hover:bg-brand-cobalt/10 cursor-pointer" title="Sửa Vai trò">
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button onClick={() => handleCloneRole(role)} variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 cursor-pointer" title="Nhân bản Vai trò">
                              <Copy className="h-4 w-4" />
                            </Button>

                            <Button
                              onClick={() => handleDeleteRole(String(role.id))}
                              disabled={!canDelete}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 disabled:opacity-30 cursor-pointer"
                              title={!canDelete ? "Không thể xóa Vai trò hệ thống hoặc Vai trò đang có Người dùng sử dụng" : "Xóa Vai trò"}
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
                <Button disabled={page === 0} onClick={() => setPage(p => p - 1)} variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg cursor-pointer">
                  <ChevronLeft className="h-3.5 w-3.5" /> Trước
                </Button>
                {getPageNumbers(page, totalPages).map((p, idx) => {
                  if (p === "...") return <span key={`dots-${idx}`} className="px-1 text-muted-foreground">...</span>;
                  const pageNum = p as number;
                  const isCurrent = pageNum === page;
                  return (
                    <Button key={pageNum} onClick={() => setPage(pageNum)} variant={isCurrent ? "default" : "outline"} size="sm" className="h-8 w-8 text-xs font-semibold rounded-lg cursor-pointer">
                      {pageNum + 1}
                    </Button>
                  );
                })}
                <Button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg cursor-pointer">
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
          fetchRoles();
          fetchOverviewStats();
        }}
        onPermissionUpdated={() => {
          fetchRoles();
          fetchOverviewStats();
        }}
        onCloneRole={handleCloneRole}
        onDeleteRole={handleDeleteRole}
        onShowBanner={showBanner}
      />

      {/* CREATE / EDIT ROLE MODAL */}
      <Dialog open={roleFormModalOpen} onOpenChange={(val) => { if (!val) handleCloseRoleFormModal(); else setRoleFormModalOpen(true); }}>
        <DialogContent className="max-w-md w-[90vw] p-6 rounded-2xl bg-card border border-border/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {editingRole ? "Sửa Vai trò Hệ thống" : "Thêm Vai trò Mới"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingRole ? "Cập nhật thông tin hiển thị và mô tả của Vai trò." : "Nhập tên vai trò và mô tả. Mã code sẽ được hệ thống tự động sinh."}
            </DialogDescription>
          </DialogHeader>

          <Form {...roleForm}>
            <form onSubmit={roleForm.handleSubmit(handleSaveRole)} className="space-y-4 py-2">

              <FormField
                control={roleForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">Tên Vai trò *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Quản lý học tập, Trợ giảng"
                        className="h-9 text-sm border-border/30 font-semibold"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">Mã Code Duy nhất (Readonly)</Label>
                <Input
                  placeholder={editingRole ? (editingRole.code ?? "") : "Tự động sinh (VD: ROLE-2607-A1B2C3)"}
                  value={editingRole ? (editingRole.code ?? "") : ""}
                  disabled
                  className="h-9 text-sm font-mono uppercase border-border/30 bg-muted/40 text-muted-foreground cursor-not-allowed"
                />
                <p className="text-[11px] text-muted-foreground italic">
                  {editingRole ? "Mã code cố định, không thể chỉnh sửa." : "Mã code sẽ được tự động sinh bằng CodeGenerator (định dạng ROLE-yyMM-XXXXXX)."}
                </p>
              </div>

              <FormField
                control={roleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">Mô tả chức năng</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Mô tả mục đích sử dụng của Vai trò..."
                        className="h-9 text-sm border-border/30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={handleCloseRoleFormModal} className="cursor-pointer">
                  Hủy
                </Button>
                <Button type="submit" size="sm" disabled={formSubmitting} className="bg-primary text-primary-foreground font-semibold cursor-pointer">
                  {formSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {editingRole ? "Lưu thay đổi" : "Tạo Vai trò"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* CLONE ROLE MODAL */}
      <Dialog open={cloneModalOpen} onOpenChange={(val) => { if (!val) handleCloseCloneModal(); }}>
        <DialogContent className="max-w-md w-[90vw] p-6 rounded-2xl bg-card border border-border/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" />
              Nhân bản Vai trò
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tạo bản sao của Vai trò{" "}
              <strong className="text-foreground font-mono">
                {cloneSourceRole?.code}
              </strong>{" "}
              với toàn bộ danh sách Quyền.
            </DialogDescription>
          </DialogHeader>

          {/* Source Role Info Banner */}
          {cloneSourceRole && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs">
              <div className="p-1.5 rounded-lg bg-primary/15 text-primary shrink-0">
                <Copy className="h-4 w-4" />
              </div>
              <div>
                <div className="font-extrabold text-foreground">{cloneSourceRole.name}</div>
                <div className="text-muted-foreground font-mono text-[11px]">
                  {cloneSourceRole.code} &bull; {cloneSourceRole.permissionCount ?? 0} Quyền &bull; {cloneSourceRole.userCount ?? 0} Người dùng
                </div>
              </div>
            </div>
          )}

          <Form {...cloneForm}>
            <form onSubmit={cloneForm.handleSubmit(handleSubmitClone)} className="space-y-4 py-1">
              <FormField
                control={cloneForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">
                      Tên Vai trò mới <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Administrator (Copy)"
                        autoFocus
                        className="h-9 text-sm border-border/30 font-semibold"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={cloneForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">Mô tả chức năng</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Mô tả mục đích sử dụng của Vai trò mới..."
                        className="h-9 text-sm border-border/30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="px-3 py-2.5 rounded-xl bg-chart-1/10 border border-chart-1/20 text-[11px] text-chart-1 font-medium flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Vai trò mới sẽ kế thừa toàn bộ danh sách Quyền từ Vai trò gốc. Mã Code sẽ được hệ thống tự động sinh.</span>
              </div>

              <DialogFooter className="pt-1">
                <Button type="button" variant="outline" size="sm" onClick={handleCloseCloneModal} className="cursor-pointer">
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={cloneSubmitting}
                  className="bg-primary text-primary-foreground font-semibold cursor-pointer gap-1.5"
                >
                  {cloneSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {cloneSubmitting ? "Đang nhân bản..." : "Xác nhận Nhân bản"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE ROLE DIALOG */}
      <ConfirmDialog
        open={Boolean(confirmDeleteRoleId)}
        onOpenChange={(open) => { if (!open) setConfirmDeleteRoleId(null); }}
        title="Xác nhận xóa Vai trò"
        description="Bạn có chắc chắn muốn xóa Role này khỏi hệ thống? Thao tác không thể hoàn tác."
        confirmText="Xóa ngay"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeleteRole}
      />

      {/* CONFIRM BULK DELETE ROLES DIALOG */}
      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title="Xác nhận xóa hàng loạt Role"
        description={`Bạn có chắc chắn muốn xóa ${selectedRoleIds.length} vai trò tùy chỉnh đã chọn khỏi hệ thống?`}
        confirmText="Xóa tất cả"
        cancelText="Hủy bỏ"
        onConfirm={confirmBulkDeleteRoles}
      />

    </div>
  );
};


