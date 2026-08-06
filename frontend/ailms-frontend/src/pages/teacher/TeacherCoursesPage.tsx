import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { CourseCatalogPage } from "@/pages/admin/courses/CourseCatalogPage";

export const TeacherCoursesPage: React.FC = () => {
  const { auth } = useAuth();
  const { user } = auth;

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

  if (isTA) {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  return <CourseCatalogPage />;
};
