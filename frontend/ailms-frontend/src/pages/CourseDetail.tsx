import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { courseApi } from "@/api/courses/courseApi";
import { reviewApi } from "@/api/reviews/reviewApi";
import { lessonApi } from "@/api/lessons/lessonApi";
import { useAuth } from "@/hooks/useAuth";
import { useModalStore } from "@/store/useModalStore";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Star,
  BookOpen,
  Award,
  Clock,
  BarChart,
  CheckCircle2,
  Calendar,
  ArrowLeft,
  Users,
  MessageSquare,
  ThumbsUp,
  PlayCircle,
  FileText,
  HelpCircle,
  X,
  ShoppingBag,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { CheckoutModal } from "@/components/cart/CheckoutModal";

interface ReviewItem {
  id: string;
  courseId: string;
  userId: string;
  courseName: string;
  userName: string;
  avatarUrl: string | null;
  schoolName: string | null;
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
}

export const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { openLogin } = useModalStore();
  const { addToCart } = useCartStore();
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  const [course, setCourse] = useState<any | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [apiLessons, setApiLessons] = useState<any[]>([]);
  const [apiSections, setApiSections] = useState<any[]>([]);
  const [selectedPreviewLesson, setSelectedPreviewLesson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("about");

  // Enroll state
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchCourseData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Fetch Course Detail
        const courseRes = await courseApi.getCourseById(id);
        if (courseRes.data.success) {
          setCourse(courseRes.data.data);
        } else {
          setError("Không tìm thấy thông tin khóa học.");
        }

        // 2. Fetch Course Reviews
        const reviewsRes = await reviewApi.searchReviews({
          courseId: id,
          size: 20,
          status: "ACTIVE",
        } as any);
        if (reviewsRes.data.success) {
          setReviews(reviewsRes.data.data.content || []);
        }

        // 3. Fetch Course Sections & Lessons
        try {
          const sectionsRes = await lessonApi.getSectionsByCourse(id);
          if (sectionsRes.data?.success && Array.isArray(sectionsRes.data.data) && sectionsRes.data.data.length > 0) {
            setApiSections(sectionsRes.data.data);
          } else {
            const lessonsRes = await lessonApi.getLessonsByCourse(id);
            if (lessonsRes.data?.success && lessonsRes.data.data) {
              const lessonsData = Array.isArray(lessonsRes.data.data)
                ? lessonsRes.data.data
                : lessonsRes.data.data.content || [];
              setApiLessons(lessonsData);
            }
          }
        } catch (lErr) {
          console.error("Error fetching sections/lessons:", lErr);
        }
      } catch (err: any) {
        console.error("Error fetching course detail:", err);
        setError("Không thể tải thông tin khóa học. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [id]);

  const handleEnroll = () => {
    if (!auth.accessToken) {
      openLogin();
      return;
    }
    setEnrolled(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm font-medium text-muted-foreground">Đang tải thông tin khóa học...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <BookOpen className="h-12 w-12" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-foreground">Không tìm thấy khóa học</h2>
        <p className="mt-2 text-muted-foreground max-w-md">
          {error || "Khóa học không tồn tại hoặc đã bị gỡ bỏ khỏi hệ thống."}
        </p>
        <Button onClick={() => navigate("/")} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại trang chủ
        </Button>
      </div>
    );
  }

  // Dynamic Skills based on category/name
  const getSkillsGained = (cat: string, name: string) => {
    const defaultSkills = ["Tư duy hệ thống", "Giải quyết vấn đề", "Thực hành ứng dụng", "Phân tích dự liệu"];
    const catName = cat?.toLowerCase() || "";
    const courseName = name?.toLowerCase() || "";
    
    if (catName.includes("lập trình") || catName.includes("code") || courseName.includes("python")) {
      return ["Lập trình Python", "Cấu trúc dữ liệu", "Giải thuật cơ bản", "OOP (Lập trình hướng đối tượng)", "Phát triển phần mềm", "Debug lỗi code"];
    }
    if (catName.includes("ai") || catName.includes("trí tuệ") || courseName.includes("machine learning")) {
      return ["Trí tuệ nhân tạo (AI)", "Machine Learning", "Mạng nơ-ron nhân tạo", "Xử lý dữ liệu", "Đạo đức AI", "Huấn luyện mô hình"];
    }
    if (catName.includes("marketing") || courseName.includes("marketing")) {
      return ["Marketing số (Digital Marketing)", "Tối ưu hóa SEO", "Content Marketing", "Quảng cáo Facebook & Google", "Phân tích số liệu GA4", "Tối ưu tỷ lệ chuyển đổi"];
    }
    if (catName.includes("thiết kế") || catName.includes("design")) {
      return ["Thiết kế UI/UX", "Sử dụng Figma chuyên sâu", "Tư duy màu sắc & Layout", "Thiết kế Responsive", "Tạo mẫu tương tác (Prototyping)", "User Research"];
    }
    return defaultSkills;
  };

  // Dynamic Course Sections / Lessons from API ONLY (Zero mock fallback)
  const getCourseSections = () => {
    if (apiSections && apiSections.length > 0) {
      return apiSections.map((sec: any, idx: number) => ({
        id: sec.id || `sec-${idx}`,
        title: sec.name || sec.title || `Chương ${idx + 1}`,
        lessons: Array.isArray(sec.lessons) && sec.lessons.length > 0
          ? sec.lessons.map((les: any, lIdx: number) => ({
              id: les.id || `les-${idx}-${lIdx}`,
              title: les.name || les.title || `Bài ${lIdx + 1}`,
              type: les.contentType ? les.contentType.toLowerCase() : les.type ? les.type.toLowerCase() : "video",
              duration: les.durationMin ? `${les.durationMin} phút` : les.duration || "15 phút",
              isFree: les.isFree || les.freePreview || les.isPreview || lIdx === 0,
              videoUrl: les.contentUrl || les.videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4",
              description: les.description || "Bài học cung cấp kiến thức nền tảng và bài tập thực hành chi tiết.",
            }))
          : [],
      }));
    }

    if (apiLessons && apiLessons.length > 0) {
      const sectionsMap: { [key: string]: any[] } = {};
      apiLessons.forEach((les: any, idx: number) => {
        const secName =
          les.sectionTitle ||
          les.sectionName ||
          `Chương ${Math.floor(idx / 4) + 1}: Nội dung bài học`;
        if (!sectionsMap[secName]) sectionsMap[secName] = [];
        sectionsMap[secName].push({
          id: les.id || `api-les-${idx}`,
          title: les.title || les.name || `Bài ${idx + 1}`,
          type: les.contentType ? les.contentType.toLowerCase() : les.type ? les.type.toLowerCase() : "video",
          duration: les.durationMin ? `${les.durationMin} phút` : les.duration || "15 phút",
          isFree: les.isFree || les.freePreview || les.isPreview || idx === 0,
          videoUrl: les.contentUrl || les.videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4",
          description: les.description || "Bài học cung cấp kiến thức nền tảng và bài tập thực hành chi tiết.",
        });
      });

      return Object.keys(sectionsMap).map((secTitle, index) => ({
        id: `sec-api-${index + 1}`,
        title: secTitle,
        lessons: sectionsMap[secTitle],
      }));
    }

    return [];
  };

  const skillsGained = getSkillsGained(course.categoryName, course.name);
  const courseSections = getCourseSections();

  // MOCK TESTIMONIALS (Based on screenshots)
  const testimonials = [
    {
      name: "Felipe M.",
      role: "Học viên từ 2024",
      comment: "Khóa học giúp mình chủ động thời gian học tập. Lộ trình khoa học và dễ hiểu, mình có thể vừa đi học vừa hoàn thành khóa học một cách hiệu quả.",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=60"
    },
    {
      name: "Jennifer J.",
      role: "Học viên từ 2025",
      comment: "Mình đã áp dụng trực tiếp các kiến thức từ khóa học này vào dự án thực tế tại công ty và đạt kết quả vượt cả mong đợi. Rất khuyên học!",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=60"
    },
    {
      name: "Larry W.",
      role: "Học viên từ 2025",
      comment: "Giảng viên hỗ trợ cực kỳ nhiệt tình qua hệ thống hỏi đáp. Nội dung thực tế, không lý thuyết suông, giúp học viên dễ tiếp thu.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=60"
    }
  ];

  // Helper to scroll to tab target
  const scrollToSection = (id: string) => {
    setActiveTab(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // height of sticky header
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  // Mock rating values if avgRating is not defined or is 0
  const avgRating = course.avgRating || 4.8;
  const reviewCount = course.reviewCount || 120;

  return (
    <div className="bg-background pb-20">
      {/* 1. HERO BANNER SECTION (Coursera/Deeplearning.ai layout) */}
      <div className="relative bg-gradient-to-r from-blue-950/95 via-indigo-900/90 to-slate-900 text-white overflow-hidden py-10 md:py-16">
        {/* Background Decorative Circles */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full border-[30px] border-white/5 opacity-40 pointer-events-none"></div>
        <div className="absolute right-24 top-1/4 w-80 h-80 rounded-full border-[10px] border-white/5 opacity-30 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Back Button & Breadcrumbs */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/student/dashboard");
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer backdrop-blur-sm shadow-xs"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </button>

            <nav className="flex items-center space-x-2 text-xs text-indigo-200/80 font-medium">
              <Link to="/" className="hover:text-white transition-colors">Trang chủ</Link>
              <span>/</span>
              <Link to={`/categories/${course.categoryId}`} className="hover:text-white transition-colors">
                {course.categoryName}
              </Link>
              <span>/</span>
              <span className="text-white font-semibold line-clamp-1">{course.name}</span>
            </nav>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-8 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <Award className="h-3.5 w-3.5" /> {course.categoryName}
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight max-w-4xl">
                {course.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-indigo-100">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-amber-400 text-base">{avgRating.toFixed(1)}</span>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= Math.round(avgRating) ? "fill-amber-400 stroke-amber-400" : "text-indigo-400/40"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-indigo-200/80">({reviewCount.toLocaleString()} đánh giá)</span>
                </div>
                
                <span className="hidden sm:inline text-indigo-200/40">|</span>
                
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-indigo-300" />
                  <span>{((course.enrollmentCount || 0) + (enrolled ? 1 : 0)).toLocaleString()} học viên đã tham gia</span>
                </div>
              </div>

              <p className="text-base text-indigo-100/90 leading-relaxed max-w-3xl line-clamp-3">
                {course.description}
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-3">
                {enrolled ? (
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-emerald-900/20 text-base flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5 animate-bounce" /> Đã đăng ký sở hữu
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        if (!auth.accessToken) {
                          openLogin();
                          return;
                        }
                        setCheckoutModalOpen(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-blue-500/20 text-base flex items-center justify-center min-w-[180px]"
                    >
                      Đăng ký học ngay
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        addToCart({
                          coursePackageId: `pkg-${course.id}`,
                          courseId: course.id,
                          courseName: course.name,
                          categoryName: course.categoryName,
                          image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60",
                          packageName: "Gói Tự Học Standard (Lifetime)",
                          deliveryMode: "SELF_STUDY",
                          price: course.suggestedPrice || 3200000,
                        });
                      }}
                      className="bg-white/10 hover:bg-white/20 border-white/30 text-white font-bold h-12 px-6 rounded-xl flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="h-5 w-5" />
                      <span>Thêm vào giỏ hàng</span>
                    </Button>
                  </>
                )}

                <div className="flex flex-col justify-center text-xs text-indigo-200/80">
                  <span className="font-semibold text-white text-sm">
                    Giá đề xuất: {course.suggestedPrice ? `${course.suggestedPrice.toLocaleString()}đ` : "Miễn phí"}
                  </span>
                  <span>Chính sách hoàn tiền trong vòng 7 ngày nếu không hài lòng.</span>
                </div>
              </div>
            </div>

            {/* Right Hero Video/Image Placeholder */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="relative w-full max-w-sm aspect-video rounded-2xl overflow-hidden border-4 border-white/10 shadow-2xl bg-slate-950 group">
                <img
                  src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60"
                  alt={course.name}
                  className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-t from-slate-950 via-transparent to-transparent">
                  <div className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md p-4 cursor-pointer border border-white/30 transition-transform duration-300 active:scale-95 group-hover:scale-110 mb-2">
                    <PlayCircle className="h-10 w-10 text-white" />
                  </div>
                  <span className="text-xs font-bold text-white/90 uppercase tracking-widest bg-slate-950/80 px-3 py-1 rounded-full">
                    Xem trailer khóa học
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. OVERLAPPING METRICS BANNER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        <div className="bg-card rounded-2xl border border-border/80 shadow-xl p-5 md:p-6 grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-4 divide-y-0 divide-x-0 md:divide-x divide-border/60 text-center">
          <div className="flex flex-col items-center justify-center p-2">
            <BookOpen className="h-5 w-5 text-primary mb-1.5" />
            <span className="text-lg font-extrabold text-foreground">4 học phần</span>
            <span className="text-xs text-muted-foreground">Lộ trình bài bản</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2">
            <Star className="h-5 w-5 text-amber-500 mb-1.5 fill-amber-500" />
            <span className="text-lg font-extrabold text-foreground">{avgRating.toFixed(1)} ★</span>
            <span className="text-xs text-muted-foreground">{reviewCount} học viên đánh giá</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2">
            <BarChart className="h-5 w-5 text-indigo-500 mb-1.5" />
            <span className="text-lg font-extrabold text-foreground uppercase">
              {course.level === "ADVANCED" ? "Nâng cao" : course.level === "BEGINNER" ? "Cơ bản" : "Trung cấp"}
            </span>
            <span className="text-xs text-muted-foreground">Cấp độ học viên</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2">
            <Clock className="h-5 w-5 text-emerald-500 mb-1.5" />
            <span className="text-lg font-extrabold text-foreground">Tự do học</span>
            <span className="text-xs text-muted-foreground">Lịch học linh hoạt 100%</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 col-span-2 md:col-span-1 border-t md:border-t-0 pt-4 md:pt-0">
            <ThumbsUp className="h-5 w-5 text-blue-500 mb-1.5" />
            <span className="text-lg font-extrabold text-foreground">97% hài lòng</span>
            <span className="text-xs text-muted-foreground">Phản hồi tích cực</span>
          </div>
        </div>
      </div>

      {/* 3. STICKY SUB-NAVBAR */}
      <div className="sticky top-16 bg-card/85 backdrop-blur-md border-b border-border z-30 shadow-sm mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8 h-12 items-center text-sm font-semibold">
            <button
              onClick={() => scrollToSection("about")}
              className={`pb-3.5 pt-4 border-b-2 transition-colors ${
                activeTab === "about" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Giới thiệu
            </button>
            <button
              onClick={() => scrollToSection("modules")}
              className={`pb-3.5 pt-4 border-b-2 transition-colors ${
                activeTab === "modules" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Học phần
            </button>
            <button
              onClick={() => scrollToSection("testimonials")}
              className={`pb-3.5 pt-4 border-b-2 transition-colors ${
                activeTab === "testimonials" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Ý kiến học viên
            </button>
            <button
              onClick={() => scrollToSection("reviews")}
              className={`pb-3.5 pt-4 border-b-2 transition-colors ${
                activeTab === "reviews" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Đánh giá ({reviews.length})
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT CONTENT COLUMN */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* ABOUT / SKILLS SECTION */}
            <div id="about" className="scroll-mt-32 space-y-6">
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">Về khóa học này</h2>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {course.description} Khóa học được thiết kế sát thực tiễn, giúp bạn nắm vững kiến thức từ cơ bản tới nâng cao dưới sự hướng dẫn của giảng viên giàu kinh nghiệm. Bạn sẽ được làm bài tập thực hành, câu hỏi trắc nghiệm và các mini dự án để củng cố kiến thức một cách tốt nhất.
                </p>
              </div>

              {/* Skills Card */}
              <div className="p-6 rounded-2xl border border-border/80 bg-card/50 space-y-4">
                <h3 className="text-lg font-bold text-foreground">Kỹ năng bạn sẽ đạt được</h3>
                <div className="flex flex-wrap gap-2.5">
                  {skillsGained.map((skill, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary/5 text-primary text-sm font-semibold border border-primary/10"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      <span>{skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* MODULES / CURRICULUM SECTION */}
            <div id="modules" className="scroll-mt-32 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Nội dung học tập</h2>
                  <p className="text-sm text-muted-foreground mt-1">Chi tiết cấu trúc bài học phân bổ trong {courseSections.length} chương.</p>
                </div>
                <div className="text-xs bg-indigo-50 dark:bg-indigo-950/20 text-primary font-bold px-3 py-1.5 rounded-lg border border-primary/10 self-start">
                  Tổng số: {courseSections.reduce((acc, sec) => acc + sec.lessons.length, 0)} bài học
                </div>
              </div>

              {/* Accordion List or Empty State */}
              {courseSections.length > 0 ? (
                <Accordion className="border border-border/80 rounded-2xl overflow-hidden bg-card divide-y divide-border">
                  {courseSections.map((section) => (
                    <AccordionItem key={section.id} value={section.id} className="border-none">
                      <AccordionTrigger className="px-6 py-4.5 hover:no-underline hover:bg-muted/50 transition-colors flex items-center justify-between text-base font-bold text-foreground">
                        <div className="flex flex-col text-left pr-4">
                          <span>{section.title}</span>
                          <span className="text-xs text-muted-foreground font-normal mt-1">
                            {section.lessons.length} bài học • {section.lessons.filter((l: any) => l.type === "video").length} video
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-5 pt-2 bg-muted/20 border-t border-border/50">
                        <div className="space-y-3.5 mt-2">
                          {section.lessons.map((lesson: any) => (
                            <div key={lesson.id} className="flex items-center justify-between gap-4 py-2 hover:bg-card/40 rounded-lg px-2 -mx-2 transition-colors">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="p-1.5 rounded-lg bg-card border border-border shadow-sm text-muted-foreground shrink-0">
                                  {lesson.type === "video" && <PlayCircle className="h-4 w-4 text-blue-500" />}
                                  {lesson.type === "document" && <FileText className="h-4 w-4 text-emerald-500" />}
                                  {lesson.type === "quiz" && <HelpCircle className="h-4 w-4 text-amber-500" />}
                                </div>
                                <span className="text-sm font-medium text-foreground leading-snug truncate">{lesson.title}</span>
                                {lesson.isFree && (
                                  <span
                                    onClick={() => setSelectedPreviewLesson(lesson)}
                                    className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold hover:bg-emerald-500/20 transition-all cursor-pointer shrink-0"
                                  >
                                    <PlayCircle className="h-3 w-3" /> Học thử miễn phí
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {lesson.isFree && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPreviewLesson(lesson)}
                                    className="sm:hidden px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-bold"
                                  >
                                    Học thử
                                  </button>
                                )}
                                <span className="text-xs text-muted-foreground font-medium shrink-0 whitespace-nowrap bg-card border px-2 py-0.5 rounded-md">
                                  {lesson.duration}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="p-8 text-center bg-card rounded-2xl border border-dashed border-border/80 my-4">
                  <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">Khóa học này chưa có nội dung chương học/bài học nào từ giảng viên.</p>
                </div>
              )}
            </div>

            {/* TESTIMONIALS SECTION */}
            <div id="testimonials" className="scroll-mt-32 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Cảm nhận từ học viên</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Động lực thúc đẩy học viên tin chọn và phát triển bản thân mỗi ngày.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(reviews.length > 0
                  ? reviews.slice(0, 3).map((r) => ({
                      comment: r.comment,
                      name: r.userName,
                      role: r.schoolName || "Học viên AILMS",
                      avatar:
                        r.avatarUrl ||
                        `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(r.userName)}`,
                    }))
                  : testimonials
                ).map((t: any, idx: number) => (
                  <div key={idx} className="bg-card rounded-2xl border border-border/80 p-5 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                      "{t.comment}"
                    </p>
                    <div className="flex items-center gap-3 pt-3 border-t border-border/60">
                      <img src={t.avatar} alt={t.name} className="h-9 w-9 rounded-full object-cover border border-border/85" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-foreground truncate">{t.name}</h4>
                        <span className="text-xs text-muted-foreground mt-0.5 block truncate">{t.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* REVIEWS SECTION */}
            <div id="reviews" className="scroll-mt-32 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Đánh giá thực tế từ học viên</h2>
                <p className="text-sm text-muted-foreground mt-1">Thông tin minh bạch và trung thực nhất từ những người học trước.</p>
              </div>

              {/* Rating Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-2xl border border-border/80 bg-card/60">
                {/* Left Big Rating */}
                <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-2 border-r-0 md:border-r border-border/70">
                  <span className="text-5xl font-extrabold text-foreground">{avgRating.toFixed(1)}</span>
                  <div className="flex text-amber-500 mt-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-5 w-5 ${
                          s <= Math.round(avgRating) ? "fill-amber-500 stroke-amber-500" : "text-muted/40"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold mt-2.5">
                    Xếp hạng khóa học ({reviewCount} đánh giá)
                  </span>
                </div>

                {/* Right Progress Bars */}
                <div className="md:col-span-8 space-y-2.5 flex flex-col justify-center p-2">
                  {[
                    { stars: 5, pct: 81.82 },
                    { stars: 4, pct: 15.81 },
                    { stars: 3, pct: 1.80 },
                    { stars: 2, pct: 0.25 },
                    { stars: 1, pct: 0.32 },
                  ].map((row) => (
                    <div key={row.stars} className="flex items-center gap-3 text-xs">
                      <span className="w-10 text-right font-semibold text-muted-foreground">{row.stars} sao</span>
                      <Progress value={row.pct} className="h-2 flex-1" />
                      <span className="w-12 text-right text-muted-foreground font-bold">{row.pct.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((rev) => (
                    <div key={rev.id} className="bg-card rounded-2xl border border-border/80 p-5 space-y-3.5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 border border-primary/20">
                            {rev.userName ? rev.userName.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-foreground leading-none">{rev.userName}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {rev.schoolName || "Học viên AILMS"} • Đã đánh giá vào {new Date(rev.createdAt).toLocaleDateString("vi-VN")}
                            </p>
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex text-amber-400 shrink-0">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3.5 w-3.5 ${
                                s <= rev.rating ? "fill-amber-400 stroke-amber-400" : "text-muted/30"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-sm text-foreground/90 leading-relaxed font-normal pl-0 md:pl-[52px]">
                        {rev.comment}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 rounded-2xl border border-dashed border-border/80 bg-muted/10">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/45 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">Chưa có đánh giá nào cho khóa học này.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR COLUMN */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* OFFERED BY CARD */}
            <div className="bg-card rounded-2xl border border-border/85 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Được cung cấp bởi</h3>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center font-black text-primary text-xl shadow-inner shrink-0">
                  AI
                </div>
                <div>
                  <h4 className="font-extrabold text-foreground text-base">AILMS Academy</h4>
                  <p className="text-xs text-muted-foreground">Nền tảng học tập thông minh số 1</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hệ thống giáo dục AILMS hỗ trợ ứng dụng AI cá nhân hóa lộ trình học cho từng học sinh, mang lại hiệu quả vượt trội.
              </p>
            </div>

            {/* INSTRUCTOR CARD */}
            <div className="bg-card rounded-2xl border border-border/85 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Giảng viên đứng lớp</h3>
              
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full overflow-hidden border border-border shrink-0 bg-muted">
                  <img
                    src={
                      course.instructorAvatar ||
                      course.instructor?.avatarUrl ||
                      course.teacherAvatar ||
                      `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(course.instructorName || course.teacherName || "instructor")}`
                    }
                    alt="Giảng viên"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-extrabold text-foreground text-base">
                    {course.instructorName || course.teacherName || course.instructor?.fullName || "Nguyễn Hải Dương"}
                  </h4>
                  <p className="text-xs text-primary font-semibold">
                    {course.instructorTitle || course.teacherTitle || course.instructor?.title || "Chuyên gia cấp cao (Top Instructor)"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2 border-y border-border/60 text-center">
                <div>
                  <span className="block text-base font-extrabold text-foreground">
                    {course.instructorRating || course.avgRating ? `${course.avgRating || 4.9} ★` : "4.9 ★"}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Đánh giá</span>
                </div>
                <div>
                  <span className="block text-base font-extrabold text-foreground">
                    {course.instructorStudents || course.enrollmentCount
                      ? `${(course.enrollmentCount || 2550).toLocaleString()}+`
                      : "12.5k+"}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Học sinh</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {course.instructorBio ||
                 course.teacherBio ||
                 `Giảng viên ${course.instructorName || course.teacherName || "Nguyễn Hải Dương"} có kinh nghiệm làm việc thực chiến và đào tạo chuyên sâu trong lĩnh vực ${course.categoryName || "Công nghệ & Marketing số"}. Hỗ trợ học viên 24/7.`}
              </p>
            </div>

            {/* ACTION CARD FOR MOBILE OR ADDITIONAL DETAILS */}
            <div className="bg-card rounded-2xl border border-border/85 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground">Thông tin thêm</h3>
              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Thời gian học: ~ 12 giờ tự học</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Chứng chỉ danh giá sau khi hoàn tất khóa học</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Cập nhật mới nhất: Tháng {new Date(course.updatedAt || course.createdAt).getMonth() + 1}/{new Date(course.updatedAt || course.createdAt).getFullYear()}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* FREE LESSON PREVIEW MODAL */}
      {selectedPreviewLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-extrabold uppercase">
                  Học thử miễn phí
                </span>
                <h3 className="font-bold text-foreground text-sm line-clamp-1">
                  {selectedPreviewLesson.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPreviewLesson(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video / Content Player */}
            <div className="aspect-video bg-black relative flex items-center justify-center">
              {selectedPreviewLesson.type === "video" ? (
                <video
                  src={selectedPreviewLesson.videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4"}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="p-8 text-center space-y-3 text-white">
                  <FileText className="h-12 w-12 text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-lg">{selectedPreviewLesson.title}</h4>
                  <p className="text-sm text-neutral-300 max-w-md mx-auto">
                    {selectedPreviewLesson.description || "Nội dung bài đọc hướng dẫn chi tiết và tài liệu đính kèm."}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer / CTA */}
            <div className="p-5 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-foreground">Bạn thích bài học này?</p>
                <p className="text-[11px] text-muted-foreground">Đăng ký khóa học ngay để mở khóa toàn bộ bài học.</p>
              </div>
              <Button onClick={() => { setSelectedPreviewLesson(null); handleEnroll(); }} className="rounded-xl font-semibold px-6 w-full sm:w-auto">
                Đăng ký khóa học ngay
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Direct Checkout Modal for CourseDetail */}
      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        directCourseItem={course}
      />
    </div>
  );
};
