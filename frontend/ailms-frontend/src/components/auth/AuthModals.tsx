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
import {
  formatAsDDMMYYYYMask,
  parseYYYYMMDD,
  parseDDMMYYYYToYYYYMMDD,
} from "@/components/ui/DatePickerInput";

/**
 * Trích xuất và định dạng thông báo lỗi chi tiết từ backend hoặc exception
 */
const getErrorMessage = (err: any, defaultMsg: string): string => {
  if (!err) return defaultMsg;
  const payload = err.response?.data || err;

  // 1. Kiểm tra danh sách chi tiết lỗi từ Spring Validation (details)
  if (payload.details && Array.isArray(payload.details) && payload.details.length > 0) {
    const firstDetail = payload.details[0];
    if (typeof firstDetail === "string") {
      const colonIndex = firstDetail.indexOf(": ");
      const rawMsg = colonIndex !== -1 ? firstDetail.slice(colonIndex + 2) : firstDetail;

      if (rawMsg.includes("must contain at least one uppercase letter")) {
        return "Mật khẩu phải chứa ít nhất 1 chữ cái in hoa, 1 chữ cái thường, 1 chữ số và không chứa khoảng trắng.";
      }
      if (rawMsg.includes("cannot be blank") || rawMsg.includes("cannot be null")) {
        if (firstDetail.startsWith("usernameOrEmail")) return "Vui lòng nhập tên tài khoản hoặc email.";
        if (firstDetail.startsWith("password")) return "Vui lòng nhập mật khẩu.";
        return "Vui lòng điền đầy đủ các thông tin bắt buộc.";
      }
      if (rawMsg.includes("must not contain spaces")) {
        return "Dữ liệu nhập không được chứa khoảng trắng.";
      }
      if (rawMsg.includes("must be between") || rawMsg.includes("must be at least")) {
        return "Độ dài dữ liệu nhập không hợp lệ.";
      }
      return rawMsg;
    }
  }

  // 2. Kiểm tra mảng errors nếu có
  if (payload.errors) {
    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      const firstErr = payload.errors[0];
      if (typeof firstErr === "string") return firstErr;
      if (firstErr && typeof firstErr === "object" && firstErr.message) {
        return firstErr.message;
      }
    }
    if (typeof payload.errors === "object") {
      const values = Object.values(payload.errors);
      if (values.length > 0) {
        const first = values[0];
        if (typeof first === "string") return first;
        if (Array.isArray(first) && first.length > 0 && typeof first[0] === "string") return first[0];
      }
    }
  }

  // 3. Xử lý thông báo "Validation failed" mặc định của Spring
  if (payload.message === "Validation failed") {
    return "Thông tin nhập vào không hợp lệ hoặc chưa đáp ứng đủ yêu cầu bảo mật.";
  }

  return payload.message || err.message || defaultMsg;
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
  Loader2,
  Check,
  X,
  Info
} from "lucide-react";

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const loginSchema = z.object({
  usernameOrEmail: z
    .string()
    .transform((val) => (val || "").trim())
    .pipe(
      z
        .string()
        .min(1, "Vui lòng nhập tên tài khoản hoặc email")
        .min(6, "Tên tài khoản hoặc email phải có ít nhất 6 ký tự")
        .max(100, "Tên tài khoản hoặc email không được vượt quá 100 ký tự")
        .regex(/^\S+$/, "Tên tài khoản hoặc email không được chứa khoảng trắng")
    ),
  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu")
    .min(6, "Mật khẩu phải chứa ít nhất 6 ký tự")
    .max(100, "Mật khẩu không được vượt quá 100 ký tự")
    .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái in hoa (A-Z)")
    .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái thường (a-z)")
    .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số (0-9)")
    .regex(/^\S+$/, "Mật khẩu không được chứa khoảng trắng"),
});

const forgotPasswordSchema = z.object({
  usernameOrEmail: z
    .string()
    .transform((val) => (val || "").trim())
    .pipe(
      z
        .string()
        .min(1, "Vui lòng nhập tên tài khoản hoặc email")
        .min(6, "Tên tài khoản hoặc email phải có ít nhất 6 ký tự")
        .max(100, "Tên tài khoản hoặc email không được vượt quá 100 ký tự")
        .regex(/^\S+$/, "Tên tài khoản hoặc email không được chứa khoảng trắng")
    ),
});

const verifyOtpSchema = z.object({
  otp: z.string().length(6, "Mã OTP phải có đúng 6 chữ số"),
});

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, "Mật khẩu mới phải chứa ít nhất 6 ký tự")
      .max(100, "Mật khẩu không được vượt quá 100 ký tự")
      .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái in hoa (A-Z)")
      .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái thường (a-z)")
      .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số (0-9)")
      .regex(/^\S+$/, "Mật khẩu không được chứa khoảng trắng"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string()
      .min(6, "Mật khẩu mới phải chứa ít nhất 6 ký tự")
      .max(100, "Mật khẩu không được vượt quá 100 ký tự")
      .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái in hoa (A-Z)")
      .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái thường (a-z)")
      .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số (0-9)")
      .regex(/^\S+$/, "Mật khẩu không được chứa khoảng trắng"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận lại mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "Mật khẩu mới không được trùng với mật khẩu hiện tại",
    path: ["newPassword"],
  });

const registerSchema = z
  .object({
    username: z
      .string()
      .transform((value) => (value || "").trim())
      .pipe(
        z
          .string()
          .min(6, "Tên tài khoản phải chứa ít nhất 6 ký tự")
          .max(50, "Tên tài khoản không được vượt quá 50 ký tự")
          .regex(
            /^[a-zA-Z0-9._-]+$/,
            "Tên tài khoản chỉ gồm chữ cái không dấu, số, dấu chấm (.), gạch dưới (_) và gạch ngang (-)"
          )
          .regex(/^\S+$/, "Tên tài khoản không được chứa khoảng trắng")
      ),
    password: z
      .string()
      .min(6, "Mật khẩu phải chứa ít nhất 6 ký tự")
      .max(100, "Mật khẩu không được vượt quá 100 ký tự")
      .regex(/[A-Z]/, "Mật khẩu phải có ít nhất 1 chữ cái in hoa (A-Z)")
      .regex(/[a-z]/, "Mật khẩu phải có ít nhất 1 chữ cái thường (a-z)")
      .regex(/[0-9]/, "Mật khẩu phải có ít nhất 1 chữ số (0-9)")
      .regex(/^\S+$/, "Mật khẩu không được chứa khoảng trắng"),
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu xác nhận"),
    email: z
      .string()
      .transform((value) => (value || "").trim())
      .pipe(
        z
          .string()
          .min(1, "Vui lòng nhập địa chỉ email")
          .email("Định dạng email không hợp lệ (ví dụ: user@gmail.com)")
      ),
    phone: z
      .string()
      .transform((value) => (value || "").trim())
      .pipe(
        z
          .string()
          .min(1, "Vui lòng nhập số điện thoại")
          .regex(
            /^(0|\+84)[3|5|7|8|9][0-9]{8}$/,
            "Số điện thoại không đúng (gồm 10 số, bắt đầu bằng 03, 05, 07, 08, 09)"
          )
      ),
    fullName: z
      .string()
      .transform((value) => (value || "").trim())
      .pipe(
        z
          .string()
          .min(2, "Họ và tên phải chứa ít nhất 2 ký tự")
          .max(100, "Họ và tên không được vượt quá 100 ký tự")
      ),
    gender: z.string().min(1, "Vui lòng chọn giới tính"),
    dateOfBirth: z
      .string()
      .min(1, "Vui lòng chọn ngày sinh")
      .refine(
        (dateStr) => {
          const d = new Date(dateStr);
          const now = new Date();
          return !isNaN(d.getTime()) && d < now;
        },
        { message: "Ngày sinh phải là một ngày trong quá khứ" }
      ),
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
    mode: "onTouched",
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
    mode: "onTouched",
    defaultValues: { password: "", confirmPassword: "" },
  });

  const changePasswordForm = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
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

  const regPassword = registerForm.watch("password") || "";
  const regConfirmPassword = registerForm.watch("confirmPassword") || "";
  const hasMinLen = regPassword.length >= 6;
  const hasUpper = /[A-Z]/.test(regPassword);
  const hasLower = /[a-z]/.test(regPassword);
  const hasDigit = /[0-9]/.test(regPassword);
  const hasNoSpace = /^\S+$/.test(regPassword) && regPassword.length > 0;
  const isAllPasswordCriteriaMet = hasMinLen && hasUpper && hasLower && hasDigit && hasNoSpace;

  const changeNewPass = changePasswordForm.watch("newPassword") || "";
  const changeConfirmPass = changePasswordForm.watch("confirmPassword") || "";
  const changeHasMinLen = changeNewPass.length >= 6;
  const changeHasUpper = /[A-Z]/.test(changeNewPass);
  const changeHasLower = /[a-z]/.test(changeNewPass);
  const changeHasDigit = /[0-9]/.test(changeNewPass);
  const changeHasNoSpace = /^\S+$/.test(changeNewPass) && changeNewPass.length > 0;
  const isAllChangePasswordCriteriaMet =
    changeHasMinLen && changeHasUpper && changeHasLower && changeHasDigit && changeHasNoSpace;

  const resetPass = resetPasswordForm.watch("password") || "";
  const resetConfirmPass = resetPasswordForm.watch("confirmPassword") || "";
  const resetHasMinLen = resetPass.length >= 6;
  const resetHasUpper = /[A-Z]/.test(resetPass);
  const resetHasLower = /[a-z]/.test(resetPass);
  const resetHasDigit = /[0-9]/.test(resetPass);
  const resetHasNoSpace = /^\S+$/.test(resetPass) && resetPass.length > 0;
  const isAllResetPasswordCriteriaMet =
    resetHasMinLen && resetHasUpper && resetHasLower && resetHasDigit && resetHasNoSpace;

  // ==========================================
  // HANDLERS
  // ==========================================

  /** Xử lý submit form đăng nhập và bắt lỗi chi tiết từ backend */
  const onLoginSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      setLoading(true);
      setErrorMsg("");
      loginForm.setValue("usernameOrEmail", data.usernameOrEmail);
      await authLogin(data.usernameOrEmail, data.password);
      closeAll();
      loginForm.reset();
      navigate("/dashboard");
    } catch (err: any) {
      const msg = getErrorMessage(err, "Tên đăng nhập hoặc mật khẩu không chính xác.");
      setErrorMsg(msg);
      const payload = err.response?.data || err;
      if (payload.details && Array.isArray(payload.details)) {
        payload.details.forEach((d: string) => {
          if (typeof d === "string") {
            if (d.startsWith("usernameOrEmail:")) {
              loginForm.setError("usernameOrEmail", { message: msg });
            } else if (d.startsWith("password:")) {
              loginForm.setError("password", { message: msg });
            }
          }
        });
      }
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

  /** Xử lý submit đổi mật khẩu tài khoản và bắt lỗi chi tiết từ backend */
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
      const msg = getErrorMessage(err, "Mật khẩu cũ không chính xác hoặc đổi mật khẩu thất bại.");
      setErrorMsg(msg);
      const payload = err.response?.data || err;
      if (payload.details && Array.isArray(payload.details)) {
        payload.details.forEach((d: string) => {
          if (typeof d === "string") {
            if (d.startsWith("oldPassword:")) {
              changePasswordForm.setError("oldPassword", { message: msg });
            } else if (d.startsWith("newPassword:")) {
              changePasswordForm.setError("newPassword", { message: msg });
            } else if (d.startsWith("confirmPassword:")) {
              changePasswordForm.setError("confirmPassword", { message: msg });
            }
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const onRegisterSubmit = async (data: z.infer<typeof registerSchema>) => {
    try {
      setLoading(true);
      setErrorMsg("");
      registerForm.setValue("username", data.username);
      registerForm.setValue("email", data.email);
      registerForm.setValue("phone", data.phone);
      registerForm.setValue("fullName", data.fullName);

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                {/* 1. Tên tài khoản */}
                <div className="space-y-1">
                  <Label className="text-sm font-semibold text-foreground">Tên tài khoản</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="e.g. nguyenvana"
                      className="pl-10 h-10 text-sm md:text-sm placeholder:opacity-70 border-input bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                      {...registerForm.register("username")}
                    />
                  </div>
                  {registerForm.formState.errors.username ? (
                    <p className="text-xs text-destructive font-medium">{registerForm.formState.errors.username.message}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Tối thiểu 6 ký tự, chỉ gồm chữ cái, số, dấu . _ -</p>
                  )}
                </div>

                {/* 2. Họ và tên */}
                <div className="space-y-1">
                  <Label className="text-sm font-semibold text-foreground">Họ và tên</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="e.g. Nguyễn Văn A"
                      className="pl-10 h-10 placeholder:opacity-70 text-sm md:text-sm border-input bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                      {...registerForm.register("fullName")}
                    />
                  </div>
                  {registerForm.formState.errors.fullName && (
                    <p className="text-xs text-destructive font-medium">{registerForm.formState.errors.fullName.message}</p>
                  )}
                </div>

                {/* 3. Email */}
                <div className="space-y-1">
                  <Label className="text-sm font-semibold text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="e.g. example@gmail.com"
                      className="pl-10 h-10 text-sm md:text-sm placeholder:opacity-70 border-input bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                      {...registerForm.register("email")}
                    />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="text-xs text-destructive font-medium">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                {/* 4. Số điện thoại */}
                <div className="space-y-1">
                  <Label className="text-sm font-semibold text-foreground">Số điện thoại</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="e.g. 0987654321"
                      className="pl-10 h-10 text-sm placeholder:opacity-70 md:text-sm border-input bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                      {...registerForm.register("phone")}
                    />
                  </div>
                  {registerForm.formState.errors.phone && (
                    <p className="text-xs text-destructive font-medium">{registerForm.formState.errors.phone.message}</p>
                  )}
                </div>

                {/* 5. Ngày sinh */}
                <div className="space-y-1">
                  <Label className="text-sm font-semibold text-foreground">Ngày sinh</Label>
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
                            maxLength={10}
                            onChange={(e) => {
                              const maskedVal = formatAsDDMMYYYYMask(e.target.value, dateInputVal);
                              setDateInputVal(maskedVal);
                              const yyyymmdd = parseDDMMYYYYToYYYYMMDD(maskedVal);
                              if (yyyymmdd) {
                                registerForm.setValue("dateOfBirth", yyyymmdd, { shouldValidate: true });
                              } else {
                                registerForm.setValue("dateOfBirth", "", { shouldValidate: false });
                              }
                            }}
                            className="pl-10 h-10 text-sm md:text-sm border-input bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/20"
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
                    <p className="text-xs text-destructive font-medium">{registerForm.formState.errors.dateOfBirth.message}</p>
                  )}
                </div>

                {/* 6. Giới tính */}
                <div className="space-y-1">
                  <Label className="text-sm font-semibold text-foreground">Giới tính</Label>
                  <Select
                    value={genderVal}
                    onValueChange={(val) => {
                      const newV = val || "";
                      setGenderVal(newV);
                      registerForm.setValue("gender", newV, { shouldValidate: true });
                    }}
                  >
                    <SelectTrigger className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary/20 outline-none text-foreground">
                      <SelectValue placeholder="Chọn giới tính" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border rounded-lg shadow-xl text-foreground p-1">
                      <SelectItem value="0" className="hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-md py-1.5 px-2 text-sm">Nam</SelectItem>
                      <SelectItem value="1" className="hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-md py-1.5 px-2 text-sm">Nữ</SelectItem>
                      <SelectItem value="2" className="hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-md py-1.5 px-2 text-sm">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                  {registerForm.formState.errors.gender && (
                    <p className="text-xs text-destructive font-medium">{registerForm.formState.errors.gender.message}</p>
                  )}
                </div>

                {/* 7. Mật khẩu */}
                <div className="space-y-1">
                  <Label className="text-sm font-semibold text-foreground">Mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                    <Input
                      type={showRegPass ? "text" : "password"}
                      placeholder="Nhập mật khẩu"
                      className="pl-10 pr-10 h-10 text-sm placeholder:opacity-70 md:text-sm border-input bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/20"
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
                    <p className="text-xs text-destructive font-medium">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                {/* 8. Xác nhận mật khẩu */}
                <div className="space-y-1">
                  <Label className="text-sm font-semibold text-foreground">Xác nhận mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                    <Input
                      type={showRegConfirmPass ? "text" : "password"}
                      placeholder="Nhập lại mật khẩu"
                      className="pl-10 pr-10 h-10 text-sm placeholder:opacity-70 md:text-sm border-input bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/20"
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
                  {regConfirmPassword.length > 0 && regPassword.length > 0 && (
                    <div className="mt-1">
                      {regConfirmPassword === regPassword ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                          <Check className="h-3.5 w-3.5" /> Mật khẩu khớp
                        </p>
                      ) : (
                        <p className="text-xs text-destructive flex items-center gap-1 font-medium">
                          <X className="h-3.5 w-3.5" /> Mật khẩu xác nhận chưa khớp
                        </p>
                      )}
                    </div>
                  )}
                  {registerForm.formState.errors.confirmPassword && regConfirmPassword.length === 0 && (
                    <p className="text-xs text-destructive font-medium">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* 9. Live Password Checklist (Full width spans 2 cols) */}
                {regPassword.length > 0 && (
                  <div className="col-span-1 md:col-span-2 rounded-lg bg-muted/40 p-2.5 text-xs space-y-1.5 border border-border/60 transition-all duration-200 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground/80 text-[11px]">Yêu cầu mật khẩu:</span>
                      {isAllPasswordCriteriaMet ? (
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Đạt chuẩn
                        </span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                      <div className={`flex items-center gap-1.5 transition-colors ${hasMinLen ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                        {hasMinLen ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                        <span>Tối thiểu 6 ký tự (tối đa 100)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-colors ${hasUpper && hasLower ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                        {hasUpper && hasLower ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                        <span>Gồm cả chữ hoa (A-Z) & chữ thường (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-colors ${hasDigit ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                        {hasDigit ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                        <span>Ít nhất 1 chữ số (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-colors ${hasNoSpace ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                        {hasNoSpace ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                        <span>Không chứa khoảng trắng</span>
                      </div>
                    </div>
                  </div>
                )}
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
            className="space-y-4 mt-3"
          >
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type={showResetPass ? "text" : "password"}
                  placeholder="Nhập mật khẩu mới"
                  className="pl-10 pr-10 h-10 text-sm md:text-sm placeholder:opacity-60 border-input bg-card hover:bg-background focus:bg-card focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
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

              {/* Live Checklist yêu cầu mật khẩu mới */}
              {resetPass.length > 0 && (
                <div className="rounded-lg bg-muted/40 p-2.5 text-xs space-y-1.5 border border-border/60 transition-all duration-200 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground/80 text-[11px]">Yêu cầu mật khẩu:</span>
                    {isAllResetPasswordCriteriaMet ? (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Đạt chuẩn
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 transition-colors ${resetHasMinLen ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                      {resetHasMinLen ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                      <span>Tối thiểu 6 ký tự (tối đa 100)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 transition-colors ${resetHasUpper && resetHasLower ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                      {resetHasUpper && resetHasLower ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                      <span>Gồm cả chữ hoa & chữ thường</span>
                    </div>
                    <div className={`flex items-center gap-1.5 transition-colors ${resetHasDigit ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                      {resetHasDigit ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                      <span>Ít nhất 1 chữ số (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 transition-colors ${resetHasNoSpace ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                      {resetHasNoSpace ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                      <span>Không chứa khoảng trắng</span>
                    </div>
                  </div>
                </div>
              )}

              {resetPasswordForm.formState.errors.password && (
                <p className="text-xs text-destructive font-medium">
                  {resetPasswordForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Xác nhận lại mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type={showResetConfirmPass ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu mới"
                  className="pl-10 pr-10 h-10 text-sm md:text-sm placeholder:opacity-60 border-input bg-card hover:bg-background focus:bg-card focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
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

              {resetConfirmPass.length > 0 && resetPass.length > 0 && (
                <div className="mt-1">
                  {resetConfirmPass === resetPass ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                      <Check className="h-3.5 w-3.5" /> Mật khẩu khớp
                    </p>
                  ) : (
                    <p className="text-xs text-destructive flex items-center gap-1 font-medium">
                      <X className="h-3.5 w-3.5" /> Mật khẩu xác nhận chưa khớp
                    </p>
                  )}
                </div>
              )}

              {resetPasswordForm.formState.errors.confirmPassword && resetConfirmPass.length === 0 && (
                <p className="text-xs text-destructive font-medium">
                  {resetPasswordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-bold bg-primary text-base hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/10 mt-2 cursor-pointer"
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
            className="space-y-4 mt-3"
          >
            {/* 1. Mật khẩu cũ */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Mật khẩu cũ</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type={showChangeOldPass ? "text" : "password"}
                  placeholder="Nhập mật khẩu hiện tại"
                  className="pl-10 pr-10 h-10 text-sm md:text-sm placeholder:opacity-60 border-input bg-card hover:bg-background focus:bg-card focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
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
                <p className="text-xs text-destructive font-medium">
                  {changePasswordForm.formState.errors.oldPassword.message}
                </p>
              )}
            </div>

            {/* 2. Mật khẩu mới */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type={showChangeNewPass ? "text" : "password"}
                  placeholder="Nhập mật khẩu mới"
                  className="pl-10 pr-10 h-10 text-sm md:text-sm placeholder:opacity-60 border-input bg-card hover:bg-background focus:bg-card focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
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

              {/* Live Checklist yêu cầu mật khẩu mới */}
              {changeNewPass.length > 0 && (
                <div className="rounded-lg bg-muted/40 p-2.5 text-xs space-y-1.5 border border-border/60 transition-all duration-200 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground/80 text-[11px]">Yêu cầu mật khẩu mới:</span>
                    {isAllChangePasswordCriteriaMet ? (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Đạt chuẩn
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 transition-colors ${changeHasMinLen ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                      {changeHasMinLen ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                      <span>Tối thiểu 6 ký tự (tối đa 100)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 transition-colors ${changeHasUpper && changeHasLower ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                      {changeHasUpper && changeHasLower ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                      <span>Gồm cả chữ hoa & chữ thường</span>
                    </div>
                    <div className={`flex items-center gap-1.5 transition-colors ${changeHasDigit ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                      {changeHasDigit ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                      <span>Ít nhất 1 chữ số (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 transition-colors ${changeHasNoSpace ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                      {changeHasNoSpace ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                      <span>Không chứa khoảng trắng</span>
                    </div>
                  </div>
                </div>
              )}

              {changePasswordForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive font-medium">
                  {changePasswordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            {/* 3. Xác nhận lại mật khẩu mới */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Xác nhận lại mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type={showChangeConfirmPass ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu mới"
                  className="pl-10 pr-10 h-10 text-sm md:text-sm placeholder:opacity-60 border-input bg-card hover:bg-background focus:bg-card focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
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

              {changeConfirmPass.length > 0 && changeNewPass.length > 0 && (
                <div className="mt-1">
                  {changeConfirmPass === changeNewPass ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                      <Check className="h-3.5 w-3.5" /> Mật khẩu khớp
                    </p>
                  ) : (
                    <p className="text-xs text-destructive flex items-center gap-1 font-medium">
                      <X className="h-3.5 w-3.5" /> Mật khẩu xác nhận chưa khớp
                    </p>
                  )}
                </div>
              )}

              {changePasswordForm.formState.errors.confirmPassword && changeConfirmPass.length === 0 && (
                <p className="text-xs text-destructive font-medium">
                  {changePasswordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-bold bg-primary text-base hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/10 mt-2 cursor-pointer"
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
