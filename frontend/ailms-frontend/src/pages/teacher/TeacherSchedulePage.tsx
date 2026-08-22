import React, { useState, useEffect, useMemo, useRef } from "react";
import { teacherApi, type OnlineClassSession } from "@/api/teacher/teacherApi";
import { CountdownRing } from "@/components/teacher/CountdownRing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import {
  Calendar as CalendarIcon,
  Video,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarDays,
  Columns,
  ListOrdered,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

type CalendarViewMode = "WEEK" | "MONTH" | "TIMELINE";

export const TeacherSchedulePage: React.FC = () => {
  const { success } = useToast();
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState<OnlineClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [viewMode, setViewMode] = useState<CalendarViewMode>("WEEK");
  const [selectedSession, setSelectedSession] = useState<OnlineClassSession | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const linkedSessionHandled = useRef(false);

  // Review Form state
  const [interactionRating, setInteractionRating] = useState<number>(5);
  const [sessionNote, setSessionNote] = useState("");

  const weekStart = useMemo(() => {
    const value = new Date(anchorDate);
    const day = value.getDay() || 7;
    value.setHours(0, 0, 0, 0);
    value.setDate(value.getDate() - day + 1);
    return value;
  }, [anchorDate]);

  const daysOfWeekLabels = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return {
      dayIdx: index,
      label: index === 6 ? "Chủ Nhật" : `Thứ ${String(index + 2)}`,
      dateStr: new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(date),
      isoDate: toDateKey(date),
    };
  }), [weekStart]);

  const monthCells = useMemo(() => {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    return [...Array.from({ length: firstOffset }, () => null),
      ...Array.from({ length: days }, (_, index) => new Date(year, month, index + 1))];
  }, [anchorDate]);

  useEffect(() => {
    const from = viewMode === "MONTH"
      ? new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
      : weekStart;
    const to = viewMode === "MONTH"
      ? new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0)
      : daysOfWeekLabels[6].isoDate;
    teacherApi.getOnlineSessions(
      toDateKey(from), typeof to === "string" ? to : toDateKey(to),
    ).then((res) => {
      setLoadError("");
      setSessions(res);
      const linked = linkedSessionHandled.current
        ? undefined : res.find((item) => item.id === searchParams.get("sessionId"));
      if (linked) {
        linkedSessionHandled.current = true;
        setSelectedSession(linked);
        setClassFilter(linked.classId);
        setViewMode("TIMELINE");
        if (linked.status === "UNREVIEWED") setShowReviewModal(true);
      }
    }).catch(() => {
      setSessions([]);
      setLoadError("Không thể tải lịch dạy trong khoảng thời gian này.");
    }).finally(() => { setLoading(false); });
  }, [anchorDate, daysOfWeekLabels, searchParams, viewMode, weekStart]);

  /** Chuyển tuần hoặc tháng đang hiển thị và tải lại đúng khoảng dữ liệu. */
  const movePeriod = (direction: number) => {
    setAnchorDate((current) => {
      const next = new Date(current);
      if (viewMode === "MONTH") next.setMonth(next.getMonth() + direction);
      else next.setDate(next.getDate() + direction * 7);
      return next;
    });
  };

  const availableClasses = useMemo(() => {
    const map = new Map<string, string>();
    sessions.forEach((s) => {
      if (s.classId && s.className) {
        map.set(s.classId, s.className);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  const filteredSessions = sessions.filter((s, index, self) => {
    if (classFilter !== "ALL" && s.classId !== classFilter) return false;
    const firstIndex = self.findIndex(
      (item) =>
        (item.id && s.id && item.id === s.id) ||
        (item.classId === s.classId && item.dateStr === s.dateStr && item.startTime === s.startTime && item.title === s.title)
    );
    return firstIndex === index;
  });

  /** Mở biểu mẫu nhận xét cho đúng buổi dạy được chọn. */
  const handleOpenReview = (sess: OnlineClassSession) => {
    setSelectedSession(sess);
    setShowReviewModal(true);
  };

  /** Gửi nhận xét buổi dạy thật và cập nhật trạng thái tại chỗ. */
  const handleSubmitReview = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSession) return;
    if (selectedSession.trialRequestId) {
      await teacherApi.submitOneOnOneTrialReview(selectedSession.trialRequestId, sessionNote);
    } else {
      await teacherApi.submitSessionReview(selectedSession.id, [], sessionNote);
    }
    success("Đã hoàn thành nhận xét buổi dạy! Trạng thái thù lao đã chuyển sang PENDING chờ HR duyệt.");
    setShowReviewModal(false);
    setSessions((prev) =>
      prev.map((s) => (s.id === selectedSession.id ? { ...s, status: "REVIEWED" } : s))
    );
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải lịch dạy Online...</p>
      </div>
    );
  }

  if (loadError) return <Card className="p-10 text-center text-sm text-destructive">{loadError}</Card>;

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Lịch dạy Online
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Xem lịch giảng dạy linh hoạt theo các chế độ: Week View, Month View và Timeline View.
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-2 bg-card border border-border/40 p-1.5 rounded-xl shadow-xs">
          <Button
            type="button"
            variant={viewMode === "WEEK" ? "default" : "ghost"}
            size="sm"
            onClick={() => { setViewMode("WEEK"); }}
            className="text-xs font-bold"
          >
            <Columns className="h-3.5 w-3.5" />
            Week View
          </Button>
          <Button
            type="button"
            variant={viewMode === "MONTH" ? "default" : "ghost"}
            size="sm"
            onClick={() => { setViewMode("MONTH"); }}
            className="text-xs font-bold"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Month View
          </Button>
          <Button
            type="button"
            variant={viewMode === "TIMELINE" ? "default" : "ghost"}
            size="sm"
            onClick={() => { setViewMode("TIMELINE"); }}
            className="text-xs font-bold"
          >
            <ListOrdered className="h-3.5 w-3.5" />
            Timeline View
          </Button>
        </div>
      </div>

      {/* Filter & Date Navigation Bar */}
      <Card className="bg-card border-border/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { movePeriod(-1); }} className="h-8 text-xs border-border text-foreground hover:bg-muted cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-bold text-foreground px-2">
            {viewMode === "MONTH"
              ? new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(anchorDate)
              : `${daysOfWeekLabels[0].dateStr}/${String(weekStart.getFullYear())} - ${daysOfWeekLabels[6].dateStr}/${daysOfWeekLabels[6].isoDate.slice(0, 4)}`}
          </span>
          <Button variant="outline" size="sm" onClick={() => { movePeriod(1); }} className="h-8 text-xs border-border text-foreground hover:bg-muted cursor-pointer">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setAnchorDate(new Date()); }} className="h-8 text-xs border-border text-primary font-bold hover:bg-muted cursor-pointer ml-2">
            Hôm nay
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-full text-xs sm:w-60"><SelectValue /></SelectTrigger>
            <SelectContent>
            <SelectItem value="ALL">Tất cả các lớp</SelectItem>
            {availableClasses.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* VIEW 1: WEEK VIEW */}
      {viewMode === "WEEK" && (
        <Card className="bg-card border-border/40 p-4 overflow-x-auto shadow-xs">
          <div className="min-w-[800px]">
            {/* Week Header Days */}
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
                const daySessionsRaw = filteredSessions.filter((s) => {
                  return s.dateStr === d.isoDate;
                });

                const daySessions = daySessionsRaw;
                return (
                  <div key={d.dayIdx} className="bg-muted/30 border border-border/40 rounded-xl p-2 space-y-2 min-h-[380px]">
                    {daySessions.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground/60 italic">
                        Không có buổi dạy
                      </div>
                    ) : (
                      daySessions.map((sess) => (
                        <div
                          key={sess.id}
                          onClick={() => { setSelectedSession(sess); }}
                          className={`p-2.5 rounded-lg border text-xs space-y-2 cursor-pointer transition shadow-xs ${
                            sess.status === "UNREVIEWED"
                              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 shadow-md animate-pulse"
                              : "bg-background border-border/60 hover:border-primary"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-primary font-mono">{sess.startTime} - {sess.endTime}</span>
                            {sess.status === "UNREVIEWED" && sess.secondsLeftToReview && (
                              <CountdownRing initialSeconds={sess.secondsLeftToReview} size={28} strokeWidth={2} />
                            )}
                          </div>
                          <p className="font-bold text-foreground line-clamp-2 text-[11px] leading-tight">{sess.className}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{sess.title}</p>

                          {sess.status === "UNREVIEWED" ? (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenReview(sess);
                              }}
                              className="w-full bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-extrabold h-6 rounded cursor-pointer"
                            >
                              Nhận xét 24h
                            </Button>
                          ) : (
                            <a
                              href={sess.roomUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => { e.stopPropagation(); }}
                              className="w-full flex items-center justify-center gap-1 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded"
                            >
                              <Video className="h-3 w-3" />
                              Vào phòng
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
            {monthCells.map((date, idx) => {
              if (!date) return <div key={`blank-${String(idx)}`} className="min-h-[90px]" />;
              const dayNum = date.getDate();
              const dateString = toDateKey(date);
              const daySessionsRaw = filteredSessions.filter((s) => s.dateStr === dateString);
              const daySessions = daySessionsRaw;

              return (
                <div
                  key={dateString}
                  className="min-h-[90px] p-2 bg-background border border-border/40 rounded-xl space-y-1 hover:border-primary/50 transition cursor-pointer"
                >
                  <span className="text-[11px] font-extrabold text-muted-foreground block">{dayNum}</span>
                  {daySessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => { setSelectedSession(s); }}
                      className={`p-1 rounded text-[10px] font-bold truncate ${
                        s.status === "UNREVIEWED"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-400"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}
                    >
                      {s.startTime} {s.className.substring(0, 15)}...
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Khung giờ Timeline theo Lớp học</h3>
          </div>

          <div className="space-y-4">
            {filteredSessions.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Không có buổi dạy trong khoảng thời gian này.</p>
            ) : filteredSessions.map((sess) => (
              <div key={sess.id} className="p-4 bg-background border border-border/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{sess.className}</h4>
                    <p className="text-xs text-muted-foreground">{sess.title} ({sess.dateStr})</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-primary">{sess.startTime} - {sess.endTime}</span>
                </div>

                {/* Timeline Bar */}
                <div className="relative h-6 bg-muted/40 rounded-lg overflow-hidden flex items-center">
                  <div
                    className={`absolute h-full rounded-lg flex items-center px-3 text-[10px] font-bold ${
                      sess.status === "UNREVIEWED" ? "bg-amber-500 text-white animate-pulse" : "bg-primary text-primary-foreground"
                    }`}
                    style={{ left: `${String(((sess.startHour - 8) / 14) * 100)}%`, width: `${String(((sess.endHour - sess.startHour) / 14) * 100)}%` }}
                  >
                    {sess.startTime} - {sess.endTime}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* SESSION DETAIL DRAWER / MODAL */}
      {selectedSession && !showReviewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-popover border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">{selectedSession.className}</h3>
                <p className="text-xs text-muted-foreground">{selectedSession.courseName}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => { setSelectedSession(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-2 text-xs text-foreground bg-muted/30 p-3 rounded-xl border border-border/40">
              <p><strong>Nội dung:</strong> {selectedSession.title}</p>
              <p><strong>Thời gian:</strong> {selectedSession.startTime} - {selectedSession.endTime} ({selectedSession.dateStr})</p>
              <p><strong>Trạng thái:</strong> <span className="font-bold text-primary">{selectedSession.status}</span></p>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
              {selectedSession.status === "UNREVIEWED" || (Boolean(selectedSession.trialRequestId) && selectedSession.status !== "REVIEWED") ? (
                <Button
                  onClick={() => { setShowReviewModal(true); }}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                {selectedSession?.trialRequestId ? "Nhận xét học thử (24h)" : "Nhận xét 24h (Kích hoạt thù lao)"}
                </Button>
              ) : (
                <a
                  href={selectedSession.roomUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg transition"
                >
                  <Video className="h-4 w-4" />
                  Mở phòng học trực tuyến (Jitsi Meet)
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 24h Review Modal */}
      {showReviewModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-popover border border-border rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Nhận xét buổi dạy (Hạn chót 24h)</h3>
                <p className="text-xs text-muted-foreground">{selectedSession.className}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => { setShowReviewModal(false); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={(event) => { void handleSubmitReview(event); }} className="space-y-4">
              <div>
                <label className="text-xs text-foreground font-semibold block mb-1">Mức độ tương tác của học viên (1 - 5 ⭐):</label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={interactionRating}
                  onChange={(e) => { setInteractionRating(Number(e.target.value)); }}
                  className="w-full"
                />
                <span className="text-xs font-bold text-amber-500 block text-right">{interactionRating} / 5 ⭐</span>
              </div>

              <div>
                <label className="text-xs text-foreground font-semibold block mb-1">Ghi chú & Nhận xét buổi học:</label>
                <Textarea
                  rows={3}
                  placeholder="Nhập nội dung đã giảng dạy, các câu hỏi học viên cần ôn tập..."
                  value={sessionNote}
                  onChange={(e) => { setSessionNote(e.target.value); }}
                  className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowReviewModal(false); }}
                  className="text-xs border-border text-foreground cursor-pointer"
                >
                  Hủy
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold cursor-pointer">
                  {selectedSession.trialRequestId ? "Gửi nhận xét học thử" : "Gửi nhận xét & Kích hoạt thù lao"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/** Chuẩn hóa ngày local thành yyyy-MM-dd để gọi API và ghép session vào lịch. */
const toDateKey = (date: Date) => `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
