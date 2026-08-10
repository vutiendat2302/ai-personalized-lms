import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { courseApi } from "@/api/courses/courseApi";
import { degreeApi } from "@/api/degrees/degreeApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  BookOpen,
  GraduationCap,
  Layers,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

// Types for Mock & API data
interface DegreeItem {
  id: string;
  universityName: string;
  universityLogo: string;
  title: string;
  type: string; // BACHELORS, MASTERS
  duration: string;
  image: string;
}

export const CategoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Core Category States
  const [category, setCategory] = useState<any | null>(null);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Courses list states
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseLevelFilter, setCourseLevelFilter] = useState<string>("ALL"); // ALL, BEGINNER, INTERMEDIATE, ADVANCED
  const [coursePage, setCoursePage] = useState(0);
  const [hasMoreCourses, setHasMoreCourses] = useState(false);

  // Degrees list states
  const [degreeFilter, setDegreeFilter] = useState<string>("ALL"); // ALL, BACHELORS, MASTERS
  const [mockDegrees, setMockDegrees] = useState<DegreeItem[]>([]);

  // Fetch Category Details & All Categories (for explore section)
  useEffect(() => {
    if (!id) return;

    const fetchCategoryAndList = async () => {
      try {
        setLoadingCategory(true);
        setCategoryError(null);

        // 1. Fetch category detail
        const catRes = await courseApi.getCategoryById(id);
        if (catRes.data.success) {
          setCategory(catRes.data.data);
        } else {
          setCategoryError("Không tìm thấy danh mục này.");
        }

        // 2. Fetch other categories for "Explore Categories" section
        const listRes = await courseApi.getAllCategories();
        if (listRes.data.success) {
          setCategoriesList(listRes.data.data.filter((cat: any) => cat.status === "ACTIVE"));
        }
      } catch (err: any) {
        console.error("Error fetching category info:", err);
        setCategoryError("Không thể tải thông tin danh mục.");
      } finally {
        setLoadingCategory(false);
      }
    };

    fetchCategoryAndList();
    setCoursePage(0); // Reset page on category change
  }, [id]);

  // Fetch Courses in this category
  useEffect(() => {
    if (!id || !category) return;

    const fetchCategoryCourses = async () => {
      try {
        setLoadingCourses(true);
        const searchParams: any = {
          categoryId: id,
          page: coursePage,
          size: 8,
          status: "ACTIVE",
        };

        if (courseLevelFilter !== "ALL") {
          searchParams.level = courseLevelFilter;
        }

        const coursesRes = await courseApi.searchCourses(searchParams);
        if (coursesRes.data.success) {
          const pageData = coursesRes.data.data;
          const content = pageData.content || [];
          setCourses(prev => (coursePage === 0 ? content : [...prev, ...content]));
          setHasMoreCourses(!pageData.last);
        }
      } catch (err: any) {
        console.error("Error fetching courses in category:", err);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCategoryCourses();
  }, [id, category, courseLevelFilter, coursePage]);

  // Initialize Mock Degrees data based on Category
  useEffect(() => {
    if (!category) return;
    
    // Custom mock degrees based on the category name
    const catName = category.name.toLowerCase();
    
    let categoryDegrees: DegreeItem[] = [];
    
    if (catName.includes("lập trình") || catName.includes("computer") || catName.includes("tin học") || catName.includes("công nghệ")) {
      categoryDegrees = [
        {
          id: "deg-1",
          universityName: "Đại học Bách Khoa Hà Nội",
          universityLogo: "BK",
          title: "Cử nhân Công nghệ thông tin (Khoa học máy tính)",
          type: "BACHELORS",
          duration: "36 - 48 tháng học trực tuyến",
          image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=60"
        },
        {
          id: "deg-2",
          universityName: "Đại học Illinois Urbana-Champaign",
          universityLogo: "UIUC",
          title: "Thạc sĩ Khoa học máy tính trực tuyến (MCS)",
          type: "MASTERS",
          duration: "18 - 36 tháng học",
          image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=60"
        },
        {
          id: "deg-3",
          universityName: "Đại học London",
          universityLogo: "UOL",
          title: "Cử nhân Phát triển web & Ứng dụng di động",
          type: "BACHELORS",
          duration: "36 tháng học linh hoạt",
          image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60"
        }
      ];
    } else if (catName.includes("kinh tế") || catName.includes("business") || catName.includes("quản trị") || catName.includes("marketing")) {
      categoryDegrees = [
        {
          id: "deg-4",
          universityName: "Đại học London (UoL)",
          universityLogo: "LSE",
          title: "Cử nhân Quản trị kinh doanh & Tài chính trực tuyến",
          type: "BACHELORS",
          duration: "36 - 60 tháng học",
          image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&auto=format&fit=crop&q=60"
        },
        {
          id: "deg-5",
          universityName: "Đại học Macquarie",
          universityLogo: "MQ",
          title: "Thạc sĩ Quản trị kinh doanh toàn cầu (Global MBA)",
          type: "MASTERS",
          duration: "18 - 24 tháng học",
          image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&auto=format&fit=crop&q=60"
        },
        {
          id: "deg-6",
          universityName: "Đại học Illinois tại Urbana-Champaign",
          universityLogo: "iMBA",
          title: "Thạc sĩ Khoa học Quản trị kinh doanh (iMSM)",
          type: "MASTERS",
          duration: "12 - 24 tháng học",
          image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&auto=format&fit=crop&q=60"
        }
      ];
    } else {
      categoryDegrees = [
        {
          id: "deg-7",
          universityName: "Đại học Quốc gia Hà Nội",
          universityLogo: "VNU",
          title: "Cử nhân Phát triển nguồn nhân lực và Đào tạo số",
          type: "BACHELORS",
          duration: "36 - 48 tháng học",
          image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&auto=format&fit=crop&q=60"
        },
        {
          id: "deg-8",
          universityName: "Đại học Arizona State",
          universityLogo: "ASU",
          title: "Thạc sĩ Khoa học Giáo dục và Thiết kế bài giảng",
          type: "MASTERS",
          duration: "18 - 30 tháng học",
          image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60"
        }
      ];
    }

    setMockDegrees(categoryDegrees);
  }, [category]);

  const [degrees, setDegrees] = useState<DegreeItem[]>([]);

  // Fetch Degrees from real API when Category or degreeFilter changes
  useEffect(() => {
    if (!id) return;

    const fetchDegreesFromApi = async () => {
      try {
        const catDegRes = await degreeApi.getDegreesByCategory(id);
        if (catDegRes.data.success && catDegRes.data.data?.length > 0) {
          const apiDegrees = catDegRes.data.data.map((d: any) => ({
            id: d.id,
            universityName: d.universityName,
            universityLogo: d.universityLogo || d.universityName?.slice(0, 3)?.toUpperCase() || "UNI",
            title: d.title,
            type: d.type,
            duration: d.duration,
            image: (d.image && d.image.startsWith("http")) 
              ? d.image 
              : "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&auto=format&fit=crop&q=60"
          }));
          setDegrees(apiDegrees);
        } else {
          // If empty from category API, try search endpoint
          const searchRes = await degreeApi.searchDegrees({ categoryId: id });
          if (searchRes.data.success && searchRes.data.data?.content?.length > 0) {
            const apiDegrees = searchRes.data.data.content.map((d: any) => ({
              id: d.id,
              universityName: d.universityName,
              universityLogo: d.universityLogo || d.universityName?.slice(0, 3)?.toUpperCase() || "UNI",
              title: d.title,
              type: d.type,
              duration: d.duration,
              image: (d.image && d.image.startsWith("http")) 
                ? d.image 
                : "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&auto=format&fit=crop&q=60"
            }));
            setDegrees(apiDegrees);
          } else {
            setDegrees(mockDegrees);
          }
        }
      } catch (err) {
        console.error("Error loading degrees from API:", err);
        setDegrees(mockDegrees);
      }
    };

    fetchDegreesFromApi();
  }, [id, mockDegrees]);

  const handleLevelFilterChange = (level: string) => {
    setCourseLevelFilter(level);
    setCoursePage(0); // Reset page on filter change
  };

  const handleLoadMoreCourses = () => {
    setCoursePage(prev => prev + 1);
  };

  const filteredDegrees = (degrees.length > 0 ? degrees : mockDegrees).filter(deg => {
    if (degreeFilter === "ALL") return true;
    return deg.type === degreeFilter;
  });

  const getCoursePlaceholderImage = (categoryName: string) => {
    const name = categoryName?.toLowerCase() || "";
    if (name.includes("lập trình") || name.includes("code") || name.includes("web") || name.includes("phần mềm") || name.includes("python")) {
      return "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60";
    }
    if (name.includes("ai") || name.includes("trí tuệ") || name.includes("máy học") || name.includes("data") || name.includes("khoa học máy tính")) {
      return "https://images.unsplash.com/photo-1527474305487-b87b222841cc?w=500&auto=format&fit=crop&q=60";
    }
    if (name.includes("thiết kế") || name.includes("design") || name.includes("ui") || name.includes("ux")) {
      return "https://images.unsplash.com/photo-1561070791-26c113006238?w=500&auto=format&fit=crop&q=60";
    }
    return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60";
  };

  if (loadingCategory) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm font-medium text-muted-foreground">Đang tải thông tin danh mục...</p>
      </div>
    );
  }

  if (categoryError || !category) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <BookOpen className="h-12 w-12" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-foreground">Không tìm thấy danh mục</h2>
        <p className="mt-2 text-muted-foreground max-w-md">
          {categoryError || "Danh mục không tồn tại hoặc đã bị gỡ bỏ."}
        </p>
        <Button onClick={() => navigate("/")} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại trang chủ
        </Button>
      </div>
    );
  }

  // Fallback stats for UI
  const categoryStats = {
    credentialsCount: category.credentialsCount || 1026,
    degreesCount: category.degreesCount || 14,
    coursesCount: category.coursesCount || courses.length * 3 + 120,
  };

  const getDegreeCoverImage = (title: string, imgUrl: string) => {
    if (imgUrl && (imgUrl.startsWith("http://") || imgUrl.startsWith("https://"))) {
      return imgUrl;
    }
    const t = title?.toLowerCase() || "";
    if (t.includes("máy tính") || t.includes("lập trình") || t.includes("công nghệ") || t.includes("cs")) {
      return "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=60";
    }
    if (t.includes("toán") || t.includes("phân tích") || t.includes("analytics") || t.includes("dữ liệu")) {
      return "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=60";
    }
    if (t.includes("kinh doanh") || t.includes("mba") || t.includes("quản trị") || t.includes("bachelor")) {
      return "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&auto=format&fit=crop&q=60";
    }
    return "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&auto=format&fit=crop&q=60";
  };

  const renderUniversityLogo = (logo: string, uniName: string) => {
    if (logo && (logo.startsWith("http://") || logo.startsWith("https://"))) {
      return <img src={logo} alt={uniName} className="h-6 w-6 rounded-full object-cover shrink-0 border border-primary/20" />;
    }
    let initials = logo?.replace(/_logo\.(png|jpg|svg|jpeg)$/i, "").toUpperCase() || "";
    if (!initials || initials.length > 5) {
      initials = uniName
        ? uniName
            .split(" ")
            .filter(w => w.length > 0)
            .map(w => w[0])
            .join("")
            .slice(0, 3)
            .toUpperCase()
        : "UNI";
    }
    return (
      <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-black text-primary shrink-0">
        {initials}
      </div>
    );
  };

  return (
    <div className="bg-background min-h-screen pb-20">
      
      {/* 1. CATEGORY HEADER SECTION */}
      <div className="bg-gradient-to-b from-muted/30 to-background border-b border-border py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Back Button & Breadcrumbs */}
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/student/dashboard");
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
              <span className="text-foreground font-semibold">{category.name}</span>
            </nav>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Title & Description */}
            <div className="lg:col-span-8 space-y-4">
              <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                {category.name}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-4xl">
                {category.description || `Khám phá các khóa học hàng đầu thuộc danh mục ${category.name} trên AILMS. Giúp bạn phát triển các kỹ năng chuyên môn từ cơ bản đến chuyên sâu, xây dựng nền tảng tư duy vững chắc và thực hành ứng dụng thực tế để nâng cao năng lực nghề nghiệp.`}
              </p>
            </div>

            {/* Right Side Stats */}
            <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-6 shadow-sm flex justify-around items-center gap-4 text-center divide-x divide-border">
              <div className="flex-1">
                <span className="block text-2xl font-black text-foreground">{categoryStats.credentialsCount}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Chứng chỉ</span>
              </div>
              <div className="flex-1 pl-4">
                <span className="block text-2xl font-black text-foreground">{categoryStats.degreesCount}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Bằng cấp</span>
              </div>
              <div className="flex-1 pl-4">
                <span className="block text-2xl font-black text-foreground">{categoryStats.coursesCount}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Khóa học</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MOST POPULAR COURSES SECTION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Khóa học phổ biến nhất</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Học tập từ các chuyên gia hàng đầu và đối tác của học viện.</p>
          </div>

          {/* Level Filter Buttons */}
          <div className="flex flex-wrap gap-1.5 bg-muted/60 p-1 rounded-xl w-fit">
            {[
              { id: "ALL", label: "Tất cả" },
              { id: "BEGINNER", label: "Cơ bản" },
              { id: "INTERMEDIATE", label: "Trung cấp" },
              { id: "ADVANCED", label: "Nâng cao" },
            ].map(lvl => (
              <button
                key={lvl.id}
                onClick={() => handleLevelFilterChange(lvl.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  courseLevelFilter === lvl.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Courses Grid */}
        {loadingCourses && coursePage === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 py-6">
            {[1, 2, 4, 8].map(i => (
              <div key={i} className="h-80 rounded-2xl border border-border bg-card animate-pulse"></div>
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="flex flex-col bg-card rounded-2xl border border-border/80 shadow-sm hover:shadow-lg hover:border-primary/45 hover:-translate-y-1 cursor-pointer overflow-hidden group transition-all duration-300"
                >
                  {/* Card Cover Image */}
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    <img
                      src={course.image || getCoursePlaceholderImage(course.categoryName)}
                      alt={course.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                    <Badge className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm hover:bg-card/90 text-primary border border-border/20 shadow-sm text-[10px] font-bold">
                      {course.level === "ADVANCED" ? "Nâng cao" : course.level === "BEGINNER" ? "Cơ bản" : "Trung cấp"}
                    </Badge>
                    <Badge className="absolute top-3 right-3 bg-blue-600 hover:bg-blue-600 text-white border-none shadow-md text-[10px] font-bold">
                      Học thử miễn phí
                    </Badge>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                          AI
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                          AILMS Academy
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {course.name}
                      </h3>
                    </div>

                    <div className="pt-3.5 border-t border-border/60 flex flex-col gap-1.5 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400 shrink-0" />
                        <span className="font-bold text-foreground">{course.avgRating || 4.7}</span>
                        <span>({course.reviewCount || 150} đánh giá)</span>
                      </div>
                      <div className="flex items-center justify-between font-medium">
                        <span>{course.level === "ADVANCED" ? "Nâng cao" : course.level === "BEGINNER" ? "Cơ bản" : "Trung cấp"} • 4-6 tuần học</span>
                        <span className="font-bold text-primary">
                          {course.suggestedPrice ? `${course.suggestedPrice.toLocaleString()}đ` : "Miễn phí"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMoreCourses && (
              <div className="flex justify-center pt-2">
                <Button onClick={handleLoadMoreCourses} variant="outline" className="rounded-xl px-6" disabled={loadingCourses}>
                  {loadingCourses ? "Đang tải..." : "Xem thêm khóa học"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-muted/10">
            <Layers className="h-10 w-10 text-muted-foreground/45 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground font-semibold">Chưa có khóa học nào thuộc cấp độ này.</p>
          </div>
        )}
      </div>

      {/* 3. ONLINE DEGREES SECTION (BẰNG CẤP TRỰC TUYẾN - MOCKED) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Bằng cử nhân & thạc sĩ trực tuyến</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Nhận bằng cấp đại học chính quy 100% học từ xa từ các trường đại học uy tín.</p>
          </div>

          {/* Degree Filter Buttons */}
          <div className="flex flex-wrap gap-1.5 bg-muted/60 p-1 rounded-xl w-fit">
            {[
              { id: "ALL", label: "Tất cả bằng cấp" },
              { id: "BACHELORS", label: "Bằng cử nhân" },
              { id: "MASTERS", label: "Bằng thạc sĩ" },
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setDegreeFilter(type.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  degreeFilter === type.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Degrees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredDegrees.map((deg) => (
            <div
              key={deg.id}
              className="flex flex-col bg-card rounded-2xl border border-border/80 shadow-sm hover:shadow-md overflow-hidden group transition-all"
            >
              {/* Cover */}
              <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                <img
                  src={getDegreeCoverImage(deg.title, deg.image)}
                  alt={deg.title}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
                <Badge className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm hover:bg-card/90 text-primary border border-border/20 shadow-sm text-[10px] font-bold">
                  {deg.type === "MASTERS" ? "Bằng Thạc sĩ" : "Bằng Cử nhân chính quy"}
                </Badge>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {renderUniversityLogo(deg.universityLogo, deg.universityName)}
                    <span className="text-[11px] font-bold text-muted-foreground line-clamp-1">
                      {deg.universityName}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-foreground text-sm leading-snug line-clamp-2">
                    {deg.title}
                  </h3>
                </div>

                <div className="pt-3 border-t border-border/60 flex flex-col gap-1 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1 text-primary font-bold">
                    <GraduationCap className="h-4 w-4 shrink-0" />
                    <span>Nhận bằng Đại học</span>
                  </div>
                  <span>Thời gian học: {deg.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. EXPLORE OTHER CATEGORIES */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 border-t border-border/50 pt-12 space-y-6">
        <div>
          <h2 className="text-xl font-extrabold text-foreground">Khám phá các danh mục khác</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Tiếp tục học hỏi các lĩnh vực học tập hot nhất hiện nay.</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {categoriesList
            .filter(cat => cat.id !== id) // Exclude current category
            .map((cat) => (
              <Button
                key={cat.id}
                onClick={() => navigate(`/categories/${cat.id}`)}
                variant="outline"
                className="rounded-xl px-4 py-2.5 h-auto text-xs font-bold border-border/80 bg-card hover:bg-muted/30 shadow-sm transition-all"
              >
                <Layers className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                {cat.name}
              </Button>
            ))}
        </div>
      </div>

    </div>
  );
};
