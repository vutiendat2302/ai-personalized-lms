import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import httpClient from "@/api/httpClient";
import { courseApi } from "@/api/courses/courseApi";
import type { ApiResponse } from "@/types/base";
import { useToast } from "@/hooks/useToast";
import { hrApi, type HrOneOnOneRequestResponse } from "@/api/hr/hrApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OneOnOneConnectionApprovalTab } from "@/components/admin/approval/OneOnOneConnectionApprovalTab";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ArrowDownUp, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, FileCheck2, Loader2, RefreshCw, Search, Trash2, XCircle } from "lucide-react";

type ApprovalStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
interface ApprovalItem {
  id: string;
  targetType: string;
  targetId: string;
  approverId?: string;
  approverName?: string;
  requesterId?: string;
  requesterName?: string;
  requesterEmail?: string;
  status: ApprovalStatus;
  comment?: string;
  requestReason?: string;
  createdAt?: string;
  decidedAt?: string;
  level?: number;
  totalLevels?: number;
  assignedToMe: boolean;
  title?: string;
  description?: string;
  categoryName?: string;
  suggestedPrice?: number;
}

interface MineResponse { requested?: Record<string, unknown>[]; toApprove?: Record<string, unknown>[] }

const TYPE_LABELS: Record<string, string> = {
  CONTRACT: "Hợp đồng", SALARY: "Phiếu lương", TEACHING_PAYMENT: "Thanh toán buổi dạy", LEAVE_REQUEST: "Đơn nghỉ phép",
  HALF_DAY_LEAVE: "Nghỉ nửa buổi", RESIGNATION: "Nghỉ việc", CLASS_TRANSFER_REQUEST: "Chuyển lớp",
  TEACHER_CHANGE_REQUEST: "Đổi giáo viên", CLASS_TEACHER_LEAVE_REQUEST: "Giáo viên xin nghỉ dạy", PENDING_MATCHING: "Chờ ghép giáo viên", REFUND_ORDER: "Hoàn tiền đơn hàng", COURSE: "Duyệt khóa học",
};
const dateTime = (value?: string) => value ? new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";
const normalize = (raw: Record<string, unknown>, assignedToMe: boolean): ApprovalItem => ({
  id: String(raw.id), targetType: String(raw.targetType || "UNKNOWN"), targetId: String(raw.targetId),
  approverId: raw.approverId == null ? undefined : String(raw.approverId), approverName: String(raw.approverName || "Chưa xác định"),
  requesterId: raw.createdBy == null ? undefined : String(raw.createdBy), requesterName: String(raw.requesterName || "Chưa xác định"),
  requesterEmail: raw.requesterEmail ? String(raw.requesterEmail) : undefined, status: String(raw.status || "PENDING") as ApprovalStatus,
  comment: raw.comment ? String(raw.comment) : undefined, requestReason: raw.requestReason ? String(raw.requestReason) : undefined, createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
  decidedAt: raw.decidedAt ? String(raw.decidedAt) : undefined, level: Number(raw.level || 1), totalLevels: Number(raw.totalLevels || 1), assignedToMe,
});

export const ApprovalCenterPage: React.FC = () => {
  const { success, error } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const restoredView = (location.state as { approvalView?: { sectionTab?: "CONNECTIONS" | "COURSES"; tab?: "PENDING" | "ALL"; search?: string; status?: string; page?: number } } | null)?.approvalView;
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sectionTab, setSectionTab] = useState<"CONNECTIONS" | "COURSES">(restoredView?.sectionTab ?? "CONNECTIONS");
  const [tab, setTab] = useState<"PENDING" | "ALL">(restoredView?.tab || "PENDING");
  const [search, setSearch] = useState(restoredView?.search || "");
  const [status, setStatus] = useState(restoredView?.status || "ALL");
  const [dateSort, setDateSort] = useState<"DESC" | "ASC">("DESC");
  const [page, setPage] = useState(restoredView?.page || 0);
  const [detail, setDetail] = useState<ApprovalItem | null>(null);
  const [approveTarget, setApproveTarget] = useState<ApprovalItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApprovalItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [oneOnOneRequests, setOneOnOneRequests] = useState<HrOneOnOneRequestResponse[]>([]);
  const [targetDetails, setTargetDetails] = useState<Record<string, unknown> | null>(null);
  const filtersMounted = useRef(false);
  const pageSize = 10;

  const load = async () => {
    setLoading(true); setLoadError("");
    try {
      const [response, pendingCourses, oneOnOneResponse] = await Promise.all([
        httpClient.get<ApiResponse<MineResponse>>("/v1/approvals/mine"),
        courseApi.searchCourses({ status: "PENDING", page: 0, size: 100, sortBy: "createdAt", sortDirection: "ASC" }),
        hrApi.getOneOnOneRequests(),
      ]);
      setOneOnOneRequests((oneOnOneResponse.data.data || []).map(item => ({
        ...item,
        id: String(item.id),
      })));
      const requested = (response.data.data?.requested || []).map(raw => normalize(raw, false));
      const assigned = (response.data.data?.toApprove || []).map(raw => normalize(raw, true));
      const unique = new Map<string, ApprovalItem>();
      [...requested, ...assigned].forEach(item => unique.set(item.id, { ...unique.get(item.id), ...item }));
      (pendingCourses.data?.data?.content || []).forEach((course: any) => unique.set(`COURSE-${String(course.id)}`, {
        id: `COURSE-${String(course.id)}`, targetType: "COURSE", targetId: String(course.id), status: "PENDING",
        requesterId: course.createdBy == null ? undefined : String(course.createdBy), requesterName: course.teacherName || course.authorName || "Người tạo khóa học",
        approverName: "HR / Admin", createdAt: course.createdAt, level: 1, totalLevels: 1, assignedToMe: true,
        title: course.name, description: course.description, categoryName: course.categoryName || course.category?.name,
        suggestedPrice: Number(course.suggestedPrice || 0),
      }));
      const nextItems = [...unique.values()].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setItems(nextItems);
      setSelectedIds([]);
    } catch (cause: any) {
      const message = cause?.response?.data?.message || "Không tải được dữ liệu phê duyệt.";
      setLoadError(message); error(message);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!detail) { setTargetDetails(null); return; }
    let active = true; setDetailLoading(true);
    if (detail.targetType !== "COURSE") {
      const endpoint: Record<string, string> = { CONTRACT: "/v1/employee-contracts", SALARY: "/v1/salaries", TEACHING_PAYMENT: "/v1/teaching-session-payments", LEAVE_REQUEST: "/v1/leave-requests" };
      if (!endpoint[detail.targetType]) { setTargetDetails(null); setDetailLoading(false); return; }
      httpClient.get<ApiResponse<Record<string, unknown>>>(`${endpoint[detail.targetType]}/${detail.targetId}`)
        .then(response => active && setTargetDetails(response.data.data || null))
        .catch((cause: any) => error(cause?.response?.data?.message || "Không tải được đối tượng cần duyệt."))
        .finally(() => active && setDetailLoading(false));
      return () => { active = false; };
    }
    setTargetDetails(null);
    courseApi.getCourseById(detail.targetId).then((courseResult) => {
      if (!active) return;
      const course: any = courseResult.data.data;
      setDetail(current => current ? { ...current, title: course.name, description: course.description,
        categoryName: course.categoryName || course.category?.name, suggestedPrice: Number(course.suggestedPrice || 0),
        comment: course.rejectionReason || current.comment } : current);
    }).catch((cause: any) => error(cause?.response?.data?.message || "Không tải được phiên bản khóa học cần duyệt."))
      .finally(() => active && setDetailLoading(false));
    return () => { active = false; };
  }, [detail?.id]);

  const filtered = useMemo(() => items.filter(item => {
    if (item.targetType !== "COURSE") return false;
    if (tab === "PENDING" && (!item.assignedToMe || item.status !== "PENDING")) return false;
    if (status !== "ALL" && item.status !== status) return false;
    const key = search.trim().toLocaleLowerCase("vi");
    return !key || [item.id, item.targetId, item.requesterName, item.requesterEmail, item.approverName, TYPE_LABELS[item.targetType]]
      .some(value => value?.toLocaleLowerCase("vi").includes(key));
  }).sort((a, b) => {
    const delta = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    return dateSort === "ASC" ? delta : -delta;
  }), [items, tab, status, search, dateSort]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice(page * pageSize, page * pageSize + pageSize);
  useEffect(() => {
    if (!filtersMounted.current) { filtersMounted.current = true; return; }
    setPage(0);
  }, [tab, status, search, dateSort]);
  const canSelectItem = (item: ApprovalItem) => (item.assignedToMe && item.status === "PENDING")
    || (tab === "ALL" && item.status === "CONFIRMED" && !item.id.startsWith("COURSE-"));
  const selectableVisible = visible.filter(canSelectItem);
  const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every(item => selectedIds.includes(item.id));
  const selectedItems = items.filter(item => selectedIds.includes(item.id) && item.status === "PENDING");
  const selectedApprovedItems = items.filter(item => selectedIds.includes(item.id) && item.status === "CONFIRMED" && !item.id.startsWith("COURSE-"));
  const displayTitle = (item: ApprovalItem) => item.title || TYPE_LABELS[item.targetType] || "Yêu cầu nghiệp vụ";
  const summary = useMemo(() => ({
    pending: items.filter(item => item.targetType === "COURSE" && item.status === "PENDING").length,
    approved: items.filter(item => item.targetType === "COURSE" && item.status === "CONFIRMED").length,
    rejected: items.filter(item => item.targetType === "COURSE" && item.status === "REJECTED").length,
  }), [items]);

  /** Đồng bộ một yêu cầu kết nối sau khi HR duyệt hoặc từ chối. */
  const updateOneOnOneRequest = (updated: HrOneOnOneRequestResponse) => {
    setOneOnOneRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
  };
  const markItemsResolved = (ids: string[], nextStatus: "CONFIRMED" | "REJECTED", comment?: string) => {
    const decidedAt = new Date().toISOString();
    setItems(current => current.map(item => ids.includes(item.id)
      ? { ...item, status: nextStatus, comment: comment || item.comment, decidedAt }
      : item));
    setSelectedIds(current => current.filter(id => !ids.includes(id)));
  };

  const approveOne = async (item: ApprovalItem) => {
    if (item.targetType === "COURSE") await courseApi.approveCourse(item.targetId, true);
    else await httpClient.post(`/v1/approvals/${item.id}/approve`, { comment: "" });
  };
  const rejectOne = async (item: ApprovalItem, reason: string) => {
    if (item.targetType === "COURSE") await courseApi.approveCourse(item.targetId, false, reason);
    else await httpClient.post(`/v1/approvals/${item.id}/reject`, { comment: reason });
  };

  const approve = async () => {
    if (!approveTarget) return; setBusy(true);
    try {
      await approveOne(approveTarget);
      markItemsResolved([approveTarget.id], "CONFIRMED");
      success("Phê duyệt thành công; người tạo đã nhận thông báo hệ thống."); setApproveTarget(null); setDetail(null); await load();
    } catch (cause: any) { error(cause?.response?.data?.message || "Không thể phê duyệt yêu cầu."); }
    finally { setBusy(false); }
  };
  const reject = async () => {
    const reason = rejectReason.trim();
    if (!rejectTarget || reason.length < 5) { error("Lý do từ chối phải có ít nhất 5 ký tự."); return; }
    setBusy(true);
    try {
      await rejectOne(rejectTarget, reason);
      markItemsResolved([rejectTarget.id], "REJECTED", reason);
      success("Đã từ chối yêu cầu; người tạo đã nhận lý do qua thông báo hệ thống.");
      setRejectTarget(null); setRejectReason(""); setDetail(null); await load();
    } catch (cause: any) { error(cause?.response?.data?.message || "Không thể từ chối yêu cầu."); }
    finally { setBusy(false); }
  };

  const bulkApprove = async () => {
    if (!selectedItems.length) return; setBusy(true);
    const results = await Promise.allSettled(selectedItems.map(approveOne));
    const completed = results.filter(result => result.status === "fulfilled").length;
    const failed = results.length - completed;
    if (completed) success(`Đã duyệt thành công ${completed} yêu cầu.`);
    const completedIds = results.flatMap((result, index) => result.status === "fulfilled" ? [selectedItems[index].id] : []);
    if (completedIds.length) markItemsResolved(completedIds, "CONFIRMED");
    if (failed) error(`${failed} yêu cầu không thể duyệt; dữ liệu đã được tải lại.`);
    setBulkApproveOpen(false); await load(); setBusy(false);
  };
  const bulkReject = async () => {
    const reason = rejectReason.trim();
    if (!selectedItems.length || reason.length < 5) { error("Lý do từ chối phải có ít nhất 5 ký tự."); return; }
    setBusy(true);
    const results = await Promise.allSettled(selectedItems.map(item => rejectOne(item, reason)));
    const completed = results.filter(result => result.status === "fulfilled").length;
    const failed = results.length - completed;
    if (completed) success(`Đã từ chối ${completed} yêu cầu và gửi thông báo cho người tạo.`);
    const completedIds = results.flatMap((result, index) => result.status === "fulfilled" ? [selectedItems[index].id] : []);
    if (completedIds.length) markItemsResolved(completedIds, "REJECTED", reason);
    if (failed) error(`${failed} yêu cầu không thể từ chối; dữ liệu đã được tải lại.`);
    setBulkRejectOpen(false); setRejectReason(""); await load(); setBusy(false);
  };
  const deleteApproved = async (targets: ApprovalItem[]) => {
    if (!targets.length) return;
    setBusy(true);
    const results = await Promise.allSettled(targets.map(item => httpClient.delete(`/v1/approvals/${item.id}`)));
    const deletedIds = results.flatMap((result, index) => result.status === "fulfilled" ? [targets[index].id] : []);
    const failed = results.length - deletedIds.length;
    if (deletedIds.length) {
      setItems(current => current.filter(item => !deletedIds.includes(item.id)));
      setSelectedIds(current => current.filter(id => !deletedIds.includes(id)));
      success(`Đã xóa ${deletedIds.length} yêu cầu đã phê duyệt.`);
    }
    if (failed) error(`${failed} yêu cầu không thể xóa.`);
    setDeleteTarget(null); setBulkDeleteOpen(false); setBusy(false);
  };

  const statusBadge = (value: ApprovalStatus) => value === "PENDING"
    ? <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/10"><Clock3 className="mr-1 h-3 w-3" />Chờ duyệt</Badge>
    : value === "CONFIRMED" ? <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10"><CheckCircle2 className="mr-1 h-3 w-3" />Đã duyệt</Badge>
    : <Badge className="bg-rose-500/10 text-rose-700 hover:bg-rose-500/10"><XCircle className="mr-1 h-3 w-3" />{value === "REJECTED" ? "Từ chối" : "Đã hủy"}</Badge>;

  return <div className="mx-auto max-w-375 space-y-5 p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><FileCheck2 className="h-6 w-6 text-primary" />Trung tâm phê duyệt</h1><p className="mt-1 text-xs text-muted-foreground">Phê duyệt kết nối 1-1 và khóa học được tách thành hai hàng đợi độc lập.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Làm mới</Button></div>
    <Tabs value={sectionTab} onValueChange={(value) => { setSectionTab(value as "CONNECTIONS" | "COURSES"); }} className="space-y-4">
      <TabsList className="h-10 w-full justify-start sm:w-auto">
        <TabsTrigger value="CONNECTIONS" className="px-4">Phê duyệt kết nối</TabsTrigger>
        <TabsTrigger value="COURSES" className="px-4">Phê duyệt khóa học</TabsTrigger>
      </TabsList>
      <TabsContent value="CONNECTIONS">
        <OneOnOneConnectionApprovalTab
          requests={oneOnOneRequests}
          loading={loading}
          onRequestUpdated={updateOneOnOneRequest}
        />
      </TabsContent>
      <TabsContent value="COURSES" className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <Card role="button" tabIndex={0} onClick={() => { setTab("PENDING"); setStatus("ALL"); }} className="cursor-pointer overflow-hidden border-amber-200/70 transition-all hover:-translate-y-0.5 hover:shadow-md"><CardContent className="flex items-center justify-between bg-linear-to-br from-amber-50 to-background p-5"><div><p className="text-xs font-semibold text-amber-800">Cần xử lý</p><p className="mt-1 text-3xl font-bold tracking-tight text-amber-600">{summary.pending}</p><p className="mt-1 text-[11px] text-muted-foreground">Yêu cầu đang chờ quyết định</p></div><div className="rounded-2xl bg-amber-100 p-3 text-amber-700"><Clock3 className="h-6 w-6" /></div></CardContent></Card>
      <Card role="button" tabIndex={0} onClick={() => { setTab("ALL"); setStatus("CONFIRMED"); }} className="cursor-pointer overflow-hidden border-emerald-200/70 transition-all hover:-translate-y-0.5 hover:shadow-md"><CardContent className="flex items-center justify-between bg-linear-to-br from-emerald-50 to-background p-5"><div><p className="text-xs font-semibold text-emerald-800">Đã phê duyệt</p><p className="mt-1 text-3xl font-bold tracking-tight text-emerald-600">{summary.approved}</p><p className="mt-1 text-[11px] text-muted-foreground">Đã hoàn tất xử lý thành công</p></div><div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700"><CheckCircle2 className="h-6 w-6" /></div></CardContent></Card>
      <Card role="button" tabIndex={0} onClick={() => { setTab("ALL"); setStatus("REJECTED"); }} className="cursor-pointer overflow-hidden border-rose-200/70 transition-all hover:-translate-y-0.5 hover:shadow-md"><CardContent className="flex items-center justify-between bg-linear-to-br from-rose-50 to-background p-5"><div><p className="text-xs font-semibold text-rose-800">Đã từ chối</p><p className="mt-1 text-3xl font-bold tracking-tight text-rose-600">{summary.rejected}</p><p className="mt-1 text-[11px] text-muted-foreground">Yêu cầu không được chấp thuận</p></div><div className="rounded-2xl bg-rose-100 p-3 text-rose-700"><XCircle className="h-6 w-6" /></div></CardContent></Card>
    </div>
    <Card><CardHeader className="pb-3"><div className="flex gap-5 border-b"><button className={`pb-3 text-sm font-bold ${tab === "PENDING" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`} onClick={() => setTab("PENDING")}>Khóa học chờ duyệt</button><button className={`pb-3 text-sm font-bold ${tab === "ALL" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`} onClick={() => setTab("ALL")}>Lịch sử duyệt khóa học</button></div></CardHeader><CardContent className="space-y-4">
      <div className="grid gap-2 md:grid-cols-[1fr_170px_190px]"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên khóa học, người gửi..." /></div><Select value={status} onValueChange={setStatus} disabled={tab === "PENDING"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Tất cả trạng thái</SelectItem><SelectItem value="PENDING">Chờ duyệt</SelectItem><SelectItem value="CONFIRMED">Đã duyệt</SelectItem><SelectItem value="REJECTED">Từ chối</SelectItem><SelectItem value="CANCELLED">Đã hủy</SelectItem></SelectContent></Select><Select value={dateSort} onValueChange={value => setDateSort(value as "DESC" | "ASC")}><SelectTrigger><ArrowDownUp className="mr-2 h-4 w-4 text-muted-foreground" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DESC">Ngày gửi: Mới nhất</SelectItem><SelectItem value="ASC">Ngày gửi: Cũ nhất</SelectItem></SelectContent></Select></div>
      {!loading && selectableVisible.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3"><label className="flex cursor-pointer items-center gap-2 text-xs font-semibold"><Checkbox checked={allVisibleSelected} onCheckedChange={checked => setSelectedIds(current => checked ? [...new Set([...current, ...selectableVisible.map(item => item.id)])] : current.filter(id => !selectableVisible.some(item => item.id === id)))} />Chọn các yêu cầu có thể xử lý trên trang</label><div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Đã chọn <strong className="text-foreground">{selectedItems.length + selectedApprovedItems.length}</strong></span>{selectedIds.length > 0 && <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>Bỏ chọn</Button>}{selectedItems.length > 0 && <><Button size="sm" variant="destructive" onClick={() => { setRejectReason(""); setBulkRejectOpen(true); }}>Từ chối {selectedItems.length} yêu cầu</Button>{tab === "PENDING" && <Button size="sm" onClick={() => setBulkApproveOpen(true)}><CheckCircle2 className="mr-1.5 h-4 w-4" />Duyệt hàng loạt</Button>}</>}{selectedApprovedItems.length > 0 && <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}><Trash2 className="mr-1.5 h-4 w-4" />Xóa {selectedApprovedItems.length} yêu cầu đã duyệt</Button>}</div></div>}
      {loading ? <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Đang tải khóa học cần phê duyệt...</div> : loadError ? <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-destructive"><AlertTriangle className="h-7 w-7" />{loadError}<Button variant="outline" onClick={() => void load()}>Thử lại</Button></div> : !visible.length ? <div className="flex h-64 flex-col items-center justify-center text-center"><FileCheck2 className="mb-3 h-10 w-10 text-muted-foreground/40" /><p className="font-semibold">Không có khóa học cần phê duyệt</p><p className="mt-1 text-xs text-muted-foreground">Không có khóa học phù hợp với bộ lọc hiện tại.</p></div> : tab === "PENDING" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map(item => <Card key={item.id} className="group overflow-hidden border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
            <CardContent className="p-0">
              <div className="flex items-start gap-3 border-b bg-linear-to-r from-primary/6 to-transparent p-4">
                {item.assignedToMe && <Checkbox className="mt-1" checked={selectedIds.includes(item.id)} onCheckedChange={checked => setSelectedIds(current => checked ? [...new Set([...current, item.id])] : current.filter(id => id !== item.id))} aria-label={`Chọn ${displayTitle(item)}`} />}
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="bg-background text-[10px]">{TYPE_LABELS[item.targetType] || item.targetType}</Badge>{item.categoryName && <span className="text-[11px] text-muted-foreground">{item.categoryName}</span>}</div><h3 className="mt-2 line-clamp-2 text-sm font-bold leading-5">{displayTitle(item)}</h3></div>
                {statusBadge(item.status)}
              </div>
              <div className="space-y-3 p-4">
                {item.description && <p className="line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">{item.description}</p>}
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/35 p-3 text-xs"><div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Người gửi</p><p className="mt-1 truncate font-semibold">{item.requesterName || "Chưa xác định"}</p></div><div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Thời gian gửi</p><p className="mt-1 font-semibold">{dateTime(item.createdAt)}</p></div></div>
                <div className="flex flex-wrap items-center justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setDetail(item)}><Eye className="mr-1.5 h-4 w-4" />Xem chi tiết</Button>{item.assignedToMe && <><Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => { setRejectTarget(item); setRejectReason(""); }}>Từ chối</Button><Button size="sm" onClick={() => setApproveTarget(item)}><CheckCircle2 className="mr-1.5 h-4 w-4" />Phê duyệt</Button></>}</div>
              </div>
            </CardContent>
          </Card>)}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3"><div><p className="text-sm font-bold">Lịch sử yêu cầu</p><p className="text-[11px] text-muted-foreground">Hiển thị {visible.length} trên tổng số {filtered.length} yêu cầu phù hợp</p></div>{status !== "ALL" && <Button size="sm" variant="ghost" onClick={() => setStatus("ALL")}><XCircle className="mr-1.5 h-4 w-4" />Bỏ lọc trạng thái</Button>}</div>
          <div className="max-w-full overflow-x-auto"><Table>
            <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur"><TableRow className="hover:bg-transparent"><TableHead className="w-11"><Checkbox checked={allVisibleSelected} onCheckedChange={checked => setSelectedIds(current => checked ? [...new Set([...current, ...selectableVisible.map(item => item.id)])] : current.filter(id => !selectableVisible.some(item => item.id === id)))} aria-label="Chọn tất cả yêu cầu có thể xử lý" /></TableHead><TableHead className="min-w-70 font-bold text-slate-700">Nội dung yêu cầu</TableHead><TableHead className="min-w-47.5 font-bold text-slate-700">Người gửi</TableHead><TableHead className="min-w-32.5 font-bold text-slate-700">Ngày gửi</TableHead><TableHead className="min-w-30 font-bold text-slate-700">Trạng thái</TableHead><TableHead className="min-w-32.5 font-bold text-slate-700">Ngày xử lý</TableHead><TableHead className="min-w-37.5 font-bold text-slate-700">Người xử lý</TableHead><TableHead className="text-right font-bold text-slate-700">Thao tác</TableHead></TableRow></TableHeader>
            <TableBody>{visible.map((item, index) => <TableRow key={item.id} className={`${index % 2 ? "bg-slate-50/35" : "bg-background"} transition-colors hover:bg-primary/4`}><TableCell>{canSelectItem(item) ? <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={checked => setSelectedIds(current => checked ? [...new Set([...current, item.id])] : current.filter(id => id !== item.id))} aria-label={`Chọn ${displayTitle(item)}`} /> : <Checkbox disabled aria-label="Yêu cầu không có thao tác hàng loạt phù hợp" />}</TableCell><TableCell><div className="flex items-start gap-3"><div className={`mt-0.5 h-9 w-1 shrink-0 rounded-full ${item.status === "PENDING" ? "bg-amber-400" : item.status === "CONFIRMED" ? "bg-emerald-500" : "bg-rose-500"}`} /><div><p className="line-clamp-1 font-semibold text-slate-900">{displayTitle(item)}</p><div className="mt-1.5 flex flex-wrap items-center gap-1.5"><Badge variant="outline" className="bg-white text-[10px]">{TYPE_LABELS[item.targetType] || item.targetType}</Badge>{item.categoryName && <span className="text-[11px] text-muted-foreground">{item.categoryName}</span>}</div></div></div></TableCell><TableCell><p className="font-medium text-slate-800">{item.requesterName || "Chưa xác định"}</p>{item.requesterEmail && <p className="mt-0.5 max-w-47.5 truncate text-[11px] text-muted-foreground">{item.requesterEmail}</p>}</TableCell><TableCell className="whitespace-nowrap text-xs text-slate-600">{dateTime(item.createdAt)}</TableCell><TableCell>{statusBadge(item.status)}</TableCell><TableCell className="whitespace-nowrap text-xs text-slate-600">{item.decidedAt ? dateTime(item.decidedAt) : <span className="text-muted-foreground">Chưa xử lý</span>}</TableCell><TableCell className="text-xs font-medium text-slate-700">{item.targetType === "COURSE" && !item.approverName ? "HR / Admin" : item.approverName || "—"}</TableCell><TableCell><div className="flex justify-end gap-1"><Button size="sm" variant="outline" className="h-8 shadow-none" onClick={() => setDetail(item)}><Eye className="mr-1.5 h-3.5 w-3.5" />Xem</Button>{item.status === "CONFIRMED" && !item.id.startsWith("COURSE-") && <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setDeleteTarget(item)} title="Xóa yêu cầu đã phê duyệt"><Trash2 className="h-4 w-4" /></Button>}</div></TableCell></TableRow>)}</TableBody>
          </Table></div>
        </div>
      )}
      {!loading && filtered.length > pageSize && <div className="flex items-center justify-end gap-2"><Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button><span className="text-xs">Trang {page + 1}/{pages}</span><Button size="icon" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button></div>}
    </CardContent></Card>
      </TabsContent>
    </Tabs>
    <Dialog open={Boolean(detail)} onOpenChange={open => !open && setDetail(null)}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{detail?.title || `Chi tiết ${TYPE_LABELS[detail?.targetType || ""] || "yêu cầu"}`}</DialogTitle><DialogDescription>Phiên bản dữ liệu thực tế được gửi lên để HR/Admin thẩm định.</DialogDescription></DialogHeader>{detail && <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between rounded-xl bg-muted/30 p-4"><div><p className="text-xs text-muted-foreground">Loại yêu cầu</p><p className="font-bold">{TYPE_LABELS[detail.targetType] || detail.targetType}</p></div>{statusBadge(detail.status)}</div>
      {detailLoading ? <div className="flex h-36 items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Đang tải thông tin khóa học...</div> : detail.targetType === "COURSE" && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-primary/5 p-4"><div><p className="font-bold">{detail.title || "Khóa học cần duyệt"}</p><p className="mt-1 text-xs text-muted-foreground">{detail.categoryName || "Chưa phân loại"} · Giá đề xuất {Number(detail.suggestedPrice || 0).toLocaleString("vi-VN")} đ</p></div><Button type="button" onClick={() => navigate(`/admin/courses/${detail.targetId}`, { state: { returnTo: `${location.pathname}${location.search}`, returnLabel: "Hàng đợi yêu cầu xử lý", approvalView: { sectionTab, tab, search, status, page } } })}><Eye className="mr-1.5 h-4 w-4" />Xem chi tiết khóa học</Button></div>}
      {!detailLoading && targetDetails && <div className="rounded-xl border p-4"><p className="mb-3 text-xs font-bold uppercase text-muted-foreground">Phiên bản đối tượng cần duyệt</p><div className="grid gap-2 sm:grid-cols-2">{Object.entries(targetDetails).filter(([, value]) => value == null || ["string", "number", "boolean"].includes(typeof value)).slice(0, 18).map(([key, value]) => <div key={key} className="rounded-lg bg-muted/30 p-3"><p className="text-[10px] uppercase text-muted-foreground">{key.replace(/([A-Z])/g, " $1").trim()}</p><p className="mt-1 wrap-break-word font-semibold">{value == null || value === "" ? "Chưa cập nhật" : String(value)}</p></div>)}</div></div>}
      <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Người gửi</p><p className="font-bold">{detail.requesterName}</p><p className="text-xs text-muted-foreground">{detail.requesterEmail || "Chưa có email"}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Thời gian</p><p>Gửi: <strong>{dateTime(detail.createdAt)}</strong></p><p>Xử lý: <strong>{dateTime(detail.decidedAt)}</strong></p></div></div>
      {detail.requestReason && <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4"><p className="text-xs font-bold text-muted-foreground">Lý do hoàn tiền từ học viên</p><p className="mt-1">{detail.requestReason}</p></div>}
      {detail.comment && <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"><p className="text-xs font-bold text-muted-foreground">Ghi chú / lý do xử lý</p><p className="mt-1">{detail.comment}</p></div>}
      <details className="rounded-lg border p-3 text-xs"><summary className="cursor-pointer font-semibold">Thông tin kỹ thuật</summary><div className="mt-2 space-y-1 font-mono text-muted-foreground"><p>Mã yêu cầu: {detail.id}</p><p>Mã đối tượng: {detail.targetId}</p><p>Người duyệt ID: {detail.approverId || "—"}</p></div></details>
      <DialogFooter>{detail.assignedToMe && detail.status === "PENDING" && <><Button variant="destructive" onClick={() => { setRejectTarget(detail); setRejectReason(""); }}>Từ chối</Button><Button onClick={() => setApproveTarget(detail)}>Phê duyệt</Button></>}</DialogFooter>
    </div>}</DialogContent></Dialog>
    <Dialog open={Boolean(rejectTarget)} onOpenChange={open => { if (!open) { setRejectTarget(null); setRejectReason(""); } }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Từ chối yêu cầu</DialogTitle><DialogDescription>Vui lòng nhập lý do rõ ràng. Nội dung này sẽ được gửi qua thông báo hệ thống cho người tạo.</DialogDescription></DialogHeader><Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Nhập lý do từ chối (tối thiểu 5 ký tự)..." rows={5} maxLength={1000} /><p className="text-right text-xs text-muted-foreground">{rejectReason.trim().length}/1000</p><DialogFooter><Button variant="outline" onClick={() => setRejectTarget(null)} disabled={busy}>Hủy</Button><Button variant="destructive" onClick={() => void reject()} disabled={busy || rejectReason.trim().length < 5}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Xác nhận từ chối</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={bulkRejectOpen} onOpenChange={open => { setBulkRejectOpen(open); if (!open) setRejectReason(""); }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Từ chối {selectedItems.length} yêu cầu</DialogTitle><DialogDescription>Lý do sẽ được gửi qua thông báo hệ thống tới từng người tạo yêu cầu.</DialogDescription></DialogHeader><Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Nhập lý do từ chối chung (tối thiểu 5 ký tự)..." rows={5} maxLength={1000} /><p className="text-right text-xs text-muted-foreground">{rejectReason.trim().length}/1000</p><DialogFooter><Button variant="outline" onClick={() => setBulkRejectOpen(false)} disabled={busy}>Hủy</Button><Button variant="destructive" onClick={() => void bulkReject()} disabled={busy || rejectReason.trim().length < 5}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Từ chối {selectedItems.length} yêu cầu</Button></DialogFooter></DialogContent></Dialog>
    <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={open => !open && setDeleteTarget(null)} title="Xóa yêu cầu đã phê duyệt" description="Thao tác này chỉ xóa bản ghi lịch sử phê duyệt, không xóa đối tượng nghiệp vụ đã được duyệt." confirmText="Xóa yêu cầu" variant="destructive" loading={busy} onConfirm={() => deleteTarget ? deleteApproved([deleteTarget]) : undefined} />
    <ConfirmDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen} title="Xóa hàng loạt yêu cầu đã phê duyệt" description={`Xác nhận xóa ${selectedApprovedItems.length} bản ghi lịch sử đã chọn? Các đối tượng nghiệp vụ gốc không bị xóa.`} confirmText={`Xóa ${selectedApprovedItems.length} yêu cầu`} variant="destructive" loading={busy} onConfirm={() => deleteApproved(selectedApprovedItems)} />
    <ConfirmDialog open={bulkApproveOpen} onOpenChange={setBulkApproveOpen} title="Duyệt hàng loạt" description={`Xác nhận phê duyệt ${selectedItems.length} yêu cầu đã chọn? Mỗi nghiệp vụ sẽ được cập nhật và người tạo sẽ nhận thông báo hệ thống.`} confirmText={`Duyệt ${selectedItems.length} yêu cầu`} variant="default" loading={busy} onConfirm={bulkApprove} />
    <ConfirmDialog open={Boolean(approveTarget)} onOpenChange={open => !open && setApproveTarget(null)} title="Phê duyệt yêu cầu" description={`Xác nhận phê duyệt ${TYPE_LABELS[approveTarget?.targetType || ""] || "yêu cầu"} #${approveTarget?.targetId || ""}? Trạng thái đối tượng sẽ được cập nhật theo quy trình.`} confirmText="Phê duyệt" variant="default" loading={busy} onConfirm={approve} />
  </div>;
};

export default ApprovalCenterPage;
