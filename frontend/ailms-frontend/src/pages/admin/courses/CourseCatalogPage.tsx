import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
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
  LayoutGrid,
  List,
  Search,
  Star,
  Eye,
  ChevronRight,
  Package,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Users,
  X,
  Check,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import type { CourseExtended, CourseLevel, CourseStatus } from "@/types/adminCourseClass";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";
import { courseApi } from "@/api/courses/courseApi";
import { useAuth } from "@/hooks/useAuth";

/** Hiển thị avatar thật hoặc initials, không dùng ảnh người giả. */
const TeacherAvatar = ({ src, name, className }: { src?: string; name: string; className: string }) => (
  src ? <img src={src} alt={name} title={name} className={className} /> : (
    <div title={name} className={`${className} flex items-center justify-center bg-primary/10 text-[10px] font-bold text-primary`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
);

/** Hiển thị placeholder khi khóa học chưa có ảnh bìa thật từ Backend. */
const CourseCover = ({ src, name, className }: { src?: string | null; name: string; className: string }) => (
  src?.trim() ? <img src={src} alt={name} className={className} /> : (
    <div className={`${className} flex items-center justify-center bg-primary/5 text-primary`} aria-label={`${name} chưa có ảnh bìa`}>
      <BookOpen className="h-10 w-10 opacity-40" />
    </div>
  )
);

/** Đổi mã enum Backend sang nhãn hiển thị, giữ nguyên mã khi chưa có bản dịch. */
const enumLabel = (value: string) => ({
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
  SELF_STUDY: "Tự học",
  GROUP_CLASS: "Lớp nhóm",
  ONE_ON_ONE: "1 kèm 1",
  COMBO: "Kết hợp",
  DRAFT: "Nháp",
  PENDING: "Chờ duyệt",
  ACTIVE: "Đang hoạt động",
  REJECTED: "Từ chối",
  INACTIVE: "Ẩn / Lưu trữ",
  DELETED: "Đã xóa",
}[value] ?? value);

type SortField = "createdAt" | "rating" | "enrollmentCount" | "referencePrice" | "name";

interface SortRule {
  field: SortField;
  dir: "ASC" | "DESC";
}

const getPageNumbers = (currentPage: number, total: number) => {
  const pages: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 0; i < total; i++) pages.push(i);
  } else {
    pages.push(0);
    if (currentPage > 2) pages.push("...");
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(total - 2, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < total - 3) pages.push("...");
    pages.push(total - 1);
  }
  return pages;
};

export const CourseCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { auth } = useAuth();

  const isTeacherRoute = location.pathname.startsWith("/teacher");
  const baseRoute = isTeacherRoute ? "/teacher/courses" : "/admin/courses";
  const sessionKey = isTeacherRoute ? "teacher_course_catalog_state" : "admin_course_catalog_state";
  const currentUserId = auth?.user?.id != null ? String(auth.user.id) : null;

  const userRolesList = useMemo(() => {
    return (auth?.user?.roles || []).map((r: any) =>
      (typeof r === "object" ? (r?.code || r?.name || "") : String(r)).toUpperCase().replace("ROLE_", "")
    );
  }, [auth?.user?.roles]);

  const isAdminUser = useMemo(() => {
    return userRolesList.some((r: string) => r.includes("ADMIN") || r.includes("HR"));
  }, [userRolesList]);

  // Restore saved view & filter state if returning from detail page or sessionStorage
  const initialSavedState = useMemo(() => {
    const fromLoc = (location.state as any)?.catalogView;
    if (fromLoc) return fromLoc;
    try {
      const fromSession = sessionStorage.getItem(sessionKey);
      return fromSession ? JSON.parse(fromSession) : null;
    } catch {
      return null;
    }
  }, [location.state, sessionKey]);

  const initialPage = useMemo(() => {
    const pParam = searchParams.get("page");
    if (pParam) {
      const parsed = parseInt(pParam, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed - 1;
    }
    return initialSavedState?.page ?? 0;
  }, [searchParams, initialSavedState]);

  const initialPageSize = useMemo(() => {
    const psParam = searchParams.get("pageSize");
    if (psParam) {
      const parsed = parseInt(psParam, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
    const savedSize = initialSavedState?.pageSize;
    if (savedSize === 9) return 8;
    return savedSize ?? 8;
  }, [searchParams, initialSavedState]);

  const [courses, setCourses] = useState<CourseExtended[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [viewMode, setViewMode] = useState<"grid" | "table">(initialSavedState?.viewMode ?? "grid");

  // Notifications & Modals
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [deleteCourseConfirm, setDeleteCourseConfirm] = useState<{ id: string; name: string } | null>(null);
  const [jumpPageInput, setJumpPageInput] = useState<string>(String((initialSavedState?.page ?? 0) + 1));

  // Filters & Multi-Column Sorting State
  const [searchTerm, setSearchTerm] = useState<string>(initialSavedState?.searchTerm ?? "");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialSavedState?.selectedCategory ?? "ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>(initialSavedState?.selectedStatus ?? "ALL");
  const [selectedLevel, setSelectedLevel] = useState<string>(initialSavedState?.selectedLevel ?? "ALL");
  const [selectedTeacher, setSelectedTeacher] = useState<string>(initialSavedState?.selectedTeacher ?? "ALL");
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState<string>(initialSavedState?.selectedDeliveryMode ?? "ALL");
  const [filterStartDate, setFilterStartDate] = useState<string>(initialSavedState?.filterStartDate ?? "");
  const [filterEndDate, setFilterEndDate] = useState<string>(initialSavedState?.filterEndDate ?? "");
  const [sortRules, setSortRules] = useState<SortRule[]>(
    initialSavedState?.sortRules ?? [{ field: "createdAt", dir: "DESC" }]
  );

   // Sync state to sessionStorage whenever filters or view change
  useEffect(() => {
    const currentState = {
      viewMode,
      page,
      pageSize,
      searchTerm,
      selectedCategory,
      selectedStatus,
      selectedLevel,
      selectedTeacher,
      selectedDeliveryMode,
      filterStartDate,
      filterEndDate,
      sortRules,
    };
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(currentState));
    } catch (e) {
      console.warn("Could not save catalog state to sessionStorage", e);
    }
  }, [viewMode, page, pageSize, searchTerm, selectedCategory, selectedStatus, selectedLevel, selectedTeacher, selectedDeliveryMode, filterStartDate, filterEndDate, sortRules]);

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  const showBanner = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(""), 3500);
    } else {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(""), 3500);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const promises: [Promise<any[]>, Promise<any[]>, Promise<any[]>, Promise<any[]>, Promise<any[]>] = [
        adminCourseClassApi.getCourses(),
        isTeacherRoute ? adminCourseClassApi.getMyTeacherCategories() : adminCourseClassApi.getCategories(),
        adminCourseClassApi.getPackages(),
        isTeacherRoute ? Promise.resolve([]) : adminCourseClassApi.getEmployees(),
        adminCourseClassApi.getAllCourseTeachers(),
      ];

      const [courseRows, rawCategoryRows, packageRows, employeeRows, teacherAssignments] = await Promise.all(promises);

      const categoryRows = isTeacherRoute
        ? (rawCategoryRows || []).map((c: any) => ({
            id: String(c.categoryId || c.id),
            name: c.categoryName || c.name || "Danh mục",
          }))
        : (rawCategoryRows || []);

      const employeeById = new Map<string, any>();
      (employeeRows || []).forEach((item: any) => {
        if (item.id != null) employeeById.set(String(item.id), item);
        if (item.userId != null) employeeById.set(String(item.userId), item);
      });

      // Group teacher assignments by courseId
      const teachersByCourse = new Map<string, any[]>();
      (teacherAssignments || []).forEach((assignment: any) => {
        const cid = String(assignment.courseId);
        if (!teachersByCourse.has(cid)) teachersByCourse.set(cid, []);
        teachersByCourse.get(cid)!.push(assignment);
      });

      const allowedCatIds = new Set(categoryRows.map((c: any) => String(c.id)));

      let visibleCourseRows = (courseRows || []).filter((c: any) => c.status !== "DELETED");
      if (isTeacherRoute) {
        visibleCourseRows = visibleCourseRows.filter((course: any) => {
          const inMyCat = allowedCatIds.has(String(course.categoryId));
          const assignments = teachersByCourse.get(String(course.id)) || [];
          const hasMyAssignment = assignments.some(
            (a: any) => String(a.userId) === String(currentUserId) && (a.status === "ACTIVE" || a.status === "ACCEPTED")
          );
          return inMyCat && hasMyAssignment;
        });
      }

      setCategories(categoryRows);
      setEmployees(employeeRows);
      setCourses(visibleCourseRows.map((course: any) => {
        const packages = packageRows.filter((item: any) => String(item.courseId) === String(course.id));
        const activeAssignments = (teachersByCourse.get(String(course.id)) || []).filter(
          (assignment: any) => assignment.status === "ACTIVE" || assignment.status === "ACCEPTED"
        );

        const mappedTeachers = activeAssignments.map((assignment: any, index: number) => {
          const emp = employeeById.get(String(assignment.userId));
          const isPrimary = index === 0;
          const teacherName =
            assignment.teacherName ||
            assignment.fullName ||
            assignment.teacherUsername ||
            assignment.username ||
            emp?.fullName ||
            emp?.username ||
            "Chưa xác định";
          const teacherAvatar =
            assignment.teacherAvatar ||
            assignment.avatarUrl ||
            emp?.avatarUrl ||
            "";

          return {
            id: String(assignment.userId),
            name: teacherName,
            avatar: teacherAvatar && teacherAvatar.trim() !== "" ? teacherAvatar : "",
            category: isPrimary ? "Giảng viên chính" : "Đồng phụ trách",
            isPrimary,
            status: assignment.status || "ACTIVE",
          };
        });

        return {
          ...course,
          id: String(course.id),
          categoryId: String(course.categoryId),
          status: course.status as CourseStatus,
          level: course.level as CourseLevel,
          teachers: mappedTeachers,
          rating: Number(course.avgRating || 0),
          reviewCount: Number(course.reviewCount || 0),
          enrollmentCount: Number(course.enrollmentCount || 0),
          packages: packages.map((item: any) => ({
            ...item,
            id: String(item.id),
            courseId: String(item.courseId),
            active: course.status === "ACTIVE" && item.status === "ACTIVE",
            attachedClassId: item.classId ? String(item.classId) : undefined,
            attachedClassName: item.className,
          })),
          packagesCount: packages.length,
          referencePrice: Number(course.suggestedPrice || 0),
        } as CourseExtended;
      }));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể tải dữ liệu khóa học từ máy chủ");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!loading && initialSavedState?.scrollY != null) {
      const targetY = Number(initialSavedState.scrollY);
      requestAnimationFrame(() => {
        window.scrollTo({ top: targetY, behavior: "instant" as ScrollBehavior });
      });
      const timer = setTimeout(() => {
        window.scrollTo({ top: targetY, behavior: "instant" as ScrollBehavior });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [loading, initialSavedState]);


  const handleNavigateToDetail = (courseId: string) => {
    const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const currentState = {
      viewMode,
      page,
      pageSize,
      searchTerm,
      selectedCategory,
      selectedStatus,
      selectedLevel,
      selectedTeacher,
      selectedDeliveryMode,
      filterStartDate,
      filterEndDate,
      sortRules,
      scrollY: currentScrollY,
    };
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(currentState));
    } catch (e) {
      console.warn("Could not save catalog state", e);
    }

    const params = new URLSearchParams();
    if (page > 0) params.set("page", String(page + 1));
    if (pageSize !== 8) params.set("pageSize", String(pageSize));
    if (searchTerm) params.set("search", searchTerm);
    if (selectedCategory !== "ALL") params.set("category", selectedCategory);
    if (selectedStatus !== "ALL") params.set("status", selectedStatus);
    if (selectedLevel !== "ALL") params.set("level", selectedLevel);
    if (selectedTeacher !== "ALL") params.set("teacher", selectedTeacher);
    if (selectedDeliveryMode !== "ALL") params.set("delivery", selectedDeliveryMode);

    const returnUrl = `${baseRoute}${params.toString() ? `?${params.toString()}` : ""}`;

    navigate(`${baseRoute}/${courseId}`, {
      state: { returnTo: returnUrl, catalogView: currentState },
    });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("ALL");
    setSelectedStatus("ALL");
    setSelectedLevel("ALL");
    setSelectedTeacher("ALL");
    setSelectedDeliveryMode("ALL");
    setFilterStartDate("");
    setFilterEndDate("");
    setSortRules([{ field: "createdAt", dir: "DESC" }]);
    setPage(0);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const name = (data.get("name") as string || "").trim();
    const categoryId = data.get("categoryId") as string;
    const description = (data.get("description") as string || "").trim();
    const level = data.get("level") as string;
    const status = data.get("status") as string | null;

    if (!name) {
      showBanner("Tên khóa học không được để trống", true);
      return;
    }

    const autoLink = name.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `course-${Date.now()}`;

    try {
      if (editingCourse) {
        const res = await courseApi.updateCourse(editingCourse.id, { categoryId, name, link: editingCourse.link || autoLink, description, level });
        if (res.data.success) {
          // Chỉ Admin/HR mới có quyền thay đổi trạng thái khóa học
          if (isAdminUser && status && status !== editingCourse.status) {
            await courseApi.updateCourseStatus(editingCourse.id, status);
          }
          showBanner("Cập nhật khóa học thành công!");
          loadData();
        }
      } else {
        const res = await courseApi.createCourse({ categoryId, name, link: autoLink, description, level });
        if (res.data.success) {
          showBanner("Tạo khóa học mới thành công!");
          setPage(0);
          loadData();
        }
      }
      setCourseModalOpen(false);
      setEditingCourse(null);
    } catch (err: any) {
      showBanner(err.message || "Lỗi xử lý khóa học", true);
    }
  };

  const canUserDeleteCourse = (course: CourseExtended) => {
    const userRoles = (auth?.user?.roles || []).map((r: any) =>
      (typeof r === "object" ? (r?.code || r?.name || "") : String(r)).toUpperCase().replace("ROLE_", "")
    );
    const isAdmin = userRoles.some((r: string) => r.includes("ADMIN") || r.includes("HR"));
    if (isAdmin) return true;

    if (!currentUserId) return false;

    const isPrimaryTeacher =
      (course.teachers && course.teachers.length > 0 && String(course.teachers[0].id) === String(currentUserId)) ||
      (course.teachers && course.teachers.some((t) => String(t.id) === String(currentUserId) && t.isPrimary)) ||
      (course.createdBy != null && String(course.createdBy) === String(currentUserId));

    return Boolean(isPrimaryTeacher);
  };

  const confirmDeleteCourseAction = async () => {
    if (!deleteCourseConfirm) return;
    const targetCourse = courses.find((c) => String(c.id) === String(deleteCourseConfirm.id));
    if (targetCourse && !canUserDeleteCourse(targetCourse)) {
      showBanner("Bạn không phải ng tạo khóa học", true);
      setDeleteCourseConfirm(null);
      return;
    }
    try {
      const res = await courseApi.deleteCourse(deleteCourseConfirm.id);
      if (res.data.success) {
        showBanner("Đã di chuyển khóa học vào thùng rác thành công!");
        loadData();
      }
    } catch (err: any) {
      showBanner(err?.response?.data?.message || err?.message || "Bạn không phải ng tạo khóa học", true);
    } finally {
      setDeleteCourseConfirm(null);
    }
  };

  // Filtered Course List (including Date Range)
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "ALL" || course.categoryId === selectedCategory;
      const matchesStatus =
        selectedStatus === "ALL" || course.status === selectedStatus;
      const matchesLevel =
        selectedLevel === "ALL" || course.level === selectedLevel;
      const matchesTeacher =
        selectedTeacher === "ALL" ||
        course.teachers.some((t) => t.id === selectedTeacher);
      const matchesDelivery =
        selectedDeliveryMode === "ALL" ||
        course.packages.some((p) => p.deliveryMode === selectedDeliveryMode);

      let matchesDate = true;
      if (course.createdAt) {
        const cTime = new Date(course.createdAt).getTime();
        if (filterStartDate) {
          const sTime = new Date(filterStartDate + "T00:00:00").getTime();
          if (cTime < sTime) matchesDate = false;
        }
        if (filterEndDate) {
          const eTime = new Date(filterEndDate + "T23:59:59").getTime();
          if (cTime > eTime) matchesDate = false;
        }
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesLevel &&
        matchesTeacher &&
        matchesDelivery &&
        matchesDate
      );
    });
  }, [courses, searchTerm, selectedCategory, selectedStatus, selectedLevel, selectedTeacher, selectedDeliveryMode, filterStartDate, filterEndDate]);

  const availableStatuses = useMemo(
    () => Array.from(new Set(courses.map((course) => course.status))),
    [courses],
  );
  const availableLevels = useMemo(
    () => Array.from(new Set(courses.map((course) => course.level))),
    [courses],
  );
  const availableDeliveryModes = useMemo(
    () => Array.from(new Set(courses.flatMap((course) => course.packages.map((pkg) => pkg.deliveryMode)))),
    [courses],
  );
  const formLevels = useMemo(
    () => Array.from(new Set([...availableLevels, editingCourse?.level].filter(Boolean) as CourseLevel[])),
    [availableLevels, editingCourse?.level],
  );
  const formStatuses = useMemo(
    () => Array.from(new Set([...availableStatuses, editingCourse?.status].filter(Boolean) as CourseStatus[])),
    [availableStatuses, editingCourse?.status],
  );

  /** Xóa filter cũ không còn tồn tại trong dữ liệu Backend hiện tại. */
  useEffect(() => {
    if (selectedStatus !== "ALL" && !availableStatuses.includes(selectedStatus as CourseStatus)) setSelectedStatus("ALL");
    if (selectedLevel !== "ALL" && !availableLevels.includes(selectedLevel as CourseLevel)) setSelectedLevel("ALL");
    if (selectedDeliveryMode !== "ALL" && !availableDeliveryModes.includes(selectedDeliveryMode as CourseExtended["packages"][number]["deliveryMode"])) {
      setSelectedDeliveryMode("ALL");
    }
  }, [availableStatuses, availableLevels, availableDeliveryModes, selectedStatus, selectedLevel, selectedDeliveryMode]);

  // Multi-column sorting algorithm (Exact EmployeeManagement / RoleManagement algorithm)
  const sortedCourses = useMemo(() => {
    const list = [...filteredCourses];
    if (sortRules.length === 0) return list;

    return list.sort((a, b) => {
      for (const rule of sortRules) {
        let valA: any = a[rule.field as keyof CourseExtended];
        let valB: any = b[rule.field as keyof CourseExtended];

        if (rule.field === "createdAt") {
          valA = a.createdAt ? new Date(a.createdAt).getTime() : (Number(a.id) || 0);
          valB = b.createdAt ? new Date(b.createdAt).getTime() : (Number(b.id) || 0);
        } else if (rule.field === "rating") {
          valA = a.rating || 0;
          valB = b.rating || 0;
        } else if (rule.field === "enrollmentCount") {
          valA = (a as any).enrollmentCount || 0;
          valB = (b as any).enrollmentCount || 0;
        } else if (rule.field === "referencePrice") {
          valA = a.referencePrice || 0;
          valB = b.referencePrice || 0;
        } else if (rule.field === "name") {
          valA = (a.name || "").toLowerCase();
          valB = (b.name || "").toLowerCase();
        }

        if (valA < valB) return rule.dir === "ASC" ? -1 : 1;
        if (valA > valB) return rule.dir === "ASC" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredCourses, sortRules]);

  const totalPages = Math.max(1, Math.ceil(sortedCourses.length / pageSize));
  const paginatedCourses = useMemo(
    () => sortedCourses.slice(page * pageSize, (page + 1) * pageSize),
    [sortedCourses, page, pageSize]
  );

  useEffect(() => {
    if (!loading && courses.length > 0 && page >= totalPages && totalPages > 0) {
      setPage(totalPages - 1);
    }
  }, [loading, courses.length, page, totalPages]);

  // Multi-column sort toggle handler (RoleManagement pattern)
  const handleSort = (field: SortField) => {
    setSortRules(prevRules => {
      const existingIndex = prevRules.findIndex(r => r.field === field);

      if (existingIndex === -1) {
        // Click 1: Thêm trường sắp xếp Giảm dần (DESC)
        const filtered = prevRules.filter(r => r.field !== "createdAt");
        return [...filtered, { field, dir: "DESC" }];
      } else {
        const currentRule = prevRules[existingIndex];
        if (currentRule.dir === "DESC") {
          // Click 2: Đổi sang Tăng dần (ASC)
          const updated = [...prevRules];
          updated[existingIndex] = { field, dir: "ASC" };
          return updated;
        } else {
          // Click 3: Bỏ sắp xếp cột này (nếu hết rule thì trả về mặc định Mới nhất)
          const updated = prevRules.filter(r => r.field !== field);
          return updated.length === 0 ? [{ field: "createdAt", dir: "DESC" }] : updated;
        }
      }
    });
    setPage(0);
  };

  const getSortRuleInfo = (field: SortField) => {
    const idx = sortRules.findIndex(r => r.field === field);
    if (idx === -1) return null;
    return { priority: idx + 1, dir: sortRules[idx].dir };
  };

  const renderSortIcon = (field: SortField) => {
    const info = getSortRuleInfo(field);
    if (!info) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />;
    return (
      <span className="flex items-center gap-0.5 text-blue-600 font-bold text-xs">
        {info.dir === "ASC" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
        {sortRules.length > 1 && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded-full">{info.priority}</span>}
      </span>
    );
  };

  const handlePresetSortChange = (preset: string) => {
    switch (preset) {
      case "NEWEST":
        setSortRules([{ field: "createdAt", dir: "DESC" }]);
        break;
      case "OLDEST":
        setSortRules([{ field: "createdAt", dir: "ASC" }]);
        break;
      case "RATING_DESC":
        setSortRules([{ field: "rating", dir: "DESC" }, { field: "createdAt", dir: "DESC" }]);
        break;
      case "RATING_ASC":
        setSortRules([{ field: "rating", dir: "ASC" }, { field: "createdAt", dir: "DESC" }]);
        break;
      case "ENROLLMENT_DESC":
        setSortRules([{ field: "enrollmentCount", dir: "DESC" }, { field: "createdAt", dir: "DESC" }]);
        break;
      case "ENROLLMENT_ASC":
        setSortRules([{ field: "enrollmentCount", dir: "ASC" }, { field: "createdAt", dir: "DESC" }]);
        break;
      case "PRICE_DESC":
        setSortRules([{ field: "referencePrice", dir: "DESC" }, { field: "createdAt", dir: "DESC" }]);
        break;
      case "PRICE_ASC":
        setSortRules([{ field: "referencePrice", dir: "ASC" }, { field: "createdAt", dir: "DESC" }]);
        break;
      default:
        setSortRules([{ field: "createdAt", dir: "DESC" }]);
    }
    setPage(0);
  };

  const getCurrentPresetValue = () => {
    if (sortRules.length === 1 && sortRules[0].field === "createdAt") {
      return sortRules[0].dir === "DESC" ? "NEWEST" : "OLDEST";
    }
    if (sortRules.length >= 1 && sortRules[0].field === "rating") {
      return sortRules[0].dir === "DESC" ? "RATING_DESC" : "RATING_ASC";
    }
    if (sortRules.length >= 1 && sortRules[0].field === "enrollmentCount") {
      return sortRules[0].dir === "DESC" ? "ENROLLMENT_DESC" : "ENROLLMENT_ASC";
    }
    if (sortRules.length >= 1 && sortRules[0].field === "referencePrice") {
      return sortRules[0].dir === "DESC" ? "PRICE_DESC" : "PRICE_ASC";
    }
    return "NEWEST";
  };

  const getStatusBadge = (status: CourseStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
            ● Đang Hoạt Động
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium">
            ● Chờ Duyệt
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-medium">
            ● Từ Chối
          </Badge>
        );
      case "INACTIVE":
        return (
          <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20 font-medium">
            ● Ẩn / Lưu trữ
          </Badge>
        );
      case "DRAFT":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-medium">
            ● Nháp
          </Badge>
        );
      case "DELETED":
        return (
          <Badge className="bg-zinc-500/10 text-zinc-500 border-zinc-400/20 font-medium">
            ● Đã Xóa
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20 font-medium">
            ● {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Messages */}
      {successBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
          <Check className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-rose-600 text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{errorBanner}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Quản Lý Khóa Học
          </h1>
          <p className="text-sm text-foreground opacity-80 mt-1">
            Tổng quan tất cả khóa học trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Create Course Button */}
          <Button
            onClick={() => { setEditingCourse(null); setCourseModalOpen(true); }}
            variant="default"
            size="sm"
            className="h-8 gap-1.5 bg-white rounded-lg border-border/30 text-foreground hover:bg-foreground text-xs font-semibold hover:text-white"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm khóa học</span>
          </Button>

          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-100">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className={`h-8 px-3 text-xs ${
                viewMode === "grid" ? "bg-white text-foreground font-semibold shadow-sm hover:bg-foreground hover:text-white" : "text-muted-foreground font-semibold hover:bg-foreground hover:text-white"
              }`}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
              Lưới
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className={`h-8 px-3 text-xs ${
                viewMode === "table" ? "bg-white text-foreground font-semibold shadow-sm hover:bg-foreground hover:text-white" : "text-muted-foreground font-semibold hover:bg-foreground hover:text-white"
              }`}
              onClick={() => setViewMode("table")}
            >
              <List className="w-3.5 h-3.5 mr-1.5" />
              Bảng
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-none border-slate-200 bg-slate-50/50">
        <CardContent className="p-4 space-y-3">
          {/* Row 1: Search, Category, Status, Teacher, DeliveryMode, Sort */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground" />
              <Input
                placeholder="Tìm tên khóa học..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-9 bg-white h-9 text-sm"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={(val) => { setSelectedCategory(val); setPage(0); }}>
              <SelectTrigger className="bg-white h-9 text-sm">
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả danh mục</SelectItem>
                {categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={(val) => { setSelectedStatus(val); setPage(0); }}>
              <SelectTrigger className="bg-white h-9 text-sm">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                {availableStatuses.map((status) => <SelectItem key={status} value={status}>{enumLabel(status)} ({status})</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Course level filter uses values returned by Backend. */}
            <Select value={selectedLevel} onValueChange={(val) => { setSelectedLevel(val); setPage(0); }}>
              <SelectTrigger className="bg-white h-9 text-sm">
                <SelectValue placeholder="Cấp độ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả cấp độ</SelectItem>
                {availableLevels.map((level) => <SelectItem key={level} value={level}>{enumLabel(level)} ({level})</SelectItem>)}
              </SelectContent>
            </Select>

             {/* Teacher Filter */}
            {!isTeacherRoute && (
              <Select value={selectedTeacher} onValueChange={(val) => { setSelectedTeacher(val); setPage(0); }}>
                <SelectTrigger className="bg-white h-9 text-sm">
                  <SelectValue placeholder="Giảng viên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả giảng viên</SelectItem>
                  {employees.filter((employee) => {
                    const text = [employee.position, ...(employee.roles || [])].join(" ").toUpperCase();
                    return text.includes("TEACHER") || text.includes("ROLE_TA") || text.includes("TRỢ GIẢNG");
                  }).map((employee) => <SelectItem key={employee.id || employee.userId} value={String(employee.id || employee.userId)}>{employee.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {/* Delivery Mode Filter */}
            <Select value={selectedDeliveryMode} onValueChange={(val) => { setSelectedDeliveryMode(val); setPage(0); }}>
              <SelectTrigger className="bg-white h-9 text-sm">
                <SelectValue placeholder="Hình thức bán" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả hình thức</SelectItem>
                {availableDeliveryModes.map((mode) => <SelectItem key={mode} value={mode}>{enumLabel(mode)} ({mode})</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Sort Preset Selector */}
            <Select value={getCurrentPresetValue()} onValueChange={handlePresetSortChange}>
              <SelectTrigger className="bg-white h-9 text-sm text-foreground">
                <SelectValue placeholder="Sắp xếp theo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEWEST">Mới nhất</SelectItem>
                <SelectItem value="OLDEST">Cũ nhất</SelectItem>
                <SelectItem value="RATING_DESC">Rating (Desc)</SelectItem>
                <SelectItem value="RATING_ASC">Rating(ASC)</SelectItem>
                <SelectItem value="ENROLLMENT_DESC">Đăng ký(DESC)</SelectItem>
                <SelectItem value="ENROLLMENT_ASC">Đăng ký(ASC)</SelectItem>
                <SelectItem value="PRICE_DESC">Giá(DESC)</SelectItem>
                <SelectItem value="PRICE_ASC">Giá(ASC)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Date Range Filter (Từ ngày tạo / Đến ngày tạo) + Reset Button */}
          <div className="flex flex-wrap items-end gap-3 pt-1">
            <div className="w-44">
              <DatePickerInput
                label="Từ ngày tạo"
                placeholder="dd/mm/yyyy"
                value={filterStartDate}
                onChange={(isoDate) => {
                  setFilterStartDate(isoDate);
                  setPage(0);
                }}
                className="border-border"
                clearable
              />
            </div>

            <div className="w-44">
              <DatePickerInput
                label="Đến ngày tạo"
                placeholder="dd/mm/yyyy"
                value={filterEndDate}
                onChange={(isoDate) => {
                  setFilterEndDate(isoDate);
                  setPage(0);
                }}
                className="border-border"
                clearable
              />
            </div>

            <Button
              type="button"
              onClick={handleResetFilters}
              variant="outline"
              size="sm"
              className="h-9 text-sm text-foreground border-border hover:text-white hover:bg-foreground rounded-lg px-3 bg-white border flex items-center gap-1.5 font-medium"
            >
              <RotateCcw className="h-3.5 w-3.5 font-semibold" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải khóa học...</div>}
      {!loading && error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> {error}</div>}
      {!loading && !error && sortedCourses.length === 0 && <div className="rounded-xl border border-dashed p-12 text-center text-sm text-slate-500">Không có khóa học phù hợp.</div>}

      {/* Content Section */}
      {!loading && !error && sortedCourses.length > 0 && (viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {paginatedCourses.map((course) => (
            <Card
              key={course.id}
              className="group cursor-pointer hover:-translate-y-1.5 hover:shadow-xl hover:border-primary/40 transition-all duration-300 border-border/70 overflow-hidden flex flex-col justify-between bg-card"
              onClick={() => handleNavigateToDetail(course.id)}
            >
              <div>
                {/* Cover Image Container */}
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  <CourseCover
                    src={course.coverImage}
                    name={course.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    {getStatusBadge(course.status)}
                  </div>
                  <div className="absolute top-3 right-3 bg-foreground/80 text-white text-xs font-semibold px-2 py-1 rounded backdrop-blur-sm">
                    {course.categoryName}
                  </div>
                </div>

                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold text-foreground line-clamp-2 text-base group-hover:text-primary transition-colors">
                    {course.name}
                  </h3>

                  {/* Rating, Review & Enrollment Count */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                    <div className="flex items-center text-amber-500 font-semibold gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {course.rating > 0 ? course.rating.toFixed(1) : "Mới"}
                    </div>
                    <span>•</span>
                    <span>{course.reviewCount || 0} đánh giá</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <Users className="w-3.5 h-3.5 text-foreground" />
                      ({(course as any).enrollmentCount || 0} người đăng ký)
                    </span>
                  </div>

                  {/* Instructor name text */}
                  <div className="flex items-center gap-2 pt-2 border-t border-foreground/30 text-xs text-foreground">
                    <span className="shrink-0 font-semibold">Giảng viên:</span>
                    {course.teachers.length > 0 ? (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="flex items-center -space-x-1.5 shrink-0">
                          {course.teachers.slice(0, 2).map((t) => (
                            <TeacherAvatar
                              key={t.id}
                              src={t.avatar || undefined}
                              name={t.name}
                              className="w-5 h-5 rounded-full border border-white object-cover"
                            />
                          ))}
                        </div>
                        <span className="font-semibold text-foreground">
                          {course.teachers[0].name}
                          {course.teachers.length > 1 && (
                            <span className="text-foreground font-normal"> +{course.teachers.length - 1}</span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-foreground italic">Chưa phân công</span>
                    )}
                  </div>
                </CardContent>
              </div>

              <div className="px-5 pb-4 pt-3 flex items-center justify-between border-t border-border/30">
                <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                  <Package className="w-3.5 h-3.5 text-foreground" />
                  <span>{course.packages.length} gói bán</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs font-semibold text-foreground hover:bg-slate-50"
                    title="Soạn thảo chương & bài học"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`${baseRoute}/${course.id}/builder`);
                    }}
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-1" />
                    Soạn thảo
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-foreground hover:bg-slate-100"
                    title="Chỉnh sửa thông tin khóa học"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCourse(course);
                      setCourseModalOpen(true);
                    }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                    title="Chuyển vào thùng rác"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!canUserDeleteCourse(course)) {
                        showBanner("Bạn không phải ng tạo khóa học", true);
                        return;
                      }
                      setDeleteCourseConfirm({ id: String(course.id), name: course.name });
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>

                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateToDetail(course.id);
                    }}
                    className="text-xs text-foreground font-semibold flex items-center gap-1 hover:underline cursor-pointer group-hover:translate-x-0.5 transition-transform"
                  >
                    Chi tiết <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* RoleManagement-style Multi-Column Sortable Table View */
        <Card className="shadow-xs border border-border/30 rounded-xl overflow-hidden bg-background">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border/30">
                {/* Sortable Header: Tên Khóa Học */}
                <TableHead
                  className="w-70 cursor-pointer select-none text-xs font-semibold uppercase tracking-wider group"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={getSortRuleInfo("name") ? "text-blue-600 font-bold" : "text-muted-foreground"}>
                      Tên Khóa Học
                    </span>
                    {renderSortIcon("name")}
                  </div>
                </TableHead>

                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Danh Mục</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Giảng Viên</TableHead>
                
                {/* Sortable Header: Đăng Ký */}
                <TableHead
                  className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wider group text-center"
                  onClick={() => handleSort("enrollmentCount")}
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className={getSortRuleInfo("enrollmentCount") ? "text-blue-600 font-bold" : "text-muted-foreground"}>
                      Đăng Ký
                    </span>
                    {renderSortIcon("enrollmentCount")}
                  </div>
                </TableHead>

                {/* Sortable Header: Giá Tham Chiếu */}
                <TableHead
                  className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wider group text-center"
                  onClick={() => handleSort("referencePrice")}
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className={getSortRuleInfo("referencePrice") ? "text-blue-600 font-bold" : "text-muted-foreground"}>
                      Giá Tham Chiếu
                    </span>
                    {renderSortIcon("referencePrice")}
                  </div>
                </TableHead>

                {/* Sortable Header: Đánh Giá */}
                <TableHead
                  className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wider group text-center"
                  onClick={() => handleSort("rating")}
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className={getSortRuleInfo("rating") ? "text-blue-600 font-bold" : "text-muted-foreground"}>
                      Đánh Giá
                    </span>
                    {renderSortIcon("rating")}
                  </div>
                </TableHead>

                {/* Sortable Header: Tạo Mới */}
                <TableHead
                  className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wider group text-center"
                  onClick={() => handleSort("createdAt")}
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className={getSortRuleInfo("createdAt") ? "text-blue-600 font-bold" : "text-muted-foreground"}>
                      Ngày Tạo
                    </span>
                    {renderSortIcon("createdAt")}
                  </div>
                </TableHead>

                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Trạng Thái</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Thao Tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCourses.map((course) => {
                return (
                  <TableRow
                    key={course.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors border-border/30"
                    onClick={() => handleNavigateToDetail(course.id)}
                  >
                    <TableCell className="font-semibold text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-slate-100 overflow-hidden shrink-0 border border-border/20">
                          <CourseCover src={course.coverImage} name={course.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="hover:text-blue-600 line-clamp-1">{course.name}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-muted-foreground text-sm font-medium">
                      {course.categoryName}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center -space-x-2">
                        {course.teachers.length > 0 ? (
                          course.teachers.map((t) => (
                            <TeacherAvatar
                              key={t.id}
                              src={t.avatar || undefined}
                              name={t.name}
                              className="w-7 h-7 rounded-full border-2 border-background object-cover"
                            />
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Chưa phân công</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-mono font-bold text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {(course as any).enrollmentCount || 0} HV
                      </span>
                    </TableCell>

                    <TableCell className="text-center font-mono font-bold text-sm text-foreground">
                      {course.referencePrice.toLocaleString("vi-VN")} đ
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1 text-amber-500 font-bold text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{course.rating > 0 ? course.rating.toFixed(1) : "—"}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">({course.reviewCount})</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {course.createdAt ? new Date(course.createdAt).toLocaleDateString("vi-VN") : "Mới tạo"}
                    </TableCell>

                    <TableCell className="text-center">{getStatusBadge(course.status)}</TableCell>

                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-500/10 cursor-pointer"
                          title="Soạn thảo chương & bài học (Course Builder Studio)"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${baseRoute}/${course.id}/builder`);
                          }}
                        >
                          <BookOpen className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:bg-primary/10 cursor-pointer"
                          title="Xem chi tiết"
                          onClick={() => handleNavigateToDetail(course.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-500/10 cursor-pointer"
                          title="Chỉnh sửa"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCourse(course);
                            setCourseModalOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                          title="Chuyển vào thùng rác"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!canUserDeleteCourse(course)) {
                              showBanner("Bạn không phải ng tạo khóa học", true);
                              return;
                            }
                            setDeleteCourseConfirm({ id: String(course.id), name: course.name });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ))}

      {/* RoleManagement-Style Pagination Footer */}
      {!loading && !error && sortedCourses.length > 0 && (
        <div className="px-5 py-3 border border-border/30 bg-background flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium rounded-xl shadow-xs">
          <div className="text-slate-500">
            Hiển thị <span className="font-semibold text-foreground/70">{sortedCourses.length === 0 ? 0 : page * pageSize + 1}</span> đến{" "}
            <span className="font-semibold text-foreground/70">{Math.min((page + 1) * pageSize, sortedCourses.length)}</span> trên{" "}
            <span className="font-semibold text-foreground/70">{sortedCourses.length}</span> khóa học
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Số dòng/trang:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-16 text-xs bg-white border border-slate-200 rounded-lg font-bold">
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
              <span className="text-slate-500">Tới trang:</span>
              <Input
                type="number"
                min={1}
                max={totalPages || 1}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                className="h-8 w-14 text-center text-xs font-bold bg-white border border-slate-200 rounded-lg"
              />
            </form>

            <div className="flex items-center gap-1">
              <Button
                disabled={page === 0}
                onClick={() => setPage((prev) => prev - 1)}
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Trước
              </Button>

              {getPageNumbers(page, totalPages).map((p, idx) => {
                if (p === "...") {
                  return <span key={`dots-${idx}`} className="px-1 text-slate-400 font-bold">...</span>;
                }
                const pageNum = p as number;
                const isCurrent = pageNum === page;
                return (
                  <Button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    variant={isCurrent ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}

              <Button
                disabled={page >= totalPages - 1 || totalPages === 0}
                onClick={() => setPage((prev) => prev + 1)}
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Sau <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Course Edit/Create Modal */}
      {courseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Đóng biểu mẫu"
              className="absolute right-4 top-4 p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              onClick={() => setCourseModalOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>

            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingCourse ? "Cập nhật khóa học" : "Tạo khóa học mới"}
            </h3>

            {/* Creator info (only shown when editing) */}
            {editingCourse && editingCourse.teachers && editingCourse.teachers.length > 0 && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <TeacherAvatar
                  src={editingCourse.teachers[0].avatar || undefined}
                  name={editingCourse.teachers[0].name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-300"
                />
                <div className="text-xs">
                  <p className="text-slate-500">Người tạo khóa học</p>
                  <p className="font-bold text-slate-800">{editingCourse.teachers[0].name}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tên khóa học</Label>
                <Input type="text" name="name" defaultValue={editingCourse?.name || ""} placeholder="E.g. Thiết kế website với React" required className="h-9 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Danh mục</Label>
                  <Select name="categoryId" defaultValue={String(editingCourse?.categoryId || categories[0]?.id || "")}>
                    <SelectTrigger className="h-9 bg-white text-sm">
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Cấp độ</Label>
                  <Select name="level" defaultValue={editingCourse?.level || formLevels[0]}>
                    <SelectTrigger className="h-9 bg-white text-sm">
                      <SelectValue placeholder="Chọn cấp độ" />
                    </SelectTrigger>
                    <SelectContent>
                      {formLevels.map((level) => <SelectItem key={level} value={level}>{enumLabel(level)} ({level})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status field – ONLY available for Admin when EDITING an existing course */}
              {editingCourse && isAdminUser && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Trạng thái khóa học</Label>
                  <Select
                    name="status"
                    defaultValue={editingCourse.status || "DRAFT"}
                  >
                    <SelectTrigger className="h-9 bg-white text-sm font-semibold">
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      {formStatuses.map((status) => <SelectItem key={status} value={status}>{enumLabel(status)} ({status})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400 mt-0.5">Chọn &quot;INACTIVE&quot; để tạm ẩn khóa học khỏi học viên, &quot;DRAFT&quot; để tiếp tục soạn thảo</p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mô tả khóa học</Label>
                <Textarea
                  name="description"
                  defaultValue={editingCourse?.description || ""}
                  placeholder="E.g. Giới thiệu tổng quan về khóa học, giáo án chi tiết và lộ trình học tập..."
                  required
                  className="min-h-20 bg-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setCourseModalOpen(false)} className="h-9 text-sm">Hủy</Button>
                <Button type="submit" className="h-9 bg-blue-600 text-white hover:bg-blue-700 text-sm">Xác nhận</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={Boolean(deleteCourseConfirm)}
        onOpenChange={(open) => { if (!open) setDeleteCourseConfirm(null); }}
        title="Xác nhận chuyển khóa học vào thùng rác"
        description={`Bạn có chắc chắn muốn xóa mềm khóa học "${deleteCourseConfirm?.name}"? Khóa học sẽ được di chuyển vào Thùng rác và có thể khôi phục bất cứ lúc nào.`}
        confirmText="Đưa vào thùng rác"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeleteCourseAction}
      />
    </div>
  );
};
