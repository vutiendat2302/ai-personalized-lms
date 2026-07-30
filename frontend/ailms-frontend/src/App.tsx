import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./hooks/AuthProvider";
import { useAuth } from "./hooks/useAuth";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import { SelectWorkspace } from "./pages/SelectWorkspace";
import { NoWorkspacePage } from "./pages/NoWorkspacePage";

import { UserManagement } from "./pages/admin/UserManagement";
import { StudentManagement } from "./pages/admin/StudentManagement";
import { EmployeeManagement } from "./pages/admin/EmployeeManagement";
import { RoleManagement } from "./pages/admin/RoleManagement";
import { PermissionManagement } from "./pages/admin/PermissionManagement";
import { CourseManagement } from "./pages/admin/CourseManagement";
import { OrderManagement } from "./pages/admin/OrderManagement";
import { CouponManagement } from "./pages/admin/CouponManagement";
import { HRManagement } from "./pages/admin/HRManagement";
import { TrashManagement } from "./pages/admin/TrashManagement";
import { ApprovalCenterPage } from "./pages/admin/ApprovalCenterPage";
import { CategoryTeacherAssignPage } from "./pages/admin/CategoryTeacherAssignPage";
import { DepartmentManagement } from "./pages/admin/DepartmentManagement";
import { ContractManagement } from "./pages/admin/ContractManagement";
import { RevenueManagement } from "./pages/admin/RevenueManagement";
import { QuizManagement } from "./pages/admin/QuizManagement";
import { AssignmentManagement } from "./pages/admin/AssignmentManagement";
import { ClassroomManagement } from "./pages/admin/ClassroomManagement";
import { OnlineScheduleManagement } from "./pages/admin/OnlineScheduleManagement";
import { WorkScheduleManagement } from "./pages/admin/WorkScheduleManagement";
import { FulltimeAttendanceManagement } from "./pages/admin/FulltimeAttendanceManagement";

import { LearningAnalytics } from "./pages/LearningAnalytics";
import { CertificateVerifyPage } from "./pages/CertificateVerifyPage";
import { ActivityLog } from "./pages/ActivityLog";
import { Terms } from "./pages/Terms";
import { ExplorePathways } from "./pages/ExplorePathways";
import { CourseDetail } from "./pages/CourseDetail";
import { CategoryDetail } from "./pages/CategoryDetail";
import { SetPassword } from "./pages/SetPassword";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { MainLayout } from "./layouts/MainLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { TeacherLayout } from "./layouts/TeacherLayout";
import { StudentLayout } from "./layouts/StudentLayout";

import { UserRole } from "./config/roles";
import { getPortalHomePath } from "./utils/workspaceUtils";
import { useModalStore } from "./store/useModalStore";

// Component to reset scroll position to top on route change
const ScrollToTop: React.FC = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const timer = setTimeout(() => {
        const id = hash.replace("#", "");
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    window.scrollTo(0, 0);
  }, [pathname, search, hash]);

  return null;
};

// Helper component to redirect to home and open a specific auth modal
const RedirectToHomeAndOpenModal: React.FC<{ modalType: "login" | "register" | "forgotPassword" }> = ({ modalType }) => {
  const { openLogin, openRegister, openForgotPassword } = useModalStore();

  useEffect(() => {
    if (modalType === "login") openLogin();
    if (modalType === "register") openRegister();
    if (modalType === "forgotPassword") openForgotPassword();
  }, [modalType, openLogin, openRegister, openForgotPassword]);

  return <Navigate to="/" replace />;
};

// Smart Portal Resolver for /dashboard
const PortalResolver: React.FC = () => {
  const { availablePortals, activeWorkspace, defaultWorkspace } = useAuth();

  if (availablePortals.length === 0) {
    return <Navigate to="/no-workspace" replace />;
  }

  if (activeWorkspace && availablePortals.includes(activeWorkspace)) {
    return <Navigate to={getPortalHomePath(activeWorkspace)} replace />;
  }

  if (defaultWorkspace && availablePortals.includes(defaultWorkspace)) {
    return <Navigate to={getPortalHomePath(defaultWorkspace)} replace />;
  }

  if (availablePortals.length === 1) {
    return <Navigate to={getPortalHomePath(availablePortals[0])} replace />;
  }

  return <Navigate to="/select-workspace" replace />;
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <Routes>
          {/* Main Layout containing Header, Footer, and global AuthModals */}
          <Route element={<MainLayout />}>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/explore" element={<ExplorePathways />} />
            <Route path="/categories" element={<ExplorePathways />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/categories/:id" element={<CategoryDetail />} />
            <Route path="/set-password" element={<SetPassword />} />

            {/* Redirects from old auth paths */}
            <Route path="/login" element={<RedirectToHomeAndOpenModal modalType="login" />} />
            <Route path="/register" element={<RedirectToHomeAndOpenModal modalType="register" />} />
            <Route path="/forgot-password" element={<RedirectToHomeAndOpenModal modalType="forgotPassword" />} />
            <Route path="/verify-otp" element={<Navigate to="/" replace />} />
            <Route path="/reset-password" element={<Navigate to="/" replace />} />

            {/* Workspace Selection & Edge-case pages */}
            <Route element={<ProtectedRoute />}>
              <Route path="/select-workspace" element={<SelectWorkspace />} />
              <Route path="/no-workspace" element={<NoWorkspacePage />} />
              <Route path="/dashboard" element={<PortalResolver />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/activity-log" element={<ActivityLog />} />
            </Route>

            {/* 1. MANAGEMENT PORTAL (ADMIN & HR) */}
            <Route element={<ProtectedRoute requiredPortal="MANAGEMENT" allowedRoles={[UserRole.ADMIN, UserRole.HR]} />}>
              <Route element={<AdminLayout />}>
                <Route path="/management" element={<Dashboard />} />
                <Route path="/admin" element={<Navigate to="/management" replace />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/students" element={<StudentManagement />} />
                <Route path="/admin/employees" element={<EmployeeManagement />} />
                <Route path="/admin/roles" element={<RoleManagement />} />
                <Route path="/admin/permissions" element={<PermissionManagement />} />
                <Route path="/admin/activity-log" element={<ActivityLog />} />
                <Route path="/admin/courses" element={<CourseManagement />} />
                <Route path="/admin/orders" element={<OrderManagement />} />
                <Route path="/admin/coupons" element={<CouponManagement />} />
                <Route path="/admin/hr" element={<HRManagement />} />
                <Route path="/admin/trash" element={<TrashManagement />} />
                <Route path="/admin/approval-center" element={<ApprovalCenterPage />} />
                <Route path="/admin/category-teachers" element={<CategoryTeacherAssignPage />} />
                <Route path="/admin/department" element={<DepartmentManagement />} />
                <Route path="/admin/contracts" element={<ContractManagement />} />
                <Route path="/admin/revenue" element={<RevenueManagement />} />
                <Route path="/admin/quizzes" element={<QuizManagement />} />
                <Route path="/admin/assignments" element={<AssignmentManagement />} />
                <Route path="/admin/classrooms" element={<ClassroomManagement />} />
                <Route path="/admin/online-schedule" element={<OnlineScheduleManagement />} />
                <Route path="/admin/work-schedule" element={<WorkScheduleManagement />} />
                <Route path="/admin/fulltime-attendance" element={<FulltimeAttendanceManagement />} />
                <Route path="/analytics" element={<LearningAnalytics />} />
              </Route>
            </Route>

            {/* 2. TEACHER PORTAL (TEACHER, TA & ADMIN) */}
            <Route element={<ProtectedRoute requiredPortal="TEACHER" allowedRoles={[UserRole.ADMIN, UserRole.TEACHER, UserRole.TA]} />}>
              <Route element={<TeacherLayout />}>
                <Route path="/teacher" element={<Dashboard />} />
                <Route path="/teacher/classes" element={<ClassroomManagement />} />
                <Route path="/teacher/schedule" element={<OnlineScheduleManagement />} />
                <Route path="/teacher/courses" element={<CourseManagement />} />
                <Route path="/teacher/assignments" element={<AssignmentManagement />} />
                <Route path="/teacher/quizzes" element={<QuizManagement />} />
                <Route path="/teacher/attendance" element={<FulltimeAttendanceManagement />} />
              </Route>
            </Route>

            {/* 3. STUDENT PORTAL (STUDENT & ADMIN) */}
            <Route element={<ProtectedRoute requiredPortal="STUDENT" allowedRoles={[UserRole.ADMIN, UserRole.STUDENT]} />}>
              <Route element={<StudentLayout />}>
                <Route path="/student" element={<Dashboard />} />
                <Route path="/student/courses" element={<ExplorePathways />} />
                <Route path="/student/schedule" element={<OnlineScheduleManagement />} />
                <Route path="/student/assignments" element={<AssignmentManagement />} />
                <Route path="/student/certificates" element={<CertificateVerifyPage />} />
                <Route path="/student/analytics" element={<LearningAnalytics />} />
              </Route>
            </Route>

          </Route>

          {/* Public Certificate Verification Route */}
          <Route path="/verify" element={<CertificateVerifyPage />} />
          <Route path="/verify/:certificateCode" element={<CertificateVerifyPage />} />

          {/* Fallback for invalid paths */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
