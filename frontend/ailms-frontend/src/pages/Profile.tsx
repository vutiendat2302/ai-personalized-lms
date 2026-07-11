import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { userService } from "@/services/userService";
import { authService } from "@/services/authService";
import type { UserEntity } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  ShieldAlert,
  GraduationCap,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";

// ==========================================
// SCHEMAS FOR THE 4 FORMS
// ==========================================

const basicInfoSchema = z.object({
  fullName: z.string().min(2, "Họ và tên phải chứa ít nhất 2 ký tự"),
  phone: z.string().regex(/^\d{10,11}$/, "Số điện thoại phải có 10-11 chữ số"),
  dateOfBirth: z.string().min(1, "Vui lòng chọn ngày sinh"),
  gender: z.string(),
});

const guardianSchema = z.object({
  guardianName: z.string().min(2, "Họ tên người giám hộ phải chứa ít nhất 2 ký tự"),
  guardianPhone: z.string().regex(/^\d{10,11}$/, "Số điện thoại người giám hộ phải từ 10-11 chữ số"),
});

const academicSchema = z.object({
  academicLevel: z.string().min(1, "Vui lòng chọn trình độ học vấn"),
  schoolName: z.string().min(2, "Vui lòng nhập tên trường học"),
  gradeClass: z.string().min(1, "Vui lòng nhập tên lớp/khóa"),
  learningGoals: z.string().min(5, "Mục tiêu học tập phải có tối thiểu 5 ký tự"),
});

const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(6, "Mật khẩu cũ phải từ 6 ký tự"),
    newPassword: z.string().min(6, "Mật khẩu mới phải từ 6 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserEntity | null>(null);

  // States for notifications
  const [basicStatus, setBasicStatus] = useState({ success: "", error: "", loading: false });
  const [guardianStatus, setGuardianStatus] = useState({ success: "", error: "", loading: false });
  const [academicStatus, setAcademicStatus] = useState({ success: "", error: "", loading: false });
  const [passwordStatus, setPasswordStatus] = useState({ success: "", error: "", loading: false });

  // Password visibility
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Active section tracking (scrolling shortcut)
  const [activeTab, setActiveTab] = useState("basic");

  // ==========================================
  // FORMS INITIALIZATION
  // ==========================================
  const basicForm = useForm<z.infer<typeof basicInfoSchema>>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: { fullName: "", phone: "", dateOfBirth: "", gender: "0" },
  });

  const guardianForm = useForm<z.infer<typeof guardianSchema>>({
    resolver: zodResolver(guardianSchema),
    defaultValues: { guardianName: "", guardianPhone: "" },
  });

  const academicForm = useForm<z.infer<typeof academicSchema>>({
    resolver: zodResolver(academicSchema),
    defaultValues: { academicLevel: "", schoolName: "", gradeClass: "", learningGoals: "" },
  });

  const passwordForm = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  // Load profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const data = await userService.getProfile();
      setProfile(data);

      // Hydrate basic form
      basicForm.reset({
        fullName: data.fullName || "",
        phone: data.phone || "",
        dateOfBirth: data.dateOfBirth || "",
        gender: String(data.gender ?? 0),
      });

      // Parse and hydrate attributes
      if (data.attributes) {
        try {
          const attrs = JSON.parse(data.attributes);
          guardianForm.reset({
            guardianName: attrs.guardianName || "",
            guardianPhone: attrs.guardianPhone || "",
          });
          academicForm.reset({
            academicLevel: attrs.academicLevel || "Học sinh",
            schoolName: attrs.schoolName || "",
            gradeClass: attrs.gradeClass || "",
            learningGoals: attrs.learningGoals || "",
          });
        } catch (e) {
          console.error("Failed to parse profile attributes:", e);
        }
      }
    };
    fetchProfile();
  }, [basicForm, guardianForm, academicForm]);

  // ==========================================
  // FORM SUBMISSION HANDLERS
  // ==========================================

  // 1. Basic Info Submit
  const onBasicSubmit = async (data: z.infer<typeof basicInfoSchema>) => {
    setBasicStatus({ success: "", error: "", loading: true });
    try {
      const updated = await userService.updateProfile({
        fullName: data.fullName,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        gender: parseInt(data.gender),
      });
      setProfile(updated);
      setBasicStatus({ success: "Cập nhật thông tin cá nhân thành công!", error: "", loading: false });
      setTimeout(() => setBasicStatus((s) => ({ ...s, success: "" })), 3000);
    } catch (e: any) {
      setBasicStatus({ success: "", error: e.message || "Không thể lưu thay đổi.", loading: false });
    }
  };

  // Helper to parse current attributes
  const getCurrentAttributes = () => {
    if (profile?.attributes) {
      try {
        return JSON.parse(profile.attributes);
      } catch (e) {
        return {};
      }
    }
    return {};
  };

  // 2. Guardian Info Submit
  const onGuardianSubmit = async (data: z.infer<typeof guardianSchema>) => {
    setGuardianStatus({ success: "", error: "", loading: true });
    try {
      const currentAttrs = getCurrentAttributes();
      const updatedAttrs = {
        ...currentAttrs,
        guardianName: data.guardianName,
        guardianPhone: data.guardianPhone,
      };

      const updated = await userService.updateProfile({
        attributes: JSON.stringify(updatedAttrs),
      });
      setProfile(updated);
      setGuardianStatus({ success: "Cập nhật thông tin người giám hộ thành công!", error: "", loading: false });
      setTimeout(() => setGuardianStatus((s) => ({ ...s, success: "" })), 3000);
    } catch (e: any) {
      setGuardianStatus({ success: "", error: e.message || "Không thể lưu thay đổi.", loading: false });
    }
  };

  // 3. Academic Info Submit
  const onAcademicSubmit = async (data: z.infer<typeof academicSchema>) => {
    setAcademicStatus({ success: "", error: "", loading: true });
    try {
      const currentAttrs = getCurrentAttributes();
      const updatedAttrs = {
        ...currentAttrs,
        academicLevel: data.academicLevel,
        schoolName: data.schoolName,
        gradeClass: data.gradeClass,
        learningGoals: data.learningGoals,
      };

      const updated = await userService.updateProfile({
        attributes: JSON.stringify(updatedAttrs),
      });
      setProfile(updated);
      setAcademicStatus({ success: "Cập nhật thông tin học tập thành công!", error: "", loading: false });
      setTimeout(() => setAcademicStatus((s) => ({ ...s, success: "" })), 3000);
    } catch (e: any) {
      setAcademicStatus({ success: "", error: e.message || "Không thể lưu thay đổi.", loading: false });
    }
  };

  // 4. Change Password Submit
  const onPasswordSubmit = async (data: z.infer<typeof changePasswordSchema>) => {
    setPasswordStatus({ success: "", error: "", loading: true });
    try {
      await authService.changePassword({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      setPasswordStatus({ success: "Đổi mật khẩu thành công!", error: "", loading: false });
      passwordForm.reset();
      setTimeout(() => setPasswordStatus((s) => ({ ...s, success: "" })), 3000);
    } catch (e: any) {
      setPasswordStatus({ success: "", error: e.message || "Mật khẩu cũ không chính xác.", loading: false });
    }
  };

  const scrollTo = (id: string, tab: string) => {
    setActiveTab(tab);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in-50 duration-300">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Cài đặt tài khoản</h1>
        <p className="text-sm text-muted-foreground">Quản lý hồ sơ cá nhân, thông tin học tập và cài đặt bảo mật.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* ==========================================
            LEFT COLUMN: SHORCUTS / MENU
            ========================================== */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/80 shadow-sm bg-card p-5 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="relative group cursor-pointer">
                <Avatar className="h-20 w-20 border-4 border-primary/20 hover:border-primary/60 transition-all">
                  <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${profile?.username}`} />
                  <AvatarFallback className="bg-primary/10 text-primary font-extrabold uppercase text-xl">
                    {profile?.username.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <h3 className="font-bold text-foreground">{profile?.fullName || profile?.username}</h3>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
          </Card>

          {/* Quick links */}
          <nav className="hidden lg:flex flex-col gap-1 text-sm font-medium">
            <button
              onClick={() => scrollTo("sec-basic", "basic")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-colors ${
                activeTab === "basic"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <User className="h-4.5 w-4.5" />
              <span>Thông tin cá nhân</span>
            </button>
            <button
              onClick={() => scrollTo("sec-academic", "academic")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-colors ${
                activeTab === "academic"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-4.5 w-4.5" />
              <span>Thông tin học vấn</span>
            </button>
            <button
              onClick={() => scrollTo("sec-guardian", "guardian")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-colors ${
                activeTab === "guardian"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <ShieldAlert className="h-4.5 w-4.5" />
              <span>Người giám hộ</span>
            </button>
            <button
              onClick={() => scrollTo("sec-password", "password")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-colors ${
                activeTab === "password"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <KeyRound className="h-4.5 w-4.5" />
              <span>Đổi mật khẩu</span>
            </button>
          </nav>
        </div>

        {/* ==========================================
            RIGHT COLUMN: FORMS LIST
            ========================================== */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* 1. THÔNG TIN CÁ NHÂN CƠ BẢN */}
          <Card id="sec-basic" className="border-border shadow-sm bg-card transition-all">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <span>Thông tin cá nhân cơ bản</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Cập nhật thông tin định danh và số điện thoại liên lạc của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {basicStatus.success && (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-xs text-green-600 mb-4">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                  <span>{basicStatus.success}</span>
                </div>
              )}
              {basicStatus.error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive mb-4">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{basicStatus.error}</span>
                </div>
              )}

              <form onSubmit={basicForm.handleSubmit(onBasicSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="basic-fullName" className="text-xs font-semibold">Họ và tên</Label>
                    <Input id="basic-fullName" {...basicForm.register("fullName")} />
                    {basicForm.formState.errors.fullName && (
                      <p className="text-[10px] text-destructive font-medium">{basicForm.formState.errors.fullName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="basic-phone" className="text-xs font-semibold">Số điện thoại</Label>
                    <Input id="basic-phone" {...basicForm.register("phone")} />
                    {basicForm.formState.errors.phone && (
                      <p className="text-[10px] text-destructive font-medium">{basicForm.formState.errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="basic-dob" className="text-xs font-semibold">Ngày sinh</Label>
                    <Input id="basic-dob" type="date" {...basicForm.register("dateOfBirth")} />
                    {basicForm.formState.errors.dateOfBirth && (
                      <p className="text-[10px] text-destructive font-medium">{basicForm.formState.errors.dateOfBirth.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="basic-gender" className="text-xs font-semibold">Giới tính</Label>
                    <select
                      id="basic-gender"
                      className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-primary/20 outline-none"
                      {...basicForm.register("gender")}
                    >
                      <option value="0">Nam</option>
                      <option value="1">Nữ</option>
                      <option value="2">Khác</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" className="font-bold bg-primary hover:bg-primary/95 shadow-md shadow-primary/10" disabled={basicStatus.loading}>
                    {basicStatus.loading ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 2. THÔNG TIN HỌC VẤN */}
          <Card id="sec-academic" className="border-border shadow-sm bg-card transition-all">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <span>Thông tin học vấn</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Thiết lập thông tin phục vụ lộ trình cá nhân hóa đề xuất từ AI.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {academicStatus.success && (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-xs text-green-600 mb-4">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                  <span>{academicStatus.success}</span>
                </div>
              )}
              {academicStatus.error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive mb-4">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{academicStatus.error}</span>
                </div>
              )}

              <form onSubmit={academicForm.handleSubmit(onAcademicSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="academic-level" className="text-xs font-semibold">Trình độ học vấn</Label>
                    <select
                      id="academic-level"
                      className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-primary/20 outline-none"
                      {...academicForm.register("academicLevel")}
                    >
                      <option value="Học sinh">Học sinh</option>
                      <option value="Sinh viên">Sinh viên</option>
                      <option value="Đi làm">Đi làm</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="academic-school" className="text-xs font-semibold">Trường học</Label>
                      <Input id="academic-school" placeholder="Tên trường học" {...academicForm.register("schoolName")} />
                      {academicForm.formState.errors.schoolName && (
                        <p className="text-[10px] text-destructive font-medium">{academicForm.formState.errors.schoolName.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="academic-grade" className="text-xs font-semibold">Lớp/Khóa</Label>
                      <Input id="academic-grade" placeholder="12A1 / K65" {...academicForm.register("gradeClass")} />
                      {academicForm.formState.errors.gradeClass && (
                        <p className="text-[10px] text-destructive font-medium">{academicForm.formState.errors.gradeClass.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="academic-goals" className="text-xs font-semibold">Mục tiêu học tập</Label>
                  <textarea
                    id="academic-goals"
                    placeholder="Mục tiêu của bạn (ví dụ: đạt điểm thi học sinh giỏi, nâng cao kỹ năng lập trình web...)"
                    rows={3}
                    className="flex w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-primary/20 outline-none resize-none"
                    {...academicForm.register("learningGoals")}
                  />
                  {academicForm.formState.errors.learningGoals && (
                    <p className="text-[10px] text-destructive font-medium">{academicForm.formState.errors.learningGoals.message}</p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" className="font-bold bg-primary hover:bg-primary/95 shadow-md shadow-primary/10" disabled={academicStatus.loading}>
                    {academicStatus.loading ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 3. THÔNG TIN NGƯỜI GIÁM HỘ */}
          <Card id="sec-guardian" className="border-border shadow-sm bg-card transition-all">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <span>Thông tin người giám hộ</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Cung cấp thông tin của phụ huynh hoặc người bảo hộ để liên lạc khi cần thiết.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {guardianStatus.success && (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-xs text-green-600 mb-4">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                  <span>{guardianStatus.success}</span>
                </div>
              )}
              {guardianStatus.error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive mb-4">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{guardianStatus.error}</span>
                </div>
              )}

              <form onSubmit={guardianForm.handleSubmit(onGuardianSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="guard-name" className="text-xs font-semibold">Họ tên người giám hộ</Label>
                    <Input id="guard-name" placeholder="Nguyễn Văn B" {...guardianForm.register("guardianName")} />
                    {guardianForm.formState.errors.guardianName && (
                      <p className="text-[10px] text-destructive font-medium">{guardianForm.formState.errors.guardianName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guard-phone" className="text-xs font-semibold">Số điện thoại liên hệ</Label>
                    <Input id="guard-phone" placeholder="0988888888" {...guardianForm.register("guardianPhone")} />
                    {guardianForm.formState.errors.guardianPhone && (
                      <p className="text-[10px] text-destructive font-medium">{guardianForm.formState.errors.guardianPhone.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" className="font-bold bg-primary hover:bg-primary/95 shadow-md shadow-primary/10" disabled={guardianStatus.loading}>
                    {guardianStatus.loading ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 4. ĐỔI MẬT KHẨU */}
          <Card id="sec-password" className="border-border shadow-sm bg-card transition-all">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <span>Cài đặt đổi mật khẩu</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Hãy đổi mật khẩu thường xuyên để tăng cường tính bảo mật cho tài khoản.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {passwordStatus.success && (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-xs text-green-600 mb-4">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                  <span>{passwordStatus.success}</span>
                </div>
              )}
              {passwordStatus.error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive mb-4">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{passwordStatus.error}</span>
                </div>
              )}

              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pass-old" className="text-xs font-semibold">Mật khẩu cũ</Label>
                  <div className="relative">
                    <Input
                      id="pass-old"
                      type={showOldPass ? "text" : "password"}
                      placeholder="••••••••"
                      {...passwordForm.register("oldPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPass(!showOldPass)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showOldPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.oldPassword && (
                    <p className="text-[10px] text-destructive font-medium">{passwordForm.formState.errors.oldPassword.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pass-new" className="text-xs font-semibold">Mật khẩu mới</Label>
                    <div className="relative">
                      <Input
                        id="pass-new"
                        type={showNewPass ? "text" : "password"}
                        placeholder="••••••••"
                        {...passwordForm.register("newPassword")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-[10px] text-destructive font-medium">{passwordForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pass-confirm" className="text-xs font-semibold">Xác nhận mật khẩu mới</Label>
                    <Input
                      id="pass-confirm"
                      type="password"
                      placeholder="••••••••"
                      {...passwordForm.register("confirmPassword")}
                    />
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-[10px] text-destructive font-medium">{passwordForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" className="font-bold bg-primary hover:bg-primary/95 shadow-md shadow-primary/10" disabled={passwordStatus.loading}>
                    {passwordStatus.loading ? "Đang đổi..." : "Thay đổi mật khẩu"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
};
