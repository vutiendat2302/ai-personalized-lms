import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  GraduationCap,
  Users,
  Calendar,
  Sparkles,
  BookOpen,
  ClipboardList,
  FileCheck,
  Clock,
  TrendingUp,
  DollarSign,
  CalendarOff,
  ChevronRight,
  Menu,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavSection {
  title: string;
  items: {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    requiresTeacher?: boolean; // if true, hide for TA position
    badgeCount?: number;
  }[];
}

export const TeacherLayout: React.FC = () => {
  const location = useLocation();
  const { auth } = useAuth();
  const { user } = auth;

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("ailms_teacher_sidebar_collapsed") === "true";
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("ailms_teacher_sidebar_collapsed", String(next));
      return next;
    });
  };

  // Determine if current user position is purely TA (without TEACHER or ADMIN role)
  const isTA = Boolean(
    user?.roles?.some((r: any) => {
      const roleStr = (typeof r === "object" ? (r?.code || r?.name || "") : String(r)).toUpperCase().replace("ROLE_", "");
      return roleStr === "TA";
    }) &&
    !user?.roles?.some((r: any) => {
      const roleStr = (typeof r === "object" ? (r?.code || r?.name || "") : String(r)).toUpperCase().replace("ROLE_", "");
      return roleStr === "TEACHER" || roleStr === "ADMIN" || roleStr === "HR";
    })
  );

  const navSections: NavSection[] = [
    {
      title: "DẠY HỌC",
      items: [
        { label: "Tổng quan Giảng dạy", path: "/teacher/dashboard", icon: GraduationCap },
        { label: "Quản lý Khóa học", path: "/teacher/courses", icon: BookOpen, requiresTeacher: true },
        { label: "Lớp học đảm nhận", path: "/teacher/classes", icon: Users },
        { label: "Lịch dạy Online", path: "/teacher/schedule", icon: Calendar, badgeCount: 1 },
        { label: "Lớp gợi ý", path: "/teacher/suggested-classes", icon: Sparkles, badgeCount: 4 },
      ],
    },
    {
      title: "ĐÁNH GIÁ HỌC VIÊN",
      items: [
        { label: "Chấm bài tập", path: "/teacher/grading/assignments", icon: ClipboardList, badgeCount: 5 },
        { label: "Bài thi & Quiz", path: "/teacher/grading/quizzes", icon: FileCheck, badgeCount: 3 },
        { label: "Điểm danh", path: "/teacher/attendance", icon: Clock },
        { label: "Tiến độ & Học viên nguy cơ", path: "/teacher/insights", icon: TrendingUp, badgeCount: 3 },
      ],
    },
    {
      title: "THU NHẬP & NHÂN SỰ",
      items: [
        { label: "Thu nhập & Buổi dạy", path: "/teacher/earnings", icon: DollarSign },
        { label: "Đơn nghỉ / Báo bận", path: "/teacher/leave-requests", icon: CalendarOff },
      ],
    },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full bg-background text-foreground">
      {/* Teacher Sidebar matching Admin style */}
      <aside
        className={`sticky top-16 h-[calc(100vh-4rem)] ${
          isCollapsed ? "w-16" : "w-64"
        } shrink-0 border-r border-border/50 bg-card transition-all duration-300 ease-in-out hidden md:flex flex-col justify-between select-none overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Header bar with hamburger menu toggle icon */}
          <div className={`p-3.5 border-b border-border/50 bg-primary/5 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
            {!isCollapsed && (
              <div className="flex items-center gap-2.5 truncate">
                <div className="h-8 w-8 border rounded-lg border-border/40 flex items-center justify-center p-1 bg-background">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div className="truncate">
                  <h3 className="text-base font-semibold uppercase tracking-wider text-primary truncate">TEACHER PORTAL</h3>
                  <p className="text-xs text-muted-foreground font-medium truncate">
                    {isTA ? "Không gian Trợ giảng (TA)" : "Không gian Giảng viên"}
                  </p>
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
            {navSections.map((group, idx) => {
              const visibleItems = group.items.filter((item) => !(item.requiresTeacher && isTA));
              if (visibleItems.length === 0) return null;

              return (
                <div key={idx} className="space-y-1.5">
                  {!isCollapsed && (
                    <h4 className="px-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 truncate">
                      {group.title}
                    </h4>
                  )}
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
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
              );
            })}
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
