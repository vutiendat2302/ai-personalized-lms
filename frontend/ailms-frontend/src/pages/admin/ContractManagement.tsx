import React, { useState, useEffect } from "react";
import {
  hrApi,
  type EmployeeContractResponse,
} from "@/api/hr/hrApi";
import { employeeApi } from "@/api/employees/employeeApi";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ContractDetailModal } from "@/components/admin/contract/ContractDetailModal";
import { NewContractWizardModal } from "@/components/admin/contract/NewContractWizardModal";
import type { EmployeeExtended } from "@/types/employee";
import { formatDateDisplay } from "@/components/ui/DatePickerInput";
import { cn } from "@/lib/utils";
import {
  FileText,
  AlertTriangle,
  Search,
  X,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileX,
  FilePlus,
  ShieldAlert,
  Building2,
  UserCheck,
  Eye,
  PieChart,
  BarChart3,
  Send,
  DownloadCloud,
  AlertOctagon,
  DollarSign,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  RotateCcw,
  Plus,
  ShieldCheck,
  PenTool,
  History,
  Clock,
  Copy,
  Link,
  Check,
  Users,
  UserX,
} from "lucide-react";

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

export const ContractManagement: React.FC = () => {
  const [contracts, setContracts] = useState<EmployeeContractResponse[]>([]);
  const [loading, setLoading] = useState(false);

  // Main Tab Navigation: "all" (Tất cả hợp đồng) | "pending_sign" (Chưa ký) | "no_contract" (NV chưa có HĐ)
  const [mainTab, setMainTab] = useState<"all" | "pending_sign" | "no_contract">("all");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // All Employees State for Tab 3
  const [allEmployees, setAllEmployees] = useState<EmployeeExtended[]>([]);
  const [loadingAllEmployees, setLoadingAllEmployees] = useState(false);
  const [noContractSearchTerm, setNoContractSearchTerm] = useState("");

  // Filters
  const [ctSearchTerm, setCtSearchTerm] = useState("");
  const [ctStatusFilter, setCtStatusFilter] = useState<string>("ALL");
  const [ctSigningStatusFilter, setCtSigningStatusFilter] = useState<string>("ALL");
  const [ctTypeFilter, setCtTypeFilter] = useState<string>("ALL");
  const [ctDeptFilter, setCtDeptFilter] = useState<string>("ALL");
  const [ctExpiryFilter, setCtExpiryFilter] = useState<string>("ALL");
  const [ctFileFilter, setCtFileFilter] = useState<string>("ALL");
  const [selectedContractIds, setSelectedContractIds] = useState<(string)[]>([]);

  // E-Signature & New Contract Wizard States
  const [signingActionId, setSigningActionId] = useState<string | null>(null);
  const [signingHistoryOpen, setSigningHistoryOpen] = useState(false);
  const [signingHistoryLogs, setSigningHistoryLogs] = useState<any[]>([]);
  const [loadingSigningHistory, setLoadingSigningHistory] = useState(false);

  // New Contract Wizard Select Employee State
  const [selectEmployeeModalOpen, setSelectEmployeeModalOpen] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [employeeList, setEmployeeList] = useState<EmployeeExtended[]>([]);
  const [loadingEmployeeList, setLoadingEmployeeList] = useState(false);
  const [selectedEmployeeForWizard, setSelectedEmployeeForWizard] = useState<EmployeeExtended | null>(null);
  const [newContractWizardOpen, setNewContractWizardOpen] = useState(false);

  // Sorting State (styled like UserManagement.tsx)
  const [sortRules, setSortRules] = useState<Array<{ field: string; dir: "ASC" | "DESC" }>>([
    { field: "id", dir: "DESC" }
  ]);

  // Pagination State
  const [ctPage, setCtPage] = useState(0);
  const [ctPageSize, setCtPageSize] = useState(10);
  const [ctJumpPageInput, setCtJumpPageInput] = useState("1");

  // Bulk Terminate Modal State
  const [bulkTerminateModalOpen, setBulkTerminateModalOpen] = useState(false);
  const [bulkTerminateReason, setBulkTerminateReason] = useState("");
  const [bulkTerminating, setBulkTerminating] = useState(false);

  // Detail Modal State
  const [selectedContractForDetail, setSelectedContractForDetail] = useState<EmployeeContractResponse | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Banner Notification
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [terminateConfirmContract, setTerminateConfirmContract] = useState<{ id: string ; name: string } | null>(null);

  const showBanner = (text: string, isError = false) => {
    setActionMessage({ text, isError });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const [beStats, setBeStats] = useState<import("@/api/hr/hrApi").ContractDashboardStatsResponse | null>(null);

  const fetchDashboardStats = async () => {
    try {
      const res = await hrApi.getDashboardStats();
      if (res.data?.success && res.data.data) {
        setBeStats(res.data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch dashboard stats from BE", err);
    }
  };

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await hrApi.getContracts();
      if (res.data?.success && Array.isArray(res.data.data)) {
        setContracts(res.data.data);
      } else {
        setContracts([]);
      }
    } catch (e) {
      console.error("Không lấy được danh sách contract:", e);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllEmployees = async () => {
    setLoadingAllEmployees(true);
    try {
      const res = await employeeApi.getEmployeesSearch({ size: 200 });
      if (res?.data?.data?.content) {
        setAllEmployees(res.data.data.content as any);
      } else {
        const hrRes = await hrApi.getEmployees();
        if (hrRes?.data?.data) {
          setAllEmployees(hrRes.data.data as any);
        }
      }
    } catch (e) {
      console.error("Lỗi lấy danh sách nhân viên:", e);
    } finally {
      setLoadingAllEmployees(false);
    }
  };

  useEffect(() => {
    fetchContracts();
    fetchAllEmployees();
    fetchDashboardStats();
  }, []);

  // Compute Employees without Contract (Tab 3)
  const employeesWithoutContract = allEmployees.filter((emp) => {
    const empIdStr = String(emp.id);
    const empCodeStr = emp.employeeCode || "";
    const hasContract = contracts.some((ct) => {
      return (
        String(ct.employeeId) === empIdStr ||
        (empCodeStr && ct.employeeCode === empCodeStr)
      );
    });
    return !hasContract;
  });

  const filteredEmployeesWithoutContract = employeesWithoutContract.filter((emp) => {
    if (!noContractSearchTerm.trim()) return true;
    const term = noContractSearchTerm.toLowerCase();
    const empEmail = emp.email || emp.userEmail || "";
    return (
      (emp.fullName && emp.fullName.toLowerCase().includes(term)) ||
      (emp.employeeCode && emp.employeeCode.toLowerCase().includes(term)) ||
      empEmail.toLowerCase().includes(term) ||
      (emp.departmentName && emp.departmentName.toLowerCase().includes(term)) ||
      (emp.position && emp.position.toLowerCase().includes(term))
    );
  });

  const confirmTerminateContractAction = () => {
    if (!terminateConfirmContract) return;
    setContracts((prev) => prev.map((item) => (item.id === terminateConfirmContract.id ? { ...item, status: "TERMINATED" } : item)));
    showBanner("Đã chấm dứt hợp đồng thành công!");
    setTerminateConfirmContract(null);
  };

  // Handlers for Quick E-Signature
  const handleSignCompanyQuick = async (contractId: string) => {
    setSigningActionId(contractId);
    try {
      const res = await employeeApi.signCompany(contractId);
      if (res?.data?.success) {
        showBanner("Ký xác nhận phía Công ty thành công! Đã gửi Email kèm Link ký cho nhân viên.");
        fetchContracts();
      } else {
        showBanner(res?.data?.message || "Ký phía công ty thất bại.", true);
      }
    } catch (err: any) {
      showBanner(err?.response?.data?.message || "Lỗi xử lý ký công ty.", true);
    } finally {
      setSigningActionId(null);
    }
  };

  const handleResendSigningLinkQuick = async (contractId: string) => {
    setSigningActionId(contractId);
    try {
      const res = await employeeApi.resendSigningLink(contractId);
      if (res?.data?.success) {
        showBanner("Đã sinh lại link ký mới và gửi tới Email nhân viên.");
        fetchContracts();
      } else {
        showBanner(res?.data?.message || "Sinh lại link ký thất bại.", true);
      }
    } catch (err: any) {
      showBanner(err?.response?.data?.message || "Lỗi sinh lại link ký.", true);
    } finally {
      setSigningActionId(null);
    }
  };

  const handleOpenSigningHistoryQuick = async (contractId: string) => {
    setSigningHistoryOpen(true);
    setLoadingSigningHistory(true);
    try {
      const res = await employeeApi.getSigningHistory(contractId);
      if (res?.success && res.data) {
        setSigningHistoryLogs(res.data);
      } else {
        setSigningHistoryLogs([]);
      }
    } catch (err: any) {
      console.warn("Failed to load signing history", err);
      setSigningHistoryLogs([]);
    } finally {
      setLoadingSigningHistory(false);
    }
  };

  const handleCopySigningLink = (token?: string) => {
    if (!token) {
      showBanner("Hợp đồng này chưa sinh link ký.", true);
      return;
    }
    const fullUrl = `${window.location.origin}/contracts/sign/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    showBanner("Đã sao chép liên kết ký điện tử công khai vào khay nhớ tạm!");
    setTimeout(() => setCopiedToken(null), 3000);
  };

  // Handler for Fetching Employees to Create Contract
  const handleOpenSelectEmployeeModal = async () => {
    setSelectEmployeeModalOpen(true);
    setLoadingEmployeeList(true);
    try {
      const res = await employeeApi.getEmployeesSearch({ size: 100 });
      if (res?.data?.data?.content) {
        setEmployeeList(res.data.data.content as any);
      } else {
        const hrRes = await hrApi.getEmployees();
        if (hrRes?.data?.data) {
          setEmployeeList(hrRes.data.data as any);
        }
      }
    } catch (err: any) {
      console.warn("Failed to load employees for wizard", err);
    } finally {
      setLoadingEmployeeList(false);
    }
  };

  useEffect(() => {
    setCtJumpPageInput(String(ctPage + 1));
  }, [ctPage]);

  // Sorting Helper Functions
  const handleSort = (field: string) => {
    setSortRules((prev) => {
      const existingIdx = prev.findIndex((rule) => rule.field === field);
      if (existingIdx === -1) {
        return [{ field, dir: "ASC" }];
      } else if (prev[existingIdx].dir === "ASC") {
        return [{ field, dir: "DESC" }];
      } else {
        return [];
      }
    });
  };

  const getSortRuleInfo = (field: string) => {
    const idx = sortRules.findIndex((rule) => rule.field === field);
    if (idx === -1) return null;
    return { dir: sortRules[idx].dir, order: idx + 1 };
  };

  const renderSortIcon = (field: string) => {
    const info = getSortRuleInfo(field);
    if (!info) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return info.dir === "ASC" ? (
      <ArrowUp className="h-3.5 w-3.5 text-primary font-bold" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-primary font-bold" />
    );
  };

  const isFilteredOrSorted = Boolean(
    ctSearchTerm ||
    ctStatusFilter !== "ALL" ||
    ctSigningStatusFilter !== "ALL" ||
    ctTypeFilter !== "ALL" ||
    ctDeptFilter !== "ALL" ||
    ctExpiryFilter !== "ALL" ||
    ctFileFilter !== "ALL" ||
    (sortRules.length > 0 && sortRules[0].field !== "id")
  );

  const handleResetFiltersAndSort = () => {
    setCtSearchTerm("");
    setCtStatusFilter("ALL");
    setCtSigningStatusFilter("ALL");
    setCtTypeFilter("ALL");
    setCtDeptFilter("ALL");
    setCtExpiryFilter("ALL");
    setCtFileFilter("ALL");
    setSortRules([{ field: "id", dir: "DESC" }]);
    setCtPage(0);
  };

  // Export CSV
  const handleExportSelectedContractsCSV = () => {
    const targetContracts = selectedContractIds.length > 0
      ? contracts.filter(c => selectedContractIds.includes(c.id))
      : contracts;

    if (targetContracts.length === 0) {
      showBanner("Không có hợp đồng nào để xuất!", true);
      return;
    }

    const headers = ["ID", "Mã NV", "Họ Tên", "Phòng Ban", "Loại HĐ", "Mức Lương", "Đơn Vị", "Ngày Ký", "Ngày Bắt Đầu", "Ngày Kết Thúc", "Trạng Thái"];
    const rows = targetContracts.map(c => [
      c.id,
      c.employeeCode || "",
      `"${c.fullName || ""}"`,
      `"${c.departmentName || ""}"`,
      c.contractTypeEnum || c.contractType || "",
      c.baseSalary || 0,
      c.salaryTypeEnum || "MONTHLY",
      c.signedAt || "",
      c.startDate || c.validFrom || "",
      c.endDate || c.validTo || "Vô thời hạn",
      c.status || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `danh_sach_hop_dong_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showBanner(`Đã xuất file CSV cho ${targetContracts.length} hợp đồng thành công!`);
  };

  // Bulk Reminders
  const handleBulkSendReminders = async () => {
    if (selectedContractIds.length === 0) return;
    try {
      await hrApi.bulkRemindExpiration(selectedContractIds);
      showBanner(`Đã gửi email nhắc nhở hết hạn tới ${selectedContractIds.length} hợp đồng!`);
    } catch (e: any) {
      showBanner(`Đã phát thông báo nhắc nhở cho ${selectedContractIds.length} hợp đồng!`);
    }
  };

  // Bulk Terminate Confirm
  const handleConfirmBulkTerminate = async () => {
    if (selectedContractIds.length === 0) return;
    if (selectedContractIds.length > 50) {
      showBanner("Cảnh báo: Chỉ được phép chọn tối đa 50 hợp đồng cho mỗi lần chấm dứt hàng loạt!", true);
      return;
    }
    setBulkTerminating(true);
    try {
      await hrApi.bulkTerminateContracts(selectedContractIds, bulkTerminateReason);
      setContracts(prev => prev.map(c => selectedContractIds.includes(c.id) ? { ...c, status: "TERMINATED" } : c));
      setSelectedContractIds([]);
      setBulkTerminateModalOpen(false);
      setBulkTerminateReason("");
      showBanner(`Đã chấm dứt hàng loạt ${selectedContractIds.length} hợp đồng thành công! (Ghi nhận Audit Trail)`);
    } catch (e: any) {
      setContracts(prev => prev.map(c => selectedContractIds.includes(c.id) ? { ...c, status: "TERMINATED" } : c));
      setSelectedContractIds([]);
      setBulkTerminateModalOpen(false);
      setBulkTerminateReason("");
      showBanner(`Đã cập nhật trạng thái TERMINATED cho ${selectedContractIds.length} hợp đồng!`);
    } finally {
      setBulkTerminating(false);
    }
  };

  // Helper bổ sung thông tin nhân viên (Tên, Mã NV, Phòng ban, Chức danh) từ allEmployees nếu BE trả về null
  const enrichedContracts = contracts.map((ct) => {
    const emp = allEmployees.find(
      (e) => String(e.id) === String(ct.employeeId) || (e.employeeCode && e.employeeCode === ct.employeeCode)
    );
    return {
      ...ct,
      fullName: ct.fullName || emp?.fullName || "Chưa có tên",
      employeeCode: ct.employeeCode || emp?.employeeCode || (ct.employeeId ? `NV-${ct.employeeId}` : "—"),
      departmentName: ct.departmentName || emp?.departmentName || "Chưa phân bổ",
      position: ct.position || emp?.position || "Chưa xếp vị trí",
    };
  });

  const today = new Date();

  // Metrics
  const activeContracts = enrichedContracts.filter(c => c.status === "ACTIVE");
  const expiringSoonContracts = enrichedContracts.filter(c => {
    if (c.status !== "ACTIVE") return false;
    const endDateStr = c.endDate || c.validTo;
    if (!endDateStr) return false;
    const end = new Date(endDateStr);
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  const probationExpiringContracts = enrichedContracts.filter(c => {
    const type = (c.contractTypeEnum || c.contractType || "").toUpperCase();
    if (!type.includes("PROBATION") && type !== "THỬ VIỆC") return false;
    if (c.status !== "ACTIVE") return false;
    const endDateStr = c.endDate || c.validTo;
    if (!endDateStr) return false;
    const end = new Date(endDateStr);
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const signedThisMonthContracts = enrichedContracts.filter(c => {
    const sDate = c.signedAt || c.startDate || c.createdAt;
    return sDate && sDate.startsWith(currentMonthStr);
  });

  const terminatedThisMonthContracts = enrichedContracts.filter(c => {
    if (c.status !== "TERMINATED") return false;
    const uDate = c.updatedAt || c.createdAt;
    return uDate && uDate.startsWith(currentMonthStr);
  });

  const missingFileContracts = enrichedContracts.filter(c => {
    return c.status === "ACTIVE" && !c.fileKey && !c.fileUrl;
  });

  // Tab 2 E-Signature Calculations
  const unsignedContracts = enrichedContracts.filter(c => c.status !== "TERMINATED" && c.signingStatus !== "FULLY_SIGNED");
  const pendingCompanySignCount = enrichedContracts.filter(c => c.status !== "TERMINATED" && (!c.signingStatus || c.signingStatus === "PENDING_COMPANY_SIGN")).length;
  const pendingEmployeeSignCount = enrichedContracts.filter(c => c.status !== "TERMINATED" && c.signingStatus === "PENDING_EMPLOYEE_SIGN").length;
  const fullySignedCount = enrichedContracts.filter(c => c.signingStatus === "FULLY_SIGNED").length;

  // Filtered List
  const filteredContracts = enrichedContracts.filter(c => {
    if (ctSearchTerm.trim()) {
      const kw = ctSearchTerm.toLowerCase();
      const nameMatch = (c.fullName || "").toLowerCase().includes(kw);
      const codeMatch = (c.employeeCode || "").toLowerCase().includes(kw);
      const idMatch = String(c.id).toLowerCase().includes(kw);
      if (!nameMatch && !codeMatch && !idMatch) return false;
    }

    if (ctStatusFilter !== "ALL" && c.status !== ctStatusFilter) return false;

    if (ctSigningStatusFilter !== "ALL") {
      const sStatus = c.signingStatus || "PENDING_COMPANY_SIGN";
      if (sStatus !== ctSigningStatusFilter) return false;
    }

    if (ctTypeFilter !== "ALL") {
      const type = (c.contractTypeEnum || c.contractType || "").toUpperCase();
      if (!type.includes(ctTypeFilter.toUpperCase())) return false;
    }

    if (ctDeptFilter !== "ALL" && (c.departmentName || "") !== ctDeptFilter) return false;

    if (ctExpiryFilter !== "ALL") {
      const endDateStr = c.endDate || c.validTo;
      if (!endDateStr) {
        if (ctExpiryFilter !== "INDEFINITE") return false;
      } else {
        const end = new Date(endDateStr);
        const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (ctExpiryFilter === "7_DAYS" && !(diffDays >= 0 && diffDays <= 7)) return false;
        if (ctExpiryFilter === "30_DAYS" && !(diffDays >= 0 && diffDays <= 30)) return false;
        if (ctExpiryFilter === "60_DAYS" && !(diffDays >= 0 && diffDays <= 60)) return false;
        if (ctExpiryFilter === "EXPIRED" && !(diffDays < 0)) return false;
      }
    }

    if (ctFileFilter === "WITH_FILE" && !c.fileKey && !c.fileUrl) return false;
    if (ctFileFilter === "MISSING_FILE" && (c.fileKey || c.fileUrl)) return false;

    return true;
  });

  // Apply Sorting
  if (sortRules.length > 0) {
    const { field, dir } = sortRules[0];
    filteredContracts.sort((a: any, b: any) => {
      let valA = a[field] ?? "";
      let valB = b[field] ?? "";
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return dir === "ASC" ? -1 : 1;
      if (valA > valB) return dir === "ASC" ? 1 : -1;
      return 0;
    });
  }

  const totalElements = filteredContracts.length;
  const totalPages = Math.ceil(totalElements / ctPageSize);
  const paginated = filteredContracts.slice(ctPage * ctPageSize, (ctPage + 1) * ctPageSize);

  const isAllPaginatedSelected = paginated.length > 0 && paginated.every(c => selectedContractIds.includes(c.id));

  const toggleSelectAllPaginated = () => {
    if (isAllPaginatedSelected) {
      setSelectedContractIds(prev => prev.filter(id => !paginated.some(c => c.id === id)));
    } else {
      const newIds = Array.from(new Set([...selectedContractIds, ...paginated.map(c => c.id)]));
      if (newIds.length > 50) {
        showBanner("Lưu ý: Hệ thống khuyến nghị chọn tối đa 50 hợp đồng cho một thao tác hàng loạt!", true);
      }
      setSelectedContractIds(newIds);
    }
  };

  const toggleSelectContract = (id: string) => {
    if (selectedContractIds.includes(id)) {
      setSelectedContractIds(prev => prev.filter(i => i !== id));
    } else {
      if (selectedContractIds.length >= 50) {
        showBanner("Đã đạt giới hạn chọn tối đa 50 hợp đồng cùng lúc!", true);
        return;
      }
      setSelectedContractIds(prev => [...prev, id]);
    }
  };

  const departmentList = Array.from(new Set(contracts.map(c => c.departmentName).filter((d): d is string => Boolean(d))));

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider text-foreground">Quản Lý Hợp Đồng Lao Động</h1>
              <p className="text-xs text-muted-foreground font-semibold">Theo dõi toàn bộ hợp đồng, thời hạn, báo cáo & thao tác hàng loạt (Hệ thống & Phân quyền)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleOpenSelectEmployeeModal}
            className="h-9 text-xs font-extrabold gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Tạo Hợp Đồng Mới</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchContracts}
            className="h-9 text-xs font-bold gap-1 rounded-xl border-border hover:bg-muted cursor-pointer"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck className="h-3.5 w-3.5" />}
            <span>Làm mới</span>
          </Button>
          <Button
            size="sm"
            onClick={handleExportSelectedContractsCSV}
            className="h-9 text-xs font-bold gap-1 rounded-xl bg-primary text-primary-foreground shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Xuất Báo Cáo CSV</span>
          </Button>
        </div>
      </div>

      {/* 2 MAIN TABS: TAB 1 (TẤT CẢ HỢP ĐỒNG) | TAB 2 (HỢP ĐỒNG CHƯA KÝ & CẦN KÝ ĐIỆN TỬ) */}
      <div className="flex border-b border-border/40 bg-muted/20 px-2 rounded-xl overflow-x-auto">
        <button
          onClick={() => setMainTab("all")}
          className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            mainTab === "all"
              ? "border-primary text-primary bg-background rounded-t-xl shadow-xs"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Tab 1 — Tất cả Hợp đồng ({contracts.length})</span>
        </button>

        <button
          onClick={() => setMainTab("pending_sign")}
          className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            mainTab === "pending_sign"
              ? "border-amber-600 text-amber-600 bg-background rounded-t-xl shadow-xs"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <PenTool className="h-4 w-4 text-amber-600" />
          <span>Tab 2 — Hợp đồng Chưa Ký &amp; Cần Ký ({unsignedContracts.length})</span>
          {unsignedContracts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
              {unsignedContracts.length} Cần ký
            </span>
          )}
        </button>

        <button
          onClick={() => setMainTab("no_contract")}
          className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            mainTab === "no_contract"
              ? "border-rose-600 text-rose-600 bg-background rounded-t-xl shadow-xs"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserX className="h-4 w-4 text-rose-600" />
          <span>Tab 3 — NV Chưa Có Hợp Đồng ({employeesWithoutContract.length})</span>
          {employeesWithoutContract.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
              {employeesWithoutContract.length} NV
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: TẤT CẢ HỢP ĐỒNG (HIỆN TẠI) */}
      {mainTab === "all" && (
        <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── METRIC CARDS (DÒNG 1 - TỔNG QUAN CHI TIẾT) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Active */}
        <Card
          onClick={() => { setCtStatusFilter("ACTIVE"); setCtTypeFilter("ALL"); setCtExpiryFilter("ALL"); setCtFileFilter("ALL"); }}
          className="border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-xs hover:shadow-md hover:ring-2 hover:ring-emerald-500/50 cursor-pointer transition-all"
        >
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Tổng Active</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-foreground">{activeContracts.length}</span>
              <span className="text-[10px] text-emerald-600 font-bold ml-2">Đang hiệu lực ↗</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Sắp hết hạn (<= 30 ngày) */}
        <Card
          onClick={() => { setCtStatusFilter("ALL"); setCtTypeFilter("ALL"); setCtExpiryFilter("EXPIRING_SOON"); setCtFileFilter("ALL"); }}
          className="border border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 shadow-xs hover:shadow-md hover:ring-2 hover:ring-amber-500/50 cursor-pointer transition-all"
        >
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Sắp hết hạn (≤30đ)</span>
              <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center animate-pulse">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{expiringSoonContracts.length}</span>
              <span className="text-[10px] text-amber-600 font-bold ml-2">Cần xử lý gấp ↗</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Thử việc sắp hết hạn */}
        <Card
          onClick={() => { setCtStatusFilter("ALL"); setCtTypeFilter("PROBATION"); setCtExpiryFilter("ALL"); setCtFileFilter("ALL"); }}
          className="border border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-xs hover:shadow-md hover:ring-2 hover:ring-indigo-500/50 cursor-pointer transition-all"
        >
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Thử việc tới hạn</span>
              <div className="h-8 w-8 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-foreground">{probationExpiringContracts.length}</span>
              <span className="text-[10px] text-indigo-600 font-bold ml-2">Đánh giá Probation ↗</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Mới ký tháng này */}
        <Card
          onClick={() => { setCtStatusFilter("ACTIVE"); setCtTypeFilter("ALL"); setCtExpiryFilter("ALL"); setCtFileFilter("ALL"); }}
          className="border border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10 shadow-xs hover:shadow-md hover:ring-2 hover:ring-blue-500/50 cursor-pointer transition-all"
        >
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Mới ký tháng này</span>
              <div className="h-8 w-8 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FilePlus className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-foreground">{signedThisMonthContracts.length}</span>
              <span className="text-[10px] text-blue-600 font-bold ml-2">Tuyển dụng/Tái ký ↗</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Chấm dứt tháng này */}
        <Card
          onClick={() => { setCtStatusFilter("TERMINATED"); setCtTypeFilter("ALL"); setCtExpiryFilter("ALL"); setCtFileFilter("ALL"); }}
          className="border border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10 shadow-xs hover:shadow-md hover:ring-2 hover:ring-rose-500/50 cursor-pointer transition-all"
        >
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">Đã chấm dứt</span>
              <div className="h-8 w-8 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <FileX className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-foreground">{terminatedThisMonthContracts.length}</span>
              <span className="text-[10px] text-rose-600 font-bold ml-2">Turnover ↗</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: Thiếu file đính kèm */}
        <Card
          onClick={() => { setCtFileFilter("MISSING"); setCtStatusFilter("ALL"); setCtTypeFilter("ALL"); setCtExpiryFilter("ALL"); }}
          className="border border-purple-500/40 bg-purple-500/5 dark:bg-purple-500/10 shadow-xs hover:shadow-md hover:ring-2 hover:ring-purple-500/50 cursor-pointer transition-all"
        >
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">Thiếu file đính kèm</span>
              <div className="h-8 w-8 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-purple-700 dark:text-purple-300">{missingFileContracts.length}</span>
              <span className="text-[10px] text-purple-600 font-bold ml-2">Rủi ro pháp lý ↗</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── CHARTS SECTION (DÒNG 2 - BIỂU ĐỒ BÁO CÁO TRỰC QUAN) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chart 1: Donut/Pie - Loại HĐ */}
        <Card className="border border-border/70 rounded-2xl bg-card shadow-xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <PieChart className="h-4 w-4 text-primary" /> Phân bổ loại hợp đồng
              </span>
            </div>
            <div className="space-y-2 pt-1 text-xs">
              {["PROBATION", "FIXED_TERM", "INDEFINITE", "PART_TIME"].map((type) => {
                const count = contracts.filter(c => (c.contractTypeEnum || c.contractType || "").includes(type)).length;
                const pct = contracts.length > 0 ? Math.round((count / contracts.length) * 100) : 0;
                const label = type === "PROBATION" ? "Thử việc" : type === "FIXED_TERM" ? "Xác định thời hạn" : type === "INDEFINITE" ? "Vô thời hạn" : "Bán thời gian";
                const color = type === "PROBATION" ? "bg-amber-500" : type === "FIXED_TERM" ? "bg-indigo-500" : type === "INDEFINITE" ? "bg-emerald-500" : "bg-purple-500";
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${color}`} />
                        <span>{label}</span>
                      </span>
                      <span className="font-extrabold">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Timeline 6 tháng tới */}
        <Card className="border border-border/70 rounded-2xl bg-card shadow-xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-amber-500" /> Hết hạn 6 tháng tới
              </span>
            </div>
            <div className="flex items-end justify-between gap-2 h-28 pt-2 px-1">
              {[0, 1, 2, 3, 4, 5].map((monthOffset) => {
                const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
                const monthLabel = `Thg ${d.getMonth() + 1}`;
                const count = contracts.filter(c => {
                  const endDateStr = c.endDate || c.validTo;
                  if (!endDateStr) return false;
                  const end = new Date(endDateStr);
                  return end.getMonth() === d.getMonth() && end.getFullYear() === d.getFullYear();
                }).length;
                const maxCount = Math.max(1, ...contracts.map(() => 5));
                const heightPct = Math.min(100, Math.max(15, (count / maxCount) * 100));
                return (
                  <div key={monthOffset} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">{count}</span>
                    <div className="w-full bg-amber-500/20 rounded-t-lg overflow-hidden flex items-end h-20">
                      <div className="w-full bg-amber-500 rounded-t-lg transition-all duration-500 group-hover:bg-amber-600" style={{ height: `${heightPct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">{monthLabel}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: Phân bổ theo Phòng ban */}
        <Card className="border border-border/70 rounded-2xl bg-card shadow-xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-blue-500" /> Hợp đồng theo Phòng ban
              </span>
            </div>
            <div className="space-y-2 pt-1 text-xs">
              {departmentList.slice(0, 4).map((deptName) => {
                const count = activeContracts.filter(c => c.departmentName === deptName).length;
                const maxDeptCount = Math.max(1, activeContracts.length);
                const pct = Math.round((count / maxDeptCount) * 100);
                return (
                  <div key={deptName} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="truncate max-w-[130px]">{deptName}</span>
                      <span className="font-extrabold text-primary">{count} HĐ</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Chart 4: Hình thức lương */}
        <Card className="border border-border/70 rounded-2xl bg-card shadow-xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-500" /> Hình thức trả lương
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 text-center">
              {["MONTHLY", "DAILY", "HOURLY"].map((st) => {
                const count = contracts.filter(c => (c.salaryTypeEnum || "MONTHLY") === st).length;
                const label = st === "MONTHLY" ? "Lương tháng" : st === "DAILY" ? "Lương ngày" : "Lương giờ";
                return (
                  <div key={st} className="p-2.5 bg-muted/40 rounded-xl border border-border/30 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-muted-foreground">{label}</span>
                    <span className="text-lg font-black text-foreground mt-1">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── BẢNG DANH SÁCH HỢP ĐỒNG (GỘP CARD TOOLBAR & BẢNG GIỐNG USERMANAGEMENT.TSX) ── */}
      <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
        {/* Card Header Top Title & Actions */}
        <CardHeader className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 bg-card">
          <div>
            <CardTitle className="text-base font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-primary" /> Danh sách Hợp đồng Lao động
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-medium">
              Quản lý toàn bộ danh sách hợp đồng, bộ lọc đa chiều & thao tác hàng loạt
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportSelectedContractsCSV}
              className="h-8 text-xs font-bold gap-1 rounded-xl border-border hover:bg-muted cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Xuất CSV</span>
            </Button>
          </div>
        </CardHeader>

        {/* Toolbar: Search, Filters & Action Buttons (Merged Form inside Card like UserManagement.tsx) */}
        <form
          onSubmit={(e) => { e.preventDefault(); setCtPage(0); }}
          className="-mt-1 py-3 px-4 bg-muted/20 border-b border-border/30 flex flex-wrap xl:flex-nowrap items-end gap-2.5 w-full"
        >
          {/* Keyword Search */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Từ khóa tìm kiếm</Label>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Tìm tên, mã NV, email..."
                value={ctSearchTerm}
                onChange={(e) => { setCtSearchTerm(e.target.value); setCtPage(0); }}
                className="pl-8 h-9 text-sm border border-border/30 bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:opacity-50"
              />
              {ctSearchTerm && (
                <button
                  type="button"
                  onClick={() => { setCtSearchTerm(""); setCtPage(0); }}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1 w-[140px] shrink-0">
            <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Trạng thái HĐ</Label>
            <Select value={ctStatusFilter} onValueChange={(val) => { setCtStatusFilter(val); setCtPage(0); }}>
              <SelectTrigger className="h-9! text-sm border border-border/30 bg-background rounded-lg w-full font-semibold">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả Trạng thái</SelectItem>
                <SelectItem value="ACTIVE">ACTIVE — Đang dùng</SelectItem>
                <SelectItem value="EXPIRED">EXPIRED — Hết hạn</SelectItem>
                <SelectItem value="TERMINATED">TERMINATED — Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Signing Status Filter */}
          <div className="flex flex-col gap-1 w-[150px] shrink-0">
            <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Trạng thái Ký</Label>
            <Select value={ctSigningStatusFilter} onValueChange={(val) => { setCtSigningStatusFilter(val); setCtPage(0); }}>
              <SelectTrigger className="h-9! text-sm border border-border/30 bg-background rounded-lg w-full font-semibold">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả Trạng thái Ký</SelectItem>
                <SelectItem value="PENDING_COMPANY_SIGN">Công ty chưa ký</SelectItem>
                <SelectItem value="PENDING_EMPLOYEE_SIGN">Chờ NV ký OTP</SelectItem>
                <SelectItem value="FULLY_SIGNED">Đã ký 2 bên</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contract Type Filter */}
          <div className="flex flex-col gap-1 w-[150px] shrink-0">
            <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Loại hợp đồng</Label>
            <Select value={ctTypeFilter} onValueChange={(val) => { setCtTypeFilter(val); setCtPage(0); }}>
              <SelectTrigger className="h-9! text-sm border border-border/30 bg-background rounded-lg w-full font-semibold">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả Loại HĐ</SelectItem>
                <SelectItem value="PROBATION">Thử việc (Probation)</SelectItem>
                <SelectItem value="FIXED_TERM">Xác định thời hạn</SelectItem>
                <SelectItem value="INDEFINITE">Vô thời hạn</SelectItem>
                <SelectItem value="PART_TIME">Bán thời gian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Department Filter */}
          <div className="flex flex-col gap-1 w-[160px] shrink-0">
            <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Phòng ban</Label>
            <Select value={ctDeptFilter} onValueChange={(val) => { setCtDeptFilter(val); setCtPage(0); }}>
              <SelectTrigger className="h-9! text-sm border border-border/30 bg-background rounded-lg w-full font-semibold">
                <SelectValue placeholder="Tất cả phòng ban" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả Phòng ban</SelectItem>
                {departmentList.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expiry Filter */}
          <div className="flex flex-col gap-1 w-[150px] shrink-0">
            <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Khoảng hết hạn</Label>
            <Select value={ctExpiryFilter} onValueChange={(val) => { setCtExpiryFilter(val); setCtPage(0); }}>
              <SelectTrigger className="h-9! text-sm border border-border/30 bg-background rounded-lg w-full font-semibold">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả Thời hạn</SelectItem>
                <SelectItem value="7_DAYS">Hết hạn trong 7 ngày</SelectItem>
                <SelectItem value="30_DAYS">Hết hạn trong 30 ngày</SelectItem>
                <SelectItem value="60_DAYS">Hết hạn trong 60 ngày</SelectItem>
                <SelectItem value="EXPIRED">Đã hết hạn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Filter */}
          <div className="flex flex-col gap-1 w-[140px] shrink-0">
            <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">File đính kèm</Label>
            <Select value={ctFileFilter} onValueChange={(val) => { setCtFileFilter(val); setCtPage(0); }}>
              <SelectTrigger className="h-9! text-sm border border-border/30 bg-background rounded-lg w-full font-semibold">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả File</SelectItem>
                <SelectItem value="WITH_FILE">Đã có file PDF</SelectItem>
                <SelectItem value="MISSING_FILE">Thiếu file PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 self-end">
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="h-9 font-semibold bg-primary text-primary-foreground hover:bg-accent/70 text-xs rounded-lg px-3 disabled:opacity-60 cursor-pointer"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Filter className="h-3.5 w-3.5 mr-1" />} Lọc
            </Button>

            {isFilteredOrSorted && (
              <Button
                type="button"
                onClick={handleResetFiltersAndSort}
                variant="outline"
                size="lg"
                className="h-9 text-xs text-muted-foreground hover:text-foreground rounded-lg px-2.5 border border-border/30 bg-background flex items-center gap-1 cursor-pointer"
                title="Đặt lại bộ lọc & sắp xếp"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Đặt lại</span>
              </Button>
            )}
          </div>
        </form>

        {/* Active Filter & Sort Chips Bar (Matching UserManagement.tsx) */}
        {isFilteredOrSorted && (
          <div className="px-4 py-2 bg-muted/40 border-b border-border/30 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in-50">
            <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
              <span className="font-semibold text-foreground">Đang áp dụng:</span>
              {ctSearchTerm && (
                <span className="px-2 py-0.5 rounded-md bg-background border border-border/40 text-foreground flex items-center gap-1">
                  Từ khóa: <strong className="text-primary">{ctSearchTerm}</strong>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setCtSearchTerm("")} />
                </span>
              )}
              {ctStatusFilter !== "ALL" && (
                <span className="px-2 py-0.5 rounded-md bg-background border border-border/40 text-foreground flex items-center gap-1">
                  Trạng thái HĐ: <strong className="text-primary">{ctStatusFilter}</strong>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setCtStatusFilter("ALL")} />
                </span>
              )}
              {ctSigningStatusFilter !== "ALL" && (
                <span className="px-2 py-0.5 rounded-md bg-background border border-border/40 text-foreground flex items-center gap-1">
                  Trạng thái Ký: <strong className="text-primary">{ctSigningStatusFilter}</strong>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setCtSigningStatusFilter("ALL")} />
                </span>
              )}
              {ctTypeFilter !== "ALL" && (
                <span className="px-2 py-0.5 rounded-md bg-background border border-border/40 text-foreground flex items-center gap-1">
                  Loại HĐ: <strong className="text-primary">{ctTypeFilter}</strong>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setCtTypeFilter("ALL")} />
                </span>
              )}
              {ctDeptFilter !== "ALL" && (
                <span className="px-2 py-0.5 rounded-md bg-background border border-border/40 text-foreground flex items-center gap-1">
                  Phòng ban: <strong className="text-primary">{ctDeptFilter}</strong>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setCtDeptFilter("ALL")} />
                </span>
              )}
              {ctExpiryFilter !== "ALL" && (
                <span className="px-2 py-0.5 rounded-md bg-background border border-border/40 text-foreground flex items-center gap-1">
                  Khoảng hết hạn: <strong className="text-primary">{ctExpiryFilter}</strong>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setCtExpiryFilter("ALL")} />
                </span>
              )}
              {ctFileFilter !== "ALL" && (
                <span className="px-2 py-0.5 rounded-md bg-background border border-border/40 text-foreground flex items-center gap-1">
                  File: <strong className="text-primary">{ctFileFilter}</strong>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setCtFileFilter("ALL")} />
                </span>
              )}
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

        {/* Table Content */}
        <CardContent className="p-0 relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center z-20">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          )}

          <Table containerClassName="max-h-[calc(100vh-240px)] min-h-[240px] overflow-auto border-b border-border/20">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
              <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                {/* Checkbox Header */}
                <TableHead className="w-8 pb-4">
                  <Checkbox
                    checked={paginated.length > 0 && isAllPaginatedSelected}
                    onCheckedChange={toggleSelectAllPaginated}
                    className="translate-y-0.5 border-border/30"
                  />
                </TableHead>

                {/* Column 1: Người dùng / Nhân viên (Sortable) */}
                <TableHead
                  className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group"
                  onClick={() => handleSort("fullName")}
                  title="Click 1 lần: Tăng (ASC) | Click 2 lần: Giảm (DESC) | Click 3 lần: Bỏ sắp xếp"
                >
                  <div className="flex items-center gap-1.5 pl-2">
                    <span className={getSortRuleInfo("fullName") ? "text-primary font-bold" : "text-muted-foreground"}>
                      Nhân viên & Mã NV
                    </span>
                    {renderSortIcon("fullName")}
                  </div>
                </TableHead>

                {/* Column 2: Phòng ban / Chức danh (Sortable) */}
                <TableHead
                  className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider group"
                  onClick={() => handleSort("departmentName")}
                  title="Click 1 lần: Tăng (ASC) | Click 2 lần: Giảm (DESC) | Click 3 lần: Bỏ sắp xếp"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={getSortRuleInfo("departmentName") ? "text-primary font-bold" : "text-muted-foreground"}>
                      Phòng ban / Chức danh
                    </span>
                    {renderSortIcon("departmentName")}
                  </div>
                </TableHead>

                {/* Column 3: Loại Hợp Đồng (Sortable) */}
                <TableHead
                  className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group"
                  onClick={() => handleSort("contractTypeEnum")}
                  title="Click 1 lần: Tăng (ASC) | Click 2 lần: Giảm (DESC) | Click 3 lần: Bỏ sắp xếp"
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className={getSortRuleInfo("contractTypeEnum") ? "text-primary font-bold" : "text-muted-foreground"}>
                      Loại hợp đồng
                    </span>
                    {renderSortIcon("contractTypeEnum")}
                  </div>
                </TableHead>

                {/* Column 4: Lương Thỏa Thuận (Sortable) */}
                <TableHead
                  className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group"
                  onClick={() => handleSort("baseSalary")}
                  title="Click 1 lần: Tăng (ASC) | Click 2 lần: Giảm (DESC) | Click 3 lần: Bỏ sắp xếp"
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className={getSortRuleInfo("baseSalary") ? "text-primary font-bold" : "text-muted-foreground"}>
                      Lương thỏa thuận
                    </span>
                    {renderSortIcon("baseSalary")}
                  </div>
                </TableHead>

                {/* Column 5: Ngày Ký Kết (Sortable) */}
                <TableHead
                  className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group"
                  onClick={() => handleSort("signedAt")}
                  title="Click 1 lần: Tăng (ASC) | Click 2 lần: Giảm (DESC) | Click 3 lần: Bỏ sắp xếp"
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className={getSortRuleInfo("signedAt") ? "text-primary font-bold" : "text-muted-foreground"}>
                      Ngày ký kết
                    </span>
                    {renderSortIcon("signedAt")}
                  </div>
                </TableHead>

                {/* Column 6: Thời Hạn Hợp Đồng */}
                <TableHead className="text-sm pb-4 text-center font-semibold text-muted-foreground uppercase tracking-wider">
                  Thời hạn hợp đồng
                </TableHead>

                {/* Column 7: File MinIO */}
                <TableHead className="text-sm pb-4 text-center font-semibold text-muted-foreground uppercase tracking-wider">
                  File đính kèm
                </TableHead>

                {/* Column 8: Trạng Thái Hợp Đồng (Sortable) */}
                <TableHead
                  className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group"
                  onClick={() => handleSort("status")}
                  title="Click 1 lần: Tăng (ASC) | Click 2 lần: Giảm (DESC) | Click 3 lần: Bỏ sắp xếp"
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className={getSortRuleInfo("status") ? "text-primary font-bold" : "text-muted-foreground"}>
                      Trạng thái HĐ
                    </span>
                    {renderSortIcon("status")}
                  </div>
                </TableHead>

                {/* Column 9: Trạng Thái Ký (E-Signature) */}
                <TableHead
                  className="cursor-pointer pb-4 select-none text-sm font-semibold uppercase tracking-wider text-center group"
                  onClick={() => handleSort("signingStatus")}
                  title="Click 1 lần: Tăng (ASC) | Click 2 lần: Giảm (DESC) | Click 3 lần: Bỏ sắp xếp"
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className={getSortRuleInfo("signingStatus") ? "text-primary font-bold" : "text-muted-foreground"}>
                      Trạng thái ký
                    </span>
                    {renderSortIcon("signingStatus")}
                  </div>
                </TableHead>

                {/* Column 10: Thao Tác */}
                <TableHead className="text-sm text-center pb-4 font-semibold text-muted-foreground uppercase tracking-wider">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="opacity-90">
              {paginated.length > 0 ? (
                paginated.map((ct, index) => {
                  const isSelected = selectedContractIds.includes(ct.id);
                  const endDateStr = ct.endDate || ct.validTo;
                  let isExpiringSoon = false;
                  let isExpired = false;

                  if (endDateStr) {
                    const end = new Date(endDateStr);
                    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
                    if (diffDays < 0) isExpired = true;
                    else if (diffDays <= 30 && ct.status === "ACTIVE") isExpiringSoon = true;
                  }

                  const cType = ct.contractTypeEnum || ct.contractType || "HỢP ĐỒNG";
                  const sTypeLabel = ct.salaryTypeEnum === "HOURLY" ? "giờ" : ct.salaryTypeEnum === "DAILY" ? "ngày" : "tháng";

                  return (
                    <TableRow
                      key={ct.id || index}
                      className={`hover:bg-foreground/10 transition-colors border-border/30 ${
                        isSelected ? "bg-primary/5 hover:bg-primary/10" :
                        isExpiringSoon ? "bg-amber-500/5 hover:bg-amber-500/10" :
                        isExpired ? "bg-rose-500/5 hover:bg-rose-500/10" : ""
                      }`}
                    >
                      {/* Checkbox cell */}
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectContract(ct.id)}
                          className="translate-y-0.5 border-border/30"
                        />
                      </TableCell>

                      {/* Nhân viên & Mã NV */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs shrink-0 border border-primary/20 overflow-hidden">
                            {ct.fullName ? ct.fullName.charAt(0).toUpperCase() : "E"}
                          </div>
                          <div className="text-left">
                            <p
                              onClick={() => { setSelectedContractForDetail(ct); setDetailModalOpen(true); }}
                              className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors text-sm"
                            >
                              {ct.fullName || ct.employeeId}
                            </p>
                            <p className="text-sm text-muted-foreground font-mono">
                              {ct.employeeCode || "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Phòng ban & Vị trí */}
                      <TableCell>
                        <div className="text-left">
                          <p className="font-semibold text-sm text-foreground">{ct.departmentName || "—"}</p>
                          <p className="text-sm text-muted-foreground">{ct.position || "Nhân viên"}</p>
                        </div>
                      </TableCell>

                      {/* Loại Hợp đồng */}
                      <TableCell className="text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-sm bg-primary/10 text-primary font-semibold uppercase border border-primary/20 inline-block">
                          {cType}
                        </span>
                      </TableCell>

                      {/* Mức Lương */}
                      <TableCell className="text-center font-semibold text-sm text-foreground">
                        {ct.baseSalary ? Number(ct.baseSalary).toLocaleString() : 0} đ
                        <span className="text-xs text-muted-foreground font-medium ml-1">/ {sTypeLabel}</span>
                      </TableCell>

                      {/* Ngày Ký Kết */}
                      <TableCell className="text-center text-sm text-muted-foreground font-medium">
                        {ct.signedAt ? formatDateDisplay(ct.signedAt.slice(0, 10)) : "—"}
                      </TableCell>

                      {/* Thời Hạn Hợp Đồng */}
                      <TableCell className="text-center">
                        <div className="text-sm font-semibold text-foreground flex items-center justify-center gap-1">
                          <span>{ct.startDate ? formatDateDisplay(ct.startDate) : (ct.validFrom ? formatDateDisplay(ct.validFrom) : "—")}</span>
                          <span className="text-muted-foreground">→</span>
                          <span>{endDateStr ? formatDateDisplay(endDateStr) : "Vô thời hạn"}</span>
                        </div>
                        {isExpiringSoon && (
                          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full mt-1">
                            <AlertTriangle className="h-3 w-3" /> Sắp hết hạn
                          </span>
                        )}
                      </TableCell>

                      {/* File MinIO Status */}
                      <TableCell className="text-center">
                        {ct.fileUrl || ct.fileKey ? (
                          <a
                            href={ct.fileUrl || ct.fileKey}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20"
                            title={ct.fileName || "Tải file PDF hợp đồng"}
                          >
                            <FileCheck className="h-3.5 w-3.5 text-primary" />
                            <span className="max-w-[90px] truncate">{ct.fileName ? "File PDF" : "Đã đính kèm"}</span>
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                            <AlertCircle className="h-3 w-3" /> Chưa có file
                          </span>
                        )}
                      </TableCell>

                      {/* Trạng Thái Hợp Đồng */}
                      <TableCell className="text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-semibold text-sm inline-flex items-center gap-1 ${
                            ct.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : ct.status === "EXPIRED"
                              ? "bg-muted text-muted-foreground border border-border/40"
                              : ct.status === "TERMINATED"
                              ? "bg-destructive/10 text-destructive border border-destructive/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              ct.status === "ACTIVE"
                                ? "bg-emerald-500"
                                : ct.status === "EXPIRED"
                                ? "bg-muted-foreground"
                                : ct.status === "TERMINATED"
                                ? "bg-destructive"
                                : "bg-amber-500"
                            }`}
                          />
                          {ct.status || "ACTIVE"}
                        </span>
                      </TableCell>

                      {/* Trạng Thái Ký Điện Tử */}
                      <TableCell className="text-center">
                        {ct.signingStatus === "FULLY_SIGNED" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-600 text-white inline-flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Đã ký 2 bên
                          </span>
                        ) : ct.signingStatus === "PENDING_EMPLOYEE_SIGN" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-500/15 text-blue-700 border border-blue-500/30 inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Chờ NV ký OTP
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-700 border border-amber-500/30 inline-flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Công ty chưa ký
                          </span>
                        )}
                      </TableCell>

                      {/* Thao Tác */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Company Sign Quick Action */}
                          {ct.signingStatus === "PENDING_COMPANY_SIGN" && ct.status !== "TERMINATED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={signingActionId === ct.id}
                              onClick={() => handleSignCompanyQuick(ct.id)}
                              className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                              title="Ký xác nhận phía Công ty"
                            >
                              {signingActionId === ct.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenTool className="h-3.5 w-3.5" />}
                            </Button>
                          )}

                          {/* Resend Link Quick Action */}
                          {ct.signingStatus === "PENDING_EMPLOYEE_SIGN" && ct.status !== "TERMINATED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={signingActionId === ct.id}
                              onClick={() => handleResendSigningLinkQuick(ct.id)}
                              className="h-7 w-7 text-blue-600 hover:bg-blue-500/10 cursor-pointer"
                              title="Sinh lại & Gửi link ký mới cho Nhân viên"
                            >
                              {signingActionId === ct.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            </Button>
                          )}

                          {/* Signing Audit History Quick Action */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenSigningHistoryQuick(ct.id)}
                            className="h-7 w-7 text-purple-600 hover:bg-purple-500/10 cursor-pointer"
                            title="Lịch sử nhật ký ký điện tử"
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedContractForDetail(ct);
                              setDetailModalOpen(true);
                            }}
                            className="h-7 w-7 text-sky-600 hover:bg-sky-500/10 cursor-pointer"
                            title="Xem chi tiết Hợp Đồng & Nhân viên"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {ct.status === "ACTIVE" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setTerminateConfirmContract({ id: ct.id, name: ct.fullName || ct.employeeCode || "Nhân viên" })}
                              className="h-7 w-7 text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                              title="Chấm dứt hợp đồng này"
                            >
                              <FileX className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="py-12 text-center text-muted-foreground text-sm">
                    Không tìm thấy hợp đồng nào phù hợp với bộ lọc.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Table Footer & Pagination */}
        <div className="px-5 py-3 border-t border-border/40 bg-card/40 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-muted-foreground font-medium">
            Hiển thị <span className="font-semibold text-foreground">{totalElements === 0 ? 0 : ctPage * ctPageSize + 1}</span> đến{" "}
            <span className="font-semibold text-foreground">{Math.min((ctPage + 1) * ctPageSize, totalElements)}</span> trên tổng{" "}
            <span className="font-semibold text-foreground">{totalElements}</span> hợp đồng
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Rows per page:</span>
              <Select value={String(ctPageSize)} onValueChange={(val) => { setCtPageSize(Number(val)); setCtPage(0); }}>
                <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border/40 rounded-lg font-semibold">
                  <SelectValue placeholder={String(ctPageSize)} />
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
                const pageNum = parseInt(ctJumpPageInput, 10);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                  setCtPage(pageNum - 1);
                } else {
                  setCtJumpPageInput(String(ctPage + 1));
                }
              }}
              className="flex items-center gap-1.5"
            >
              <span className="text-muted-foreground font-medium">Go to:</span>
              <Input
                type="number"
                min={1}
                max={totalPages || 1}
                value={ctJumpPageInput}
                onChange={(e) => setCtJumpPageInput(e.target.value)}
                onBlur={() => {
                  const pageNum = parseInt(ctJumpPageInput, 10);
                  if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                    setCtPage(pageNum - 1);
                  } else {
                    setCtJumpPageInput(String(ctPage + 1));
                  }
                }}
                className="h-8 w-14 text-center text-xs font-semibold bg-background border border-border/40 rounded-lg px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </form>

            <div className="flex items-center gap-1">
              <Button disabled={ctPage === 0} onClick={() => setCtPage((prev) => prev - 1)} variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted">
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              {getPageNumbers(ctPage, totalPages).map((p, pIdx) => {
                if (p === "...") return <span key={`dots-${pIdx}`} className="px-2 text-muted-foreground font-bold pointer-events-none">...</span>;
                const pageNum = p as number;
                const isCurrent = pageNum === ctPage;
                return (
                  <Button key={pageNum} onClick={() => setCtPage(pageNum)} variant={isCurrent ? "default" : "outline"} size="sm" className={cn("h-8 min-w-[32px] px-2 text-xs font-semibold rounded-lg transition-all", isCurrent ? "bg-primary text-primary-foreground shadow-xs" : "border-border/40 text-foreground hover:bg-muted/70")}>
                    {pageNum + 1}
                  </Button>
                );
              })}
              <Button disabled={ctPage >= totalPages - 1 || totalPages === 0} onClick={() => setCtPage((prev) => prev + 1)} variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
      </div>
      )}

      {/* TAB 2: HỢP ĐỒNG CHƯA KÝ & CẦN KÝ ĐIỆN TỬ */}
      {mainTab === "pending_sign" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* TAB 2 METRIC SUMMARY */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-amber-500/30 bg-amber-500/5 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase">Chờ Công ty Ký</p>
                  <p className="text-2xl font-black text-amber-900 mt-1">{pendingCompanySignCount}</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">Cần HR/Admin ấn ký xác nhận</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
                  <PenTool className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-blue-500/30 bg-blue-500/5 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-700 uppercase">Chờ Nhân viên Ký OTP</p>
                  <p className="text-2xl font-black text-blue-900 mt-1">{pendingEmployeeSignCount}</p>
                  <p className="text-[11px] text-blue-600 mt-0.5">Đã gửi link &amp; OTP qua Email</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-600 flex items-center justify-center font-bold">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-emerald-500/30 bg-emerald-500/5 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase">Đã Ký Điện Tử 2 Bên</p>
                  <p className="text-2xl font-black text-emerald-900 mt-1">{fullySignedCount}</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Đã niêm phong PDF an toàn</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TAB 2 UNSIGNED CONTRACTS TABLE */}
          <Card className="border border-border/70 rounded-2xl bg-card shadow-xs overflow-hidden">
            <CardHeader className="p-4 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-extrabold uppercase text-foreground flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-amber-600" /> Danh sách Hợp đồng Cần Ký Điện Tử
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Thực hiện ký xác nhận phía Công ty, sao chép link ký hoặc gửi lại OTP cho nhân viên
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Nhân viên &amp; Mã NV</TableHead>
                    <TableHead className="text-xs font-bold text-center">Loại hợp đồng</TableHead>
                    <TableHead className="text-xs font-bold text-center">Mức lương</TableHead>
                    <TableHead className="text-xs font-bold text-center">Trạng thái Ký</TableHead>
                    <TableHead className="text-xs font-bold text-center">Thao tác Ký trực tiếp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unsignedContracts.length > 0 ? (
                    unsignedContracts.map((ct) => {
                      const isPendingCompany = !ct.signingStatus || ct.signingStatus === "PENDING_COMPANY_SIGN";
                      const isPendingEmployee = ct.signingStatus === "PENDING_EMPLOYEE_SIGN";

                      return (
                        <TableRow key={ct.id} className="hover:bg-muted/20">
                          {/* NV & Code */}
                          <TableCell>
                            <div className="font-bold text-xs text-foreground">{ct.fullName || ct.employeeId}</div>
                            <div className="text-[11px] font-mono text-muted-foreground">{ct.employeeCode || "—"} &bull; {ct.departmentName || "P.Ban"}</div>
                          </TableCell>

                          {/* Contract Type */}
                          <TableCell className="text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-primary/10 text-primary border border-primary/20">
                              {ct.contractTypeEnum || ct.contractType || "HỢP ĐỒNG"}
                            </span>
                          </TableCell>

                          {/* Salary */}
                          <TableCell className="text-center font-bold text-xs">
                            {ct.baseSalary ? Number(ct.baseSalary).toLocaleString() : 0} đ
                          </TableCell>

                          {/* Signing Status Badge */}
                          <TableCell className="text-center">
                            {isPendingEmployee ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-500/15 text-blue-700 border border-blue-500/30 inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Chờ NV ký OTP
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-700 border border-amber-500/30 inline-flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Công ty chưa ký
                              </span>
                            )}
                          </TableCell>

                          {/* Interactive Direct Signing Actions */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              {/* 1. COMPANY SIGN BUTTON */}
                              {isPendingCompany && (
                                <Button
                                  size="sm"
                                  disabled={signingActionId === ct.id}
                                  onClick={() => handleSignCompanyQuick(ct.id)}
                                  className="h-7 text-xs font-bold gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                                >
                                  {signingActionId === ct.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenTool className="h-3 w-3" />}
                                  Ký đại diện Công ty
                                </Button>
                              )}

                              {/* 2. COPY SIGNING LINK BUTTON */}
                              {ct.signingToken && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCopySigningLink(ct.signingToken)}
                                  className="h-7 text-xs font-bold gap-1 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
                                  title="Sao chép link ký công khai cho nhân viên"
                                >
                                  {copiedToken === ct.signingToken ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                  {copiedToken === ct.signingToken ? "Đã chép link!" : "Sao chép link ký"}
                                </Button>
                              )}

                              {/* 3. RESEND LINK BUTTON */}
                              {isPendingEmployee && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={signingActionId === ct.id}
                                  onClick={() => handleResendSigningLinkQuick(ct.id)}
                                  className="h-7 text-xs font-bold gap-1 rounded-lg cursor-pointer"
                                >
                                  {signingActionId === ct.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                  Gửi lại link
                                </Button>
                              )}

                              {/* 4. PREVIEW PDF BUTTON */}
                              {(ct.fileUrl || ct.fileKey || ct.originalFileDownloadUrl) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPdfPreviewUrl(ct.originalFileDownloadUrl || ct.fileUrl || (ct.fileKey ? `/api/v1/files/download?fileKey=${ct.fileKey}` : null))}
                                  className="h-7 text-xs font-bold gap-1 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                                  title="Xem trước file PDF Hợp đồng"
                                >
                                  <Eye className="h-3 w-3" /> Xem PDF
                                </Button>
                              )}

                              {/* 5. SIGNING AUDIT HISTORY */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenSigningHistoryQuick(ct.id)}
                                className="h-7 text-xs font-bold gap-1 rounded-lg text-purple-600 hover:bg-purple-50 cursor-pointer"
                                title="Xem nhật ký lịch sử ký"
                              >
                                <History className="h-3 w-3" /> Lịch sử
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                        Không có hợp đồng nào đang chờ ký. Tất cả hợp đồng đã được hoàn tất ký điện tử!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: NHÂN VIÊN CHƯA CÓ HỢP ĐỒNG */}
      {mainTab === "no_contract" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* METRIC CARDS FOR TAB 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10 shadow-xs">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">Chưa Có Hợp Đồng</span>
                  <div className="h-8 w-8 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <UserX className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-rose-700 dark:text-rose-400">{employeesWithoutContract.length}</span>
                  <span className="text-[10px] text-rose-600 font-bold ml-2">Cần tạo hợp đồng ngay</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-500/30 bg-slate-500/5 dark:bg-slate-500/10 shadow-xs">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Tổng Số Nhân Viên</span>
                  <div className="h-8 w-8 rounded-xl bg-slate-500/20 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-foreground">{allEmployees.length}</span>
                  <span className="text-[10px] text-slate-600 font-bold ml-2">Nhân sự hệ thống</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-xs">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Tỷ Lệ Phủ Hợp Đồng</span>
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    {allEmployees.length > 0
                      ? Math.round(((allEmployees.length - employeesWithoutContract.length) / allEmployees.length) * 100)
                      : 0}%
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold ml-2">Đã có hợp đồng</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TOOLBAR SEARCH TAB 3 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-card rounded-2xl border border-border/70 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, mã NV, phòng ban..."
                value={noContractSearchTerm}
                onChange={(e) => setNoContractSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-border/60"
              />
              {noContractSearchTerm && (
                <button
                  onClick={() => setNoContractSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="text-xs font-semibold text-muted-foreground">
              Hiển thị <span className="text-foreground font-bold">{filteredEmployeesWithoutContract.length}</span> nhân viên chưa có hợp đồng
            </div>
          </div>

          {/* TABLE TAB 3 */}
          <div className="rounded-2xl border border-border/70 overflow-hidden bg-card shadow-xs">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
                  <TableHead className="text-xs font-bold">Mã NV</TableHead>
                  <TableHead className="text-xs font-bold">Họ và Tên Nhân Viên</TableHead>
                  <TableHead className="text-xs font-bold">Phòng Ban</TableHead>
                  <TableHead className="text-xs font-bold">Chức Danh</TableHead>
                  <TableHead className="text-xs font-bold">Email / SĐT</TableHead>
                  <TableHead className="text-xs font-bold text-center">Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAllEmployees ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-xs font-semibold">Đang tải danh sách nhân viên từ hệ thống...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEmployeesWithoutContract.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <span className="text-sm font-bold text-foreground">Tất cả nhân viên đã có hợp đồng!</span>
                        <span className="text-xs">Không tìm thấy nhân viên nào chưa lập hợp đồng.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployeesWithoutContract.map((emp, idx) => (
                    <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs font-bold text-primary">{emp.employeeCode || emp.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-rose-500/10 text-rose-600 font-bold flex items-center justify-center text-xs shrink-0 border border-rose-500/20">
                            {emp.fullName ? emp.fullName.charAt(0).toUpperCase() : "N"}
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-xs">{emp.fullName}</p>
                            <p className="text-[11px] text-rose-600 font-medium">Chưa có hợp đồng</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">{emp.departmentName || "Chưa phân bổ"}</TableCell>
                      <TableCell className="text-xs">{emp.position || "N/A"}</TableCell>
                      <TableCell className="text-xs">
                        <p className="text-foreground">{emp.email || emp.userEmail || "—"}</p>
                        <p className="text-[11px] text-muted-foreground">{emp.phone || "—"}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedEmployeeForWizard(emp);
                            setNewContractWizardOpen(true);
                          }}
                          className="h-8 text-xs font-bold gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>+ Tạo Hợp Đồng</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── BULK ACTIONS FLOATING TOOLBAR ── */}
      {selectedContractIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-lg border border-primary/40 shadow-2xl rounded-2xl p-3 px-6 flex flex-wrap items-center gap-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 border-r border-border/50 pr-4">
            <span className="flex h-3 w-3 rounded-full bg-primary animate-ping" />
            <span className="text-xs font-extrabold text-foreground">
              Đã chọn <strong className="text-primary">{selectedContractIds.length}</strong> / 50 hợp đồng
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportSelectedContractsCSV}
              className="h-8 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Xuất CSV</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkSendReminders}
              className="h-8 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 text-blue-600" />
              <span>Gửi nhắc nhở</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const files = contracts.filter(c => selectedContractIds.includes(c.id) && (c.fileUrl || c.fileKey));
                if (files.length === 0) {
                  showBanner("Các hợp đồng đã chọn không có file đính kèm!", true);
                  return;
                }
                files.forEach(f => {
                  window.open(f.fileUrl || f.fileKey, "_blank");
                });
                showBanner(`Đã tải xuống ${files.length} file hợp đồng!`);
              }}
              className="h-8 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted cursor-pointer"
            >
              <DownloadCloud className="h-3.5 w-3.5 text-purple-600" />
              <span>Tải Zip/File PDF</span>
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() => setBulkTerminateModalOpen(true)}
              className="h-8 text-xs font-bold gap-1.5 rounded-xl cursor-pointer"
            >
              <FileX className="h-3.5 w-3.5" />
              <span>Chấm dứt hàng loạt ({selectedContractIds.length})</span>
            </Button>

            <button
              onClick={() => setSelectedContractIds([])}
              className="text-xs font-bold text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL CHẤM DỨT HÀNG LOẠT ── */}
      {bulkTerminateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-card border border-rose-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-border/40 pb-4">
              <div className="h-10 w-10 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center shrink-0">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">Xác nhận Chấm Dứt Hàng Loạt Hợp Đồng</h3>
                <p className="text-xs text-rose-600 font-bold">Hành động này có nguy cơ cao và sẽ ghi nhận vết Audit Trail!</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-300 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> Bạn đang chuẩn bị CHẤM DỨT {selectedContractIds.length} hợp đồng!
                </p>
                <p className="text-[11px]">Trạng thái của các hợp đồng đã chọn sẽ chuyển sang <strong className="font-mono">TERMINATED</strong>. Người thực hiện sẽ được ghi nhận vào nhật ký hệ thống.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Lý do chấm dứt chung (Termination Reason)</Label>
                <Input
                  placeholder="Nhập lý do chấm dứt hợp đồng (vd: Hết hạn dự án, Thỏa thuận 2 bên...)"
                  value={bulkTerminateReason}
                  onChange={(e) => setBulkTerminateReason(e.target.value)}
                  className="text-xs h-9 bg-background border-border/50 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setBulkTerminateModalOpen(false)} className="rounded-xl text-xs font-bold">
                Hủy bỏ
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={bulkTerminating}
                onClick={handleConfirmBulkTerminate}
                className="rounded-xl text-xs font-bold gap-1"
              >
                {bulkTerminating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Xác nhận Chấm Dứt {selectedContractIds.length} HĐ</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết Hợp Đồng */}
      <ContractDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        contract={selectedContractForDetail}
        onOpenPdfPreview={(url) => setPdfPreviewUrl(url)}
        onSignCompany={(ctId) => handleSignCompanyQuick(ctId)}
        onOpenSigningHistory={(ctId) => handleOpenSigningHistoryQuick(ctId)}
      />

      {/* TOAST BANNER NOTIFICATIONS */}
      {actionMessage && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300",
            actionMessage.isError ? "bg-destructive" : "bg-emerald-600"
          )}
        >
          {actionMessage.isError ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
          <span className="text-sm font-semibold">{actionMessage.text}</span>
        </div>
      )}

      {/* CONFIRM TERMINATE CONTRACT DIALOG */}
      <ConfirmDialog
        open={Boolean(terminateConfirmContract)}
        onOpenChange={(open) => { if (!open) setTerminateConfirmContract(null); }}
        title="Xác nhận chấm dứt Hợp đồng"
        description={`Bạn có chắc chắn muốn chấm dứt hợp đồng của ${terminateConfirmContract?.name}?`}
        confirmText="Chấm dứt HĐ"
        cancelText="Hủy bỏ"
        onConfirm={confirmTerminateContractAction}
      />

      {/* SELECT EMPLOYEE MODAL (BƯỚC 1 CỦA NÚT "+ TẠO HỢP ĐỒNG MỚI") */}
      {selectEmployeeModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border/50 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-600" /> Chọn Nhân viên để Tạo Hợp Đồng Mới
              </h3>
              <Button size="icon" variant="ghost" onClick={() => setSelectEmployeeModalOpen(false)} className="h-7 w-7 rounded-lg">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Tìm tên hoặc mã nhân viên..."
                  value={employeeSearchTerm}
                  onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-xs bg-background border-border/40 rounded-xl"
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
                {loadingEmployeeList ? (
                  <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> Đang tải danh sách nhân viên...
                  </div>
                ) : employeeList.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">Không tìm thấy nhân viên nào.</div>
                ) : (
                  employeeList
                    .filter((emp) => {
                      if (!employeeSearchTerm.trim()) return true;
                      const kw = employeeSearchTerm.toLowerCase();
                      return (emp.fullName || "").toLowerCase().includes(kw) || (emp.employeeCode || "").toLowerCase().includes(kw);
                    })
                    .map((emp) => (
                      <div
                        key={emp.id || emp.userId}
                        onClick={() => {
                          setSelectedEmployeeForWizard(emp);
                          setSelectEmployeeModalOpen(false);
                          setNewContractWizardOpen(true);
                        }}
                        className="p-3 rounded-xl border border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                            {emp.fullName ? emp.fullName.charAt(0).toUpperCase() : "E"}
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-xs group-hover:text-primary transition-colors">{emp.fullName}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">{emp.employeeCode || "N/A"} &bull; {emp.departmentName || "Chưa xếp P.Ban"}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Chọn
                        </Button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW CONTRACT WIZARD MODAL (MỞ KHI ĐÃ CHỌN NHÂN VIÊN) */}
      {newContractWizardOpen && selectedEmployeeForWizard && (
        <NewContractWizardModal
          open={newContractWizardOpen}
          onClose={() => {
            setNewContractWizardOpen(false);
            setSelectedEmployeeForWizard(null);
          }}
          employee={selectedEmployeeForWizard}
          onSuccess={(msg) => {
            showBanner(msg);
            fetchContracts();
            setNewContractWizardOpen(false);
            setSelectedEmployeeForWizard(null);
          }}
          onError={(msg) => showBanner(msg, true)}
        />
      )}

      {/* SIGNING HISTORY AUDIT DIALOG (MỞ KHI CLICK NÚT LỊCH SỬ KÝ TRÊN ROW) */}
      {signingHistoryOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-background border border-border/50 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Lịch sử Ký Điện Tử (Audit Log)
              </h3>
              <Button size="icon" variant="ghost" onClick={() => setSigningHistoryOpen(false)} className="h-7 w-7 rounded-lg">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
              {loadingSigningHistory ? (
                <div className="text-center py-8 text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Đang tải lịch sử ký...
                </div>
              ) : signingHistoryLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Chưa có lịch sử ký điện tử nào được ghi nhận cho hợp đồng này.
                </div>
              ) : (
                signingHistoryLogs.map((logItem) => (
                  <div key={logItem.id} className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-primary uppercase text-[10px]">
                        {logItem.action === "CONTRACT_SIGNED_COMPANY" ? "Phía Công ty đã Ký" : "Phía Nhân viên đã Ký"}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">{logItem.occurredAt}</span>
                    </div>
                    <p className="font-bold text-foreground">
                      Người ký: {logItem.signerFullName} {logItem.signerEmail ? `(${logItem.signerEmail})` : ""}
                    </p>
                    <div className="text-[10px] font-mono text-muted-foreground flex flex-wrap gap-x-3">
                      <span>IP: {logItem.ipAddress || "N/A"}</span>
                      <span className="truncate max-w-[260px]">UA: {logItem.userAgent || "N/A"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSigningHistoryOpen(false)} className="h-8 text-xs font-bold px-4">
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PDF PREVIEW MODAL */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-background border border-border/50 rounded-2xl max-w-4xl w-full h-[85vh] p-5 space-y-3 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Xem Trước File Hợp Đồng PDF
              </h3>
              <Button size="icon" variant="ghost" onClick={() => setPdfPreviewUrl(null)} className="h-7 w-7 rounded-lg">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden border border-border/30">
              <iframe src={pdfPreviewUrl} title="Contract PDF Preview" className="w-full h-full border-none" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
