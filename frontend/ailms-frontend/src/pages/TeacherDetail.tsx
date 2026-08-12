import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { courseApi } from "@/api/courses/courseApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  BookOpen,
  GraduationCap,
  Users,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Briefcase,
} from "lucide-react";

export interface TeacherProfile {
  id: string;
  name: string;
  role: string;
  school: string;
  bio: string;
  avatar: string;
  rating: number;
  coursesCount: number;
  studentsCount: number;
  experienceYears: number;
  skills: string[];
  categories: string[];
}

// Dữ liệu mẫu giảng viên giàu kinh nghiệm
export const INSTRUCTORS_LIST: TeacherProfile[] = [
  {
    id: "nam-nguyen",
    name: "GS. TS. Nguyễn Hải Nam",
    role: "Giảng viên AI & Học Máy",
    school: "Đại học Bách Khoa Hà Nội",
    bio: "Cựu nghiên cứu sinh sau tiến sĩ tại Stanford University. Hơn 10 năm kinh nghiệm phát triển mô hình NLP và Deep Learning tại Thung lũng Silicon.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=nam_instructor",
    rating: 4.95,
    coursesCount: 4,
    studentsCount: 2850,
    experienceYears: 12,
    skills: ["Python", "PyTorch", "NLP", "Deep Learning", "Computer Vision"],
    categories: ["AI & Trí tuệ Nhân tạo", "Khoa học Máy tính", "Toán học"]
  },
  {
    id: "duong-le",
    name: "ThS. Lê Thùy Dương",
    role: "Chuyên gia Thiết kế UI/UX",
    school: "FPT Arena Multimedia",
    bio: "Senior Product Designer tại Grab Singapore. Đam mê xây dựng các sản phẩm thân thiện với người dùng và hệ thống Design System chuẩn mực.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=duong_instructor",
    rating: 4.8,
    coursesCount: 3,
    studentsCount: 1940,
    experienceYears: 8,
    skills: ["Figma", "UI/UX", "Design System", "UX Research", "Prototyping"],
    categories: ["Thiết kế UI/UX", "Phát triển Web"]
  },
  {
    id: "dat-tran",
    name: "Kỹ sư Trần Tiến Đạt",
    role: "Kiến trúc sư Web Fullstack",
    school: "Đại học Khoa học Tự nhiên",
    bio: "Tech Lead tại VNG Corporation. Tác giả nhiều thư viện mã nguồn mở Javascript/TypeScript với hàng chục ngàn lượt tải xuống.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=dat_instructor",
    rating: 4.9,
    coursesCount: 5,
    studentsCount: 3420,
    experienceYears: 10,
    skills: ["React", "Node.js", "TypeScript", "Microservices", "Docker"],
    categories: ["Phát triển Web", "Khoa học Máy tính"]
  }
];

// Map danh sách khóa học theo từng giảng viên
const TEACHER_COURSES_MAP: Record<string, any[]> = {
  "nam-nguyen": [
    {
      id: "1",
      name: "Lập trình Python từ cơ bản đến nâng cao cho AI",
      categoryName: "AI & Trí tuệ Nhân tạo",
      level: "Cơ bản",
      avgRating: 4.95,
      enrollmentCount: 1240,
      suggestedPrice: 2450000,
      image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=500&auto=format&fit=crop&q=60",
      description: "Học ngôn ngữ lập trình Python từ con số 0, chuẩn bị nền tảng vững chắc cho việc nghiên cứu AI và Học máy."
    },
    {
      id: "ai-2",
      name: "Học Máy & Deep Learning thực chiến với PyTorch",
      categoryName: "AI & Trí tuệ Nhân tạo",
      level: "Nâng cao",
      avgRating: 4.98,
      enrollmentCount: 890,
      suggestedPrice: 3200000,
      image: "https://images.unsplash.com/photo-1527474305487-b87b222841cc?w=500&auto=format&fit=crop&q=60",
      description: "Xây dựng và huấn luyện các mô hình Mạng Nơ-ron nhân tạo chuyên sâu ứng dụng vào thị giác máy tính và xử lý chuỗi dữ liệu."
    },
    {
      id: "ai-3",
      name: "Xử lý Ngôn ngữ Tự nhiên (NLP) & Large Language Models",
      categoryName: "AI & Trí tuệ Nhân tạo",
      level: "Nâng cao",
      avgRating: 4.92,
      enrollmentCount: 520,
      suggestedPrice: 3800000,
      image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60",
      description: "Tìm hiểu kiến trúc Transformer, BERT, GPT và thực hành fine-tune LLM phục vụ các bài toán thực tế doanh nghiệp."
    },
    {
      id: "math-1",
      name: "Toán học rời rạc và ứng dụng trong Khoa học máy tính",
      categoryName: "Toán học",
      level: "Trung cấp",
      avgRating: 4.9,
      enrollmentCount: 710,
      suggestedPrice: 1850000,
      image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=60",
      description: "Trang bị tư duy logic toán học rời rạc nền tảng, tiền đề quan trọng thiết kế cấu trúc dữ liệu và giải thuật."
    }
  ],
  "duong-le": [
    {
      id: "ux-1",
      name: "Thiết kế Giao diện UI/UX chuyên nghiệp với Figma",
      categoryName: "Thiết kế UI/UX",
      level: "Cơ bản",
      avgRating: 4.8,
      enrollmentCount: 950,
      suggestedPrice: 1950000,
      image: "https://images.unsplash.com/photo-1561070791-26c113006238?w=500&auto=format&fit=crop&q=60",
      description: "Nắm vững tư duy thiết kế trải nghiệm người dùng, quy trình Wireframing, Prototyping và sử dụng thành thạo Figma."
    },
    {
      id: "ux-2",
      name: "Xây dựng Design System chuẩn doanh nghiệp",
      categoryName: "Thiết kế UI/UX",
      level: "Trung cấp",
      avgRating: 4.85,
      enrollmentCount: 610,
      suggestedPrice: 2800000,
      image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=500&auto=format&fit=crop&q=60",
      description: "Phương pháp thiết kế và chuẩn hóa thư viện Component, Tokens, Typography cho sản phẩm quy mô lớn."
    },
    {
      id: "ux-3",
      name: "Nghiên cứu Người dùng (UX Research) & Usability Testing",
      categoryName: "Thiết kế UI/UX",
      level: "Trung cấp",
      avgRating: 4.75,
      enrollmentCount: 380,
      suggestedPrice: 2200000,
      image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&auto=format&fit=crop&q=60",
      description: "Kỹ năng phỏng vấn học viên, định hình User Persona, Journey Map và đánh giá tính khả dụng của giao diện."
    }
  ],
  "dat-tran": [
    {
      id: "web-1",
      name: "Lập trình Web Fullstack với React, Node.js & TypeScript",
      categoryName: "Phát triển Web",
      level: "Trung cấp",
      avgRating: 4.92,
      enrollmentCount: 1420,
      suggestedPrice: 2950000,
      image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60",
      description: "Xây dựng ứng dụng Web hiện đại end-to-end với React, Node.js, Express, PostgreSQL và TypeScript."
    },
    {
      id: "cs-1",
      name: "Kiến trúc Hệ thống và Thiết kế Phân tán Microservices",
      categoryName: "Khoa học Máy tính",
      level: "Nâng cao",
      avgRating: 4.9,
      enrollmentCount: 510,
      suggestedPrice: 3500000,
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=60",
      description: "Phát triển hệ thống chịu tải cao, tính sẵn sàng cao, cân bằng tải, Message Broker và kiến trúc Microservices."
    },
    {
      id: "web-2",
      name: "Tối ưu Hiệu năng Web Application & Cấu trúc Dữ liệu",
      categoryName: "Phát triển Web",
      level: "Nâng cao",
      avgRating: 4.88,
      enrollmentCount: 430,
      suggestedPrice: 2600000,
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=60",
      description: "Kỹ thuật tối ưu hóa Core Web Vitals, Memory Caching, Indexing và nén dữ liệu cho ứng dụng Web."
    },
    {
      id: "devops-1",
      name: "Docker & Kubernetes cho Lập trình viên Web",
      categoryName: "Phát triển Web",
      level: "Trung cấp",
      avgRating: 4.86,
      enrollmentCount: 680,
      suggestedPrice: 2400000,
      image: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=500&auto=format&fit=crop&q=60",
      description: "Đóng gói container với Docker, cấu hình CI/CD Pipeline và triển khai cụm ứng dụng trên Kubernetes."
    },
    {
      id: "web-3",
      name: "Xây dựng RESTful API & GraphQL Chuẩn Doanh nghiệp",
      categoryName: "Phát triển Web",
      level: "Trung cấp",
      avgRating: 4.89,
      enrollmentCount: 380,
      suggestedPrice: 2100000,
      image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=60",
      description: "Thiết kế API chuẩn RESTful, Apollo GraphQL, JWT Authentication, OAuth2 và viết Tài liệu API OpenAPI/Swagger."
    }
  ]
};

/**
 * Trang thông tin chi tiết giảng viên (TeacherDetail)
 * Hiển thị hồ sơ giảng viên, danh mục giảng dạy và các khóa học do giảng viên này phụ trách.
 */
export const TeacherDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  /**
   * Tải hồ sơ giảng viên và danh sách khóa học dựa trên teacher ID.
   */
  useEffect(() => {
    const fetchTeacherProfile = async () => {
      setLoading(true);
      try {
        // 1. Tìm thông tin giảng viên từ danh sách mẫu hoặc API
        const found = INSTRUCTORS_LIST.find(t => t.id === id) || {
          id: id || "teacher-default",
          name: "Giảng viên Chuyên gia AILMS",
          role: "Giảng viên Cao cấp",
          school: "Học viện AILMS",
          bio: "Chuyên gia nhiều năm kinh nghiệm giảng dạy và phát triển phần mềm thực chiến.",
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id || "teacher"}`,
          rating: 4.9,
          coursesCount: 3,
          studentsCount: 1500,
          experienceYears: 7,
          skills: ["Giảng dạy", "Công nghệ", "AI & Lập trình"],
          categories: ["Tất cả danh mục"]
        };
        setTeacher(found);

        // 2. Tải khóa học của giảng viên từ API hoặc map mẫu
        let teacherCourses = TEACHER_COURSES_MAP[id || ""] || [];
        
        try {
          const apiRes = await courseApi.searchCourses({ createdBy: id, page: 0, size: 20 });
          if (apiRes.data.success && apiRes.data.data?.content?.length > 0) {
            teacherCourses = apiRes.data.data.content;
          }
        } catch (e) {
          console.warn("Could not fetch real API courses for teacher, fallback to predefined courses:", e);
        }

        setCourses(teacherCourses);
      } catch (err) {
        console.error("Error loading teacher profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherProfile();
  }, [id]);

  /**
   * Lấy danh sách các danh mục duy nhất từ các khóa học của giảng viên.
   */
  const availableCategories = useMemo(() => {
    if (!courses.length) return teacher?.categories || [];
    const catSet = new Set<string>();
    courses.forEach(c => {
      if (c.categoryName) catSet.add(c.categoryName);
    });
    return Array.from(catSet);
  }, [courses, teacher]);

  /**
   * Lọc khóa học theo danh mục được chọn.
   */
  const filteredCourses = useMemo(() => {
    if (selectedCategory === "ALL") return courses;
    return courses.filter(c => c.categoryName === selectedCategory);
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
        <Button onClick={() => navigate("/")} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại trang chủ
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-20">
      
      {/* 1. TEACHER HERO HEADER */}
      <div className="bg-gradient-to-b from-muted/40 via-muted/20 to-background border-b border-border/60 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/");
                }
              }}
              className="rounded-xl gap-1.5 text-xs font-bold border-border/70 bg-card hover:bg-muted text-foreground cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </Button>

            <nav className="flex items-center space-x-2 text-xs text-muted-foreground font-medium">
              <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
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
                <img
                  src={teacher.avatar}
                  alt={teacher.name}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              <div className="space-y-3 flex-1">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                      {teacher.name}
                    </h1>
                    <Badge className="bg-primary/10 text-primary border-primary/20 font-bold px-2.5 py-0.5 text-xs">
                      <Sparkles className="w-3 h-3 mr-1 inline-block" /> Chuyên gia Giảng dạy
                    </Badge>
                  </div>
                  <p className="text-base font-bold text-primary">{teacher.role}</p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                  <span>{teacher.school}</span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed italic max-w-3xl">
                  &ldquo;{teacher.bio}&rdquo;
                </p>

                {/* Skill Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {teacher.skills.map((skill, i) => (
                    <span
                      key={i}
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
                <span className="text-xl font-black text-foreground">{teacher.rating} ★</span>
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

              <div className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Briefcase className="h-4 w-4 text-indigo-500" />
                  <span>Kinh nghiệm</span>
                </div>
                <span className="text-sm font-extrabold text-foreground">{teacher.experienceYears} năm thực chiến</span>
              </div>
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
            
            <Badge variant="outline" className="w-fit text-xs font-bold px-3 py-1 border-primary/30 text-primary bg-primary/5">
              {filteredCourses.length} khóa học hiển thị
            </Badge>
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => handleCategorySelect("ALL")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                selectedCategory === "ALL"
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-card text-foreground border-border/80 hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              Tất cả danh mục ({courses.length})
            </button>

            {availableCategories.map((catName) => {
              const count = courses.filter(c => c.categoryName === catName).length;
              return (
                <button
                  key={catName}
                  onClick={() => handleCategorySelect(catName)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    selectedCategory === catName
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-card text-foreground border-border/80 hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  {catName} ({count})
                </button>
              );
            })}
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
                    <img
                      src={course.image || "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=500&auto=format&fit=crop&q=60"}
                      alt={course.name || course.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                    {course.level && (
                      <Badge className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm text-primary font-bold shadow-sm">
                        {course.level}
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
                        {course.name || course.title}
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
                        <span className="font-bold text-foreground">{course.avgRating || 4.9}</span>
                        <span>({course.enrollmentCount || 0} học viên)</span>
                      </div>
                      <span className="font-bold text-primary text-sm">
                        {course.suggestedPrice ? `${course.suggestedPrice.toLocaleString()}đ` : "Miễn phí"}
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
        </div>

      </div>
    </div>
  );
};
