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
  fullName: z.string().min(2, "Họ và tên phải chứa ít nhất 2 ký tự"),
  phone: z.string().optional(),
  dateOfBirth: z.string().min(1, "Vui lòng chọn ngày sinh"),
  gender: z.string(), // 0 - Nam, 1 - Nữ, 2 - Khác
});

// 2. StudentProfileEntity Schema (Dành cho Học viên)
const studentProfileSchema = z.object({
  educationLevel: z.string().min(1, "Vui lòng chọn trình độ học vấn"),
  schoolName: z.string().min(2, "Vui lòng nhập tên trường học"),
  goal: z.string().min(2, "Vui lòng nhập mục tiêu học tập"),
  description: z.string().optional(),
  isMinor: z.boolean(),
});

// 3. EmployeeEntity Schema (Dùng chung cho Teacher, TA, HR, Support, Admin)
const employeeProfileSchema = z.object({
  employeeCode: z.string().optional(),
  departmentId: z.string().optional(),
  position: z.string().optional(),
  employmentTypeEnum: z.union([z.enum(["FULL_TIME", "PART_TIME"]), z.literal("")]).optional(),
  startDate: z.string().optional(),
  address: z.string().optional(),
});

// 4. Change Password Schema
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
    defaultValues: { fullName: "", phone: "", dateOfBirth: "", gender: "" },
  });

  const studentForm = useForm<z.infer<typeof studentProfileSchema>>({
    resolver: zodResolver(studentProfileSchema),
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
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

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

  // 1. Basic Info Submit (UserEntity: fullName, phone, dateOfBirth, gender)
  const onBasicSubmit = async (data: z.infer<typeof basicInfoSchema>) => {
    setBasicStatus({ success: "", error: "", loading: true });
    try {
      const updated = await userService.updateBasicProfile({
        fullName: data.fullName,
        phone: data.phone || "",
        dateOfBirth: data.dateOfBirth,
        gender: data.gender ? parseInt(data.gender) : undefined,
      });
      setProfile(updated);
      setAvatarVersion(String(Date.now()));
      await fetchProfile();
      setBasicStatus({ success: "Đã lưu thông tin cá nhân cơ bản vào CSDL!", error: "", loading: false });
      setTimeout(() => setBasicStatus((s) => ({ ...s, success: "" })), 3500);
    } catch (e) {
      setBasicStatus({ success: "", error: extractBeError(e, "Lỗi lưu thông tin vào CSDL. Vui lòng thử lại."), loading: false });
    }
  };

  // 2. Role Info Submit (StudentProfileEntity vs EmployeeEntity)
  const onRoleInfoSubmit = async (formData: any) => {
    setRoleInfoStatus({ success: "", error: "", loading: true });
    try {
      if (isAdminProfile) {
        if (!formData.departmentId || !String(formData.departmentId).trim()) {
          setRoleInfoStatus({ success: "", error: "Vui lòng chọn phòng ban.", loading: false });
          return;
        }
        if (!formData.position || !String(formData.position).trim()) {
          setRoleInfoStatus({ success: "", error: "Vui lòng nhập chức vụ / vị trí công tác.", loading: false });
          return;
        }
        if (!formData.employmentTypeEnum) {
          setRoleInfoStatus({ success: "", error: "Vui lòng chọn loại hình làm việc.", loading: false });
          return;
        }
        if (!formData.startDate) {
          setRoleInfoStatus({ success: "", error: "Vui lòng chọn ngày vào làm.", loading: false });
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
      setRoleInfoStatus({ success: "Đã cập nhật hồ sơ vào CSDL!", error: "", loading: false });
      setTimeout(() => setRoleInfoStatus((s) => ({ ...s, success: "" })), 3500);
    } catch (e) {
      setRoleInfoStatus({ success: "", error: extractBeError(e, "Lỗi lưu hồ sơ vào CSDL. Vui lòng thử lại."), loading: false });
    }
  };

  // 3. Guardian CRUD Actions (GuardianEntity List)
  const handleOpenAddGuardian = () => {
    setEditingGuardianIndex(null);
    setGuardianForm({
      fullName: "",
      relationship: "FATHER",
      phone: "",
      email: "",
      address: "",
    });
    setGuardianModalOpen(true);
  };

  const handleOpenEditGuardian = (index: number) => {
    setEditingGuardianIndex(index);
    setGuardianForm({ ...guardians[index] });
    setGuardianModalOpen(true);
  };

  const handleSaveGuardian = async () => {
    if (!guardianForm.fullName.trim()) return;
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
      setRoleInfoStatus({ success: "Đã lưu thông tin người giám hộ!", error: "", loading: false });
      setTimeout(() => setRoleInfoStatus((s) => ({ ...s, success: "" })), 3000);
    } catch (e) {
      setRoleInfoStatus({ success: "", error: extractBeError(e, "Lỗi lưu người giám hộ vào CSDL."), loading: false });
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
      setAvatarStatus({ success: "Đã tải avatar lên MinIO & lưu CSDL!", error: "", loading: false });
      setAvatarEditOpen(false);
      setSelectedAvatarFile(null);
      setAvatarPreviewUrl("");
      setTimeout(() => setAvatarStatus((s) => ({ ...s, success: "" })), 3500);
    } catch (e) {
      console.error("Lỗi upload avatar MinIO:", e);
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
      setAvatarStatus({ success: "Đã xóa ảnh đại diện về mặc định trong CSDL!", error: "", loading: false });
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
            <span>Cài Đặt Tài Khoản</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý thông tin hồ sơ cá nhân và cài đặt bảo mật tài khoản.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {renderRoleBadge()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* CỘT TRÁI: NAV SHORTCUTS */}
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
              <span>Ảnh đại diện (Avatar)</span>
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
              <span>Thông tin cá nhân cơ bản</span>
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
                {profileCategory === "STUDENT" ? "Hồ sơ Học Viên" : "Hồ sơ Cán Bộ / Nhân Sự"}
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
              <span>Cài đặt đổi mật khẩu</span>
            </button>
          </nav>
        </div>

        {/* CỘT PHẢI: AVATAR CARD & PROFILE FORMS */}
        <div className="lg:col-span-3 space-y-8">

          {/* KHUNG 1: AVATAR CÁ NHÂN (UserEntity.avatarUrl) */}
          <Card id="sec-avatar" className="border-border shadow-sm bg-card transition-all">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                <span>Ảnh đại diện (Avatar)</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Tải lên file ảnh mới và lưu trữ trên máy chủ MinIO (`UserEntity.avatarUrl`).
              </CardDescription>
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
                  {/* AVATAR CLICK TO ENLARGE MODAL */}
                  <div
                    onClick={() => setAvatarDetailOpen(true)}
                    className="relative group cursor-pointer"
                    title="Click vào ảnh để xem phóng to HD"
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
                    <p className="text-[11px] text-primary font-semibold mt-1 flex items-center gap-1 cursor-pointer" onClick={() => setAvatarDetailOpen(true)}>
                      <ZoomIn className="h-3.5 w-3.5" /> (Click ảnh để xem phóng to HD)
                    </p>
                  </div>
                </div>

                {/* Avatar Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAvatarDetailOpen(true)}
                    className="text-xs font-bold gap-1.5 rounded-xl border-border/50"
                  >
                    <ZoomIn className="h-3.5 w-3.5 text-primary" />
                    <span>Xem phóng to Avatar</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setAvatarEditOpen(true)}
                    className="text-xs font-bold gap-1.5 rounded-xl bg-primary text-primary-foreground"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{profile?.avatarUrl ? "Đổi ảnh khác" : "Tải ảnh đại diện"}</span>
                  </Button>

                  {profile?.avatarUrl && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDeleteAvatar}
                      className="text-xs font-bold gap-1.5 rounded-xl"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa Avatar</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KHUNG 2: THÔNG TIN CÁ NHÂN CƠ BẢN (UserEntity: fullName, email, phone, dateOfBirth, gender) */}
          <Card id="sec-basic" className="border-border shadow-sm bg-card transition-all">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <span>Thông tin cá nhân cơ bản</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Thông tin tài khoản chung dùng cho mọi vai trò hệ thống (`UserEntity`).
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
                    <Label htmlFor="basic-fullName" className="text-xs font-semibold">Họ và tên (fullName)</Label>
                    <Input id="basic-fullName" {...basicForm.register("fullName")} />
                    {basicForm.formState.errors.fullName && (
                      <p className="text-[10px] text-destructive font-medium">{basicForm.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="basic-email" className="text-xs font-semibold">Email tài khoản (email)</Label>
                    <Input id="basic-email" value={profile?.email || ""} disabled className="bg-muted/50 cursor-not-allowed" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="basic-phone" className="text-xs font-semibold">Số điện thoại (phone)</Label>
                    <Input id="basic-phone" placeholder="0988888888" {...basicForm.register("phone")} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="basic-dob" className="text-xs font-semibold">Ngày sinh (dateOfBirth)</Label>
                    <DatePickerInput
                      value={basicForm.watch("dateOfBirth")}
                      onChange={(value) => basicForm.setValue("dateOfBirth", value, { shouldDirty: true, shouldValidate: true })}
                      placeholder="dd/mm/yyyy"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="basic-gender" className="text-xs font-semibold">Giới tính (gender)</Label>
                    <select
                      id="basic-gender"
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                      {...basicForm.register("gender")}
                    >
                      <option value="">Không có</option>
                      <option value="0">Nam (0)</option>
                      <option value="1">Nữ (1)</option>
                      <option value="2">Khác (2)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    className="font-bold bg-primary text-primary-foreground"
                    disabled={basicStatus.loading || !basicForm.formState.isDirty}
                  >
                    {basicStatus.loading ? "Đang lưu..." : "Lưu thông tin cá nhân"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* KHUNG 3: THÔNG TIN THEO HỒ SƠ CHÍNH CỦA USER (TỰ ĐỘNG CHỌN HỌC VIÊN HOẶC NHÂN SỰ CHUẨN XÁC) */}
          <Card id="sec-role-info" className="border-border shadow-sm bg-card transition-all">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                {profileCategory === "STUDENT" ? <GraduationCap className="h-5 w-5 text-emerald-600" /> : <Briefcase className="h-5 w-5 text-blue-600" />}
                <span>
                  {profileCategory === "STUDENT" ? "Thông tin Hồ Sơ Học Viên (StudentProfileEntity)" : `Thông tin Hồ Sơ Cán Bộ / Nhân Sự (${roleTitle})`}
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {profileCategory === "STUDENT"
                  ? "Quản lý trình độ, trường học, mục tiêu và người giám hộ khi học viên chưa thành niên."
                  : "Hồ sơ công tác dành cho Giảng viên, Trợ giảng, Nhân sự HR, Support và Admin."}
              </CardDescription>
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
                  HỒ SƠ 1: CHỈ HIỂN THỊ KHI LÀ HỌC VIÊN
                  ========================================== */}
              {profileCategory === "STUDENT" && (
                <div className="space-y-6 animate-in fade-in-50">

                  {/* READONLY STATS */}
                  <div className="p-4 bg-muted/20 rounded-2xl border border-border/40 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Mã học viên (Hệ thống sinh)</span>
                        <div className="font-extrabold text-base text-foreground font-mono mt-0.5">{displayText(studentStats.studentCode)}</div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 font-bold border-emerald-300 gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> hasGoal: {studentStats.hasGoal === null ? "Không có" : (studentStats.hasGoal ? "True" : "False")}
                        </Badge>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 font-bold border-amber-300 gap-1">
                          <Flame className="h-3.5 w-3.5" /> Chuỗi hiện tại: {studentStats.currentStreak === null ? "Không có" : `${studentStats.currentStreak} ngày`}
                        </Badge>
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 font-bold border-purple-300 gap-1">
                          <Trophy className="h-3.5 w-3.5" /> Chuỗi kỷ lục: {studentStats.longestStreak === null ? "Không có" : `${studentStats.longestStreak} ngày`}
                        </Badge>
                      </div>
                    </div>

                    {/* Student Interests Badges */}
                    {studentStats.interests.length > 0 ? (
                      <div className="pt-2 border-t border-border/30 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5" /> Lĩnh vực quan tâm (studentInterests):
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
                        <Label className="text-xs font-semibold">Trình độ học vấn (educationLevel)</Label>
                        <select
                          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                          {...studentForm.register("educationLevel")}
                        >
                          <option value="">Không có</option>
                          <option value="Học sinh THCS">Học sinh THCS</option>
                          <option value="Học sinh THPT">Học sinh THPT</option>
                          <option value="Đại học">Đại học</option>
                          <option value="Sau đại học">Sau đại học</option>
                          <option value="Người đi làm">Người đi làm</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Trường học / Cơ sở (schoolName)</Label>
                        <Input placeholder="Tên trường học" {...studentForm.register("schoolName")} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Mục tiêu học tập (goal)</Label>
                      <textarea
                        rows={2}
                        placeholder="Nhập mục tiêu học tập..."
                        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none resize-none"
                        {...studentForm.register("goal")}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Mô tả bản thân / Ghi chú (description)</Label>
                      <textarea
                        rows={2}
                        placeholder="Mô tả bản thân..."
                        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none resize-none"
                        {...studentForm.register("description")}
                      />
                    </div>

                    {/* CHECKBOX IS_MINOR */}
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/40">
                      <input
                        type="checkbox"
                        id="chk-isMinor"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        {...studentForm.register("isMinor")}
                      />
                      <label htmlFor="chk-isMinor" className="text-xs font-semibold text-foreground cursor-pointer">
                        Học viên là người chưa thành niên (&lt; 18 tuổi) — <span className="text-muted-foreground font-normal font-mono">isMinor = true (Yêu cầu thông tin Người Giám Hộ)</span>
                      </label>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        className="font-bold bg-primary text-primary-foreground"
                        disabled={roleInfoStatus.loading || !studentForm.formState.isDirty}
                      >
                        {roleInfoStatus.loading ? "Đang lưu..." : "Lưu hồ sơ học viên vào CSDL"}
                      </Button>
                    </div>
                  </form>

                  {/* GUARDIAN LIST SECTION (HIỆN KHI IS_MINOR = TRUE) */}
                  {isMinorValue && (
                    <div className="pt-4 border-t border-border/40 space-y-4 animate-in fade-in-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-amber-600 flex items-center gap-1.5 uppercase">
                            <ShieldAlert className="h-4 w-4" /> Danh Sách Người Giám Hộ (GuardianEntity)
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Quản lý 1-nhiều người giám hộ cho học viên vị thành niên (`GuardianEntity`).
                          </p>
                        </div>

                        <Button
                          size="sm"
                          onClick={handleOpenAddGuardian}
                          className="text-xs font-bold gap-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Thêm người giám hộ</span>
                        </Button>
                      </div>

                      {guardians.length === 0 ? (
                        <div className="p-6 text-center border-2 border-dashed border-border/60 rounded-2xl bg-muted/10">
                          <p className="text-xs text-muted-foreground italic">Chưa có người giám hộ nào trong CSDL. Bấm "Thêm người giám hộ" để bổ sung.</p>
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
                                <p>📞 SĐT: <strong className="text-foreground">{g.phone || "Chưa cập nhật"}</strong></p>
                                <p>✉️ Email: <strong className="text-foreground">{g.email || "Chưa cập nhật"}</strong></p>
                                <p>📍 Địa chỉ: <strong className="text-foreground">{g.address || "Chưa cập nhật"}</strong></p>
                              </div>

                              <div className="flex items-center gap-1 justify-end pt-2 border-t border-border/20">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenEditGuardian(idx)}
                                  className="h-7 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
                                >
                                  <Pencil className="h-3 w-3" /> Sửa
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteGuardian(idx)}
                                  className="h-7 text-xs font-semibold gap-1 text-destructive hover:bg-destructive/10"
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
                  HỒ SƠ 2: CHỈ HIỂN THỊ KHI LÀ CÁN BỘ / NHÂN SỰ (TEACHER, TA, HR, SUPPORT, ADMIN)
                  ========================================== */}
              {profileCategory === "EMPLOYEE" && (
                <div className="space-y-6 animate-in fade-in-50">

                  {/* READONLY STATS (endDate & status) */}
                  <div className="p-4 bg-muted/20 rounded-2xl border border-border/40 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold">Ngày kết thúc hợp đồng (endDate):</span>
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
                      <span className="text-xs font-semibold">Trạng thái nhân sự (status):</span>
                      {employeeStats.status ? (
                        <Badge className="bg-green-600 text-white font-bold text-xs">
                          {employeeStats.status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Không có</span>
                      )}
                    </div>
                  </div>

                  {/* READONLY TEACHER CATEGORIES (Hiển thị cho Giảng viên / Trợ giảng) */}
                  {roleTitle.includes("Giảng Viên") && (
                    <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-200 dark:border-blue-900 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
                        <Award className="h-4 w-4" /> Lĩnh Vực Chuyên Môn Giảng Dạy (TeacherCategoryEntity)
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Danh sách chuyên môn được gán bởi Admin/HR (Chế độ Readonly).
                      </p>
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

                  {/* FORM EMPLOYEEENTITY (TEACHER, TA, HR, SUPPORT, ADMIN) */}
                  <form onSubmit={employeeForm.handleSubmit(onRoleInfoSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Mã nhân viên (employeeCode)</Label>
                        <Input placeholder="Không có" disabled className="bg-muted/50 cursor-not-allowed" {...employeeForm.register("employeeCode")} />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Phòng ban (department FK)</Label>
                        {isAdminProfile ? (
                          <select
                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                            {...employeeForm.register("departmentId")}
                          >
                            <option value="">Không có</option>
                            {Array.isArray(departments) && departments.map((dept) => (
                              <option key={dept.id} value={String(dept.id)}>
                                {dept.name} ({dept.code})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            value={employeeStats.departmentName || "Không có"}
                            disabled
                            className="bg-muted/50 cursor-not-allowed"
                          />
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Chức vụ / Vị trí (position)</Label>
                        <Input placeholder="Không có" disabled={!isAdminProfile} className={!isAdminProfile ? "bg-muted/50 cursor-not-allowed" : ""} {...employeeForm.register("position")} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Loại hình làm việc (employmentTypeEnum)</Label>
                        <select
                          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                          disabled={!isAdminProfile}
                          {...employeeForm.register("employmentTypeEnum")}
                        >
                          <option value="">Không có</option>
                          <option value="FULL_TIME">Toàn thời gian (FULL_TIME)</option>
                          <option value="PART_TIME">Bán thời gian (PART_TIME)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Ngày vào làm (startDate)</Label>
                        <DatePickerInput
                          value={employeeForm.watch("startDate")}
                          onChange={(value) => employeeForm.setValue("startDate", value, { shouldDirty: true, shouldValidate: true })}
                          placeholder="dd/mm/yyyy"
                          disabled={!isAdminProfile}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Địa chỉ làm việc / Thường trú (address)</Label>
                      <Input placeholder="VD: Hà Nội, Việt Nam" {...employeeForm.register("address")} />
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        className="font-bold bg-primary text-primary-foreground"
                        disabled={roleInfoStatus.loading || !employeeForm.formState.isDirty}
                      >
                        {roleInfoStatus.loading ? "Đang lưu..." : "Lưu hồ sơ nhân sự vào CSDL"}
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
                <span>Cài đặt đổi mật khẩu</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Hãy đổi mật khẩu thường xuyên để tăng cường tính bảo mật cho tài khoản của bạn.
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
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
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
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
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
                  <Button
                    type="submit"
                    className="font-bold bg-primary text-primary-foreground"
                    disabled={passwordStatus.loading || !passwordForm.formState.isDirty}
                  >
                    {passwordStatus.loading ? "Đang đổi..." : "Thay đổi mật khẩu"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* MODAL 1: PHÓNG TO XEM CHI TIẾT AVATAR (CÓ NÚT ZOOM & ROTATE HD) */}
      <Dialog open={avatarDetailOpen} onOpenChange={setAvatarDetailOpen}>
        <DialogContent className="max-w-xl w-[92vw] p-6 text-center space-y-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-center flex items-center justify-center gap-2">
              <ZoomIn className="h-5 w-5 text-primary" /> Phóng To Ảnh Đại Diện HD
            </DialogTitle>
            <DialogDescription className="text-xs text-center text-muted-foreground">
              {profile?.fullName || profile?.username} ({roleTitle})
            </DialogDescription>
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

            {/* Zoom / Rotate Controls for enlarged preview */}
            <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-2xl border border-border/40">
              <Button size="sm" variant="outline" onClick={() => setDetailZoom((z) => Math.max(0.5, z - 0.2))} className="h-8 text-xs font-bold">
                - Zoom
              </Button>
              <span className="text-xs font-bold font-mono px-2">{detailZoom.toFixed(1)}x</span>
              <Button size="sm" variant="outline" onClick={() => setDetailZoom((z) => Math.min(3, z + 0.2))} className="h-8 text-xs font-bold">
                + Zoom
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

      {/* MODAL 2: INTERACTIVE AVATAR CROPPER & UPLOAD */}
      <Dialog open={avatarEditOpen} onOpenChange={setAvatarEditOpen}>
        <DialogContent className="max-w-lg w-[92vw] p-6 space-y-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" />
              <span>Cắt & Tải Lên Ảnh Đại Diện (MinIO)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tải file ảnh từ máy tính. Kéo-thả ảnh để di chuyển vị trí, phóng to/thu nhỏ hoặc xoay trước khi lưu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* FILE INPUT AREA */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Chọn file ảnh từ máy tính</Label>
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
                    <p className="text-xs font-bold text-foreground">Click để chọn file ảnh mới</p>
                    <p className="text-[10px] text-muted-foreground">Hỗ trợ PNG, JPG, WEBP, GIF (Tối đa 5MB)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* CROP PREVIEW BOX */}
            {avatarPreviewUrl && (
              <div className="space-y-3 p-4 bg-card border border-border/50 rounded-2xl">
                <div className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Move className="h-3.5 w-3.5 text-primary" /> Kéo thả ảnh để di chuyển vị trí
                  </span>
                  <Badge variant="outline" className="text-[10px]">Zoom: {zoomLevel.toFixed(1)}x</Badge>
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

                {/* Controls Bar */}
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
              className="rounded-xl font-bold bg-primary text-primary-foreground gap-1.5"
            >
              {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />}
              <span>{uploadingAvatar ? "Đang cắt & tải lên MinIO..." : "Cắt & Lưu Avatar (MinIO)"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ADD / EDIT GUARDIAN MODAL (GuardianEntity) */}
      <Dialog open={guardianModalOpen} onOpenChange={setGuardianModalOpen}>
        <DialogContent className="max-w-md w-[90vw] p-6 space-y-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <span>{editingGuardianIndex !== null ? "Sửa Thông Tin Người Giám Hộ" : "Thêm Người Giám Hộ Mới"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Nhập đầy đủ thông tin người giám hộ (`GuardianEntity`) và lưu vào CSDL.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Họ và tên người giám hộ (fullName)</Label>
              <Input
                value={guardianForm.fullName}
                onChange={(e) => setGuardianForm({ ...guardianForm, fullName: e.target.value })}
                placeholder="VD: Nguyễn Văn A"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mối quan hệ (relationship)</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                  value={guardianForm.relationship}
                  onChange={(e: any) => setGuardianForm({ ...guardianForm, relationship: e.target.value })}
                >
                  <option value="FATHER">Cha / Bố (FATHER)</option>
                  <option value="MOTHER">Mẹ (MOTHER)</option>
                  <option value="GUARDIAN">Người giám hộ (GUARDIAN)</option>
                  <option value="OTHER">Quan hệ khác (OTHER)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Số điện thoại (phone)</Label>
                <Input
                  value={guardianForm.phone}
                  onChange={(e) => setGuardianForm({ ...guardianForm, phone: e.target.value })}
                  placeholder="0988888888"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Địa chỉ Email (email)</Label>
              <Input
                value={guardianForm.email}
                onChange={(e) => setGuardianForm({ ...guardianForm, email: e.target.value })}
                placeholder="guardian@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Địa chỉ (address)</Label>
              <Input
                value={guardianForm.address}
                onChange={(e) => setGuardianForm({ ...guardianForm, address: e.target.value })}
                placeholder="Nhập địa chỉ người giám hộ"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setGuardianModalOpen(false)} className="rounded-xl font-bold">
              Hủy
            </Button>
            <Button
              size="sm"
              disabled={!guardianForm.fullName.trim()}
              onClick={handleSaveGuardian}
              className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white"
            >
              Lưu Người Giám Hộ Vào CSDL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
