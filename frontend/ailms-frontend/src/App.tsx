import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./hooks/AuthProvider";
import { useAuth } from "./hooks/useAuth";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import { SelectWorkspace } from "./pages/SelectWorkspace";
import { NoWorkspacePage } from "./pages/NoWorkspacePage";
import ContractSigningPage from "./pages/public/ContractSigningPage";

import { UserManagement } from "./pages/admin/UserManagement";
import { StudentManagement } from "./pages/admin/StudentManagement";
import { EmployeeManagement } from "./pages/admin/EmployeeManagement";
import { RoleManagement } from "./pages/admin/RoleManagement";
import { PermissionManagement } from "./pages/admin/PermissionManagement";
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
import { OnlineScheduleManagement } from "./pages/admin/OnlineScheduleManagement";
import { WorkScheduleManagement } from "./pages/admin/WorkScheduleManagement";
import { AttendanceManagement } from "./pages/admin/AttendanceManagement";
import { SalaryManagement } from "./pages/admin/SalaryManagement";
import { FileManagement } from "./pages/admin/FileManagement";
import { ReviewModerationPage } from "./pages/admin/ReviewModerationPage";
import { CourseApprovalPage } from "./pages/admin/CourseApprovalPage";
import { CourseCatalogPage } from "./pages/admin/courses/CourseCatalogPage";
import { CourseAdminDetailPage } from "./pages/admin/courses/CourseAdminDetailPage";
import { ClassManagementPage } from "./pages/admin/classes/ClassManagementPage";
import { CreateGroupClassPage } from "./pages/admin/classes/CreateGroupClassPage";
import { ClassDetailPage } from "./pages/admin/classes/ClassDetailPage";
import { ClassSessionManagementPage } from "./pages/admin/ClassSessionManagementPage";
import { TeacherMatchingRequestPage } from "./pages/admin/requests/TeacherMatchingRequestPage";

// Sales & Revenue Module Pages
import { SalesDashboardPage } from "./pages/admin/sales/SalesDashboardPage";
import { SalesOrderListPage } from "./pages/admin/sales/SalesOrderListPage";
import { SalesOrderDetailPage } from "./pages/admin/sales/SalesOrderDetailPage";
import { SalesPaymentListPage } from "./pages/admin/sales/SalesPaymentListPage";
import { SalesPaymentDetailPage } from "./pages/admin/sales/SalesPaymentDetailPage";
import { SalesCouponListPage } from "./pages/admin/sales/SalesCouponListPage";
import { SalesCouponFormPage } from "./pages/admin/sales/SalesCouponFormPage";
import { SalesCoursePackageListPage } from "./pages/admin/sales/SalesCoursePackageListPage";
import { SalesCoursePackageFormPage } from "./pages/admin/sales/SalesCoursePackageFormPage";
import { SalesEnrollmentListPage } from "./pages/admin/sales/SalesEnrollmentListPage";
import { SalesEnrollmentDetailPage } from "./pages/admin/sales/SalesEnrollmentDetailPage";
import { SalesCartListPage } from "./pages/admin/sales/SalesCartListPage";

import { TeacherDashboardPage } from "./pages/teacher/TeacherDashboardPage";
import { TeacherClassesPage } from "./pages/teacher/TeacherClassesPage";
import { TeacherSchedulePage } from "./pages/teacher/TeacherSchedulePage";
import { TeacherCoursesPage } from "./pages/teacher/TeacherCoursesPage";
import { TeacherCourseDetailPage } from "./pages/teacher/courses/TeacherCourseDetailPage";
import { TeacherSuggestedClassesPage } from "./pages/teacher/TeacherSuggestedClassesPage";
import { TeacherGradingAssignmentsPage } from "./pages/teacher/TeacherGradingAssignmentsPage";
import { TeacherGradingQuizzesPage } from "./pages/teacher/TeacherGradingQuizzesPage";
import { TeacherAttendancePage } from "./pages/teacher/TeacherAttendancePage";
import { TeacherInsightsPage } from "./pages/teacher/TeacherInsightsPage";
import { TeacherEarningsPage } from "./pages/teacher/TeacherEarningsPage";
import { TeacherLeaveRequestsPage } from "./pages/teacher/TeacherLeaveRequestsPage";
import { CourseBuilderShell } from "./pages/teacher/courses/CourseBuilderShell";
import { CourseGradingPage } from "./pages/teacher/courses/CourseGradingPage";
import { StudentLearningPage } from "./pages/student/StudentLearningPage";

// Student Portal Pages
import { StudentDashboardPage } from "./pages/student/StudentDashboardPage";
import { StudentMyCoursesPage } from "./pages/student/StudentMyCoursesPage";
import { StudentSchedulePage } from "./pages/student/StudentSchedulePage";
import { StudentAssignmentsPage } from "./pages/student/StudentAssignmentsPage";
import { StudentCertificatesPage } from "./pages/student/StudentCertificatesPage";
import { StudentProgressPage } from "./pages/student/StudentProgressPage";
import { StudentGoalsPage } from "./pages/student/StudentGoalsPage";
import { StudentCatalogPage } from "./pages/student/StudentCatalogPage";
import { StudentCartPage } from "./pages/student/StudentCartPage";
import { StudentOrdersPage } from "./pages/student/StudentOrdersPage";
import { StudentVouchersPage } from "./pages/student/StudentVouchersPage";

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

import { ToastProvider } from "./hooks/useToast";

function App() {
  return (
    <Router>
      <ScrollToTop />
      <ToastProvider>
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
            <Route path="/contracts/sign/:token" element={<ContractSigningPage />} />

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
                <Route path="/admin/courses" element={<CourseCatalogPage />} />
                <Route path="/admin/courses/:id" element={<CourseAdminDetailPage />} />
                <Route path="/admin/classrooms" element={<ClassManagementPage />} />
                <Route path="/admin/classes" element={<ClassManagementPage />} />
                <Route path="/admin/sessions" element={<ClassSessionManagementPage />} />
                <Route path="/admin/classes/create" element={<CreateGroupClassPage />} />
                <Route path="/admin/classes/:id" element={<ClassDetailPage />} />
                <Route path="/admin/pending-requests" element={<ApprovalCenterPage />} />
                <Route path="/admin/pending-requests/matching/:id" element={<TeacherMatchingRequestPage />} />
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
                <Route path="/admin/online-schedule" element={<OnlineScheduleManagement />} />
                <Route path="/admin/work-schedule" element={<WorkScheduleManagement />} />
                <Route path="/admin/fulltime-attendance" element={<AttendanceManagement />} />
                <Route path="/admin/attendance" element={<AttendanceManagement />} />
                <Route path="/admin/salaries" element={<SalaryManagement />} />
                <Route path="/admin/salary-payroll" element={<SalaryManagement />} />
                <Route path="/admin/files" element={<FileManagement />} />
                <Route path="/admin/reviews/moderation" element={<ReviewModerationPage />} />
                <Route path="/admin/courses/approvals" element={<CourseApprovalPage />} />
                <Route path="/analytics" element={<LearningAnalytics />} />

                {/* SALES & REVENUE MANAGEMENT MODULE */}
                <Route path="/sales" element={<Navigate to="/sales/dashboard" replace />} />
                <Route path="/sales/dashboard" element={<SalesDashboardPage />} />
                <Route path="/sales/orders" element={<SalesOrderListPage />} />
                <Route path="/sales/orders/:id" element={<SalesOrderDetailPage />} />
                <Route path="/sales/payments" element={<SalesPaymentListPage />} />
                <Route path="/sales/payments/:id" element={<SalesPaymentDetailPage />} />
                <Route path="/sales/coupons" element={<SalesCouponListPage />} />
                <Route path="/sales/coupons/new" element={<SalesCouponFormPage />} />
                <Route path="/sales/coupons/:id" element={<SalesCouponFormPage />} />
                <Route path="/sales/course-packages" element={<SalesCoursePackageListPage />} />
                <Route path="/sales/course-packages/new" element={<SalesCoursePackageFormPage />} />
                <Route path="/sales/course-packages/:id" element={<SalesCoursePackageFormPage />} />
                <Route path="/sales/enrollments" element={<SalesEnrollmentListPage />} />
                <Route path="/sales/enrollments/:id" element={<SalesEnrollmentDetailPage />} />
                <Route path="/sales/carts" element={<SalesCartListPage />} />
              </Route>
            </Route>

            {/* 2. TEACHER PORTAL (TEACHER, TA & ADMIN) */}
            <Route element={<ProtectedRoute requiredPortal="TEACHER" allowedRoles={[UserRole.ADMIN, UserRole.TEACHER, UserRole.TA]} />}>
              <Route element={<TeacherLayout />}>
                <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
                <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
                <Route path="/teacher/classes" element={<TeacherClassesPage />} />
                <Route path="/teacher/classes/:id" element={<TeacherClassesPage />} />
                <Route path="/teacher/schedule" element={<TeacherSchedulePage />} />
                <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
                <Route path="/teacher/courses/:id" element={<TeacherCourseDetailPage />} />
                <Route path="/teacher/courses/:id/edit" element={<TeacherCoursesPage />} />
                <Route path="/teacher/suggested-classes" element={<TeacherSuggestedClassesPage />} />
                <Route path="/teacher/grading/assignments" element={<TeacherGradingAssignmentsPage />} />
                <Route path="/teacher/grading/quizzes" element={<TeacherGradingQuizzesPage />} />
                <Route path="/teacher/attendance" element={<TeacherAttendancePage />} />
                <Route path="/teacher/insights" element={<TeacherInsightsPage />} />
                <Route path="/teacher/earnings" element={<TeacherEarningsPage />} />
                <Route path="/teacher/leave-requests" element={<TeacherLeaveRequestsPage />} />
                <Route path="/teacher/courses/:id/builder" element={<CourseBuilderShell />} />
                <Route path="/teacher/courses/:id/submissions" element={<CourseGradingPage />} />
              </Route>
            </Route>

            {/* Course Builder for Admin */}
            <Route element={<ProtectedRoute requiredPortal="MANAGEMENT" allowedRoles={[UserRole.ADMIN]} />}>
              <Route path="/admin/courses/:id/builder" element={<CourseBuilderShell />} />
            </Route>

            {/* Student Learning Experience Fullscreen Page */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.STUDENT, UserRole.TEACHER]} />}>
              <Route path="/learn/courses/:courseId" element={<StudentLearningPage />} />
              <Route path="/learn/courses/:courseId/lessons/:lessonId" element={<StudentLearningPage />} />
            </Route>

            {/* 3. STUDENT PORTAL (STUDENT & ADMIN) */}
            <Route element={<ProtectedRoute requiredPortal="STUDENT" allowedRoles={[UserRole.ADMIN, UserRole.STUDENT]} />}>
              <Route element={<StudentLayout />}>
                <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
                <Route path="/student/dashboard" element={<StudentDashboardPage />} />
                <Route path="/student/courses" element={<StudentMyCoursesPage />} />
                <Route path="/student/courses/:id" element={<StudentMyCoursesPage />} />
                <Route path="/student/schedule" element={<StudentSchedulePage />} />
                <Route path="/student/assignments" element={<StudentAssignmentsPage />} />
                <Route path="/student/quizzes/:id/attempt" element={<StudentAssignmentsPage />} />
                <Route path="/student/certificates" element={<StudentCertificatesPage />} />
                <Route path="/student/progress" element={<StudentProgressPage />} />
                <Route path="/student/goals" element={<StudentGoalsPage />} />
                <Route path="/student/catalog" element={<StudentCatalogPage />} />
                <Route path="/student/catalog/:id" element={<StudentCatalogPage />} />
                <Route path="/student/cart" element={<StudentCartPage />} />
                <Route path="/student/vouchers" element={<StudentVouchersPage />} />
                <Route path="/student/orders" element={<StudentOrdersPage />} />
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
    </ToastProvider>
  </Router>
  );
}

export default App;
