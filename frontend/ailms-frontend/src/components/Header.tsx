import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useModalStore } from "@/store/useModalStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GraduationCap, LogOut, ChevronDown, Bell, Globe, Search, User, Settings, BookOpen, Users, Shield, Activity } from "lucide-react";

export const Header: React.FC = () => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const { openLogin, openRegister, openChangePassword } = useModalStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const isAdmin = auth.user?.roles.includes("ADMIN");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/85 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left Side: Logo */}
        <Link to={auth.accessToken ? "/dashboard" : "/"} className="flex items-center gap-2.5 hover:opacity-95 transition-opacity">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <GraduationCap className="h-5.5 w-5.5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AILMS
          </span>
        </Link>

        {/* Center Section: Conditional Navigation */}
        {auth.accessToken && auth.user ? (
          // Authenticated Middle Section (Figma styled)
          <div className="hidden md:flex items-center gap-4 flex-1 max-w-md mx-8">
            {/* Courses Dropdown */}
            <div className="relative">
              <button 
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background/50 hover:bg-background text-xs font-semibold text-foreground transition-all"
              >
                <span>Các khóa học của tôi</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Bạn muốn học gì ?"
                className="w-full pl-9 pr-4 py-1.5 rounded-full border border-border bg-background/50 hover:bg-background focus:bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        ) : (
          // Public Marketing Middle Section
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Tính năng</a>
            <a href="#courses" className="hover:text-foreground transition-colors">Khóa học</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Đánh giá</a>
            <a href="#faq" className="hover:text-foreground transition-colors">Hỏi đáp</a>
          </nav>
        )}

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
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={openLogin} className="hover:text-primary">
                Đăng nhập
              </Button>
              <Button variant="default" size="sm" onClick={openRegister} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/15">
                Đăng ký
              </Button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
