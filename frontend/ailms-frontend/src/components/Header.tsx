import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useModalStore } from "@/store/useModalStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, ChevronDown, Bell, Globe, Search, User, Settings, BookOpen, Users, Shield, Activity, ChevronRight } from "lucide-react";

export const Header: React.FC = () => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { openLogin, openRegister, openChangePassword } = useModalStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchFocused(false);
      navigate(`/explore?keyword=${encodeURIComponent(searchQuery.trim())}`);
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

  const isAdmin = auth.user?.roles.includes("ADMIN");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-card/70 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-none w-full items-center justify-between px-6 lg:px-12">
        
        {/* Left Side: Logo */}
        <Link to={auth.accessToken ? "/dashboard" : "/"} onClick={handleLogoClick} className="flex items-center px-3 py-1.5 rounded-lg hover:bg-neutral-soft-gray/60 transition-all duration-200">
          <img src="/ailms_logo_full.png" alt="AILMS Logo" className="h-12 w-auto object-contain" />
        </Link>

        {/* Center: Global Search Bar & Navigation */}
        <div className="flex-1 flex items-center justify-between max-w-4xl mx-4 sm:mx-8 md:mx-12 gap-4">
          {/* Courses Dropdown (Only for Authenticated users) */}
          {auth.accessToken && auth.user && (
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
          <div ref={searchRef} className="relative flex-1 max-w-lg hidden sm:block">
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

            {/* Search Dropdown Overlay */}
            {searchFocused && (
              <div className="absolute left-0 mt-2 w-[600px] max-w-[90vw] bg-card rounded-2xl border border-border/40 shadow-2xl p-5 z-50 animate-in fade-in-50 slide-in-from-top-3 duration-200">
                {/* Trending searches */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    Từ khóa tìm kiếm phổ biến
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Trí tuệ nhân tạo (AI)",
                      "Lập trình Python",
                      "Marketing số",
                      "Thiết kế UI/UX",
                      "Phân tích dữ liệu",
                      "Excel cơ bản",
                      "Google SEO",
                      "Facebook Ads",
                      "Machine Learning"
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSearchQuery(tag);
                          setSearchFocused(false);
                          navigate(`/explore?keyword=${encodeURIComponent(tag)}`);
                        }}
                        className="px-3 py-1 rounded-xl border border-border bg-muted/40 text-[11px] font-bold text-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recently viewed courses */}
                <div className="space-y-3 mt-5 border-t border-border/60 pt-4">
                  <h4 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    Xem gần đây
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        id: "355582871404154883",
                        name: "Toàn tập Marketing số cho người mới bắt đầu",
                        category: "Marketing số",
                        image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&auto=format&fit=crop&q=60"
                      },
                      {
                        id: "355582871404154884",
                        name: "Lập trình Python từ cơ bản đến nâng cao",
                        category: "Lập trình",
                        image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&auto=format&fit=crop&q=60"
                      },
                      {
                        id: "355582871404154885",
                        name: "Thiết kế giao diện UI/UX với Figma chuyên sâu",
                        category: "Thiết kế",
                        image: "https://images.unsplash.com/photo-1561070791-26c113006238?w=300&auto=format&fit=crop&q=60"
                      }
                    ].map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSearchFocused(false);
                          navigate(`/courses/${c.id}`);
                        }}
                        className="flex flex-col bg-muted/20 border border-border/80 rounded-xl overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/20 transition-all group"
                      >
                        <div className="aspect-video overflow-hidden bg-muted relative">
                          <img src={c.image} alt={c.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <div className="p-2 flex-1 flex flex-col justify-between space-y-1">
                          <span className="text-[8px] font-extrabold uppercase text-primary tracking-wider">{c.category}</span>
                          <h5 className="font-bold text-foreground text-[10px] leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                            {c.name}
                          </h5>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer quiz link */}
                <div className="mt-4 border-t border-border/60 pt-3 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-muted-foreground font-medium">Bạn chưa biết nên học gì?</span>
                  <Link to="/explore" onClick={() => setSearchFocused(false)} className="text-primary hover:underline flex items-center gap-0.5">
                    Làm bài kiểm tra ngắn <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Section */}
        <div className="flex items-center gap-3">
          {auth.accessToken && auth.user ? (
            // Authenticated Right Side Icons & Profile Dropdown
            <div className="flex items-center gap-3 relative" ref={dropdownRef}>
              
              {/* Globe Icon */}
              <button className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Ngôn ngữ">
                <Globe className="h-4.5 w-4.5" />
              </button>

              {/* Notification Bell */}
              <button className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative" title="Thông báo">
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              </button>

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
                        onClick={() => { setDropdownOpen(false); navigate("/admin/users"); }}
                        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      >
                        <Users className="h-4 w-4 text-primary" />
                        <span>Quản lý người dùng</span>
                      </button>
                      <button
                        onClick={() => { setDropdownOpen(false); navigate("/admin/roles"); }}
                        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      >
                        <Shield className="h-4 w-4 text-primary" />
                        <span>Quản lý vai trò</span>
                      </button>
                      <button
                        onClick={() => { setDropdownOpen(false); navigate("/admin/permissions"); }}
                        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      >
                        <Settings className="h-4 w-4 text-primary" />
                        <span>Quản lý quyền hạn</span>
                      </button>
                      <button
                        onClick={() => { setDropdownOpen(false); navigate("/admin/courses"); }}
                        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      >
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span>Quản lý khóa học</span>
                      </button>
                      <button
                        onClick={() => { setDropdownOpen(false); navigate("/activity-log"); }}
                        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      >
                        <Activity className="h-4 w-4 text-primary" />
                        <span>Nhật ký hệ thống</span>
                      </button>
                    </>
                  ) : (
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
    </header>
  );
};
