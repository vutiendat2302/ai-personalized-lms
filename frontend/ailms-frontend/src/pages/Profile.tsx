import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/userService";
import { authService } from "@/services/authService";
import { departmentApi, type DepartmentResponse } from "@/api/departments/departmentApi";
import type { UserEntity } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DatePickerInput, { formatDateDisplay } from "@/components/ui/DatePickerInput";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  ShieldAlert,
  GraduationCap,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  Camera,
  Trash2,
  Briefcase,
  Award,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ShieldCheck,
  Loader2,
  Scissors,
  Move,
  Plus,
  Pencil,
  Flame,
  Trophy,
  Tag,
  Calendar,
  Check,
  X,
} from "lucide-react";

// ==========================================
// GUARDIAN INTERFACE (GuardianEntity)
// ==========================================
export interface GuardianItem {
  id?: string;
  fullName: string;
  relationship: "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
  phone: string;
  email: string;
  address: string;
}

// ==========================================
// FORM SCHEMAS (MAP VỚI ĐÚNG ENTITY CSDL)
// ==========================================

// Helper: trích xuất message lỗi từ Axios error (BE trả về)
const extractBeError = (e: unknown, fallback: string): string => {
  if (e && typeof e === "object") {
    const err = e as any;
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message;
    if (msg && typeof msg === "string" && msg.trim()) return msg.trim();
  }
  return fallback;
};

const resolveBackendUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url) || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  const base = (import.meta.env.VITE_BE_URL || "").replace(/\/$/, "");
  if (!base) return url.startsWith("/v1/") ? `/api${url}` : url;
  const normalized = url.startsWith("/") ? url : `/${url}`;
  if (base.endsWith("/api") && normalized.startsWith("/api/")) {
    return `${base.slice(0, -4)}${normalized}`;
  }
  return `${base}${normalized}`;
};

/** Thêm phiên bản cập nhật để trình duyệt không giữ ảnh avatar cũ trong cache. */
const resolveAvatarUrl = (url?: string | null, version?: string | null): string | undefined => {
  const resolved = resolveBackendUrl(url);
  if (!resolved) return undefined;
  if (!version) return resolved;
  return `${resolved}${resolved.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
};

const displayText = (value?: string | number | null): string => {
  if (value === null || value === undefined) return "Không có";
  if (typeof value === "string" && !value.trim()) return "Không có";
  return String(value);
};

// 1. Basic Info Schema (UserEntity: fullName, phone, dateOfBirth, gender)
const basicInfoSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Họ và tên phải chứa ít nhất 2 ký tự")
    .max(100, "Họ và tên không được vượt quá 100 ký tự"),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(val) || /^[0-9+\s().-]{8,20}$/.test(val),
      { message: "Số điện thoại không hợp lệ (VD: 0988888888 hoặc 10 chữ số)" }
    ),
  dateOfBirth: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        if (isNaN(d.getTime())) return false;
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return d <= today;
      },
      { message: "Ngày sinh phải nhỏ hơn hoặc bằng ngày hiện tại" }
    ),
  gender: z.string().optional(),
});

// 2. StudentProfileEntity Schema (Dành cho Học viên)
const studentProfileSchema = z.object({
  educationLevel: z.string().optional(),
  schoolName: z.string().max(255, "Tên trường không được vượt quá 255 ký tự").optional(),
  goal: z.string().max(1000, "Mục tiêu học tập không được vượt quá 1000 ký tự").optional(),
  description: z.string().max(2000, "Mô tả không được vượt quá 2000 ký tự").optional(),
  isMinor: z.boolean(),
});

// 3. EmployeeEntity Schema (Dùng chung cho Teacher, TA, HR, Support, Admin)
const employeeProfileSchema = z.object({
  employeeCode: z.string().optional(),
  departmentId: z.string().optional(),
  position: z.string().max(100, "Chức vụ không được vượt quá 100 ký tự").optional(),
  employmentTypeEnum: z.union([z.enum(["FULL_TIME", "PART_TIME"]), z.literal("")]).optional(),
  startDate: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        return !isNaN(d.getTime());
      },
      { message: "Ngày vào làm không hợp lệ" }
    ),
  address: z.string().max(255, "Địa chỉ không được vượt quá 255 ký tự").optional(),
});

// 4. GuardianEntity Schema (Người giám hộ cho học viên chưa thành niên)
export const guardianSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Họ và tên người giám hộ phải có ít nhất 2 ký tự")
    .max(255, "Họ và tên không được vượt quá 255 ký tự"),
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "OTHER"]),
  phone: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số điện thoại người giám hộ")
    .refine(
      (val) => /^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(val) || /^[0-9+\s().-]{8,20}$/.test(val),
      { message: "Số điện thoại không hợp lệ (VD: 0988888888)" }
    ),
  email: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Email người giám hộ không đúng định dạng",
    }),
  address: z.string().max(255, "Địa chỉ không được vượt quá 255 ký tự").optional(),
});

// 5. Change Password Schema
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

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { auth, updateCurrentUser } = useAuth();
  const [profile, setProfile] = useState<UserEntity | null>(null);

  // Profile Type: "STUDENT" hoặc "EMPLOYEE" (Giảng viên, TA, HR, Support, Admin)
  const [profileCategory, setProfileCategory] = useState<"STUDENT" | "EMPLOYEE">("STUDENT");
  const [roleTitle, setRoleTitle] = useState<string>("Học Viên");

  // Departments list from API for dropdown
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);

  // Notifications
  const [basicStatus, setBasicStatus] = useState({ success: "", error: "", loading: false });
  const [roleInfoStatus, setRoleInfoStatus] = useState({ success: "", error: "", loading: false });
  const [passwordStatus, setPasswordStatus] = useState({ success: "", error: "", loading: false });
  const [avatarStatus, setAvatarStatus] = useState({ success: "", error: "", loading: false });
  const [avatarVersion, setAvatarVersion] = useState<string>();

  // Password visibility
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Active section tracking
  const [activeTab, setActiveTab] = useState("avatar");

  // Avatar Detail Modal (Zoom & Rotation)
  const [avatarDetailOpen, setAvatarDetailOpen] = useState(false);
  const [detailZoom, setDetailZoom] = useState(1);
  const [detailRotate, setDetailRotate] = useState(0);

  // Avatar Cropper Modal
  const [avatarEditOpen, setAvatarEditOpen] = useState(false);

  // Guardian List State (GuardianEntity 1-to-N list for isMinor = true)
  const [guardians, setGuardians] = useState<GuardianItem[]>([]);
  const [guardianModalOpen, setGuardianModalOpen] = useState(false);
  const [editingGuardianIndex, setEditingGuardianIndex] = useState<number | null>(null);
  const [guardianForm, setGuardianForm] = useState<GuardianItem>({
    fullName: "",
    relationship: "FATHER",
    phone: "",
    email: "",
    address: "",
  });

  // Readonly StudentProfile stats & interests
  const [studentStats, setStudentStats] = useState({
    studentCode: null as string | null,
    hasGoal: null as boolean | null,
    currentStreak: null as number | null,
    longestStreak: null as number | null,
    interests: [] as string[],
  });

  // Readonly Employee stats (endDate & status)
  const [employeeStats, setEmployeeStats] = useState({
    departmentName: null as string | null,
    endDate: null as string | null,
    status: "ACTIVE",
  });

  // Readonly Teacher Categories (TeacherCategoryEntity)
  const [teacherCategories, setTeacherCategories] = useState<string[]>([]);

  // Interactive Avatar Cropper States (Zoom + Rotate + Drag Pan)
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>("");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Pointer Drag Tracking References
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // ==========================================
  // FORMS INITIALIZATION
  // ==========================================
  const basicForm = useForm<z.infer<typeof basicInfoSchema>>({
    resolver: zodResolver(basicInfoSchema),
    mode: "onTouched",
    defaultValues: { fullName: "", phone: "", dateOfBirth: "", gender: "" },
  });

  const studentForm = useForm<z.infer<typeof studentProfileSchema>>({
    resolver: zodResolver(studentProfileSchema),
    mode: "onTouched",
    defaultValues: {
      educationLevel: "",
      schoolName: "",
      goal: "",
      description: "",
      isMinor: false,
    },
  });

  const employeeForm = useForm<z.infer<typeof employeeProfileSchema>>({
    resolver: zodResolver(employeeProfileSchema),
    mode: "onTouched",
    defaultValues: {
      employeeCode: "",
      departmentId: "",
      position: "",
      employmentTypeEnum: "",
      startDate: "",
      address: "",
    },
  });

  const passwordForm = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  const [guardianErrors, setGuardianErrors] = useState<Record<string, string>>({});

  const profileNewPass = passwordForm.watch("newPassword") || "";
  const profileConfirmPass = passwordForm.watch("confirmPassword") || "";
  const profileHasMinLen = profileNewPass.length >= 6;
  const profileHasUpper = /[A-Z]/.test(profileNewPass);
  const profileHasLower = /[a-z]/.test(profileNewPass);
  const profileHasDigit = /[0-9]/.test(profileNewPass);
  const profileHasNoSpace = /^\S+$/.test(profileNewPass) && profileNewPass.length > 0;
  const isAllProfilePassCriteriaMet =
    profileHasMinLen && profileHasUpper && profileHasLower && profileHasDigit && profileHasNoSpace;

  // Watch isMinor for conditional Guardian list rendering
  const isMinorValue = studentForm.watch("isMinor");
  const isAdminProfile = auth?.user?.roles?.some((role: string) => role.toUpperCase().includes("ADMIN"));

  // Load profile and departments on mount
  useEffect(() => {
    fetchProfile();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await departmentApi.getAllDepartments();
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      setDepartments(list);
    } catch (e) {
      console.warn("Failed to fetch departments list:", e);
      setDepartments([]);
    }
  };

  // Strictly categorize user profile: STUDENT vs EMPLOYEE (Teacher, TA, HR, Support, Admin)
  const detectCategoryAndTitle = (userData: any, authState: any) => {
    const rolesList = authState?.user?.roles || userData?.roles || [];
    const roleStr = JSON.stringify(rolesList).toUpperCase();

    if (roleStr.includes("ADMIN")) {
      setRoleTitle("Quản Trị Viên");
      return "EMPLOYEE";
    }
    if (roleStr.includes("TEACHER")) {
      setRoleTitle("Giảng Viên");
      return "EMPLOYEE";
    }
    if (roleStr.includes("TA")) {
      setRoleTitle("Trợ Giảng");
      return "EMPLOYEE";
    }
    if (roleStr.includes("HR")) {
      setRoleTitle("Nhân Sự");
      return "EMPLOYEE";
    }
    if (roleStr.includes("SUPPORT")) {
      setRoleTitle("Nhân Viên Hỗ Trợ");
      return "EMPLOYEE";
    }
    setRoleTitle("Học Viên");
    return "STUDENT";
  };

  const fetchProfile = async () => {
    const data = await userService.getProfile();
    setProfile(data);

    // Detect profile category (STUDENT vs EMPLOYEE)
    const category = detectCategoryAndTitle(data, auth);
    setProfileCategory(category);

    // Format dateOfBirth to YYYY-MM-DD for HTML input
    const formattedDob = data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : "";

    // Hydrate basic form (UserEntity)
    basicForm.reset({
      fullName: data.fullName || "",
      phone: data.phone || "",
      dateOfBirth: formattedDob,
      gender: data.gender === null || data.gender === undefined ? "" : String(data.gender),
    });

    // Hydrate role attributes & entities
    if (data.attributes) {
      try {
        const attrs = JSON.parse(data.attributes);

        if (category === "STUDENT") {
          studentForm.reset({
            educationLevel: attrs.educationLevel || "",
            schoolName: attrs.schoolName || "",
            goal: attrs.goal || "",
            description: attrs.description || "",
            isMinor: !!attrs.isMinor,
          });

          setStudentStats({
            studentCode: attrs.studentCode || null,
            hasGoal: attrs.hasGoal !== undefined ? attrs.hasGoal : null,
            currentStreak: attrs.currentStreak !== undefined ? attrs.currentStreak : null,
            longestStreak: attrs.longestStreak !== undefined ? attrs.longestStreak : null,
            interests: Array.isArray(attrs.interests)
              ? attrs.interests.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
              : [],
          });

          if (attrs.guardians && Array.isArray(attrs.guardians)) {
            setGuardians(attrs.guardians);
          } else {
            setGuardians([]);
          }
        } else {
          // EMPLOYEE (Teacher, TA, HR, Support, Admin share EmployeeEntity)
          employeeForm.reset({
            employeeCode: attrs.employeeCode || "",
            departmentId: attrs.departmentId ? String(attrs.departmentId) : "",
            position: attrs.position || "",
            employmentTypeEnum: attrs.employmentTypeEnum || "",
            startDate: attrs.startDate ? attrs.startDate.slice(0, 10) : "",
            address: attrs.address || "",
          });

          setEmployeeStats({
            departmentName: attrs.departmentName || null,
            endDate: attrs.endDate ? attrs.endDate.slice(0, 10) : null,
            status: attrs.status || null,
          });

          if (attrs.categories) {
            setTeacherCategories(Array.isArray(attrs.categories)
              ? attrs.categories.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
              : []);
          } else {
            setTeacherCategories([]);
          }
        }
      } catch (e) {
        console.error("Failed to parse attributes JSON:", e);
      }
    }
  };

  // ==========================================
  // SUBMIT HANDLERS
  // ==========================================

  /** Xử lý submit thông tin cá nhân cơ bản (UserEntity) */
  const onBasicSubmit = async (data: z.infer<typeof basicInfoSchema>) => {
    setBasicStatus({ success: "", error: "", loading: true });
    try {
      const updated = await userService.updateBasicProfile({
        fullName: data.fullName,
        phone: data.phone || "",
        dateOfBirth: data.dateOfBirth || undefined,
        gender: data.gender !== "" && data.gender !== undefined ? parseInt(data.gender) : undefined,
      });
      setProfile(updated);
      setAvatarVersion(String(Date.now()));
      updateCurrentUser({ fullName: updated.fullName || undefined });
      await fetchProfile();
      setBasicStatus({ success: "Đã lưu thông tin cá nhân cơ bản thành công!", error: "", loading: false });
      setTimeout(() => setBasicStatus((s) => ({ ...s, success: "" })), 3500);
    } catch (e) {
      setBasicStatus({ success: "", error: extractBeError(e, "Lỗi lưu thông tin cá nhân. Vui lòng thử lại."), loading: false });
    }
  };

  /** Xử lý submit hồ sơ vai trò (Học viên / Cán bộ nhân sự) */
  const onRoleInfoSubmit = async (formData: any) => {
    setRoleInfoStatus({ success: "", error: "", loading: true });
    try {
      if (isAdminProfile) {
        if (!formData.departmentId || !String(formData.departmentId).trim()) {
          setRoleInfoStatus({ success: "", error: "Vui lòng chọn phòng ban.", loading: false });
          employeeForm.setError("departmentId", { message: "Vui lòng chọn phòng ban" });
          return;
        }
        if (!formData.position || !String(formData.position).trim()) {
          setRoleInfoStatus({ success: "", error: "Vui lòng nhập chức vụ / vị trí công tác.", loading: false });
          employeeForm.setError("position", { message: "Vui lòng nhập chức vụ / vị trí" });
          return;
        }
        if (!formData.employmentTypeEnum) {
          setRoleInfoStatus({ success: "", error: "Vui lòng chọn loại hình làm việc.", loading: false });
          employeeForm.setError("employmentTypeEnum", { message: "Vui lòng chọn loại hình làm việc" });
          return;
        }
        if (!formData.startDate) {
          setRoleInfoStatus({ success: "", error: "Vui lòng chọn ngày vào làm.", loading: false });
          employeeForm.setError("startDate", { message: "Vui lòng chọn ngày vào làm" });
          return;
        }
      }

      const payload =
        profileCategory === "STUDENT"
          ? { ...formData, guardians }
          : isAdminProfile
            ? {
                ...formData,
                departmentId: formData.departmentId ? Number(formData.departmentId) : undefined,
                employmentTypeEnum: formData.employmentTypeEnum || undefined,
              }
            : { address: formData.address };

      const updated =
        profileCategory === "EMPLOYEE" && !isAdminProfile
          ? await userService.updateEmployeeAddress(formData.address || "")
          : await userService.updateRoleProfile(payload);
      setProfile(updated);
      await fetchProfile();
      setRoleInfoStatus({ success: "Cập nhật hồ sơ thành công!", error: "", loading: false });
      setTimeout(() => setRoleInfoStatus((s) => ({ ...s, success: "" })), 3500);
    } catch (e) {
      setRoleInfoStatus({ success: "", error: extractBeError(e, "Lỗi lưu hồ sơ. Vui lòng thử lại."), loading: false });
    }
  };

  // 3. Guardian CRUD Actions (GuardianEntity List)

  /** Mở modal thêm người giám hộ */
  const handleOpenAddGuardian = () => {
    setEditingGuardianIndex(null);
    setGuardianErrors({});
    setGuardianForm({
      fullName: "",
      relationship: "FATHER",
      phone: "",
      email: "",
      address: "",
    });
    setGuardianModalOpen(true);
  };

  /** Mở modal chỉnh sửa người giám hộ */
  const handleOpenEditGuardian = (index: number) => {
    setEditingGuardianIndex(index);
    setGuardianErrors({});
    setGuardianForm({ ...guardians[index] });
    setGuardianModalOpen(true);
  };

  /** Lưu người giám hộ sau khi kiểm tra hợp lệ */
  const handleSaveGuardian = async () => {
    const parseResult = guardianSchema.safeParse(guardianForm);
    if (!parseResult.success) {
      const errMap: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        const fieldName = issue.path[0];
        if (fieldName) {
          errMap[String(fieldName)] = issue.message;
        }
      });
      setGuardianErrors(errMap);
      return;
    }
    setGuardianErrors({});

    let updatedList = [...guardians];
    if (editingGuardianIndex !== null) {
      updatedList[editingGuardianIndex] = guardianForm;
    } else {
      updatedList.push(guardianForm);
    }
    try {
      const updated = await userService.updateRoleProfile({ ...studentForm.getValues(), guardians: updatedList });
      setProfile(updated);
      setGuardians(updatedList);
      setGuardianModalOpen(false);
      setRoleInfoStatus({ success: "Đã lưu thông tin người giám hộ thành công!", error: "", loading: false });
      setTimeout(() => setRoleInfoStatus((s) => ({ ...s, success: "" })), 3000);
    } catch (e) {
      setRoleInfoStatus({ success: "", error: extractBeError(e, "Lỗi lưu thông tin người giám hộ."), loading: false });
    }
  };

  const handleDeleteGuardian = async (index: number) => {
    const updatedList = guardians.filter((_, i) => i !== index);
    try {
      const updated = await userService.updateRoleProfile({ ...studentForm.getValues(), guardians: updatedList });
      setProfile(updated);
      setGuardians(updatedList);
    } catch (e) {
      setRoleInfoStatus({ success: "", error: extractBeError(e, "Lỗi xóa người giám hộ."), loading: false });
    }
  };

  // 4. Avatar Upload & Interactive Cropper
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedAvatarFile(file);
      const preview = URL.createObjectURL(file);
      setAvatarPreviewUrl(preview);
      setZoomLevel(1);
      setRotationAngle(0);
      setPanOffset({ x: 0, y: 0 });
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panOffset };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanOffset({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const generateCroppedBlob = async (
    imageSrc: string,
    zoom: number,
    rotation: number,
    panX: number,
    panY: number
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageSrc;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 400; // Output 400x400 HD Avatar
        const containerSize = 256; // 256px UI Container
        const scaleFactor = size / containerSize;

        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas Error"));

        ctx.save();
        ctx.translate(size / 2 + panX * scaleFactor, size / 2 + panY * scaleFactor);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);

        const aspect = img.width / img.height;
        let drawW = size;
        let drawH = size;
        if (aspect > 1) drawH = size / aspect;
        else drawW = size * aspect;

        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Không thể cắt ảnh"));
        }, "image/jpeg", 0.92);
      };
      img.onerror = (e) => reject(e);
    });
  };

  const handleUploadAndSaveAvatar = async () => {
    if (!selectedAvatarFile || !avatarPreviewUrl) {
      setAvatarStatus({ success: "", error: "Vui lòng chọn file ảnh để tải lên!", loading: false });
      return;
    }

    setUploadingAvatar(true);
    setAvatarStatus({ success: "", error: "", loading: true });
    try {
      const blob = await generateCroppedBlob(avatarPreviewUrl, zoomLevel, rotationAngle, panOffset.x, panOffset.y);
      const croppedFile = new File([blob], `avatar_${Date.now()}.jpg`, { type: "image/jpeg" });

      const updated = await userService.uploadAvatar(croppedFile);

      setProfile(updated);
      const nextAvatarVersion = String(Date.now());
      setAvatarVersion(nextAvatarVersion);
      updateCurrentUser({
        avatarUrl: updated.avatarUrl
          ? `${updated.avatarUrl}${updated.avatarUrl.includes("?") ? "&" : "?"}v=${nextAvatarVersion}`
          : null,
      });
      setAvatarStatus({ success: "Cập nhật ảnh đại diện thành công!", error: "", loading: false });
      setAvatarEditOpen(false);
      setSelectedAvatarFile(null);
      setAvatarPreviewUrl("");
      setTimeout(() => setAvatarStatus((s) => ({ ...s, success: "" })), 3500);
    } catch (e) {
      console.error("Lỗi upload avatar:", e);
      setAvatarStatus({ success: "", error: extractBeError(e, "Tải lên ảnh thất bại. Vui lòng thử lại."), loading: false });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setAvatarStatus({ success: "", error: "", loading: true });
    try {
      const updated = await userService.deleteAvatar();
      setProfile(updated);
      setAvatarVersion(String(Date.now()));
      updateCurrentUser({ avatarUrl: null });
      setAvatarStatus({ success: "Đã xóa ảnh đại diện thành công!", error: "", loading: false });
      setTimeout(() => setAvatarStatus((s) => ({ ...s, success: "" })), 3000);
    } catch (e) {
      setAvatarStatus({ success: "", error: extractBeError(e, "Lỗi xóa ảnh đại diện. Vui lòng thử lại."), loading: false });
    }
  };

  // Change Password Submit
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
    } catch (e) {
      setPasswordStatus({ success: "", error: extractBeError(e, "Đổi mật khẩu thất bại. Vui lòng kiểm tra mật khẩu cũ."), loading: false });
    }
  };

  const scrollTo = (id: string, tab: string) => {
    setActiveTab(tab);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const renderRoleBadge = () => {
    if (roleTitle.includes("Admin")) return <Badge className="bg-red-600 text-white font-bold text-xs gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {roleTitle}</Badge>;
    if (roleTitle.includes("Giảng Viên")) return <Badge className="bg-blue-600 text-white font-bold text-xs gap-1"><Award className="h-3.5 w-3.5" /> {roleTitle}</Badge>;
    if (roleTitle.includes("Trợ Giảng")) return <Badge className="bg-cyan-600 text-white font-bold text-xs gap-1"><Award className="h-3.5 w-3.5" /> {roleTitle}</Badge>;
    if (roleTitle.includes("Nhân Sự")) return <Badge className="bg-purple-600 text-white font-bold text-xs gap-1"><Briefcase className="h-3.5 w-3.5" /> {roleTitle}</Badge>;
    if (roleTitle.includes("Hỗ Trợ")) return <Badge className="bg-indigo-600 text-white font-bold text-xs gap-1"><Briefcase className="h-3.5 w-3.5" /> {roleTitle}</Badge>;
    return <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1"><GraduationCap className="h-3.5 w-3.5" /> {roleTitle}</Badge>;
  };

  const getRelationshipLabel = (rel: string) => {
    if (rel === "FATHER") return "Bố";
    if (rel === "MOTHER") return "Mẹ";
    if (rel === "GUARDIAN") return "Người giám hộ";
    return "Khác";
  };

  return (
    <div className="mx-auto max-w-none w-full px-6 py-8 lg:px-12 space-y-8 animate-in fade-in-50 duration-300">

      {/* Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="h-8 px-2.5 text-xs font-bold gap-1.5 rounded-xl border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3 mt-1">
            <User className="h-7 w-7 text-primary" />
            <span>Thông tin tài khoản</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {renderRoleBadge()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* CỘT TRÁI: DANH MỤC ĐIỀU HƯỚNG NHANH */}
        <div className="lg:col-span-1 space-y-4">
          <nav className="flex flex-col gap-1.5 text-sm font-medium sticky top-20">
            <button
              onClick={() => scrollTo("sec-avatar", "avatar")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                activeTab === "avatar"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Camera className="h-4.5 w-4.5" />
              <span>Ảnh đại diện</span>
            </button>

            <button
              onClick={() => scrollTo("sec-basic", "basic")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                activeTab === "basic"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <User className="h-4.5 w-4.5" />
              <span>Thông tin cơ bản</span>
            </button>

            <button
              onClick={() => scrollTo("sec-role-info", "role-info")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                activeTab === "role-info"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {profileCategory === "STUDENT" ? <GraduationCap className="h-4.5 w-4.5" /> : <Briefcase className="h-4.5 w-4.5" />}
              <span>
                {profileCategory === "STUDENT" ? "Hồ sơ học viên" : "Hồ sơ công tác"}
              </span>
            </button>

            <button
              onClick={() => scrollTo("sec-password", "password")}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                activeTab === "password"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <KeyRound className="h-4.5 w-4.5" />
              <span>Đổi mật khẩu</span>
            </button>
          </nav>
        </div>

        {/* CỘT PHẢI: CÁC KHUNG THÔNG TIN HỒ SƠ */}
        <div className="lg:col-span-3 space-y-8">

          {/* KHUNG 1: ẢNH ĐẠI DIỆN */}
          <Card id="sec-avatar" className="border-border shadow-sm bg-card transition-all">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                <span>Ảnh đại diện</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6">
              {avatarStatus.success && (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-xs text-green-600 mb-4">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                  <span>{avatarStatus.success}</span>
                </div>
              )}
              {avatarStatus.error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive mb-4">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{avatarStatus.error}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-muted/20 p-5 rounded-2xl border border-border/40">
                <div className="flex items-center gap-5">
                  <div
                    onClick={() => setAvatarDetailOpen(true)}
                    className="relative group cursor-pointer"
                    title="Xem ảnh kích thước lớn"
                  >
                    <Avatar className="h-24 w-24 border-4 border-primary/20 group-hover:border-primary/60 transition-all shadow-md">
                      <AvatarImage src={resolveAvatarUrl(profile?.avatarUrl, avatarVersion || profile?.updatedAt)} />
                      <AvatarFallback className="bg-primary/10 text-primary font-extrabold uppercase text-2xl">
                        {profile?.username.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="h-6 w-6 text-white" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-lg text-foreground">{profile?.fullName || profile?.username}</h3>
                      {renderRoleBadge()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{profile?.email}</p>
                  </div>
                </div>

                {/* Các nút thao tác ảnh */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAvatarDetailOpen(true)}
                    className="text-xs font-bold gap-1.5 rounded-xl border-border/50"
                  >
                    <ZoomIn className="h-3.5 w-3.5 text-primary" />
                    <span>Xem ảnh lớn</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setAvatarEditOpen(true)}
                    className="text-xs font-bold gap-1.5 rounded-xl bg-primary text-primary-foreground"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{profile?.avatarUrl ? "Đổi ảnh" : "Tải ảnh lên"}</span>
                  </Button>

                  {profile?.avatarUrl && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDeleteAvatar}
                      className="text-xs font-bold gap-1.5 rounded-xl"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa ảnh</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KHUNG 2: THÔNG TIN CÁ NHÂN CƠ BẢN */}
          <Card id="sec-basic" className="border-border shadow-sm bg-card transition-all">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <span>Thông tin cơ bản</span>
              </CardTitle>
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
                    <Label htmlFor="basic-fullName" className="text-xs font-semibold">Họ và tên *</Label>
                    <Input id="basic-fullName" placeholder="Nhập họ và tên đầy đủ" {...basicForm.register("fullName")} />
                    {basicForm.formState.errors.fullName && (
                      <p className="text-xs text-destructive font-medium mt-1">{basicForm.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="basic-email" className="text-xs font-semibold">Email tài khoản</Label>
                    <Input id="basic-email" value={profile?.email || ""} disabled className="bg-muted/50 cursor-not-allowed" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="basic-phone" className="text-xs font-semibold">Số điện thoại</Label>
                    <Input id="basic-phone" placeholder="0988888888" {...basicForm.register("phone")} />
                    {basicForm.formState.errors.phone && (
                      <p className="text-xs text-destructive font-medium mt-1">{basicForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="basic-dob" className="text-xs font-semibold">Ngày sinh</Label>
                    <DatePickerInput
                      value={basicForm.watch("dateOfBirth")}
                      onChange={(value) => basicForm.setValue("dateOfBirth", value, { shouldDirty: true, shouldValidate: true })}
                      placeholder="dd/mm/yyyy"
                    />
                    {basicForm.formState.errors.dateOfBirth && (
                      <p className="text-xs text-destructive font-medium mt-1">{basicForm.formState.errors.dateOfBirth.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="basic-gender" className="text-xs font-semibold">Giới tính</Label>
                    <Select
                      value={basicForm.watch("gender") ?? "NONE"}
                      onValueChange={(val) => {
                        const actualVal = val === "NONE" ? "" : val;
                        basicForm.setValue("gender", actualVal, { shouldDirty: true, shouldValidate: true });
                      }}
                    >
                      <SelectTrigger id="basic-gender" className="h-10 w-full rounded-lg">
                        <SelectValue placeholder="Chọn giới tính" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Không có</SelectItem>
                        <SelectItem value="0">Nam</SelectItem>
                        <SelectItem value="1">Nữ</SelectItem>
                        <SelectItem value="2">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                    {basicForm.formState.errors.gender && (
                      <p className="text-xs text-destructive font-medium mt-1">{basicForm.formState.errors.gender.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    className="font-bold bg-primary text-primary-foreground cursor-pointer"
                    disabled={basicStatus.loading}
                  >
                    {basicStatus.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      "Lưu thông tin"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* KHUNG 3: THÔNG TIN THEO HỒ SƠ */}
          <Card id="sec-role-info" className="border-border shadow-sm bg-card transition-all">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                {profileCategory === "STUDENT" ? <GraduationCap className="h-5 w-5 text-emerald-600" /> : <Briefcase className="h-5 w-5 text-blue-600" />}
                <span>
                  {profileCategory === "STUDENT" ? "Hồ sơ học viên" : `Hồ sơ công tác - ${roleTitle}`}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {roleInfoStatus.success && (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-xs text-green-600">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                  <span>{roleInfoStatus.success}</span>
                </div>
              )}
              {roleInfoStatus.error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{roleInfoStatus.error}</span>
                </div>
              )}

              {/* ==========================================
                  HỒ SƠ 1: DÀNH CHO HỌC VIÊN
                  ========================================== */}
              {profileCategory === "STUDENT" && (
                <div className="space-y-6 animate-in fade-in-50">

                  {/* THÔNG SỐ HỌC TẬP */}
                  <div className="p-4 bg-muted/20 rounded-2xl border border-border/40 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Mã học viên</span>
                        <div className="font-extrabold text-base text-foreground font-mono mt-0.5">{displayText(studentStats.studentCode)}</div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 font-bold border-emerald-300 gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mục tiêu: {studentStats.hasGoal === null ? "Không có" : (studentStats.hasGoal ? "Đã đặt" : "Chưa đặt")}
                        </Badge>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 font-bold border-amber-300 gap-1">
                          <Flame className="h-3.5 w-3.5" /> Chuỗi hiện tại: {studentStats.currentStreak === null ? "Không có" : `${studentStats.currentStreak} ngày`}
                        </Badge>
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 font-bold border-purple-300 gap-1">
                          <Trophy className="h-3.5 w-3.5" /> Chuỗi kỷ lục: {studentStats.longestStreak === null ? "Không có" : `${studentStats.longestStreak} ngày`}
                        </Badge>
                      </div>
                    </div>

                    {/* Lĩnh vực quan tâm */}
                    {studentStats.interests.length > 0 ? (
                      <div className="pt-2 border-t border-border/30 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5" /> Lĩnh vực quan tâm:
                        </span>
                        {studentStats.interests.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[11px] font-medium bg-primary/10 text-primary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-border/30 text-xs text-muted-foreground">
                        Lĩnh vực quan tâm: Không có
                      </div>
                    )}
                  </div>

                  {/* FORM HỌC VIÊN */}
                  <form onSubmit={studentForm.handleSubmit(onRoleInfoSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Trình độ học vấn</Label>
                        <Select
                          value={studentForm.watch("educationLevel") || "NONE"}
                          onValueChange={(val) => {
                            const actualVal = val === "NONE" ? "" : val;
                            studentForm.setValue("educationLevel", actualVal, { shouldDirty: true, shouldValidate: true });
                          }}
                        >
                          <SelectTrigger className="h-10 w-full rounded-lg">
                            <SelectValue placeholder="Chọn trình độ học vấn" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">Không có</SelectItem>
                            <SelectItem value="Học sinh THCS">Học sinh THCS</SelectItem>
                            <SelectItem value="Học sinh THPT">Học sinh THPT</SelectItem>
                            <SelectItem value="Đại học">Đại học</SelectItem>
                            <SelectItem value="Sau đại học">Sau đại học</SelectItem>
                            <SelectItem value="Người đi làm">Người đi làm</SelectItem>
                          </SelectContent>
                        </Select>
                        {studentForm.formState.errors.educationLevel && (
                          <p className="text-xs text-destructive font-medium mt-1">{studentForm.formState.errors.educationLevel.message}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Trường học</Label>
                        <Input placeholder="Nhập tên trường học hoặc cơ sở đào tạo" {...studentForm.register("schoolName")} />
                        {studentForm.formState.errors.schoolName && (
                          <p className="text-xs text-destructive font-medium mt-1">{studentForm.formState.errors.schoolName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Mục tiêu học tập</Label>
                      <textarea
                        rows={2}
                        placeholder="Nhập mục tiêu học tập..."
                        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none resize-none"
                        {...studentForm.register("goal")}
                      />
                      {studentForm.formState.errors.goal && (
                        <p className="text-xs text-destructive font-medium mt-1">{studentForm.formState.errors.goal.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Giới thiệu bản thân</Label>
                      <textarea
                        rows={2}
                        placeholder="Mô tả ngắn gọn về bản thân hoặc định hướng học tập..."
                        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none resize-none"
                        {...studentForm.register("description")}
                      />
                      {studentForm.formState.errors.description && (
                        <p className="text-xs text-destructive font-medium mt-1">{studentForm.formState.errors.description.message}</p>
                      )}
                    </div>

                    {/* CHECKBOX DÀNH CHO HỌC VIÊN CHƯA THÀNH NIÊN */}
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/40">
                      <input
                        type="checkbox"
                        id="chk-isMinor"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        {...studentForm.register("isMinor")}
                      />
                      <label htmlFor="chk-isMinor" className="text-xs font-semibold text-foreground cursor-pointer">
                        Học viên là người chưa thành niên (dưới 18 tuổi)
                      </label>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        className="font-bold bg-primary text-primary-foreground cursor-pointer"
                        disabled={roleInfoStatus.loading}
                      >
                        {roleInfoStatus.loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang lưu...
                          </>
                        ) : (
                          "Lưu thông tin"
                        )}
                      </Button>
                    </div>
                  </form>

                  {/* DANH SÁCH NGƯỜI GIÁM HỘ (KHI HỌC VIÊN DƯỚI 18 TUỔI) */}
                  {isMinorValue && (
                    <div className="pt-4 border-t border-border/40 space-y-4 animate-in fade-in-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-amber-600 flex items-center gap-1.5 uppercase">
                            <ShieldAlert className="h-4 w-4" /> Người giám hộ
                          </h4>
                        </div>

                        <Button
                          size="sm"
                          onClick={handleOpenAddGuardian}
                          className="text-xs font-bold gap-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Thêm người giám hộ</span>
                        </Button>
                      </div>

                      {guardians.length === 0 ? (
                        <div className="p-6 text-center border-2 border-dashed border-border/60 rounded-2xl bg-muted/10">
                          <p className="text-xs text-muted-foreground italic">Chưa có người giám hộ. Bấm "Thêm người giám hộ" để bổ sung.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {guardians.map((g, idx) => (
                            <div key={idx} className="p-4 bg-muted/20 rounded-2xl border border-border/40 space-y-2 relative group">
                              <div className="flex items-center justify-between">
                                <div className="font-bold text-sm text-foreground">{g.fullName}</div>
                                <Badge variant="outline" className="text-[10px] font-bold">
                                  {getRelationshipLabel(g.relationship)}
                                </Badge>
                              </div>

                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>Số điện thoại: <strong className="text-foreground">{g.phone || "Chưa cập nhật"}</strong></p>
                                <p>Email: <strong className="text-foreground">{g.email || "Chưa cập nhật"}</strong></p>
                                <p>Địa chỉ: <strong className="text-foreground">{g.address || "Chưa cập nhật"}</strong></p>
                              </div>

                              <div className="flex items-center gap-1 justify-end pt-2 border-t border-border/20">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenEditGuardian(idx)}
                                  className="h-7 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <Pencil className="h-3 w-3" /> Sửa
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteGuardian(idx)}
                                  className="h-7 text-xs font-semibold gap-1 text-destructive hover:bg-destructive/10 cursor-pointer"
                                >
                                  <Trash2 className="h-3 w-3" /> Xóa
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* ==========================================
                  HỒ SƠ 2: DÀNH CHO CÁN BỘ / NHÂN SỰ
                  ========================================== */}
              {profileCategory === "EMPLOYEE" && (
                <div className="space-y-6 animate-in fade-in-50">

                  {/* THÔNG TIN HỢP ĐỒNG & PHÒNG BAN */}
                  <div className="p-4 bg-muted/20 rounded-2xl border border-border/40 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold">Ngày kết thúc hợp đồng:</span>
                      <span className="text-xs font-bold font-mono text-foreground">
                        {employeeStats.endDate ? formatDateDisplay(employeeStats.endDate) : "Chưa xác định / Đang hoạt động"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">Phòng ban:</span>
                      <span className="text-xs font-bold text-foreground">
                        {employeeStats.departmentName ? employeeStats.departmentName : "Không có"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">Trạng thái:</span>
                      {employeeStats.status ? (
                        <Badge className="bg-green-600 text-white font-bold text-xs">
                          {employeeStats.status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Không có</span>
                      )}
                    </div>
                  </div>

                  {/* CHUYÊN MÔN GIẢNG DẠY (DÀNH CHO GIẢNG VIÊN / TRỢ GIẢNG) */}
                  {roleTitle.includes("Giảng Viên") && (
                    <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-200 dark:border-blue-900 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
                        <Award className="h-4 w-4" /> Lĩnh vực chuyên môn giảng dạy
                      </div>
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {teacherCategories.length > 0 ? teacherCategories.map((cat, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-blue-600 text-white font-bold text-xs px-3 py-1">
                            {cat}
                          </Badge>
                        )) : (
                          <span className="text-xs text-muted-foreground">Không có</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FORM CÁN BỘ NHÂN SỰ */}
                  <form onSubmit={employeeForm.handleSubmit(onRoleInfoSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Mã nhân viên</Label>
                        <Input placeholder="Không có" disabled className="bg-muted/50 cursor-not-allowed" {...employeeForm.register("employeeCode")} />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Phòng ban</Label>
                        {isAdminProfile ? (
                          <>
                            <Select
                              value={employeeForm.watch("departmentId") || "NONE"}
                              onValueChange={(val) => {
                                const actualVal = val === "NONE" ? "" : val;
                                employeeForm.setValue("departmentId", actualVal, { shouldDirty: true, shouldValidate: true });
                              }}
                            >
                              <SelectTrigger className="h-10 w-full rounded-lg">
                                <SelectValue placeholder="Chọn phòng ban" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">Không có</SelectItem>
                                {Array.isArray(departments) && departments.map((dept) => (
                                  <SelectItem key={dept.id} value={String(dept.id)}>
                                    {dept.name} ({dept.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {employeeForm.formState.errors.departmentId && (
                              <p className="text-xs text-destructive font-medium mt-1">{employeeForm.formState.errors.departmentId.message}</p>
                            )}
                          </>
                        ) : (
                          <Input
                            value={employeeStats.departmentName || "Không có"}
                            disabled
                            className="bg-muted/50 cursor-not-allowed"
                          />
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Chức vụ / Vị trí</Label>
                        <Input placeholder="Nhập chức vụ hoặc vị trí" disabled={!isAdminProfile} className={!isAdminProfile ? "bg-muted/50 cursor-not-allowed" : ""} {...employeeForm.register("position")} />
                        {employeeForm.formState.errors.position && (
                          <p className="text-xs text-destructive font-medium mt-1">{employeeForm.formState.errors.position.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Loại hình làm việc</Label>
                        <Select
                          value={employeeForm.watch("employmentTypeEnum") || "NONE"}
                          onValueChange={(val) => {
                            const actualVal = val === "NONE" ? "" : (val as "FULL_TIME" | "PART_TIME");
                            employeeForm.setValue("employmentTypeEnum", actualVal, { shouldDirty: true, shouldValidate: true });
                          }}
                          disabled={!isAdminProfile}
                        >
                          <SelectTrigger className="h-10 w-full rounded-lg" disabled={!isAdminProfile}>
                            <SelectValue placeholder="Chọn loại hình làm việc" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">Không có</SelectItem>
                            <SelectItem value="FULL_TIME">Toàn thời gian</SelectItem>
                            <SelectItem value="PART_TIME">Bán thời gian</SelectItem>
                          </SelectContent>
                        </Select>
                        {employeeForm.formState.errors.employmentTypeEnum && (
                          <p className="text-xs text-destructive font-medium mt-1">{employeeForm.formState.errors.employmentTypeEnum.message}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Ngày vào làm</Label>
                        <DatePickerInput
                          value={employeeForm.watch("startDate")}
                          onChange={(value) => employeeForm.setValue("startDate", value, { shouldDirty: true, shouldValidate: true })}
                          placeholder="dd/mm/yyyy"
                          disabled={!isAdminProfile}
                        />
                        {employeeForm.formState.errors.startDate && (
                          <p className="text-xs text-destructive font-medium mt-1">{employeeForm.formState.errors.startDate.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Địa chỉ làm việc / Thường trú</Label>
                      <Input placeholder="VD: Hà Nội, Việt Nam" {...employeeForm.register("address")} />
                      {employeeForm.formState.errors.address && (
                        <p className="text-xs text-destructive font-medium mt-1">{employeeForm.formState.errors.address.message}</p>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        className="font-bold bg-primary text-primary-foreground cursor-pointer"
                        disabled={roleInfoStatus.loading}
                      >
                        {roleInfoStatus.loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang lưu...
                          </>
                        ) : (
                          "Lưu thông tin"
                        )}
                      </Button>
                    </div>
                  </form>

                </div>
              )}

            </CardContent>
          </Card>

          {/* KHUNG 4: ĐỔI MẬT KHẨU */}
          <Card id="sec-password" className="border-border shadow-sm bg-card transition-all">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <span>Đổi mật khẩu</span>
              </CardTitle>
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
                  <Label htmlFor="pass-old" className="text-xs font-semibold">Mật khẩu hiện tại</Label>
                  <div className="relative">
                    <Input
                      id="pass-old"
                      type={showOldPass ? "text" : "password"}
                      placeholder="Nhập mật khẩu hiện tại"
                      {...passwordForm.register("oldPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPass(!showOldPass)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showOldPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.oldPassword && (
                    <p className="text-xs text-destructive font-medium mt-1">{passwordForm.formState.errors.oldPassword.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pass-new" className="text-xs font-semibold">Mật khẩu mới</Label>
                    <div className="relative">
                      <Input
                        id="pass-new"
                        type={showNewPass ? "text" : "password"}
                        placeholder="Nhập mật khẩu mới"
                        {...passwordForm.register("newPassword")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Live Checklist yêu cầu mật khẩu mới */}
                    {profileNewPass.length > 0 && (
                      <div className="rounded-lg bg-muted/40 p-2.5 text-xs space-y-1.5 border border-border/60 transition-all duration-200 mt-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground/80 text-[11px]">Yêu cầu mật khẩu:</span>
                          {isAllProfilePassCriteriaMet ? (
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="h-3 w-3" /> Đạt chuẩn
                            </span>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-1 gap-y-1 text-[11px]">
                          <div className={`flex items-center gap-1.5 transition-colors ${profileHasMinLen ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                            {profileHasMinLen ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                            <span>Tối thiểu 6 ký tự</span>
                          </div>
                          <div className={`flex items-center gap-1.5 transition-colors ${profileHasUpper && profileHasLower ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                            {profileHasUpper && profileHasLower ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                            <span>Gồm cả chữ hoa & chữ thường</span>
                          </div>
                          <div className={`flex items-center gap-1.5 transition-colors ${profileHasDigit ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                            {profileHasDigit ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                            <span>Ít nhất 1 chữ số (0-9)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 transition-colors ${profileHasNoSpace ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                            {profileHasNoSpace ? <Check className="h-3 w-3 shrink-0" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-0.5" />}
                            <span>Không chứa khoảng trắng</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-xs text-destructive font-medium mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pass-confirm" className="text-xs font-semibold">Xác nhận mật khẩu mới</Label>
                    <Input
                      id="pass-confirm"
                      type="password"
                      placeholder="Nhập lại mật khẩu mới"
                      {...passwordForm.register("confirmPassword")}
                    />

                    {profileConfirmPass.length > 0 && profileNewPass.length > 0 && (
                      <div className="mt-1">
                        {profileConfirmPass === profileNewPass ? (
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

                    {passwordForm.formState.errors.confirmPassword && profileConfirmPass.length === 0 && (
                      <p className="text-xs text-destructive font-medium mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    className="font-bold bg-primary text-primary-foreground cursor-pointer"
                    disabled={passwordStatus.loading}
                  >
                    {passwordStatus.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang đổi...
                      </>
                    ) : (
                      "Đổi mật khẩu"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* MODAL 1: PHÓNG TO XEM CHI TIẾT AVATAR */}
      <Dialog open={avatarDetailOpen} onOpenChange={setAvatarDetailOpen}>
        <DialogContent className="max-w-xl w-[92vw] p-6 text-center space-y-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-center flex items-center justify-center gap-2">
              <ZoomIn className="h-5 w-5 text-primary" /> Ảnh đại diện
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center gap-4 py-4">
            <div className="w-80 h-80 rounded-full border-4 border-primary/40 shadow-2xl overflow-hidden bg-black flex items-center justify-center">
              {resolveAvatarUrl(profile?.avatarUrl, avatarVersion || profile?.updatedAt) ? (
                <img
                  src={resolveAvatarUrl(profile?.avatarUrl, avatarVersion || profile?.updatedAt)}
                  alt="Avatar Large Preview"
                  style={{ transform: `scale(${detailZoom}) rotate(${detailRotate}deg)`, transition: "transform 0.2s ease" }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-6xl font-extrabold uppercase text-white">
                  {profile?.username.slice(0, 2)}
                </span>
              )}
            </div>

            {/* Điều khiển thu phóng / xoay */}
            <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-2xl border border-border/40">
              <Button size="sm" variant="outline" onClick={() => setDetailZoom((z) => Math.max(0.5, z - 0.2))} className="h-8 text-xs font-bold">
                - Thu nhỏ
              </Button>
              <span className="text-xs font-bold font-mono px-2">{detailZoom.toFixed(1)}x</span>
              <Button size="sm" variant="outline" onClick={() => setDetailZoom((z) => Math.min(3, z + 0.2))} className="h-8 text-xs font-bold">
                + Phóng to
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDetailRotate((r) => (r + 90) % 360)} className="h-8 text-xs font-bold gap-1">
                <RotateCw className="h-3.5 w-3.5" /> Xoay {detailRotate}°
              </Button>
            </div>
          </div>

          <DialogFooter className="justify-center sm:justify-center">
            <Button size="sm" variant="outline" onClick={() => setAvatarDetailOpen(false)} className="rounded-xl font-bold">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: CẮT & TẢI LÊN ẢNH ĐẠI DIỆN */}
      <Dialog open={avatarEditOpen} onOpenChange={setAvatarEditOpen}>
        <DialogContent className="max-w-lg w-[92vw] p-6 space-y-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" />
              <span>Cắt & tải ảnh đại diện</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* VÙNG CHỌN FILE */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Chọn file ảnh từ thiết bị</Label>
              <div className="border-2 border-dashed border-border/80 rounded-2xl p-4 text-center hover:border-primary/60 transition-colors bg-muted/20">
                <input
                  type="file"
                  id="avatar-crop-input"
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  onChange={handleAvatarFileSelect}
                  className="hidden"
                />
                <label htmlFor="avatar-crop-input" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Nhấn để chọn file ảnh</p>
                    <p className="text-[10px] text-muted-foreground">PNG, JPG, WEBP, GIF (Tối đa 5MB)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* KHUNG CẮT ẢNH */}
            {avatarPreviewUrl && (
              <div className="space-y-3 p-4 bg-card border border-border/50 rounded-2xl">
                <div className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Move className="h-3.5 w-3.5 text-primary" /> Kéo thả ảnh để di chuyển vị trí
                  </span>
                  <Badge variant="outline" className="text-[10px]">Thu phóng: {zoomLevel.toFixed(1)}x</Badge>
                </div>

                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-4 border-primary/40 shadow-xl bg-black cursor-grab active:cursor-grabbing select-none flex items-center justify-center touch-none"
                >
                  <img
                    src={avatarPreviewUrl}
                    alt="Avatar Preview"
                    draggable={false}
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel}) rotate(${rotationAngle}deg)`,
                      transition: isDraggingRef.current ? "none" : "transform 0.1s ease-out",
                      maxHeight: "100%",
                      maxWidth: "100%",
                      objectFit: "contain",
                    }}
                  />
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/60 pointer-events-none" />
                </div>

                {/* Thanh điều khiển */}
                <div className="flex items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-2 flex-1">
                    <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
                    <input
                      type="range"
                      min={0.5}
                      max={3}
                      step={0.1}
                      value={zoomLevel}
                      onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                    <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRotationAngle((r) => (r + 90) % 360)}
                    className="h-8 text-xs font-bold gap-1 rounded-xl shrink-0"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    <span>Xoay {rotationAngle}°</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setAvatarEditOpen(false)} className="rounded-xl font-bold">
              Hủy
            </Button>
            <Button
              size="sm"
              disabled={uploadingAvatar || !selectedAvatarFile}
              onClick={handleUploadAndSaveAvatar}
              className="rounded-xl font-bold bg-primary text-primary-foreground gap-1.5 cursor-pointer"
            >
              {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />}
              <span>{uploadingAvatar ? "Đang xử lý..." : "Lưu ảnh"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: THÊM / SỬA THÔNG TIN NGƯỜI GIÁM HỘ */}
      <Dialog open={guardianModalOpen} onOpenChange={setGuardianModalOpen}>
        <DialogContent className="max-w-md w-[90vw] p-6 space-y-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <span>{editingGuardianIndex !== null ? "Sửa người giám hộ" : "Thêm người giám hộ"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Họ và tên *</Label>
              <Input
                value={guardianForm.fullName}
                onChange={(e) => {
                  setGuardianForm({ ...guardianForm, fullName: e.target.value });
                  if (guardianErrors.fullName) setGuardianErrors({ ...guardianErrors, fullName: "" });
                }}
                placeholder="Nhập họ và tên người giám hộ"
              />
              {guardianErrors.fullName && (
                <p className="text-xs text-destructive font-medium mt-1">{guardianErrors.fullName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mối quan hệ *</Label>
                <Select
                  value={guardianForm.relationship || "FATHER"}
                  onValueChange={(val: any) => setGuardianForm({ ...guardianForm, relationship: val })}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg">
                    <SelectValue placeholder="Chọn mối quan hệ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FATHER">Cha / Bố</SelectItem>
                    <SelectItem value="MOTHER">Mẹ</SelectItem>
                    <SelectItem value="GUARDIAN">Người giám hộ</SelectItem>
                    <SelectItem value="OTHER">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Số điện thoại *</Label>
                <Input
                  value={guardianForm.phone}
                  onChange={(e) => {
                    setGuardianForm({ ...guardianForm, phone: e.target.value });
                    if (guardianErrors.phone) setGuardianErrors({ ...guardianErrors, phone: "" });
                  }}
                  placeholder="0988888888"
                />
                {guardianErrors.phone && (
                  <p className="text-xs text-destructive font-medium mt-1">{guardianErrors.phone}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Email</Label>
              <Input
                value={guardianForm.email}
                onChange={(e) => {
                  setGuardianForm({ ...guardianForm, email: e.target.value });
                  if (guardianErrors.email) setGuardianErrors({ ...guardianErrors, email: "" });
                }}
                placeholder="guardian@example.com"
              />
              {guardianErrors.email && (
                <p className="text-xs text-destructive font-medium mt-1">{guardianErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Địa chỉ</Label>
              <Input
                value={guardianForm.address}
                onChange={(e) => {
                  setGuardianForm({ ...guardianForm, address: e.target.value });
                  if (guardianErrors.address) setGuardianErrors({ ...guardianErrors, address: "" });
                }}
                placeholder="Nhập địa chỉ người giám hộ"
              />
              {guardianErrors.address && (
                <p className="text-xs text-destructive font-medium mt-1">{guardianErrors.address}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setGuardianModalOpen(false)} className="rounded-xl font-bold">
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleSaveGuardian}
              className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
