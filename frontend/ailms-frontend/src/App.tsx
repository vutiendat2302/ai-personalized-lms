import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/AuthProvider";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Landing } from "./pages/Landing";
import { ForgotPassword } from "./pages/ForgotPassword";
import { VerifyOtp } from "./pages/VerifyOtp";
import { ResetPassword } from "./pages/ResetPassword";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  return (
    // Router quản lý điều hướng và URL của ứng dụng
    <Router>
      {/* Cung cấp trạng thái xác thực (user, token, login, logout)
          cho toàn bộ các route bên trong */}
      <AuthProvider>
          <Routes>
             {/* Public Routes - không yêu cầu đăng nhập */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
             {/* Protected Routes - yêu cầu người dùng đã xác thực */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Add more protected routes here */}
            </Route>

            {/* Chuyển hướng các URL không hợp lệ về trang chủ */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
