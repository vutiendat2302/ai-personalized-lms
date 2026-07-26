import React, { useState, useEffect, useRef } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

const parseYYYYMMDD = (str: string) => {
  if (!str) return undefined;
  const parts = str.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return undefined;
};

const parseDDMMYYYYToYYYYMMDD = (str: string) => {
  const parts = str.split("/");
  if (parts.length === 3) {
    const d = parts[0];
    const m = parts[1];
    const y = parts[2];
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      const day = parseInt(d, 10);
      const month = parseInt(m, 10);
      const year = parseInt(y, 10);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return `${y}-${m}-${d}`;
      }
    }
  }
  return "";
};

const getErrorMessage = (err: any, defaultMsg: string): string => {
  if (!err) return defaultMsg;
  if (err.errors) {
    if (typeof err.errors === "object") {
      const values = Object.values(err.errors);
      if (values.length > 0 && typeof values[0] === "string") {
        return values[0];
      }
    }
    if (Array.isArray(err.errors) && err.errors.length > 0) {
      const firstErr = err.errors[0];
      if (typeof firstErr === "string") return firstErr;
      if (firstErr && typeof firstErr === "object" && firstErr.message) {
        return firstErr.message;
      }
    }
  }
  return err.message || defaultMsg;
};
import {
  Mail,
  User,
  Phone,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2
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
    gender: z.string().min(1, "Vui lòng chọn giới tính"),
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
    otpFlow,
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
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirmPass, setShowRegConfirmPass] = useState(false);
  const [showResetPass, setShowResetPass] = useState(false);
  const [showResetConfirmPass, setShowResetConfirmPass] = useState(false);
  const [showChangeOldPass, setShowChangeOldPass] = useState(false);
  const [showChangeNewPass, setShowChangeNewPass] = useState(false);
  const [showChangeConfirmPass, setShowChangeConfirmPass] = useState(false);
  const [genderVal, setGenderVal] = useState("");
  const [dateInputVal, setDateInputVal] = useState("");
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpenVerifyOtp) {
      setOtpValues(Array(6).fill(""));
      verifyOtpForm.setValue("otp", "");
    }
  }, [isOpenVerifyOtp]);

  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, "").slice(-1);
    const newOtpValues = [...otpValues];
    newOtpValues[index] = cleanVal;
    setOtpValues(newOtpValues);
    
    const combined = newOtpValues.join("");
    // Only run validation if the user has typed exactly 6 digits, avoiding showing error during typing
    verifyOtpForm.setValue("otp", combined, { shouldValidate: combined.length === 6 });

    if (cleanVal && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpValues[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
        const newOtpValues = [...otpValues];
        newOtpValues[index - 1] = "";
        setOtpValues(newOtpValues);
        verifyOtpForm.setValue("otp", newOtpValues.join(""), { shouldValidate: false });
      } else if (otpValues[index]) {
        const newOtpValues = [...otpValues];
        newOtpValues[index] = "";
        setOtpValues(newOtpValues);
        verifyOtpForm.setValue("otp", newOtpValues.join(""), { shouldValidate: false });
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      const newOtpValues = pastedData.split("");
      setOtpValues(newOtpValues);
      verifyOtpForm.setValue("otp", pastedData, { shouldValidate: true });
      otpRefs.current[5]?.focus();
    }
  };

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
      gender: "",
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
      setErrorMsg(getErrorMessage(err, "Tên đăng nhập hoặc mật khẩu không chính xác."));
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
        openVerifyOtp(data.usernameOrEmail, "forgot");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err, "Yêu cầu khôi phục thất bại."));
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtpSubmit = async (data: z.infer<typeof verifyOtpSchema>) => {
    try {
      setLoading(true);
      setErrorMsg("");
      if (otpFlow === "forgot") {
        // For forgot password flow, OTP is verified during the resetPassword API call.
        // We just transition directly to the reset password dialog.
        setSuccessMsg("Đang chuyển tiếp...");
        setTimeout(() => {
          setSuccessMsg("");
          openResetPassword(emailForOtp, data.otp);
        }, 1000);
      } else {
        // For registration flow, we verify the OTP
        await authService.verifyOtp({
          email: emailForOtp,
          otp: data.otp,
        });
        setSuccessMsg("Xác thực OTP thành công!");
        setTimeout(() => {
          setSuccessMsg("");
          openLogin();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err, "Mã OTP không chính xác hoặc đã hết hạn."));
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
      setErrorMsg(getErrorMessage(err, "Không thể đặt lại mật khẩu."));
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
      setErrorMsg(getErrorMessage(err, "Mật khẩu cũ không chính xác hoặc đổi mật khẩu thất bại."));
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
        gender: data.gender ? parseInt(data.gender) : 0,
      };

      await authService.register(regPayload);

      // Save extra details in local storage for profile page hydration
      const extraProfile = {
        username: data.username,
        email: data.email,
        fullname: data.fullName,
        phone: data.phone,
        gender: data.gender ? parseInt(data.gender) : 0,
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
        openVerifyOtp(data.email, "register");
        registerForm.reset();
        setGenderVal("");
        setDateInputVal("");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err, "Tên tài khoản hoặc email đã tồn tại."));
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

            <Button type="submit" className="w-full h-10 font-bold bg-primary text-base hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/10 mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                "Đăng nhập"
              )}
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
            <DialogDescription className="text-center text-muted-foreground text-base mt-1">
              Nhập các thông tin đăng ký để tham gia hệ thống học tập AILMS.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive mt-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600 mt-1">
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
                    <Label className="text-base font-semibold text-foreground">Tên tài khoản</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Nhập tên tài khoản"
                        className="pl-10 h-10 text-base md:text-base placeholder:opacity-70 border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                        {...registerForm.register("username")}
                      />
                    </div>
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.username.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="nhapemail@gmail.com"
                        className="pl-10 h-10 text-base md:text-base placeholder:opacity-70 border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                        {...registerForm.register("email")}
                      />
                    </div>
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-foreground">Ngày sinh</Label>
                    <Popover>
                      <PopoverTrigger
                        nativeButton={false}
                        render={
                          <div className="relative">
                            <Calendar
                              className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground pointer-events-none"
                            />
                            <Input
                              type="text"
                              placeholder="dd/mm/yyyy"
                              value={dateInputVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDateInputVal(val);
                                const yyyymmdd = parseDDMMYYYYToYYYYMMDD(val);
                                if (yyyymmdd) {
                                  registerForm.setValue("dateOfBirth", yyyymmdd, { shouldValidate: true });
                                } else {
                                  registerForm.setValue("dateOfBirth", "", { shouldValidate: false });
                                }
                              }}
                              className="pl-10 h-10 text-base md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                            />
                          </div>
                        }
                      />
                      <PopoverContent className="w-auto p-0 bg-popover border border-border rounded-lg shadow-xl" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={parseYYYYMMDD(registerForm.watch("dateOfBirth"))}
                          onSelect={(date) => {
                            if (date) {
                              const yyyy = date.getFullYear();
                              const mm = String(date.getMonth() + 1).padStart(2, '0');
                              const dd = String(date.getDate()).padStart(2, '0');
                              registerForm.setValue("dateOfBirth", `${yyyy}-${mm}-${dd}`, { shouldValidate: true });
                              setDateInputVal(`${dd}/${mm}/${yyyy}`);
                            } else {
                              registerForm.setValue("dateOfBirth", "", { shouldValidate: true });
                              setDateInputVal("");
                            }
                          }}
                          captionLayout="dropdown"
                          startMonth={new Date(1900, 0)}
                          endMonth={new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    {registerForm.formState.errors.dateOfBirth && (
                      <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.dateOfBirth.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-foreground">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        type={showRegPass ? "text" : "password"}
                        placeholder="Nhập mật khẩu"
                        className="pl-10 pr-10 h-10 text-base placeholder:opacity-70 md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                        {...registerForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPass(!showRegPass)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showRegPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>

                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-foreground">Số điện thoại</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Nhập số điện thoại"
                        className="pl-10 h-10 text-base placeholder:opacity-70 md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                        {...registerForm.register("phone")}
                      />
                    </div>
                    {registerForm.formState.errors.phone && (
                      <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-foreground">Họ và tên</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Nhập họ và tên"
                        className="pl-10 h-10 placeholder:opacity-70 text-base md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                        {...registerForm.register("fullName")}
                      />
                    </div>
                    {registerForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-foreground">Giới tính</Label>
                    <Select
                      value={genderVal}
                      onValueChange={(val) => {
                        const newV = val || "";
                        setGenderVal(newV);
                        registerForm.setValue("gender", newV, { shouldValidate: true });
                      }}
                    >
                      <SelectTrigger className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-primary/20 outline-none text-foreground">
                        <SelectValue placeholder="Chọn giới tính" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border rounded-lg shadow-xl text-foreground p-1">
                        <SelectItem value="0" className="hover:bg-foreground hover:text-foreground cursor-pointer rounded-md py-1.5 px-2 text-sm">Nam</SelectItem>
                        <SelectItem value="1" className="hover:bg-foreground hover:text-foreground cursor-pointer rounded-md py-1.5 px-2 text-sm">Nữ</SelectItem>
                        <SelectItem value="2" className="hover:bg-foreground hover:text-foreground cursor-pointer rounded-md py-1.5 px-2 text-sm">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                    {registerForm.formState.errors.gender && (
                      <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.gender.message}</p>
                    )}
                  </div>


                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-foreground">Xác nhận mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        type={showRegConfirmPass ? "text" : "password"}
                        placeholder="Nhập lại mật khẩu"
                        className="pl-10 pr-10 h-10 text-base placeholder:opacity-70 md:text-base border-input bg-background/50 focus-visible:ring-3 focus-visible:ring-primary/20"
                        {...registerForm.register("confirmPassword")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPass(!showRegConfirmPass)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showRegConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive font-medium">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 font-bold bg-primary text-base hover:bg-primary/95 text-primary-foreground mt-4 shadow-lg shadow-primary/10"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang đăng ký...
                  </>
                ) : (
                  "Đăng ký"
                )}
              </Button>
            </form>
          </FormProvider>

          <div className="text-center text-sm font-semibold mt-4 text-muted-foreground border-t border-border pt-4">
            Bạn đã có tài khoản?{" "}
            <button onClick={openLogin} className="text-primary text-sm font-semibold hover:underline">
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
            <DialogDescription className="text-base font-light text-center">
              Nhập tên tài khoản để lấy lại mật khẩu.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive mt-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600 mt-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form
            onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)}
            className="space-y-4 mt-4"
          >
            <div className="space-y-1.5">
              <Label className="text-base font-semibold text-foreground">Tên tài khoản</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Nhập tên tài khoản hoặc email"
                  className="pl-10 h-10 text-base md:text-base border-input/70 placeholder:opacity-60 bg-card hover:bg-background focus:bg-card focus-visible:ring-3 focus-visible:ring-primary/20 transition-all"
                  {...forgotPasswordForm.register("usernameOrEmail")}
                />
              </div>
              {forgotPasswordForm.formState.errors.usernameOrEmail && (
                <p className="text-sm text-destructive font-medium">
                  {forgotPasswordForm.formState.errors.usernameOrEmail.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-bold bg-primary text-base hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/10 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Tiếp tục"
              )}
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
            <DialogDescription className="text-sm font-light text-center">
              Nhập mã OTP để xác nhận tài khoản.
            </DialogDescription>
          </DialogHeader>

          {(errorMsg || verifyOtpForm.formState.errors.otp) && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive mt-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg || verifyOtpForm.formState.errors.otp?.message}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600 mt-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={verifyOtpForm.handleSubmit(onVerifyOtpSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-base font-semibold text-foreground text-center block">
                Nhập mã OTP đã gửi đến email của bạn
              </Label>
              <div className="flex justify-center gap-2.5 mt-3">
                {otpValues.map((digit, idx) => (
                  <Input
                    key={idx}
                    ref={(el) => {
                      otpRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="w-10 h-12 text-center text-xl font-extrabold border-input/70 placeholder:opacity-60 bg-card hover:bg-background focus:bg-card focus-visible:ring-3 focus-visible:ring-primary/20 transition-all rounded-lg"
                  />
                ))}
              </div>
              {verifyOtpForm.formState.errors.otp && (
                <p className="text-sm text-destructive font-medium text-center">
                  {verifyOtpForm.formState.errors.otp.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-bold bg-primary text-base hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/10 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xác thực...
                </>
              ) : (
                "Tiếp tục"
              )}
            </Button>
          </form>

          <div className="text-center text-base font-semibold mt-4 text-muted-foreground">
            Không nhận được mã?{" "}
            <button
              type="button"
              onClick={async () => {
                try {
                  setErrorMsg("");
                  setSuccessMsg("");
                  verifyOtpForm.clearErrors();
                  setOtpValues(Array(6).fill(""));
                  verifyOtpForm.setValue("otp", "");

                  if (otpFlow === "forgot") {
                    await authService.resendForgotPasswordOtp(emailForOtp);
                  } else {
                    await authService.resendOtp(emailForOtp);
                  }
                  setSuccessMsg("Đã gửi lại mã OTP!");
                  setTimeout(() => setSuccessMsg(""), 2000);
                } catch (e: any) {
                  setErrorMsg(getErrorMessage(e, "Gửi lại OTP thất bại."));
                }
              }}
              className="text-primary text-base font-semibold hover:underline"
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
            <DialogDescription className="text-base font-light text-center">
              Thiết lập lại mật khẩu cho tài khoản của bạn.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive mt-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600 mt-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form
            onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)}
            className="space-y-4 mt-4"
          >
            <div className="space-y-1.5">
              <Label className="text-base font-semibold text-foreground">Mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type={showResetPass ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-10 text-base md:text-base placeholder:opacity-60 border-input/70 bg-card hover:bg-background focus:bg-card focus-visible:ring-3 focus-visible:ring-primary/20 transition-all"
                  {...resetPasswordForm.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowResetPass(!showResetPass)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showResetPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {resetPasswordForm.formState.errors.password && (
                <p className="text-sm text-destructive font-medium">
                  {resetPasswordForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-base font-semibold text-foreground">Xác nhận lại mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type={showResetConfirmPass ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-10 text-base md:text-base placeholder:opacity-60 border-input/70 bg-card hover:bg-background focus:bg-card focus-visible:ring-3 focus-visible:ring-primary/20 transition-all"
                  {...resetPasswordForm.register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowResetConfirmPass(!showResetConfirmPass)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showResetConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {resetPasswordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive font-medium">
                  {resetPasswordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-bold bg-primary text-base hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/10 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Xác nhận"
              )}
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
            <DialogDescription className="text-base font-light text-center">
              Nhập mật khẩu cũ và thiết lập mật khẩu mới cho tài khoản của bạn.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive mt-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600 mt-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form
            onSubmit={changePasswordForm.handleSubmit(onChangePasswordSubmit)}
            className="space-y-4 mt-4"
          >
            <div className="space-y-1.5">
              <Label className="text-base font-semibold text-foreground">Mật khẩu cũ</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type={showChangeOldPass ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-10 text-base md:text-base placeholder:opacity-60 border-input/70 bg-card hover:bg-background focus:bg-card focus-visible:ring-3 focus-visible:ring-primary/20 transition-all"
                  {...changePasswordForm.register("oldPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowChangeOldPass(!showChangeOldPass)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showChangeOldPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {changePasswordForm.formState.errors.oldPassword && (
                <p className="text-sm text-destructive font-medium">
                  {changePasswordForm.formState.errors.oldPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-base font-semibold text-foreground">Mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type={showChangeNewPass ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-10 text-base md:text-base placeholder:opacity-60 border-input/70 bg-card hover:bg-background focus:bg-card focus-visible:ring-3 focus-visible:ring-primary/20 transition-all"
                  {...changePasswordForm.register("newPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowChangeNewPass(!showChangeNewPass)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showChangeNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {changePasswordForm.formState.errors.newPassword && (
                <p className="text-sm text-destructive font-medium">
                  {changePasswordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-base font-semibold text-foreground">Xác nhận lại mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type={showChangeConfirmPass ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-10 text-base md:text-base placeholder:opacity-60 border-input/70 bg-card hover:bg-background focus:bg-card focus-visible:ring-3 focus-visible:ring-primary/20 transition-all"
                  {...changePasswordForm.register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowChangeConfirmPass(!showChangeConfirmPass)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showChangeConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {changePasswordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive font-medium">
                  {changePasswordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-bold bg-primary text-base hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/10 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
