import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { authService } from "@/services/authService";
import { Mail, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";

export const VerifyOtp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Try to retrieve email from navigation state or query parameters
  const getEmailFromParams = () => {
    if (location.state && (location.state as any).email) {
      return (location.state as any).email;
    }
    const params = new URLSearchParams(location.search);
    return params.get("email") || "";
  };

  const [email, setEmail] = useState(getEmailFromParams());
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Count down for resending OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // If email is not passed, and state changes, update email
  useEffect(() => {
    const currentEmail = getEmailFromParams();
    if (currentEmail && currentEmail !== email) {
      setEmail(currentEmail);
    }
  }, [location]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    const value = element.value;
    if (isNaN(Number(value))) return; // Allow only numbers

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1); // Get last typed character
    setOtp(newOtp);

    // Focus next input if a digit is typed
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      const newOtp = [...otp];
      
      // If current is empty, focus and clear previous
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

    if (!email) {
      setError("Email address is required.");
      return;
    }

    setLoading(true);
    try {
      await authService.verifyOtp({ email, otp: otpCode });
      setSuccess("Account verified successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || 
        (err.response?.data?.message) || 
        "Verification failed. Please check the code and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !email) return;
    
    setError("");
    setSuccess("");
    setResending(true);
    
    try {
      await authService.resendOtp(email);
      setSuccess("A new OTP code has been sent to your email.");
      setCountdown(60);
      setCanResend(false);
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || 
        (err.response?.data?.message) || 
        "Failed to resend OTP. Please try again later."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 transition-all duration-300">
        
        <div className="mb-6">
          <Link 
            to="/register" 
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Register
          </Link>
        </div>

        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 mb-2">
            <Mail className="h-8 w-8 animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Verify Your Email</h2>
          <p className="text-sm text-gray-600 max-w-sm mx-auto">
            We have sent a verification code to your email:
          </p>
          {email ? (
            <p className="font-semibold text-indigo-600 break-all">{email}</p>
          ) : (
            <div className="mt-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-sm text-center">
            {error}
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
            <label className="block text-sm font-medium text-gray-700 text-center">
              Enter 6-digit Verification Code
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

          <button
            type="submit"
            disabled={loading || otp.join("").length < 6}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {loading ? "Verifying..." : "Verify Account"}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-500">
            Didn't receive the email?
          </p>
          <button
            type="button"
            disabled={!canResend || resending || !email}
            onClick={handleResend}
            className="mt-2 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {resending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {canResend ? "Resend OTP Code" : `Resend in ${countdown}s`}
          </button>
        </div>
      </div>
    </div>
  );
};
