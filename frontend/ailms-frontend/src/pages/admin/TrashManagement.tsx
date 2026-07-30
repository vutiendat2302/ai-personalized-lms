import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { trashApi, type TrashItemDTO, type ChildRecordDetailDTO } from "@/api/trash/trashApi";
import {
  Trash2,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Users,
  RotateCcw,
  ShieldAlert,
  Archive,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Building2,
  Eye,
  Info,
  Calendar,
  Database
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

export const TrashManagement: React.FC = () => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [trashItems, setTrashItems] = useState<TrashItemDTO[]>([]);
  const [allFetchedItems, setAllFetchedItems] = useState<TrashItemDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
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

  // Filter States
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [filterEntityType, setFilterEntityType] = useState("ALL");
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);

  // Pagination & Sorting States
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [jumpPageInput, setJumpPageInput] = useState("1");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");

  // Modals States
  const [activeModal, setActiveModal] = useState<
    "NONE" | "SINGLE_RESTORE" | "BULK_RESTORE" | "SINGLE_HARD_DELETE" | "BULK_HARD_DELETE" | "DETAIL_MODAL"
  >("NONE");
  
  const [targetItem, setTargetItem] = useState<TrashItemDTO | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<TrashItemDTO | null>(null);
  const [fkDetails, setFkDetails] = useState<Record<string, number>>({});
  
  // Child Record Detail Modal States
  const [childDetailModalOpen, setChildDetailModalOpen] = useState(false);
  const [childDetailsList, setChildDetailsList] = useState<ChildRecordDetailDTO[]>([]);
  const [childDetailLoading, setChildDetailLoading] = useState(false);
  const [selectedChildItem, setSelectedChildItem] = useState<TrashItemDTO | null>(null);

  // Strong Confirmation Inputs
  const [confirmInput, setConfirmInput] = useState("");
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  // Main Fetch Hook
  useEffect(() => {
    fetchTrashData();
  }, [page, pageSize, debouncedKeyword, filterEntityType, sortDir, filterOverdueOnly]);

  const fetchTrashData = async () => {
    setLoading(true);
    try {
      const res = await trashApi.getTrashItems({
        entityType: filterEntityType,
        keyword: debouncedKeyword,
        page,
        size: pageSize
      });

      if (res.data.success) {
        const pageData = res.data.data;
        let items: TrashItemDTO[] = pageData.content || [];

        setAllFetchedItems(items);

        if (filterEntityType !== "ALL") {
          items = items.filter(i => (i.entityType || "USER").toUpperCase() === filterEntityType.toUpperCase());
        }

        if (filterOverdueOnly) {
          items = items.filter(i => (i.daysInTrash || 0) >= 30);
        }

        items.sort((a, b) => {
          const dA = new Date(a.deletedAt || 0).getTime();
          const dB = new Date(b.deletedAt || 0).getTime();
          return sortDir === "DESC" ? dB - dA : dA - dB;
        });

        setTrashItems(items);
        setTotalPages(pageData.totalPages || 1);
        setTotalElements(pageData.totalElements || items.length);
        setSelectedIds([]);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải danh sách thùng rác", true);
    } finally {
      setLoading(false);
    }
  };

  // Card Click Event Handlers
  const handleTotalCardClick = () => {
    setFilterOverdueOnly(false);
    setFilterEntityType("ALL");
    setPage(0);
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleOverdueCardClick = () => {
    setFilterOverdueOnly(true);
    setPage(0);
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Checkbox Select Logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(trashItems.map((item) => String(item.id)));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter((i) => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  // View Detail Handler
  const handleOpenDetailModal = async (item: TrashItemDTO) => {
    setSelectedDetailItem(item);
    setActiveModal("DETAIL_MODAL");
    try {
      const res = await trashApi.getTrashDetail(item.entityType || "USER", item.id);
      if (res.data.success && res.data.data) {
        setSelectedDetailItem(res.data.data);
      }
    } catch {
      // Keep existing item
    }
  };

  // Child Record Details Inspector Handler
  const handleOpenChildRecordDetails = async (item: TrashItemDTO) => {
    setSelectedChildItem(item);
    setChildDetailModalOpen(true);
    setChildDetailLoading(true);
    try {
      const res = await trashApi.getChildRecordDetails(item.entityType || "USER", item.id);
      if (res.data.success) {
        setChildDetailsList(res.data.data || []);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải chi tiết bản ghi con", true);
    } finally {
      setChildDetailLoading(false);
    }
  };

  // Restore Handlers
  const handleInitiateSingleRestore = (item: TrashItemDTO) => {
    setTargetItem(item);
    setActiveModal("SINGLE_RESTORE");
  };

  const handleConfirmSingleRestore = async () => {
    if (!targetItem) return;
    setLoading(true);
    try {
      const res = await trashApi.restore(targetItem.entityType || "USER", targetItem.id);
      if (res.data.success) {
        showBanner(`Khôi phục thành công "${targetItem.name}" về hệ thống!`);
        fetchTrashData();
      } else {
        showBanner(res.data.message || "Lỗi khôi phục dữ liệu", true);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể khôi phục bản ghi", true);
    } finally {
      setLoading(false);
      setActiveModal("NONE");
    }
  };

  const handleConfirmBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      const res = await trashApi.bulkRestore({
        entityType: filterEntityType === "ALL" ? "USER" : filterEntityType,
        ids: selectedIds
      });
      if (res.data.success) {
        showBanner(`Đã khôi phục thành công ${selectedIds.length} bản ghi!`);
        setSelectedIds([]);
        fetchTrashData();
      } else {
        showBanner(res.data.message || "Khôi phục thất bại", true);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi khôi phục hàng loạt", true);
    } finally {
      setLoading(false);
      setActiveModal("NONE");
    }
  };

  // Hard Delete Handlers with Cascade Warning Notice
  const handleInitiateSingleHardDelete = async (item: TrashItemDTO) => {
    setTargetItem(item);
    setConfirmInput("");
    setDisclaimerChecked(false);
    setFkDetails({});

    try {
      const res = await trashApi.checkChildRecords(item.entityType || "USER", item.id);
      if (res.data.success && res.data.data) {
        setFkDetails(res.data.data);
      }
    } catch {
      if (item.childRecordCounts) {
        setFkDetails(item.childRecordCounts);
      }
    }

    setActiveModal("SINGLE_HARD_DELETE");
  };

  const handleConfirmSingleHardDelete = async () => {
    if (!targetItem) return;
    if (confirmInput.trim().toUpperCase() !== targetItem.code.toUpperCase() && confirmInput.trim().toUpperCase() !== "XOACUNG") {
      showBanner("Mã xác nhận không chính xác!", true);
      return;
    }
    if (!disclaimerChecked) {
      showBanner("Bạn phải tích chọn xác nhận không thể hoàn tác!", true);
      return;
    }

    setLoading(true);
    try {
      const res = await trashApi.hardDelete(targetItem.entityType || "USER", targetItem.id);
      if (res.data.success) {
        showBanner(`Đã xóa vĩnh viễn đối tượng "${targetItem.name}" cùng tất cả bản ghi phụ thuộc!`);
        fetchTrashData();
      } else {
        showBanner(res.data.message || "Xóa vĩnh viễn thất bại", true);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể xóa cứng bản ghi", true);
    } finally {
      setLoading(false);
      setActiveModal("NONE");
    }
  };

  const handleConfirmBulkHardDelete = async () => {
    if (confirmInput.trim().toUpperCase() !== "XOACUNG") {
      showBanner("Mã xác nhận không chính xác!", true);
      return;
    }
    if (!disclaimerChecked) {
      showBanner("Bạn phải tích chọn cam kết miễn trừ trách nhiệm!", true);
      return;
    }

    setLoading(true);
    try {
      const res = await trashApi.bulkHardDelete({
        entityType: filterEntityType === "ALL" ? "USER" : filterEntityType,
        ids: selectedIds
      });
      if (res.data.success) {
        showBanner(`Đã xóa cứng vĩnh viễn ${selectedIds.length} bản ghi khỏi CSDL!`);
        setSelectedIds([]);
        fetchTrashData();
      } else {
        showBanner(res.data.message || "Xóa hàng loạt thất bại", true);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể thực hiện xóa hàng loạt", true);
    } finally {
      setLoading(false);
      setActiveModal("NONE");
    }
  };

  const getEntityBadge = (type: string) => {
    const uppercaseType = type ? type.toUpperCase() : "USER";
    switch (uppercaseType) {
      case "USER":
      case "EMPLOYEE":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold gap-1"><Users className="h-3 w-3" /> User</Badge>;
      case "COURSE":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 font-bold gap-1"><BookOpen className="h-3 w-3" /> Khóa học</Badge>;
      case "DEPARTMENT":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold gap-1"><Building2 className="h-3 w-3" /> Phòng ban</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/20 font-bold">{type}</Badge>;
    }
  };

  const totalFkChildRecords = Object.values(fkDetails).reduce((acc, curr) => acc + curr, 0);

  // Statistics
  const overdueCount = trashItems.filter(i => (i.daysInTrash || 0) >= 30).length;
  const safeCount = trashItems.filter(i => !i.hasChildRecords).length;

  // Validation rules for Hard Delete buttons
  const isSingleHardDeleteValid =
    disclaimerChecked &&
    targetItem &&
    (confirmInput.trim().toUpperCase() === targetItem.code.toUpperCase() ||
      confirmInput.trim().toUpperCase() === "XOACUNG");

  const isBulkHardDeleteValid =
    disclaimerChecked &&
    confirmInput.trim().toUpperCase() === "XOACUNG";

  return (
    <div className="mx-auto max-w-none w-full space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Toast Alert Banners */}
      {errorBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-destructive text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{errorBanner}</span>
        </div>
      )}

      {successBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <Link to="/dashboard" className="flex items-center gap-1 hover:underline">
              <ArrowLeft className="h-3 w-3" />
              <span>Quay lại Dashboard</span>
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-primary" />
            <span>Thùng rác hệ thống (Unified Trash)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý tập trung các thực thể đã xóa mềm. Khôi phục lại trạng thái ban đầu hoặc dọn dẹp xóa cứng khỏi cơ sở dữ liệu.
          </p>
        </div>
      </div>

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Tổng số bản ghi */}
        <Card
          onClick={handleTotalCardClick}
          className="border-border shadow-xs bg-card hover:border-primary/50 transition-all cursor-pointer group"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tổng số bản ghi trong rác</span>
              <div className="text-2xl font-black text-foreground group-hover:text-primary transition-colors">
                {totalElements} <span className="text-xs font-normal text-muted-foreground">bản ghi</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tất cả thực thể đang lưu trữ trong thùng rác
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Archive className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Quá hạn > 30 ngày (Click to Filter & Scroll) */}
        <Card
          onClick={handleOverdueCardClick}
          className={cn(
            "border-border shadow-xs bg-card hover:border-red-500/50 transition-all cursor-pointer group",
            filterOverdueOnly && "border-red-500 bg-red-500/5 dark:bg-red-500/10"
          )}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Quá hạn &gt; 30 ngày</span>
                {filterOverdueOnly && (
                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Đang lọc</Badge>
                )}
              </div>
              <div className="text-2xl font-black text-red-600 dark:text-red-400 group-hover:scale-105 transition-transform origin-left">
                {overdueCount} <span className="text-xs font-normal text-muted-foreground">bản ghi</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Click để xem &amp; lọc danh sách quá hạn &gt; 30 ngày
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: An toàn để dọn dẹp */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">An toàn để dọn dẹp</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {safeCount} <span className="text-xs font-normal text-muted-foreground">bản ghi</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Bản ghi không chứa dữ liệu con ràng buộc
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Main Content Area */}
      <div ref={tableRef} className="space-y-6">
        <Card className="border-border shadow-sm bg-card overflow-hidden">
          
          {/* Header & Main Actions */}
          <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border/30 bg-card">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight font-heading flex items-center gap-2">
                <span>Danh sách dữ liệu trong thùng rác</span>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">
                Các bản ghi được lưu trữ an toàn trong 30-90 ngày trước khi bị hủy bỏ hoàn toàn.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                onClick={() => fetchTrashData()}
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 font-semibold cursor-pointer border border-border/30 bg-background text-foreground hover:bg-muted"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                <span>Làm mới</span>
              </Button>
            </div>
          </CardHeader>

          {/* Unified Filter Toolbar */}
          <div className="py-3 px-4 bg-muted/20 border-b border-border/30 flex flex-wrap items-end gap-3 w-full">
            {/* Search Keyword Input */}
            <div className="flex flex-col gap-1 flex-1 min-w-50">
              <Label className="text-xs font-semibold text-muted-foreground">Từ khóa tìm kiếm</Label>
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Tìm theo tên, email, ID..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-8 h-9 text-sm border border-border/30 bg-background rounded-lg"
                />
              </div>
            </div>

            {/* Entity Type Filter Dropdown */}
            <div className="flex flex-col gap-1 w-44 shrink-0">
              <Label className="text-xs font-semibold text-muted-foreground">Loại đối tượng</Label>
              <Select
                value={filterEntityType}
                onValueChange={(val) => {
                  setFilterEntityType(val);
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-9 text-sm border border-border/30 bg-background rounded-lg w-full">
                  <SelectValue placeholder="Tất cả loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả đối tượng</SelectItem>
                  <SelectItem value="USER">Tài khoản (User)</SelectItem>
                  <SelectItem value="COURSE">Khóa học (Course)</SelectItem>
                  <SelectItem value="DEPARTMENT">Phòng ban (Department)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Overdue filter check */}
            <div className="flex items-center gap-2 h-9 px-3 border border-border/30 rounded-lg bg-background self-end cursor-pointer select-none" onClick={() => setFilterOverdueOnly(!filterOverdueOnly)}>
              <Checkbox checked={filterOverdueOnly} onCheckedChange={(c) => setFilterOverdueOnly(!!c)} className="h-4 w-4 rounded-md" />
              <span className="text-xs font-bold text-muted-foreground">Chỉ xem quá hạn &gt; 30 ngày</span>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/10 border-b border-primary/20 text-xs animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2 font-bold text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <span>Đã chọn {selectedIds.length} bản ghi</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setActiveModal("BULK_RESTORE")}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục tất cả ({selectedIds.length})
                </Button>
                <Button
                  onClick={() => {
                    setConfirmInput("");
                    setDisclaimerChecked(false);
                    setActiveModal("BULK_HARD_DELETE");
                  }}
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs font-bold gap-1.5 rounded-lg cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Xóa vĩnh viễn tất cả ({selectedIds.length})
                </Button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <CardContent className="p-0 relative min-h-75">
            {loading && (
              <div className="absolute inset-0 bg-background/55 backdrop-blur-xs flex items-center justify-center z-20">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            )}

            <Table containerClassName="max-h-[calc(100vh-280px)] min-h-[300px] overflow-auto border-b border-border/20">
              <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
                <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                  <TableHead className="w-8 pb-4">
                    <Checkbox
                      checked={trashItems.length > 0 && selectedIds.length === trashItems.length}
                      onCheckedChange={(c) => handleSelectAll(!!c)}
                      className="translate-y-0.5 border-border/30"
                    />
                  </TableHead>
                  <TableHead className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Loại đối tượng</TableHead>
                  <TableHead className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thông tin thực thể</TableHead>
                  <TableHead
                    className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-primary cursor-pointer select-none"
                    onClick={() => setSortDir(sortDir === "DESC" ? "ASC" : "DESC")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Thời điểm xóa</span>
                      {sortDir === "DESC" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                    </div>
                  </TableHead>
                  <TableHead className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thời gian lưu</TableHead>
                  <TableHead className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dữ liệu phụ thuộc (FK)</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {trashItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-muted-foreground text-sm">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Archive className="h-10 w-10 text-muted-foreground/60" />
                        <span className="font-bold">Thùng rác trống</span>
                        <span className="text-xs">Không có dữ liệu bị xóa mềm nào khớp với bộ lọc.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  trashItems.map((item) => {
                    const isOverdue = (item.daysInTrash || 0) >= 30;
                    return (
                      <TableRow key={`${item.entityType}-${item.id}`} className="hover:bg-muted/10 transition-colors border-border/30">
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(String(item.id))}
                            onCheckedChange={() => handleSelectOne(String(item.id))}
                            className="translate-y-0.5 border-border/30"
                          />
                        </TableCell>

                        {/* Loại */}
                        <TableCell className="py-3 px-3">
                          {getEntityBadge(item.entityType)}
                        </TableCell>

                        {/* Thông tin */}
                        <TableCell className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground text-xs">{item.name || "N/A"}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{item.email || item.code || `ID: #${item.id}`}</span>
                          </div>
                        </TableCell>

                        {/* Thời điểm xóa */}
                        <TableCell className="py-3 px-3 text-xs font-mono text-muted-foreground">
                          {item.deletedAt ? new Date(item.deletedAt).toLocaleString("vi-VN") : "—"}
                        </TableCell>

                        {/* Thời gian lưu trong rác */}
                        <TableCell className="py-3 px-3">
                          <Badge variant="outline" className={cn("font-mono text-[10px] font-bold", isOverdue ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-muted/40 text-muted-foreground border-border/40")}>
                            <Clock className="h-3 w-3 mr-1" />
                            {item.daysInTrash || 0} ngày
                          </Badge>
                        </TableCell>

                        {/* Ràng buộc FK */}
                        <TableCell className="py-3 px-3">
                          {item.hasChildRecords ? (
                            <Badge
                              onClick={() => handleOpenChildRecordDetails(item)}
                              variant="outline"
                              className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold gap-1 cursor-pointer hover:bg-amber-500/20 transition-colors"
                              title="Click để xem chi tiết danh sách bản ghi con phụ thuộc"
                            >
                              <ShieldAlert className="h-3 w-3" /> Có dữ liệu phụ thuộc (Xem chi tiết)
                            </Badge>
                          ) : (
                            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> An toàn để xóa
                            </span>
                          )}
                        </TableCell>

                        {/* Action buttons */}
                        <TableCell className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              onClick={() => handleOpenDetailModal(item)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:bg-primary/10 cursor-pointer"
                              title="Xem chi tiết bản ghi"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleInitiateSingleRestore(item)}
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-bold gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Khôi phục
                            </Button>
                            <Button
                              onClick={() => handleInitiateSingleHardDelete(item)}
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Xóa cứng
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

          {/* Pagination Footer */}
          <div className="px-5 py-3 border-t border-border/40 bg-card flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium">
            <div className="text-muted-foreground">
              Hiển thị <span className="font-semibold text-foreground">{trashItems.length === 0 ? 0 : page * pageSize + 1}</span> đến{" "}
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
      </div>

      {/* MODALS */}

      {/* 1. Detail Modal */}
      <Dialog open={activeModal === "DETAIL_MODAL"} onOpenChange={() => setActiveModal("NONE")}>
        <DialogContent className="max-w-xl w-full rounded-2xl bg-card p-6 border-border">
          <DialogHeader className="border-b border-border/40 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="h-6 w-6 text-primary shrink-0" />
                <DialogTitle className="text-lg font-extrabold tracking-tight">Chi tiết bản ghi Thùng rác</DialogTitle>
              </div>
              {selectedDetailItem && getEntityBadge(selectedDetailItem.entityType)}
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Xem thông tin chi tiết trước khi quyết định khôi phục hoặc xóa vĩnh viễn khỏi CSDL.
            </DialogDescription>
          </DialogHeader>

          {selectedDetailItem && (
            <div className="space-y-4 my-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 border border-border/30 rounded-xl">
                <div>
                  <span className="text-muted-foreground font-semibold block text-[11px]">Tên bản ghi / Thực thể:</span>
                  <span className="font-bold text-foreground text-sm">{selectedDetailItem.name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold block text-[11px]">Mã định danh (Code / ID):</span>
                  <span className="font-bold text-primary font-mono text-sm">{selectedDetailItem.code || `#${selectedDetailItem.id}`}</span>
                </div>
                {selectedDetailItem.email && (
                  <div>
                    <span className="text-muted-foreground font-semibold block text-[11px]">Email liên hệ:</span>
                    <span className="font-mono text-foreground font-semibold">{selectedDetailItem.email}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground font-semibold block text-[11px]">ID thực thể:</span>
                  <span className="font-mono text-foreground font-semibold">#{selectedDetailItem.id}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 border border-border/30 rounded-xl">
                <div>
                  <span className="text-muted-foreground font-semibold block text-[11px]">Thời điểm chuyển vào thùng rác:</span>
                  <span className="font-mono text-foreground font-semibold flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {selectedDetailItem.deletedAt ? new Date(selectedDetailItem.deletedAt).toLocaleString("vi-VN") : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold block text-[11px]">Số ngày đã nằm trong thùng rác:</span>
                  <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {selectedDetailItem.daysInTrash || 0} ngày
                  </span>
                </div>
              </div>

              {selectedDetailItem.hasChildRecords && selectedDetailItem.childRecordCounts && Object.keys(selectedDetailItem.childRecordCounts).length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-amber-800 dark:text-amber-300">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1 text-[11px]">
                      <Database className="h-3.5 w-3.5 text-amber-600" /> Bản ghi phụ thuộc (Foreign Keys):
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenChildRecordDetails(selectedDetailItem)}
                      className="h-6 text-[10px] font-bold gap-1 border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                    >
                      <Eye className="h-3 w-3" /> Xem danh sách chi tiết các dòng bản ghi
                    </Button>
                  </div>
                  <ul className="list-disc pl-4 text-[11px] font-mono">
                    {Object.entries(selectedDetailItem.childRecordCounts).map(([tbl, cnt]) => (
                      <li key={tbl}>Bảng <strong>{tbl}</strong>: {cnt} bản ghi</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 border-t border-border/40">
            <Button variant="outline" onClick={() => setActiveModal("NONE")} className="font-bold text-xs">Đóng</Button>
            {selectedDetailItem && (
              <>
                <Button
                  onClick={() => {
                    handleInitiateSingleRestore(selectedDetailItem);
                  }}
                  className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục bản ghi
                </Button>
                <Button
                  onClick={() => {
                    handleInitiateSingleHardDelete(selectedDetailItem);
                  }}
                  variant="destructive"
                  className="font-bold text-xs gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Xóa vĩnh viễn
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Single Restore Dialog */}
      <Dialog open={activeModal === "SINGLE_RESTORE"} onOpenChange={() => setActiveModal("NONE")}>
        <DialogContent className="max-w-md w-full rounded-2xl bg-card p-6">
          <DialogHeader>
            <div className="flex items-center gap-3 text-emerald-600 mb-1">
              <RotateCcw className="h-7 w-7 shrink-0" />
              <DialogTitle className="text-lg font-black">Xác nhận khôi phục bản ghi</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              Bạn có chắc chắn muốn khôi phục bản ghi <strong>"{targetItem?.name}"</strong> ({targetItem?.code}) trở lại hệ thống?
              <br />
              Dữ liệu sẽ được khôi phục chính xác về trạng thái tài khoản ban đầu.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setActiveModal("NONE")} className="font-bold text-xs">Hủy bỏ</Button>
            <Button onClick={handleConfirmSingleRestore} className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white">Khôi phục ngay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Bulk Restore Dialog */}
      <Dialog open={activeModal === "BULK_RESTORE"} onOpenChange={() => setActiveModal("NONE")}>
        <DialogContent className="max-w-md w-full rounded-2xl bg-card p-6">
          <DialogHeader>
            <div className="flex items-center gap-3 text-emerald-600 mb-1">
              <RotateCcw className="h-7 w-7 shrink-0" />
              <DialogTitle className="text-lg font-black">Xác nhận khôi phục hàng loạt</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              Bạn đang chuẩn bị khôi phục <strong>{selectedIds.length} bản ghi</strong> đã chọn trở lại hệ thống.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setActiveModal("NONE")} className="font-bold text-xs">Hủy bỏ</Button>
            <Button onClick={handleConfirmBulkRestore} className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white">Đồng ý khôi phục ({selectedIds.length})</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Single Hard Delete Strong Confirmation Modal (with Cascade FK Warning) */}
      <Dialog open={activeModal === "SINGLE_HARD_DELETE"} onOpenChange={() => setActiveModal("NONE")}>
        <DialogContent className="max-w-md w-full rounded-2xl bg-card p-6 border-red-500/30">
          <DialogHeader>
            <div className="flex items-center gap-3 text-red-600 mb-1">
              <Trash2 className="h-8 w-8 shrink-0" />
              <DialogTitle className="text-lg font-black">Cảnh báo XÓA CỨNG VĨNH VIỄN</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              Hành động này sẽ thực thi lệnh <code>DELETE</code> trực tiếp vào CSDL cho bản ghi <strong>"{targetItem?.name}"</strong> ({targetItem?.code}).
              <strong className="text-red-600 font-bold block mt-1">CẢNH BÁO: Không thể khôi phục dữ liệu sau khi xóa!</strong>
            </DialogDescription>
          </DialogHeader>

          {totalFkChildRecords > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-center justify-between gap-1.5 font-bold">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Phát hiện {totalFkChildRecords} bản ghi con phụ thuộc:</span>
                </div>
                {targetItem && (
                  <button
                    onClick={() => handleOpenChildRecordDetails(targetItem)}
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    Xem chi tiết bản ghi con &rarr;
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Khi bạn chấp nhận xóa vĩnh viễn đối tượng này, hệ thống sẽ <strong>XÓA SẠCH</strong> tất cả các bản ghi con ở các bảng sau:
              </p>
              <ul className="list-disc pl-4 text-[11px] font-mono space-y-0.5">
                {Object.entries(fkDetails).map(([tbl, cnt]) => (
                  <li key={tbl}>Bảng <strong>{tbl}</strong>: {cnt} bản ghi</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Nhập mã <code className="bg-muted px-1.5 py-0.5 rounded text-red-600 font-mono">{targetItem?.code || "XOACUNG"}</code> để xác nhận:
              </Label>
              <Input
                type="text"
                placeholder="Nhập mã xác nhận..."
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="h-9 text-xs border border-border/50 font-mono"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs select-none font-bold text-red-600">
              <Checkbox checked={disclaimerChecked} onCheckedChange={(c) => setDisclaimerChecked(!!c)} className="h-4 w-4 rounded" />
              <span>Tôi hiểu và chấp nhận xóa sạch toàn bộ bản ghi này và các bản ghi phụ thuộc.</span>
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActiveModal("NONE")} className="font-bold text-xs">Hủy bỏ</Button>
            <Button
              disabled={!isSingleHardDeleteValid}
              onClick={handleConfirmSingleHardDelete}
              variant="destructive"
              className="font-bold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Chấp nhận xóa tất cả
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Bulk Hard Delete Strong Confirmation Modal */}
      <Dialog open={activeModal === "BULK_HARD_DELETE"} onOpenChange={() => setActiveModal("NONE")}>
        <DialogContent className="max-w-md w-full rounded-2xl bg-card p-6">
          <DialogHeader>
            <div className="flex items-center gap-3 text-red-600 mb-1">
              <ShieldAlert className="h-8 w-8 shrink-0" />
              <DialogTitle className="text-lg font-black">XÁC NHẬN XÓA CỨNG HÀNG LOẠT</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              Bạn đang chuẩn bị xóa vĩnh viễn <strong>{selectedIds.length} bản ghi</strong> khỏi cơ sở dữ liệu (bao gồm tất cả bản ghi con phụ thuộc).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Nhập chữ <code className="bg-muted px-1.5 py-0.5 rounded text-red-600 font-mono">XOACUNG</code> để xác nhận:
              </Label>
              <Input
                type="text"
                placeholder="Nhập XOACUNG..."
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="h-9 text-xs border border-border/50 font-mono"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs select-none font-bold text-red-600">
              <Checkbox checked={disclaimerChecked} onCheckedChange={(c) => setDisclaimerChecked(!!c)} className="h-4 w-4 rounded" />
              <span>Tôi đồng ý chịu trách nhiệm việc hủy hoàn toàn các dữ liệu này.</span>
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActiveModal("NONE")} className="font-bold text-xs">Hủy bỏ</Button>
            <Button
              disabled={!isBulkHardDeleteValid}
              onClick={handleConfirmBulkHardDelete}
              variant="destructive"
              className="font-bold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Xóa vĩnh viễn hàng loạt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Child Record Details Inspection Modal */}
      <Dialog open={childDetailModalOpen} onOpenChange={setChildDetailModalOpen}>
        <DialogContent className="max-w-2xl w-full rounded-2xl bg-card p-6 border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-primary">
              <Database className="h-6 w-6 shrink-0 text-amber-600" />
              <DialogTitle className="text-lg font-black tracking-tight">Chi tiết các Bản ghi con Phụ thuộc (FK)</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Bản ghi gốc: <strong>"{selectedChildItem?.name}"</strong> ({selectedChildItem?.code || `#${selectedChildItem?.id}`})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 relative">
            {childDetailLoading && (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <span className="text-xs font-semibold">Đang truy vấn dữ liệu từ các bảng phụ thuộc...</span>
              </div>
            )}

            {!childDetailLoading && childDetailsList.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
                <Info className="h-8 w-8 text-muted-foreground/60" />
                <span>Không có dữ liệu chi tiết bản ghi con nào được ghi nhận.</span>
              </div>
            )}

            {!childDetailLoading && childDetailsList.map((group) => (
              <div key={group.tableName} className="border border-border/40 rounded-xl overflow-hidden bg-card">
                <div className="bg-muted/30 px-4 py-2 border-b border-border/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">{group.displayName}</span>
                    <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      `{group.tableName}`
                    </span>
                  </div>
                  <Badge variant="outline" className="font-bold text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                    {group.count} bản ghi
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        {group.items.length > 0 && Object.keys(group.items[0]).map((colHeader) => (
                          <TableHead key={colHeader} className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {colHeader}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((row, rIdx) => (
                        <TableRow key={rIdx} className="hover:bg-muted/10 border-border/20">
                          {Object.values(row).map((val, cIdx) => (
                            <TableCell key={cIdx} className="py-2 px-3 font-mono text-[11px] text-foreground">
                              {String(val)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-2 border-t border-border/40">
            <Button variant="outline" onClick={() => setChildDetailModalOpen(false)} className="font-bold text-xs w-full">
              Đóng cửa sổ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
