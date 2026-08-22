import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import {
  teacherApi,
  type ClassStudentDetail,
  type TeacherClassCard,
  type TeacherOneOnOneRequest,
} from "@/api/teacher/teacherApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Users,
} from "lucide-react";

/** Hiển thị các lớp thật mà giáo viên hoặc trợ giảng đang được phân công. */
export const TeacherClassesPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<TeacherClassCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [oneOnOneRequests, setOneOnOneRequests] = useState<TeacherOneOnOneRequest[]>([]);

  /** Tải danh sách phân công của principal teacher/TA hiện tại. */
  const loadClasses = async () => {
    setLoading(true);
    setLoadError("");
    try {
      setClasses(await teacherApi.getClasses());
    } catch (cause: unknown) {
      setClasses([]);
      setLoadError(apiErrorMessage(cause, "Không tải được danh sách lớp đang phụ trách."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([teacherApi.getClasses(), teacherApi.getAssignedOneOnOneRequests()])
      .then(([rows, requests]) => {
        if (active) { setClasses(rows); setOneOnOneRequests(requests); }
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setClasses([]);
        setLoadError(apiErrorMessage(cause, "Không tải được danh sách lớp đang phụ trách."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === id),
    [classes, id],
  );

  if (loading) {
    return <TeacherClassesLoading />;
  }

  if (loadError && classes.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => { void loadClasses(); }}>
          Tải lại
        </Button>
      </Card>
    );
  }

  if (id) {
    return (
      <TeacherClassDetail
        key={id}
        classItem={selectedClass}
        onBack={() => { void navigate("/teacher/classes"); }}
        onOpenSchedule={() => { void navigate("/teacher/schedule"); }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <GraduationCap className="h-6 w-6 text-primary" />
          Lớp học đảm nhận
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Các lớp xuất hiện ngay khi HR/Admin phân công bạn làm giáo viên hoặc trợ giảng.
        </p>
      </div>

      {classes.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">Bạn chưa được phân công lớp nào</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Khi HR/Admin gán bạn vào lớp, lớp sẽ tự động hiển thị tại đây.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((item) => (
            (() => {
              const trial = oneOnOneRequests.find((request) => request.trialClassId === item.id && request.status === "TRIAL_SCHEDULED");
              return (
            <Card key={item.id} className="flex h-full flex-col border-border/60">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <Badge variant={item.status === "ACTIVE" ? "default" : "secondary"}>
                    {item.status === "ACTIVE" ? "Đang hoạt động" : "Đã hoàn thành"}
                  </Badge>
                  <Badge variant="outline">{item.roleInClass === "TEACHER" ? "Giáo viên" : "Trợ giảng"}</Badge>
                </div>
                <CardTitle className="text-lg">{item.className}</CardTitle>
                <p className="text-sm text-muted-foreground">{item.courseName}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />{item.currentStudents}/{item.maxStudents} học viên</p>
                  <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />{item.scheduleSummary || "Chưa xếp lịch"}</p>
                  <p className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />Tiến độ trung bình {item.avgProgressPercent}%</p>
                </div>
                <Button type="button" className="mt-auto w-full" onClick={() => { void navigate(`/teacher/classes/${item.id}`); }}>
                  Xem lớp và học viên
                </Button>
                {item.deliveryMode === "ONE_ON_ONE" && (
                  <Button type="button" variant="outline" className="w-full" onClick={() => { void navigate(trial?.trialSessionId ? `/teacher/schedule?sessionId=${trial.trialSessionId}` : "/teacher/schedule"); }}>
                    Mở lịch & nhận xét học thử
                  </Button>
                )}
              </CardContent>
            </Card>
              );
            })()
          ))}
        </div>
      )}
    </div>
  );
};

interface TeacherClassDetailProps {
  classItem?: TeacherClassCard;
  onBack: () => void;
  onOpenSchedule: () => void;
}

/** Hiển thị chi tiết lớp thuộc phạm vi phân công và danh sách học viên thật. */
const TeacherClassDetail: React.FC<TeacherClassDetailProps> = ({
  classItem,
  onBack,
  onOpenSchedule,
}) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<ClassStudentDetail[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(Boolean(classItem));
  const [studentsError, setStudentsError] = useState("");

  useEffect(() => {
    if (!classItem) return;
    let active = true;
    teacherApi.getClassStudents(classItem.id)
      .then((rows) => {
        if (active) setStudents(rows);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setStudents([]);
        setStudentsError(apiErrorMessage(cause, "Không tải được học viên của lớp."));
      })
      .finally(() => {
        if (active) setStudentsLoading(false);
      });
    return () => { active = false; };
  }, [classItem]);

  if (!classItem) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-muted-foreground">Lớp không tồn tại hoặc bạn không còn được phân công.</p>
        <Button type="button" variant="outline" className="mt-4" onClick={onBack}>Quay lại danh sách</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Button type="button" variant="ghost" className="mb-2 px-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Button>
          <h1 className="text-2xl font-bold">{classItem.className}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{classItem.courseName} · {classItem.scheduleSummary || "Chưa xếp lịch"}</p>
        </div>
        <Button type="button" variant="outline" onClick={onOpenSchedule}>
          <CalendarDays className="h-4 w-4" /> Mở lịch dạy
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border bg-muted/20 p-3">
        <Button type="button" variant="outline" onClick={onOpenSchedule}><CalendarDays className="h-4 w-4" /> Lịch & buổi học</Button>
        <Button type="button" variant="outline" onClick={() => { void navigate(`/teacher/grading?classId=${classItem.id}`); }}><BookOpen className="h-4 w-4" /> Bài tập & đánh giá</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ClassMetric label="Vai trò" value={classItem.roleInClass === "TEACHER" ? "Giáo viên" : "Trợ giảng"} />
        <ClassMetric label="Học viên" value={`${String(classItem.currentStudents)}/${String(classItem.maxStudents)}`} />
        <ClassMetric label="Tiến độ trung bình" value={`${String(classItem.avgProgressPercent)}%`} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Học viên trong lớp</CardTitle></CardHeader>
        <CardContent>
          {studentsError ? (
            <p className="py-8 text-center text-sm text-destructive">{studentsError}</p>
          ) : studentsLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Đang tải học viên...</p>
          ) : students.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Lớp chưa có học viên.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground"><tr><th className="p-3">Học viên</th><th className="p-3">Email</th><th className="p-3">Tiến độ</th><th className="p-3">Điểm quiz TB</th></tr></thead>
                <tbody>{students.map((student) => (
                  <tr key={student.id} className="border-t"><td className="p-3 font-medium">{student.studentName}</td><td className="p-3 text-muted-foreground">{student.studentEmail}</td><td className="p-3">{student.progressPercent}%</td><td className="p-3">{student.avgQuizScore}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/** Hiển thị một chỉ số tóm tắt của lớp. */
const ClassMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></CardContent></Card>
);

/** Hiển thị trạng thái tải danh sách lớp. */
const TeacherClassesLoading: React.FC = () => (
  <Card className="p-12 text-center text-sm text-muted-foreground">Đang tải lớp học đảm nhận...</Card>
);

/** Chuẩn hóa thông báo lỗi API mà không làm mất an toàn kiểu dữ liệu. */
const apiErrorMessage = (cause: unknown, fallback: string): string => {
  if (!axios.isAxiosError<{ message?: string }>(cause)) return fallback;
  const response = cause.response;
  if (!response) return fallback;
  return response.data.message ?? fallback;
};
