import React, { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { useModalStore } from "@/store/useModalStore";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Key,
  Mail,
  User,
  Phone,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Vui lòng nhập tài khoản hoặc email"),
  password: z.string().min(6, "Mật khẩu phải chứa ít nhất 6 ký tự"),
});

const forgotPasswordSchema = z.object({
  usernameOrEmail: z.string().min(1, "Vui lòng nhập tài khoản hoặc email"),
});

const verifyOtpSchema = z.object({
  otp: z.string().length(6, "Mã OTP phải có đúng 6 chữ số"),
});

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Mật khẩu mới phải chứa ít nhất 6 ký tự"),
    confirmPassword: z.string().min(6, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(6, "Mật khẩu cũ phải chứa ít nhất 6 ký tự"),
    newPassword: z.string().min(6, "Mật khẩu mới phải chứa ít nhất 6 ký tự"),
    confirmPassword: z.string().min(6, "Vui lòng xác nhận mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

const registerSchema = z
  .object({
    username: z.string().min(3, "Tên tài khoản phải chứa ít nhất 3 ký tự"),
    password: z.string().min(6, "Mật khẩu phải chứa ít nhất 6 ký tự"),
    confirmPassword: z.string().min(6, "Vui lòng xác nhận mật khẩu"),
    email: z.string().email("Định dạng email không hợp lệ"),
    phone: z.string().regex(/^\d{10,11}$/, "Số điện thoại phải có 10-11 chữ số"),
    fullName: z.string().min(2, "Họ và tên phải chứa ít nhất 2 ký tự"),
    gender: z.string(),
    dateOfBirth: z.string().min(1, "Vui lòng chọn ngày sinh"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export const AuthModals: React.FC = () => {
  const navigate = useNavigate();
  const {
    isOpenLogin,
    isOpenRegister,
    isOpenForgotPassword,
    isOpenVerifyOtp,
    isOpenResetPassword,
    isOpenChangePassword,
    emailForOtp,
    otpCode,
    openLogin,
    openRegister,
    openForgotPassword,
    openVerifyOtp,
    openResetPassword,
    closeAll,
  } = useModalStore();

  const { login: authLogin } = useAuth();

  // Loading & state management
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [is18, setIs18] = useState(true);

  // Forms Initialization
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { usernameOrEmail: "", password: "" },
  });

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { usernameOrEmail: "" },
  });

  const verifyOtpForm = useForm<z.infer<typeof verifyOtpSchema>>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { otp: "" },
  });

  const resetPasswordForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const changePasswordForm = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      phone: "",
      fullName: "",
      gender: "0",
      dateOfBirth: "",
    },
  });

  // ==========================================
  // HANDLERS
  // ==========================================

  const onLoginSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      setLoading(true);
      setErrorMsg("");
      await authLogin(data.usernameOrEmail, data.password);
      closeAll();
      loginForm.reset();
      navigate("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Tên đăng nhập hoặc mật khẩu không chính xác.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPasswordSubmit = async (data: z.infer<typeof forgotPasswordSchema>) => {
    try {
      setLoading(true);
      setErrorMsg("");
      await authService.forgotPassword({ usernameOrEmail: data.usernameOrEmail });
      setSuccessMsg("Mã OTP khôi phục đã được gửi tới email của bạn!");
      setTimeout(() => {
        setSuccessMsg("");
        openVerifyOtp(data.usernameOrEmail);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Yêu cầu khôi phục thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtpSubmit = async (data: z.infer<typeof verifyOtpSchema>) => {
    try {
      setLoading(true);
      setErrorMsg("");
      await authService.verifyOtp({
        email: emailForOtp,
        otp: data.otp,
      });
      setSuccessMsg("Xác thực OTP thành công!");
      setTimeout(() => {
        setSuccessMsg("");
        openResetPassword(emailForOtp, data.otp);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Mã OTP không chính xác hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  const onResetPasswordSubmit = async (data: z.infer<typeof resetPasswordSchema>) => {
    try {
      setLoading(true);
      setErrorMsg("");
      await authService.resetPassword({
        usernameOrEmail: emailForOtp,
        otp: otpCode,
        newPassword: data.password,
        confirmPassword: data.confirmPassword,
      });
      setSuccessMsg("Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.");
      setTimeout(() => {
        setSuccessMsg("");
        openLogin();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể đặt lại mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  const onChangePasswordSubmit = async (data: z.infer<typeof changePasswordSchema>) => {
    try {
      setLoading(true);
      setErrorMsg("");
      await authService.changePassword({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      setSuccessMsg("Đổi mật khẩu thành công!");
      setTimeout(() => {
        setSuccessMsg("");
        closeAll();
        changePasswordForm.reset();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Mật khẩu cũ không chính xác hoặc đổi mật khẩu thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const onRegisterSubmit = async (data: z.infer<typeof registerSchema>) => {
    try {
      setLoading(true);
      setErrorMsg("");

      const regPayload = {
        username: data.username,
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        gender: parseInt(data.gender),
      };

      await authService.register(regPayload);

      // Save extra details in local storage for profile page hydration
      const extraProfile = {
        username: data.username,
        email: data.email,
        fullname: data.fullName,
        phone: data.phone,
        gender: parseInt(data.gender),
        dateOfBirth: data.dateOfBirth,
        avatarUrl: null,
        attributes: JSON.stringify({
          guardianName: "",
          guardianPhone: "",
          academicLevel: "Học sinh",
          schoolName: "",
          gradeClass: "",
          learningGoals: "Nâng cao kết quả học tập",
        }),
        status: "ACTIVE",
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("user_profile", JSON.stringify(extraProfile));

      setSuccessMsg("Đăng ký tài khoản thành công! Hãy xác thực email.");
      setTimeout(() => {
        setSuccessMsg("");
        openVerifyOtp(data.email);
        registerForm.reset();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Tên tài khoản hoặc email đã tồn tại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ==========================================
          1. LOGIN DIALOG (Figma aligned)
          ========================================== */}
      <Dialog open={isOpenLogin} onOpenChange={closeAll}>
        <DialogContent className="sm:max-w-md border-border bg-card p-6 shadow-2xl transition-all duration-300">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-foreground tracking-tight text-center">
              Đăng nhập
            </DialogTitle>
            <DialogDescription className="text-base font-light text-center">
              Đăng nhập để vào hệ thống AILMS.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-base text-destructive mt-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-username" className="text-base font-semibold text-foreground">
                Tên tài khoản
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  id="login-username"
                  type="text"
                  placeholder="Nhập tên tài khoản hoặc email"
                  className="pl-10 h-10 text-base md:text-base border-input/70 placeholder:opacity-60 bg-card hover:bg-background focus:bg-card focus-visible:ring-3 focus-visible:ring-primary/20 transition-all"
                  {...loginForm.register("usernameOrEmail")}
                />
              </div>
              {loginForm.formState.errors.usernameOrEmail && (
                <p className="text-sm text-destructive font-medium">
                  {loginForm.formState.errors.usernameOrEmail.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-pass" className="text-base font-semibold text-foreground">
                Mật khẩu
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  id="login-pass"
                  type={showPass ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
                  className="pl-10 pr-10 h-10 text-base md:text-base placeholder:opacity-60 border-input/70 bg-card hover:bg-background focus:bg-card focus-visible:ring-3 focus-visible:ring-primary/20 transition-all"
                  {...loginForm.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-sm text-destructive font-medium">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full h-10 font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/10 mt-2" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>

          <div className="flex flex-col items-center gap-2 mt-4 text-xs">
            <button onClick={openForgotPassword} className="text-sm font-semibold hover:text-primary transition-colors hover:underline">
              Quên mật khẩu ?
            </button>
            <div className="text-sm font-semibold mt-1">
              Bạn chưa có tài khoản?{" "}
              <button onClick={openRegister} className="text-primary text-sm font-semibold hover:underline">
                Đăng ký.
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          2. REGISTER DIALOG (Single screen, 2-column)
          ========================================== */}
      <Dialog open={isOpenRegister} onOpenChange={closeAll}>
        <DialogContent className="sm:max-w-2xl border-border bg-card p-6 shadow-2xl transition-all duration-300">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-foreground tracking-tight text-center">
              Đăng ký
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground text-xs mt-1">
              Nhập các thông tin đăng ký để tham gia hệ thống học tập AILMS.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive mt-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-xs text-green-600 mt-1">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <FormProvider {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Tên tài khoản</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Nhập tên tài khoản"
                        className="pl-10 h-10 text-base md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                        {...registerForm.register("username")}
                      />
                    </div>
                    {registerForm.formState.errors.username && (
                      <p className="text-[10px] text-destructive font-medium">{registerForm.formState.errors.username.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="Nhập mật khẩu"
                        className="pl-10 h-10 text-base md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                        {...registerForm.register("password")}
                      />
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-[10px] text-destructive font-medium">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="nhapemail@gmail.com"
                        className="pl-10 h-10 text-base md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                        {...registerForm.register("email")}
                      />
                    </div>
                    {registerForm.formState.errors.email && (
                      <p className="text-[10px] text-destructive font-medium">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Bạn đã đủ 18 tuổi</Label>
                    <button
                      type="button"
                      onClick={() => setIs18(!is18)}
                      className={`flex h-10 w-full items-center justify-between rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
                        is18
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-input bg-background/50 text-muted-foreground"
                      }`}
                    >
                      <span>{is18 ? "Đã đủ (18+)" : "Dưới 18 tuổi"}</span>
                      <span className="text-[10px] bg-background border px-1.5 py-0.5 rounded text-foreground">Thay đổi</span>
                    </button>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Số điện thoại</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Nhập số điện thoại"
                        className="pl-10 h-10 text-base md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                        {...registerForm.register("phone")}
                      />
                    </div>
                    {registerForm.formState.errors.phone && (
                      <p className="text-[10px] text-destructive font-medium">{registerForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Họ và tên</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Nhập họ và tên"
                        className="pl-10 h-10 text-base md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                        {...registerForm.register("fullName")}
                      />
                    </div>
                    {registerForm.formState.errors.fullName && (
                      <p className="text-[10px] text-destructive font-medium">{registerForm.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Giới tính</Label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-primary/20 outline-none"
                      {...registerForm.register("gender")}
                    >
                      <option value="0">Nam</option>
                      <option value="1">Nữ</option>
                      <option value="2">Khác</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Ngày sinh</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        type="date"
                        className="pl-10 h-10 text-base md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                        {...registerForm.register("dateOfBirth")}
                      />
                    </div>
                    {registerForm.formState.errors.dateOfBirth && (
                      <p className="text-[10px] text-destructive font-medium">{registerForm.formState.errors.dateOfBirth.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Xác nhận mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    className="pl-10 h-10 text-base md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                    {...registerForm.register("confirmPassword")}
                  />
                </div>
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-[10px] text-destructive font-medium">{registerForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-10 font-bold bg-primary hover:bg-primary/95 text-primary-foreground mt-4 shadow-lg shadow-primary/10"
                disabled={loading}
              >
                {loading ? "Đang đăng ký..." : "Đăng ký"}
              </Button>
            </form>
          </FormProvider>

          <div className="text-center text-xs mt-4 text-muted-foreground border-t border-border pt-4">
            Bạn đã có tài khoản?{" "}
            <button onClick={openLogin} className="text-primary font-bold hover:underline">
              Đăng nhập.
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          3. FORGOT PASSWORD DIALOG
          ========================================== */}
      <Dialog open={isOpenForgotPassword} onOpenChange={closeAll}>
        <DialogContent className="sm:max-w-md border-border bg-card p-6 shadow-2xl transition-all duration-300">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-foreground tracking-tight text-center">
              Quên mật khẩu
            </DialogTitle>
            <DialogDescription className="hidden">
              Nhập tên tài khoản để lấy lại mật khẩu.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive mt-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-xs text-green-600 mt-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form
            onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)}
            className="space-y-4 mt-4"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Tên tài khoản</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Nhập tên tài khoản hoặc email"
                  className="pl-10 h-10 text-base md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                  {...forgotPasswordForm.register("usernameOrEmail")}
                />
              </div>
              {forgotPasswordForm.formState.errors.usernameOrEmail && (
                <p className="text-[10px] text-destructive font-medium">
                  {forgotPasswordForm.formState.errors.usernameOrEmail.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/10 mt-2"
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Tiếp tục"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          4. VERIFY OTP DIALOG
          ========================================== */}
      <Dialog open={isOpenVerifyOtp} onOpenChange={closeAll}>
        <DialogContent className="sm:max-w-md border-border bg-card p-6 shadow-2xl transition-all duration-300">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-foreground tracking-tight text-center">
              Xác thực tài khoản
            </DialogTitle>
            <DialogDescription className="hidden">
              Nhập mã OTP để xác nhận tài khoản.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive mt-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-xs text-green-600 mt-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={verifyOtpForm.handleSubmit(onVerifyOtpSubmit)} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground text-center block">
                Nhập mã OTP đã gửi đến email của bạn
              </Label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  className="pl-10 h-10 text-center tracking-widest text-lg font-bold border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                  {...verifyOtpForm.register("otp")}
                />
              </div>
              {verifyOtpForm.formState.errors.otp && (
                <p className="text-[10px] text-destructive font-medium text-center">
                  {verifyOtpForm.formState.errors.otp.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/10 mt-2"
              disabled={loading}
            >
              {loading ? "Đang xác thực..." : "Tiếp tục"}
            </Button>
          </form>

          <div className="text-center text-xs mt-4 text-muted-foreground">
            Không nhận được mã?{" "}
            <button
              onClick={async () => {
                try {
                  setErrorMsg("");
                  await authService.resendOtp(emailForOtp);
                  setSuccessMsg("Đã gửi lại mã OTP!");
                  setTimeout(() => setSuccessMsg(""), 2000);
                } catch (e: any) {
                  setErrorMsg(e.message || "Gửi lại OTP thất bại.");
                }
              }}
              className="text-primary font-bold hover:underline"
            >
              Gửi lại
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          5. RESET PASSWORD DIALOG
          ========================================== */}
      <Dialog open={isOpenResetPassword} onOpenChange={closeAll}>
        <DialogContent className="sm:max-w-md border-border bg-card p-6 shadow-2xl transition-all duration-300">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-foreground tracking-tight text-center">
              Nhập mật khẩu mới
            </DialogTitle>
            <DialogDescription className="hidden">
              Thiết lập lại mật khẩu cho tài khoản của bạn.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive mt-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-xs text-green-600 mt-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form
            onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)}
            className="space-y-4 mt-4"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-10 text-base md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                  {...resetPasswordForm.register("password")}
                />
              </div>
              {resetPasswordForm.formState.errors.password && (
                <p className="text-[10px] text-destructive font-medium">
                  {resetPasswordForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Xác nhận lại mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-10 text-base md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                  {...resetPasswordForm.register("confirmPassword")}
                />
              </div>
              {resetPasswordForm.formState.errors.confirmPassword && (
                <p className="text-[10px] text-destructive font-medium">
                  {resetPasswordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/10 mt-2"
              disabled={loading}
            >
              {loading ? "Đang lưu..." : "Xác nhận"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          6. CHANGE PASSWORD DIALOG
          ========================================== */}
      <Dialog open={isOpenChangePassword} onOpenChange={closeAll}>
        <DialogContent className="sm:max-w-md border-border bg-card p-6 shadow-2xl transition-all duration-300">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-foreground tracking-tight text-center">
              Đổi mật khẩu
            </DialogTitle>
            <DialogDescription className="hidden">
              Nhập mật khẩu cũ và thiết lập mật khẩu mới cho tài khoản của bạn.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive mt-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-xs text-green-600 mt-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form
            onSubmit={changePasswordForm.handleSubmit(onChangePasswordSubmit)}
            className="space-y-4 mt-4"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Mật khẩu cũ</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-10 text-base md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                  {...changePasswordForm.register("oldPassword")}
                />
              </div>
              {changePasswordForm.formState.errors.oldPassword && (
                <p className="text-[10px] text-destructive font-medium">
                  {changePasswordForm.formState.errors.oldPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-10 text-base md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                  {...changePasswordForm.register("newPassword")}
                />
              </div>
              {changePasswordForm.formState.errors.newPassword && (
                <p className="text-[10px] text-destructive font-medium">
                  {changePasswordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Xác nhận lại mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-10 text-base md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                  {...changePasswordForm.register("confirmPassword")}
                />
              </div>
              {changePasswordForm.formState.errors.confirmPassword && (
                <p className="text-[10px] text-destructive font-medium">
                  {changePasswordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/10 mt-2"
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
