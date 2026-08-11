import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  CheckSquare,
  Sparkles,
  Tag,
  ShoppingBag,
  ShoppingCart,
  Receipt,
  ChevronRight,
  Menu,
  School,
} from "lucide-react";

interface NavSection {
  title?: string;
  items: {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

export const StudentLayout: React.FC = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("ailms_student_sidebar_collapsed") === "true";
  });

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
        { label: "Lớp học của tôi", path: "/student/classes", icon: School },
        { label: "Lịch học & Thi", path: "/student/schedule", icon: Calendar },
        { label: "Bài tập cần nộp", path: "/student/assignments", icon: CheckSquare },
      ],
    },
    {
      title: "MUA SẮM",
      items: [
        { label: "Khám phá khóa học", path: "/student/catalog", icon: ShoppingBag },
        { label: "Voucher của tôi", path: "/student/vouchers", icon: Tag },
        { label: "Giỏ hàng", path: "/student/cart", icon: ShoppingCart },
        { label: "Đơn hàng của tôi", path: "/student/orders", icon: Receipt },
      ],
    },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full bg-background text-foreground">
      {/* Student Sidebar matching Admin & Teacher style */}
      <aside
        className={`sticky top-16 h-[calc(100vh-4rem)] ${
          isCollapsed ? "w-16" : "w-64"
        } shrink-0 border-r border-border/50 bg-card transition-all duration-300 ease-in-out hidden md:flex flex-col justify-between select-none overflow-hidden`}
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
                    const isActive = location.pathname === item.path
                      || (item.path === "/student/classes" && location.pathname.startsWith("/student/classes/"));

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

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 w-full min-w-0 overflow-x-clip bg-background">
        <Outlet />
      </main>
    </div>
  );
};
