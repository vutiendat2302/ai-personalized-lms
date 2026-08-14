import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Menu,
  LayoutDashboard,
  Shield,
  Key,
  Building2,
  BookOpen,
  Video,
  Briefcase,
  Clock,
  ShoppingBag,
  Tag,
  DollarSign,
  UserCheck,
  CheckSquare,
  GraduationCap,
  HelpCircle,
  BarChart3,
  Activity,
  ChevronRight,
  Trash2,
  FileText,
  Files,
  MessageSquareWarning,
  Receipt,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

interface SidebarGroup {
  title: string;
  items: {
    label: string;
    path: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

export const AdminSidebar: React.FC = () => {
  const { auth } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("ailms_admin_sidebar_collapsed") === "true";
  });

  const user = auth.user;
  const rolesUpper = user?.roles?.map((r: any) => (typeof r === "object" ? (r?.code || r?.name || "") : String(r)).toUpperCase()) || [];
  const isAdmin = rolesUpper.some(r => r.includes("ADMIN") || r.includes("QUẢN TRỊ"));
  const isHR = rolesUpper.some(r => r.includes("HR") || r.includes("HUMAN") || r.includes("NHÂN SỰ") || r.includes("NHAN SU"));
  const isHrOnly = isHR && !isAdmin;

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("ailms_admin_sidebar_collapsed", String(next));
      return next;
    });
  };

  const menuGroups: SidebarGroup[] = [
    {
      title: "TRANG CHỦ",
      items: [
        { label: "Tổng Quan", path: "/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "HỆ THỐNG & PHÂN QUYỀN",
      items: [
        { label: "Quản lý vai trò", path: "/admin/roles", icon: Shield },
        { label: "Quản lý quyền hạn", path: "/admin/permissions", icon: Key },
        { label: "Nhật ký hoạt động", path: "/admin/activity-log", icon: Activity },
        { label: "Thùng rác hệ thống", path: "/admin/trash", icon: Trash2 },
        { label: "Quản lý File", path: "/admin/files", icon: Files },
      ],
    },
    {
      title: "NHÂN SỰ & VẬN HÀNH",
      items: [
        { label: "Quản lý phòng ban", path: "/admin/department", icon: Building2 },
        { label: "Quản lý hợp đồng", path: "/admin/contracts", icon: FileText },
        { label: "Quản lý nhân viên", path: "/admin/employees", icon: Briefcase },
        { label: "Quản lý học viên", path: "/admin/students", icon: GraduationCap },
        { label: "Điểm danh", path: "/admin/fulltime-attendance", icon: Clock },
        { label: "Quản lý bảng lương", path: "/admin/salaries", icon: DollarSign },
        { label: "Quản lý lịch làm việc", path: "/admin/work-schedule", icon: Briefcase },
        { label: "Hàng đợi yêu cầu xử lý", path: "/admin/approval-center", icon: CheckSquare },
        { label: "Phân công giảng viên", path: "/admin/category-teachers", icon: GraduationCap },
      ],
    },
    {
      title: "ĐÀO TẠO & KINH DOANH",
      items: [
        { label: "Quản lý khóa học", path: "/admin/courses", icon: BookOpen },
        { label: "Kiểm duyệt đánh giá", path: "/admin/reviews/moderation", icon: MessageSquareWarning },
        { label: "Quản lý lớp học", path: "/admin/classrooms", icon: Video },
        { label: "Quản lý buổi học", path: "/admin/sessions", icon: Video },
        { label: "Quản lý tài liệu", path: "/admin/quizzes", icon: HelpCircle },
      ],
    },

    {
      title: "QUẢN LÝ BÁN HÀNG",
      items: [
        { label: "Sales Dashboard", path: "/sales/dashboard", icon: TrendingUp },
        { label: "Đơn hàng", path: "/sales/orders", icon: ShoppingBag },
        { label: "Thanh toán & Đối soát", path: "/sales/payments", icon: Receipt },
        { label: "Mã giảm giá (Coupon)", path: "/sales/coupons", icon: Tag },
        { label: "Gói học (Packages)", path: "/sales/course-packages", icon: Package },
        { label: "Ghi danh & Kích hoạt", path: "/sales/enrollments", icon: UserCheck },
        { label: "Giỏ hàng đang treo", path: "/sales/carts", icon: ShoppingCart, badge: "2" },
      ],
    },

    {
      title: "BÁO CÁO & GIÁM SÁT",
      items: [
        { label: "Thống kê & Analytics", path: "/analytics", icon: BarChart3 }, 
      ],
    },
  ];

  const displayedMenuGroups = menuGroups
    .filter((group) => !isHrOnly || group.title === "NHÂN SỰ & VẬN HÀNH")
    .map((group) => isHrOnly
      ? { ...group, items: group.items.filter((item) => item.path !== "/admin/category-teachers") }
      : group);

  return (
    <aside
      className={`sticky top-16 h-[calc(100vh-4rem)] shrink-0 bg-card border-r border-border/60 flex flex-col transition-all duration-300 select-none overflow-hidden ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header bar with 3-line hamburger menu toggle icon */}
      <div className={`p-3.5 border-b border-border/50 bg-primary/5 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 truncate">
            <div className="h-8 w-8 border rounded-lg border-border/40 flex items-center justify-center">
              <img src = "/logo-max.png"
              alt="logo"
              className="h-full w-full object-contain"
              />
            </div>
            <div className="truncate">
              <h3 className="text-base font-semibold uppercase tracking-wider text-primary truncate">{isHrOnly ? "HR Portal" : "Management"}</h3>
              <p className="text-xs text-muted-foreground font-medium truncate">{isHrOnly ? "Bảng điều khiển Nhân sự" : "Bảng điều khiển Quản trị"}</p>
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
        {displayedMenuGroups.map((group, idx) => (
          <div key={idx} className="space-y-1.5">
            {!isCollapsed && (
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
                      <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? "text-primary-foreground" : "text-primary/80 group-hover:text-primary"
                      }`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && (
                      isActive ? (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      ) : item.badge ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-primary/10 text-primary">
                          {item.badge}
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
    </aside>
  );
};
