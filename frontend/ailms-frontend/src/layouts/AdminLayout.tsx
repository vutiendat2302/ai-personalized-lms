import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AiChatWidget } from "@/components/admin/chat/AdminAiChatWidget";

export const AdminLayout: React.FC = () => {
  const { auth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const user = auth.user;
  const rolesUpper = user?.roles?.map((r: any) => (typeof r === "object" ? (r?.code || r?.name || "") : String(r)).toUpperCase()) || [];
  const isAdmin = rolesUpper.some(r => r.includes("ADMIN") || r.includes("QUẢN TRỊ"));
  const isHR = rolesUpper.some(r => r.includes("HR") || r.includes("HUMAN") || r.includes("NHÂN SỰ") || r.includes("NHAN SU"));
  const isHrOnly = isHR && !isAdmin;
  const isManagementRole = isAdmin || isHR;

  useEffect(() => {
    if (isHrOnly) {
      const path = location.pathname;
      const adminOnlyPaths = [
        "/management",
        "/dashboard",
        "/admin/roles",
        "/admin/permissions",
        "/admin/activity-log",
        "/admin/trash",
        "/admin/files",
        "/sales"
      ];
      if (adminOnlyPaths.some(p => path === p || path.startsWith(p + "/"))) {
        navigate("/admin/employees", { replace: true });
      }
    }
  }, [isHrOnly, location.pathname, navigate]);

  if (!isManagementRole) {
    return (
      <>
        <Outlet />
        <AiChatWidget />
      </>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full bg-background relative">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 w-full min-w-0 overflow-x-clip">
        <Outlet />
      </main>
      <AiChatWidget />
    </div>
  );
};
