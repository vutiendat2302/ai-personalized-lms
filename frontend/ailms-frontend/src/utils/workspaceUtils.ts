import type { RoleCode } from "@/types/jwtAuthentication";

export type PortalType = "MANAGEMENT" | "TEACHER" | "STUDENT" | "SUPPORT";

export interface PortalConfig {
  id: PortalType;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  path: string;
  color: string;
  iconName: string;
  roles: RoleCode[];
}

export const PORTAL_CONFIGS: Record<PortalType, PortalConfig> = {
  MANAGEMENT: {
    id: "MANAGEMENT",
    title: "Quản trị & Nhân sự",
    subtitle: "Management Portal",
    description: "Quản lý hệ thống, người dùng, học viên, nhân sự, tài chính và phân quyền.",
    badge: "Admin & HR",
    path: "/management",
    color: "from-blue-600 to-indigo-700",
    iconName: "ShieldCheck",
    roles: ["ADMIN", "HR"]
  },
  TEACHER: {
    id: "TEACHER",
    title: "Giảng dạy & Trợ giảng",
    subtitle: "Teacher Portal",
    description: "Quản lý lớp học được phân công, lịch dạy, điểm danh, chấm bài tập và bài kiểm tra.",
    badge: "Giảng viên & TA",
    path: "/teacher",
    color: "from-emerald-600 to-teal-700",
    iconName: "GraduationCap",
    roles: ["TEACHER", "TA"]
  },
  STUDENT: {
    id: "STUDENT",
    title: "Không gian Học tập",
    subtitle: "Student Portal",
    description: "Theo dõi khóa học, làm bài tập, thi online và xem tiến độ học tập cá nhân.",
    badge: "Học viên",
    path: "/student",
    color: "from-violet-600 to-purple-700",
    iconName: "BookOpen",
    roles: ["STUDENT"]
  },
  SUPPORT: {
    id: "SUPPORT",
    title: "Tư vấn khách hàng",
    subtitle: "Support Portal",
    description: "Tiếp nhận hàng đợi và trò chuyện realtime với khách truy cập landing page.",
    badge: "Support",
    path: "/support",
    color: "from-amber-500 to-orange-600",
    iconName: "MessageCircle",
    roles: ["SUPPORT"]
  }
};

/**
 * Xác định danh sách Portals khả dụng dựa vào danh sách Roles của người dùng.
 * ĐẶC BIỆT: Tài khoản ADMIN có toàn quyền truy cập cả 4 Portal.
 */
export function getAvailablePortals(roles?: RoleCode[] | null): PortalType[] {
  if (!roles || roles.length === 0) return [];

  const normalizedRoles = roles.map(r => r.toUpperCase() as RoleCode);
  const portals: PortalType[] = [];

  const isAdmin = normalizedRoles.includes("ADMIN");

  // Management Portal: ADMIN hoặc HR
  if (isAdmin || normalizedRoles.includes("HR")) {
    portals.push("MANAGEMENT");
  }

  // Teacher Portal: ADMIN, TEACHER hoặc TA
  if (isAdmin || normalizedRoles.includes("TEACHER") || normalizedRoles.includes("TA")) {
    portals.push("TEACHER");
  }

  // Student Portal: ADMIN hoặc STUDENT
  if (isAdmin || normalizedRoles.includes("STUDENT")) {
    portals.push("STUDENT");
  }

  // Support Portal: ADMIN hoặc SUPPORT có thể tiếp nhận và xử lý hội thoại.
  if (isAdmin || normalizedRoles.includes("SUPPORT")) {
    portals.push("SUPPORT");
  }

  return portals;
}

/**
 * Kiểm tra xem workspace hiện tại có hợp lệ với danh sách portals khả dụng hay không.
 * - Nếu activeWs hợp lệ -> Trả về activeWs.
 * - Nếu chỉ có đúng 1 Portal khả dụng -> Tự động trả về Portal duy nhất đó.
 * - Nếu có nhiều hơn 1 Portal và chưa chọn -> Trả về null (để hiển thị màn hình chọn Workspace).
 */
export function validateActiveWorkspace(
  activeWs: string | null,
  availablePortals: PortalType[]
): PortalType | null {
  if (availablePortals.length === 0) return null;
  if (activeWs && availablePortals.includes(activeWs as PortalType)) {
    return activeWs as PortalType;
  }
  if (availablePortals.length === 1) {
    return availablePortals[0];
  }
  return null;
}

/**
 * Lấy đường dẫn trang chủ của một Portal
 */
export function getPortalHomePath(portal: PortalType): string {
  return PORTAL_CONFIGS[portal]?.path || "/";
}
