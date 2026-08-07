import React from "react";
import { WorkScheduleManagement } from "./WorkScheduleManagement";

/**
 * Calendar quản trị hợp nhất toàn bộ buổi dạy online của Teacher/TA.
 * Dùng chung resource-calendar và API thật với màn quản lý lịch giảng dạy,
 * tránh hai màn có logic/filter khác nhau hoặc fallback về mock.
 */
export const OnlineScheduleManagement: React.FC = () => (
  <WorkScheduleManagement
    title="Thời khóa biểu Online toàn hệ thống"
    description="Xem lịch của toàn bộ Teacher/TA hoặc lọc từng nhân viên; hỗ trợ tuần, ngày, tháng, danh sách và phát hiện trùng lịch."
  />
);
