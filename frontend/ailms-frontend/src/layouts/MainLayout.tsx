import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthModals } from "@/components/auth/AuthModals";
import { useAuth } from "@/hooks/useAuth";

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const { auth } = useAuth();

  const isPortalRoute =
    location.pathname.startsWith("/teacher") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/management") ||
    location.pathname.startsWith("/sales") ||
    location.pathname.startsWith("/student") ||
    location.pathname.startsWith("/activity-log");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-200">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      {!auth.accessToken && !isPortalRoute && <Footer />}
      {/* Global Auth & Cart Modals */}
      <AuthModals />
    </div>
  );
};
