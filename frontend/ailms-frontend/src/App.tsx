import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./hooks/AuthProvider";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import { UserManagement } from "./pages/admin/UserManagement";
import { RoleManagement } from "./pages/admin/RoleManagement";
import { PermissionManagement } from "./pages/admin/PermissionManagement";
import { CourseManagement } from "./pages/admin/CourseManagement";
import { ActivityLog } from "./pages/ActivityLog";
import { Terms } from "./pages/Terms";
import { ExplorePathways } from "./pages/ExplorePathways";
import { CourseDetail } from "./pages/CourseDetail";
import { CategoryDetail } from "./pages/CategoryDetail";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { MainLayout } from "./layouts/MainLayout";
import { UserRole } from "./config/roles";
import { useModalStore } from "./store/useModalStore";

// Component to reset scroll position to top on route change
const ScrollToTop: React.FC = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, [pathname, search]);

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
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/categories/:id" element={<CategoryDetail />} />

            {/* Redirects from old page routes to home + modal trigger */}
            <Route path="/login" element={<RedirectToHomeAndOpenModal modalType="login" />} />
            <Route path="/register" element={<RedirectToHomeAndOpenModal modalType="register" />} />
            <Route path="/forgot-password" element={<RedirectToHomeAndOpenModal modalType="forgotPassword" />} />
            {/* If they navigate directly to verify/reset password, redirect to home */}
            <Route path="/verify-otp" element={<Navigate to="/" replace />} />
            <Route path="/reset-password" element={<Navigate to="/" replace />} />

            {/* Protected Routes (Authenticated users: Admin, Student, etc.) */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN, UserRole.TEACHER, UserRole.TA, UserRole.HR]} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/activity-log" element={<ActivityLog />} />
            </Route>

            {/* Admin only routes */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/roles" element={<RoleManagement />} />
              <Route path="/admin/permissions" element={<PermissionManagement />} />
              <Route path="/admin/courses" element={<CourseManagement />} />
            </Route>
          </Route>

          {/* Fallback for invalid paths */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
