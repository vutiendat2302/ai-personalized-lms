import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Briefcase,
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Mail,
  Loader2,
  FileCheck,
  DollarSign,
  X,
  FileUp,
} from "lucide-react";
import type { DepartmentResponse } from "@/api/departments/departmentApi";
import type { RoleResponse } from "@/types/admin";
import { employeeApi } from "@/api/employees/employeeApi";

interface CreateSingleEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  departments: DepartmentResponse[];
  roles: RoleResponse[];
  onSuccess: (msg: string, newEmployee?: any) => void;
  onError: (msg: string) => void;
}

export const CreateSingleEmployeeModal: React.FC<CreateSingleEmployeeModalProps> = ({
  open,
  onClose,
  departments,
  roles,
  onSuccess,
  onError,
}) => {
  const [activeTab, setActiveTab] = useState<"personal" | "employment" | "contract">("personal");
  const [submitting, setSubmitting] = useState(false);

  // Tab 1: Personal Details
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<number | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");

  // Tab 2: Employment Profile
  const todayLocal = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const [departmentId, setDepartmentId] = useState("");
  const [position, setPosition] = useState("");
  const [employmentTypeEnum, setEmploymentTypeEnum] = useState<"FULL_TIME" | "PART_TIME">("FULL_TIME");
  const [startDate, setStartDate] = useState(todayLocal);
  const [endDate, setEndDate] = useState("");
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [salaryType, setSalaryType] = useState<"MONTHLY" | "DAILY" | "HOURLY">("MONTHLY");
  const [signedAt, setSignedAt] = useState(todayLocal);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  // Tab 3: Contract Option & Live Reactive Generator
  const [contractOption, setContractOption] = useState<"UPLOAD" | "WEB_GENERATE">("WEB_GENERATE");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [contractType, setContractType] = useState<"PROBATION" | "FIXED_TERM" | "INDEFINITE">("PROBATION");
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const selectedRole = roles.find((role) => String(role.id) === selectedRoleIds[0]);
  const isTeachingContract = selectedRole?.code === "TEACHER" || selectedRole?.code === "TA";
  const effectiveContractType = isTeachingContract ? "INDEFINITE" : contractType;
  const allowedRoles = roles.filter((role) => employmentTypeEnum === "FULL_TIME"
    ? role.code === "HR" || role.code === "TEACHER"
    : role.code === "TA");

  useEffect(() => {
    if (selectedRoleIds[0] && !allowedRoles.some((role) => String(role.id) === selectedRoleIds[0])) {
      setSelectedRoleIds([]);
    }
  }, [employmentTypeEnum]);

  const resetForm = () => {
    setActiveTab("personal");
    setEmail(""); setPhone(""); setGender(null); setDateOfBirth("");
    setDepartmentId(""); setPosition(""); setEmploymentTypeEnum("FULL_TIME");
    setStartDate(todayLocal); setEndDate(""); setBaseSalary(0); setSalaryType("MONTHLY"); setSignedAt(todayLocal); setSelectedRoleIds([]);
    setContractOption("WEB_GENERATE"); setUploadedFile(null); setContractType("PROBATION");
    setTemplates([]); setSelectedTemplateId(""); setPreviewHtml(""); setPreviewError(""); setErrors({});
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (!open || contractOption !== "WEB_GENERATE") return;
    setLoadingTemplates(true);
    employeeApi.getContractTemplates(effectiveContractType)
      .then((response) => {
        const rows = Array.isArray(response.data) ? response.data : [];
        setTemplates(rows);
        setSelectedTemplateId(rows[0]?.templateId ? String(rows[0].templateId) : "");
      })
      .catch(() => { setTemplates([]); setSelectedTemplateId(""); })
      .finally(() => setLoadingTemplates(false));
  }, [open, contractOption, effectiveContractType]);

  // Find Department Name for Contract binding
  const selectedDepartmentName = departments.find((d) => String(d.id) === departmentId)?.name || "";

  // Validation Checks
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const normalizedPhone = phone.replace(/[\s.-]/g, "");
  const age = (() => {
    if (!dateOfBirth) return 0;
    const birth = new Date(`${dateOfBirth}T00:00:00`);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) years--;
    return years;
  })();
  const isPersonalValid = isValidEmail(email) && /^(\+84|0)(3|5|7|8|9)\d{8}$/.test(normalizedPhone) && gender !== null && age >= 18 && age <= 75;

  const isEmploymentValid =
    departmentId !== "" &&
    position.trim() !== "" &&
    selectedRoleIds.length > 0;
  const requiresEndDate = !isTeachingContract && (effectiveContractType === "PROBATION" || effectiveContractType === "FIXED_TERM");

  const isContractValid =
    Boolean(contractType && startDate && signedAt && salaryType && (isTeachingContract || baseSalary > 0)
      && (!requiresEndDate || (endDate && endDate > startDate))) &&
    (contractOption === "UPLOAD" ? uploadedFile !== null : Boolean(selectedTemplateId));

  useEffect(() => {
    if (!open || contractOption !== "WEB_GENERATE" || !selectedTemplateId) {
      setPreviewHtml("");
      return;
    }
    const timer = window.setTimeout(() => {
      setPreviewError("");
      employeeApi.previewContractTemplate(selectedTemplateId, {
        employeeName: "", fullName: "", username: email.trim(),
        email: email.trim(), phone: normalizedPhone,
        position: position.trim(), department: selectedDepartmentName,
        startDate, endDate: requiresEndDate ? endDate : "",
        baseSalary: isTeachingContract ? "Theo đơn giá giảng dạy áp dụng cho từng lớp" : (baseSalary > 0 ? baseSalary.toLocaleString("vi-VN") : ""),
      }).then((response) => setPreviewHtml(response.data?.previewHtml || ""))
        .catch(() => {
          setPreviewHtml("");
          setPreviewError("Không thể tải bản xem trước hợp đồng từ backend.");
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [open, contractOption, selectedTemplateId, email, phone, position, departmentId, startDate, endDate, baseSalary, isTeachingContract, requiresEndDate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        onError("File hợp đồng không được vượt quá 10MB");
        return;
      }
      if (!/\.pdf$/i.test(file.name)) { onError("Hợp đồng gửi ký điện tử phải là file PDF"); return; }
      setUploadedFile(file);
    }
  };

  const handleContinuePersonal = () => {
    const nextErrors: Record<string, string> = {};
    if (!isValidEmail(email)) nextErrors.email = "Email không hợp lệ";
    if (!/^(\+84|0)(3|5|7|8|9)\d{8}$/.test(normalizedPhone)) nextErrors.phone = "Số điện thoại Việt Nam không hợp lệ";
    if (gender === null) nextErrors.gender = "Vui lòng chọn giới tính";
    if (age < 18 || age > 75) nextErrors.dateOfBirth = "Tuổi nhân viên phải từ 18 đến 75";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      onError("Vui lòng nhập đầy đủ và đúng thông tin cá nhân.");
      return;
    }
    setActiveTab("employment");
  };

  const handleContinueEmployment = () => {
    const nextErrors: Record<string, string> = {};
    if (!departmentId) nextErrors.departmentId = "Vui lòng chọn phòng ban";
    if (position.trim().length < 2) nextErrors.position = "Vui lòng nhập chức danh";
    if (!selectedRoleIds.length) nextErrors.roleId = "Vui lòng chọn một vai trò";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      onError("Vui lòng nhập đầy đủ hồ sơ công việc.");
      return;
    }
    setActiveTab("contract");
  };

  const handleTabChange = (target: "personal" | "employment" | "contract") => {
    if (target === "personal") {
      setActiveTab("personal");
      return;
    }
    if (!isPersonalValid) {
      setActiveTab("personal");
      handleContinuePersonal();
      return;
    }
    if (target === "employment") {
      setActiveTab("employment");
      return;
    }
    if (!isEmploymentValid) {
      setActiveTab("employment");
      handleContinueEmployment();
      return;
    }
    setActiveTab("contract");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!isValidEmail(email)) nextErrors.email = "Email không hợp lệ";
    if (!/^(\+84|0)(3|5|7|8|9)\d{8}$/.test(normalizedPhone)) nextErrors.phone = "Số điện thoại Việt Nam không hợp lệ";
    if (gender === null) nextErrors.gender = "Vui lòng chọn giới tính";
    if (age < 18 || age > 75) nextErrors.dateOfBirth = "Tuổi nhân viên phải từ 18 đến 75";
    if (!departmentId) nextErrors.departmentId = "Vui lòng chọn phòng ban";
    if (position.trim().length < 2) nextErrors.position = "Vui lòng nhập chức danh";
    if (!selectedRoleIds.length) nextErrors.roleId = "Vui lòng chọn một vai trò";
    if (!startDate) nextErrors.startDate = "Ngày bắt đầu là bắt buộc";
    if (requiresEndDate && !endDate) nextErrors.endDate = "Ngày kết thúc là bắt buộc với loại hợp đồng này";
    if (requiresEndDate && endDate && endDate <= startDate) nextErrors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
    if (!isTeachingContract && baseSalary <= 0) nextErrors.baseSalary = "Mức lương phải lớn hơn 0";
    if (!signedAt) nextErrors.signedAt = "Ngày ký hợp đồng là bắt buộc";
    if (signedAt && startDate && signedAt > startDate) nextErrors.signedAt = "Ngày ký không được sau ngày hiệu lực";
    if (contractOption === "UPLOAD" && !uploadedFile) nextErrors.contract = "Vui lòng chọn file hợp đồng";
    if (contractOption === "WEB_GENERATE" && !selectedTemplateId) nextErrors.contract = "Không có template hợp đồng phù hợp";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (!isPersonalValid) {
        setActiveTab("personal");
        onError("Vui lòng kiểm tra lại các trường thông tin cá nhân.");
      } else if (!isEmploymentValid) {
        setActiveTab("employment");
        onError("Vui lòng kiểm tra lại các trường hồ sơ công việc.");
      } else if (!isContractValid) {
        setActiveTab("contract");
        onError("Vui lòng tải tệp hợp đồng hoặc chọn mẫu tạo hợp đồng trên web.");
      }
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        email: email.trim(), phone: normalizedPhone,
        gender,
        dateOfBirth,
        departmentId,
        position: position.trim(),
        employmentTypeEnum,
        roleId: selectedRoleIds[0],
        password: "Password@123",
        contractCreationMode: contractOption,
        contractTypeEnum: effectiveContractType,
        contractTemplateId: contractOption === "WEB_GENERATE" ? selectedTemplateId : undefined,
        contractStartDate: startDate,
        contractEndDate: requiresEndDate ? endDate : undefined,
        baseSalary: isTeachingContract ? undefined : baseSalary,
        salaryTypeEnum: isTeachingContract ? "HOURLY" : salaryType,
        contractSignedAt: `${signedAt}T00:00:00`,
      };
      const created = await employeeApi.onboardEmployee(payload, contractOption === "UPLOAD" ? uploadedFile! : undefined);
      const createdEmployee = created.data;

      onSuccess(
        `Đã tạo nhân viên, hợp đồng và gửi thông tin đăng nhập tới ${email}.`,
        createdEmployee
      );

      resetForm();
      onClose();
    } catch (err: any) {
      onError(err?.response?.data?.message || err?.message || "Có lỗi xảy ra khi tạo nhân viên mới.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-2xl">
        {/* Modal Header */}
        <DialogHeader className="p-6 bg-slate-900 text-white space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600 text-white">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-white">
                  Thêm 1 Nhân Viên Mới & Tạo Hợp Đồng
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  Nhập thông tin cá nhân, vị trí công việc, khởi tạo hợp đồng điện tử và tự động gửi mail
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Tab Navigation Header */}
        <div className="bg-slate-100/80 px-6 pt-3 border-b border-slate-200">
          <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as "personal" | "employment" | "contract")}>
            <TabsList className="bg-slate-200/70 p-1 border border-slate-300/60 rounded-xl space-x-1">
              {/* Tab 1 Trigger */}
              <TabsTrigger
                value="personal"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold text-xs sm:text-sm px-4 py-2"
              >
                <User className="w-4 h-4 mr-1.5 text-blue-600" />
                1. Thông Tin Cá Nhân
                {isPersonalValid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 ml-2 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 ml-2 text-amber-500" />
                )}
              </TabsTrigger>

              {/* Tab 2 Trigger */}
              <TabsTrigger
                value="employment"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold text-xs sm:text-sm px-4 py-2"
              >
                <Briefcase className="w-4 h-4 mr-1.5 text-purple-600" />
                2. Hồ Sơ Công Việc
                {isEmploymentValid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 ml-2 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 ml-2 text-amber-500" />
                )}
              </TabsTrigger>

              {/* Tab 3 Trigger */}
              <TabsTrigger
                value="contract"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold text-xs sm:text-sm px-4 py-2"
              >
                <FileText className="w-4 h-4 mr-1.5 text-emerald-600" />
                3. Hợp Đồng Lao Động
                {isContractValid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 ml-2 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 ml-2 text-amber-500" />
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {activeTab === "personal" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                <span>Điền thông tin cá nhân cơ bản của nhân viên để khởi tạo tài khoản đăng nhập hệ thống.</span>
                <Badge className="bg-blue-600 text-white text-[10px]">Bước 1/3</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">
                    Địa Chỉ Email * (Dùng gửi tài khoản & hợp đồng)
                  </Label>
                  <Input
                    type="email"
                    placeholder="VD: anh.nguyen@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-10 text-sm"
                  />
                  {email && !isValidEmail(email) && (
                    <p className="text-[11px] text-red-500">Email không đúng định dạng</p>
                  )}
                  {errors.email && !email && <p className="text-[11px] text-red-600">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">
                    Số Điện Thoại *
                  </Label>
                  <Input
                    placeholder="VD: 0901234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="h-10 text-sm"
                  />
                  {errors.phone && <p className="text-[11px] text-red-600">{errors.phone}</p>}
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">Giới Tính *</Label>
                  <Select value={gender === null ? "" : String(gender)} onValueChange={(v) => setGender(Number(v))}>
                    <SelectTrigger className="h-10 text-sm bg-white">
                      <SelectValue placeholder="-- Chọn giới tính --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Nam</SelectItem>
                      <SelectItem value="1">Nữ</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && <p className="text-[11px] text-red-600">{errors.gender}</p>}
                </div>

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">Ngày Sinh *</Label>
                  <DatePickerInput
                    value={dateOfBirth}
                    onChange={setDateOfBirth}
                    placeholder="dd/mm/yyyy"
                    minYear={1950}
                    maxYear={new Date().getFullYear() - 18}
                    className="text-sm"
                  />
                  {errors.dateOfBirth && <p className="text-[11px] text-red-600">{errors.dateOfBirth}</p>}
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button
                  type="button"
                  onClick={handleContinuePersonal}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-5"
                >
                  Tiếp Theo: Hồ Sơ Công Việc &rarr;
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: THÔNG TIN CÔNG VIỆC */}
          {activeTab === "employment" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
                <span>Cấu hình phòng ban, vị trí, hình thức làm việc và quyền truy cập hệ thống.</span>
                <Badge className="bg-purple-600 text-white text-[10px]">Bước 2/3</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Department Select */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">Phòng Ban *</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger className="h-10 text-sm bg-white">
                      <SelectValue placeholder="-- Chọn phòng ban --" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.departmentId && <p className="text-[11px] text-red-600">{errors.departmentId}</p>}
                </div>

                {/* Position */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">
                    Chức Danh / Vị Trí *
                  </Label>
                  <Input
                    placeholder="VD: Giảng viên Senior Java / Chuyên viên Đào tạo"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    required
                    className="h-10 text-sm"
                  />
                  {errors.position && <p className="text-[11px] text-red-600">{errors.position}</p>}
                </div>

                {/* Employment Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">
                    Hình Thức Làm Việc *
                  </Label>
                  <Select
                    value={employmentTypeEnum}
                    onValueChange={(v: any) => setEmploymentTypeEnum(v)}
                  >
                    <SelectTrigger className="h-10 text-sm bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Toàn thời gian</SelectItem>
                      <SelectItem value="PART_TIME">Bán thời gian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-800">Vai Trò Hệ Thống *</Label>
                  <Select value={selectedRoleIds[0] || ""} onValueChange={(value) => setSelectedRoleIds([value])}>
                    <SelectTrigger className="h-10 text-sm bg-white">
                      <SelectValue placeholder="-- Chọn quyền truy cập --" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedRoles.map((role) => (
                        <SelectItem key={role.id} value={String(role.id)}>{role.name} ({role.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-500">
                    {employmentTypeEnum === "FULL_TIME" ? "Toàn thời gian: HR hoặc Giảng viên." : "Bán thời gian: chỉ Trợ giảng (TA)."}
                  </p>
                  {errors.roleId && <p className="text-[11px] text-red-600">{errors.roleId}</p>}
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Button type="button" variant="outline" onClick={() => setActiveTab("personal")}>
                  &larr; Quay Lại
                </Button>
                <Button
                  type="button"
                  onClick={handleContinueEmployment}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-5"
                >
                  Tiếp Theo: Khởi Tạo Hợp Đồng &rarr;
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: HỢP ĐỒNG LAO ĐỘNG (Option A: Upload File vs Option B: Live Web Generator) */}
          {activeTab === "contract" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-bold">Lựa chọn Phương Thức Tạo Hợp Đồng Lao Động:</p>
                <p>
                  Bạn có thể tải file PDF/DOCX có sẵn hoặc tự động tạo file hợp đồng điện tử trực tiếp trên Web với dữ liệu thời gian thực vừa nhập!
                </p>
              </div>

              {/* Visual Card Selector for Contract Option */}
              <div className="grid grid-cols-2 gap-4">
                {/* Option 1: Upload File */}
                <div
                  className={`cursor-pointer border-2 rounded-xl p-4 transition-all flex flex-col justify-between ${
                    contractOption === "UPLOAD"
                      ? "border-blue-600 bg-blue-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                  onClick={() => setContractOption("UPLOAD")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                      <FileUp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-900 block">Tải Tệp Hợp Đồng</span>
                      <span className="text-[11px] text-slate-500">File PDF/DOCX từ máy tính</span>
                    </div>
                  </div>
                </div>

                {/* Option 2: Live Web Contract Generator */}
                <div
                  className={`cursor-pointer border-2 rounded-xl p-4 transition-all flex flex-col justify-between ${
                    contractOption === "WEB_GENERATE"
                      ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                  onClick={() => setContractOption("WEB_GENERATE")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-900 block">Tạo Hợp Đồng Trên Web</span>
                      <span className="text-[11px] text-slate-500">Tự điền dữ liệu realtime vào mẫu</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                {isTeachingContract && (
                  <div className="sm:col-span-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                    <p className="font-semibold">Hợp đồng dành cho {selectedRole?.code === "TA" ? "trợ giảng" : "giảng viên"}</p>
                    <p className="mt-1 text-blue-700">Không xác định thời hạn · trả theo giờ dạy · đơn giá được thiết lập riêng khi phân công từng lớp.</p>
                  </div>
                )}
                {!isTeachingContract && (
                  <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">Loại Hợp Đồng *</Label>
                  <Select value={contractType} onValueChange={(value: any) => setContractType(value)}>
                    <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROBATION">Thỏa thuận thử việc</SelectItem>
                      <SelectItem value="FIXED_TERM">Hợp đồng xác định thời hạn</SelectItem>
                      <SelectItem value="INDEFINITE">Hợp đồng không xác định thời hạn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">Hình Thức Trả Lương *</Label>
                  <Select value={salaryType} onValueChange={(value: any) => setSalaryType(value)}>
                    <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Theo tháng</SelectItem>
                      <SelectItem value="DAILY">Theo ngày</SelectItem>
                      <SelectItem value="HOURLY">Theo giờ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                  </>
                )}
                <DatePickerInput label="Ngày hiệu lực *" value={startDate} onChange={setStartDate} placeholder="dd/mm/yyyy" minYear={2000} maxYear={2100} />
                {requiresEndDate && <DatePickerInput label="Ngày kết thúc *" value={endDate} onChange={setEndDate} placeholder="dd/mm/yyyy" minYear={2000} maxYear={2100} />}
                <DatePickerInput label="Ngày ký *" value={signedAt} onChange={setSignedAt} placeholder="dd/mm/yyyy" minYear={2000} maxYear={2100} />
                {!isTeachingContract && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">Mức Lương Theo Hợp Đồng *</Label>
                  <div className="relative">
                    <Input type="number" min={1} value={baseSalary || ""} onChange={(e) => setBaseSalary(Number(e.target.value))} className="h-10 bg-white pl-8" placeholder="Nhập mức lương" />
                    <DollarSign className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                  </div>
                  {errors.baseSalary && <p className="text-[11px] text-red-600">{errors.baseSalary}</p>}
                </div>
                )}
                {(errors.startDate || errors.endDate || errors.signedAt) && (
                  <p className="sm:col-span-2 text-[11px] text-red-600">{errors.startDate || errors.endDate || errors.signedAt}</p>
                )}
              </div>

              {/* OPTION A: UPLOAD FILE SECTION */}
              {contractOption === "UPLOAD" && (
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <Label className="text-xs font-bold text-slate-800 block">
                    Tải Tệp Hợp Đồng Lao Động (PDF) *
                  </Label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-white hover:border-blue-400 transition-colors">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 font-medium">
                      Kéo thả file hợp đồng vào đây hoặc chọn tệp từ máy tính
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Định dạng hỗ trợ: .pdf (Dung lượng tối đa 10MB)</p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="contract-file-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 text-xs"
                      onClick={() => document.getElementById("contract-file-input")?.click()}
                    >
                      Chọn Tệp File
                    </Button>

                    {uploadedFile && (
                      <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                        <span className="font-bold flex items-center gap-1.5">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                          onClick={() => setUploadedFile(null)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* OPTION B: LIVE REACTIVE CONTRACT GENERATOR PREVIEW */}
              {contractOption === "WEB_GENERATE" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-800">Mẫu Hợp Đồng *</Label>
                      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={loadingTemplates}>
                        <SelectTrigger className="h-10 text-sm bg-white">
                          <SelectValue placeholder={loadingTemplates ? "Đang tải mẫu..." : "-- Chọn mẫu hợp đồng --"} />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.templateId} value={String(template.templateId)}>
                              {template.name} · v{template.version}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* LIVE CONTRACT DOCUMENT PREVIEW CARD */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold uppercase text-slate-700 flex items-center gap-1">
                        <Sparkles className="w-4 h-4 text-emerald-600" /> Xem Trước File Hợp Đồng Điền Tự Động (Live Preview):
                      </span>
                      <Badge className="bg-emerald-100 text-emerald-800">Bản Xem Trước Hợp Đồng</Badge>
                    </div>

                    <div className="border border-slate-300 rounded-xl p-5 bg-white text-slate-900 text-xs leading-relaxed shadow-inner max-h-72 overflow-y-auto">
                      {previewHtml ? (
                        <div className="contract-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                      ) : (
                        <div className="py-8 text-center text-slate-500">
                          {previewError || (loadingTemplates ? "Đang tải mẫu hợp đồng..." : "Chọn mẫu để xem nội dung hợp đồng thật.")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {errors.contract && <p className="text-xs font-medium text-red-600">{errors.contract}</p>}

              {/* Bottom Footer Submit */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Button type="button" variant="outline" onClick={() => setActiveTab("employment")}>
                  &larr; Quay Lại
                </Button>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 h-10 shadow-md"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang Tạo Nhân Viên & Gửi Email...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" /> Tạo Nhân Viên & Tự Động Gửi Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
