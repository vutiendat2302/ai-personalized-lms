import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock, Columns3,
  ExternalLink, GraduationCap, List, Loader2, Pencil, Save, Search, Trash2, UserRoundCheck, Users, X,
} from "lucide-react";

type ViewMode = "WEEK" | "DAY" | "MONTH" | "LIST";
type TeachingRole = "TEACHER" | "TA";

interface TeachingResource {
  userId: string;
  fullName?: string;
  email?: string;
  role: TeachingRole;
}

interface TeachingScheduleEvent {
  id: string;
  classId: string;
  className?: string;
  courseName?: string;
  title?: string;
  startAt: string;
  endAt: string;
  status?: string;
  deliveryMode?: string;
  meetingUrl?: string;
  resources: TeachingResource[];
  students: {
    userId: string;
    fullName?: string;
    email?: string;
    phone?: string;
    joinedAt?: string;
  }[];
}

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const startOfWeek = (date: Date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
};
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
const timeText = (value: string) => new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
const dateText = (value: Date | string) => new Date(value).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
const toLocalDateTimeValue = (value: string) => {
  const date = new Date(value);
  return `${dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const durationMinutes = (event: TeachingScheduleEvent) => Math.max(15,
  Math.round((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 60000));

interface ScheduleEditForm {
  title: string;
  scheduledAt: string;
  durationMin: string;
  meetingUrl: string;
  status: string;
}

interface QuickStaffProfile {
  id: string;
  fullName?: string;
  email?: string;
  userEmail?: string;
  phone?: string;
  avatarUrl?: string;
  employeeCode?: string;
  departmentName?: string;
  position?: string;
  status?: string;
  roles?: string[];
}

interface WorkScheduleManagementProps {
  title?: string;
  description?: string;
}

export const WorkScheduleManagement: React.FC<WorkScheduleManagementProps> = ({
  title = "Lịch giảng dạy Teacher & TA",
  description = "Chỉ hiển thị buổi dạy thực tế; nhân viên hành chính full-time không thuộc phạm vi màn này.",
}) => {
  const { error, success } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("WEEK");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [events, setEvents] = useState<TeachingScheduleEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | TeachingRole>("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [conflictOnly, setConflictOnly] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TeachingScheduleEvent | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState<ScheduleEditForm | null>(null);
  const [quickProfile, setQuickProfile] = useState<QuickStaffProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const visibleRange = useMemo(() => {
    if (viewMode === "MONTH") {
      const from = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
      const to = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
      return { from, to };
    }
    if (viewMode === "DAY") return { from: anchorDate, to: anchorDate };
    const from = startOfWeek(anchorDate);
    return { from, to: addDays(from, 6) };
  }, [anchorDate, viewMode]);

  const loadSchedule = async () => {
    setLoading(true); setLoadError("");
    try {
      const response = await httpClient.get<ApiResponse<TeachingScheduleEvent[]>>("/v1/admin/teaching-schedules", {
        params: { from: dateKey(visibleRange.from), to: dateKey(visibleRange.to) },
      });
      setEvents((response.data.data || []).map(item => ({
        ...item,
        id: String(item.id), classId: String(item.classId),
        resources: (item.resources || []).map(resource => ({ ...resource, userId: String(resource.userId) })),
        students: (item.students || []).map(student => ({ ...student, userId: String(student.userId) })),
      })));
    } catch (cause: any) {
      setEvents([]);
      const message = cause?.response?.data?.message || "Không tải được lịch giảng dạy.";
      setLoadError(message); error(message);
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadSchedule(); }, [visibleRange.from.getTime(), visibleRange.to.getTime()]);

  const resources = useMemo(() => {
    const map = new Map<string, TeachingResource>();
    events.flatMap(item => item.resources).forEach(item => map.set(item.userId, item));
    return [...map.values()].sort((a, b) => (a.fullName || "").localeCompare(b.fullName || "", "vi"));
  }, [events]);

  const conflictingEventIds = useMemo(() => {
    const ids = new Set<string>();
    resources.forEach(resource => {
      const assigned = events.filter(item => item.status === "ACTIVE"
        && item.resources.some(person => person.userId === resource.userId));
      assigned.forEach((first, index) => assigned.slice(index + 1).forEach(second => {
        if (new Date(first.startAt) < new Date(second.endAt) && new Date(second.startAt) < new Date(first.endAt)) {
          ids.add(first.id); ids.add(second.id);
        }
      }));
    });
    return ids;
  }, [events, resources]);

  const filteredEvents = useMemo(() => events.filter(item => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    const matchesKeyword = !keyword || [item.className, item.courseName, item.title, ...item.resources.map(r => r.fullName)]
      .some(value => value?.toLocaleLowerCase("vi").includes(keyword));
    const matchesRole = roleFilter === "ALL" || item.resources.some(resource => resource.role === roleFilter);
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesKeyword && matchesRole && matchesStatus && (!conflictOnly || conflictingEventIds.has(item.id));
  }), [events, search, roleFilter, statusFilter, conflictOnly, conflictingEventIds]);

  const selectedConflicts = useMemo(() => {
    if (!selectedEvent) return [];
    return events.filter(other => selectedEvent.status === "ACTIVE" && other.status === "ACTIVE" && other.id !== selectedEvent.id
      && new Date(selectedEvent.startAt) < new Date(other.endAt)
      && new Date(other.startAt) < new Date(selectedEvent.endAt)
      && selectedEvent.resources.some(person => other.resources.some(candidate => candidate.userId === person.userId)));
  }, [events, selectedEvent]);

  const visibleResources = useMemo(() => resources.filter(resource => {
    if (roleFilter !== "ALL" && resource.role !== roleFilter) return false;
    return filteredEvents.some(item => item.resources.some(person => person.userId === resource.userId));
  }), [resources, filteredEvents, roleFilter]);

  const days = viewMode === "MONTH"
    ? Array.from({ length: visibleRange.to.getDate() }, (_, index) => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), index + 1))
    : viewMode === "DAY" ? [anchorDate] : Array.from({ length: 7 }, (_, index) => addDays(visibleRange.from, index));

  const moveDate = (direction: number) => {
    const next = new Date(anchorDate);
    if (viewMode === "MONTH") next.setMonth(next.getMonth() + direction);
    else next.setDate(next.getDate() + direction * (viewMode === "DAY" ? 1 : 7));
    setAnchorDate(next);
  };

  const openDetail = (event: TeachingScheduleEvent) => {
    setSelectedEvent(event);
    setEditing(false);
    setEditForm(null);
  };

  const openStaffProfile = async (resource: TeachingResource) => {
    setProfileOpen(true); setProfileLoading(true);
    setQuickProfile({ id: resource.userId, fullName: resource.fullName, email: resource.email, roles: [resource.role] });
    try {
      const response = await httpClient.get<ApiResponse<QuickStaffProfile>>(`/v1/employees/${resource.userId}`);
      const profile = response.data.data;
      setQuickProfile({ ...profile, id: String(profile.id || resource.userId),
        fullName: profile.fullName || resource.fullName, email: profile.email || profile.userEmail || resource.email,
        roles: profile.roles?.length ? profile.roles : [resource.role] });
    } catch (cause: any) {
      error(cause?.response?.data?.message || "Không tải được hồ sơ Teacher/TA.");
    } finally { setProfileLoading(false); }
  };

  const beginEdit = () => {
    if (!selectedEvent) return;
    setEditForm({ title: selectedEvent.title || "", scheduledAt: toLocalDateTimeValue(selectedEvent.startAt),
      durationMin: String(durationMinutes(selectedEvent)), meetingUrl: selectedEvent.meetingUrl || "",
      status: selectedEvent.status || "ACTIVE" });
    setEditing(true);
  };

  const saveSchedule = async () => {
    if (!selectedEvent || !editForm) return;
    const duration = Number(editForm.durationMin);
    if (!editForm.scheduledAt || !Number.isInteger(duration) || duration < 15 || duration > 720) {
      error("Thời gian bắt đầu và thời lượng từ 15 đến 720 phút là bắt buộc."); return;
    }
    setSaving(true);
    try {
      const response = await httpClient.put<ApiResponse<TeachingScheduleEvent>>(`/v1/admin/teaching-schedules/${selectedEvent.id}`,
        { ...editForm, durationMin: duration });
      const updated = response.data.data;
      const normalized: TeachingScheduleEvent = { ...updated, id: String(updated.id), classId: String(updated.classId),
        resources: (updated.resources || []).map(resource => ({ ...resource, userId: String(resource.userId) })),
        students: (updated.students || []).map(student => ({ ...student, userId: String(student.userId) })) };
      setEvents(current => current.map(item => item.id === normalized.id ? normalized : item));
      setSelectedEvent(normalized); setEditing(false); success("Đã cập nhật lịch dạy.");
    } catch (cause: any) {
      error(cause?.response?.data?.message || "Không cập nhật được lịch dạy.");
    } finally { setSaving(false); }
  };

  const deleteSchedule = async () => {
    if (!selectedEvent) return;
    setDeleting(true);
    try {
      await httpClient.delete(`/v1/admin/teaching-schedules/${selectedEvent.id}`);
      setEvents(current => current.map(item => item.id === selectedEvent.id ? { ...item, status: "INACTIVE" } : item));
      setSelectedEvent(null); success("Đã hủy lịch dạy; lịch sử vẫn được giữ lại.");
    } catch (cause: any) {
      error(cause?.response?.data?.message || "Không hủy được lịch dạy.");
    } finally { setDeleting(false); }
  };

  const EventChip = ({ event }: { event: TeachingScheduleEvent }) => (
    <button type="button" onClick={() => openDetail(event)}
      className={`w-full rounded-lg border p-2 text-left transition hover:border-primary ${conflictingEventIds.has(event.id) ? "border-destructive/60 bg-destructive/5" : "border-primary/20 bg-primary/5"}`}>
      <div className="flex items-center justify-between gap-1"><span className="font-mono text-[10px] font-bold text-primary">{timeText(event.startAt)}–{timeText(event.endAt)}</span>{conflictingEventIds.has(event.id) && <AlertTriangle className="h-3 w-3 text-destructive" />}</div>
      <p className="mt-1 line-clamp-2 text-[11px] font-semibold">{event.className || "Lớp chưa đặt tên"}</p>
      <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{event.title || event.courseName}</p>
    </button>
  );

  return <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarDays className="h-6 w-6 text-primary" />{title}</h1><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
      <div className="flex rounded-xl border bg-card p-1">
        {([ ["WEEK", Columns3, "Tuần"], ["DAY", Clock, "Ngày"], ["MONTH", CalendarDays, "Tháng"], ["LIST", List, "Danh sách"] ] as const).map(([mode, Icon, label]) => <button key={mode} onClick={() => setViewMode(mode)} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${viewMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-3">
      <Card><CardContent className="flex items-center gap-3 p-4"><GraduationCap className="h-5 w-5 text-primary" /><div><p className="text-[10px] font-semibold uppercase text-muted-foreground">Buổi dạy</p><p className="text-xl font-bold">{filteredEvents.length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><Users className="h-5 w-5 text-indigo-500" /><div><p className="text-[10px] font-semibold uppercase text-muted-foreground">Teacher / TA</p><p className="text-xl font-bold">{visibleResources.length}</p></div></CardContent></Card>
      <Card className={conflictingEventIds.size ? "border-destructive/40" : ""}><CardContent className="flex items-center gap-3 p-4"><AlertTriangle className={`h-5 w-5 ${conflictingEventIds.size ? "text-destructive" : "text-emerald-500"}`} /><div><p className="text-[10px] font-semibold uppercase text-muted-foreground">Xung đột lịch</p><p className="text-xl font-bold">{conflictingEventIds.size}</p></div></CardContent></Card>
    </div>

    <Card><CardContent className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Button size="icon" variant="outline" onClick={() => moveDate(-1)}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" onClick={() => setAnchorDate(new Date())}>Hôm nay</Button><Button size="icon" variant="outline" onClick={() => moveDate(1)}><ChevronRight className="h-4 w-4" /></Button><strong className="ml-2 text-sm">{viewMode === "MONTH" ? `Tháng ${anchorDate.getMonth() + 1}/${anchorDate.getFullYear()}` : `${dateKey(visibleRange.from)} — ${dateKey(visibleRange.to)}`}</strong></div><Button variant={conflictOnly ? "destructive" : "outline"} onClick={() => setConflictOnly(value => !value)}><AlertTriangle className="mr-1.5 h-4 w-4" />{conflictOnly ? "Đang lọc xung đột" : "Chỉ xem xung đột"}</Button></div>
      <div className="grid gap-2 md:grid-cols-3"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Lớp, khóa học, tên hoặc email Teacher/TA..." className="pl-9" /></div>
        <Select value={roleFilter} onValueChange={value => setRoleFilter(value as typeof roleFilter)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Tất cả Teacher & TA</SelectItem><SelectItem value="TEACHER">Teacher</SelectItem><SelectItem value="TA">Teaching Assistant</SelectItem></SelectContent></Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Tất cả trạng thái</SelectItem><SelectItem value="ACTIVE">Đang hoạt động</SelectItem><SelectItem value="INACTIVE">Đã hủy</SelectItem></SelectContent></Select>
      </div>
    </CardContent></Card>

    {loading ? <Card><div className="flex h-72 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Đang tải lịch giảng dạy...</div></Card> : loadError ? <Card><div className="flex h-72 flex-col items-center justify-center gap-3 text-sm text-destructive"><AlertTriangle className="h-7 w-7" /><span>{loadError}</span><Button variant="outline" onClick={() => void loadSchedule()}>Tải lại</Button></div></Card> : viewMode === "MONTH" ?
      <Card className="overflow-hidden"><div className="grid grid-cols-7 border-b bg-muted/30">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(day => <div key={day} className="p-2 text-center text-xs font-bold">{day}</div>)}</div><div className="grid grid-cols-7">{Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, i) => <div key={`blank-${i}`} className="min-h-28 border-b border-r bg-muted/10" />)}{days.map(day => { const sessionCount = filteredEvents.filter(item => dateKey(new Date(item.startAt)) === dateKey(day)).length; return <button key={dateKey(day)} onClick={() => { setAnchorDate(day); setViewMode("DAY"); }} className="group min-h-28 border-b border-r p-3 text-left transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"><span className="text-xs font-bold text-muted-foreground group-hover:text-primary">{day.getDate()}</span><div className="flex h-16 items-center justify-center">{sessionCount > 0 ? <div className="text-center"><strong className="block text-2xl font-black text-primary">{sessionCount}</strong><span className="text-[10px] font-semibold text-muted-foreground">buổi dạy</span></div> : <span className="text-[10px] text-muted-foreground/60">Không có buổi dạy</span>}</div></button>; })}</div></Card>
    : viewMode === "LIST" ? <Card><CardHeader><CardTitle className="text-sm">Danh sách buổi dạy</CardTitle></CardHeader><CardContent className="space-y-2">{filteredEvents.map(item => <button key={item.id} onClick={() => openDetail(item)} className="grid w-full gap-2 rounded-xl border p-3 text-left hover:border-primary md:grid-cols-[150px_1fr_220px_120px]"><span className="font-mono text-xs font-bold">{dateText(item.startAt)}<br />{timeText(item.startAt)}–{timeText(item.endAt)}</span><span><strong className="block text-sm">{item.className}</strong><small className="text-muted-foreground">{item.courseName}</small></span><span className="text-xs">{item.resources.map(r => `${r.fullName} (${r.role})`).join(", ") || "Chưa phân công"}</span><Badge variant="outline" className="w-fit">{item.status || "—"}</Badge></button>)}{!filteredEvents.length && <p className="py-16 text-center text-sm text-muted-foreground">Không có buổi dạy phù hợp.</p>}</CardContent></Card>
    : <Card className="overflow-hidden"><div className="max-h-162.5 overflow-auto"><div className={`grid min-w-275 ${viewMode === "DAY" ? "grid-cols-[240px_1fr]" : "grid-cols-[240px_repeat(7,minmax(150px,1fr))]"}`}><div className="sticky left-0 top-0 z-30 border-b border-r bg-card p-3 text-xs font-bold">Teacher / TA</div>{days.map(day => <div key={dateKey(day)} className="sticky top-0 z-20 border-b border-r bg-card p-3 text-center"><strong className="block text-xs">{dateText(day)}</strong><span className="text-[10px] text-muted-foreground">{dateKey(day)}</span></div>)}{visibleResources.map(resource => <React.Fragment key={resource.userId}><button type="button" onClick={() => void openStaffProfile(resource)} title={`Xem hồ sơ ${resource.fullName || "Teacher/TA"}`} className="group sticky left-0 z-10 border-b border-r bg-card p-3 text-left transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{(resource.fullName || "?").charAt(0)}</div><div className="min-w-0"><p className="truncate text-xs font-bold group-hover:text-primary">{resource.fullName || "Chưa có tên"}</p><Badge variant="outline" className="mt-1 text-[9px]">{resource.role}</Badge><p className="mt-1 text-[9px] font-semibold text-primary opacity-0 transition group-hover:opacity-100">Xem nhanh</p></div></div></button>{days.map(day => <div key={`${resource.userId}-${dateKey(day)}`} className="min-h-28 space-y-2 border-b border-r bg-muted/5 p-2">{filteredEvents.filter(item => dateKey(new Date(item.startAt)) === dateKey(day) && item.resources.some(person => person.userId === resource.userId)).map(item => <EventChip key={item.id} event={item} />)}</div>)}</React.Fragment>)}{!visibleResources.length && <div className="col-span-full py-20 text-center text-sm text-muted-foreground">Không có Teacher/TA hoặc buổi dạy phù hợp.</div>}</div></div></Card>}

    <Dialog open={Boolean(selectedEvent)} onOpenChange={open => { if (!open) { setSelectedEvent(null); setEditing(false); } }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{selectedEvent?.title || selectedEvent?.className}</DialogTitle><DialogDescription>Thông tin buổi dạy, Teacher/TA và kiểm tra xung đột</DialogDescription></DialogHeader>
        {selectedEvent && <div className="space-y-4 text-sm">
          {editing && editForm ? <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Tiêu đề buổi dạy</Label><Input value={editForm.title} maxLength={255} onChange={e => setEditForm({ ...editForm, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Ngày giờ bắt đầu *</Label><Input type="datetime-local" value={editForm.scheduledAt} onChange={e => setEditForm({ ...editForm, scheduledAt: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Thời lượng (phút) *</Label><Input type="number" min={15} max={720} step={15} value={editForm.durationMin} onChange={e => setEditForm({ ...editForm, durationMin: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Liên kết phòng học</Label><Input type="url" value={editForm.meetingUrl} placeholder="https://..." onChange={e => setEditForm({ ...editForm, meetingUrl: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Trạng thái</Label><Select value={editForm.status} onValueChange={status => setEditForm({ ...editForm, status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Đang hoạt động</SelectItem><SelectItem value="INACTIVE">Đã hủy</SelectItem></SelectContent></Select></div>
          </div> : <div className="grid gap-3 rounded-xl bg-muted/30 p-4 sm:grid-cols-2">
            <div><span className="text-xs text-muted-foreground">Thời gian</span><p className="font-semibold">{dateText(selectedEvent.startAt)}, {timeText(selectedEvent.startAt)}–{timeText(selectedEvent.endAt)}</p></div>
            <div><span className="text-xs text-muted-foreground">Thời lượng</span><p className="font-semibold">{durationMinutes(selectedEvent)} phút</p></div>
            <div><span className="text-xs text-muted-foreground">Lớp / khóa học</span><p className="font-semibold">{selectedEvent.className || "Chưa cập nhật"}</p><p className="text-xs text-muted-foreground">{selectedEvent.courseName || "Chưa cập nhật"}</p></div>
            <div><span className="text-xs text-muted-foreground">Hình thức / trạng thái</span><p className="font-semibold">{selectedEvent.deliveryMode || "Chưa cập nhật"}</p><Badge variant="outline">{selectedEvent.status || "—"}</Badge></div>
          </div>}
          {selectedConflicts.length > 0 && <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4"><p className="flex items-center gap-2 font-bold text-destructive"><AlertTriangle className="h-4 w-4" />Xung đột với {selectedConflicts.length} buổi dạy</p>{selectedConflicts.map(item => <button key={item.id} type="button" onClick={() => openDetail(item)} className="mt-2 block w-full rounded-lg border bg-card p-2 text-left text-xs hover:border-destructive"><strong>{item.title || item.className}</strong> · {dateText(item.startAt)} {timeText(item.startAt)}–{timeText(item.endAt)}</button>)}</div>}
          <div><p className="mb-2 text-xs font-bold uppercase text-muted-foreground">Người phụ trách</p><div className="grid gap-2 sm:grid-cols-2">{selectedEvent.resources.map(resource => <button key={resource.userId} type="button" onClick={() => void openStaffProfile(resource)} className="flex items-center justify-between rounded-lg border p-3 text-left transition hover:border-primary hover:bg-primary/5"><div><strong>{resource.fullName || "Chưa có tên"}</strong><p className="text-xs text-muted-foreground">{resource.email}</p><p className="mt-1 text-[10px] font-semibold text-primary">Xem thông tin nhanh</p></div><Badge>{resource.role}</Badge></button>)}</div></div>
          <div className="rounded-xl border p-4"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold uppercase text-muted-foreground">Học viên trong lớp</p><p className="mt-0.5 text-xs text-muted-foreground">Chọn học viên để mở hồ sơ quản lý đầy đủ</p></div><Badge variant="outline">{selectedEvent.students?.length || 0} học viên</Badge></div>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">{(selectedEvent.students || []).map(student => <Link key={student.userId} to="/admin/students" state={{ studentId: student.userId }} className="flex items-center justify-between rounded-lg border p-3 transition hover:border-primary hover:bg-primary/5"><div className="flex min-w-0 items-center gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{(student.fullName || "?").charAt(0)}</div><div className="min-w-0"><strong className="block truncate">{student.fullName || "Chưa có tên"}</strong><p className="truncate text-xs text-muted-foreground">{student.email || student.phone || "Chưa có thông tin liên hệ"}</p></div></div><span className="shrink-0 text-xs font-semibold text-primary">Xem chi tiết</span></Link>)}{!selectedEvent.students?.length && <div className="py-6 text-center text-xs text-muted-foreground">Lớp chưa có học viên đang hoạt động.</div>}</div>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t pt-4"><Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={selectedEvent.status === "INACTIVE"}><Trash2 className="mr-1.5 h-4 w-4" />Hủy lịch</Button><div className="flex flex-wrap gap-2">{editing ? <><Button variant="outline" onClick={() => setEditing(false)} disabled={saving}><X className="mr-1.5 h-4 w-4" />Bỏ chỉnh sửa</Button><Button onClick={() => void saveSchedule()} disabled={saving}>{saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}Lưu lịch</Button></> : <><Button variant="outline" onClick={beginEdit} disabled={selectedEvent.status === "INACTIVE"}><Pencil className="mr-1.5 h-4 w-4" />Chỉnh sửa</Button>{selectedEvent.meetingUrl && <a href={selectedEvent.meetingUrl} target="_blank" rel="noreferrer"><Button variant="outline"><ExternalLink className="mr-1.5 h-4 w-4" />Mở phòng học</Button></a>}<Link to={`/admin/classes/${selectedEvent.classId}`} className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"><UserRoundCheck className="mr-1.5 h-4 w-4" />Chi tiết lớp</Link></>}</div></div>
        </div>}
      </DialogContent>
    </Dialog>
    <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Thông tin Teacher/TA</DialogTitle><DialogDescription>Thông tin cơ bản của nhân sự phụ trách giảng dạy</DialogDescription></DialogHeader>
        {profileLoading && !quickProfile ? <div className="flex h-36 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Đang tải hồ sơ...</div> : quickProfile && <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl bg-primary/5 p-4">
            {quickProfile.avatarUrl ? <img src={quickProfile.avatarUrl} alt={quickProfile.fullName || "Teacher/TA"} className="h-14 w-14 rounded-full object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">{(quickProfile.fullName || "?").charAt(0)}</div>}
            <div className="min-w-0"><h3 className="truncate text-base font-bold">{quickProfile.fullName || "Chưa cập nhật tên"}</h3><p className="text-xs text-muted-foreground">{quickProfile.employeeCode || `ID: ${quickProfile.id}`}</p><div className="mt-2 flex flex-wrap gap-1">{(quickProfile.roles || []).map(role => <Badge key={role} variant="outline">{role}</Badge>)}</div></div>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Email</p><p className="mt-1 break-all font-semibold">{quickProfile.email || "Chưa cập nhật"}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Số điện thoại</p><p className="mt-1 font-semibold">{quickProfile.phone || "Chưa cập nhật"}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Phòng ban</p><p className="mt-1 font-semibold">{quickProfile.departmentName || "Chưa cập nhật"}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Vị trí</p><p className="mt-1 font-semibold">{quickProfile.position || "Teacher/TA"}</p></div>
          </div>
          {profileLoading && <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang đồng bộ thông tin mới nhất...</p>}
        </div>}
      </DialogContent>
    </Dialog>
    <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Hủy lịch dạy" description="Lịch sẽ ngừng hoạt động nhưng vẫn được giữ lại để tra cứu lịch sử. Bạn chắc chắn muốn tiếp tục?" confirmText="Hủy lịch dạy" loading={deleting} onConfirm={deleteSchedule} />
  </div>;
};
