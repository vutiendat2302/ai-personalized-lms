import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useModalStore } from "@/store/useModalStore";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Star,
  Sparkles,
  Brain,
  ShieldCheck,
  Zap,
  ChevronDown
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  category: string;
  level: string;
  duration: string;
  rating: number;
  studentsCount: number;
  image: string;
  tags: string[];
}

const SAMPLE_COURSES: Course[] = [
  {
    id: "1",
    title: "Lập trình Python từ cơ bản đến nâng cao cho AI",
    category: "popular",
    level: "Cơ bản",
    duration: "40 giờ",
    rating: 4.8,
    studentsCount: 1240,
    image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    tags: ["Python", "AI", "Machine Learning"]
  },
  {
    id: "2",
    title: "Toán học rời rạc và ứng dụng trong khoa học máy tính",
    category: "trending",
    level: "Trung cấp",
    duration: "32 giờ",
    rating: 4.9,
    studentsCount: 890,
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    tags: ["Discrete Math", "Algorithms"]
  },
  {
    id: "3",
    title: "Xây dựng Web App với React và NestJS",
    category: "new",
    level: "Nâng cao",
    duration: "48 giờ",
    rating: 4.7,
    studentsCount: 1540,
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    tags: ["React", "NestJS", "TypeScript"]
  },
  {
    id: "4",
    title: "Nhập môn Machine Learning & Deep Learning",
    category: "popular",
    level: "Nâng cao",
    duration: "50 giờ",
    rating: 4.95,
    studentsCount: 2100,
    image: "https://images.unsplash.com/photo-1527474305487-b87b222841cc?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    tags: ["Machine Learning", "Neural Networks"]
  },
  {
    id: "5",
    title: "Cấu trúc dữ liệu & Giải thuật bằng C++",
    category: "trending",
    level: "Trung cấp",
    duration: "36 giờ",
    rating: 4.6,
    studentsCount: 950,
    image: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    tags: ["C++", "DSA", "Competitive Programming"]
  },
  {
    id: "6",
    title: "Thiết kế UI/UX hiện đại cho ứng dụng Web/Mobile",
    category: "new",
    level: "Cơ bản",
    duration: "24 giờ",
    rating: 4.75,
    studentsCount: 620,
    image: "https://images.unsplash.com/photo-1561070791-26c113006238?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    tags: ["UI/UX", "Figma", "Design System"]
  }
];

const CATEGORIES = [
  "Khoa học Máy tính", "Toán học", "Trí tuệ Nhân tạo", 
  "Phát triển Web", "Thiết kế UI/UX", "Tiếng Anh Kỹ thuật"
];

const TESTIMONIALS = [
  {
    name: "Lê Minh Triết",
    role: "Học sinh chuyên Tin",
    content: "AILMS giúp mình tập trung đúng những kiến thức giải thuật còn yếu nhờ lộ trình AI gợi ý. Streak học tập giúp mình duy trì thói quen học mỗi ngày.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=triet",
    rating: 5
  },
  {
    name: "Nguyễn Hải Yến",
    role: "Sinh viên ĐH Bách Khoa",
    content: "Mình rất thích tính năng Smart Assessment. Bài kiểm tra tự động đánh giá và phản hồi ngay lập tức, chỉ ra chính xác chỗ mình bị hổng kiến thức.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=yen",
    rating: 5
  },
  {
    name: "Trần Hoàng Nam",
    role: "Lập trình viên Java",
    content: "Các khóa học ở đây rất sát thực tế. Lộ trình học thông minh tối ưu hóa thời gian rất nhiều cho một người bận rộn đi làm như mình.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=nam",
    rating: 4.8
  }
];

export const Landing: React.FC = () => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const { openRegister, openLogin } = useModalStore();
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    if (auth.accessToken && auth.user) {
      navigate("/dashboard", { replace: true });
    }
  }, [auth.accessToken, auth.user, navigate]);

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  return (
    <div className="relative overflow-hidden bg-background">
      {/* Background gradients decor */}
      <div className="absolute top-0 left-1/4 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute top-[400px] right-1/4 -z-10 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-accent/10 blur-[100px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* ==========================================
            HERO SECTION
            ========================================== */}
        <section className="py-20 md:py-28 text-center relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary mb-6 animate-bounce">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Nền tảng học tập thông minh thế hệ mới</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15] mb-8">
            Học tập Cá nhân hóa <br />
            <span className="bg-gradient-to-r from-primary via-indigo-600 to-accent bg-clip-text text-transparent">
              Đột phá nhờ Trí tuệ Nhân tạo
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed mb-10">
            AILMS tự động phân tích năng lực, thiết lập lộ trình học tập tối ưu, và cung cấp phản hồi tức thì để giúp bạn chinh phục mọi đỉnh cao kiến thức một cách nhanh chóng nhất.
          </p>

          <div className="flex justify-center gap-4">
            {auth.accessToken ? (
              <Link to="/dashboard">
                <Button size="lg" className="rounded-full px-8 py-6 text-base font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-xl shadow-primary/20">
                  Vào Dashboard của bạn
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <>
                <Button onClick={openRegister} size="lg" className="rounded-full px-8 py-6 text-base font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-xl shadow-primary/20">
                  Bắt đầu học miễn phí
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button onClick={openLogin} variant="outline" size="lg" className="rounded-full px-8 py-6 text-base font-bold">
                  Khám phá lộ trình
                </Button>
              </>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mt-20 p-6 bg-card rounded-2xl border border-border shadow-md">
            <div>
              <p className="text-3xl font-extrabold text-primary">15,000+</p>
              <p className="text-xs text-muted-foreground font-semibold mt-1">Học viên hoạt động</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-accent">120+</p>
              <p className="text-xs text-muted-foreground font-semibold mt-1">Khóa học chuyên sâu</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-primary">95%</p>
              <p className="text-xs text-muted-foreground font-semibold mt-1">Tỷ lệ hoàn thành mục tiêu</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-accent">4.9★</p>
              <p className="text-xs text-muted-foreground font-semibold mt-1">Đánh giá trung bình</p>
            </div>
          </div>
        </section>

        {/* ==========================================
            FEATURES SECTION
            ========================================== */}
        <section id="features" className="py-16 border-t border-border/60">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Tại sao chọn AILMS?</h2>
            <p className="text-sm text-muted-foreground mt-2">Nền tảng tích hợp những công nghệ hiện đại nhất hỗ trợ việc học hiệu quả.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Lộ trình AI Cá nhân hóa</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hệ thống tự động phát hiện lỗ hổng kiến thức để tinh chỉnh tài liệu và bài tập phù hợp với tốc độ học của bạn.
              </p>
            </div>

            <div className="p-8 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Đánh giá thông minh</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Chấm điểm tự động và chỉ ra điểm sai sót ngay lập tức cùng với lý do giải thích chi tiết nhất.
              </p>
            </div>

            <div className="p-8 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Báo cáo & Phân tích trực quan</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Biểu đồ đo lường tiến độ, chỉ số Streak hàng ngày cùng các thống kê điểm số giúp bạn có cái nhìn rõ nét nhất về hành trình học.
              </p>
            </div>
          </div>
        </section>

        {/* ==========================================
            CATEGORY TAGS
            ========================================== */}
        <section className="py-10 text-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6">Chủ đề học tập nổi bật</h3>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {CATEGORIES.map((cat, idx) => (
              <span
                key={idx}
                className="px-4 py-2 rounded-full border border-border bg-card text-xs font-bold text-foreground hover:border-primary hover:text-primary transition-all cursor-pointer shadow-sm"
              >
                {cat}
              </span>
            ))}
          </div>
        </section>

        {/* ==========================================
            COURSES SECTION (WITH TABS)
            ========================================== */}
        <section id="courses" className="py-16 border-t border-border/60">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Khóa học nổi bật</h2>
            <p className="text-sm text-muted-foreground mt-2">Lựa chọn các khóa học hàng đầu được phát triển bởi các chuyên gia trong ngành.</p>
          </div>

          <Tabs defaultValue="popular" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="bg-muted p-1 rounded-xl">
                <TabsTrigger value="popular" className="px-5 py-2 text-sm font-semibold rounded-lg">Nổi bật</TabsTrigger>
                <TabsTrigger value="trending" className="px-5 py-2 text-sm font-semibold rounded-lg">Thịnh hành</TabsTrigger>
                <TabsTrigger value="new" className="px-5 py-2 text-sm font-semibold rounded-lg">Mới nhất</TabsTrigger>
              </TabsList>
            </div>

            {["popular", "trending", "new"].map((tabVal) => (
              <TabsContent key={tabVal} value={tabVal} className="animate-in fade-in-50 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {SAMPLE_COURSES.filter(c => c.category === tabVal).map((course) => (
                    <div key={course.id} className="flex flex-col bg-card rounded-2xl border border-border shadow-sm hover:shadow-md overflow-hidden group transition-all">
                      <div className="relative aspect-video overflow-hidden">
                        <img
                          src={course.image}
                          alt={course.title}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-primary shadow">
                          {course.level}
                        </div>
                      </div>
                      
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {course.tags.map((t, i) => (
                              <span key={i} className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                                {t}
                              </span>
                            ))}
                          </div>
                          <h3 className="font-bold text-foreground text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {course.title}
                          </h3>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                            <span className="font-bold text-foreground">{course.rating}</span>
                            <span>({course.studentsCount} học viên)</span>
                          </div>
                          <span className="font-medium">{course.duration}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </section>

        {/* ==========================================
            TESTIMONIALS SECTION
            ========================================== */}
        <section id="testimonials" className="py-16 border-t border-border/60">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Học viên nói gì về chúng tôi?</h2>
            <p className="text-sm text-muted-foreground mt-2">Chia sẻ thực tế từ các học viên đã nâng cao hiệu suất học tập thông qua hệ thống.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((test, idx) => (
              <div key={idx} className="p-6 bg-card rounded-2xl border border-border shadow-sm relative flex flex-col justify-between">
                <div>
                  <div className="flex gap-0.5 text-amber-400 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4.5 w-4.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground italic leading-relaxed mb-6">
                    &ldquo;{test.content}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={test.avatar}
                    alt={test.name}
                    className="h-10 w-10 rounded-full border border-primary/20 bg-primary/5"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{test.name}</h4>
                    <p className="text-[10px] text-muted-foreground">{test.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ==========================================
            FAQ SECTION (ACCORDION)
            ========================================== */}
        <section id="faq" className="py-16 border-t border-border/60 max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Câu hỏi thường gặp</h2>
            <p className="text-sm text-muted-foreground mt-2">Giải đáp nhanh các thắc mắc về hệ thống và lộ trình học tập.</p>
          </div>

          <div className="w-full space-y-3">
            {[
              {
                id: "faq-1",
                question: "Lộ trình học tập AI cá nhân hóa hoạt động như thế nào?",
                answer: "Hệ thống AILMS sử dụng các mô hình học máy để phân tích bài kiểm tra đầu vào, điểm số bài tập và thời gian hoàn thành của bạn. Từ đó, AI tự động gợi ý tài liệu học tập, các chủ đề cần ôn tập lại và tinh chỉnh độ khó của bài tập tiếp theo để phù hợp nhất với năng lực của bạn."
              },
              {
                id: "faq-2",
                question: "Tính năng Smart Assessment là gì?",
                answer: "Đây là hệ thống đánh giá tự động dựa trên AI. Không chỉ đưa ra kết quả Đúng/Sai, Smart Assessment phân tích sâu vào các bước làm bài của bạn, đưa ra lời giải thích chi tiết tại sao sai và gợi ý cụ thể phần kiến thức lý thuyết bạn cần đọc lại để khắc phục lỗi đó."
              },
              {
                id: "faq-3",
                question: "Hệ thống hỗ trợ những thiết bị nào?",
                answer: "AILMS là nền tảng hoạt động trên nền web được thiết kế tương thích hoàn toàn (responsive) trên mọi thiết bị: Máy tính để bàn (PC), laptop, máy tính bảng (tablet) và điện thoại di động (smartphone). Bạn có thể học mọi lúc, mọi nơi chỉ với một trình duyệt web có kết nối internet."
              },
              {
                id: "faq-4",
                question: "Sau này hệ thống có mở rộng thêm các quyền khác ngoài Học viên và Quản trị viên không?",
                answer: "Có. Kiến trúc hệ thống được xây dựng theo mô hình Role-Based Access Control (RBAC) linh hoạt. Dù hiện tại hệ thống tập trung vào 2 quyền chính (ADMIN & USER), cấu trúc mã nguồn đã được định hình sẵn sàng mở rộng lên 5 quyền gồm Giáo viên (TEACHER), Trợ giảng (TA), Quản lý Nhân sự (HR) mà không ảnh hưởng đến kiến trúc cốt lõi."
              }
            ].map((faq) => {
              const isOpen = openFaq === faq.id;
              return (
                <div key={faq.id} className="border border-border rounded-xl bg-card px-4">
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="flex w-full items-center justify-between py-4 text-sm font-bold text-left outline-none hover:text-primary transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 pb-4' : 'max-h-0'}`}>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
};
