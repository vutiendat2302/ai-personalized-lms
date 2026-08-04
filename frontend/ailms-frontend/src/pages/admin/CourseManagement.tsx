import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import { courseApi } from "@/api/courses/courseApi";
import type { CourseResponse, CategoryResponse } from "@/types/admin";
import {
  BookOpen,
  FolderOpen,
  Plus,
  Search,
  Trash2,
  Edit,
  X,
  ArrowLeft,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Users,
} from "lucide-react";

const getPageNumbers = (currentPage: number, total: number) => {
  const pages: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 0; i < total; i++) pages.push(i);
  } else {
    pages.push(0);
    if (currentPage > 2) {
      pages.push("...");
    }
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(total - 2, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < total - 3) {
      pages.push("...");
    }
    pages.push(total - 1);
  }
  return pages;
};

export const CourseManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"courses" | "categories">("courses");
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  // Loading state
  const [loading, setLoading] = useState(false);

  // Data states
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  // View mode state
  const [courseViewMode, setCourseViewMode] = useState<"grid" | "table">("grid");

  // Pagination states
  const [coursePage, setCoursePage] = useState(0);
  const [coursePageSize, setCoursePageSize] = useState(10);
  const [courseTotalPages, setCourseTotalPages] = useState(0);
  const [courseTotalElements, setCourseTotalElements] = useState(0);
  const [courseJumpPageInput, setCourseJumpPageInput] = useState<string>("1");

  const [categoryPage, setCategoryPage] = useState(0);
  const [categoryPageSize, setCategoryPageSize] = useState(10);
  const [categoryTotalPages, setCategoryTotalPages] = useState(0);
  const [categoryTotalElements, setCategoryTotalElements] = useState(0);
  const [categoryJumpPageInput, setCategoryJumpPageInput] = useState<string>("1");

  useEffect(() => {
    setCourseJumpPageInput(String(coursePage + 1));
  }, [coursePage]);

  useEffect(() => {
    setCategoryJumpPageInput(String(categoryPage + 1));
  }, [categoryPage]);

  // Search states
  const [searchCourseName, setSearchCourseName] = useState("");
  const [searchCourseCategory, setSearchCourseCategory] = useState<string>("");
  const [searchCourseLevel, setSearchCourseLevel] = useState<string>("");
  const [searchCourseStatus, setSearchCourseStatus] = useState<string>("");

  const [searchCategoryName, setSearchCategoryName] = useState("");
  const [searchCategoryStatus, setSearchCategoryStatus] = useState<string>("");

  // Modal states
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseResponse | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);

  useEffect(() => {
    fetchCategoriesList();
  }, []);

  useEffect(() => {
    if (activeTab === "courses") {
      fetchCourses();
    } else {
      fetchCategories();
    }
  }, [activeTab, coursePage, coursePageSize, categoryPage, categoryPageSize]);

  const showBanner = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(""), 3000);
    } else {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(""), 3000);
    }
  };

  const fetchCategoriesList = async () => {
    try {
      const res = await courseApi.getAllCategories();
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err: any) {
      console.error("Lỗi lấy danh mục drop-down:", err);
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: coursePage,
        size: coursePageSize,
        sortBy: "id",
        sortDirection: "DESC"
      };
      if (searchCourseName) {
        params.name = searchCourseName;
        params.keyword = searchCourseName;
      }
      if (searchCourseCategory) params.categoryId = searchCourseCategory;
      if (searchCourseLevel) params.level = searchCourseLevel;
      if (searchCourseStatus !== "") params.status = searchCourseStatus;

      const res = await courseApi.searchCourses(params);
      if (res.data.success) {
        const pageData = res.data.data;
        setCourses(pageData.content || []);
        setCourseTotalPages(pageData.totalPages || 0);
        setCourseTotalElements(pageData.totalElements || 0);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải danh sách khóa học", true);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: categoryPage,
        size: categoryPageSize,
        sortBy: "id",
        sortDirection: "DESC"
      };
      if (searchCategoryName) params.name = searchCategoryName;
      if (searchCategoryStatus !== "") params.status = searchCategoryStatus;

      const res = await courseApi.searchCategories(params);
      if (res.data.success) {
        const pageData = res.data.data;
        setCategoryTotalPages(pageData.totalPages || 0);
        setCategoryTotalElements(pageData.totalElements || 0);
        setCategories(pageData.content || []);
      }
    } catch (err: any) {
      showBanner(err.message || "Không thể tải danh sách phân loại", true);
    } finally {
      setLoading(false);
    }
  };




  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const name = data.get("name") as string;
    const categoryId = data.get("categoryId") as string;
    const link = data.get("link") as string;
    const description = data.get("description") as string;
    const level = data.get("level") as string;

    try {
      if (editingCourse) {
        const res = await courseApi.updateCourse(editingCourse.id, { categoryId, name, link, description, level });
        if (res.data.success) {
          showBanner("Cập nhật khóa học thành công!");
          fetchCourses();
        }
      } else {
        const res = await courseApi.createCourse({ categoryId, name, link, description, level });
        if (res.data.success) {
          showBanner("Tạo khóa học mới thành công!");
          setCoursePage(0);
          fetchCourses();
        }
      }
      setCourseModalOpen(false);
      setEditingCourse(null);
    } catch (err: any) {
      showBanner(err.message || "Lỗi xử lý khóa học", true);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const name = data.get("name") as string;
    const description = data.get("description") as string;

    try {
      if (editingCategory) {
        const res = await courseApi.updateCategory(editingCategory.id, { name, description });
        if (res.data.success) {
          showBanner("Cập nhật danh mục thành công!");
          fetchCategoriesList();
          fetchCategories();
        }
      } else {
        const res = await courseApi.createCategory({ name, description });
        if (res.data.success) {
          showBanner("Tạo danh mục mới thành công!");
          setCategoryPage(0);
          fetchCategoriesList();
          fetchCategories();
        }
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (err: any) {
      showBanner(err.message || "Lỗi xử lý danh mục", true);
    }
  };

  const [deleteCourseConfirm, setDeleteCourseConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteCourse = (id: string, name: string) => {
    setDeleteCourseConfirm({ id, name });
  };

  const confirmDeleteCourseAction = async () => {
    if (!deleteCourseConfirm) return;
    try {
      const res = await courseApi.deleteCourse(deleteCourseConfirm.id);
      if (res.data.success) {
        showBanner("Đã di chuyển khóa học vào thùng rác thành công!");
        fetchCourses();
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi khi xóa khóa học", true);
    } finally {
      setDeleteCourseConfirm(null);
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    setDeleteCategoryConfirm({ id, name });
  };

  const confirmDeleteCategoryAction = async () => {
    if (!deleteCategoryConfirm) return;
    try {
      const res = await courseApi.deleteCategory(deleteCategoryConfirm.id);
      if (res.data.success) {
        showBanner("Xóa danh mục thành công!");
        fetchCategoriesList();
        fetchCategories();
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi khi xóa danh mục", true);
    } finally {
      setDeleteCategoryConfirm(null);
    }
  };

  const handleToggleCourseStatus = async (course: CourseResponse) => {
    const newStatus = course.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await courseApi.updateCourseStatus(course.id, newStatus);
      if (res.data.success) {
        showBanner(`Cập nhật trạng thái khóa học sang ${newStatus === "ACTIVE" ? "Hoạt động" : "Tạm ngưng"}`);
        fetchCourses();
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi cập nhật trạng thái", true);
    }
  };

  const handleToggleCategoryStatus = async (category: CategoryResponse) => {
    const newStatus = category.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await courseApi.updateCategoryStatus(category.id, newStatus);
      if (res.data.success) {
        showBanner(`Cập nhật trạng thái danh mục sang ${newStatus === "ACTIVE" ? "Hoạt động" : "Tạm ngưng"}`);
        fetchCategoriesList();
        fetchCategories();
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi cập nhật trạng thái", true);
    }
  };

  return (
    <div className="mx-auto max-w-none w-full px-6 py-8 lg:px-12 space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Top Banner Messages */}
      {successBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-green-500 text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
          <Check className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-destructive text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{errorBanner}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <Link to="/dashboard" className="flex items-center gap-1 hover:underline">
              <ArrowLeft className="h-3 w-3" />
              <span>Quay lại Dashboard</span>
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>Quản lý Khóa học & Phân loại</span>
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-muted/80 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("courses")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "courses"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Khóa học</span>
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "categories"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Danh mục</span>
          </button>
        </div>
      </div>

      {/* Main card */}
      <Card className="border-border shadow-sm bg-card">
        {activeTab === "courses" ? (
          <>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
              <div>
                <CardTitle className="text-lg font-bold font-heading">Danh sách khóa học</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Xem và biên tập các khóa học kỹ năng, cấp độ chuyên môn cùng nguồn học liệu.
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex bg-muted p-1 rounded-xl border border-border/40">
                  <button
                    onClick={() => setCourseViewMode("grid")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      courseViewMode === "grid"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Chế độ Lưới"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Lưới</span>
                  </button>
                  <button
                    onClick={() => setCourseViewMode("table")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      courseViewMode === "table"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Chế độ Bảng"
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>Bảng</span>
                  </button>
                </div>

                <Button
                  onClick={() => { setEditingCourse(null); setCourseModalOpen(true); }}
                  variant="default"
                  size="sm"
                  className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95"
                >
                  <Plus className="h-4 w-4" />
                  <span>Thêm khóa học</span>
                </Button>
              </div>
            </CardHeader>

            {/* Course Filters & Toolbar */}
            <div className="p-4 bg-muted/20 border-b border-border/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
              <div className="flex flex-col gap-1 lg:col-span-4">
                <Label className="text-[11px] font-bold text-muted-foreground">Từ khóa tìm kiếm</Label>
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm theo tên khóa học..."
                    value={searchCourseName}
                    onChange={(e) => setSearchCourseName(e.target.value)}
                    className="pl-8 h-9 text-xs border border-border bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1 lg:col-span-3">
                <Label className="text-[11px] font-bold text-muted-foreground">Danh mục</Label>
                <Select value={searchCourseCategory} onValueChange={(val) => setSearchCourseCategory(val === "ALL" || !val ? "" : val)}>
                  <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                    <SelectValue placeholder="Tất cả danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả danh mục</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1 lg:col-span-2">
                <Label className="text-[11px] font-bold text-muted-foreground">Cấp độ</Label>
                <Select value={searchCourseLevel} onValueChange={(val) => setSearchCourseLevel(val === "ALL" || !val ? "" : val)}>
                  <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                    <SelectValue placeholder="Tất cả cấp độ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả cấp độ</SelectItem>
                    <SelectItem value="BEGINNER">BEGINNER</SelectItem>
                    <SelectItem value="INTERMEDIATE">INTERMEDIATE</SelectItem>
                    <SelectItem value="ADVANCED">ADVANCED</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1 lg:col-span-2">
                <Label className="text-[11px] font-bold text-muted-foreground">Trạng thái</Label>
                <Select value={searchCourseStatus} onValueChange={(val) => setSearchCourseStatus(val === "ALL" || !val ? "" : val)}>
                  <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                    <SelectValue placeholder="Tất cả trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                    <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                    <SelectItem value="INACTIVE">Tạm ngưng</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1 lg:col-span-1 justify-end">
                <Button onClick={() => { setCoursePage(0); fetchCourses(); }} size="sm" className="h-9 font-semibold bg-primary text-primary-foreground hover:bg-primary/95 text-xs rounded-lg px-3">
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Courses Content (Grid vs Table) */}
            <CardContent className="p-0 relative">
              {loading && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center z-20">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              )}

              {courseViewMode === "grid" ? (
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[350px]">
                  {courses.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-muted-foreground text-sm">
                      Không tìm thấy khóa học nào.
                    </div>
                  ) : (
                    courses.map((course, index) => (
                      <Card key={course.id || index} className="border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between overflow-hidden bg-card group">
                        <CardHeader className="p-4 pb-2 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-bold border border-primary/20 truncate">
                              {course.categoryName}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              course.level === "BEGINNER" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                              course.level === "INTERMEDIATE" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                            }`}>
                              {course.level}
                            </span>
                          </div>
                          <CardTitle className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {course.name}
                          </CardTitle>
                          <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                            {course.description || "Chưa có mô tả chi tiết."}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="p-4 pt-1 space-y-3">
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
                            <div className="flex items-center gap-1.5 font-semibold text-muted-foreground">
                              <Users className="h-3.5 w-3.5 text-primary" />
                              <span>({course.enrollmentCount || 0} người đăng ký)</span>
                            </div>
                            <a
                              href={course.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline font-semibold flex items-center gap-1 text-xs"
                            >
                              <span>Học liệu</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-border/40">
                            <button
                              onClick={() => handleToggleCourseStatus(course)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                                course.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                              }`}
                            >
                              {course.status === "ACTIVE" ? "Hoạt động" : "Tạm ngưng"}
                            </button>

                            <div className="flex items-center gap-1">
                              <Button
                                onClick={() => { setEditingCourse(course); setCourseModalOpen(true); }}
                                variant="ghost"
                                size="icon"
                                title="Chỉnh sửa"
                                className="h-7 w-7 text-muted-foreground hover:bg-muted"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteCourse(course.id, course.name)}
                                variant="ghost"
                                size="icon"
                                title="Xóa vào thùng rác"
                                className="h-7 w-7 text-rose-600 hover:bg-rose-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
                  <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
                    <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Tên khóa học</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Danh mục</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cấp độ</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Người đăng ký</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Liên kết</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng thái</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="opacity-90">
                    {courses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                          Không tìm thấy khóa học nào.
                        </TableCell>
                      </TableRow>
                    ) : (
                      courses.map((course, index) => (
                        <TableRow key={course.id || index} className="hover:bg-foreground/10 transition-colors border-border/30">
                          <TableCell className="pl-4">
                            <div>
                              <p className="font-semibold text-xs text-foreground">{course.name}</p>
                              <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-xs">{course.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground font-semibold border border-border/40">
                              {course.categoryName}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              course.level === "BEGINNER" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                              course.level === "INTERMEDIATE" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                            }`}>
                              {course.level}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                              <Users className="h-3.5 w-3.5 text-primary" />
                              <span>({course.enrollmentCount || 0} người đăng ký)</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <a
                              href={course.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline font-semibold flex items-center gap-1 w-fit"
                            >
                              <span>Học liệu</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleToggleCourseStatus(course)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                                course.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                              }`}
                            >
                              {course.status === "ACTIVE" ? "Hoạt động" : "Tạm ngưng"}
                            </button>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                onClick={() => { setEditingCourse(course); setCourseModalOpen(true); }}
                                variant="ghost"
                                size="icon"
                                title="Chỉnh sửa"
                                className="h-7 w-7 text-muted-foreground hover:bg-muted"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteCourse(course.id, course.name)}
                                variant="ghost"
                                size="icon"
                                title="Xóa vào thùng rác"
                                className="h-7 w-7 text-rose-600 hover:bg-rose-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>

            {/* Modern RoleManagement-style Table Footer */}
            <div className="px-5 py-3 border-t border-border/40 bg-card flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium">
              <div className="text-muted-foreground">
                Hiển thị <span className="font-semibold text-foreground">{courses.length === 0 ? 0 : coursePage * coursePageSize + 1}</span> đến{" "}
                <span className="font-semibold text-foreground">{Math.min((coursePage + 1) * coursePageSize, courseTotalElements)}</span> trên{" "}
                <span className="font-semibold text-foreground">{courseTotalElements}</span> bản ghi
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Số dòng/trang:</span>
                  <Select
                    value={String(coursePageSize)}
                    onValueChange={(val) => {
                      setCoursePageSize(Number(val));
                      setCoursePage(0);
                    }}
                  >
                    <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border rounded-lg font-bold">
                      <SelectValue placeholder={String(coursePageSize)} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const pageNum = parseInt(courseJumpPageInput, 10);
                    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= courseTotalPages) {
                      setCoursePage(pageNum - 1);
                    } else {
                      setCourseJumpPageInput(String(coursePage + 1));
                    }
                  }}
                  className="flex items-center gap-1.5"
                >
                  <span className="text-muted-foreground">Tới trang:</span>
                  <Input
                    type="number"
                    min={1}
                    max={courseTotalPages || 1}
                    value={courseJumpPageInput}
                    onChange={(e) => setCourseJumpPageInput(e.target.value)}
                    onBlur={() => {
                      const pageNum = parseInt(courseJumpPageInput, 10);
                      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= courseTotalPages) {
                        setCoursePage(pageNum - 1);
                      } else {
                        setCourseJumpPageInput(String(coursePage + 1));
                      }
                    }}
                    className="h-8 w-14 text-center text-xs font-bold bg-background border border-border rounded-lg"
                  />
                </form>

                <div className="flex items-center gap-1">
                  <Button
                    disabled={coursePage === 0}
                    onClick={() => setCoursePage((prev) => prev - 1)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Trước
                  </Button>

                  {getPageNumbers(coursePage, courseTotalPages).map((p, pIdx) => {
                    if (p === "...") {
                      return (
                        <span key={`dots-${pIdx}`} className="px-1 text-muted-foreground font-bold">
                          ...
                        </span>
                      );
                    }
                    const pageNum = p as number;
                    const isCurrent = pageNum === coursePage;
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => setCoursePage(pageNum)}
                        variant={isCurrent ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}

                  <Button
                    disabled={coursePage >= courseTotalPages - 1 || courseTotalPages === 0}
                    onClick={() => setCoursePage((prev) => prev + 1)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Sau <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
              <div>
                <CardTitle className="text-lg font-bold font-heading">Danh mục khóa học</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Phân loại hệ thống khóa học giúp người dùng định vị bài giảng nhanh chóng.
                </CardDescription>
              </div>

              <Button
                onClick={() => { setEditingCategory(null); setCategoryModalOpen(true); }}
                variant="default"
                size="sm"
                className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm danh mục</span>
              </Button>
            </CardHeader>

            {/* Category Filters & Toolbar */}
            <div className="p-4 bg-muted/20 border-b border-border/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
              <div className="flex flex-col gap-1 lg:col-span-6">
                <Label className="text-[11px] font-bold text-muted-foreground">Từ khóa tìm kiếm</Label>
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm danh mục..."
                    value={searchCategoryName}
                    onChange={(e) => setSearchCategoryName(e.target.value)}
                    className="pl-8 h-9 text-xs border border-border bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1 lg:col-span-4">
                <Label className="text-[11px] font-bold text-muted-foreground">Trạng thái</Label>
                <Select value={searchCategoryStatus} onValueChange={(val) => setSearchCategoryStatus(val === "ALL" || !val ? "" : val)}>
                  <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                    <SelectValue placeholder="Tất cả trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                    <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                    <SelectItem value="INACTIVE">Tạm ngưng</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1 lg:col-span-2 justify-end">
                <Button onClick={() => { setCategoryPage(0); fetchCategories(); }} size="sm" className="h-9 font-semibold bg-primary text-primary-foreground hover:bg-primary/95 text-xs rounded-lg px-4">
                  <Search className="h-3.5 w-3.5 mr-1" /> Lọc
                </Button>
              </div>
            </div>

            {/* Categories Table */}
            <CardContent className="p-0 relative">
              {loading && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center z-20">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              )}
              <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
                <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
                  <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Tên danh mục</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mô tả</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng thái</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="opacity-90">
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center text-muted-foreground text-sm">
                        Không tìm thấy danh mục nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category, index) => (
                      <TableRow key={category.id || index} className="hover:bg-foreground/10 transition-colors border-border/30">
                        <TableCell className="font-semibold text-xs text-foreground pl-4">{category.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{category.description || "N/A"}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleToggleCategoryStatus(category)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                              category.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                            }`}
                          >
                            {category.status === "ACTIVE" ? "Hoạt động" : "Tạm ngưng"}
                          </button>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              onClick={() => { setEditingCategory(category); setCategoryModalOpen(true); }}
                              variant="ghost"
                              size="icon"
                              title="Chỉnh sửa"
                              className="h-7 w-7 text-muted-foreground hover:bg-muted"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteCategory(category.id, category.name)}
                              variant="ghost"
                              size="icon"
                              title="Xóa"
                              className="h-7 w-7 text-rose-600 hover:bg-rose-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>

            {/* Modern RoleManagement-style Table Footer */}
            <div className="px-5 py-3 border-t border-border/40 bg-card flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium">
              <div className="text-muted-foreground">
                Hiển thị <span className="font-semibold text-foreground">{categoryTotalElements === 0 ? 0 : categoryPage * categoryPageSize + 1}</span> đến{" "}
                <span className="font-semibold text-foreground">{Math.min((categoryPage + 1) * categoryPageSize, categoryTotalElements)}</span> trên{" "}
                <span className="font-semibold text-foreground">{categoryTotalElements}</span> bản ghi
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Số dòng/trang:</span>
                  <Select
                    value={String(categoryPageSize)}
                    onValueChange={(val) => {
                      setCategoryPageSize(Number(val));
                      setCategoryPage(0);
                    }}
                  >
                    <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border rounded-lg font-bold">
                      <SelectValue placeholder={String(categoryPageSize)} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const pageNum = parseInt(categoryJumpPageInput, 10);
                    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= categoryTotalPages) {
                      setCategoryPage(pageNum - 1);
                    } else {
                      setCategoryJumpPageInput(String(categoryPage + 1));
                    }
                  }}
                  className="flex items-center gap-1.5"
                >
                  <span className="text-muted-foreground">Tới trang:</span>
                  <Input
                    type="number"
                    min={1}
                    max={categoryTotalPages || 1}
                    value={categoryJumpPageInput}
                    onChange={(e) => setCategoryJumpPageInput(e.target.value)}
                    onBlur={() => {
                      const pageNum = parseInt(categoryJumpPageInput, 10);
                      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= categoryTotalPages) {
                        setCategoryPage(pageNum - 1);
                      } else {
                        setCategoryJumpPageInput(String(categoryPage + 1));
                      }
                    }}
                    className="h-8 w-14 text-center text-xs font-bold bg-background border border-border rounded-lg"
                  />
                </form>

                <div className="flex items-center gap-1">
                  <Button
                    disabled={categoryPage === 0}
                    onClick={() => setCategoryPage((prev) => prev - 1)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Trước
                  </Button>

                  {getPageNumbers(categoryPage, categoryTotalPages).map((p, pIdx) => {
                    if (p === "...") {
                      return (
                        <span key={`dots-${pIdx}`} className="px-1 text-muted-foreground font-bold">
                          ...
                        </span>
                      );
                    }
                    const pageNum = p as number;
                    const isCurrent = pageNum === categoryPage;
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => setCategoryPage(pageNum)}
                        variant={isCurrent ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}

                  <Button
                    disabled={categoryPage >= categoryTotalPages - 1 || categoryTotalPages === 0}
                    onClick={() => setCategoryPage((prev) => prev + 1)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Sau <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ==========================================
          MODALS
          ========================================== */}

      {/* Course Edit/Create Modal */}
      {courseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setCourseModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-4">
              {editingCourse ? "Cập nhật khóa học" : "Tạo khóa học mới"}
            </h3>

            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tên khóa học</Label>
                <Input type="text" name="name" defaultValue={editingCourse?.name || ""} placeholder="E.g. Thiết kế website với React" required className="h-9" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Danh mục</Label>
                  <select name="categoryId" defaultValue={editingCourse?.categoryId || (categories[0]?.id || "")} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none" required>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Cấp độ</Label>
                  <select name="level" defaultValue={editingCourse?.level || "BEGINNER"} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none">
                    <option value="BEGINNER">BEGINNER</option>
                    <option value="INTERMEDIATE">INTERMEDIATE</option>
                    <option value="ADVANCED">ADVANCED</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Đường dẫn học liệu (URL)</Label>
                <Input type="url" name="link" defaultValue={editingCourse?.link || ""} placeholder="E.g. https://youtube.com/..." required className="h-9" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mô tả khóa học</Label>
                <textarea
                  name="description"
                  defaultValue={editingCourse?.description || ""}
                  placeholder="E.g. Giới thiệu tổng quan về khóa học, giáo án chi tiết và lộ trình học tập..."
                  required
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setCourseModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" className="h-9 bg-primary text-primary-foreground hover:bg-primary/95">Xác nhận</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Edit/Create Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button
              onClick={() => setCategoryModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-foreground mb-4">
              {editingCategory ? "Cập nhật danh mục" : "Tạo danh mục mới"}
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tên danh mục</Label>
                <Input type="text" name="name" defaultValue={editingCategory?.name || ""} placeholder="E.g. Lập trình Web" required className="h-9" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mô tả danh mục</Label>
                <textarea
                  name="description"
                  defaultValue={editingCategory?.description || ""}
                  placeholder="E.g. Các bài giảng liên quan tới HTML, CSS, Javascript, Frameworks..."
                  required
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setCategoryModalOpen(false)} className="h-9">Hủy</Button>
                <Button type="submit" className="h-9 bg-primary text-primary-foreground hover:bg-primary/95">Xác nhận</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOGS */}
      <ConfirmDialog
        open={Boolean(deleteCourseConfirm)}
        onOpenChange={(open) => { if (!open) setDeleteCourseConfirm(null); }}
        title="Xác nhận chuyển khóa học vào thùng rác"
        description={`Bạn có chắc chắn muốn xóa mềm khóa học "${deleteCourseConfirm?.name}"? Khóa học sẽ được di chuyển vào Thùng rác và có thể khôi phục bất cứ lúc nào.`}
        confirmText="Đưa vào thùng rác"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeleteCourseAction}
      />

      <ConfirmDialog
        open={Boolean(deleteCategoryConfirm)}
        onOpenChange={(open) => { if (!open) setDeleteCategoryConfirm(null); }}
        title="Xác nhận xóa danh mục"
        description={`Bạn có chắc chắn muốn xóa danh mục "${deleteCategoryConfirm?.name}"? Thao tác không thể hoàn tác.`}
        confirmText="Xóa danh mục"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeleteCategoryAction}
      />

    </div>
  );
};
