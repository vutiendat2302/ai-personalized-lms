import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Brain, 
  Code, 
  PenTool, 
  BookOpen, 
  Database, 
  Binary, 
  Filter, 
  RotateCcw, 
  Star, 
  Clock, 
  GraduationCap, 
  Award, 
  BookMarked
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  category: string;
  level: string;
  duration: number; // in hours
  durationText: string;
  rating: number;
  studentsCount: number;
  image: string;
  tags: string[];
  description: string;
}

const ALL_COURSES: Course[] = [
  {
    id: "1",
    title: "Lập trình Python từ cơ bản đến nâng cao cho AI",
    category: "AI & Trí tuệ Nhân tạo",
    level: "Cơ bản",
    duration: 40,
    durationText: "40 giờ học",
    rating: 4.8,
    studentsCount: 1240,
    image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    tags: ["Python", "AI", "Machine Learning"],
    description: "Học ngôn ngữ lập trình Python từ con số 0, chuẩn bị nền tảng vững chắc cho việc nghiên cứu AI và Học máy."
  },
  {
    id: "2",
    title: "Toán học rời rạc và ứng dụng trong khoa học máy tính",
    category: "Toán học",
    level: "Trung cấp",
    duration: 32,
    durationText: "32 giờ học",
    rating: 4.9,
    studentsCount: 890,
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    tags: ["Toán học", "Giải thuật", "Logic"],
    description: "Trang bị tư duy logic toán học rời rạc nền tảng, tiền đề quan trọng thiết kế cấu trúc dữ liệu và giải thuật."
  },
  {
    id: "3",
    title: "Xây dựng Web App với React và NestJS",
    category: "Phát triển Web",
    level: "Nâng cao",
    duration: 48,
    durationText: "48 giờ học",
    rating: 4.7,
    studentsCount: 1540,
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    tags: ["React", "NestJS", "TypeScript"],
    description: "Làm chủ mô hình Fullstack hoàn thiện với React SPA và NestJS API Gateway theo chuẩn Enterprise."
  },
  {
    id: "4",
    title: "Nhập môn Machine Learning & Deep Learning",
    category: "AI & Trí tuệ Nhân tạo",
    level: "Nâng cao",
    duration: 50,
    durationText: "50 giờ học",
    rating: 4.95,
    studentsCount: 2100,
    image: "https://images.unsplash.com/photo-1527474305487-b87b222841cc?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    tags: ["Machine Learning", "Deep Learning", "PyTorch"],
    description: "Đi sâu vào kiến trúc Mạng nơ-ron nhân tạo, xử lý dữ liệu và huấn luyện mô hình học sâu thực tế."
  },
  {
    id: "5",
    title: "Cấu trúc dữ liệu & Giải thuật bằng C++",
    category: "Khoa học Máy tính",
    level: "Trung cấp",
    duration: 36,
    durationText: "36 giờ học",
    rating: 4.6,
    studentsCount: 950,
    image: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    tags: ["C++", "DSA", "Giải thuật"],
    description: "Luyện tập tư duy tối ưu bộ nhớ, độ phức tạp thời gian và không gian thuật toán với ngôn ngữ C++."
  },
  {
    id: "6",
    title: "Thiết kế UI/UX hiện đại cho ứng dụng Web/Mobile",
    category: "Thiết kế UI/UX",
    level: "Cơ bản",
    duration: 24,
    durationText: "24 giờ học",
    rating: 4.75,
    studentsCount: 620,
    image: "https://images.unsplash.com/photo-1561070791-26c113006238?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    tags: ["Figma", "UI/UX", "Design System"],
    description: "Tìm hiểu nguyên lý thị giác, thiết kế trải nghiệm người dùng, xây dựng Wireframe và Prototype bằng Figma."
  },
  {
    id: "7",
    title: "Phân tích dữ liệu kinh doanh với SQL & Power BI",
    category: "Data Science & Phân tích",
    level: "Trung cấp",
    duration: 28,
    durationText: "28 giờ học",
    rating: 4.85,
    studentsCount: 780,
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    tags: ["SQL", "Power BI", "Data Analysis"],
    description: "Khai thác dữ liệu từ SQL Server, xử lý ETL và xây dựng các Dashboard trực quan hỗ trợ quyết định kinh doanh."
  },
  {
    id: "8",
    title: "Kiến trúc hệ thống và Thiết kế hệ thống phân tán",
    category: "Khoa học Máy tính",
    level: "Nâng cao",
    duration: 42,
    durationText: "42 giờ học",
    rating: 4.9,
    studentsCount: 510,
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    tags: ["System Design", "Microservices", "Docker"],
    description: "Tìm hiểu về chịu tải lỗi, tính sẵn sàng cao, cân bằng tải, phân mảnh dữ liệu và kiến trúc Microservices."
  }
];

const CATEGORY_LIST = [
  { name: "AI & Trí tuệ Nhân tạo", icon: Brain, count: 2, color: "text-primary bg-primary/10" },
  { name: "Phát triển Web", icon: Code, count: 1, color: "text-indigo-650 bg-indigo-500/10" },
  { name: "Thiết kế UI/UX", icon: PenTool, count: 1, color: "text-pink-600 bg-pink-500/10" },
  { name: "Toán học", icon: BookOpen, count: 1, color: "text-amber-600 bg-amber-500/10" },
  { name: "Khoa học Máy tính", icon: Binary, count: 2, color: "text-emerald-600 bg-emerald-500/10" },
  { name: "Data Science & Phân tích", icon: Database, count: 1, color: "text-sky-650 bg-sky-500/10" }
];

const INSTRUCTORS = [
  {
    name: "GS. TS. Nguyễn Hải Nam",
    role: "Giảng viên AI & Học Máy",
    bio: "Cựu nghiên cứu sinh sau tiến sĩ tại Stanford University. Hơn 10 năm kinh nghiệm phát triển mô hình NLP tại Thung lũng Silicon.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=nam_instructor",
    school: "Đại học Bách Khoa Hà Nội",
    coursesCount: 4,
    rating: "4.95★"
  },
  {
    name: "ThS. Lê Thùy Dương",
    role: "Chuyên gia Thiết kế UI/UX",
    bio: "Senior Product Designer tại Grab Singapore. Đam mê xây dựng các sản phẩm thân thiện với người dùng và hệ thống Design System chuẩn mực.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=duong_instructor",
    school: "FPT Arena Multimedia",
    coursesCount: 3,
    rating: "4.8★"
  },
  {
    name: "Kỹ sư Trần Tiến Đạt",
    role: "Kiến trúc sư Web Fullstack",
    bio: "Tech Lead tại VNG Corporation. Tác giả nhiều thư viện mã nguồn mở Javascript/TypeScript với hàng chục ngàn lượt tải xuống.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=dat_instructor",
    school: "Đại học Khoa học Tự nhiên",
    coursesCount: 5,
    rating: "4.9★"
  }
];

export const ExplorePathways: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [selectedLevel, setSelectedLevel] = useState("Tất cả");
  const [selectedDuration, setSelectedDuration] = useState("Tất cả");

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    } else {
      setSelectedCategory("Tất cả");
    }
  }, [searchParams]);

  const filteredCourses = useMemo(() => {
    return ALL_COURSES.filter(course => {
      // Search text filter
      const matchesSearch = 
        course.title.toLowerCase().includes(search.toLowerCase()) || 
        course.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())) ||
        course.description.toLowerCase().includes(search.toLowerCase());

      // Category filter
      const matchesCategory = 
        selectedCategory === "Tất cả" || course.category === selectedCategory;

      // Level filter
      const matchesLevel = 
        selectedLevel === "Tất cả" || course.level === selectedLevel;

      // Duration filter
      let matchesDuration = true;
      if (selectedDuration === "Dưới 20 giờ") {
        matchesDuration = course.duration < 20;
      } else if (selectedDuration === "20 - 40 giờ") {
        matchesDuration = course.duration >= 20 && course.duration <= 40;
      } else if (selectedDuration === "Trên 40 giờ") {
        matchesDuration = course.duration > 40;
      }

      return matchesSearch && matchesCategory && matchesLevel && matchesDuration;
    });
  }, [search, selectedCategory, selectedLevel, selectedDuration]);

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("Tất cả");
    setSelectedLevel("Tất cả");
    setSelectedDuration("Tất cả");
  };

  return (
    <div className="mx-auto max-w-none w-full px-4 py-8 sm:px-6 lg:px-12 space-y-12 animate-in fade-in-50 duration-300">
      
      {/* ==========================================
          HERO SECTION & SEARCH BAR WITH SMART FILTERS
          ========================================== */}
      <div className="relative rounded-3xl bg-gradient-to-r from-primary via-indigo-950 to-neutral-900 p-8 md:p-12 text-white overflow-hidden shadow-2xl shadow-primary/10">
        {/* Background Decorative Circles */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 translate-y-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3.5 py-1 rounded-full text-sm font-bold text-neutral-light-gray backdrop-blur-md">
            <BookMarked className="h-4 w-4 text-primary" />
            <span>Lộ trình tối ưu bằng Trí Tuệ Nhân Tạo</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Khám Phá Lộ Trình Học Tập <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              Chinh Phục Kiến Thức Mới
            </span>
          </h1>
          <p className="text-sm sm:text-base text-neutral-light-gray leading-relaxed max-w-2xl">
            Tận dụng bộ lọc thông minh để nhanh chóng chọn lựa các khóa học được sắp xếp khoa học, hỗ trợ gợi ý cá nhân hóa và phù hợp nhất với năng lực của riêng bạn.
          </p>

          {/* Search Box & Filters Container */}
          <div className="pt-4 space-y-4 max-w-3xl">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Nhập tên khóa học, kỹ năng, hoặc từ khóa (ví dụ: Python, UI/UX...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white text-black placeholder:text-muted-foreground rounded-2xl border-0 shadow-lg text-base focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-white"
              />
              {search && (
                <button 
                  onClick={() => setSearch("")} 
                  className="absolute right-4 text-sm font-bold text-muted-foreground hover:text-black transition-colors"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Smart Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Category selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-neutral-light-gray">Chủ đề khóa học</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-10 px-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-sm font-medium text-white transition-colors cursor-pointer outline-none focus:border-white focus:bg-neutral-800"
                >
                  <option value="Tất cả" className="bg-neutral-900 text-white">Tất cả chủ đề</option>
                  {CATEGORY_LIST.map((cat, idx) => (
                    <option key={idx} value={cat.name} className="bg-neutral-900 text-white">{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Level selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-neutral-light-gray">Trình độ học lực</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full h-10 px-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-sm font-medium text-white transition-colors cursor-pointer outline-none focus:border-white focus:bg-neutral-800"
                >
                  <option value="Tất cả" className="bg-neutral-900 text-white">Tất cả trình độ</option>
                  <option value="Cơ bản" className="bg-neutral-900 text-white">Cơ bản</option>
                  <option value="Trung cấp" className="bg-neutral-900 text-white">Trung cấp</option>
                  <option value="Nâng cao" className="bg-neutral-900 text-white">Nâng cao</option>
                </select>
              </div>

              {/* Duration selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-neutral-light-gray">Thời lượng tự học</label>
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="w-full h-10 px-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-sm font-medium text-white transition-colors cursor-pointer outline-none focus:border-white focus:bg-neutral-800"
                >
                  <option value="Tất cả" className="bg-neutral-900 text-white">Tất cả thời lượng</option>
                  <option value="Dưới 20 giờ" className="bg-neutral-900 text-white">Dưới 20 giờ</option>
                  <option value="20 - 40 giờ" className="bg-neutral-900 text-white">20 đến 40 giờ</option>
                  <option value="Trên 40 giờ" className="bg-neutral-900 text-white">Trên 40 giờ</option>
                </select>
              </div>
            </div>

            {/* Clear filters trigger */}
            {(search || selectedCategory !== "Tất cả" || selectedLevel !== "Tất cả" || selectedDuration !== "Tất cả") && (
              <div className="flex justify-end">
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-red-400 hover:text-red-300 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Đặt lại tất cả bộ lọc</span>
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ==========================================
          POPULAR COURSE CATEGORIES
          ========================================== */}
      <div className="space-y-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Danh Mục Khóa Học Thịnh Hành</h2>
          <p className="text-sm text-muted-foreground">Chọn các chủ đề đang được quan tâm nhiều nhất để định hướng lộ trình học tập.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORY_LIST.map((cat, idx) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={idx}
                onClick={() => setSelectedCategory(isSelected ? "Tất cả" : cat.name)}
                className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-36 transition-all duration-300 hover:shadow-md hover:-translate-y-1 group ${
                  isSelected 
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                    : "border-border/40 bg-card hover:border-primary/50"
                }`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${cat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {cat.count} khóa học chuyên sâu
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          COURSES LISTING GRID (FILTERED)
          ========================================== */}
      <div className="space-y-6 pt-4 border-t border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <span>Danh Sách Khóa Học Gợi Ý</span>
              <span className="text-sm px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {filteredCourses.length} kết quả
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">Các bài học được hiển thị dựa trên thông tin lọc của bạn.</p>
          </div>
        </div>

        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredCourses.map((course) => (
              <div 
                key={course.id} 
                className="flex flex-col bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden hover:shadow-md group transition-all duration-300"
              >
                {/* Course Header Image */}
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={course.image}
                    alt={course.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-sm font-bold text-primary shadow-sm border border-border/20">
                    {course.level}
                  </div>
                </div>
                
                {/* Course Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {course.tags.map((t, i) => (
                        <span key={i} className="text-sm font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {t}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  {/* Rating, Students Count & Duration */}
                  <div className="pt-4 border-t border-border/40 flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                      <span className="font-bold text-foreground">{course.rating}</span>
                      <span>({course.studentsCount})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{course.durationText}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="py-16 text-center border border-dashed border-border rounded-3xl max-w-xl mx-auto space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Filter className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-foreground">Không tìm thấy khóa học phù hợp</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Không tìm thấy kết quả nào khớp với bộ lọc hiện tại của bạn. Hãy thử thay đổi từ khóa tìm kiếm hoặc bấm nút đặt lại bộ lọc.
              </p>
            </div>
            <Button onClick={handleResetFilters} variant="outline" size="sm" className="rounded-xl">
              <RotateCcw className="mr-2 h-4 w-4" />
              Đặt lại bộ lọc
            </Button>
          </div>
        )}
      </div>

      {/* ==========================================
          INSTRUCTORS TEAM SECTION
          ========================================== */}
      <div className="space-y-6 pt-6 border-t border-border/40">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Đội Ngũ Giảng Viên Chuyên Gia</h2>
          <p className="text-sm text-muted-foreground">Gặp gỡ đội ngũ giảng viên giàu kinh nghiệm, dẫn dắt bạn trên lộ trình học tập cá nhân hóa.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {INSTRUCTORS.map((ins, idx) => (
            <div 
              key={idx} 
              className="p-6 bg-card border border-border/40 rounded-2xl shadow-sm space-y-4 hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header: Photo, Name & Title */}
                <div className="flex gap-4 items-center">
                  <div className="h-16 w-16 rounded-full border border-primary/20 bg-primary/5 overflow-hidden flex-shrink-0">
                    <img
                      src={ins.avatar}
                      alt={ins.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-foreground text-base leading-tight">{ins.name}</h3>
                    <p className="text-sm font-bold text-primary">{ins.role}</p>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span>{ins.school}</span>
                    </div>
                  </div>
                </div>

                {/* Bio Description */}
                <p className="text-sm leading-relaxed text-muted-foreground italic">
                  &ldquo;{ins.bio}&rdquo;
                </p>
              </div>

              {/* Stats Footer */}
              <div className="pt-4 border-t border-border/20 flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span>Đánh giá: <strong>{ins.rating}</strong></span>
                </div>
                <div>
                  <span>Giảng dạy: <strong>{ins.coursesCount} khóa học</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
