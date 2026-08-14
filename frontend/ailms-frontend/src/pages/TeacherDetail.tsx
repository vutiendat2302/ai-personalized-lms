import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { publicCatalogApi, type PublicCourseCard } from "@/api/public/publicCatalogApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  BookOpen,
  Users,
  ArrowLeft,
  ChevronRight,
  Layers,
  Briefcase,
} from "lucide-react";

const formatCourseLevel = (level: string | null) => {
  if (!level) return "";
  const map: Record<string, string> = {
    BEGINNER: "Cơ bản",
    INTERMEDIATE: "Trung cấp",
    ADVANCED: "Nâng cao",
  };
  return map[level] ?? level;
};

export interface TeacherProfile {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatar: string;
  rating: number;
  coursesCount: number;
  studentsCount: number;
  experienceYears: number | null;
  skills: string[];
  categories: string[];
}

/**
 * Trang thông tin chi tiết giảng viên (TeacherDetail)
 * Hiển thị hồ sơ giảng viên, danh mục giảng dạy và các khóa học do giảng viên này phụ trách.
 */
export const TeacherDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [courses, setCourses] = useState<PublicCourseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [coursePage, setCoursePage] = useState(0);
  const [hasMoreCourses, setHasMoreCourses] = useState(false);

  /**
   * Tải hồ sơ giảng viên và danh sách khóa học dựa trên teacher ID.
   */
  useEffect(() => {
    let ignore = false;
    const fetchTeacherProfile = async () => {
      setLoading(true);
      try {
        if (!id) throw new Error("Missing teacher id");
        const [teacherResponse, coursesResponse] = await Promise.all([
          publicCatalogApi.getTeacher(id),
          publicCatalogApi.getTeacherCourses(id, { page: 0, size: 12 }),
        ]);
        const profile = teacherResponse.data.data;
        if (!ignore) {
          setTeacher({
            id: profile.id,
            name: profile.fullName ?? "Chưa cập nhật",
            role: profile.title ?? (profile.categories[0] ? profile.categories[0].name : null) ?? "Chưa cập nhật",
            bio: profile.bio ?? "Chưa có thông tin giới thiệu.",
            avatar: profile.avatarUrl ?? "",
            rating: profile.averageRating,
            coursesCount: profile.courseCount,
            studentsCount: profile.studentCount,
            experienceYears: profile.experienceYears,
            skills: profile.categories.map((category) => category.name),
            categories: profile.categories.map((category) => category.name),
          });
          const coursesPage = coursesResponse.data.data;
          setCourses(coursesPage.content);
          setHasMoreCourses(!coursesPage.last);
        }
      } catch (err) {
        console.error("Error loading teacher profile:", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void fetchTeacherProfile();
    return () => {
      ignore = true;
    };
  }, [id]);

  /** Tải tiếp khóa học thật của giáo viên theo phân trang Backend. */
  const loadMoreCourses = async () => {
    if (!id || !hasMoreCourses) return;
    const nextPage = coursePage + 1;
    try {
      const response = await publicCatalogApi.getTeacherCourses(id, { page: nextPage, size: 12 });
      const page = response.data.data;
      setCourses((current) => [...current, ...page.content]);
      setCoursePage(nextPage);
      setHasMoreCourses(!page.last);
    } catch {
      setHasMoreCourses(false);
    }
  };

  /**
   * Lấy danh sách các danh mục duy nhất từ các khóa học của giảng viên.
   */
  const availableCategories = useMemo(() => {
    if (courses.length === 0) return teacher ? teacher.categories : [];
    const catSet = new Set<string>();
    courses.forEach((c) => {
      if (c.categoryName) catSet.add(c.categoryName);
    });
    return Array.from(catSet);
  }, [courses, teacher]);

  /**
   * Lọc khóa học theo danh mục được chọn.
   */
  const filteredCourses = useMemo(() => {
    if (selectedCategory === "ALL") return courses;
    return courses.filter((c) => c.categoryName === selectedCategory);
  }, [courses, selectedCategory]);

  /**
   * Xử lý thay đổi danh mục lọc.
   */
  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm font-medium text-muted-foreground">Đang tải thông tin giảng viên...</p>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <BookOpen className="h-12 w-12" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-foreground">Không tìm thấy giảng viên</h2>
        <Button onClick={() => { void navigate("/"); }} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại trang chủ
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-20">
      
      {/* 1. TEACHER HERO HEADER */}
      <div className="bg-linear-to-b from-muted/40 via-muted/20 to-background border-b border-border/30 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.history.length > 1) {
                  void navigate(-1);
                } else {
                  void navigate("/");
                }
              }}
              className="rounded-xl gap-1.5 text-xs font-semibold border-border/70 bg-card hover:bg-foreground hover:text-white text-foreground cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </Button>

            <nav className="flex items-center space-x-2 text-xs text-muted-foreground font-medium">
              <Link to="/" className="hover:text-white hover:bg-foreground rounded-xl gap-1.5 p-1 font-semibold transition-colors">Trang chủ</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-muted-foreground font-medium">Giảng viên</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-semibold">{teacher.name}</span>
            </nav>
          </div>

          {/* Profile Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Avatar & Info */}
            <div className="lg:col-span-8 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="h-28 w-28 md:h-36 md:w-36 rounded-full border-2 border-primary/30 bg-card p-1 shadow-xl shrink-0 overflow-hidden">
                {teacher.avatar ? <img src={teacher.avatar} alt={teacher.name} className="w-full h-full object-cover rounded-full" /> : <span className="flex h-full w-full items-center justify-center rounded-full text-4xl font-bold text-primary">{teacher.name.charAt(0).toUpperCase()}</span>}
              </div>

              <div className="space-y-3 flex-1">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                      {teacher.name}
                    </h1>
                  </div>
                  <p className="text-base font-bold text-primary">{teacher.role}</p>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed italic max-w-3xl">
                  &ldquo;{teacher.bio}&rdquo;
                </p>

                {/* Skill Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {teacher.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted border border-border/60 text-muted-foreground"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Quick Stats Box */}
            <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-6 shadow-sm divide-y divide-border/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span>Đánh giá trung bình</span>
                </div>
                <span className="text-xl font-black text-foreground">{teacher.rating ? `${teacher.rating.toFixed(1)} ★` : "Chưa có dữ liệu"}</span>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>Tổng số khóa học</span>
                </div>
                <span className="text-xl font-black text-foreground">{teacher.coursesCount} khóa</span>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="h-4 w-4 text-emerald-500" />
                  <span>Học viên theo học</span>
                </div>
                <span className="text-xl font-black text-foreground">{teacher.studentsCount.toLocaleString()}+</span>
              </div>

              {teacher.experienceYears != null && <div className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Briefcase className="h-4 w-4 text-indigo-500" />
                  <span>Kinh nghiệm</span>
                </div>
                <span className="text-sm font-extrabold text-foreground">{teacher.experienceYears} năm</span>
              </div>}
            </div>

          </div>
        </div>
      </div>

      {/* 2. CATEGORIES FILTER SECTION (DANH MỤC CỦA GIẢNG VIÊN) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-8">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-foreground">Danh mục giảng dạy</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Các lĩnh vực chuyên môn do giảng viên {teacher.name} phụ trách.</p>
            </div>
            
            <Badge variant="outline" className="w-fit text-sm font-semibold px-3 py-1 rounded-lg border-border/80 text-white bg-primary">
              {filteredCourses.length} khóa học hiển thị
            </Badge>
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => { handleCategorySelect("ALL"); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                selectedCategory === "ALL"
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-card text-foreground border-border/80 hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              Tất cả danh mục
            </button>

            {availableCategories.map((catName) => (
              <button
                key={catName}
                onClick={() => { handleCategorySelect(catName); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  selectedCategory === catName
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-card text-foreground border-border/80 hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                {catName} 
              </button>
            ))}
          </div>
        </div>

        {/* 3. COURSES LIST (CÁC KHÓA HỌC CỦA GIẢNG VIÊN) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Danh sách khóa học ({filteredCourses.length})
            </h3>
          </div>

          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCourses.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="flex flex-col bg-card rounded-2xl border border-border/80 shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-1.5 cursor-pointer overflow-hidden group transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    {course.thumbnailUrl ? <img
                      src={course.thumbnailUrl}
                      alt={course.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    /> : <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground"><BookOpen className="h-8 w-8" /></div>}
                    {course.level && (
                      <Badge className="absolute top-3 left-3 bg-foreground/90 backdrop-blur-sm text-white font-bold shadow-sm">
                        {formatCourseLevel(course.level)}
                      </Badge>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {course.categoryName}
                        </span>
                      </div>
                      <h4 className="font-bold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {course.name}
                      </h4>
                      {course.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                        <span className="font-bold text-foreground">{course.averageRating ? course.averageRating.toFixed(1) : "Chưa có đánh giá"}</span>
                        {course.studentCount != null && <span>({course.studentCount} học viên)</span>}
                      </div>
                      <span className="font-bold text-primary text-sm">
                        {course.currentPrice != null ? `${course.currentPrice.toLocaleString("vi-VN")}đ` : "Miễn phí"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-muted/10">
              <Layers className="h-10 w-10 text-muted-foreground/45 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-semibold">Giảng viên chưa có khóa học nào thuộc danh mục này.</p>
            </div>
          )}
          {hasMoreCourses && <div className="flex justify-center"><Button type="button" variant="outline" onClick={() => { void loadMoreCourses(); }}>Xem thêm khóa học</Button></div>}
        </div>

      </div>
    </div>
  );
};

