import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronRight, GraduationCap, School, Users } from "lucide-react";
import { studentApi, type StudentClassCard } from "@/api/student/studentApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Hiển thị các lớp mà người dùng hiện tại là học viên ACTIVE. */
export const StudentClassesPage: React.FC = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<StudentClassCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /** Tải danh sách lớp đã được backend giới hạn theo JWT và vai trò STUDENT. */
  useEffect(() => {
    studentApi.getClasses().then(setClasses)
      .catch(() => setError("Không thể tải danh sách lớp học của bạn."))
      .finally(() => setLoading(false));
  }, []);

  /** Định dạng ngày lớp theo múi giờ trình duyệt. */
  const formatDate = (value?: string) => value
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value))
    : "Chưa cập nhật";

  if (loading) return <div className="space-y-6" aria-label="Đang tải lớp học của bạn"><Skeleton className="h-16 w-full" /><div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div></div>;
  if (error) return <Card className="p-10 text-center text-sm text-destructive">{error}</Card>;

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <School className="h-6 w-6 text-primary" /> Lớp học của tôi
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Theo dõi thông báo, lịch học, buổi học, tài liệu và kết quả của các lớp bạn đang tham gia.
        </p>
      </div>

      {classes.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <h2 className="font-bold text-foreground">Bạn chưa tham gia lớp học nào</h2>
          <p className="mt-1 text-sm text-muted-foreground">Lớp nhóm hoặc lớp 1-1 sẽ xuất hiện sau khi đăng ký thành công.</p>
          <Button className="mt-4" onClick={() => navigate("/student/catalog")}>Khám phá khóa học</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {classes.map((item) => (
            <Card key={item.id} className="group overflow-hidden border-border/60 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
              <div className="h-1.5 bg-linear-to-r from-primary via-primary/70 to-primary/20" />
              <CardContent className="space-y-5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{item.code}</Badge>
                      <Badge variant="outline">{item.packageType}</Badge>
                    </div>
                    <h2 className="line-clamp-2 text-lg font-bold text-foreground">{item.name}</h2>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-primary">{item.courseName}</p>
                  </div>
                  <Badge className="shrink-0">{item.status}</Badge>
                </div>

                {item.description && <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.description}</p>}

                <div className="grid grid-cols-1 gap-3 rounded-xl bg-muted/35 p-4 text-xs sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span><span className="text-muted-foreground">Người dạy:</span> {item.teacherName || "Chưa phân công"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span><span className="text-muted-foreground">Sĩ số:</span> {item.currentMemberCount ?? 0}/{item.maxMembers ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span><span className="text-muted-foreground">Bắt đầu:</span> {formatDate(item.startDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span><span className="text-muted-foreground">Kết thúc:</span> {formatDate(item.endDate)}</span>
                  </div>
                </div>

                <Button className="w-full gap-2" onClick={() => navigate(`/student/classes/${item.id}`)}>
                  Vào trang lớp học <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
