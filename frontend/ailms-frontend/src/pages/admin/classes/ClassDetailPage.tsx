import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  Clock,
  Calendar,
  AlertTriangle,
  Edit,
  XCircle,
  CheckCircle2,
  UserMinus,
  Loader2,
  ExternalLink,
  WalletCards,
  GraduationCap,
  UserRoundCheck,
} from "lucide-react";
import type { Classroom, ClassMember } from "@/types/adminCourseClass";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";
import httpClient from "@/api/httpClient";

export const ClassDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [cls, setCls] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("members");
  const [staff, setStaff] = useState<any[]>([]);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [activeRate, setActiveRate] = useState<any | null>(null);

  // Remove student confirmation dialog state
  const [studentToRemove, setStudentToRemove] = useState<ClassMember | null>(null);

  const loadClass = async () => {
    if (!id) return;
    setLoading(true); setError("");
    try {
      const [row, memberRows, sessionRows, scheduleRows, employees, enrollments, rates, payments] = await Promise.all([
        adminCourseClassApi.getClass(id), adminCourseClassApi.getClassMembers(id),
        adminCourseClassApi.getClassSessions(id), adminCourseClassApi.getClassSchedules(id), adminCourseClassApi.getEmployees(),
        adminCourseClassApi.getClassEnrollments(id), adminCourseClassApi.getTeachingRates(), adminCourseClassApi.getTeachingPayments(),
      ]);
      const employeeById = new Map(employees.map((employee: any) => [String(employee.id || employee.userId), employee]));
      const staffMembers = memberRows.filter((member: any) => member.status === "ACTIVE" && (member.roleInClass === "TEACHER" || member.roleInClass === "TA"));
      const teacherMember = staffMembers.find((member: any) => member.roleInClass === "TEACHER") || staffMembers[0];
      const teacher: any = teacherMember ? employeeById.get(String(teacherMember.userId)) : null;
      const students = memberRows.filter((member: any) => member.roleInClass === "STUDENT" && member.status === "ACTIVE");
      const waitlisted = memberRows.filter((member: any) => member.roleInClass === "STUDENT" && member.status === "WAITLISTED");
      const enrollmentByUser = new Map(enrollments.map((enrollment: any) => [String(enrollment.userId), enrollment]));
      const paymentBySession = new Map(payments.map((payment: any) => [String(payment.classOnlineId), payment]));
      setStaff(staffMembers.map((member: any) => {
        const employee: any = employeeById.get(String(member.userId));
        return { ...member, name: employee?.fullName || member.username || `Nhân sự #${member.userId}`, avatar: employee?.avatarUrl || "" };
      }));
      setEnrollmentCount(enrollments.length);
      setActiveRate(rates.find((rate: any) => String(rate.classId) === String(id) && rate.status === "ACTIVE") || null);
      setCls({ id: String(row.id), code: String(row.id), name: row.name, courseId: String(row.courseId), courseName: row.courseName || "Chưa có khóa học", categoryName: row.categoryName || "Chưa có danh mục",
        type: row.packageType === "ONE_ON_ONE" ? "ONE_ON_ONE" : "GROUP_CLASS", teacher: { id: String(teacherMember?.userId || ""), name: teacher?.fullName || teacherMember?.username || "Chưa phân công", avatar: teacher?.avatarUrl || "", category: row.categoryName || "" },
        currentCapacity: row.currentMemberCount ?? students.length, maxCapacity: row.maxMembers || 0, waitlistCount: waitlisted.length,
        status: row.status === "ACTIVE" ? "OPEN" : row.status === "INACTIVE" ? "CLOSED" : "READY", startDate: row.startDate, endDate: row.endDate,
        schedule: scheduleRows.map((slot: any) => ({ dayOfWeek: (["", "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as any)[slot.dayOfWeek], startTime: slot.startTime?.substring(0, 5), endTime: slot.endTime?.substring(0, 5) })),
        members: students.map((member: any) => ({ id: `${member.classId}-${member.userId}`, enrollmentId: enrollmentByUser.get(String(member.userId))?.id ? String(enrollmentByUser.get(String(member.userId)).id) : undefined, studentId: String(member.userId), studentName: member.username, avatar: "", joinedAt: member.joinedAt, status: "ACTIVE" })),
        waitlist: waitlisted.map((member: any, index: number) => ({ id: `${member.classId}-${member.userId}`, position: index + 1, studentId: String(member.userId), studentName: member.username, avatar: "", waitlistedAt: member.waitlistedAt })),
        sessions: sessionRows.map((session: any) => { const payment: any = paymentBySession.get(String(session.id)); return ({ id: String(session.id), title: session.title, meetingUrl: session.meetingUrl, date: session.scheduledAt?.substring(0, 10), startTime: session.scheduledAt?.substring(11, 16), endTime: session.scheduledAt ? new Date(new Date(session.scheduledAt).getTime() + (session.durationMin || 0) * 60000).toTimeString().substring(0, 5) : "", status: session.status === "INACTIVE" ? "COMPLETED" : session.status === "DELETE" ? "CANCELLED" : "UPCOMING", teacherName: employeeById.get(String(session.teacherId))?.fullName || "Chưa phân công", teacherAvatar: employeeById.get(String(session.teacherId))?.avatarUrl || "", paymentStatus: payment?.status || "PENDING", amount: payment ? Number(payment.amount) : undefined, actualDurationMin: payment?.actualDurationMin }); }),
      } as Classroom);
    } catch (err: any) { setError(err?.response?.data?.message || "Không thể tải chi tiết lớp học"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadClass(); }, [id]);

  const handleConfirmRemoveStudent = async () => {
    if (!studentToRemove || !cls) return;
    try {
      await httpClient.post(`/v1/classes/${cls.id}/members/${studentToRemove.studentId}/leave`, null, { params: { reason: "Removed by administrator" } });
      setStudentToRemove(null); await loadClass();
    } catch (err: any) { setError(err?.response?.data?.message || "Không thể xóa học viên khỏi lớp"); }
  };

  const handleCloseClass = async () => {
    if (!cls) return;
    try {
      await adminCourseClassApi.updateClass(cls.id, { status: "INACTIVE" });
      await loadClass();
    } catch (err: any) { setError(err?.response?.data?.message || "Không thể đóng lớp học"); }
  };

  if (loading) return <div className="py-20 flex justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải lớp học...</div>;
  if (error || !cls) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 flex gap-2"><AlertTriangle className="h-5 w-5" /> {error || "Không tìm thấy lớp học"}</div>;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { const state = location.state as { returnTo?: string; studentId?: string } | null; navigate(state?.returnTo || "/admin/classrooms", { state: state?.studentId ? { studentId: state.studentId } : null }); }}
            className="h-9 px-3 text-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> {(location.state as any)?.studentId ? "Quay lại học viên" : "Quay lại"}
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {cls.name}
              </h1>
              <Badge variant="outline" className="font-mono text-xs">
                {cls.code}
              </Badge>
              {cls.type === "GROUP_CLASS" ? (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                  Lớp Nhóm
                </Badge>
              ) : (
                <Badge className="bg-purple-50 text-purple-700 border-purple-200">
                  1 Kèm 1
                </Badge>
              )}
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
                ● {cls.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Khóa học: <span className="font-semibold text-slate-700">{cls.courseName}</span> ({cls.categoryName})
            </p>
          </div>
        </div>

        {/* Header Action */}
        <Button onClick={() => void handleCloseClass()} disabled={cls.status === "CLOSED"} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
          <XCircle className="w-4 h-4 mr-1.5" /> Đóng Lớp Học
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Enrollment", value: enrollmentCount, hint: "Ghi danh trỏ tới lớp", icon: GraduationCap, tone: "text-blue-600 bg-blue-50" },
          { label: "Học viên đang học", value: `${cls.members.length}/${cls.maxCapacity}`, hint: `${cls.waitlist.length} đang chờ`, icon: Users, tone: "text-emerald-600 bg-emerald-50" },
          { label: "Đội ngũ lớp", value: staff.length, hint: `${staff.filter((item) => item.roleInClass === "TEACHER").length} GV · ${staff.filter((item) => item.roleInClass === "TA").length} TA`, icon: UserRoundCheck, tone: "text-violet-600 bg-violet-50" },
          { label: "Đơn giá hiện hành", value: activeRate ? `${Number(activeRate.rate).toLocaleString("vi-VN")}đ` : "Chưa có", hint: "Tính theo giờ giảng", icon: WalletCards, tone: "text-amber-600 bg-amber-50" },
        ].map((item) => <Card key={item.label} className="shadow-none border-slate-200"><CardContent className="p-4 flex items-center gap-3"><div className={`h-10 w-10 rounded-xl flex items-center justify-center ${item.tone}`}><item.icon className="h-5 w-5" /></div><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p><p className="text-lg font-bold text-slate-900">{item.value}</p><p className="text-[11px] text-slate-500">{item.hint}</p></div></CardContent></Card>)}
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
          <TabsTrigger value="members" className="data-[state=active]:bg-white font-semibold text-sm">
            <Users className="w-4 h-4 mr-1.5 text-blue-600" /> Thành viên & Enrollment
          </TabsTrigger>
          <TabsTrigger value="waitlist" className="data-[state=active]:bg-white font-semibold text-sm">
            <Clock className="w-4 h-4 mr-1.5 text-amber-600" /> Waitlist Hàng Đợi ({cls.waitlist.length})
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-white font-semibold text-sm">
            <Calendar className="w-4 h-4 mr-1.5 text-indigo-600" /> Lịch Học Lặp Tuần
          </TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-white font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" /> Buổi Học Đã/Sắp Diễn Ra
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: THÀNH VIÊN */}
        <TabsContent value="members" className="space-y-6">
          {/* Block 1: Giáo viên phụ trách */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Đội ngũ nhận lớp
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {staff.length === 0 ? <Card className="shadow-none border-dashed"><CardContent className="p-6 text-center text-sm text-slate-500">Lớp chưa có giáo viên hoặc trợ giảng nhận lớp.</CardContent></Card> : staff.map((person) => (
                <Card key={person.userId} className="border-slate-200 shadow-none"><CardContent className="p-4 flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0">{person.avatar ? <img src={person.avatar} alt={person.name} className="w-11 h-11 rounded-xl object-cover" /> : <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">{person.name.substring(0, 2).toUpperCase()}</div>}<div className="min-w-0"><h4 className="font-bold text-sm truncate">{person.name}</h4><p className="text-[11px] text-slate-500 font-mono">#{person.userId}</p></div></div><Badge className={person.roleInClass === "TEACHER" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-violet-50 text-violet-700 border-violet-200"}>{person.roleInClass === "TEACHER" ? "Giảng viên" : "Trợ giảng"}</Badge></CardContent></Card>
              ))}
            </div>
          </div>

          {/* Block 2: Danh sách học viên */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Danh Sách Học Viên ({cls.members.length}/{cls.maxCapacity})
              </h3>
            </div>
            <Card className="shadow-none border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Học Viên</TableHead>
                  <TableHead>Mã Học Viên</TableHead>
                  <TableHead>Enrollment</TableHead>
                    <TableHead>Ngày Tham Gia</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead className="text-right">Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cls.members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-slate-400 text-sm">
                        Chưa có học viên nào trong lớp này.
                      </TableCell>
                    </TableRow>
                  ) : (
                    cls.members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">{member.studentName.substring(0, 2).toUpperCase()}</div>
                            <span>{member.studentName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">
                          {member.studentId}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-blue-600">{member.enrollmentId ? `#${member.enrollmentId}` : <span className="text-amber-600">Thiếu enrollment</span>}</TableCell>
                        <TableCell className="text-xs text-slate-600">{member.joinedAt}</TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Đang Học
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-blue-600"
                              onClick={() => navigate("/admin/pending-requests")}
                            >
                              Chuyển Lớp
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-red-600 hover:bg-red-50"
                              onClick={() => setStudentToRemove(member)}
                            >
                              <UserMinus className="w-3.5 h-3.5 mr-1" /> Xóa
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: WAITLIST (FIFO Queue) */}
        <TabsContent value="waitlist" className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between text-xs text-amber-900">
            <div>
              <p className="font-bold">Danh sách chờ theo thứ tự ưu tiên (FIFO Queue)</p>
              <p className="mt-0.5">
                Hệ thống sẽ tự động đôn (promote) học viên đứng đầu danh sách khi có sĩ số trống.
              </p>
            </div>
            <Badge className="bg-amber-600 text-white font-bold">{cls.waitlist.length} Học Viên Chờ</Badge>
          </div>

          <Card className="shadow-none border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-20 text-center">Thứ Tự</TableHead>
                  <TableHead>Học Viên</TableHead>
                  <TableHead>Thời Gian Vào Waitlist</TableHead>
                  <TableHead className="text-right">Trạng Thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cls.waitlist.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-sm">
                      Không có học viên nào trong hàng đợi waitlist.
                    </TableCell>
                  </TableRow>
                ) : (
                  cls.waitlist.map((w, idx) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-center font-extrabold text-slate-700">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 inline-flex items-center justify-center text-xs">
                          #{idx + 1}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">{w.studentName.substring(0, 2).toUpperCase()}</div>
                          <span>{w.studentName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{w.waitlistedAt}</TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                          Chờ Đột Phá Lớp
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 3: LỊCH HỌC */}
        <TabsContent value="schedule" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Khung Lịch Học Tuần Cố Định</h3>
            <Button variant="outline" size="sm">
              <Edit className="w-3.5 h-3.5 mr-1.5" /> Sửa Khung Lịch
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center">
            {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"].map((day, idx) => {
              const dayKeys = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
              const slot = cls.schedule.find((s) => s.dayOfWeek === dayKeys[idx]);

              return (
                <Card
                  key={idx}
                  className={`border shadow-none p-3 flex flex-col justify-between h-32 ${
                    slot ? "border-blue-500 bg-blue-50/50" : "border-slate-200 bg-slate-50/50 opacity-60"
                  }`}
                >
                  <span className="font-bold text-xs text-slate-700 block border-b pb-1">
                    {day}
                  </span>
                  {slot ? (
                    <div className="space-y-1 my-auto">
                      <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5">
                        Lớp Học
                      </Badge>
                      <p className="text-xs font-bold text-slate-900">
                        {slot.startTime} - {slot.endTime}
                      </p>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 my-auto">Nghỉ</span>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 4: BUỔI HỌC ĐÃ/SẮP DIỄN RA */}
        <TabsContent value="sessions" className="space-y-4">
          <Card className="shadow-none border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Buổi học online</TableHead>
                  <TableHead>Khung Giờ</TableHead>
                  <TableHead>Trạng Thái Buổi Học</TableHead>
                  <TableHead>Giáo Viên Dạy Buổi Đó</TableHead>
                  <TableHead className="text-right">Thanh Toán Buổi Dạy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cls.sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-slate-400 text-sm">
                      Chưa có dữ liệu buổi học diễn ra.
                    </TableCell>
                  </TableRow>
                ) : (
                  cls.sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell><p className="font-semibold text-slate-900 text-xs">{s.title || `Buổi học ${s.date}`}</p><p className="text-[11px] text-slate-500 mt-0.5">{s.date}</p></TableCell>
                      <TableCell className="text-xs font-mono">{s.startTime} - {s.endTime}</TableCell>
                      <TableCell>
                        {s.status === "COMPLETED" ? (
                          <Badge className="bg-emerald-100 text-emerald-800">Đã Diễn Ra</Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800">Sắp Diễn Ra</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-bold">{s.teacherName.substring(0, 2).toUpperCase()}</div>
                          <div><span className="text-xs font-medium text-slate-800 block">{s.teacherName}</span>{s.meetingUrl && <a href={s.meetingUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1">Vào phòng học <ExternalLink className="h-3 w-3" /></a>}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {s.amount !== undefined ? <div className="space-y-1"><p className="font-bold text-sm text-slate-900">{s.amount.toLocaleString("vi-VN")}đ</p><Badge className={s.paymentStatus === "PAID" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : s.paymentStatus === "CONFIRMED" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}>{s.paymentStatus}</Badge>{s.actualDurationMin ? <p className="text-[10px] text-slate-500">{s.actualDurationMin} phút thực dạy</p> : null}</div> : <Badge variant="outline" className="text-slate-500">Chưa tạo payment</Badge>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog for Removing Student */}
      <Dialog
        open={Boolean(studentToRemove)}
        onOpenChange={(open) => !open && setStudentToRemove(null)}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" /> Xác Nhận Xóa Học Viên Khỏi Lớp
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa học viên{" "}
              <span className="font-bold text-slate-900">{studentToRemove?.studentName}</span> khỏi{" "}
              <span className="font-bold text-slate-900">{cls.name}</span> không?
            </DialogDescription>
          </DialogHeader>

          {/* Alert Callout for Cascade Consequence */}
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <p className="font-bold">⚠️ Hệ quả dây chuyền (Cascade Notification):</p>
            <p>
              Hành động này sẽ <span className="font-extrabold underline">tự động đôn (promote)</span> học viên đang đứng đầu trong hàng đợi waitlist lên học chính thức ngay lập tức!
            </p>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setStudentToRemove(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmRemoveStudent}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              Xác Nhận Xóa & Promote Waitlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
