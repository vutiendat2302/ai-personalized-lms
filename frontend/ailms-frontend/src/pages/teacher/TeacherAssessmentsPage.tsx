import React from "react";
import { AssessmentManagement } from "@/pages/admin/AssessmentManagement";

/** Dùng nguyên giao diện quản lý của Admin nhưng mọi dữ liệu và CRUD đều giới hạn theo người tạo hiện tại. */
export const TeacherAssessmentsPage: React.FC = () => (
  <AssessmentManagement scope="authored" />
);
