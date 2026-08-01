import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import type { CourseExtended, CourseStatus } from "@/types/adminCourseClass";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";

export const CourseCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseExtended[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(9);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("ALL");
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState<string>("ALL");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [courseRows, categoryRows, packageRows, employeeRows] = await Promise.all([
          adminCourseClassApi.getCourses(),
          adminCourseClassApi.getCategories(),
          adminCourseClassApi.getPackages(),
          adminCourseClassApi.getEmployees(),
        ]);
        const employeeById = new Map(employeeRows.map((item: any) => [String(item.id || item.userId), item]));
        setCategories(categoryRows);
        setEmployees(employeeRows);
        setCourses(courseRows.map((course: any) => {
          const owner = employeeById.get(String(course.createdBy));
          const packages = packageRows.filter((item: any) => String(item.courseId) === String(course.id));
          return {
            ...course,
            id: String(course.id),
            categoryId: String(course.categoryId),
            status: course.status === "PENDING" ? "PENDING_APPROVAL" : course.status,
            level: course.level === "BEGINNER" ? "BASIC" : course.level,
            teachers: owner ? [{ id: String(owner.id || owner.userId), name: owner.fullName, avatar: owner.avatarUrl || "", category: course.categoryName }] : [],
            rating: Number(course.avgRating || 0),
            packages: packages.map((item: any) => ({ ...item, id: String(item.id), courseId: String(item.courseId), active: item.status === "ACTIVE", attachedClassId: item.classId ? String(item.classId) : undefined, attachedClassName: item.className })),
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
    void load();
  }, []);

  const filteredCourses = useMemo(() => courses.filter((course) => {
    const matchesSearch =
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "ALL" || course.categoryId === selectedCategory;
    const matchesStatus =
      selectedStatus === "ALL" || course.status === selectedStatus;
    const matchesTeacher =
      selectedTeacher === "ALL" ||
      course.teachers.some((t) => t.id === selectedTeacher);
    const matchesDelivery =
      selectedDeliveryMode === "ALL" ||
      course.packages.some((p) => p.deliveryMode === selectedDeliveryMode);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesStatus &&
      matchesTeacher &&
      matchesDelivery
    );
  }), [courses, searchTerm, selectedCategory, selectedStatus, selectedTeacher, selectedDeliveryMode]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const paginatedCourses = useMemo(
    () => filteredCourses.slice(page * pageSize, (page + 1) * pageSize),
    [filteredCourses, page, pageSize]
  );

  useEffect(() => { setPage(0); }, [searchTerm, selectedCategory, selectedStatus, selectedTeacher, selectedDeliveryMode, pageSize]);

  useEffect(() => {
    if (page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);

  const getStatusBadge = (status: CourseStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
            ● Đang Hoạt Động
          </Badge>
        );
      case "PENDING_APPROVAL":
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
      case "DRAFT":
      case "INACTIVE":
      default:
        return (
          <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20 font-medium">
            ● Nháp / Tạm Ẩn
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
            Quản Lý Khóa Học
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tổng quan tất cả khóa học trong hệ thống (Nội dung & Các gói bán)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className={`h-8 px-3 text-xs ${
                viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
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
                viewMode === "table" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm tên khóa học..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white h-9 text-sm"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-white h-9 text-sm">
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả danh mục</SelectItem>
                {categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="bg-white h-9 text-sm">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE">Đang hoạt động (ACTIVE)</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Chờ duyệt (PENDING)</SelectItem>
                <SelectItem value="REJECTED">Từ chối (REJECTED)</SelectItem>
                <SelectItem value="DRAFT">Nháp (DRAFT)</SelectItem>
              </SelectContent>
            </Select>

            {/* Teacher Filter */}
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
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

            {/* Delivery Mode Filter */}
            <Select value={selectedDeliveryMode} onValueChange={setSelectedDeliveryMode}>
              <SelectTrigger className="bg-white h-9 text-sm">
                <SelectValue placeholder="Hình thức bán" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả hình thức</SelectItem>
                <SelectItem value="SELF_STUDY">Tự học (SELF_STUDY)</SelectItem>
                <SelectItem value="GROUP_CLASS">Lớp nhóm (GROUP_CLASS)</SelectItem>
                <SelectItem value="ONE_ON_ONE">1 Kèm 1 (ONE_ON_ONE)</SelectItem>
                <SelectItem value="COMBO">Combo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading && <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải khóa học...</div>}
      {!loading && error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> {error}</div>}
      {!loading && !error && filteredCourses.length === 0 && <div className="rounded-xl border border-dashed p-12 text-center text-sm text-slate-500">Không có khóa học phù hợp.</div>}

      {/* Content Section */}
      {!loading && !error && filteredCourses.length > 0 && (viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedCourses.map((course) => (
            <Card
              key={course.id}
              className="group cursor-pointer hover:shadow-md transition-all border-slate-200 overflow-hidden flex flex-col justify-between"
              onClick={() => navigate(`/admin/courses/${course.id}`)}
            >
              <div>
                {/* Cover Image Container */}
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={course.coverImage || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80"}
                    alt={course.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    {getStatusBadge(course.status)}
                  </div>
                  <div className="absolute top-3 right-3 bg-slate-900/70 text-white text-xs font-semibold px-2 py-1 rounded backdrop-blur-sm">
                    {course.categoryName}
                  </div>
                </div>

                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold text-slate-900 line-clamp-2 text-base group-hover:text-blue-600 transition-colors">
                    {course.name}
                  </h3>

                  {/* Rating & Review */}
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="flex items-center text-amber-500 font-semibold gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {course.rating > 0 ? course.rating.toFixed(1) : "Mới"}
                    </div>
                    <span>•</span>
                    <span>{course.reviewCount} đánh giá</span>
                  </div>

                  {/* Teachers Avatar Group */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <span>Giảng viên:</span>
                    <div className="flex items-center -space-x-2">
                      {course.teachers.length > 0 ? (
                        course.teachers.map((t) => (
                          <img
                            key={t.id}
                            src={t.avatar}
                            alt={t.name}
                            title={t.name}
                            className="w-6 h-6 rounded-full border-2 border-white object-cover"
                          />
                        ))
                      ) : (
                        <span className="text-slate-400 italic">Chưa phân công</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </div>

              <div className="px-5 pb-4 pt-0 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                  <span>{course.packages.length} gói bán</span>
                </div>
                <span className="text-xs text-blue-600 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Chi tiết <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card className="shadow-none border-slate-200">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[300px]">Tên Khóa Học</TableHead>
                <TableHead>Danh Mục</TableHead>
                <TableHead>Giảng Viên</TableHead>
                <TableHead>Giá Tham Chiếu</TableHead>
                <TableHead>Đánh Giá</TableHead>
                <TableHead>Trạng Thái</TableHead>
                <TableHead className="text-center">Số Gói Bán Active</TableHead>
                <TableHead className="text-right">Thao Tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCourses.map((course) => {
                const activePackagesCount = course.packages.filter((p) => p.active).length;
                return (
                  <TableRow
                    key={course.id}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                    onClick={() => navigate(`/admin/courses/${course.id}`)}
                  >
                    <TableCell className="font-semibold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-slate-100 overflow-hidden flex-shrink-0">
                          <img
                            src={course.coverImage || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=100&q=80"}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="hover:text-blue-600 line-clamp-1">{course.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {course.categoryName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center -space-x-2">
                        {course.teachers.length > 0 ? (
                          course.teachers.map((t) => (
                            <img
                              key={t.id}
                              src={t.avatar}
                              alt={t.name}
                              title={t.name}
                              className="w-7 h-7 rounded-full border-2 border-white object-cover"
                            />
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa phân công</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {course.referencePrice.toLocaleString("vi-VN")} đ
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-amber-500 font-medium text-sm">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{course.rating > 0 ? course.rating.toFixed(1) : "—"}</span>
                        <span className="text-xs text-slate-400">({course.reviewCount})</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(course.status)}</TableCell>
                    <TableCell className="text-center font-medium">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        {activePackagesCount} active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => navigate(`/admin/courses/${course.id}`)}
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ))}

      {!loading && !error && filteredCourses.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-slate-500">
            Hiển thị <span className="font-semibold text-slate-700">{page * pageSize + 1}</span>–<span className="font-semibold text-slate-700">{Math.min((page + 1) * pageSize, filteredCourses.length)}</span> trên <span className="font-semibold text-slate-700">{filteredCourses.length}</span> khóa học
          </p>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="h-8 w-24 text-xs bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 / trang</SelectItem>
                <SelectItem value="9">9 / trang</SelectItem>
                <SelectItem value="12">12 / trang</SelectItem>
                <SelectItem value="24">24 / trang</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 px-2" disabled={page === 0} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="min-w-20 text-center text-xs font-semibold text-slate-700">Trang {page + 1}/{totalPages}</span>
            <Button variant="outline" size="sm" className="h-8 px-2" disabled={page >= totalPages - 1} onClick={() => setPage((value) => value + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
};
