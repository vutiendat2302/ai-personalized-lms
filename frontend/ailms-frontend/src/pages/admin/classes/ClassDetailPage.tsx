import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
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
  MessageSquare,
  FileText,
  UserPlus,
  Eye,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Classroom, ClassMember, ClassScheduleSlot } from "@/types/adminCourseClass";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";
import httpClient from "@/api/httpClient";
import { ClassroomStreamTab } from "@/components/admin/class/ClassroomStreamTab";
import { ClassResourceStorageTab } from "@/components/admin/class/ClassResourceStorageTab";
import { ChangeTeacherModal } from "@/components/admin/class/ChangeTeacherModal";
import { EditScheduleModal } from "@/components/admin/class/EditScheduleModal";
import { MemberDetailModal } from "@/components/admin/class/MemberDetailModal";

const stableRowKey = (prefix: string, index: number, ...values: unknown[]) => {
  const value = values.find((item) => item !== undefined && item !== null && String(item).trim() !== "");
  return value !== undefined ? `${prefix}-${String(value)}-${index}` : `${prefix}-${index}`;
};

export const ClassDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const isTeacherRoute = location.pathname.startsWith("/teacher");
  const isStudentRoute = location.pathname.startsWith("/student");
  const userRoles = (auth.user?.roles || []).map((role) => String(role).toUpperCase());
  const isAdminOrHR = userRoles.some((role) => role.includes("ADMIN") || role.includes("HR")) && !isTeacherRoute;
  const backPath = isStudentRoute ? "/student/classes" : isAdminOrHR ? "/admin/classrooms" : "/teacher/classes";

  const [cls, setCls] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("stream");
  const [staff, setStaff] = useState<any[]>([]);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [activeRate, setActiveRate] = useState<any | null>(null);

  // Operation Modals
  const [changeTeacherOpen, setChangeTeacherOpen] = useState(false);
  const [editScheduleOpen, setEditScheduleOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  // Remove student confirmation dialog state
  const [studentToRemove, setStudentToRemove] = useState<ClassMember | null>(null);

  // Members Pagination
  const [membersPage, setMembersPage] = useState(0);
  const [membersSize, setMembersSize] = useState(6);
  const [membersJumpPage, setMembersJumpPage] = useState("");
  const [membersTotalElements, setMembersTotalElements] = useState(0);
  const [membersTotalPages, setMembersTotalPages] = useState(1);

  // Sessions Filtering & Pagination
  const [sessionSearchKeyword, setSessionSearchKeyword] = useState("");
  const [sessionStatusFilter, setSessionStatusFilter] = useState("ALL");
  const [sessionSortDirection, setSessionSortDirection] = useState<"DESC" | "ASC">("DESC");
  const [sessionsPage, setSessionsPage] = useState(0);
  const [sessionsSize, setSessionsSize] = useState(6);
  const [sessionsJumpPage, setSessionsJumpPage] = useState("");
  const [sessionsTotalElements, setSessionsTotalElements] = useState(0);
  const [sessionsTotalPages, setSessionsTotalPages] = useState(1);

  const loadClass = async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const [row, memberRows, memberPageRows, sessionPageRows, scheduleRows, employees, enrollments, rates, payments] = await Promise.all([
        adminCourseClassApi.getClass(id),
        adminCourseClassApi.getClassMembers(id),
        adminCourseClassApi.getClassMembersPage(id, { role: "STUDENT", status: "ACTIVE", page: membersPage, size: membersSize }),
        adminCourseClassApi.getClassSessionsPage(id, {
          keyword: sessionSearchKeyword.trim() || undefined,
          status: sessionStatusFilter === "ALL" ? undefined : sessionStatusFilter,
          page: sessionsPage,
          size: sessionsSize,
          sortDirection: sessionSortDirection,
        }),
        adminCourseClassApi.getClassSchedules(id),
        isAdminOrHR ? adminCourseClassApi.getEmployees() : Promise.resolve([]),
        isStudentRoute ? Promise.resolve([]) : adminCourseClassApi.getClassEnrollments(id),
        isStudentRoute ? Promise.resolve([]) : adminCourseClassApi.getTeachingRates(),
        isStudentRoute ? Promise.resolve([]) : adminCourseClassApi.getTeachingPayments(),
      ]);

      const employeeById = new Map(employees.map((employee: any) => [String(employee.id || employee.userId), employee]));
      const staffMembers = memberRows.filter((member: any) => member.status === "ACTIVE" && (member.roleInClass === "TEACHER" || member.roleInClass === "TA"));
      if (!isAdminOrHR) {
        const currentUserId = String(auth.user?.id || "");
        const currentUsername = String(auth.user?.username || "").toLowerCase();
        const eligibleMembers = isStudentRoute
          ? memberRows.filter((member: any) => member.status === "ACTIVE")
          : staffMembers;
        const canView = eligibleMembers.some((member: any) => {
          const memberUserId = String(member.userId || "");
          const memberUsername = String(member.username || "").toLowerCase();
          return (currentUserId && memberUserId === currentUserId) || (currentUsername && memberUsername === currentUsername);
        });
        if (!canView) {
          throw new Error("Bạn không có quyền xem lớp học này");
        }
      }

      const teacherMember = staffMembers.find((member: any) => member.roleInClass === "TEACHER");
      const teacherEmployee = teacherMember ? employeeById.get(String(teacherMember.userId)) : null;
      const currentTeacher = teacherMember ? {
        id: String(teacherMember.userId),
        name: teacherMember.fullName || teacherMember.username || "Chưa phân công",
        email: teacherMember.email || "",
        avatar: teacherEmployee?.avatarUrl || teacherMember.avatarUrl || "",
        category: row.categoryName || row.categoryEntity?.name || "",
      } : { id: "", name: "Chưa phân công", email: "", avatar: "", category: "" };

      const now = new Date();
      const activeTeachingRate = rates
        .filter((item: any) => String(item.status || "").toUpperCase() === "ACTIVE")
        .filter((item: any) => !teacherMember || String(item.employeeId) === String(teacherMember.userId))
        .filter((item: any) => !item.classId || String(item.classId) === String(row.id))
        .filter((item: any) => !item.effectiveFrom || new Date(item.effectiveFrom) <= now)
        .filter((item: any) => !item.effectiveTo || new Date(item.effectiveTo) >= now)
        .sort((a: any, b: any) => {
          const aClassScore = a.classId && String(a.classId) === String(row.id) ? 1 : 0;
          const bClassScore = b.classId && String(b.classId) === String(row.id) ? 1 : 0;
          if (aClassScore !== bClassScore) return bClassScore - aClassScore;
          return new Date(b.effectiveFrom || 0).getTime() - new Date(a.effectiveFrom || 0).getTime();
        })[0] || null;
      setActiveRate(activeTeachingRate);

      const dayNameMap: Record<number | string, ClassScheduleSlot["dayOfWeek"]> = {
        1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT", 7: "SUN",
        MON: "MON", TUE: "TUE", WED: "WED", THU: "THU", FRI: "FRI", SAT: "SAT", SUN: "SUN",
      };

      const mappedSchedules = scheduleRows.map((schedule: any) => ({
        id: String(schedule.id),
        dayOfWeek: dayNameMap[schedule.dayOfWeek] || "MON",
        startTime: schedule.startTime ? schedule.startTime.substring(0, 5) : "",
        endTime: schedule.endTime ? schedule.endTime.substring(0, 5) : "",
      }));

      const activeStudentRows = memberRows.filter((member: any) => member.status === "ACTIVE" && member.roleInClass === "STUDENT");
      const pagedMemberRows = memberPageRows?.content || [];
      setMembersTotalElements(Number(memberPageRows?.totalElements || 0));
      setMembersTotalPages(Math.max(1, Number(memberPageRows?.totalPages || 1)));

      const activeMembers = pagedMemberRows.map((member: any) => {
        const memberUserId = member.userId ?? member.user?.id ?? member.accountUserId;
        const memberId = member.id ?? member.memberId ?? memberUserId;
        const matchedEnrollment = enrollments.find((item: any) => String(item.studentId) === String(memberUserId) || String(item.userId) === String(memberUserId));
        return {
          id: memberId != null ? String(memberId) : "",
          studentId: memberUserId != null ? String(memberUserId) : "",
          studentCode: member.studentCode,
          studentName: member.fullName || member.username || "Chưa có tên",
          avatar: member.avatarUrl || "",
          enrollmentId: matchedEnrollment ? String(matchedEnrollment.id) : undefined,
          joinedAt: member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("vi-VN") : "Chưa có",
          status: "ACTIVE" as const,
        };
      });

      const waitlistMembers = memberRows.filter((member: any) => member.status === "WAITLISTED").map((member: any, idx: number) => {
        const memberUserId = member.userId ?? member.user?.id ?? member.accountUserId;
        const memberId = member.id ?? member.memberId ?? memberUserId;
        return {
          id: memberId != null ? String(memberId) : "",
          position: idx + 1,
          studentId: memberUserId != null ? String(memberUserId) : "",
          studentName: member.fullName || member.username || "Chưa có tên",
          avatar: member.avatarUrl || "",
          waitlistedAt: member.waitlistedAt ? new Date(member.waitlistedAt).toLocaleDateString("vi-VN") : "Chưa có",
        };
      });

      setStaff(staffMembers.map((item: any) => {
        const staffUserId = item.userId ?? item.user?.id ?? item.accountUserId;
        const employee = employeeById.get(String(staffUserId));
        return {
          id: item.id != null ? String(item.id) : "",
          userId: staffUserId != null ? String(staffUserId) : "",
          name: item.fullName || item.username || "Chưa có tên",
          employeeCode: employee?.employeeCode || "",
          roleInClass: item.roleInClass,
          avatar: employee?.avatarUrl || item.avatarUrl,
        };
      }));

      setEnrollmentCount(enrollments.length);

      setCls({
        id: String(row.id),
        code: row.code || row.classCode || String(row.id),
        name: row.name || "Chưa có tên lớp",
        courseId: String(row.courseId || row.courseEntity?.id || ""),
        courseName: row.courseName || row.courseEntity?.name || "Chưa có khóa học",
        categoryName: row.categoryName || row.categoryEntity?.name || "Chưa có danh mục",
        type: row.packageType === "ONE_ON_ONE" ? "ONE_ON_ONE" : "GROUP_CLASS",
        status: row.status === "ACTIVE" ? "OPEN" : "CLOSED",
        teacher: currentTeacher,
        currentCapacity: activeStudentRows.length,
        maxCapacity: row.maxMembers || 0,
        startDate: row.startDate ? new Date(row.startDate).toLocaleDateString("vi-VN") : "Chưa có",
        endDate: row.endDate ? new Date(row.endDate).toLocaleDateString("vi-VN") : "Chưa có",
        startDateRaw: row.startDate || "",
        endDateRaw: row.endDate || "",
        members: activeMembers,
        waitlist: waitlistMembers,
        waitlistCount: waitlistMembers.length,
        schedule: mappedSchedules,
        sessions: (sessionPageRows?.content || []).map((session: any) => {
          const matchedPayment = payments.find((item: any) => String(item.classOnlineId) === String(session.id));
          const isCancelled = session.status === "DELETED" || session.status === "DELETE" || session.status === "CANCELLED";
          const isCompleted = !isCancelled && (session.status === "INACTIVE" || (session.scheduledAt && new Date(session.scheduledAt) < new Date()));
          return {
            id: String(session.id),
            date: session.scheduledAt ? new Date(session.scheduledAt).toLocaleDateString("vi-VN") : "Chưa có",
            startTime: session.scheduledAt ? new Date(session.scheduledAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "",
            endTime: session.scheduledAt && session.durationMin ? new Date(new Date(session.scheduledAt).getTime() + session.durationMin * 60000).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "",
            status: isCancelled ? "CANCELLED" : isCompleted ? "COMPLETED" : "UPCOMING",
            teacherName: currentTeacher.name,
            teacherAvatar: currentTeacher.avatar,
            title: session.title,
            meetingUrl: session.meetingUrl,
            amount: matchedPayment ? Number(matchedPayment.amount) : undefined,
            paymentStatus: matchedPayment?.status,
            actualDurationMin: matchedPayment?.actualDurationMin,
          };
        }),
      });

      setSessionsTotalElements(Number(sessionPageRows?.totalElements || 0));
      setSessionsTotalPages(Math.max(1, Number(sessionPageRows?.totalPages || 1)));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Không thể tải chi tiết lớp học");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClass();
  }, [id, membersPage, membersSize, sessionsPage, sessionsSize, sessionSearchKeyword, sessionStatusFilter, sessionSortDirection, isAdminOrHR, isStudentRoute, auth.user?.id, auth.user?.username]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  const handleCloseClass = async () => {
    if (!cls) return;
    try {
      await adminCourseClassApi.updateClass(cls.id, { status: "INACTIVE" });
      if (cls.courseId) {
        const packages = await adminCourseClassApi.getPackagesByCourse(cls.courseId);
        if (packages && packages.length > 0) {
          await Promise.all(
            packages.map((pkg: any) =>
              adminCourseClassApi.updatePackage(pkg.id, { ...pkg, status: "INACTIVE" }).catch(() => null)
            )
          );
        }
      }
      await loadClass();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Lỗi đóng lớp học");
    }
  };

  const handleConfirmRemoveStudent = async () => {
    if (!cls || !studentToRemove) return;
    try {
      await httpClient.post(`/v1/classes/${cls.id}/members/${studentToRemove.studentId}/leave`, null);
      setStudentToRemove(null);
      await loadClass();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể xóa học viên khỏi lớp");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6" aria-label="Đang tải chi tiết lớp học">
        <Skeleton className="h-20" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28" />)}</div>
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !cls) {
    return (
      <div className="p-8 space-y-4">
        <Button variant="ghost" onClick={() => navigate(backPath)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
        </Button>
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> {error || "Không tìm thấy dữ liệu lớp học"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(backPath)}
            className="rounded-xl border-slate-200"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {cls.name}
              </h1>
              <code className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
                {cls.code}
              </code>
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

        {/* Header Action Buttons */}
        {isAdminOrHR && (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setChangeTeacherOpen(true)}
            variant="outline"
            size="sm"
            className="text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer rounded-xl font-semibold"
          >
            <UserPlus className="w-4 h-4 mr-1.5" /> Đổi Giảng Viên
          </Button>

          <Button
            onClick={() => setEditScheduleOpen(true)}
            variant="outline"
            size="sm"
            className="text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer rounded-xl font-semibold"
          >
            <Calendar className="w-4 h-4 mr-1.5 text-indigo-600" /> Sửa Lịch Học
          </Button>

          {cls.status === "CLOSED" ? (
            <Button
              onClick={() => void adminCourseClassApi.updateClass(cls.id, { status: "ACTIVE" }).then(loadClass)}
              variant="outline"
              size="sm"
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 cursor-pointer rounded-xl font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mở Lớp Học
            </Button>
          ) : (
            <Button
              onClick={() => void handleCloseClass()}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 cursor-pointer rounded-xl font-semibold"
            >
              <XCircle className="w-4 h-4 mr-1.5" /> Đóng Lớp Học
            </Button>
          )}
        </div>
        )}
      </div>

      {!isStudentRoute && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Enrollment", value: enrollmentCount, hint: "Ghi danh trỏ tới lớp", icon: GraduationCap, tone: "text-blue-600 bg-blue-50" },
          { label: "Học viên đang học", value: `${cls.members.length}/${cls.maxCapacity}`, hint: `${cls.waitlist.length} đang chờ`, icon: Users, tone: "text-emerald-600 bg-emerald-50" },
          { label: "Đội ngũ lớp", value: staff.length, hint: `${staff.filter((item) => item.roleInClass === "TEACHER").length} GV · ${staff.filter((item) => item.roleInClass === "TA").length} TA`, icon: UserRoundCheck, tone: "text-violet-600 bg-violet-50" },
          { label: "Đơn giá hiện hành", value: activeRate ? `${Number(activeRate.rate).toLocaleString("vi-VN")}đ` : "Chưa có", hint: "Tính theo giờ giảng", icon: WalletCards, tone: "text-amber-600 bg-amber-50" },
        ].map((item) => (
          <Card key={item.label} className="shadow-none border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${item.tone}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="text-lg font-bold text-slate-900">{item.value}</p>
                <p className="text-[11px] text-slate-500">{item.hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>}

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-2xl flex-wrap">
          <TabsTrigger value="stream" className="data-[state=active]:bg-white font-semibold text-xs sm:text-sm rounded-xl cursor-pointer">
            <MessageSquare className="w-4 h-4 mr-1.5 text-purple-600" /> Bảng Tin Classroom Stream
          </TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-white font-semibold text-xs sm:text-sm rounded-xl cursor-pointer">
            <Users className="w-4 h-4 mr-1.5 text-emerald-600" /> Thành Viên & Enrollment
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-white font-semibold text-xs sm:text-sm rounded-xl cursor-pointer">
            <Calendar className="w-4 h-4 mr-1.5 text-indigo-600" /> Lịch Học Lặp Tuần
          </TabsTrigger>
          <TabsTrigger value="resources" className="data-[state=active]:bg-white font-semibold text-xs sm:text-sm rounded-xl cursor-pointer">
            <FileText className="w-4 h-4 mr-1.5 text-blue-600" /> Kho Tài Liệu Lớp Học
          </TabsTrigger>
          <TabsTrigger value="waitlist" className="data-[state=active]:bg-white font-semibold text-xs sm:text-sm rounded-xl cursor-pointer">
            <Clock className="w-4 h-4 mr-1.5 text-amber-600" /> Waitlist Hàng Đợi ({cls.waitlist.length})
          </TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-white font-semibold text-xs sm:text-sm rounded-xl cursor-pointer">
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-teal-600" /> Buổi Học Đã/Sắp Diễn Ra
          </TabsTrigger>
        </TabsList>

        {/* TAB GOOGLE CLASSROOM STREAM */}
        <TabsContent value="stream">
          <ClassroomStreamTab
            classId={cls.id}
            className={cls.name}
            currentUserName={isStudentRoute ? auth.user?.fullName || auth.user?.username || "Học viên" : cls.teacher?.name || "Giảng viên / Quản trị viên"}
            currentUserRole={isStudentRoute ? "STUDENT" : isAdminOrHR ? "ADMIN" : "TEACHER"}
          />
        </TabsContent>

        {/* TAB CLASS RESOURCE STORAGE */}
        <TabsContent value="resources">
          <ClassResourceStorageTab
            classId={cls.id}
            className={cls.name}
            membersCount={cls.members.length}
            currentUserName={cls.teacher?.name || "Giảng viên"}
            currentUserRole={isStudentRoute ? "STUDENT" : isAdminOrHR ? "ADMIN" : "TEACHER"}
          />
        </TabsContent>

        {/* TAB 1: THÀNH VIÊN */}
        <TabsContent value="members" className="space-y-6">
          {/* Block 1: Giáo viên phụ trách */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Đội ngũ nhận lớp
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {staff.length === 0 ? (
                <Card className="shadow-none border-dashed">
                  <CardContent className="p-6 text-center text-sm text-slate-500">
                    Lớp chưa có giáo viên hoặc trợ giảng nhận lớp.
                  </CardContent>
                </Card>
              ) : (
                staff.map((person, idx) => (
                  <Card key={stableRowKey("staff", idx, person.id, person.userId)} className="border-slate-200 shadow-none">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {person.avatar ? (
                          <img src={person.avatar} alt={person.name} className="w-11 h-11 rounded-xl object-cover" />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                            {person.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm truncate">{person.name}</h4>
                          <p className="text-[11px] text-slate-500 font-mono">Mã GV: {person.employeeCode || "Chưa có"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={person.roleInClass === "TEACHER" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-violet-50 text-violet-700 border-violet-200"}>
                          {person.roleInClass === "TEACHER" ? "Giảng viên" : "Trợ giảng"}
                        </Badge>
                        {!isStudentRoute && <Button
                          variant="ghost"
                          size="sm"
                          disabled={!person.userId}
                          onClick={() => setDetailUserId(person.userId)}
                          className="h-8 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Chi Tiết
                        </Button>}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Block 2: Danh sách học viên */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Danh Sách Học Viên ({membersTotalElements || cls.members.length}/{cls.maxCapacity})
              </h3>
            </div>
            <Card className="shadow-none border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Họ & Tên Học Viên</TableHead>
                    <TableHead>Mã Học Viên</TableHead>
                    <TableHead>Ngày Tham Gia</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead className="text-right">Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cls.members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-slate-400 text-sm">
                        Chưa có học viên nào trong lớp này.
                      </TableCell>
                    </TableRow>
                  ) : (
                    cls.members.map((member, idx) => (
                      <TableRow key={stableRowKey("member", idx, member.id, member.studentId)}>
                        <TableCell className="font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                              {member.studentName.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold">{member.studentName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-700">
                          {member.studentCode || "Chưa có mã"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{member.joinedAt}</TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Đang Học
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(!isStudentRoute || String(member.studentId) === String(auth.user?.id)) && <Button
                              variant="ghost"
                              size="sm"
                              disabled={!member.studentId}
                              className="h-8 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg gap-1"
                              onClick={() => setDetailUserId(member.studentId)}
                            >
                              <Eye className="h-3.5 w-3.5" /> Xem Chi Tiết
                            </Button>}
                            {isAdminOrHR && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-red-600 hover:bg-red-50 rounded-lg"
                              onClick={() => setStudentToRemove(member)}
                            >
                              <UserMinus className="w-3.5 h-3.5 mr-1" /> Xóa
                            </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Members Pagination Footer Bar */}
              <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span>Hiển thị</span>
                  <Select
                    value={String(membersSize)}
                    onValueChange={(val) => {
                      setMembersSize(Number(val));
                      setMembersPage(0);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs bg-white w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>dòng/trang • Tổng {membersTotalElements || cls.members.length} học viên</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={membersPage === 0}
                      onClick={() => setMembersPage((p) => Math.max(0, p - 1))}
                      className="h-7 w-7 p-0 rounded-lg"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="font-bold px-1">
                      {membersPage + 1} / {membersTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={membersPage >= membersTotalPages - 1}
                      onClick={() => setMembersPage((p) => Math.min(membersTotalPages - 1, p + 1))}
                      className="h-7 w-7 p-0 rounded-lg"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <span>Nhảy trang:</span>
                    <Input
                      type="number"
                      min={1}
                      max={membersTotalPages}
                      value={membersJumpPage}
                      onChange={(e) => setMembersJumpPage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const p = parseInt(membersJumpPage, 10) - 1;
                          if (!isNaN(p) && p >= 0 && p < membersTotalPages) {
                            setMembersPage(p);
                            setMembersJumpPage("");
                          }
                        }
                      }}
                      className="h-7 w-12 text-xs text-center p-0 bg-white"
                    />
                  </div>
                </div>
              </div>
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
                    <TableRow key={stableRowKey("waitlist", idx, w.id, w.studentId)}>
                      <TableCell className="text-center font-extrabold text-slate-700">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 inline-flex items-center justify-center text-xs">
                          #{idx + 1}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">
                            {w.studentName.substring(0, 2).toUpperCase()}
                          </div>
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
            {isAdminOrHR && (
            <Button variant="outline" size="sm" onClick={() => setEditScheduleOpen(true)}>
              <Edit className="w-3.5 h-3.5 mr-1.5" /> Sửa Khung Lịch
            </Button>
            )}
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
          {/* Toolbar: Search, Status Filter & Date Sort */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Tìm kiếm buổi học theo tiêu đề hoặc ngày..."
                value={sessionSearchKeyword}
                onChange={(e) => {
                  setSessionSearchKeyword(e.target.value);
                  setSessionsPage(0);
                }}
                className="pl-8 text-xs bg-white rounded-xl h-8"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Select
                value={sessionStatusFilter}
                onValueChange={(val) => {
                  setSessionStatusFilter(val);
                  setSessionsPage(0);
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-white w-36 rounded-xl font-medium">
                  <SelectValue placeholder="Lọc trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="UPCOMING">Sắp Diễn Ra</SelectItem>
                  <SelectItem value="COMPLETED">Đã Diễn Ra</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSessionSortDirection((prev) => (prev === "DESC" ? "ASC" : "DESC"))}
                className="h-8 text-xs bg-white rounded-xl font-medium gap-1"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-indigo-600" />
                Ngày dạy: {sessionSortDirection === "DESC" ? "Mới nhất" : "Cũ nhất"}
              </Button>
            </div>
          </div>

          <Card className="shadow-none border-slate-200 overflow-hidden">
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
                      Không tìm thấy dữ liệu buổi học nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  cls.sessions.map((s, idx) => (
                    <TableRow key={stableRowKey("session", idx, s.id)}>
                      <TableCell>
                        <p className="font-semibold text-slate-900 text-xs">{s.title || `Buổi học ${s.date}`}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{s.date}</p>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{s.startTime} - {s.endTime}</TableCell>
                      <TableCell>
                        {s.status === "COMPLETED" ? (
                          <Badge className="bg-emerald-100 text-emerald-800">Đã Diễn Ra</Badge>
                        ) : s.status === "CANCELLED" ? (
                          <Badge className="bg-red-100 text-red-800">Đã Hủy</Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800">Sắp Diễn Ra</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-bold">
                            {s.teacherName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-medium text-slate-800 block">{s.teacherName}</span>
                            {s.meetingUrl && (
                              <a href={s.meetingUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1">
                                Vào phòng học <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {s.amount !== undefined ? (
                          <div className="space-y-1">
                            <p className="font-bold text-sm text-slate-900">{s.amount.toLocaleString("vi-VN")}đ</p>
                            <Badge className={s.paymentStatus === "PAID" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : s.paymentStatus === "CONFIRMED" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                              {s.paymentStatus}
                            </Badge>
                            {s.actualDurationMin ? <p className="text-[10px] text-slate-500">{s.actualDurationMin} phút thực dạy</p> : null}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-slate-500">Chưa tạo payment</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Sessions Pagination Footer Bar */}
            <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Hiển thị</span>
                <Select
                  value={String(sessionsSize)}
                  onValueChange={(val) => {
                    setSessionsSize(Number(val));
                    setSessionsPage(0);
                  }}
                >
                  <SelectTrigger className="h-7 text-xs bg-white w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                  </SelectContent>
                </Select>
                <span>dòng/trang • Tổng {sessionsTotalElements || cls.sessions.length} buổi học</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sessionsPage === 0}
                    onClick={() => setSessionsPage((p) => Math.max(0, p - 1))}
                    className="h-7 w-7 p-0 rounded-lg"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="font-bold px-1">
                    {sessionsPage + 1} / {sessionsTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sessionsPage >= sessionsTotalPages - 1}
                    onClick={() => setSessionsPage((p) => Math.min(sessionsTotalPages - 1, p + 1))}
                    className="h-7 w-7 p-0 rounded-lg"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <span>Nhảy trang:</span>
                  <Input
                    type="number"
                    min={1}
                    max={sessionsTotalPages}
                    value={sessionsJumpPage}
                    onChange={(e) => setSessionsJumpPage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const p = parseInt(sessionsJumpPage, 10) - 1;
                        if (!isNaN(p) && p >= 0 && p < sessionsTotalPages) {
                          setSessionsPage(p);
                          setSessionsJumpPage("");
                        }
                      }
                    }}
                    className="h-7 w-12 text-xs text-center p-0 bg-white"
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Member Detail Modal */}
      {detailUserId && (
        <MemberDetailModal
          open={Boolean(detailUserId)}
          onClose={() => setDetailUserId(null)}
          classId={cls.id}
          userId={detailUserId}
        />
      )}

      {/* Remove student confirmation dialog */}
      {isAdminOrHR && (
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
              <span className="font-bold text-slate-900">{studentToRemove?.studentName}</span> khỏi lớp học này không?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setStudentToRemove(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmRemoveStudent}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              Xác Nhận Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Change Teacher Modal */}
      {isAdminOrHR && cls && changeTeacherOpen && (
        <ChangeTeacherModal
          open={changeTeacherOpen}
          onClose={() => setChangeTeacherOpen(false)}
          classId={cls.id}
          className={cls.name}
          currentTeacherName={cls.teacher?.name}
          onSuccess={loadClass}
        />
      )}

      {/* Edit Schedule Modal */}
      {isAdminOrHR && cls && editScheduleOpen && (
        <EditScheduleModal
          open={editScheduleOpen}
          onClose={() => setEditScheduleOpen(false)}
          classId={cls.id}
          className={cls.name}
          currentStartDate={cls.startDateRaw}
          currentEndDate={cls.endDateRaw}
          onSuccess={loadClass}
        />
      )}
    </div>
  );
};
