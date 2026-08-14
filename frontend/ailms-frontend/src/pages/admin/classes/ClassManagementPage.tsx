import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChangeTeacherModal } from "@/components/admin/class/ChangeTeacherModal";
import { EditScheduleModal } from "@/components/admin/class/EditScheduleModal";
import {
  Plus,
  Search,
  Users,
  AlertTriangle,
  UserCheck,
  Eye,
  Loader2,
  LayoutGrid,
  List,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  XCircle,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import type { Classroom, ClassStatus } from "@/types/adminCourseClass";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";
import { formatDateDisplay } from "@/components/ui/DatePickerInput";

export const ClassManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();

  const isTeacherRoute = location.pathname.startsWith("/teacher");
  const userRoles = (auth.user?.roles || []).map((r) => String(r).toUpperCase());
  const isAdminOrHR = userRoles.some((r) => r.includes("ADMIN") || r.includes("HR")) && !isTeacherRoute;
  const classDetailPath = (classId: string) => isAdminOrHR ? `/admin/classes/${classId}` : `/teacher/classes/${classId}`;

  const [classes, setClasses] = useState<Classroom[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // View Mode: Grid or Table
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedCategoryName, setSelectedCategoryName] = useState("Tất cả danh mục");
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [categorySearchKeyword, setCategorySearchKeyword] = useState("");
  const [categoryPage, setCategoryPage] = useState(0);

  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const [selectedTeacher, setSelectedTeacher] = useState("ALL");
  const [selectedTeacherName, setSelectedTeacherName] = useState("Tất cả giáo viên");
  const [teacherPopoverOpen, setTeacherPopoverOpen] = useState(false);
  const [teacherSearchKeyword, setTeacherSearchKeyword] = useState("");
  const [teacherPage, setTeacherPage] = useState(0);

  // Operation Modals
  const [changeTeacherTarget, setChangeTeacherTarget] = useState<Classroom | null>(null);
  const [editScheduleTarget, setEditScheduleTarget] = useState<Classroom | null>(null);
  const [toggleStatusTarget, setToggleStatusTarget] = useState<{ cls: Classroom; nextStatus: "OPEN" | "CLOSED" } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [classRows, courseRows, categoryRows, employeeRows, teacherCategoryRows] = await Promise.all([
        isAdminOrHR ? adminCourseClassApi.getClasses() : adminCourseClassApi.getMyTeachingClasses(),
        adminCourseClassApi.getCourses(),
        adminCourseClassApi.getCategories(),
        isAdminOrHR ? adminCourseClassApi.getEmployees() : Promise.resolve([]),
        isAdminOrHR ? Promise.resolve([]) : adminCourseClassApi.getMyTeacherCategories().catch(() => []),
      ]);

      const courseById = new Map(courseRows.map((item: any) => [String(item.id), item]));
      const employeeById = new Map(
        employeeRows.map((item: any) => [String(item.id || item.userId), item])
      );
      const memberRows = await Promise.all(
        classRows.map((item: any) => adminCourseClassApi.getClassMembers(item.id))
      );

      setTeachers(
        employeeRows.filter((employee: any) => {
          const text = [employee.position, ...(employee.roles || [])].join(" ").toUpperCase();
          return text.includes("TEACHER") || text.includes("ROLE_TA") || text.includes("TRỢ GIẢNG") || text.includes("GIẢNG VIÊN");
        })
      );

      const currentUserId = String(auth.user?.id || "");
      const currentUsername = String(auth.user?.username || "").toLowerCase();

      const parsedClasses = classRows.map((item: any, index: number) => {
        const members = memberRows[index] || [];
        const teacherMember = members.find(
          (member: any) =>
            member.status === "ACTIVE" &&
            (member.roleInClass === "TEACHER" || member.roleInClass === "TA")
        );
        const teacher = teacherMember ? employeeById.get(String(teacherMember.userId)) : null;
        const course = courseById.get(String(item.courseId));
        const activeStudents = members.filter(
          (member: any) => member.status === "ACTIVE" && member.roleInClass === "STUDENT"
        );
        const waitlisted = members.filter((member: any) => member.status === "WAITLISTED");

        const realCode = item.code || item.classCode || String(item.id || "");
        const memberUserIds = members.map((m: any) => String(m.userId));
        const memberUsernames = members.map((m: any) => String(m.username || "").toLowerCase());

        return {
          id: String(item.id),
          code: String(realCode),
          name: item.name,
          courseId: String(item.courseId),
          courseName: item.courseName || course?.name || "Chưa có khóa học",
          categoryName: item.categoryName || course?.categoryName || "Chưa có danh mục",
          type: item.packageType === "ONE_ON_ONE" ? "ONE_ON_ONE" : "GROUP_CLASS",
          teacher: {
            id: String(teacherMember?.userId || item.teacherId || ""),
            name: teacher?.fullName || teacherMember?.username || item.teacherName || "Chưa phân công",
            avatar: teacher?.avatarUrl || "",
            category: item.categoryName || "",
          },
          currentCapacity: item.currentMemberCount ?? activeStudents.length,
          maxCapacity: item.maxMembers || (item.packageType === "ONE_ON_ONE" ? 1 : 0),
          waitlistCount: waitlisted.length,
          status: item.status === "ACTIVE" ? "OPEN" : item.status === "INACTIVE" ? "CLOSED" : "READY",
          startDate: item.startDate,
          endDate: item.endDate,
          schedule: [],
          members: activeStudents,
          waitlist: waitlisted,
          sessions: [],
          _allMemberUserIds: memberUserIds,
          _allMemberUsernames: memberUsernames,
        } as any;
      });

      let userClasses = parsedClasses;
      if (!isAdminOrHR) {
        userClasses = parsedClasses.filter((c: any) => {
          const isMainTeacherId = currentUserId && String(c.teacher.id) === currentUserId;
          const isMainTeacherName = currentUsername && c.teacher.name.toLowerCase().includes(currentUsername);
          const isMemberUserId = currentUserId && c._allMemberUserIds.includes(currentUserId);
          const isMemberUsername = currentUsername && c._allMemberUsernames.includes(currentUsername);

          return isMainTeacherId || isMainTeacherName || isMemberUserId || isMemberUsername;
        });

      }

      const visibleCategoryNames = new Set(
        isAdminOrHR
          ? categoryRows.map((category: any) => category.name)
          : [
              ...teacherCategoryRows
                .filter((item: any) => !item.status || item.status === "ACTIVE")
                .map((item: any) => item.categoryName),
              ...userClasses.map((item: any) => item.categoryName),
            ]
      );
      const visibleCategories = categoryRows.filter((category: any) => visibleCategoryNames.has(category.name));
      setCategories(visibleCategories);
      if (selectedCategory !== "ALL" && !visibleCategoryNames.has(selectedCategory)) {
        setSelectedCategory("ALL");
        setSelectedCategoryName("Tất cả danh mục");
      }

      setClasses(userClasses);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể tải dữ liệu lớp học từ máy chủ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Metrics
  const totalOpenClasses = classes.filter((c) => c.status === "OPEN" || c.status === "READY").length;
  const nearCapacityClasses = classes.filter((c) => {
    if (c.type === "ONE_ON_ONE" || !c.maxCapacity) return false;
    return c.currentCapacity / c.maxCapacity >= 0.8;
  }).length;
  const classesWithWaitlist = classes.filter((c) => c.waitlistCount > 0).length;

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.courseName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "ALL" || c.categoryName === selectedCategory;
      const matchesType = selectedType === "ALL" || c.type === selectedType;
      const matchesStatus = selectedStatus === "ALL" || c.status === selectedStatus;
      const matchesTeacher = !isAdminOrHR || selectedTeacher === "ALL" || c.teacher.id === selectedTeacher;

      return matchesSearch && matchesCategory && matchesType && matchesStatus && matchesTeacher;
    });
  }, [classes, searchTerm, selectedCategory, selectedType, selectedStatus, selectedTeacher, isAdminOrHR]);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(8);
  const [jumpPageInput, setJumpPageInput] = useState("1");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, selectedCategory, selectedType, selectedStatus, selectedTeacher]);

  const totalElements = filteredClasses.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));

  const displayedClasses = useMemo(() => {
    return filteredClasses.slice(page * pageSize, (page + 1) * pageSize);
  }, [filteredClasses, page, pageSize]);

  const getPageNumbers = (current: number, total: number) => {
    const pages: (number | string)[] = [];
    if (total <= 7) {
      for (let i = 0; i < total; i++) pages.push(i);
    } else {
      pages.push(0);
      if (current > 2) pages.push("...");
      const start = Math.max(1, current - 1);
      const end = Math.min(total - 2, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 3) pages.push("...");
      pages.push(total - 1);
    }
    return pages;
  };

  // Paginated Categories
  const filteredCategories = categories.filter((cat) => {
    if (!categorySearchKeyword.trim()) return true;
    return cat.name?.toLowerCase().includes(categorySearchKeyword.toLowerCase());
  });
  const categoryTotalPages = Math.max(1, Math.ceil(filteredCategories.length / 5));
  const paginatedCategories = filteredCategories.slice(categoryPage * 5, (categoryPage + 1) * 5);

  // Paginated Teachers
  const filteredTeacherList = teachers.filter((t) => {
    if (!teacherSearchKeyword.trim()) return true;
    return t.fullName?.toLowerCase().includes(teacherSearchKeyword.toLowerCase());
  });
  const teacherTotalPages = Math.max(1, Math.ceil(filteredTeacherList.length / 5));
  const paginatedTeacherList = filteredTeacherList.slice(teacherPage * 5, (teacherPage + 1) * 5);



  const handleExecuteToggleStatus = async () => {
    if (!toggleStatusTarget) return;
    try {
      const targetStatus = toggleStatusTarget.nextStatus === "OPEN" ? "ACTIVE" : "INACTIVE";
      await adminCourseClassApi.updateClass(toggleStatusTarget.cls.id, { status: targetStatus });

      // Automatically sync Course Package status: Hide package on Close, Reactivate on Open
      if (toggleStatusTarget.cls.courseId) {
        try {
          const packages = await adminCourseClassApi.getPackagesByCourse(toggleStatusTarget.cls.courseId);
          if (packages && packages.length > 0) {
            await Promise.all(
              packages.map((pkg: any) =>
                adminCourseClassApi.updatePackage(pkg.id, {
                  ...pkg,
                  status: targetStatus,
                }).catch(() => null)
              )
            );
          }
        } catch (pkgErr) {
          console.warn("Package status sync notice:", pkgErr);
        }
      }

      setToggleStatusTarget(null);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Lỗi cập nhật trạng thái lớp học");
    }
  };

  const getStatusBadge = (status: ClassStatus) => {
    switch (status) {
      case "OPEN":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
            Open
          </Badge>
        );
      case "READY":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-semibold">
            READY
          </Badge>
        );
      case "CLOSED":
      default:
        return (
          <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20 font-semibold">
            CLOSED
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-foreground" />
            {isAdminOrHR ? "Quản Lý Lớp Học" : "Lớp Học Đảm Nhận"}
          </h1>
          <p className="text-sm text-foreground/80 mt-1">
            {isAdminOrHR
              ? "Quản lý và vận hành các lớp học online"
              : "Danh sách các lớp học được phân công cho bạn đảm nhận"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-foreground text-white shadow-xs font-semibold"
                  : "text-foreground/80 hover:bg-foreground/20 hover:text-foreground"
              }`}
              title="Giao diện Dạng Lưới (Grid)"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Lưới</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg m-1 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-foreground text-white shadow-xs font-semibold"
                  : "text-foreground/80 hover:bg-foreground/20 hover:text-foreground"
              }`}
              title="Giao diện Dạng Bảng (Table)"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Bảng</span>
            </button>
          </div>

          {isAdminOrHR && (
            <Button
              onClick={() => navigate("/admin/classes/create")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Tạo Lớp Học Mới
            </Button>
          )}
        </div>
      </div>

      {/* 3 Metric Cards */}
      {isAdminOrHR && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-none bg-white rounded-2xl">
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

        <Card className="border-slate-200 shadow-none bg-white rounded-2xl">
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

        <Card className="border-slate-200 shadow-none bg-white rounded-2xl">
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
      )}

      {/* Filter Bar with Popovers */}
      <Card className="shadow-none border-slate-200 bg-slate-50/50 rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdminOrHR ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-3`}>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm mã code hoặc tên lớp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white h-10 text-xs rounded-xl"
              />
            </div>

            {/* Category Popover Filter */}
            <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
              <PopoverTrigger
                nativeButton={true}
                render={
                  <Button
                    variant="outline"
                    type="button"
                    className="h-10 w-full justify-between rounded-xl text-xs text-foreground/80 bg-white border-input cursor-pointer"
                  >
                    <span className="truncate">{selectedCategoryName}</span>
                    <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
                  </Button>
                }
              />
              <PopoverContent className="w-72 p-3 space-y-2 rounded-2xl shadow-xl" align="start">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Tìm danh mục..."
                    value={categorySearchKeyword}
                    onChange={(e) => {
                      setCategorySearchKeyword(e.target.value);
                      setCategoryPage(0);
                    }}
                    className="pl-8 h-8 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("ALL");
                      setSelectedCategoryName("Tất cả danh mục");
                      setCategoryPopoverOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm flex items-center justify-between transition-colors ${
                      selectedCategory === "ALL" ? "bg-foreground text-white" : "hover:bg-foreground"
                    }`}
                  >
                    <span>Tất cả danh mục</span>
                    {selectedCategory === "ALL" && <Check className="h-3.5 w-3.5" />}
                  </button>

                  {paginatedCategories.map((c) => {
                    const isSel = c.name === selectedCategory;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(c.name);
                          setSelectedCategoryName(c.name);
                          setCategoryPopoverOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm flex items-center justify-between transition-colors ${
                          isSel ? "bg-foreground text-white" : "hover:bg-foreground"
                        }`}
                      >
                        <span className="truncate pr-2">{c.name}</span>
                        {isSel && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {filteredCategories.length > 5 && (
                  <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={categoryPage === 0}
                      onClick={() => setCategoryPage((p) => Math.max(0, p - 1))}
                      className="h-6 px-1.5 text-[11px]"
                    >
                      <ChevronLeft className="h-3 w-3" /> Trước
                    </Button>
                    <span>Trang {categoryPage + 1}/{categoryTotalPages}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={categoryPage >= categoryTotalPages - 1}
                      onClick={() => setCategoryPage((p) => p + 1)}
                      className="h-6 px-1.5 text-[11px]"
                    >
                      Sau <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Class Type */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-white h-10 text-xs rounded-xl">
                <SelectValue placeholder="Loại lớp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả loại lớp</SelectItem>
                <SelectItem value="GROUP_CLASS">Lớp Nhóm</SelectItem>
                <SelectItem value="ONE_ON_ONE">1 Kèm 1</SelectItem>
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="bg-white h-10 text-xs rounded-xl">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="OPEN">Đang mở</SelectItem>
                <SelectItem value="READY">Sẵn sàng</SelectItem>
                <SelectItem value="CLOSED">Đã đóng</SelectItem>
              </SelectContent>
            </Select>

            {/* Teacher Popover Filter */}
            {isAdminOrHR && (
            <Popover open={teacherPopoverOpen} onOpenChange={setTeacherPopoverOpen}>
              <PopoverTrigger
                nativeButton={true}
                render={
                  <Button
                    variant="outline"
                    type="button"
                    className="h-10 w-full justify-between rounded-xl font-normal text-xs bg-white border-input cursor-pointer"
                  >
                    <span className="truncate">{selectedTeacherName}</span>
                    <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
                  </Button>
                }
              />
              <PopoverContent className="w-72 p-3 space-y-2 rounded-2xl shadow-xl" align="start">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Tìm giáo viên..."
                    value={teacherSearchKeyword}
                    onChange={(e) => {
                      setTeacherSearchKeyword(e.target.value);
                      setTeacherPage(0);
                    }}
                    className="pl-8 h-8 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeacher("ALL");
                      setSelectedTeacherName("Tất cả giáo viên");
                      setTeacherPopoverOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      selectedTeacher === "ALL" ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                    }`}
                  >
                    <span>Tất cả giáo viên</span>
                    {selectedTeacher === "ALL" && <Check className="h-3.5 w-3.5" />}
                  </button>

                  {paginatedTeacherList.map((t) => {
                    const tId = String(t.id || t.userId);
                    const isSel = tId === selectedTeacher;
                    return (
                      <button
                        key={tId}
                        type="button"
                        onClick={() => {
                          setSelectedTeacher(tId);
                          setSelectedTeacherName(t.fullName);
                          setTeacherPopoverOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          isSel ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                        }`}
                      >
                        <span className="truncate pr-2">{t.fullName}</span>
                        {isSel && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {filteredTeacherList.length > 5 && (
                  <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={teacherPage === 0}
                      onClick={() => setTeacherPage((p) => Math.max(0, p - 1))}
                      className="h-6 px-1.5 text-[11px]"
                    >
                      <ChevronLeft className="h-3 w-3" /> Trước
                    </Button>
                    <span>Trang {teacherPage + 1}/{teacherTotalPages}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={teacherPage >= teacherTotalPages - 1}
                      onClick={() => setTeacherPage((p) => p + 1)}
                      className="h-6 px-1.5 text-[11px]"
                    >
                      Sau <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading / Error / Empty States */}
      {loading && (
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Đang tải lớp học...
        </div>
      )}
      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> {error}
        </div>
      )}
      {!loading && !error && filteredClasses.length === 0 && (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-slate-500">
          Không tìm thấy lớp học nào phù hợp với bộ lọc.
        </div>
      )}

      {/* VIEW MODE 1: GRID VIEW */}
      {!loading && !error && filteredClasses.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayedClasses.map((cls) => {
            const capacityRatio = cls.maxCapacity ? cls.currentCapacity / cls.maxCapacity : 0;
            const isNearFull = cls.type === "GROUP_CLASS" && capacityRatio >= 0.8;

            return (
              <Card
                key={cls.id}
                className="border border-border/30 bg-brand-sky/10 hover:-translate-y-2 shadow-2xs hover:shadow-md transition-all rounded-3xl overflow-hidden flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Card Header: Code & Type & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-semibold text-white bg-primary px-1.5 py-0.5 rounded-xl">
                          {cls.code}
                        </code>
                        {cls.type === "GROUP_CLASS" ? (
                          <Badge className="bg-primary text-white border-border/30 py-0.5 font-semibold text-xs">
                            Nhóm
                          </Badge>
                        ) : (
                          <Badge className="bg-foreground text-white border-border/30 font-semibold text-xs">
                            1-1
                          </Badge>
                        )}
                      </div>
                    </div>

                    {getStatusBadge(cls.status)}
                  </div>

                  {/* Course & Category */}
                  <div className="space-y-1 text-xs text-foreground bg-white/80 p-2.5 rounded-xl">
                    <p className="truncate text-lg text-foreground/80" onClick={() => navigate(classDetailPath(cls.id))}>
                      Khóa học: <span className="font-bold text-foreground">{cls.courseName}</span>
                    </p>
                    <p className="text-sm text-foreground/80">Danh mục: {cls.categoryName}</p>
                  </div>

                  {/* Teacher Info */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-2">
                      {cls.teacher.avatar ? (
                        <img
                          src={cls.teacher.avatar}
                          alt={cls.teacher.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-foreground/80 flex items-center justify-center text-xs font-bold">
                          {cls.teacher.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-foreground/80">{cls.teacher.name}</span>
                    </div>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className={isNearFull ? "text-accent/80 font-bold" : "text-foreground/80"}>
                        Sĩ số: {cls.currentCapacity} / {cls.maxCapacity || "1"}
                      </span>
                      {cls.waitlistCount > 0 ? (
                        <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px]">
                          {cls.waitlistCount} chờ
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {Math.round(capacityRatio * 100)}% đầy
                        </span>
                      )}
                    </div>
                    <Progress
                      value={capacityRatio * 100}
                      className={`h-2 ${isNearFull ? "[&>div]:bg-amber-500" : "[&>div]:bg-blue-600"}`}
                    />
                  </div>

                  {/* Schedule dates if present */}
                  {cls.startDate && (
                    <div className="text-xs text-foreground/80 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-foreground shrink-0" />
                      <span>
                        Khai giảng: {formatDateDisplay(cls.startDate)}
                      </span>
                    </div>
                  )}

                  {/* Quick Action Operations */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                    {isAdminOrHR && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setChangeTeacherTarget(cls)}
                        className="h-8 px-2 text-[11px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="Đổi giảng viên nhận lớp"
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" /> Đổi GV
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditScheduleTarget(cls)}
                        className="h-8 px-2 text-[11px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="Chỉnh sửa khung lịch học"
                      >
                        <Calendar className="h-3.5 w-3.5 mr-1" /> Sửa Lịch
                      </Button>
                    </div>
                    )}

                    <div className="flex items-center gap-1">
                      {isAdminOrHR && (cls.status === "OPEN" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setToggleStatusTarget({ cls, nextStatus: "CLOSED" })}
                          className="h-8 px-2 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Đóng Lớp
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setToggleStatusTarget({ cls, nextStatus: "OPEN" })}
                          className="h-8 px-2 text-[11px] font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mở Lớp
                        </Button>
                      ))}

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => navigate(classDetailPath(cls.id))}
                        className="h-8 px-2.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg cursor-pointer shadow-xs"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Xem
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: TABLE VIEW */}
      {!loading && !error && filteredClasses.length > 0 && viewMode === "table" && (
        <Card className="shadow-none border-slate-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-56">Mã Code & Tên Lớp</TableHead>
                <TableHead>Khóa Học</TableHead>
                <TableHead>Loại Lớp</TableHead>
                <TableHead>Giáo Viên Phụ Trách</TableHead>
                <TableHead className="w-40">Sĩ Số</TableHead>
                <TableHead className="text-center">Waitlist</TableHead>
                <TableHead>Trạng Thái</TableHead>
                <TableHead className="text-right">Thao Tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedClasses.map((cls) => {
                const capacityRatio = cls.maxCapacity ? cls.currentCapacity / cls.maxCapacity : 0;
                const isNearFull = cls.type === "GROUP_CLASS" && capacityRatio >= 0.8;

                return (
                  <TableRow
                    key={cls.id}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                    onClick={() => navigate(classDetailPath(cls.id))}
                  >
                    <TableCell className="font-semibold text-slate-900">
                      <div>
                        <p className="hover:text-blue-600 font-bold">{cls.name}</p>
                        <code className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md font-bold">
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
                        {cls.teacher.avatar ? (
                          <img
                            src={cls.teacher.avatar}
                            alt={cls.teacher.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                            {cls.teacher.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-medium text-slate-800">
                          {cls.teacher.name}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {cls.type === "ONE_ON_ONE" ? (
                        <div className="text-xs font-semibold text-slate-700">1 / 1 (Cố định)</div>
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
                      <div className="flex items-center justify-end gap-1">
                        {isAdminOrHR && (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setChangeTeacherTarget(cls)}
                              className="h-8 px-2 text-[11px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Đổi giảng viên phụ trách"
                            >
                              <UserPlus className="h-3.5 w-3.5 mr-1" /> Đổi GV
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditScheduleTarget(cls)}
                              className="h-8 px-2 text-[11px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Chỉnh sửa khung lịch học"
                            >
                              <Calendar className="h-3.5 w-3.5 mr-1" /> Sửa Lịch
                            </Button>

                            {cls.status === "OPEN" ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setToggleStatusTarget({ cls, nextStatus: "CLOSED" })}
                                className="h-8 px-2 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Đóng Lớp
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setToggleStatusTarget({ cls, nextStatus: "OPEN" })}
                                className="h-8 px-2 text-[11px] font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mở Lớp
                              </Button>
                            )}
                          </>
                        )}

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => navigate(classDetailPath(cls.id))}
                          className="h-8 px-2.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg cursor-pointer shadow-xs"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Xem
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* RoleManagement Style Pagination Footer Bar */}
      {!loading && !error && filteredClasses.length > 0 && (
        <div className="px-5 py-3.5 rounded-2xl border border-border/40 bg-card flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium shadow-xs">
          <div className="text-foreground/80 text-xs font-semibold">
            Hiển thị <span className="font-semibold text-foreground/80">{totalElements === 0 ? 0 : page * pageSize + 1}</span> đến{" "}
            <span className="font-bold text-foreground">{Math.min((page + 1) * pageSize, totalElements)}</span> trên{" "}
            <span className="font-bold text-foreground">{totalElements}</span> lớp học
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-foreground/80 text-xs">Số lớp/trang:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-16 text-xs text-foreground/80 bg-background border border-border/30 rounded-xl font-bold cursor-pointer">
                  <SelectValue placeholder={String(pageSize)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="16">16</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const pNum = parseInt(jumpPageInput, 10);
                if (!isNaN(pNum) && pNum >= 1 && pNum <= totalPages) setPage(pNum - 1);
              }}
              className="flex items-center gap-1.5"
            >
              <span className="text-muted-foreground">Tới trang:</span>
              <Input
                type="number"
                min={1}
                max={totalPages || 1}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                className="h-8 w-14 text-center text-foreground/80 text-xs font-semibold bg-background border border-border/30 rounded-xl"
              />
            </form>

            <div className="flex items-center gap-1">
              <Button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold rounded-xl cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Trước
              </Button>
              {getPageNumbers(page, totalPages).map((p, idx) => {
                if (p === "...")
                  return (
                    <span key={`dots-${idx}`} className="px-1 text-muted-foreground">
                      ...
                    </span>
                  );
                const pageNum = p as number;
                const isCurrent = pageNum === page;
                return (
                  <Button
                    key={pageNum}
                    variant={isCurrent ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className={`h-8 min-w-8 text-xs font-bold rounded-xl cursor-pointer ${
                      isCurrent ? "bg-primary text-primary-foreground" : ""
                    }`}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
              <Button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Sau <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Teacher Modal */}
      {isAdminOrHR && changeTeacherTarget && (
        <ChangeTeacherModal
          open={Boolean(changeTeacherTarget)}
          onClose={() => setChangeTeacherTarget(null)}
          classId={changeTeacherTarget.id}
          className={changeTeacherTarget.name}
          currentTeacherName={changeTeacherTarget.teacher.name}
          onSuccess={loadData}
        />
      )}

      {/* Edit Schedule Modal */}
      {isAdminOrHR && editScheduleTarget && (
        <EditScheduleModal
          open={Boolean(editScheduleTarget)}
          onClose={() => setEditScheduleTarget(null)}
          classId={editScheduleTarget.id}
          className={editScheduleTarget.name}
          currentStartDate={editScheduleTarget.startDate}
          currentEndDate={editScheduleTarget.endDate}
          onSuccess={loadData}
        />
      )}

      {/* Toggle Status Confirmation Dialog */}
      {isAdminOrHR && toggleStatusTarget && (
        <ConfirmDialog
          open={Boolean(toggleStatusTarget)}
          onOpenChange={(val: boolean) => !val && setToggleStatusTarget(null)}
          title={toggleStatusTarget.nextStatus === "CLOSED" ? "Xác nhận Đóng Lớp Học & Ẩn Gói Học" : "Xác nhận Mở Lớp Học & Active Gói Học"}
          description={
            toggleStatusTarget.nextStatus === "CLOSED"
              ? `Bạn có chắc chắn muốn Đóng lớp học "${toggleStatusTarget.cls.name}" không? Hành động này sẽ TỰ ĐỘNG ẨN (INACTIVE) Gói học nhóm liên kết khỏi hệ thống.`
              : `Bạn có chắc chắn muốn Mở lại lớp học "${toggleStatusTarget.cls.name}" không? Hành động này sẽ TỰ ĐỘNG ACTIVE lại Gói học nhóm liên kết.`
          }
          onConfirm={handleExecuteToggleStatus}
          confirmText={toggleStatusTarget.nextStatus === "CLOSED" ? "Đóng Lớp & Ẩn Gói Học" : "Mở Lớp & Active Gói Học"}
          cancelText="Hủy"
          variant={toggleStatusTarget.nextStatus === "CLOSED" ? "destructive" : "default"}
        />
      )}
    </div>
  );
};
