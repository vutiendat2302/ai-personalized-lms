import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { BookOpen, Users, Calendar, GraduationCap, FileCheck, ClipboardList, Clock, Sparkles } from "lucide-react";

export const TeacherLayout: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { label: "Tổng quan Giảng dạy", path: "/teacher", icon: GraduationCap },
    { label: "Lớp học đảm nhận", path: "/teacher/classes", icon: Users },
    { label: "Lịch dạy Online", path: "/teacher/schedule", icon: Calendar },
    { label: "Quản lý Khóa học", path: "/teacher/courses", icon: BookOpen },
    { label: "Lớp gợi ý", path: "/teacher/suggested-classes", icon: Sparkles },
    { label: "Chấm bài tập", path: "/teacher/assignments", icon: ClipboardList },
    { label: "Bài thi & Quiz", path: "/teacher/quizzes", icon: FileCheck },
    { label: "Điểm danh", path: "/teacher/attendance", icon: Clock },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full bg-slate-950 text-white">
      {/* Teacher Sidebar */}
      <aside className="w-64 shrink-0 bg-slate-900/80 border-r border-slate-800 p-4 hidden md:flex flex-col justify-between">
        <div className="space-y-6">
          <div className="px-3 py-2 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-emerald-600/20 rounded-lg text-emerald-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-emerald-300">Teacher Portal</h2>
              <p className="text-[10px] text-slate-400">Không gian Giảng viên & TA</p>
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
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                      : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-center">
          <p className="text-[11px] font-medium text-slate-400">Trợ giúp giảng dạy?</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Liên hệ đào tạo: hr@lms.edu</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 w-full min-w-0 overflow-x-clip bg-slate-950">
        <Outlet />
      </main>
    </div>
  );
};
