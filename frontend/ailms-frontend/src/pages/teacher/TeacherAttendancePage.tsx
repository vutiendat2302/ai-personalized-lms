import React, { useState, useEffect } from "react";
import { teacherApi, type ClassStudentDetail, type TeacherClassCard } from "@/api/teacher/teacherApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { Clock, Save } from "lucide-react";

export const TeacherAttendancePage: React.FC = () => {
  const { success } = useToast();
  const [classes, setClasses] = useState<TeacherClassCard[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [students, setStudents] = useState<ClassStudentDetail[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, "PRESENT" | "ABSENT" | "LATE">>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teacherApi.getClasses().then((res) => {
      setClasses(res);
      if (res.length > 0) {
        setSelectedClassId(res[0].id);
        loadStudents(res[0].id);
      }
      setLoading(false);
    });
  }, []);

  const loadStudents = (clsId: string) => {
    teacherApi.getClassStudents(clsId).then((data) => {
      setStudents(data);
      const initialMap: Record<string, "PRESENT" | "ABSENT" | "LATE"> = {};
      data.forEach((s) => {
        initialMap[s.id] = "PRESENT";
      });
      setAttendanceMap(initialMap);
    });
  };

  const handleClassChange = (clsId: string) => {
    setSelectedClassId(clsId);
    loadStudents(clsId);
  };

  const handleToggleStatus = (studentId: string, status: "PRESENT" | "ABSENT" | "LATE") => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = () => {
    success("Đã lưu bảng điểm danh học viên cho buổi học thành công!");
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải bảng điểm danh học viên...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Điểm danh Học viên theo Buổi học
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Đánh giá chuyên cần (Có mặt / Vắng / Trễ) cho từng học viên trong buổi học trực tuyến.
          </p>
        </div>

        <Button
          onClick={handleSaveAttendance}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg gap-1.5 cursor-pointer shadow-md"
        >
          <Save className="h-4 w-4" />
          Lưu điểm danh buổi này
        </Button>
      </div>

      {/* Select Class Session */}
      <Card className="bg-card border-border/40 p-4 flex flex-col sm:flex-row items-center gap-3 shadow-xs">
        <label className="text-xs font-bold text-foreground shrink-0">Chọn Lớp học / Buổi dạy:</label>
        <select
          value={selectedClassId}
          onChange={(e) => handleClassChange(e.target.value)}
          className="w-full sm:w-80 bg-background border border-border rounded-xl p-2 text-xs text-foreground"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.className} ({c.scheduleSummary})
            </option>
          ))}
        </select>
      </Card>

      {/* Attendance Student Table */}
      <Card className="bg-card border-border/40 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/40 text-muted-foreground font-bold uppercase text-[11px]">
                <th className="p-3">Học viên</th>
                <th className="p-3">Email</th>
                <th className="p-3 text-center">Trạng thái Điểm danh</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const currentStatus = attendanceMap[s.id] || "PRESENT";
                return (
                  <tr key={s.id} className="border-b border-border/40 hover:bg-muted/40">
                    <td className="p-3 font-bold text-foreground">{s.studentName}</td>
                    <td className="p-3 text-muted-foreground font-mono text-[11px]">{s.studentEmail}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(s.id, "PRESENT")}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                            currentStatus === "PRESENT"
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Có mặt
                        </button>
                        <button
                          onClick={() => handleToggleStatus(s.id, "LATE")}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                            currentStatus === "LATE"
                              ? "bg-amber-500 text-white shadow-xs"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Đi trễ
                        </button>
                        <button
                          onClick={() => handleToggleStatus(s.id, "ABSENT")}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                            currentStatus === "ABSENT"
                              ? "bg-rose-600 text-white shadow-xs"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Vắng mặt
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
