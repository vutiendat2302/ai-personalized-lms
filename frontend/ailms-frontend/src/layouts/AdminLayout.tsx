import React from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminAiChatWidget } from "@/components/admin/chat/AdminAiChatWidget";

export const AdminLayout: React.FC = () => {
  const { auth } = useAuth();
  
  const isAdmin = Boolean(
    auth.user?.roles?.some((r: any) => {
      const roleStr = (typeof r === "object" ? (r?.code || r?.name || "") : String(r)).toUpperCase();
      return roleStr === "ADMIN" || roleStr === "ROLE_ADMIN" || roleStr.includes("ADMIN");
    })
  );

  if (!isAdmin) {
    return <Outlet />;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full bg-background relative">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 w-full min-w-0 overflow-x-clip">
        <Outlet />
      </main>
      <AdminAiChatWidget />
    </div>
  );
};
