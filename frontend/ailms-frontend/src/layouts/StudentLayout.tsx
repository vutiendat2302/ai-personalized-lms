import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  Award,
  BarChart2,
  CheckSquare,
  Sparkles,
  Target,
  Tag,
  ShoppingBag,
  ShoppingCart,
  Receipt,
  Bell,
  User as UserIcon,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavSection {
  title?: string;
  items: {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeCount?: number;
  }[];
}

export const StudentLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const { user } = auth;

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("ailms_student_sidebar_collapsed") === "true";
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("ailms_student_sidebar_collapsed", String(next));
      return next;
    });
  };

  const navSections: NavSection[] = [
    {
      items: [
        { label: "Bảng học tập", path: "/student/dashboard", icon: BookOpen },
      ],
    },
    {
      title: "HỌC TẬP",
      items: [
        { label: "Khóa học của tôi", path: "/student/courses", icon: Sparkles },
        { label: "Lịch học & Thi", path: "/student/schedule", icon: Calendar },
        { label: "Bài tập cần nộp", path: "/student/assignments", icon: CheckSquare, badgeCount: 2 },
        { label: "Chứng chỉ & Kết quả", path: "/student/certificates", icon: Award },
        { label: "Tiến độ học tập", path: "/student/progress", icon: BarChart2 },
        { label: "Mục tiêu & Streak", path: "/student/goals", icon: Target },
      ],
    },
    {
      title: "MUA SẮM",
      items: [
        { label: "Khám phá khóa học", path: "/student/catalog", icon: ShoppingBag },
        { label: "Kho Voucher & Mã giảm giá", path: "/student/vouchers", icon: Tag, badgeCount: 4 },
        { label: "Giỏ hàng", path: "/student/cart", icon: ShoppingCart, badgeCount: 1 },
        { label: "Đơn hàng của tôi", path: "/student/orders", icon: Receipt },
      ],
    },
  ];

  const notifications = [
    { id: 1, title: "Nhắc nộp bài tập", text: "Bài tập JWT Spring Security sẽ hết hạn vào 23:59 hôm nay", time: "30 phút trước", unread: true },
    { id: 2, title: "Lịch học nhóm sắp tới", text: "Buổi 12: Spring Security Live Class diễn ra lúc 19:00", time: "2 giờ trước", unread: true },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full bg-background text-foreground">
      {/* Student Sidebar matching Admin & Teacher style */}
      <aside
        className={`${
          isCollapsed ? "w-16" : "w-64"
        } shrink-0 border-r border-border/50 bg-card transition-all duration-200 ease-in-out hidden md:flex flex-col justify-between select-none`}
      >
        <div className="flex flex-col h-full">
          {/* Header bar with toggle */}
          <div className={`p-3.5 border-b border-border/50 bg-primary/5 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
            {!isCollapsed && (
              <div className="flex items-center gap-2.5 truncate">
                <div className="h-8 w-8 border rounded-lg border-border/40 flex items-center justify-center p-1 bg-background">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="truncate">
                  <h3 className="text-base font-semibold uppercase tracking-wider text-primary truncate">STUDENT PORTAL</h3>
                  <p className="text-xs text-muted-foreground font-medium truncate">Giao diện Học viên</p>
                </div>
              </div>
            )}

            <button
              onClick={toggleCollapse}
              className="p-2 rounded-lg bg-background/80 hover:bg-primary/40 hover:text-primary text-primary transition-all duration-200 shadow-xs flex items-center justify-center cursor-pointer"
              title={isCollapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-2.5 space-y-5 scrollbar-thin">
            {navSections.map((group, idx) => (
              <div key={idx} className="space-y-1.5">
                {!isCollapsed && group.title && (
                  <h4 className="px-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 truncate">
                    {group.title}
                  </h4>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={isCollapsed ? item.label : undefined}
                        className={`group flex items-center ${
                          isCollapsed ? "justify-center px-0 py-3" : "justify-between px-3 py-2.5"
                        } rounded-xl text-xs font-bold transition-all duration-150 ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-neutral-soft-gray/60"
                        }`}
                      >
                        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5"} truncate`}>
                          <Icon
                            className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110 ${
                              isActive ? "text-primary-foreground" : "text-primary/80 group-hover:text-primary"
                            }`}
                          />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </div>

                        {!isCollapsed && (
                          isActive ? (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" />
                          ) : item.badgeCount && item.badgeCount > 0 ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-primary/10 text-primary">
                              {item.badgeCount}
                            </span>
                          ) : null
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content & Top Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border/50 bg-card/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">Khung học tập:</span>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded-full">
              Học viên Cá nhân
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Bell Notification */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  2
                </span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-popover border border-border shadow-xl rounded-xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2 px-1">
                    <h3 className="text-xs font-bold text-foreground">Thông báo học tập</h3>
                    <span className="text-[10px] font-semibold text-primary">2 chưa đọc</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 rounded-lg border border-primary/20 bg-primary/5 text-xs transition cursor-pointer"
                      >
                        <p className="font-bold text-primary text-[11px]">{n.title}</p>
                        <p className="text-[11px] leading-relaxed mt-0.5">{n.text}</p>
                        <span className="text-[9px] text-muted-foreground mt-1 block">{n.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-xl border border-border/50 bg-background hover:bg-muted transition cursor-pointer"
              >
                <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                  {user?.fullName?.charAt(0) || "H"}
                </div>
                <span className="text-xs font-bold text-foreground hidden sm:inline">{user?.fullName || "Học viên"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-popover border border-border shadow-xl rounded-xl p-1 z-50 animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-muted transition cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 text-primary" />
                    <span>Trang cá nhân</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      navigate("/");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Area */}
        <main className="flex-1 p-6 md:p-8 w-full min-w-0 overflow-x-clip bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
