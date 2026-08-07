import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { courseApi } from "@/api/courses/courseApi";
import { teacherCategoryApi } from "@/api/courses/teacherCategoryApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FolderTree,
  Plus,
  Search,
  UserPlus,
  Trash2,
  BookOpen,
  Users,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Eye,
  Mail,
  Phone,
  Building2,
  CalendarDays,
  Layers3,
  Star,
  BadgeDollarSign,
  BarChart3,
  Link2,
  ExternalLink,
} from "lucide-react";

export const CategoryTeacherAssignPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [detailClassMembers, setDetailClassMembers] = useState<any[]>([]);
  const [detailClassesError, setDetailClassesError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [assignedTeacherSearch, setAssignedTeacherSearch] = useState("");
  const [teacherTypeFilter, setTeacherTypeFilter] = useState<"ALL" | "TEACHER" | "TA">("ALL");

  // Assign Dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [assignRoleFilter, setAssignRoleFilter] = useState<"ALL" | "TEACHER" | "TA">("ALL");
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  // Unassign Dialog state
  const [unassignTarget, setUnassignTarget] = useState<any | null>(null);
  const [detailTarget, setDetailTarget] = useState<any | null>(null);
  const [courseDetail, setCourseDetail] = useState<any | null>(null);
  const [courseDetailLoading, setCourseDetailLoading] = useState(false);
  const [courseDetailError, setCourseDetailError] = useState<string | null>(null);

  // Create category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  // Banner notify
  const [bannerMsg, setBannerMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const showBanner = (text: string, isError = false) => {
    setBannerMsg({ text, isError });
    setTimeout(() => setBannerMsg(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [catsRes, linksRes, empRes, coursesRes, classesRes] = await Promise.all([
        courseApi.getAllCategories(),
        teacherCategoryApi.list(),
        teacherCategoryApi.employees(),
        courseApi.getAllCourses(),
        teacherCategoryApi.classes(),
      ]);

      const catList = catsRes.data?.data || [];
      setCategories(catList);
      setLinks(linksRes || []);
      setEmployees(empRes || []);
      setCourses(coursesRes.data?.data || []);
      setClasses(classesRes || []);

      if (catList.length > 0 && !selectedCategory) {
        setSelectedCategory(catList[0]);
      } else if (selectedCategory) {
        const updated = catList.find((c: any) => String(c.id) === String(selectedCategory.id));
        if (updated) setSelectedCategory(updated);
      }
    } catch (err: any) {
      showBanner("Lỗi khi tải dữ liệu phân công giảng viên", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Filtered categories by search
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return categories;
    return categories.filter((c) =>
      c.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
    );
  }, [categories, categorySearchQuery]);

  // Teachers currently assigned to selected category
  const assignedTeachers = useMemo(() => {
    if (!selectedCategory) return [];
    return links.filter(
      (l) => String(l.categoryId) === String(selectedCategory.id) && l.status === "ACTIVE"
    );
  }, [links, selectedCategory]);

  const getEmployeeForTeacher = (teacher: any) =>
    employees.find(
      (employee) => String(employee.id || employee.userId) === String(teacher.employeeId)
    );

  const isTeachingAssistant = (teacher: any) => {
    const employee = getEmployeeForTeacher(teacher) || {};
    const roleText = [
      employee.position,
      ...(Array.isArray(employee.roles) ? employee.roles : []),
      teacher.position,
    ]
      .filter(Boolean)
      .join(" ")
      .toUpperCase();
    return roleText.includes("ROLE_TA") || roleText.includes("TEACHING_ASSISTANT") ||
      /(^|[\s/_-])TA($|[\s/_-])/.test(roleText) || roleText.includes("TRỢ GIẢNG");
  };

  const filteredAssignedTeachers = useMemo(() => {
    const keyword = assignedTeacherSearch.trim().toLowerCase();
    return assignedTeachers.filter((teacher) => {
      const employee = getEmployeeForTeacher(teacher) || {};
      const isTA = isTeachingAssistant(teacher);
      const matchesType = teacherTypeFilter === "ALL" || (teacherTypeFilter === "TA" ? isTA : !isTA);
      const searchableText = [
        teacher.employeeName,
        teacher.employeeCode,
        employee.fullName,
        employee.userEmail,
        employee.email,
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesType && (!keyword || searchableText.includes(keyword));
    });
  }, [assignedTeachers, assignedTeacherSearch, teacherTypeFilter, employees]);

  // Active courses taught by teacher in current category
  const getActiveCoursesForTeacher = (teacher: any) => {
    if (!selectedCategory) return [];
    return courses.filter(
      (c) =>
        String(c.categoryId) === String(selectedCategory.id) &&
        (String(c.createdBy) === String(teacher.employeeId) || String(c.teacherId) === String(teacher.employeeId))
    );
  };

  const getClassesForTeacher = (teacher: any) => {
    const teacherClassIds = new Set(
      detailClassMembers
        .filter((item) =>
          String(item.userId) === String(teacher.employeeId) &&
          (item.roleInClass === "TEACHER" || item.roleInClass === "TA") &&
          item.status === "ACTIVE"
        )
        .map((item) => String(item.classId))
    );
    return classes.filter(
      (item) =>
        teacherClassIds.has(String(item.id)) &&
        (!selectedCategory || String(item.categoryId) === String(selectedCategory.id))
    );
  };

  const handleOpenTeacherDetail = async (teacher: any) => {
    setDetailTarget(teacher);
    setDetailClassMembers([]);
    setDetailClassesError(null);
    try {
      setDetailClassMembers(await teacherCategoryApi.classMembers(teacher.employeeId) || []);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Không thể tải danh sách lớp học từ máy chủ";
      setDetailClassesError(message);
      showBanner(message, true);
    }
  };

  const handleOpenUnassign = async (teacher: any) => {
    setDetailClassMembers([]);
    setDetailClassesError(null);
    try {
      setDetailClassMembers(await teacherCategoryApi.classMembers(teacher.employeeId) || []);
    } catch (error: any) {
      setDetailClassesError(error?.response?.data?.message || "Không thể kiểm tra lớp học phụ trách");
    }
    setUnassignTarget(teacher);
  };

  const handleOpenCourseDetail = async (course: any) => {
    setCourseDetail(course);
    setCourseDetailError(null);
    setCourseDetailLoading(true);
    try {
      const response = await courseApi.getCourseById(String(course.id));
      if (!response.data?.data) {
        throw new Error("API không trả về dữ liệu khóa học");
      }
      setCourseDetail(response.data.data);
    } catch (error: any) {
      setCourseDetailError(
        error?.response?.data?.message || error?.message || "Không thể tải chi tiết khóa học"
      );
    } finally {
      setCourseDetailLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const response = await courseApi.createCategory({
        name,
        description: newCategoryDescription.trim() || undefined,
      });
      showBanner(`Đã thêm danh mục ${name}`);
      setCategoryDialogOpen(false);
      setNewCategoryName("");
      setNewCategoryDescription("");
      await loadData();
      if (response.data?.data) setSelectedCategory(response.data.data);
    } catch (err: any) {
      showBanner(err?.response?.data?.message || "Không thể thêm danh mục", true);
    } finally {
      setBusy(false);
    }
  };

  // Available teachers (not yet assigned to current category)
  const availableTeachers = useMemo(() => {
    if (!selectedCategory) return [];
    return employees
      .filter((emp) => {
        const pos = String(emp.position || emp.role || emp.user?.roles || "").toUpperCase();
        const isTeacherRole = pos.includes("TEACHER") || pos.includes("TA") || pos.includes("GIẢNG");
        const alreadyAssigned = assignedTeachers.some(
          (a) => String(a.employeeId) === String(emp.id || emp.userId)
        );
        return isTeacherRole && !alreadyAssigned;
      })
      .filter((emp) => {
        const name = String(emp.fullName || emp.user?.fullName || emp.employeeCode || "").toLowerCase();
        const employeeId = emp.id || emp.userId;
        const isTA = isTeachingAssistant({ employeeId });
        const matchesRole = assignRoleFilter === "ALL" || (assignRoleFilter === "TA" ? isTA : !isTA);
        return matchesRole && name.includes(teacherSearchQuery.trim().toLowerCase());
      });
  }, [employees, assignedTeachers, selectedCategory, teacherSearchQuery, assignRoleFilter]);

  // Handle Multi Assign
  const handleExecuteAssign = async () => {
    if (!selectedCategory || selectedTeacherIds.length === 0) return;
    setBusy(true);
    try {
      for (const empId of selectedTeacherIds) {
        await teacherCategoryApi.assign(selectedCategory.id, empId);
      }
      showBanner(`Đã gán thành công ${selectedTeacherIds.length} giảng viên vào ${selectedCategory.name}`);
      setSelectedTeacherIds([]);
      setAssignDialogOpen(false);
      await loadData();
    } catch (err: any) {
      showBanner("Lỗi khi gán giảng viên", true);
    } finally {
      setBusy(false);
    }
  };

  // Handle Unassign
  const handleExecuteUnassign = async () => {
    if (!selectedCategory || !unassignTarget) return;
    setBusy(true);
    try {
      await teacherCategoryApi.unassign(selectedCategory.id, unassignTarget.employeeId);
      showBanner(`Đã hủy gán ${unassignTarget.employeeName || "giảng viên"} khỏi ${selectedCategory.name}`);
      setUnassignTarget(null);
      await loadData();
    } catch (err: any) {
      showBanner(err?.response?.data?.message || "Lỗi khi hủy gán giảng viên", true);
    } finally {
      setBusy(false);
    }
  };

  const toggleTeacherSelection = (empId: string) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      {bannerMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm flex items-center gap-2 animate-in slide-in-from-top duration-200 ${
            bannerMsg.isError
              ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800"
          }`}
        >
          {bannerMsg.isError ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 font-heading">
          <FolderTree className="h-6 w-6 text-primary" /> Quản Lý Giảng Viên Theo Danh Mục
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Phân công Teacher / TA phụ trách các chuyên môn danh mục khóa học trong hệ thống.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3 space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
          <div className="col-span-12 lg:col-span-9 space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Cột trái - CategoryListPanel (25%) */}
          <aside className="col-span-12 lg:col-span-3 bg-card border border-border/60 rounded-2xl p-4 space-y-3 h-fit">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Danh Mục</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg"
                title="Thêm danh mục"
                onClick={() => setCategoryDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Search Categories */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Tìm danh mục..."
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs rounded-xl bg-muted/40 border-border/40"
              />
            </div>

            {/* Category List */}
            <div className="space-y-1.5 max-h-150 overflow-y-auto pr-1">
              {filteredCategories.map((cat) => {
                const isSelected = selectedCategory?.id === cat.id;
                const count = links.filter(
                  (l) => String(l.categoryId) === String(cat.id) && l.status === "ACTIVE"
                ).length;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3.5 py-3 rounded-xl transition-all flex items-center justify-between text-xs font-medium cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 text-primary font-bold border-l-4 border-primary shadow-2xs"
                        : "hover:bg-muted/60 text-foreground"
                    }`}
                  >
                    <span className="line-clamp-1 pr-2">{cat.name}</span>
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold text-[11px]">
                      {count} GV
                    </span>
                  </button>
                );
              })}

              {filteredCategories.length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">Không tìm thấy danh mục.</div>
              )}
            </div>
          </aside>

          {/* Cột phải - CategoryTeacherPanel (75%) */}
          <main className="col-span-12 lg:col-span-9 space-y-5">
            {selectedCategory ? (
              <>
                {/* Header Category Panel */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/60 p-5 rounded-2xl shadow-2xs">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">{selectedCategory.name}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedCategory.description || "Danh mục phụ trách công tác đào tạo chuyên môn."}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedTeacherIds([]);
                      setTeacherSearchQuery("");
                      setAssignDialogOpen(true);
                    }}
                    className="gap-2 rounded-xl text-xs font-bold shadow-xs shrink-0"
                  >
                    <UserPlus className="h-4 w-4" /> Gán Giảng Viên
                  </Button>
                </div>

                {/* Search and role filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/60 p-3 rounded-2xl">
                  <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={assignedTeacherSearch}
                      onChange={(event) => setAssignedTeacherSearch(event.target.value)}
                      placeholder="Tìm theo tên, mã giảng viên, email..."
                      className="pl-9 h-9 rounded-xl text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1 overflow-x-auto">
                    {([
                      ["ALL", "Tất cả", assignedTeachers.length],
                      ["TEACHER", "Giảng viên", assignedTeachers.filter((item) => !isTeachingAssistant(item)).length],
                      ["TA", "Trợ giảng", assignedTeachers.filter(isTeachingAssistant).length],
                    ] as const).map(([value, label, count]) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setTeacherTypeFilter(value)}
                        className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                          teacherTypeFilter === value
                            ? value === "TA" ? "bg-purple-600 text-white shadow-sm" : "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {label} <span className="ml-1 opacity-70">({count})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Teacher Cards Grid */}
                {filteredAssignedTeachers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredAssignedTeachers.map((teacher) => {
                      const activeCourses = getActiveCoursesForTeacher(teacher);
                      const isTA = isTeachingAssistant(teacher);

                      return (
                        <div
                          key={teacher.id || teacher.employeeId}
                          role="button"
                          tabIndex={0}
                          onClick={() => void handleOpenTeacherDetail(teacher)}
                          onKeyDown={(event) => event.key === "Enter" && void handleOpenTeacherDetail(teacher)}
                          className={`relative bg-card border p-4 rounded-2xl shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer ${isTA ? "border-purple-500/30 hover:border-purple-500/60" : "border-blue-500/25 hover:border-blue-500/50"}`}
                        >
                          {/* Unassign Icon Button Top Right */}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleOpenUnassign(teacher);
                            }}
                            className="absolute top-3 right-3 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Hủy gán khỏi danh mục"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <div className="space-y-3">
                            <div className="flex items-center gap-3 pr-8">
                              <div className={`h-11 w-11 rounded-full font-bold flex items-center justify-center text-sm shrink-0 border ${isTA ? "bg-purple-500/10 text-purple-600 border-purple-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"}`}>
                                {(teacher.employeeName || "GV").substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm truncate">{teacher.employeeName}</h4>
                                <span className="text-[11px] text-muted-foreground block">{teacher.employeeCode}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isTA ? (
                                <span className="px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[10px] font-bold">
                                  TA (Trợ giảng)
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-bold">
                                  Teacher (Giảng viên)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3.5 w-3.5 text-primary" />
                              <b>{activeCourses.length}</b> khóa học phụ trách
                            </span>
                            <span className="flex items-center gap-1 text-primary font-semibold">
                              <Eye className="h-3.5 w-3.5" /> Chi tiết
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Empty/search state */
                  <div className="bg-card border border-dashed border-border/80 rounded-2xl p-12 text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm">{assignedTeachers.length ? "Không tìm thấy giảng viên phù hợp" : "Chưa có giảng viên nào thuộc danh mục này"}</h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {assignedTeachers.length ? "Thử thay đổi từ khóa hoặc bộ lọc vai trò." : "Gán giảng viên/TA chuyên môn để cho phép khởi tạo và quản lý khóa học trong danh mục."}
                      </p>
                    </div>
                    {assignedTeachers.length === 0 && <Button
                            onClick={() => {
                              setSelectedTeacherIds([]);
                        setTeacherSearchQuery("");
                        setAssignDialogOpen(true);
                      }}
                      className="gap-2 rounded-xl text-xs font-bold shadow-xs"
                    >
                      <UserPlus className="h-4 w-4" /> Gán Giảng Viên Ngay
                    </Button>}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-card border border-border/60 rounded-2xl p-12 text-center text-xs text-muted-foreground">
                Vui lòng chọn danh mục để xem thông tin giảng viên.
              </div>
            )}
          </main>
        </div>
      )}

      {/* Dialog: AssignTeacherDialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Gán Giảng Viên Vào {selectedCategory?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Chọn một hoặc nhiều giảng viên/TA để phân công phụ trách danh mục này.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Tìm giảng viên theo tên, mã NV..."
                value={teacherSearchQuery}
                onChange={(e) => setTeacherSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-xl border bg-muted/30 p-1" aria-label="Lọc vai trò nhân sự có thể gán">
              {([ ["ALL", "Tất cả"], ["TEACHER", "Teacher"], ["TA", "TA"] ] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setAssignRoleFilter(value)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${assignRoleFilter === value ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 border border-border/40 rounded-xl p-2 bg-muted/20">
              {availableTeachers.map((emp) => {
                const empId = String(emp.id || emp.userId);
                const isChecked = selectedTeacherIds.includes(empId);
                const isTA = isTeachingAssistant({ employeeId: emp.id || emp.userId });

                return (
                  <div
                    key={empId}
                    onClick={() => toggleTeacherSelection(empId)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isChecked
                        ? "bg-primary/10 border-primary/40 text-foreground"
                        : "bg-card border-border/40 hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={isChecked} onCheckedChange={() => toggleTeacherSelection(empId)} />
                      <div>
                        <span className="font-bold text-xs block">{emp.fullName || emp.user?.fullName || emp.employeeCode}</span>
                        <span className="text-[11px] text-muted-foreground">{emp.employeeCode} • {emp.position || "Giảng viên"}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isTA ? "bg-purple-500/10 text-purple-600" : "bg-blue-500/10 text-blue-600"}`}>
                      {isTA ? "TA" : "Teacher"}
                    </span>
                  </div>
                );
              })}

              {availableTeachers.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Không tìm thấy giảng viên khả dụng để gán.
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setAssignDialogOpen(false)} className="text-xs rounded-xl">
              Hủy
            </Button>
            <Button
              size="sm"
              disabled={busy || selectedTeacherIds.length === 0}
              onClick={handleExecuteAssign}
              className="text-xs font-bold rounded-xl gap-1.5"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Gán ({selectedTeacherIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create category */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-primary" /> Thêm Danh Mục
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tạo danh mục chuyên môn mới để phân công giảng viên phụ trách.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label htmlFor="category-name" className="text-xs font-semibold">Tên danh mục <span className="text-red-500">*</span></label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="Ví dụ: Lập trình Web"
                maxLength={100}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="category-description" className="text-xs font-semibold">Mô tả</label>
              <textarea
                id="category-description"
                value={newCategoryDescription}
                onChange={(event) => setNewCategoryDescription(event.target.value)}
                placeholder="Mô tả ngắn về lĩnh vực chuyên môn..."
                maxLength={3000}
                rows={4}
                className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCategoryDialogOpen(false)} className="rounded-xl">Hủy</Button>
            <Button size="sm" onClick={handleCreateCategory} disabled={busy || !newCategoryName.trim()} className="rounded-xl gap-2">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Tạo danh mục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Teacher detail */}
      {detailTarget && (
        <Dialog open={!!detailTarget} onOpenChange={(open) => !open && setDetailTarget(null)}>
          <DialogContent className="sm:max-w-3xl rounded-2xl p-0 overflow-hidden max-h-[88vh]">
            {(() => {
              const employee = getEmployeeForTeacher(detailTarget) || {};
              const teacherCourses = getActiveCoursesForTeacher(detailTarget);
              const teacherClasses = getClassesForTeacher(detailTarget);
              return (
                <div className="overflow-y-auto max-h-[88vh]">
                  <div className="bg-primary/5 border-b p-6">
                    <DialogHeader>
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-lg">
                          {(detailTarget.employeeName || "GV").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <DialogTitle className="text-lg">{detailTarget.employeeName}</DialogTitle>
                          <DialogDescription>{detailTarget.employeeCode} · {employee.position || "Giảng viên"}</DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                  </div>
                  <div className="p-6 space-y-6">
                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Thông tin giảng viên</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-3"><Mail className="h-4 w-4 text-primary" /><span>{employee.userEmail || employee.email || "Chưa cập nhật email"}</span></div>
                        <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-3"><Phone className="h-4 w-4 text-primary" /><span>{employee.phone || "Chưa cập nhật SĐT"}</span></div>
                        <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-3"><Building2 className="h-4 w-4 text-primary" /><span>{employee.departmentName || "Chưa có phòng ban"}</span></div>
                        <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-3"><CalendarDays className="h-4 w-4 text-primary" /><span>Ngày vào làm: {employee.startDate ? new Date(employee.startDate).toLocaleDateString("vi-VN") : "Chưa cập nhật"}</span></div>
                      </div>
                    </section>
                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><BookOpen className="h-4 w-4" /> Khóa học phụ trách ({teacherCourses.length})</h3>
                      {teacherCourses.length ? (
                        <div className="space-y-2">{teacherCourses.map((course) => (
                          <button
                            type="button"
                            key={course.id}
                            onClick={() => void handleOpenCourseDetail(course)}
                            className="w-full flex items-center justify-between gap-3 border rounded-xl p-3 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                          >
                            <div><p className="text-sm font-semibold">{course.name}</p><p className="text-[11px] text-muted-foreground">{course.level || "Không phân cấp"} · Nhấn để xem chi tiết</p></div>
                            <div className="flex items-center gap-2"><span className="text-[10px] font-bold rounded-full bg-primary/10 text-primary px-2.5 py-1">{course.status}</span><Eye className="h-4 w-4 text-primary" /></div>
                          </button>
                        ))}</div>
                      ) : <p className="text-xs text-muted-foreground border border-dashed rounded-xl p-4 text-center">Chưa phụ trách khóa học nào trong danh mục này.</p>}
                    </section>
                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><Layers3 className="h-4 w-4" /> Lớp học phụ trách ({teacherClasses.length})</h3>
                      {detailClassesError ? (
                        <div className="text-xs text-red-700 dark:text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>Lỗi tải dữ liệu lớp học: {detailClassesError}</span>
                        </div>
                      ) : teacherClasses.length ? (
                        <div className="space-y-2">{teacherClasses.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border rounded-xl p-3"><div><p className="text-sm font-semibold">{item.name}</p><p className="text-[11px] text-muted-foreground">Sĩ số: {item.currentMemberCount ?? 0}/{item.maxMembers ?? 0}</p></div><span className="text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 px-2.5 py-1">{item.status}</span></div>)}</div>
                      ) : <p className="text-xs text-muted-foreground border border-dashed rounded-xl p-4 text-center">Chưa phụ trách lớp học nào trong danh mục này.</p>}
                    </section>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Course detail */}
      {courseDetail && (
        <Dialog
          open={!!courseDetail}
          onOpenChange={(open) => {
            if (!open) {
              setCourseDetail(null);
              setCourseDetailError(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl rounded-2xl p-0 overflow-hidden max-h-[86vh]">
            <div className="overflow-y-auto max-h-[86vh]">
              <div className="bg-primary/5 border-b p-6">
                <DialogHeader>
                  <div className="flex items-start gap-3 pr-8">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <DialogTitle className="text-lg leading-snug">Chi Tiết Khóa Học</DialogTitle>
                      <DialogDescription className="mt-1">Dữ liệu được tải trực tiếp từ hệ thống.</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="p-6">
                {courseDetailLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-7 w-3/4" />
                    <Skeleton className="h-20 w-full" />
                    <div className="grid grid-cols-2 gap-3"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
                  </div>
                ) : courseDetailError ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300 p-4 flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div><p className="font-bold">Không tải được chi tiết khóa học</p><p className="text-xs mt-1">{courseDetailError}</p></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <section>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[10px] font-bold">{courseDetail.categoryName || selectedCategory?.name || "Chưa có danh mục"}</span>
                        <span className="rounded-full bg-emerald-500/10 text-emerald-600 px-2.5 py-1 text-[10px] font-bold">{courseDetail.status}</span>
                      </div>
                      <h2 className="text-xl font-bold tracking-tight">{courseDetail.name}</h2>
                      <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line leading-6">{courseDetail.description || "Khóa học chưa có mô tả."}</p>
                    </section>

                    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-xl bg-muted/40 p-3"><BarChart3 className="h-4 w-4 text-primary mb-2" /><p className="text-[10px] text-muted-foreground">Trình độ</p><p className="text-xs font-bold mt-0.5">{courseDetail.level || "Chưa xác định"}</p></div>
                      <div className="rounded-xl bg-muted/40 p-3"><BadgeDollarSign className="h-4 w-4 text-primary mb-2" /><p className="text-[10px] text-muted-foreground">Học phí đề xuất</p><p className="text-xs font-bold mt-0.5">{Number(courseDetail.suggestedPrice || 0).toLocaleString("vi-VN")} đ</p></div>
                      <div className="rounded-xl bg-muted/40 p-3"><Star className="h-4 w-4 text-amber-500 mb-2" /><p className="text-[10px] text-muted-foreground">Đánh giá</p><p className="text-xs font-bold mt-0.5">{Number(courseDetail.avgRating || 0).toFixed(1)} ({courseDetail.reviewCount || 0})</p></div>
                      <div className="rounded-xl bg-muted/40 p-3"><Users className="h-4 w-4 text-primary mb-2" /><p className="text-[10px] text-muted-foreground">Học viên</p><p className="text-xs font-bold mt-0.5">{courseDetail.enrollmentCount || 0}</p></div>
                    </section>

                    <section className="border rounded-xl divide-y text-sm">
                      <div className="flex items-center justify-between gap-4 p-3"><span className="text-muted-foreground flex items-center gap-2"><Link2 className="h-4 w-4" /> Đường dẫn</span><span className="font-medium truncate">{courseDetail.link || "Chưa cập nhật"}</span></div>
                      <div className="flex items-center justify-between gap-4 p-3"><span className="text-muted-foreground">Điều kiện chứng chỉ</span><span className="font-medium">{courseDetail.certificateConditionType || "Chưa thiết lập"} · {courseDetail.certificatePassThreshold ?? 0}%</span></div>
                      <div className="flex items-center justify-between gap-4 p-3"><span className="text-muted-foreground">Ngày tạo</span><span className="font-medium">{courseDetail.createdAt ? new Date(courseDetail.createdAt).toLocaleDateString("vi-VN") : "Chưa cập nhật"}</span></div>
                    </section>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        className="rounded-xl gap-2 font-semibold"
                        onClick={() => {
                          const courseId = courseDetail.id;
                          setCourseDetail(null);
                          setDetailTarget(null);
                          navigate(`/courses/${courseId}`);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" /> Đi tới khóa học
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: UnassignConfirmDialog */}
      {unassignTarget && (
        <Dialog open={!!unassignTarget} onOpenChange={(open) => !open && setUnassignTarget(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6">
            {(() => {
              const activeCourses = getActiveCoursesForTeacher(unassignTarget);
              const activeClasses = getClassesForTeacher(unassignTarget).filter((item) => item.status === "ACTIVE");
              const blockingCourses = activeCourses.filter((course) => course.status === "ACTIVE");
              const isBlocked = blockingCourses.length > 0 || activeClasses.length > 0;

              return (
                <>
                  <DialogHeader>
                    <DialogTitle className={`text-base font-bold flex items-center gap-2 ${isBlocked ? "text-red-600" : ""}`}>
                      {isBlocked ? <AlertTriangle className="h-5 w-5 text-red-500" /> : "Xác Nhận Hủy Gán Giảng Viên"}
                      {isBlocked ? "Chưa Thể Hủy Gán" : null}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      {isBlocked
                        ? `Giảng viên ${unassignTarget.employeeName} hiện vẫn còn các khóa học đang hoạt động trong danh mục này.`
                        : `Bạn có chắc chắn muốn hủy gán ${unassignTarget.employeeName} khỏi danh mục ${selectedCategory?.name}?`}
                    </DialogDescription>
                  </DialogHeader>

                  {isBlocked ? (
                    <div className="space-y-3 py-2 text-xs">
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 rounded-xl space-y-2">
                        <span className="font-bold block">Danh sách khóa học dở dang:</span>
                        <ul className="list-disc list-inside space-y-1">
                          {blockingCourses.map((course) => (
                            <li key={course.id} className="font-medium">{course.name}</li>
                          ))}
                          {activeClasses.map((item) => (
                            <li key={`class-${item.id}`} className="font-medium">Lớp: {item.name}</li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-[11px] text-muted-foreground italic">
                        * Bạn cần chuyển quyền giảng dạy hoặc hoàn tất/kết thúc các khóa học trên trước khi hủy gán.
                      </p>
                    </div>
                  ) : null}

                  {detailClassesError && (
                    <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Không kiểm tra được lớp học phụ trách: {detailClassesError}. Máy chủ vẫn sẽ kiểm tra lại khi hủy gán.</span>
                    </div>
                  )}

                  <DialogFooter className="gap-2 sm:gap-0 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setUnassignTarget(null)} className="text-xs rounded-xl">
                      Hủy
                    </Button>
                    <Button
                      variant={isBlocked ? "secondary" : "destructive"}
                      size="sm"
                      disabled={isBlocked || busy}
                      onClick={handleExecuteUnassign}
                      className="text-xs font-bold rounded-xl gap-1.5"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {isBlocked ? "Đã Bị Khóa" : "Xác Nhận Hủy Gán"}
                    </Button>
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CategoryTeacherAssignPage;
