import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const { auth, login } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (auth.accessToken) {
      navigate("/dashboard");
    }
  }, [auth.accessToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, pass);
    } catch (err: any) {
      const msg = err?.message || err?.error || "";
      if (msg.toLowerCase().includes("khóa") || msg.toLowerCase().includes("locked") || msg.toLowerCase().includes("kích hoạt")) {
        setError("Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt. Vui lòng liên hệ quản trị viên.");
      } else if (msg.toLowerCase().includes("password") || msg.toLowerCase().includes("credentials") || msg.toLowerCase().includes("sai")) {
        setError("Tên đăng nhập hoặc mật khẩu không đúng.");
      } else if (msg) {
        setError(msg);
      } else {
        setError("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      }
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-md">
        <div>
          <Link to="/" className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 mb-6 transition duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại trang chủ
          </Link>
          <h2 className="text-3xl font-extrabold text-center text-gray-900">Sign in to your account</h2>
        </div>
        {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label className="block text-base font-medium text-gray-700">Username or Email</label>
              <input 
                type="text" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input 
                type="password" 
                required 
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
              />
              <div className="mt-2 text-right">
                <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                  Forgot your password?
                </Link>
              </div>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign in
          </button>
          <div className="text-sm text-center">
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Don't have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
