import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { teacherApi, type TeacherClassCard, type ClassStudentDetail } from "@/api/teacher/teacherApi";
import { StudentRiskRow } from "@/components/teacher/StudentRiskRow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import {
  Users,
  Clock,
  ArrowLeft,
  CalendarPlus,
} from "lucide-react";

export const TeacherClassesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success } = useToast();

  const [classes, setClasses] = useState<TeacherClassCard[]>([]);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [selectedClass, setSelectedClass] = useState<TeacherClassCard | null>(null);
  const [students, setStudents] = useState<ClassStudentDetail[]>([]);
  const [detailSubTab, setDetailSubTab] = useState<"STUDENTS" | "SCHEDULE" | "REQUESTS">("STUDENTS");
  const [loading, setLoading] = useState(true);

  // Time Change Modal State
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newTime, setNewTime] = useState("");

  useEffect(() => {
    teacherApi.getClasses().then((res) => {
      setClasses(res);
      if (id) {
        const found = res.find((c) => c.id === id);
        if (found) {
          setSelectedClass(found);
          teacherApi.getClassStudents(found.id).then(setStudents);
        }
      }
      setLoading(false);
    });
  }, [id]);

  const handleSelectClass = (cls: TeacherClassCard) => {
    setSelectedClass(cls);
    teacherApi.getClassStudents(cls.id).then(setStudents);
  };

  const handleSendReminder = async (s: any) => {
    await teacherApi.sendStudentReminder(s.id);
    success(`Đã gửi thông báo & email nhắc nhở học tập tới ${s.studentName}!`);
  };

  const handleReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTime) return;
    success(`Đã gửi yêu cầu đổi giờ học sang [${newTime}] & tự động thông báo tới tất cả học viên!`);
    setShowRescheduleModal(false);
    setNewTime("");
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải danh sách lớp học...</p>
      </div>
    );
  }

  // CLASS DETAIL VIEW
  if (selectedClass) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedClass(null)}
            className="rounded-lg gap-1.5 text-xs border-border text-foreground hover:bg-muted cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại danh sách lớp
          </Button>
        </div>

        {/* Class Banner Header */}
        <Card className="bg-card border-border/40 p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{selectedClass.className}</h1>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-primary/10 text-primary rounded border border-primary/20">
                  {selectedClass.deliveryMode === "ONE_ON_ONE" ? "Kèm 1-1" : "Lớp Nhóm"}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-muted text-muted-foreground rounded">
                  Vai trò: {selectedClass.roleInClass}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selectedClass.courseName}</p>
            </div>

            <div className="flex items-center gap-2">
              {selectedClass.deliveryMode === "ONE_ON_ONE" && (
                <Button
                  size="sm"
                  onClick={() => setShowRescheduleModal(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg gap-1.5 cursor-pointer"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Đặt/Đổi lịch buổi 1-1
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px]">Sĩ số:</span>
              <span className="font-bold text-foreground">{selectedClass.currentStudents}/{selectedClass.maxStudents} học viên</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">Lịch học tuần:</span>
              <span className="font-semibold text-primary">{selectedClass.scheduleSummary}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">Tiến độ trung bình lớp:</span>
              <span className="font-bold text-foreground">{selectedClass.avgProgressPercent}%</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">Trạng thái:</span>
              <span className="font-bold text-primary">Đang giảng dạy</span>
            </div>
          </div>
        </Card>

        {/* Sub Tabs */}
        <div className="flex border-b border-border/40">
          <button
            onClick={() => setDetailSubTab("STUDENTS")}
            className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
              detailSubTab === "STUDENTS"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Danh sách Học viên ({students.length})
          </button>
          <button
            onClick={() => setDetailSubTab("SCHEDULE")}
            className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
              detailSubTab === "SCHEDULE"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Lịch học chi tiết
          </button>
          <button
            onClick={() => setDetailSubTab("REQUESTS")}
            className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
              detailSubTab === "REQUESTS"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Yêu cầu từ Học viên (Read-only)
          </button>
        </div>

        {/* SUB TAB 1: STUDENTS TABLE */}
        {detailSubTab === "STUDENTS" && (
          <Card className="bg-card border-border/40 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/40 text-[11px] text-muted-foreground uppercase font-bold">
                    <th className="p-3">Học viên</th>
                    <th className="p-3">Lớp / Khóa học</th>
                    <th className="p-3">Cảnh báo / Tình trạng</th>
                    <th className="p-3">Tiến độ khóa</th>
                    <th className="p-3">Điểm Quiz TB</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <StudentRiskRow key={s.id} student={s as any} onSendReminder={handleSendReminder} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* SUB TAB 2: SCHEDULE */}
        {detailSubTab === "SCHEDULE" && (
          <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Danh sách các buổi học trực tuyến</h3>
              <Button
                size="sm"
                onClick={() => setShowRescheduleModal(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg gap-1.5 cursor-pointer"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Đổi giờ buổi học
              </Button>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-background border border-border/40 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-foreground">Buổi 12: Thực hành JWT Filter & Spring Security</p>
                  <p className="text-muted-foreground">19:00 - 21:00, Thứ Năm 07/08/2026</p>
                </div>
                <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full font-bold text-[11px]">
                  Sắp diễn ra
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* SUB TAB 3: REQUESTS READ-ONLY */}
        {detailSubTab === "REQUESTS" && (
          <Card className="bg-card border-border/40 p-5 space-y-3 shadow-xs">
            <h3 className="text-sm font-bold text-foreground">Yêu cầu đổi lớp / đổi giảng viên đang chờ HR duyệt</h3>
            <div className="p-4 bg-background border border-border/40 rounded-xl text-xs space-y-1">
              <p className="font-bold text-amber-600 dark:text-amber-400">Học viên: Trần Bảo Nam — Yêu cầu chuyển sang lớp T7-CN</p>
              <p className="text-muted-foreground">Lý do: Trùng lịch làm việc ca tối ngày Thứ Năm. (Trạng thái: PENDING HR)</p>
            </div>
          </Card>
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-popover border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-foreground">Đổi lịch buổi học</h3>
              <p className="text-xs text-muted-foreground">
                Nhập khung giờ mới. Hệ thống sẽ tự động gửi email và thông báo đẩy tới tất cả học viên trong lớp.
              </p>
              <form onSubmit={handleReschedule} className="space-y-4">
                <input
                  type="text"
                  placeholder="VD: 19:30 - 21:30, Thứ Bảy 09/08/2026"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full h-10 bg-background border border-border rounded-xl px-3 text-xs text-foreground"
                  required
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRescheduleModal(false)}
                    className="text-xs border-border text-foreground cursor-pointer"
                  >
                    Hủy
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs cursor-pointer">
                    Xác nhận & Gửi email
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // MAIN CLASS LIST CARDS
  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Lớp học đảm nhận
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Quản lý các lớp nhóm & 1-1 bạn đang đảm nhận vai trò Giảng viên hoặc Trợ giảng.
        </p>
      </div>

      {/* Tabs Filter */}
      <div className="flex border-b border-border/40">
        <button
          onClick={() => setActiveTab("ACTIVE")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === "ACTIVE"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Lớp Đang dạy ({classes.filter((c) => c.status === "ACTIVE").length})
        </button>
        <button
          onClick={() => setActiveTab("COMPLETED")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === "COMPLETED"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Lớp Đã kết thúc ({classes.filter((c) => c.status === "COMPLETED").length})
        </button>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes
          .filter((c) => c.status === activeTab)
          .map((cls) => (
            <Card key={cls.id} className="bg-card border-border/40 p-5 space-y-4 hover:border-primary/50 transition shadow-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[9px] font-extrabold bg-primary/10 text-primary rounded border border-primary/20">
                    {cls.deliveryMode === "ONE_ON_ONE" ? "Kèm 1-1" : "Lớp Nhóm"}
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-extrabold bg-muted text-muted-foreground rounded">
                    Role: {cls.roleInClass}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground">{cls.className}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{cls.courseName}</p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Sĩ số:</span>
                  <span className="font-bold text-foreground">{cls.currentStudents}/{cls.maxStudents} học viên</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(cls.currentStudents / cls.maxStudents) * 100}%` }}
                  />
                </div>

                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] pt-1">
                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{cls.scheduleSummary}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Tiến độ TB: <strong className="text-foreground">{cls.avgProgressPercent}%</strong></span>
                <Button
                  size="sm"
                  onClick={() => handleSelectClass(cls)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg h-8 px-3 cursor-pointer"
                >
                  Xem danh sách
                </Button>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
};
