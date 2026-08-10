import React, { useState, useEffect } from "react";
import { studentApi, type ScheduleEventItem } from "@/api/student/studentApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarDays,
  Columns,
  ListOrdered,
  CheckSquare,
  FileCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type CalendarViewMode = "WEEK" | "MONTH" | "TIMELINE";

export const StudentSchedulePage: React.FC = () => {
  const eventDate = (event: ScheduleEventItem) => event.startAt.slice(0, 10);
  const eventDay = (event: ScheduleEventItem) => new Date(event.startAt).getDay() || 7;
  const eventTime = (event: ScheduleEventItem) => new Date(event.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const eventStartHour = (event: ScheduleEventItem) => new Date(event.startAt).getHours();
  const eventEndHour = (event: ScheduleEventItem) => event.endAt ? new Date(event.endAt).getHours() : eventStartHour(event) + 1;
  const navigate = useNavigate();
  const { success } = useToast();

  const [events, setEvents] = useState<ScheduleEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("WEEK");
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEventItem | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const daysOfWeekLabels = [
    { dayIdx: 0, label: "Thứ 2", dateStr: "03/08" },
    { dayIdx: 1, label: "Thứ 3", dateStr: "04/08" },
    { dayIdx: 2, label: "Thứ 4", dateStr: "05/08" },
    { dayIdx: 3, label: "Thứ 5", dateStr: "06/08" },
    { dayIdx: 4, label: "Thứ 6", dateStr: "07/08" },
    { dayIdx: 5, label: "Thứ 7", dateStr: "08/08" },
    { dayIdx: 6, label: "Chủ Nhật", dateStr: "09/08" },
  ];

  useEffect(() => {
    studentApi.getSchedule().then((res) => {
      setEvents(res);
      setLoading(false);
    });
  }, []);

  const filteredEvents = events.filter(
    (ev) => typeFilter === "ALL" || ev.type === typeFilter
  );

  const getEventBadgeClasses = (type: string) => {
    switch (type) {
      case "ONLINE_CLASS":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800";
      case "ASSIGNMENT_DUE":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800";
      case "QUIZ_DUE":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải lịch học & deadline thi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Lịch học & Deadline thi
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Xem lịch hợp nhất buổi học trực tuyến, hạn nộp bài tập và deadline làm Quiz theo Week, Month hoặc Timeline.
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-2 bg-card border border-border/40 p-1.5 rounded-xl shadow-xs">
          <button
            onClick={() => setViewMode("WEEK")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              viewMode === "WEEK"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Columns className="h-3.5 w-3.5" />
            Week View
          </button>
          <button
            onClick={() => setViewMode("MONTH")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              viewMode === "MONTH"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Month View
          </button>
          <button
            onClick={() => setViewMode("TIMELINE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              viewMode === "TIMELINE"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <ListOrdered className="h-3.5 w-3.5" />
            Timeline View
          </button>
        </div>
      </div>

      {/* Pending Matching Banner */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3 text-xs text-amber-700 dark:text-amber-300">
        <Info className="h-5 w-5 shrink-0" />
        <div>
          <strong className="block">Đang ghép Gia sư 1-1 cho gói học của bạn:</strong>
          <span>Đang tìm giáo viên phù hợp với khung giờ bạn chọn, chúng tôi sẽ thông báo ngay khi ghép xong.</span>
        </div>
      </div>

      {/* Filter & Date Navigation Bar */}
      <Card className="bg-card border-border/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs border-border text-foreground hover:bg-muted cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-bold text-foreground px-2">
            {viewMode === "MONTH" ? "Tháng 08 / 2026" : "03/08/2026 - 09/08/2026"}
          </span>
          <Button variant="outline" size="sm" className="h-8 text-xs border-border text-foreground hover:bg-muted cursor-pointer">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs border-border text-primary font-bold hover:bg-muted cursor-pointer ml-2">
            Hôm nay
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground w-full sm:w-60"
          >
            <option value="ALL">Tất cả loại sự kiện</option>
            <option value="ONLINE_CLASS">🔵 Buổi học Online</option>
            <option value="ASSIGNMENT_DUE">🟠 Hạn nộp Bài tập</option>
            <option value="QUIZ_DUE">🟣 Hạn làm Quiz</option>
          </select>
        </div>
      </Card>

      {/* VIEW 1: WEEK VIEW */}
      {viewMode === "WEEK" && (
        <Card className="bg-card border-border/40 p-4 overflow-x-auto shadow-xs">
          <div className="min-w-[800px]">
            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-border/40 pb-3 text-center">
              {daysOfWeekLabels.map((d) => (
                <div key={d.dayIdx} className="space-y-0.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">{d.label}</span>
                  <span className="text-xs font-extrabold text-foreground block">{d.dateStr}</span>
                </div>
              ))}
            </div>

            {/* Week Grid Slots */}
            <div className="grid grid-cols-7 gap-2 pt-3 min-h-[420px]">
              {daysOfWeekLabels.map((d) => {
                const dayEvents = filteredEvents.filter((ev) => eventDay(ev) === d.dayIdx);
                return (
                  <div key={d.dayIdx} className="bg-muted/30 border border-border/40 rounded-xl p-2 space-y-2 min-h-[380px]">
                    {dayEvents.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground/60 italic">
                        Không có sự kiện
                      </div>
                    ) : (
                      dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className={`p-2.5 rounded-lg border text-xs space-y-1.5 cursor-pointer transition shadow-xs hover:border-primary ${
                            ev.type === "ONLINE_CLASS"
                              ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800"
                              : ev.type === "ASSIGNMENT_DUE"
                              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800"
                              : "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold font-mono text-primary">{eventTime(ev)}</span>
                            <span className={`px-1.5 py-0.5 text-[8px] font-black rounded border ${getEventBadgeClasses(ev.type)}`}>
                              {ev.type === "ONLINE_CLASS" ? "Lớp" : ev.type === "ASSIGNMENT_DUE" ? "Bài tập" : "Quiz"}
                            </span>
                          </div>
                          <p className="font-bold text-foreground line-clamp-2 text-[11px] leading-tight">{ev.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{ev.className}</p>

                          {ev.type === "ONLINE_CLASS" && ev.roomUrl && (
                            <a
                              href={ev.roomUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-full flex items-center justify-center gap-1 py-1 bg-blue-600 text-white text-[10px] font-bold rounded"
                            >
                              <Video className="h-3 w-3" />
                              Vào lớp
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* VIEW 2: MONTH VIEW */}
      {viewMode === "MONTH" && (
        <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
          <div className="grid grid-cols-7 border-b border-border/40 pb-2 text-center text-xs font-bold text-muted-foreground uppercase">
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span>T7</span>
            <span>CN</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-xs">
            {Array.from({ length: 31 }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateString = `2026-08-${dayNum < 10 ? "0" + dayNum : dayNum}`;
              const dayEvents = filteredEvents.filter((ev) => eventDate(ev) === dateString);

              return (
                <div
                  key={idx}
                  className="min-h-[90px] p-2 bg-background border border-border/40 rounded-xl space-y-1 hover:border-primary/50 transition cursor-pointer"
                >
                  <span className="text-[11px] font-extrabold text-muted-foreground block">{dayNum}</span>
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`p-1 rounded text-[10px] font-bold truncate border ${getEventBadgeClasses(ev.type)}`}
                    >
                      {eventTime(ev)} {ev.title.substring(0, 15)}...
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* VIEW 3: TIMELINE VIEW */}
      {viewMode === "TIMELINE" && (
        <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Khung giờ Timeline Sự kiện</h3>
          </div>

          <div className="space-y-4">
            {filteredEvents.map((ev) => (
              <div key={ev.id} className="p-4 bg-background border border-border/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{ev.title}</h4>
                    <p className="text-xs text-muted-foreground">{ev.className || "Tự học cá nhân"} ({eventDate(ev)})</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-primary">{eventTime(ev)}</span>
                </div>

                {/* Timeline Bar */}
                <div className="relative h-6 bg-muted/40 rounded-lg overflow-hidden flex items-center">
                  <div
                    className={`absolute h-full rounded-lg flex items-center px-3 text-[10px] font-bold ${
                      ev.type === "ONLINE_CLASS"
                        ? "bg-blue-600 text-white"
                        : ev.type === "ASSIGNMENT_DUE"
                        ? "bg-amber-500 text-white"
                        : "bg-purple-600 text-white"
                    }`}
                    style={{ left: `${((eventStartHour(ev) - 8) / 16) * 100}%`, width: `${Math.max(12, ((eventEndHour(ev) - eventStartHour(ev)) / 16) * 100)}%` }}
                  >
                    {eventTime(ev)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-popover border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">{selectedEvent.title}</h3>
                <span className={`px-2 py-0.5 text-[9px] font-black rounded border mt-1 inline-block ${getEventBadgeClasses(selectedEvent.type)}`}>
                  {selectedEvent.type}
                </span>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-foreground bg-muted/30 p-3 rounded-xl border border-border/40">
              <p><strong>Thời gian:</strong> {eventTime(selectedEvent)} ({eventDate(selectedEvent)})</p>
              {selectedEvent.className && <p><strong>Lớp học:</strong> {selectedEvent.className}</p>}
              {selectedEvent.teacherName && <p><strong>Giảng viên phụ trách:</strong> {selectedEvent.teacherName}</p>}
            </div>

            <div className="flex justify-end pt-2 border-t border-border/40">
              {selectedEvent.type === "ONLINE_CLASS" && selectedEvent.roomUrl ? (
                <a
                  href={selectedEvent.roomUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
                >
                  <Video className="h-4 w-4" />
                  Mở phòng học trực tuyến (Jitsi Meet)
                </a>
              ) : (
                <Button
                  onClick={() => navigate("/student/assignments")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg cursor-pointer"
                >
                  Làm bài ngay
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
