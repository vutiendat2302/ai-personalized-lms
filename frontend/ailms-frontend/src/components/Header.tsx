import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useModalStore } from "@/store/useModalStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, ChevronDown, Bell, Globe, Search, User, Settings, BookOpen, Shield, Activity, Clock, Trash2, Sparkles, Target, ShoppingBag, BarChart, Loader2 } from "lucide-react";
import { searchApi, type SearchHistoryResponse, type PopularSearchResponse, type SuggestionResponse } from "@/api/search/searchApi";
import { StudentOnboardingModal } from "@/components/student/StudentOnboardingModal";
import { studentApi } from "@/api/students/studentApi";
import { useCartStore } from "@/store/useCartStore";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import type { StudentProfileData } from "@/api/students/studentApi";
import type { ApiResponse } from "@/types/base";
import { notificationApi, type NotificationItem } from "@/api/notifications/notificationApi";


export const Header: React.FC = () => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { openLogin, openRegister, openChangePassword } = useModalStore();
  const { items: cartItems, toggleCart } = useCartStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionResponse[]>([]);
  const [popularSearches, setPopularSearches] = useState<PopularSearchResponse[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryResponse[]>([]);
  const [recentlyViewedCourses, setRecentlyViewedCourses] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [onboardingInitialStep, setOnboardingInitialStep] = useState(1);
  const [hasGoal, setHasGoal] = useState<boolean>(() => {
    if (!auth.user?.id) return false;
    return localStorage.getItem(`hasGoal_${auth.user.id}`) === "true";
  });
  const searchRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    if (!auth.accessToken) return;
    setNotificationLoading(true);
    try {
      const [page, count] = await Promise.all([
        notificationApi.getMine(0, 8),
        notificationApi.getUnreadCount(),
      ]);
      setNotifications(page?.content || []);
      setUnreadCount(count || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationLoading(false);
    }
  };

  useEffect(() => {
    if (!auth.accessToken) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    void loadNotifications();
    const timer = window.setInterval(() => void loadNotifications(), 60000);
    return () => window.clearInterval(timer);
  }, [auth.accessToken, auth.user?.id]);

  const openNotification = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await notificationApi.markRead(item.id);
        setNotifications((items) => items.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch { /* Không chặn việc xem thông báo khi cập nhật trạng thái thất bại. */ }
    }
    if (item.targetUrl) {
      setNotificationOpen(false);
      if (/^https?:\/\//i.test(item.targetUrl)) window.location.assign(item.targetUrl);
      else navigate(item.targetUrl);
    }
  };

  const isStudent = Boolean(
    auth.user?.roles?.some((r: any) => {
      const roleStr = (typeof r === "object" ? (r?.code || r?.name || "") : String(r)).toUpperCase();
      return (
        roleStr === "STUDENT" ||
        roleStr === "ROLE_STUDENT" ||
        roleStr === "HỌC VIÊN" ||
        roleStr === "HOC VIEN" ||
        roleStr.includes("STUDENT") ||
        roleStr.includes("HỌC VIÊN") ||
        roleStr.includes("HOC VIEN")
      );
    })
  );

  // Automatically trigger Student Onboarding modal on first login if hasGoal is false
  useEffect(() => {
    if (auth.accessToken && auth.user && isStudent) {
      const uId = auth.user.id;

      studentApi.getStudentById(uId)
        .then((res: import("axios").AxiosResponse<ApiResponse<StudentProfileData>>) => {
          const profile = res.data?.data;
          if (profile && profile.hasGoal === true) {
            localStorage.setItem(`hasGoal_${uId}`, "true");
            setHasGoal(true);
          } else {
            localStorage.removeItem(`hasGoal_${uId}`);
            setHasGoal(false);
            setOnboardingInitialStep(1); // First login starts at Step 1 (Profile & Guardian)
            setOnboardingModalOpen(true);
          }
        })
        .catch(() => {
          // If student profile is missing (404), this is definitely first login -> open onboarding Step 1
          localStorage.removeItem(`hasGoal_${uId}`);
          setHasGoal(false);
          setOnboardingInitialStep(1);
          setOnboardingModalOpen(true);
        });
    } else {
      setHasGoal(false);
    }
  }, [auth.accessToken, auth.user, isStudent]);

  // Synchronize searchQuery with URL query parameter when on /explore
  useEffect(() => {
    if (location.pathname === "/explore") {
      const searchParams = new URLSearchParams(location.search);
      const kw = searchParams.get("keyword") || searchParams.get("q") || "";
      setSearchQuery(kw);
    }
  }, [location.pathname, location.search]);

  // Fetch search history from API (or local user history), max 4 items
  useEffect(() => {
    if (searchFocused) {
      const localHist: SearchHistoryResponse[] = JSON.parse(
        localStorage.getItem("ailms_local_search_history") || "[]"
      );

      if (auth.accessToken) {
        searchApi
          .getSearchHistory()
          .then((res) => {
            if (res.data?.success && Array.isArray(res.data?.data) && res.data.data.length > 0) {
              const apiHist = res.data.data;
              const merged = [...apiHist];
              localHist.forEach((lh) => {
                if (!merged.some((ah) => ah.keyword.toLowerCase() === lh.keyword.toLowerCase())) {
                  merged.push(lh);
                }
              });
              const finalFour = merged.slice(0, 4);
              setSearchHistory(finalFour);
              localStorage.setItem("ailms_local_search_history", JSON.stringify(finalFour));
            } else {
              setSearchHistory(localHist.slice(0, 4));
            }
          })
          .catch(() => {
            setSearchHistory(localHist.slice(0, 4));
          });
      } else {
        setSearchHistory(localHist.slice(0, 4));
      }
    }
  }, [searchFocused, auth.accessToken]);

  // Fetch autocomplete suggestions directly from API (Requires >= 2 characters)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);

    const timer = setTimeout(async () => {
      try {
        const res = await searchApi.getSuggestions(q);
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        setSuggestions(list);
      } catch (err) {
        console.warn("API getSuggestions error:", err);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch popular searches directly from API
  useEffect(() => {
    if (searchFocused) {
      searchApi.getPopularSearches(5, 5)
        .then(res => {
          if (res.data?.success && Array.isArray(res.data?.data)) {
            setPopularSearches(res.data.data);
          } else {
            setPopularSearches([]);
          }
        })
        .catch(err => {
          console.warn("API getPopularSearches error:", err);
          setPopularSearches([]);
        });
    }
  }, [searchFocused]);

  // Fetch Recently Viewed Courses from user interaction history
  useEffect(() => {
    if (searchFocused) {
      const localViewed = JSON.parse(
        localStorage.getItem("recently_viewed_courses") || "[]"
      );
      setRecentlyViewedCourses(localViewed);
    }
  }, [searchFocused]);

  const trackRecentlyViewed = (course: { id: string; name: string; category?: string; image?: string }) => {
    const existing: any[] = JSON.parse(localStorage.getItem("recently_viewed_courses") || "[]");
    const filtered = existing.filter((item) => String(item.id) !== String(course.id));
    const updated = [
      {
        id: String(course.id),
        name: course.name,
        category: course.category || "Khóa học AILMS",
        image: course.image || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&auto=format&fit=crop&q=60",
      },
      ...filtered,
    ].slice(0, 3);
    localStorage.setItem("recently_viewed_courses", JSON.stringify(updated));
    setRecentlyViewedCourses(updated);
  };

  const saveHistory = async (keyword: string, courseId?: string | null) => {
    if (!keyword.trim()) return;
    const cleanKw = keyword.trim();

    // 1. Update local storage history immediately
    const localHist: SearchHistoryResponse[] = JSON.parse(
      localStorage.getItem("ailms_local_search_history") || "[]"
    );
    const newHistItem: SearchHistoryResponse = {
      id: `hist-${Date.now()}`,
      keyword: cleanKw,
      courseId: courseId || null,
      createdAt: new Date().toISOString(),
    };
    const filteredLocal = localHist.filter((h) => h.keyword.toLowerCase() !== cleanKw.toLowerCase());
    const updatedLocal = [newHistItem, ...filteredLocal].slice(0, 4);
    localStorage.setItem("ailms_local_search_history", JSON.stringify(updatedLocal));
    setSearchHistory(updatedLocal);

    // 2. Call API if logged in
    if (auth.accessToken) {
      searchApi.saveSearchHistory({ keyword: cleanKw, courseId: courseId || null }).catch(() => {
        // Silently catch 403 / unauth errors
      });
    }
  };

  const handleDeleteHistory = async (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    const targetId = String(id);

    // 1. Instantly update UI and LocalStorage
    const localHist: SearchHistoryResponse[] = JSON.parse(
      localStorage.getItem("ailms_local_search_history") || "[]"
    );
    const updatedLocal = localHist.filter((item) => String(item.id) !== targetId).slice(0, 4);
    localStorage.setItem("ailms_local_search_history", JSON.stringify(updatedLocal));
    setSearchHistory((prev) => prev.filter((item) => String(item.id) !== targetId).slice(0, 4));

    // 2. Call DELETE API only when authenticated and non-synthetic id
    if (auth.accessToken && !targetId.startsWith("hist-")) {
      try {
        await searchApi.deleteSearchHistory(targetId);
      } catch {
        // Silently handle if token expired or item doesn't exist in backend
      }
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      saveHistory(query);
      setSearchFocused(false);
      setSearchQuery("");
      navigate(`/explore?keyword=${encodeURIComponent(query)}`);
    }
  };

  const handleSelectKeyword = async (keyword: string, courseId?: string | number | null, courseObj?: any) => {
    // 1. Resolve effective courseId
    let effectiveCourseId = courseId && courseId !== "null" && courseId !== "undefined" ? String(courseId) : null;

    if (!effectiveCourseId) {
      const matchPopular = popularSearches.find((p) => p.name.toLowerCase() === keyword.toLowerCase() || String(p.id) === String(courseId));
      if (matchPopular) {
        effectiveCourseId = String(matchPopular.id);
      }
      const matchSuggest = suggestions.find((s) => s.name.toLowerCase() === keyword.toLowerCase() || String(s.id) === String(courseId));
      if (matchSuggest) {
        effectiveCourseId = String(matchSuggest.id);
      }
      const matchViewed = recentlyViewedCourses.find((v) => v.name.toLowerCase() === keyword.toLowerCase() || String(v.id) === String(courseId));
      if (matchViewed) {
        effectiveCourseId = String(matchViewed.id);
      }
    }

    // 2. Re-save search history to push this item to the top of history (both API and LocalStorage)
    await saveHistory(keyword, effectiveCourseId);

    // 3. Track in recently viewed
    if (effectiveCourseId || courseObj) {
      trackRecentlyViewed({
        id: String(effectiveCourseId || courseObj?.id),
        name: keyword,
        category: courseObj?.categoryName || courseObj?.category,
      });
    }

    setSearchFocused(false);
    setSearchQuery("");

    // 4. Navigate immediately to course detail if courseId exists, otherwise navigate to search explore
    if (effectiveCourseId) {
      navigate(`/courses/${effectiveCourseId}`);
    } else {
      navigate(`/explore?keyword=${encodeURIComponent(keyword)}`);
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    const targetPath = auth.accessToken ? "/dashboard" : "/";
    if (location.pathname === targetPath) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate("/");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleSearchClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleSearchClickOutside);
    return () => document.removeEventListener("mousedown", handleSearchClickOutside);
  }, []);

  const isAdmin = Boolean(
    auth.user?.roles?.some((r: any) => {
      const roleStr = (typeof r === "object" ? (r?.code || r?.name || "") : String(r)).toUpperCase();
      return roleStr === "ADMIN" || roleStr === "ROLE_ADMIN" || roleStr.includes("ADMIN");
    })
  );

  // Ẩn giỏ hàng cho toàn bộ nhóm nhân viên (Admin, HR, Teacher, TA)
  const isEmployee = Boolean(
    auth.user?.roles?.some((r: any) => {
      const roleStr = (typeof r === "object" ? (r?.code || r?.name || "") : String(r)).toUpperCase();
      return (
        roleStr.includes("ADMIN") ||
        roleStr.includes("HR") ||
        roleStr.includes("TEACHER") ||
        roleStr.includes("TA") ||
        roleStr.includes("EMPLOYEE")
      );
    })
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-card/70 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-none w-full items-center justify-between px-6 lg:px-12">
        
        {/* Left Side: Logo */}
        <Link to={auth.accessToken ? "/dashboard" : "/"} onClick={handleLogoClick} className="flex items-center px-3 py-1.5 rounded-lg hover:bg-neutral-soft-gray/60 transition-all duration-200">
          <img src="/ailms_logo_full.png" alt="AILMS Logo" className="h-12 w-auto object-contain" />
        </Link>

        {/* Center: Global Search Bar & Navigation */}
        <div className="flex-1 flex items-center justify-center max-w-4xl mx-4 sm:mx-8 md:mx-12 gap-4">
          {/* Courses Dropdown (Only for Authenticated Student/User - Hidden for Employee/Staff) */}
          {auth.accessToken && auth.user && !isEmployee && (
            <div className="relative shrink-0 hidden md:block">
              <button 
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background/50 hover:bg-background text-xs font-semibold text-foreground transition-all"
              >
                <span>Các khóa học của tôi</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Public navigation links (Visible only when logged out and on large screens) */}
          {!auth.accessToken && (
            <nav className="hidden md:flex items-center gap-6 text-base font-semibold text-muted-foreground">
              <Link to="/#features" className="px-4 py-2 rounded-lg opacity-80 hover:opacity-100 hover:text-primary hover:bg-neutral-soft-gray/80 transition-all duration-200">Tính năng</Link>
              <Link to="/#courses" className="px-4 py-2 rounded-lg opacity-80 hover:opacity-100 hover:text-primary hover:bg-neutral-soft-gray/80 transition-all duration-200">Khóa học</Link>
              <Link to="/#testimonials" className="px-4 py-2 rounded-lg opacity-80 hover:opacity-100 hover:text-primary hover:bg-neutral-soft-gray/80 transition-all duration-200">Đánh giá</Link>
              <Link to="/#faq" className="px-4 py-2 rounded-lg opacity-80 hover:opacity-100 hover:text-primary hover:bg-neutral-soft-gray/80 transition-all duration-200">Hỏi đáp</Link>
            </nav>
          )}

          {/* Coursera-style Search Bar (Visible for everyone) */}
          <div ref={searchRef} className="relative flex-1 max-w-lg mx-auto hidden sm:block">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center h-10 w-full rounded-full border border-border/50 bg-white hover:bg-background focus-within:bg-background focus-within:ring-3 focus-within:ring-primary/20 transition-all overflow-hidden pr-1 shadow-sm">
              <input
                type="text"
                placeholder="Bạn muốn học gì hôm nay?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                className="w-full h-full pl-5 pr-12 text-base font-semibold opacity-80 bg-transparent placeholder:text-base placeholder:opacity-70 outline-none border-none text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 h-8 w-8 rounded-full bg-primary hover:bg-primary/70 active:bg-primary flex items-center justify-center text-white shadow transition-all shrink-0"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
            {searchFocused && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-150 max-w-[90vw] bg-card rounded-2xl border border-border/40 shadow-2xl p-5 z-50 animate-in fade-in-50 slide-in-from-top-3 duration-200">
                {/* 1. Real Autocomplete Suggestions from API */}
                {searchQuery.trim() !== "" ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Gợi ý tìm kiếm tự động
                    </h4>
                    {loadingSuggestions ? (
                      <div className="py-4 flex items-center justify-center gap-2 text-xs font-semibold text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Đang tìm gợi ý từ hệ thống...</span>
                      </div>
                    ) : searchQuery.trim().length < 2 ? (
                      <p className="text-xs text-muted-foreground py-2 italic">Nhập từ 2 ký tự trở lên để hiển thị gợi ý bài học.</p>
                    ) : suggestions.length > 0 ? (
                      <div className="flex flex-col space-y-1">
                        {suggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectKeyword(item.name, item.id)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-colors text-left"
                          >
                            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="block font-bold text-foreground line-clamp-1">{item.name}</span>
                              <span className="block text-[10px] text-primary uppercase font-extrabold">{item.categoryName}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2 italic">Không tìm thấy gợi ý phù hợp cho "{searchQuery}". Bấm Enter để tìm kiếm.</p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* 2. User Search History from API (If logged in & available) */}
                    {searchHistory.length > 0 && (
                      <div className="space-y-2 mb-4 pb-4 border-b border-border/60">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-primary" />
                            Lịch sử tìm kiếm gần đây
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {searchHistory.slice(0, 4).map((item) => (
                            <div
                              key={item.id}
                              onClick={() => handleSelectKeyword(item.keyword, item.courseId)}
                              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-muted/30 text-sm font-semibold text-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all cursor-pointer"
                            >
                              <span className="line-clamp-1 max-w-50">{item.keyword}</span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteHistory(e, item.id)}
                                className="p-0.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                title="Xóa từ khóa này"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Trending searches */}
                    <div className="space-y-2.5">
                      <h4 className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Từ khóa tìm kiếm phổ biến
                      </h4>
                      {popularSearches.length > 0 ? (
                        <div className="flex flex-col space-y-1.5">
                          {popularSearches.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectKeyword(item.name, item.id)}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/65 bg-muted/35 text-xs text-foreground font-bold hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all text-left"
                            >
                              <Search className="h-3.5 w-3.5 text-muted-foreground mr-2 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="block text-foreground line-clamp-1">{item.name}</span>
                                <span className="block text-[9px] text-muted-foreground">{item.categoryName}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic py-1">Chưa có dữ liệu từ khóa phổ biến.</p>
                      )}
                    </div>

                    {/* 4. Recently viewed courses */}
                    <div className="space-y-3 mt-5 border-t border-border/60 pt-4">
                      <h4 className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider">
                        Xem gần đây
                      </h4>
                      
                      {recentlyViewedCourses.length > 0 ? (
                        <div className="grid grid-cols-3 gap-3">
                          {recentlyViewedCourses.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSearchFocused(false);
                                trackRecentlyViewed(c);
                                navigate(`/courses/${c.id}`);
                              }}
                              className="flex flex-col bg-muted/20 border border-border/80 rounded-xl overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/20 transition-all group"
                            >
                              <div className="aspect-video overflow-hidden bg-muted relative">
                                {c.image ? <img src={c.image} alt={c.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" /> : <div className="flex h-full w-full items-center justify-center bg-primary/5"><BookOpen className="h-6 w-6 text-primary/40" /></div>}
                              </div>
                              <div className="p-2 flex-1 flex flex-col justify-between space-y-1">
                                <span className="text-[10px] font-extrabold uppercase text-primary tracking-wider">{c.category}</span>
                                <h5 className="font-bold text-foreground text-xs leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                  {c.name}
                                </h5>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic py-1">Chưa có khóa học xem gần đây.</p>
                      )}
                    </div>
                  </>
                )}
              
              </div>
            )}
          </div>
        </div>

        {/* Right Side Section */}
        <div className="flex items-center gap-3">
          {auth.accessToken && auth.user ? (
            // Authenticated Right Side Icons & Profile Dropdown
            <div className="flex items-center gap-3 relative" ref={dropdownRef}>
              
              {/* Workspace Switcher dropdown for multi-role users */}
              <WorkspaceSwitcher />

              {/* Goal Widget Button for Student (Chỉ hiển thị khi Học viên CHƯA có goal) */}
              {isStudent && !hasGoal && (
                <button
                  onClick={() => {
                    const isCompleted = localStorage.getItem(`hasGoal_${auth.user?.id}`) === "true";
                    setOnboardingInitialStep(isCompleted ? 3 : 1);
                    setOnboardingModalOpen(true);
                  }}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-all shadow-sm"
                  title="Cập nhật mục tiêu học tập & sở thích"
                >
                  <Target className="h-4 w-4" />
                  <span>Mục tiêu học tập</span>
                </button>
              )}

              {/* Globe Icon */}
              <button className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Ngôn ngữ">
                <Globe className="h-4.5 w-4.5" />
              </button>

              {/* Shopping Cart Trigger (Chỉ hiển thị cho Học Viên / Khách vãng lai, ẩn hoàn toàn đối với Nhân Viên & Admin) */}
              {(!auth.accessToken || isStudent) && !isEmployee && (
                <button
                  onClick={toggleCart}
                  className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative"
                  title="Giỏ hàng"
                >
                  <ShoppingBag className="h-4.5 w-4.5" />
                  {cartItems.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-white font-extrabold text-[9px] flex items-center justify-center border-2 border-background shadow-sm">
                      {cartItems.length}
                    </span>
                  )}
                </button>
              )}


              {/* Notification Bell */}
              <button
                onClick={() => { setNotificationOpen((open) => !open); setDropdownOpen(false); }}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative"
                title="Thông báo"
                aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ""}`}
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-background">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-10 top-12 z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl animate-in fade-in-50 slide-in-from-top-2">
                  <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">Thông báo</p>
                      <p className="text-[10px] text-muted-foreground">Theo tài khoản và vai trò hiện tại</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        className="text-[11px] font-semibold text-primary hover:underline"
                        onClick={async () => { await notificationApi.markAllRead(); setUnreadCount(0); setNotifications((items) => items.map((item) => ({ ...item, isRead: true }))); }}
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                  <div className="max-h-105 overflow-y-auto p-2">
                    {notificationLoading ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải thông báo...</div>
                    ) : notifications.length === 0 ? (
                      <div className="py-10 text-center"><Bell className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" /><p className="text-xs font-medium text-muted-foreground">Chưa có thông báo</p></div>
                    ) : notifications.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => void openNotification(item)}
                        className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted ${item.isRead ? "" : "bg-primary/5"}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.isRead ? "bg-muted-foreground/25" : "bg-primary"}`} />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-foreground">{item.title}</span>
                            <span className="mt-0.5 line-clamp-2 block text-[11px] leading-4 text-muted-foreground">{item.content}</span>
                            <span className="mt-1 block text-[10px] text-muted-foreground/70">{new Date(item.createdAt).toLocaleString("vi-VN")}</span>
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Avatar trigger */}
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-full p-0.5"
              >
                <Avatar className="h-9 w-9 border-2 border-primary/20 hover:border-primary/60 transition-all">
                  <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${auth.user.username}`} />
                  <AvatarFallback className="bg-primary/10 text-primary uppercase font-bold text-xs">
                    {auth.user.username.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </button>

              {/* Custom Profile Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 top-12 w-56 rounded-xl border border-border bg-card p-2 shadow-xl animate-in fade-in-50 slide-in-from-top-3 duration-200 z-50">
                  <div className="px-3 py-2 border-b border-border/60 mb-1">
                    <p className="text-xs font-bold text-foreground truncate">{auth.user.fullName || auth.user.username}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{auth.user.email}</p>
                  </div>

                  {isAdmin ? (
                    // Admin Menu Items
                    <>
                      <button
                        onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      >
                        <User className="h-4 w-4 text-primary" />
                        <span>Thông tin cá nhân</span>
                      </button>
                      <button
                        onClick={() => { setDropdownOpen(false); navigate("/admin/approval-center"); }}
                        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      >
                        <Shield className="h-4 w-4 text-primary" />
                        <span>Trung tâm phê duyệt</span>
                      </button>
                      <button
                        onClick={() => { setDropdownOpen(false); navigate("/analytics"); }}
                        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      >
                        <BarChart className="h-4 w-4 text-primary" />
                        <span>Báo cáo & Analytics</span>
                      </button>
        
                      <button
                        onClick={() => { setDropdownOpen(false); navigate("/activity-log"); }}
                        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      >
                        <Activity className="h-4 w-4 text-primary" />
                        <span>Nhật ký hệ thống</span>
                      </button>
                    </>
                  ) : isEmployee ? (
                    // Teacher / HR Menu Items
                      <>
                        <button
                          onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                          className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                        >
                          <User className="h-4 w-4 text-primary" />
                          <span>Thông tin cá nhân</span>
                        </button>
                        <button
                          onClick={() => { setDropdownOpen(false); navigate("/activity-log"); }}
                          className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                        >
                          <Activity className="h-4 w-4 text-primary" />
                          <span>Lịch sử hoạt động</span>
                        </button>
                      </>
                  ) :
                  (
                    // Student Menu Items
                    <>
                      <button
                        onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      >
                        <User className="h-4 w-4 text-primary" />
                        <span>Thông tin cá nhân</span>
                      </button>
                      <button
                        onClick={() => { setDropdownOpen(false); navigate("/dashboard"); }}
                        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      >
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span>Các khóa học của tôi</span>
                      </button>
                      <button
                        onClick={() => { setDropdownOpen(false); setOnboardingModalOpen(true); }}
                        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      >
                        <Target className="h-4 w-4 text-primary" />
                        <span>Thiết lập mục tiêu & Sở thích</span>
                      </button>
                      <button
                        onClick={() => { setDropdownOpen(false); navigate("/activity-log"); }}
                        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      >
                        <Activity className="h-4 w-4 text-primary" />
                        <span>Lịch sử hoạt động</span>
                      </button>
                    </>
                  )}

                  {/* Settings Item triggers Change Password Modal */}
                  <button
                    onClick={() => { setDropdownOpen(false); openChangePassword(); }}
                    className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                  >
                    <Settings className="h-4 w-4 text-primary" />
                  <span>Cài đặt (Đổi mật khẩu)</span>
                  </button>

                  <div className="border-t border-border/60 my-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-bold text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-all"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            // Public Right Side LogIn/SignUp Buttons
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="lg" onClick={openLogin} className="text-primary-foreground bg-primary hover:bg-primary-foreground border-border/80 border font-semibold">
                Đăng nhập
              </Button>
              <Button variant="ghost" size="lg" onClick={openRegister} className="text-primary-foreground bg-primary hover:bg-primary-foreground border border-border/80 font-semibold">
                Đăng ký
              </Button>
            </div>
          )}
        </div>

      </div>
      <StudentOnboardingModal
        isOpen={onboardingModalOpen}
        initialStep={onboardingInitialStep}
        onClose={() => {
          setOnboardingModalOpen(false);
          if (auth.user?.id) {
            setHasGoal(localStorage.getItem(`hasGoal_${auth.user.id}`) === "true");
          }
        }}
      />
    </header>
  );
};
