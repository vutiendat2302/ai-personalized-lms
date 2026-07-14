import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertCircle
} from "lucide-react";

export const CourseManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"courses" | "categories">("courses");
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  // Loading state
  const [loading, setLoading] = useState(false);

  // Data states
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  // Pagination states
  const [coursePage, setCoursePage] = useState(0);
  const [courseTotalPages, setCourseTotalPages] = useState(0);
  const [courseTotalElements, setCourseTotalElements] = useState(0);

  const [categoryPage, setCategoryPage] = useState(0);
  const [categoryTotalPages, setCategoryTotalPages] = useState(0);
  const [categoryTotalElements, setCategoryTotalElements] = useState(0);

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
  }, [activeTab, coursePage, categoryPage]);

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
        size: 10,
        sortBy: "id",
        sortDirection: "DESC"
      };
      if (searchCourseName) params.name = searchCourseName;
      if (searchCourseCategory) params.categoryId = searchCourseCategory;
      if (searchCourseLevel) params.level = searchCourseLevel;
      if (searchCourseStatus !== "") params.status = parseInt(searchCourseStatus);

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
        size: 10,
        sortBy: "id",
        sortDirection: "DESC"
      };
      if (searchCategoryName) params.name = searchCategoryName;
      if (searchCategoryStatus !== "") params.status = parseInt(searchCategoryStatus);

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

  const handleDeleteCourse = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa khóa học "${name}"?`)) {
      try {
        const res = await courseApi.deleteCourse(id);
        if (res.data.success) {
          showBanner("Xóa khóa học thành công!");
          fetchCourses();
        }
      } catch (err: any) {
        showBanner(err.message || "Lỗi khi xóa khóa học", true);
      }
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${name}"?`)) {
      try {
        const res = await courseApi.deleteCategory(id);
        if (res.data.success) {
          showBanner("Xóa danh mục thành công!");
          fetchCategoriesList();
          fetchCategories();
        }
      } catch (err: any) {
        showBanner(err.message || "Lỗi khi xóa danh mục", true);
      }
    }
  };

  const handleToggleCourseStatus = async (course: CourseResponse) => {
    const newStatus = course.status === 1 ? 0 : 1;
    try {
      const res = await courseApi.updateCourseStatus(course.id, newStatus);
      if (res.data.success) {
        showBanner(`Cập nhật trạng thái khóa học sang ${newStatus === 1 ? "Hoạt động" : "Tạm ngưng"}`);
        fetchCourses();
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi cập nhật trạng thái", true);
    }
  };

  const handleToggleCategoryStatus = async (category: CategoryResponse) => {
    const newStatus = category.status === 1 ? 0 : 1;
    try {
      const res = await courseApi.updateCategoryStatus(category.id, newStatus);
      if (res.data.success) {
        showBanner(`Cập nhật trạng thái danh mục sang ${newStatus === 1 ? "Hoạt động" : "Tạm ngưng"}`);
        fetchCategoriesList();
        fetchCategories();
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi cập nhật trạng thái", true);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in-50 duration-300">
      
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

              <Button
                onClick={() => { setEditingCourse(null); setCourseModalOpen(true); }}
                variant="default"
                size="sm"
                className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm khóa học</span>
              </Button>
            </CardHeader>

            {/* Course Filters */}
            <div className="p-4 bg-muted/20 border-b border-border/80 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên khóa học..."
                  value={searchCourseName}
                  onChange={(e) => setSearchCourseName(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <select
                value={searchCourseCategory}
                onChange={(e) => setSearchCourseCategory(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm outline-none"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={searchCourseLevel}
                onChange={(e) => setSearchCourseLevel(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm outline-none"
              >
                <option value="">Tất cả cấp độ</option>
                <option value="BEGINNER">BEGINNER</option>
                <option value="INTERMEDIATE">INTERMEDIATE</option>
                <option value="ADVANCED">ADVANCED</option>
              </select>

              <select
                value={searchCourseStatus}
                onChange={(e) => setSearchCourseStatus(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm outline-none"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="1">Hoạt động</option>
                <option value="0">Tạm ngưng</option>
              </select>

              <Button onClick={() => { setCoursePage(0); fetchCourses(); }} size="sm" className="h-9 px-4 font-bold bg-muted hover:bg-muted/80 text-foreground">
                Lọc
              </Button>
            </div>

            {/* Courses Table */}
            <CardContent className="p-0 relative">
              {loading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border/85 text-muted-foreground text-xs font-semibold bg-muted/10">
                      <th className="py-3 px-4 w-16">ID</th>
                      <th className="py-3 px-2">Tên khóa học</th>
                      <th className="py-3 px-2">Danh mục</th>
                      <th className="py-3 px-2">Cấp độ</th>
                      <th className="py-3 px-2">Liên kết</th>
                      <th className="py-3 px-2">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {courses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">
                          Không tìm thấy khóa học nào.
                        </td>
                      </tr>
                    ) : (
                      courses.map((course) => (
                        <tr key={course.id} className="hover:bg-muted/10 transition-colors">
                          <td className="py-3 px-4 font-bold text-xs text-muted-foreground">#{course.id}</td>
                          <td className="py-3 px-2">
                            <div>
                              <p className="font-bold text-foreground">{course.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{course.description}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-foreground font-semibold">
                              {course.categoryName}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              course.level === "BEGINNER" ? "bg-green-500/10 text-green-600" :
                              course.level === "INTERMEDIATE" ? "bg-amber-500/10 text-amber-600" : "bg-destructive/10 text-destructive"
                            }`}>
                              {course.level}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-xs">
                            <a
                              href={course.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 w-fit"
                            >
                              <span>Học liệu</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </td>
                          <td className="py-3 px-2">
                            <button
                              onClick={() => handleToggleCourseStatus(course)}
                              className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                course.status === 1 ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {course.status === 1 ? "Hoạt động" : "Tạm ngưng"}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                onClick={() => { setEditingCourse(course); setCourseModalOpen(true); }}
                                variant="ghost"
                                size="icon-xs"
                                title="Chỉnh sửa"
                                className="text-muted-foreground hover:bg-muted"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteCourse(course.id, course.name)}
                                variant="ghost"
                                size="icon-xs"
                                title="Xóa"
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>

            {/* Pagination */}
            {courseTotalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Tổng số: {courseTotalElements} khóa học</span>
                <div className="flex gap-2">
                  <Button
                    disabled={coursePage === 0}
                    onClick={() => setCoursePage(prev => prev - 1)}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    Trước
                  </Button>
                  <span className="text-xs font-semibold py-1 px-3 bg-muted rounded">Trang {coursePage + 1} / {courseTotalPages}</span>
                  <Button
                    disabled={coursePage >= courseTotalPages - 1}
                    onClick={() => setCoursePage(prev => prev + 1)}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
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

            {/* Category Filters */}
            <div className="p-4 bg-muted/20 border-b border-border/80 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm kiếm danh mục..."
                  value={searchCategoryName}
                  onChange={(e) => setSearchCategoryName(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <select
                value={searchCategoryStatus}
                onChange={(e) => setSearchCategoryStatus(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm outline-none"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="1">Hoạt động</option>
                <option value="0">Tạm ngưng</option>
              </select>
            </div>

            {/* Categories Table */}
            <CardContent className="p-0 relative">
              {loading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border/85 text-muted-foreground text-xs font-semibold bg-muted/10">
                      <th className="py-3 px-4 w-16">ID</th>
                      <th className="py-3 px-2">Tên danh mục</th>
                      <th className="py-3 px-2">Mô tả</th>
                      <th className="py-3 px-2">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                          Không tìm thấy danh mục nào.
                        </td>
                      </tr>
                    ) : (
                      categories.map((category) => (
                        <tr key={category.id} className="hover:bg-muted/10 transition-colors">
                          <td className="py-3 px-4 font-bold text-xs text-muted-foreground">#{category.id}</td>
                          <td className="py-3 px-2 font-bold text-foreground">{category.name}</td>
                          <td className="py-3 px-2 text-xs text-muted-foreground">{category.description}</td>
                          <td className="py-3 px-2">
                            <button
                              onClick={() => handleToggleCategoryStatus(category)}
                              className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                category.status === 1 ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {category.status === 1 ? "Hoạt động" : "Tạm ngưng"}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                onClick={() => { setEditingCategory(category); setCategoryModalOpen(true); }}
                                variant="ghost"
                                size="icon-xs"
                                title="Chỉnh sửa"
                                className="text-muted-foreground hover:bg-muted"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteCategory(category.id, category.name)}
                                variant="ghost"
                                size="icon-xs"
                                title="Xóa"
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>

            {/* Pagination */}
            {categoryTotalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Tổng số: {categoryTotalElements} danh mục</span>
                <div className="flex gap-2">
                  <Button
                    disabled={categoryPage === 0}
                    onClick={() => setCategoryPage(prev => prev - 1)}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    Trước
                  </Button>
                  <span className="text-xs font-semibold py-1 px-3 bg-muted rounded">Trang {categoryPage + 1} / {categoryTotalPages}</span>
                  <Button
                    disabled={categoryPage >= categoryTotalPages - 1}
                    onClick={() => setCategoryPage(prev => prev + 1)}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
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

    </div>
  );
};
