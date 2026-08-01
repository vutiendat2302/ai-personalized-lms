import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Users,
  AlertTriangle,
  UserCheck,
  Eye,
  Loader2,
} from "lucide-react";
import type { Classroom, ClassStatus } from "@/types/adminCourseClass";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";

export const ClassManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedTeacher, setSelectedTeacher] = useState("ALL");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [classRows, courseRows, categoryRows, employeeRows] = await Promise.all([
          adminCourseClassApi.getClasses(), adminCourseClassApi.getCourses(),
          adminCourseClassApi.getCategories(), adminCourseClassApi.getEmployees(),
        ]);
        const courseById = new Map(courseRows.map((item: any) => [String(item.id), item]));
        const employeeById = new Map(employeeRows.map((item: any) => [String(item.id || item.userId), item]));
        const memberRows = await Promise.all(classRows.map((item: any) => adminCourseClassApi.getClassMembers(item.id)));
        setCategories(categoryRows);
        setTeachers(employeeRows.filter((employee: any) => {
          const text = [employee.position, ...(employee.roles || [])].join(" ").toUpperCase();
          return text.includes("TEACHER") || text.includes("ROLE_TA") || text.includes("TRỢ GIẢNG");
        }));
        setClasses(classRows.map((item: any, index: number) => {
          const members = memberRows[index] || [];
          const teacherMember = members.find((member: any) => member.status === "ACTIVE" && (member.roleInClass === "TEACHER" || member.roleInClass === "TA"));
          const teacher = teacherMember ? employeeById.get(String(teacherMember.userId)) : null;
          const course = courseById.get(String(item.courseId));
          const activeStudents = members.filter((member: any) => member.status === "ACTIVE" && member.roleInClass === "STUDENT");
          const waitlisted = members.filter((member: any) => member.status === "WAITLISTED");
          return {
            id: String(item.id), code: String(item.id), name: item.name,
            courseId: String(item.courseId), courseName: item.courseName || course?.name || "Chưa có khóa học",
            categoryName: item.categoryName || course?.categoryName || "Chưa có danh mục",
            type: item.packageType === "ONE_ON_ONE" ? "ONE_ON_ONE" : "GROUP_CLASS",
            teacher: { id: String(teacherMember?.userId || ""), name: teacher?.fullName || teacherMember?.username || "Chưa phân công", avatar: teacher?.avatarUrl || "", category: item.categoryName || "" },
            currentCapacity: item.currentMemberCount ?? activeStudents.length,
            maxCapacity: item.maxMembers || (item.packageType === "ONE_ON_ONE" ? 1 : 0),
            waitlistCount: waitlisted.length,
            status: item.status === "ACTIVE" ? "OPEN" : item.status === "INACTIVE" ? "CLOSED" : "READY",
            startDate: item.startDate, endDate: item.endDate, schedule: [], members: activeStudents, waitlist: waitlisted, sessions: [],
          } as Classroom;
        }));
      } catch (err: any) {
        setError(err?.response?.data?.message || "Không thể tải dữ liệu lớp học từ máy chủ");
      } finally { setLoading(false); }
    };
    void load();
  }, []);

  // Metrics
  const totalOpenClasses = classes.filter((c) => c.status === "OPEN" || c.status === "READY").length;
  const nearCapacityClasses = classes.filter((c) => {
    if (c.type === "ONE_ON_ONE") return false;
    return c.currentCapacity / c.maxCapacity >= 0.8;
  }).length;
  const classesWithWaitlist = classes.filter((c) => c.waitlistCount > 0).length;

  const filteredClasses = useMemo(() => classes.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "ALL" || c.categoryName === selectedCategory;
    const matchesType = selectedType === "ALL" || c.type === selectedType;
    const matchesStatus = selectedStatus === "ALL" || c.status === selectedStatus;
    const matchesTeacher =
      selectedTeacher === "ALL" || c.teacher.id === selectedTeacher;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesType &&
      matchesStatus &&
      matchesTeacher
    );
  }), [classes, searchTerm, selectedCategory, selectedType, selectedStatus, selectedTeacher]);

  const getStatusBadge = (status: ClassStatus) => {
    switch (status) {
      case "OPEN":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
            ● Đang Mở Học (OPEN)
          </Badge>
        );
      case "READY":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-medium">
            ● Sẵn Sàng Bán (READY)
          </Badge>
        );
      case "CLOSED":
      default:
        return (
          <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20 font-medium">
            ● Đã Đóng (CLOSED)
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Quản Lý Lớp Học
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý sĩ số, waitlist và phân công vận hành các lớp học online
          </p>
        </div>
        <Button
          onClick={() => navigate("/admin/classes/create")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Tạo Lớp Học Mới
        </Button>
      </div>

      {/* 3 Compact Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <Card className="border-slate-200 shadow-none bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Lớp Đang Mở / Sẵn Sàng
              </p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                {totalOpenClasses}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="border-slate-200 shadow-none bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Lớp Gần Đầy Chỗ (&gt;80%)
              </p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">
                {nearCapacityClasses}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="border-slate-200 shadow-none bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Lớp Có Waitlist Đang Chờ
              </p>
              <p className="text-2xl font-extrabold text-purple-600 mt-1">
                {classesWithWaitlist}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-none border-slate-200 bg-slate-50/50">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm mã hoặc tên lớp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white h-9 text-sm"
              />
            </div>

            {/* Category */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-white h-9 text-sm">
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả danh mục</SelectItem>
                {categories.map((category) => <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Class Type */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-white h-9 text-sm">
                <SelectValue placeholder="Loại lớp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả loại lớp</SelectItem>
                <SelectItem value="GROUP_CLASS">Lớp Nhóm (GROUP_CLASS)</SelectItem>
                <SelectItem value="ONE_ON_ONE">1 Kèm 1 (ONE_ON_ONE)</SelectItem>
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="bg-white h-9 text-sm">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="OPEN">Đang mở (OPEN)</SelectItem>
                <SelectItem value="READY">Sẵn sàng (READY)</SelectItem>
                <SelectItem value="CLOSED">Đã đóng (CLOSED)</SelectItem>
              </SelectContent>
            </Select>

            {/* Teacher */}
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger className="bg-white h-9 text-sm">
                <SelectValue placeholder="Giáo viên phụ trách" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả giáo viên</SelectItem>
                {teachers.map((teacher) => <SelectItem key={teacher.id || teacher.userId} value={String(teacher.id || teacher.userId)}>{teacher.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading && <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải lớp học...</div>}
      {!loading && error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> {error}</div>}
      {!loading && !error && filteredClasses.length === 0 && <div className="rounded-xl border border-dashed p-12 text-center text-sm text-slate-500">Không có lớp học phù hợp.</div>}

      {/* Class Data Table */}
      {!loading && !error && filteredClasses.length > 0 && <Card className="shadow-none border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-60">Mã & Tên Lớp</TableHead>
              <TableHead>Khóa Học</TableHead>
              <TableHead>Loại Lớp</TableHead>
              <TableHead>Giáo Viên Phụ Trách</TableHead>
              <TableHead className="w-45">Sĩ Số</TableHead>
              <TableHead className="text-center">Waitlist</TableHead>
              <TableHead>Trạng Thái</TableHead>
              <TableHead className="text-right">Thao Tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClasses.map((cls) => {
              const capacityRatio = cls.currentCapacity / cls.maxCapacity;
              const isNearFull = cls.type === "GROUP_CLASS" && capacityRatio >= 0.8;

              return (
                <TableRow
                  key={cls.id}
                  className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  onClick={() => navigate(`/admin/classes/${cls.id}`)}
                >
                  <TableCell className="font-semibold text-slate-900">
                    <div>
                      <p className="hover:text-blue-600 font-bold">{cls.name}</p>
                      <code className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {cls.code}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    <span className="line-clamp-1">{cls.courseName}</span>
                  </TableCell>
                  <TableCell>
                    {cls.type === "GROUP_CLASS" ? (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs">
                        Lớp Nhóm
                      </Badge>
                    ) : (
                      <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-semibold text-xs">
                        1 Kèm 1
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {cls.teacher.avatar ? <img src={cls.teacher.avatar} alt={cls.teacher.name} className="w-7 h-7 rounded-full object-cover" /> : <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">{cls.teacher.name.substring(0, 2).toUpperCase()}</div>}
                      <span className="text-xs font-medium text-slate-800">
                        {cls.teacher.name}
                      </span>
                    </div>
                  </TableCell>

                  {/* Capacity Cell with Progress Bar */}
                  <TableCell>
                    {cls.type === "ONE_ON_ONE" ? (
                      <div className="text-xs font-semibold text-slate-700">
                        1 / 1 (Cố định)
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className={isNearFull ? "text-amber-600 font-bold" : "text-slate-700"}>
                            {cls.currentCapacity} / {cls.maxCapacity}
                          </span>
                          <span className="text-slate-400 font-normal">
                            {Math.round(capacityRatio * 100)}%
                          </span>
                        </div>
                        <Progress
                          value={capacityRatio * 100}
                          className={`h-1.5 ${isNearFull ? "[&>div]:bg-amber-500" : "[&>div]:bg-blue-600"}`}
                        />
                      </div>
                    )}
                  </TableCell>

                  {/* Waitlist Badge */}
                  <TableCell className="text-center">
                    {cls.waitlistCount > 0 ? (
                      <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 font-bold">
                        {cls.waitlistCount} chờ
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">0</span>
                    )}
                  </TableCell>

                  <TableCell>{getStatusBadge(cls.status)}</TableCell>

                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => navigate(`/admin/classes/${cls.id}`)}
                    >
                      <Eye className="w-4 h-4 text-slate-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>}
    </div>
  );
};
