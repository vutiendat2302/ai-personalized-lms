import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { BookOpen, Calendar, Award, BarChart2, CheckSquare, Sparkles } from "lucide-react";

export const StudentLayout: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { label: "Bảng học tập", path: "/student", icon: BookOpen },
    { label: "Khóa học của tôi", path: "/student/courses", icon: Sparkles },
    { label: "Lịch học & Thi", path: "/student/schedule", icon: Calendar },
    { label: "Bài tập cần nộp", path: "/student/assignments", icon: CheckSquare },
    { label: "Chứng chỉ & Kết quả", path: "/student/certificates", icon: Award },
    { label: "Tiến độ học tập", path: "/student/analytics", icon: BarChart2 },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full bg-background">
      {/* Student Navigation Bar / Sidebar */}
      <aside className="w-64 shrink-0 bg-card border-r border-border p-4 hidden md:flex flex-col justify-between">
        <div className="space-y-6">
          <div className="px-3 py-2.5 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Student Portal</h2>
              <p className="text-[10px] text-muted-foreground">Giao diện Học viên</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3 bg-muted/40 border border-border/60 rounded-xl text-center">
          <p className="text-[11px] font-medium text-foreground">Gặp sự cố học tập?</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Liên hệ giảng viên hoặc hỗ trợ kỹ thuật</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 w-full min-w-0 overflow-x-clip">
        <Outlet />
      </main>
    </div>
  );
};
