import React, { useState, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { authService } from "@/services/authService";
import { Lock, ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getEmailFromParams = () => {
    if (location.state && (location.state as any).email) {
      return (location.state as any).email;
    }
    const params = new URLSearchParams(location.search);
    return params.get("email") || "";
  };

  const [usernameOrEmail, setUsernameOrEmail] = useState(getEmailFromParams());
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    const value = element.value;
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      const newOtp = [...otp];
      if (!otp[index] && index > 0) {
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const otpCode = otp.join("");
    if (otpCode.length < 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    if (!usernameOrEmail) {
      setError("Username or Email is required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({
        usernameOrEmail,
        otp: otpCode,
        newPassword,
        confirmPassword,
      });

      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message ||
        (err.response?.data?.message) ||
        "Failed to reset password. Please check your OTP and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 transition-all duration-300">
        
        <div className="mb-6">
          <Link 
            to="/forgot-password" 
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Forgot Password
          </Link>
        </div>

        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 mb-2">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Set New Password</h2>
          <p className="text-sm text-gray-600 max-w-sm mx-auto">
            Please enter the verification code sent to your email, along with your new password.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-sm text-center flex items-center justify-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded text-green-700 text-sm flex items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Username or Email
            </label>
            <input
              type="text"
              required
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="Enter your username or email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition-all outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 text-center">
              6-digit Reset OTP Code
            </label>
            <div className="flex justify-between gap-2 max-w-xs mx-auto" onPaste={handlePaste}>
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="text"
                  name="otp"
                  maxLength={1}
                  value={data}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  onChange={(e) => handleChange(e.target, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-12 h-12 text-center text-xl font-bold border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  required
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition-all outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || otp.join("").length < 6}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {loading ? "Resetting Password..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
};
