import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { studentApi, type ScheduleEventItem, type StudentOneOnOneRequest } from "@/api/student/studentApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StudentPageSkeleton } from "@/components/student/StudentPageSkeleton";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns,
  Filter,
  Info,
  ListOrdered,
  Video,
  X,
} from "lucide-react";

type CalendarViewMode = "WEEK" | "MONTH" | "TIMELINE";

/** Giữ bố cục lịch cũ và hiển thị sự kiện thật thuộc học viên hiện tại. */
export const StudentSchedulePage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<ScheduleEventItem[]>([]);
  const [matchingRequests, setMatchingRequests] = useState<StudentOneOnOneRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<CalendarViewMode>("WEEK");
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEventItem | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  /** Tải lịch đã được backend giới hạn theo enrollment và membership của JWT. */
  useEffect(() => {
    Promise.all([studentApi.getSchedule(), studentApi.getOneOnOneRequests()])
      .then(([schedule, requests]) => {
        setEvents(schedule);
        setMatchingRequests(requests.filter((request) => request.status !== "CANCELLED"));
      })
      .catch(() => setError("Không thể tải lịch học, lịch thi và hạn nộp bài."))
      .finally(() => setLoading(false));
  }, []);

  const filteredEvents = useMemo(
    () => events.filter((event) => typeFilter === "ALL" || event.type === typeFilter),
    [events, typeFilter],
  );

  const weekStart = useMemo(() => {
    const value = new Date(anchorDate);
    const day = value.getDay() || 7;
    value.setHours(0, 0, 0, 0);
    value.setDate(value.getDate() - day + 1);
    return value;
  }, [anchorDate]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return {
      date,
      key: toDateKey(date),
      label: index === 6 ? "Chủ Nhật" : `Thứ ${index + 2}`,
      dateStr: new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(date),
    };
  }), [weekStart]);

  const monthCells = useMemo(() => {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    return [
      ...Array.from({ length: firstDayOffset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
    ];
  }, [anchorDate]);

  const pendingMatching = matchingRequests.some((request) =>
    ["WAITING_INSTRUCTOR", "REMATCHING", "INSTRUCTOR_ACCEPTED", "CONTACTED", "TRIAL_SCHEDULED"].includes(request.status),
  );

  /** Hiển thị trạng thái matching dễ hiểu thay cho mã enum backend. */
  const matchingStatusLabel = (status: StudentOneOnOneRequest["status"]) => ({
    WAITING_INSTRUCTOR: "Đang tìm người dạy phù hợp",
    REMATCHING: "Đang tìm người dạy khác",
    INSTRUCTOR_ACCEPTED: "Đã có người dạy nhận yêu cầu",
    CONTACTED: "Đang liên hệ để xác nhận lịch",
    TRIAL_SCHEDULED: "Đã có lịch học thử",
    TRIAL_COMPLETED: "Đã hoàn tất học thử",
    MATCHED: "Đã ghép người dạy chính thức",
    CANCELLED: "Đã hủy",
  }[status]);

  /** Dịch mốc hiển thị một tuần hoặc một tháng theo chế độ hiện tại. */
  const movePeriod = (direction: number) => {
    setAnchorDate((current) => {
      const next = new Date(current);
      if (viewMode === "MONTH") next.setMonth(next.getMonth() + direction);
      else next.setDate(next.getDate() + direction * 7);
      return next;
    });
  };

  /** Trả màu riêng cho lớp học, bài tập và quiz. */
  const getEventBadgeClasses = (type: ScheduleEventItem["type"]) => {
    if (type === "ONLINE_CLASS") return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800";
    if (type === "ASSIGNMENT_DEADLINE") return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800";
    return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800";
  };

  /** Trả tên ngắn cho loại sự kiện backend. */
  const eventTypeLabel = (type: ScheduleEventItem["type"]) =>
    type === "ONLINE_CLASS" ? "Lớp" : type === "ASSIGNMENT_DEADLINE" ? "Bài tập" : "Quiz";

  /** Định dạng giờ sự kiện theo trình duyệt. */
  const eventTime = (event: ScheduleEventItem) =>
    new Date(event.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  /** Định dạng ngày sự kiện thành khóa yyyy-MM-dd theo local time. */
  const eventDate = (event: ScheduleEventItem) => toDateKey(new Date(event.startAt));

  /** Tính giờ bắt đầu dùng để đặt thanh timeline. */
  const eventStartHour = (event: ScheduleEventItem) => {
    const value = new Date(event.startAt);
    return value.getHours() + value.getMinutes() / 60;
  };

  /** Tính giờ kết thúc; deadline không có endAt được hiển thị bằng một mốc ngắn. */
  const eventEndHour = (event: ScheduleEventItem) => {
    if (!event.endAt) return eventStartHour(event) + 1;
    const value = new Date(event.endAt);
    return value.getHours() + value.getMinutes() / 60;
  };

  if (loading) {
    return <StudentPageSkeleton cards={2} columns={2} />;
  }

  if (error) return <Card className="p-10 text-center text-sm text-destructive">{error}</Card>;

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground"><CalendarIcon className="h-6 w-6 text-primary" />Lịch học & Deadline thi</h1>
          <p className="mt-1 text-xs text-muted-foreground">Xem lịch hợp nhất buổi học trực tuyến, hạn nộp bài tập và deadline làm Quiz theo Week, Month hoặc Timeline.</p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card p-1.5 shadow-xs">
          <ViewButton active={viewMode === "WEEK"} onClick={() => setViewMode("WEEK")} icon={Columns} label="Week View" />
          <ViewButton active={viewMode === "MONTH"} onClick={() => setViewMode("MONTH")} icon={CalendarDays} label="Month View" />
          <ViewButton active={viewMode === "TIMELINE"} onClick={() => setViewMode("TIMELINE")} icon={ListOrdered} label="Timeline View" />
        </div>
      </div>

      {pendingMatching && (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <div className="flex items-center gap-3"><Info className="h-5 w-5 shrink-0" /><div><strong className="block">Đang ghép người dạy 1-1 cho gói học của bạn</strong><span>Lịch học sẽ xuất hiện sau khi yêu cầu matching có lịch chính thức.</span></div></div>
          {matchingRequests.map((request) => <div key={request.id} className="rounded-lg border border-amber-200/70 bg-background/60 p-3 dark:border-amber-800/70">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong>{request.courseName} · {request.packageName}</strong><span className="font-semibold">{matchingStatusLabel(request.status)}</span></div>
            <p className="mt-1">{request.includedTutorSessions ?? 0} buổi chính thức · {request.assignedInstructorName ? `Người dạy: ${request.assignedInstructorName}` : "Chưa phân công người dạy"}</p>
          </div>)}
        </div>
      )}

      <Card className="flex flex-col items-center justify-between gap-4 border-border/40 bg-card p-4 shadow-xs sm:flex-row">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={() => movePeriod(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="px-2 text-xs font-bold text-foreground">
            {viewMode === "MONTH"
              ? new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(anchorDate)
              : `${weekDays[0].dateStr}/${weekDays[0].date.getFullYear()} - ${weekDays[6].dateStr}/${weekDays[6].date.getFullYear()}`}
          </span>
          <Button variant="outline" size="sm" className="h-8" onClick={() => movePeriod(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="ml-2 h-8 text-xs font-bold text-primary" onClick={() => setAnchorDate(new Date())}>Hôm nay</Button>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground sm:w-60">
            <option value="ALL">Tất cả loại sự kiện</option>
            <option value="ONLINE_CLASS">Buổi học Online</option>
            <option value="ASSIGNMENT_DEADLINE">Hạn nộp Bài tập</option>
            <option value="QUIZ_DEADLINE">Hạn làm Quiz</option>
          </select>
        </div>
      </Card>

      {viewMode === "WEEK" && (
        <Card className="overflow-x-auto border-border/40 bg-card p-4 shadow-xs">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-7 border-b border-border/40 pb-3 text-center">
              {weekDays.map((day) => <div key={day.key} className="space-y-0.5"><span className="text-[11px] font-bold uppercase text-muted-foreground">{day.label}</span><span className="block text-xs font-extrabold text-foreground">{day.dateStr}</span></div>)}
            </div>
            <div className="grid min-h-[420px] grid-cols-7 gap-2 pt-3">
              {weekDays.map((day) => {
                const dayEvents = filteredEvents.filter((event) => eventDate(event) === day.key);
                return <div key={day.key} className="min-h-[380px] space-y-2 rounded-xl border border-border/40 bg-muted/30 p-2">
                  {dayEvents.length === 0 ? <div className="flex h-full items-center justify-center text-[10px] italic text-muted-foreground/60">Không có sự kiện</div> : dayEvents.map((event) => (
                    <div key={`${event.type}-${event.id}`} onClick={() => setSelectedEvent(event)} className={`cursor-pointer space-y-1.5 rounded-lg border p-2.5 text-xs shadow-xs transition hover:border-primary ${getEventBadgeClasses(event.type)}`}>
                      <div className="flex items-center justify-between"><span className="font-mono text-[10px] font-bold">{eventTime(event)}</span><span className="rounded border border-current/20 px-1.5 py-0.5 text-[8px] font-black">{eventTypeLabel(event.type)}</span></div>
                      <p className="line-clamp-2 text-[11px] font-bold leading-tight">{event.title}</p>
                      {event.className && <p className="line-clamp-1 text-[10px] opacity-75">{event.className}</p>}
                      {event.type === "ONLINE_CLASS" && event.roomUrl && <a href={event.roomUrl} target="_blank" rel="noreferrer" onClick={(click) => click.stopPropagation()} className="flex w-full items-center justify-center gap-1 rounded bg-blue-600 py-1 text-[10px] font-bold text-white"><Video className="h-3 w-3" />Vào lớp</a>}
                    </div>
                  ))}
                </div>;
              })}
            </div>
          </div>
        </Card>
      )}

      {viewMode === "MONTH" && (
        <Card className="space-y-4 border-border/40 bg-card p-5 shadow-xs">
          <div className="grid grid-cols-7 border-b border-border/40 pb-2 text-center text-xs font-bold uppercase text-muted-foreground">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label) => <span key={label}>{label}</span>)}</div>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {monthCells.map((date, index) => {
              if (!date) return <div key={`blank-${index}`} className="min-h-[90px]" />;
              const dateKey = toDateKey(date);
              const dayEvents = filteredEvents.filter((event) => eventDate(event) === dateKey);
              return <div key={dateKey} className="min-h-[90px] space-y-1 rounded-xl border border-border/40 bg-background p-2 transition hover:border-primary/50">
                <span className="block text-[11px] font-extrabold text-muted-foreground">{date.getDate()}</span>
                {dayEvents.map((event) => <button type="button" key={`${event.type}-${event.id}`} onClick={() => setSelectedEvent(event)} className={`block w-full truncate rounded border p-1 text-left text-[10px] font-bold ${getEventBadgeClasses(event.type)}`}>{eventTime(event)} {event.title}</button>)}
              </div>;
            })}
          </div>
        </Card>
      )}

      {viewMode === "TIMELINE" && (
        <Card className="space-y-4 border-border/40 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/40 pb-3"><h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Khung giờ Timeline Sự kiện</h3></div>
          {filteredEvents.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">Không có sự kiện phù hợp.</p> : <div className="space-y-4">{filteredEvents.map((event) => (
            <div key={`${event.type}-${event.id}`} className="space-y-2 rounded-xl border border-border/40 bg-background p-4">
              <div className="flex items-center justify-between"><div><h4 className="text-sm font-bold text-foreground">{event.title}</h4><p className="text-xs text-muted-foreground">{event.className ?? eventTypeLabel(event.type)} ({new Date(event.startAt).toLocaleDateString("vi-VN")})</p></div><span className="font-mono text-xs font-bold text-primary">{eventTime(event)}</span></div>
              <div className="relative flex h-6 items-center overflow-hidden rounded-lg bg-muted/40"><div className={`absolute flex h-full items-center rounded-lg px-3 text-[10px] font-bold text-white ${event.type === "ONLINE_CLASS" ? "bg-blue-600" : event.type === "ASSIGNMENT_DEADLINE" ? "bg-amber-500" : "bg-purple-600"}`} style={{ left: `${Math.max(0, ((eventStartHour(event) - 8) / 16) * 100)}%`, width: `${Math.max(12, ((eventEndHour(event) - eventStartHour(event)) / 16) * 100)}%` }}>{eventTime(event)}</div></div>
            </div>
          ))}</div>}
        </Card>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-popover p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 pb-3"><div><h3 className="text-base font-bold text-foreground">{selectedEvent.title}</h3><span className={`mt-1 inline-block rounded border px-2 py-0.5 text-[9px] font-black ${getEventBadgeClasses(selectedEvent.type)}`}>{eventTypeLabel(selectedEvent.type)}</span></div><button type="button" onClick={() => setSelectedEvent(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button></div>
            <div className="space-y-2 rounded-xl border border-border/40 bg-muted/30 p-3 text-xs text-foreground"><p><strong>Thời gian:</strong> {new Date(selectedEvent.startAt).toLocaleString("vi-VN")}</p>{selectedEvent.className && <p><strong>Lớp học:</strong> {selectedEvent.className}</p>}{selectedEvent.teacherName && <p><strong>Giảng viên phụ trách:</strong> {selectedEvent.teacherName}</p>}</div>
            <div className="flex justify-end border-t border-border/40 pt-2">{selectedEvent.type === "ONLINE_CLASS" && selectedEvent.roomUrl ? <a href={selectedEvent.roomUrl} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"><Video className="h-4 w-4" />Mở phòng học trực tuyến</a> : <Button onClick={() => navigate("/student/assignments")} className="text-xs font-bold">Làm bài ngay</Button>}</div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Chuẩn hóa ngày local thành khóa yyyy-MM-dd để ghép sự kiện vào ô lịch. */
const toDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Nút chuyển chế độ hiển thị giữ nguyên kiểu điều khiển của bố cục cũ. */
const ViewButton = ({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Columns; label: string }) => (
  <button type="button" onClick={onClick} className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${active ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="h-3.5 w-3.5" />{label}</button>
);
