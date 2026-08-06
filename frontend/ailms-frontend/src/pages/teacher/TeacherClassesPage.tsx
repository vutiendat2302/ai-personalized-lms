import React from "react";
import { useParams } from "react-router-dom";
import { ClassManagementPage } from "@/pages/admin/classes/ClassManagementPage";
import { ClassDetailPage } from "@/pages/admin/classes/ClassDetailPage";

export const TeacherClassesPage: React.FC = () => {
  const { id } = useParams();
  if (id) return <ClassDetailPage />;
  return <ClassManagementPage />;
};
