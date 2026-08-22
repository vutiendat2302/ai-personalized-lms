import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { authApi } from "@/api/auths/authApi";
import { CheckCircle2, ShieldAlert, KeyRound, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { useModalStore } from "@/store/useModalStore";

export const SetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const { openLogin } = useModalStore();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Password Strength Checklist
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasNoVietnamese = !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(password);
  const isMatch = password.length > 0 && password === confirmPassword;

  const isFormValid = hasMinLength && hasUppercase && hasLowercase && hasDigit && hasNoVietnamese && isMatch && token.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Mã token không hợp lệ hoặc bị thiếu. Vui lòng kiểm tra lại liên kết trong email.");
      return;
    }

    if (!isMatch) {
      setError("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.setPassword({
        token,
        password,
        confirmPassword,
      });

      if (res.data.success || res.status === 200) {
        setSuccess(true);
      } else {
        setError(res.data.message || "Thiết lập mật khẩu thất bại.");
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.message ||
        err.response?.data?.message ||
        "Liên kết thiết lập mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ Admin để nhận thư mời mới."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate("/");
    openLogin();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md p-8 bg-card backdrop-blur-md rounded-2xl shadow-2xl border border-border/40 transition-all duration-300 relative">
        
        {/* Header Back Button */}
        <div className="mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Về Trang chủ
          </Link>
        </div>

        {/* Header Title */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-1 shadow-inner">
            <KeyRound className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Kích Hoạt & Thiết Lập Mật Khẩu</h2>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Vui lòng tạo mật khẩu mới để bắt đầu tham gia và sử dụng hệ thống LMS.
          </p>
        </div>

        {!token && !success && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400 text-xs text-center flex items-center justify-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Không tìm thấy Token kích hoạt trên đường dẫn URL. Vui lòng sử dụng đúng liên kết từ Email.</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs flex items-center gap-2 animate-in fade-in-50">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center space-y-5 py-4 animate-in fade-in-50 zoom-in-95">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Kích Hoạt Tài Khoản Thành Công!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Mật khẩu của bạn đã được lưu an toàn. Bạn có thể đăng nhập ngay bây giờ.
              </p>
            </div>
            <button
              onClick={handleGoToLogin}
              className="w-full py-2.5 px-4 rounded-xl shadow-lg text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/95 transition duration-200"
            >
              Đăng nhập ngay
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* New Password Input */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                Mật khẩu mới <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => {
                    // Strip Vietnamese characters on input
                    const val = e.target.value.replace(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g, "");
                    setPassword(val);
                  }}
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full pl-3 pr-10 py-2 border border-input rounded-xl text-xs bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                Xác nhận mật khẩu <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g, "");
                    setConfirmPassword(val);
                  }}
                  placeholder="Nhập lại mật khẩu..."
                  className="w-full pl-3 pr-10 py-2 border border-input rounded-xl text-xs bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirement Criteria Checklist */}
            <div className="p-3 bg-muted/30 border border-border/40 rounded-xl space-y-1.5 text-[11px]">
              <span className="font-semibold text-muted-foreground block mb-1">Yêu cầu độ bảo mật:</span>
              <div className="grid grid-cols-2 gap-1.5">
                <span className={`flex items-center gap-1 font-medium ${hasMinLength ? "text-emerald-600" : "text-muted-foreground"}`}>
                  <CheckCircle2 className={`h-3 w-3 ${hasMinLength ? "opacity-100" : "opacity-30"}`} /> Ít nhất 6 ký tự
                </span>
                <span className={`flex items-center gap-1 font-medium ${hasUppercase ? "text-emerald-600" : "text-muted-foreground"}`}>
                  <CheckCircle2 className={`h-3 w-3 ${hasUppercase ? "opacity-100" : "opacity-30"}`} /> 1 chữ in hoa (A-Z)
                </span>
                <span className={`flex items-center gap-1 font-medium ${hasLowercase ? "text-emerald-600" : "text-muted-foreground"}`}>
                  <CheckCircle2 className={`h-3 w-3 ${hasLowercase ? "opacity-100" : "opacity-30"}`} /> 1 chữ thường (a-z)
                </span>
                <span className={`flex items-center gap-1 font-medium ${hasDigit ? "text-emerald-600" : "text-muted-foreground"}`}>
                  <CheckCircle2 className={`h-3 w-3 ${hasDigit ? "opacity-100" : "opacity-30"}`} /> 1 chữ số (0-9)
                </span>
                <span className={`flex items-center gap-1 font-medium col-span-2 ${hasNoVietnamese ? "text-emerald-600" : "text-destructive"}`}>
                  <CheckCircle2 className={`h-3 w-3 ${hasNoVietnamese ? "opacity-100" : "opacity-30"}`} /> Không chứa ký tự có dấu tiếng Việt
                </span>
              </div>
              {password.length > 0 && (
                <div className="pt-1 border-t border-border/30 mt-1">
                  <span className={`flex items-center gap-1 font-medium ${isMatch ? "text-emerald-600" : "text-destructive"}`}>
                    <CheckCircle2 className={`h-3 w-3 ${isMatch ? "opacity-100" : "opacity-30"}`} />
                    {isMatch ? "Mật khẩu xác nhận trùng khớp" : "Mật khẩu xác nhận chưa khớp"}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl shadow-lg text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Đang thiết lập...</span>
                </>
              ) : (
                "Xác nhận & Kích hoạt tài khoản"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
