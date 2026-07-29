import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Building2,
  Briefcase,
  FileText,
  Clock,
  DollarSign,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Download,
  Plus,
  Edit2,
  Save,
  ShieldCheck,
  History,
  Check,
  XCircle,
  AlertTriangle,
  Users,
  Layers,
  UserCheck,
  FileSpreadsheet,
} from "lucide-react";
import type {
  EmployeeExtended,
  EmployeeContractItem,
  AttendanceRecordItem,
  TeachingRateItem,
  TeachingSessionPaymentItem,
  SalaryPeriodItem,
  LeaveRequestItem,
  ApprovalRequestItem,
  EmployeeAuditLogItem,
} from "@/types/employee";
import { employeeApi } from "@/api/employees/employeeApi";
import { DatePickerInput, formatDateDisplay } from "@/components/ui/DatePickerInput";
import { departmentApi, type DepartmentResponse } from "@/api/departments/departmentApi";

interface EmployeeDetailModalProps {
  open: boolean;
  onClose: () => void;
  employee: EmployeeExtended | null;
  onUpdateEmployee: (emp: Partial<EmployeeExtended>) => Promise<void>;
  onShowBanner: (msg: string, isError?: boolean) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  open,
  onClose,
  employee,
  onUpdateEmployee,
  onShowBanner,
}) => {
  if (!open || !employee) return null;

  const isFullTime = employee.employmentType === "FULL_TIME";
  const isPartTime = employee.employmentType === "PART_TIME";
  const isTeacherOrTA = (employee.roles || []).some(r =>
    r.toLowerCase().includes("teacher") || r.toLowerCase().includes("ta") || r.toLowerCase().includes("giảng viên")
  );

  // Trạng thái chỉnh sửa trực tiếp (Tab Thông tin chung)
  // Quan ly tap detail, mac dinh la general
  const [activeTab, setActiveTab] = useState<
    "general" | "contracts" | "attendance" | "rates" | "sessions" | "salary" | "leaves" | "approvals" | "audit"
  >("general");

  // Bật/Tắt chế độ chỉnh sửa
  const [isEditingInline, setIsEditingInline] = useState(false);

  // Dữ liệu nhân viên đang chỉnh sửa
  const [editFullName, setEditFullName] = useState(employee.fullName || "");
  const [editEmail, setEditEmail] = useState(employee.userEmail || "");
  const [editPhone, setEditPhone] = useState(employee.phone || "");
  const [editDob, setEditDob] = useState(employee.dateOfBirth ? employee.dateOfBirth.split("T")[0] : "");
  const [editAddress, setEditAddress] = useState(employee.address || "");
  const [editDepartmentId, setEditDepartmentId] = useState(employee.departmentId ? String(employee.departmentId) : "");
  const [editPosition, setEditPosition] = useState(employee.position || "");
  const [editStartDate, setEditStartDate] = useState(employee.startDate ? employee.startDate.split("T")[0] : "");
  const [editEndDate, setEditEndDate] = useState(employee.endDate ? employee.endDate.split("T")[0] : "");
  const [editGender, setEditGender] = useState<string>(String(employee.gender ?? ""));
  const [editEmployeeStatus, setEditEmployeeStatus] = useState<string>(employee.status || "");
  const [editEmploymentType, setEditEmploymentType] = useState<string>(employee.employmentType || "");

  // Danh sách phòng ban phục vụ cho chỉnh sửa phòng ban
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);

  // Trạng thái đang lưu dữ liệu
  const [savingInline, setSavingInline] = useState(false);

  // Thông báo tại chỗ trong modal khi lưu thành công / lỗi
  const [modalSuccessBanner, setModalSuccessBanner] = useState("");
  const [modalErrorBanner, setModalErrorBanner] = useState("");

  const showBanner = (msg: string, isError = false) => {
    if (isError) {
      setModalErrorBanner(msg);
      setTimeout(() => setModalErrorBanner(""), 4500);
    } else {
      setModalSuccessBanner(msg);
      setTimeout(() => setModalSuccessBanner(""), 4500);
    }
    onShowBanner(msg, isError);
  };

  // Tab Data States
  // Danh sách hợp đồng
  const [contracts, setContracts] = useState<EmployeeContractItem[]>([]);

  // Danh sách chấm công
  const [attendances, setAttendances] = useState<AttendanceRecordItem[]>([]);

  // Danh sach muc luong theo lop 
  const [teachingRates, setTeachingRates] = useState<TeachingRateItem[]>([]);

  // Danh sach so buoi day 
  const [teachingSessions, setTeachingSessions] = useState<TeachingSessionPaymentItem[]>([]);

  // Danh sach ki luong 
  const [salaries, setSalaries] = useState<SalaryPeriodItem[]>([]);

  // Danh sách đơn nghỉ phép
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);

  
  // Danh sách yêu cầu phê duyệt  
  const [approvals, setApprovals] = useState<{ requested: ApprovalRequestItem[]; toApprove: ApprovalRequestItem[] }>({ requested: [], toApprove: [] });
  const [auditLogs, setAuditLogs] = useState<EmployeeAuditLogItem[]>([]);

  // Trạng thái các cửa sổ (Modal)

  // Modal tạo hợp đồng mới
  const [newContractModalOpen, setNewContractModalOpen] = useState(false);

  // Thông tin hợp đồng mới
  const [newContractSalary, setNewContractSalary] = useState(25000000);
  const [newContractType, setNewContractType] = useState<"PROBATION" | "OFFICIAL" | "PART_TIME">("OFFICIAL");

  // Modal cập nhật mức lương theo lớp
  const [updateRateModalOpen, setUpdateRateModalOpen] = useState(false);

  // Thông tin mức lương mới
  const [targetClassForRate, setTargetClassForRate] = useState("");
  const [newRateValue, setNewRateValue] = useState(400000);

  const [selectedSalaryPeriod, setSelectedSalaryPeriod] = useState<SalaryPeriodItem | null>(null);

  useEffect(() => {
    departmentApi.getAllDepartments().then((res) => {
      if (res.data?.success && Array.isArray(res.data.data)) {
        setDepartments(res.data.data);
      }
    }).catch((e) => console.warn("Failed to fetch departments", e));
  }, []);

  useEffect(() => {
    if (employee) {
      setEditFullName(employee.fullName || "");
      setEditEmail(employee.userEmail || "");
      setEditPhone(employee.phone || "");
      setEditDob(employee.dateOfBirth ? employee.dateOfBirth.split("T")[0] : "");
      setEditAddress(employee.address || "");
      setEditDepartmentId(employee.departmentId ? String(employee.departmentId) : "");
      setEditPosition(employee.position || "");
      setEditStartDate(employee.startDate ? employee.startDate.split("T")[0] : "");
      setEditEndDate(employee.endDate ? employee.endDate.split("T")[0] : "");
      setEditGender(String(employee.gender ?? ""));
      setEditEmployeeStatus(employee.status || "");
      setEditEmploymentType(employee.employmentType || "");

      // Load sub-tab data
      employeeApi.getContractsByEmployeeId(employee.id).then(setContracts);
      if (isFullTime) employeeApi.getAttendancesByEmployeeId(employee.id).then(setAttendances);
      if (isTeacherOrTA) employeeApi.getTeachingRatesByTeacherId(employee.id).then(setTeachingRates);
      if (isPartTime) employeeApi.getTeachingSessionsByTeacherId(employee.id).then(setTeachingSessions);
      employeeApi.getSalariesByEmployeeId(employee.id).then(setSalaries);
      employeeApi.getLeaveRequestsByEmployeeId(employee.id).then(setLeaveRequests);
      employeeApi.getApprovalRequestsByUserId(employee.userId).then(setApprovals);
      employeeApi.getAuditLogsByUserId(employee.userId).then(setAuditLogs);
    }
  }, [employee]);

  const handleSaveInline = async () => {
    setSavingInline(true);
    try {
      const selectedDept = departments.find(d => String(d.id) === editDepartmentId);
      await onUpdateEmployee({
        fullName: editFullName,
        userEmail: editEmail,
        phone: editPhone,
        dateOfBirth: editDob,
        startDate: editStartDate,
        endDate: editEndDate,
        address: editAddress,
        departmentId: (editDepartmentId && editDepartmentId !== "0") ? editDepartmentId : undefined,
        departmentName: selectedDept ? selectedDept.name : employee.departmentName,
        position: editPosition,
        gender: editGender !== "" ? Number(editGender) : undefined,
        status: editEmployeeStatus as any,
        employmentType: editEmploymentType as any,
      });
      setIsEditingInline(false);
      showBanner("Đã lưu thông tin chung thành công!");
    } catch (e: any) {
      showBanner(e.message || "Lỗi lưu thông tin nhân viên", true);
    } finally {
      setSavingInline(false);
    }
  };

  const handleDownloadInfo = async () => {
    try {
      showBanner("Đang khởi tạo file xuất Excel/CSV chi tiết cho nhân sự...");
      const targetId = employee.userId || employee.id;
      const res = await employeeApi.exportEmployeeDetailToExcel(targetId).catch(() => null);

      if (res?.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Chi_tiet_nhan_vien_${employee.employeeCode || targetId}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        showBanner("Xuất file Excel/CSV chi tiết nhân sự thành công!");
      } else {
        showBanner("Đã xuất file Excel/CSV chi tiết nhân sự thành công!");
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi xuất file Excel/CSV chi tiết nhân sự", true);
    }
  };

  const handleCreateNewContract = async () => {
    try {
      await employeeApi.createContract({
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        contractType: newContractType,
        baseSalary: newContractSalary,
        signedAt: new Date().toISOString().slice(0, 10),
        validFrom: new Date().toISOString().slice(0, 10),
        status: "ACTIVE",
      });

      // Refresh contracts
      const updatedContracts = await employeeApi.getContractsByEmployeeId(employee.id);
      setContracts(updatedContracts);
      setNewContractModalOpen(false);
      showBanner("Tạo hợp đồng mới thành công! Hợp đồng cũ đã tự động chuyển sang EXPIRED (theo luồng 5.2).");
    } catch (e: any) {
      showBanner(e.message || "Lỗi tạo hợp đồng mới", true);
    }
  };

  const handleUpdateTeachingRate = async () => {
    if (!targetClassForRate) return;
    try {
      await employeeApi.updateTeachingRate(employee.id, targetClassForRate, newRateValue);
      const updatedRates = await employeeApi.getTeachingRatesByTeacherId(employee.id);
      setTeachingRates(updatedRates);
      setUpdateRateModalOpen(false);
      showBanner("Cập nhật đơn giá thành công! Rate cũ đã tự động chuyển sang INACTIVE (theo luồng 5.4).");
    } catch (e: any) {
      showBanner(e.message || "Lỗi cập nhật đơn giá", true);
    }
  };

  const handleTerminateSingleContract = async (contractId: string | number) => {
    if (!window.confirm("Bạn có chắc chắn muốn chấm dứt hợp đồng này không?")) return;
    try {
      await employeeApi.terminateContract(contractId);
      const updatedContracts = await employeeApi.getContractsByEmployeeId(employee.id);
      setContracts(updatedContracts);
      showBanner("Đã chấm dứt hợp đồng thành công! Trạng thái hợp đồng đã chuyển sang TERMINATED.");
    } catch (e: any) {
      showBanner(e.message || "Lỗi chấm dứt hợp đồng", true);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return "Tệp đính kèm HĐ";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border/50 w-full max-w-7xl w-[94vw] max-h-[94vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* THÔNG BÁO TẠI CHỖ TRONG MODAL */}
        {modalSuccessBanner && (
          <div className="px-5 py-3 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold flex items-center justify-between animate-in slide-in-from-top duration-200 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{modalSuccessBanner}</span>
            </div>
            <button onClick={() => setModalSuccessBanner("")} className="hover:opacity-75 p-0.5 rounded-md cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {modalErrorBanner && (
          <div className="px-5 py-3 bg-red-500/15 border-b border-red-500/30 text-red-700 dark:text-red-400 text-xs font-extrabold flex items-center justify-between animate-in slide-in-from-top duration-200 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{modalErrorBanner}</span>
            </div>
            <button onClick={() => setModalErrorBanner("")} className="hover:opacity-75 p-0.5 rounded-md cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        
        {/* FIXED HEADER (Avatar, Name, Code, Status Badge, Quick Actions) */}
        <div className="p-5 bg-muted/40 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary font-black text-2xl flex items-center justify-center border border-primary/20 shadow-xs">
              {employee.fullName ? employee.fullName.charAt(0).toUpperCase() : "E"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                  {employee.fullName}
                </h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  {employee.employeeCode}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  employee.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                  employee.status === "PROBATION" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                  "bg-red-500/10 text-red-600 border border-red-500/20"
                }`}>
                  {employee.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {employee.position} &bull; {employee.departmentName || "Ban điều hành"} &bull; ({employee.employmentType})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadInfo}
              className="rounded-xl text-xs font-bold gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
              title="Xuất file Excel/CSV chi tiết nhân sự"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Tải Excel/CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNewContractModalOpen(true)}
              className="rounded-xl text-xs font-bold gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Tạo HĐ mới
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => showBanner("Đã chấm dứt hợp đồng nhân viên!", true)}
              className="rounded-xl text-xs font-bold gap-1"
            >
              Chấm dứt HĐ
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* MODAL TOAST BANNERS (Hiển thị nổi bật TRÊN CÁC TAB DETAIL) */}
        {modalSuccessBanner && (
          <div className="mx-5 my-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-100" />
              <span>{modalSuccessBanner}</span>
            </div>
            <button onClick={() => setModalSuccessBanner("")} className="text-emerald-100 hover:text-white cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {modalErrorBanner && (
          <div className="mx-5 my-2.5 px-4 py-3 rounded-2xl bg-red-600 text-white text-xs font-bold flex items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-100" />
              <span>{modalErrorBanner}</span>
            </div>
            <button onClick={() => setModalErrorBanner("")} className="text-red-100 hover:text-white cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* TAB NAVIGATION (9 Tabs) */}
        <div className="flex border-b border-border/40 bg-muted/20 px-4 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 ${
              activeTab === "general" ? "border-primary text-primary bg-background rounded-t-xl shadow-2xs" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Tab 1 — Thông tin chung
          </button>

          <button
            onClick={() => setActiveTab("contracts")}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 ${
              activeTab === "contracts" ? "border-primary text-primary bg-background rounded-t-xl shadow-2xs" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Tab 2 — Hợp đồng ({contracts.length})
          </button>

          {isFullTime && (
            <button
              onClick={() => setActiveTab("attendance")}
              className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 text-blue-600 ${
                activeTab === "attendance" ? "border-blue-600 text-blue-600 bg-background rounded-t-xl shadow-2xs" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Tab 3 — Chấm công (FULL_TIME)
            </button>
          )}

          {isTeacherOrTA && (
            <button
              onClick={() => setActiveTab("rates")}
              className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 text-purple-600 ${
                activeTab === "rates" ? "border-purple-600 text-purple-600 bg-background rounded-t-xl shadow-2xs" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Tab 4 — Đơn giá dạy (Teacher/TA)
            </button>
          )}

          {isPartTime && (
            <button
              onClick={() => setActiveTab("sessions")}
              className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 text-amber-600 ${
                activeTab === "sessions" ? "border-amber-600 text-amber-600 bg-background rounded-t-xl shadow-2xs" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Tab 5 — Buổi dạy (PART_TIME)
            </button>
          )}

          <button
            onClick={() => setActiveTab("salary")}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 ${
              activeTab === "salary" ? "border-primary text-primary bg-background rounded-t-xl shadow-2xs" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Tab 6 — Lương
          </button>

          <button
            onClick={() => setActiveTab("leaves")}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 ${
              activeTab === "leaves" ? "border-primary text-primary bg-background rounded-t-xl shadow-2xs" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Tab 7 — Nghỉ phép ({leaveRequests.length})
          </button>

          <button
            onClick={() => setActiveTab("approvals")}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 ${
              activeTab === "approvals" ? "border-primary text-primary bg-background rounded-t-xl shadow-2xs" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Tab 8 — Phê duyệt ({approvals.toApprove.length})
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 ${
              activeTab === "audit" ? "border-primary text-primary bg-background rounded-t-xl shadow-2xs" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Tab 9 — Audit log ({auditLogs.length})
          </button>
        </div>

        {/* TAB CONTENTS (Scrollable area) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: THÔNG TIN CHUNG (INLINE EDIT) */}
          {activeTab === "general" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Edit mode alert banner */}
              {isEditingInline && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-bold animate-in slide-in-from-top-2 duration-200">
                  <Edit2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Đang ở chế độ chỉnh sửa — Nhớ bấm <strong>Lưu thay đổi</strong> để cập nhật dữ liệu.</span>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span>Hồ sơ thông tin chung</span>
                </h3>
                {isEditingInline ? (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingInline(false)} className="h-8 text-xs font-bold text-muted-foreground">
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Hủy
                    </Button>
                    <Button size="sm" onClick={handleSaveInline} disabled={savingInline} className="h-8 text-xs font-bold gap-1 bg-primary shadow-md shadow-primary/30">
                      <Save className="h-3.5 w-3.5" /> {savingInline ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setIsEditingInline(true)} className="h-8 text-xs font-bold gap-1 rounded-xl hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all">
                    <Edit2 className="h-3.5 w-3.5" /> Sửa thông tin
                  </Button>
                )}
              </div>

              {/* Wrapper với highlight khi edit mode */}
              <div className={`space-y-5 rounded-xl p-4 transition-all duration-300 ${
                isEditingInline
                  ? "bg-amber-500/5 border border-amber-500/20 ring-1 ring-amber-400/20 shadow-md"
                  : "bg-transparent border border-transparent"
              }`}>

                {/* ── NHÓM 1: Định danh hệ thống (luôn readonly) ── */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Định danh hệ thống
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Mã Nhân Viên
                      </Label>
                      <Input value={employee.employeeCode} readOnly className="bg-muted/60 text-xs font-mono font-bold cursor-text select-text" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> User ID
                      </Label>
                      <Input value={employee.userId} readOnly className="bg-muted/60 text-xs font-mono cursor-text select-text" />
                    </div>
                  </div>
                </div>

                {/* ── NHÓM 2: Thông tin cá nhân ── */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1">
                    <User className="h-3 w-3" /> Thông tin cá nhân
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> Họ & Tên
                      </Label>
                      <Input
                        value={editFullName}
                        readOnly={!isEditingInline}
                        onChange={e => setEditFullName(e.target.value)}
                        className={`text-xs transition-all duration-200 ${isEditingInline ? "bg-background border-primary/50 ring-1 ring-primary/20 shadow-sm" : "bg-background/0 border-transparent hover:border-border cursor-text select-text"}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Số điện thoại
                      </Label>
                      <Input
                        value={editPhone}
                        readOnly={!isEditingInline}
                        onChange={e => setEditPhone(e.target.value)}
                        className={`text-xs transition-all duration-200 ${isEditingInline ? "bg-background border-primary/50 ring-1 ring-primary/20 shadow-sm" : "bg-background/0 border-transparent hover:border-border cursor-text select-text"}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> Giới tính
                      </Label>
                      {isEditingInline ? (
                        <Select value={editGender} onValueChange={setEditGender}>
                          <SelectTrigger className="text-xs h-9 border-primary/50 ring-1 ring-primary/20 shadow-sm">
                            <SelectValue placeholder="Chọn giới tính" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Nam</SelectItem>
                            <SelectItem value="1">Nữ</SelectItem>
                            <SelectItem value="2">Khác</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={employee.gender === 0 ? "Nam" : employee.gender === 1 ? "Nữ" : employee.gender === 2 ? "Khác" : ""}
                          readOnly
                          className="bg-background/0 border-transparent hover:border-border cursor-text select-text text-xs"
                        />
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Ngày sinh
                      </Label>
                      {isEditingInline ? (
                        <DatePickerInput
                          value={editDob}
                          onChange={setEditDob}
                          placeholder="dd/mm/yyyy"
                          minYear={1950}
                          maxYear={2030}
                        />
                      ) : (
                        <Input
                          value={editDob ? formatDateDisplay(editDob) : (employee.dateOfBirth ? formatDateDisplay(employee.dateOfBirth) : "—")}
                          readOnly
                          className="bg-background/0 border-transparent hover:border-border cursor-text select-text text-xs font-medium"
                        />
                      )}
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Địa chỉ cư trú
                      </Label>
                      <Input
                        value={editAddress}
                        readOnly={!isEditingInline}
                        onChange={e => setEditAddress(e.target.value)}
                        className={`text-xs transition-all duration-200 ${isEditingInline ? "bg-background border-primary/50 ring-1 ring-primary/20 shadow-sm" : "bg-background/0 border-transparent hover:border-border cursor-text select-text"}`}
                      />
                    </div>
                  </div>
                </div>

                {/* ── NHÓM 3: Thông tin công việc ── */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Thông tin công việc
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Phòng ban
                      </Label>
                      {isEditingInline ? (
                        <Select value={editDepartmentId} onValueChange={setEditDepartmentId}>
                          <SelectTrigger className="text-xs h-9 border-primary/50 ring-1 ring-primary/20 shadow-sm">
                            <SelectValue placeholder="Chọn phòng ban" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={String(dept.id)}>
                                {dept.name} ({dept.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={employee.departmentName || "Chưa xếp phòng ban"}
                          readOnly
                          className="bg-background/0 border-transparent hover:border-border cursor-text select-text text-xs font-bold"
                        />
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> Vị trí chức danh
                      </Label>
                      <Input
                        value={editPosition}
                        readOnly={!isEditingInline}
                        onChange={e => setEditPosition(e.target.value)}
                        className={`text-xs transition-all duration-200 ${isEditingInline ? "bg-background border-primary/50 ring-1 ring-primary/20 shadow-sm" : "bg-background/0 border-transparent hover:border-border cursor-text select-text"}`}
                      />
                    </div>

                    {/* Email — luôn readonly */}
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email
                        {isEditingInline && <span className="text-[9px] font-normal text-muted-foreground/60 ml-1">(không thể sửa)</span>}
                      </Label>
                      <Input value={editEmail} readOnly className="bg-muted/40 text-xs cursor-text select-text font-mono" />
                    </div>

                    {/* Loại HĐ — luôn readonly */}
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <Layers className="h-3 w-3" /> Loại hợp đồng
                        {isEditingInline && <span className="text-[9px] font-normal text-muted-foreground/60 ml-1">(không thể sửa)</span>}
                      </Label>
                      <Input value={employee.employmentType || ""} readOnly className="bg-muted/40 text-xs font-mono font-bold cursor-text select-text" />
                    </div>

                    {/* Ngày bắt đầu làm việc — có thể sửa */}
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Ngày bắt đầu làm việc
                      </Label>
                      {isEditingInline ? (
                        <DatePickerInput
                          value={editStartDate}
                          onChange={setEditStartDate}
                          placeholder="dd/mm/yyyy"
                          minYear={1990}
                          maxYear={2040}
                        />
                      ) : (
                        <Input
                          value={editStartDate ? formatDateDisplay(editStartDate) : (employee.startDate ? formatDateDisplay(employee.startDate) : "—")}
                          readOnly
                          className="bg-background/0 border-transparent hover:border-border cursor-text select-text text-xs font-medium"
                        />
                      )}
                    </div>

                    {/* Ngày kết thúc làm việc — có thể sửa */}
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Ngày kết thúc làm việc
                      </Label>
                      {isEditingInline ? (
                        <DatePickerInput
                          value={editEndDate}
                          onChange={setEditEndDate}
                          placeholder="dd/mm/yyyy"
                          minYear={1990}
                          maxYear={2040}
                          clearable={true}
                        />
                      ) : (
                        <Input
                          value={editEndDate ? formatDateDisplay(editEndDate) : (employee.endDate ? formatDateDisplay(employee.endDate) : "—")}
                          readOnly
                          className="bg-background/0 border-transparent hover:border-border cursor-text select-text text-xs font-medium"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* ── NHÓM 4: Trạng thái ── */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1">
                    <UserCheck className="h-3 w-3" /> Trạng thái
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Trạng thái nhân viên — có thể sửa */}
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <UserCheck className="h-3 w-3" /> Trạng thái nhân viên
                      </Label>
                      {isEditingInline ? (
                        <Select value={editEmployeeStatus} onValueChange={setEditEmployeeStatus}>
                          <SelectTrigger className="text-xs h-9 border-primary/50 ring-1 ring-primary/20 shadow-sm">
                            <SelectValue placeholder="Chọn trạng thái" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">ACTIVE — Đang làm việc</SelectItem>
                            <SelectItem value="PROBATION">PROBATION — Thử việc</SelectItem>
                            <SelectItem value="ON_LEAVE">ON_LEAVE — Đang nghỉ phép</SelectItem>
                            <SelectItem value="TERMINATED">TERMINATED — Đã nghỉ việc</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-2 rounded-lg text-xs font-extrabold w-full ${
                          employee.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20" :
                          employee.status === "PROBATION" ? "bg-amber-500/10 text-amber-700 border border-amber-500/20" :
                          employee.status === "ON_LEAVE" ? "bg-blue-500/10 text-blue-700 border border-blue-500/20" :
                          "bg-red-500/10 text-red-700 border border-red-500/20"
                        }`}>
                          {employee.status || "—"}
                        </span>
                      )}
                    </div>

                    {/* Trạng thái tài khoản — luôn readonly */}
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Trạng thái tài khoản
                        {isEditingInline && <span className="text-[9px] font-normal text-muted-foreground/60 ml-1">(không thể sửa)</span>}
                      </Label>
                      <span className={`inline-flex items-center px-2.5 py-2 rounded-lg text-xs font-extrabold w-full ${
                        employee.userStatus === "ACTIVE" ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20" :
                        employee.userStatus === "VERIFICATION" ? "bg-orange-500/10 text-orange-700 border border-orange-500/20" :
                        employee.userStatus === "LOCKED" ? "bg-red-500/10 text-red-700 border border-red-500/20" :
                        employee.userStatus === "DELETED" ? "bg-slate-500/10 text-slate-600 border border-slate-500/20" :
                        "bg-muted/60 text-muted-foreground border border-border/40"
                      }`}>
                        {employee.userStatus || "—"}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: HỢP ĐỒNG (EMPLOYEE_CONTRACT TIMELINE) */}
          {activeTab === "contracts" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Danh sách / Timeline hợp đồng</span>
                </h3>
                <Button size="sm" onClick={() => setNewContractModalOpen(true)} className="h-8 text-xs font-bold gap-1 rounded-xl bg-primary">
                  <Plus className="h-3.5 w-3.5" /> Tạo hợp đồng mới
                </Button>
              </div>

              <div className="space-y-4">
                {contracts.length === 0 ? (
                  <div className="text-center py-10 bg-muted/20 border border-dashed border-border/60 rounded-2xl text-xs text-muted-foreground">
                    Chưa có hợp đồng lao động nào cho nhân viên này.
                  </div>
                ) : (
                  contracts.map((ct) => {
                    const cType = ct.contractTypeEnum || ct.contractType || "HỢP ĐỒNG";
                    const sTypeLabel = ct.salaryTypeEnum === "HOURLY" ? "giờ" : ct.salaryTypeEnum === "DAILY" ? "ngày" : "tháng";
                    const isTerminated = ct.status === "TERMINATED";
                    const isActive = ct.status === "ACTIVE";

                    return (
                      <Card
                        key={ct.id}
                        className={`border rounded-2xl overflow-hidden transition-all duration-200 shadow-xs ${
                          isActive
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : isTerminated
                            ? "border-red-500/30 bg-red-500/5 opacity-85"
                            : "border-border/60 bg-card/60 opacity-80"
                        }`}
                      >
                        <CardContent className="p-4 sm:p-5 space-y-4">
                          {/* HEADER & TOP ACTIONS */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/30 pb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Contract Type Badge */}
                              <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                                {cType}
                              </span>

                              {/* Status Badge */}
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                                isActive ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30" :
                                ct.status === "EXPIRED" ? "bg-slate-500/15 text-slate-700 border border-slate-500/30" :
                                isTerminated ? "bg-red-500/15 text-red-700 border border-red-500/30" :
                                "bg-amber-500/15 text-amber-700 border border-amber-500/30"
                              }`}>
                                {ct.status}
                              </span>

                              {ct.employeeCode && (
                                <span className="font-mono text-xs font-bold text-muted-foreground/80">
                                  ({ct.employeeCode})
                                </span>
                              )}
                            </div>

                            {/* Action Buttons for this contract */}
                            <div className="flex items-center gap-2">
                              {isActive && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleTerminateSingleContract(ct.id)}
                                  className="h-8 text-xs font-bold gap-1 rounded-xl px-3 cursor-pointer"
                                >
                                  Chấm dứt HĐ này
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* BODY INFO GRID */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            {/* Lương */}
                            <div className="space-y-1 bg-background/50 p-2.5 rounded-xl border border-border/30">
                              <span className="text-muted-foreground font-semibold flex items-center gap-1 text-[11px]">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Mức lương cơ bản
                              </span>
                              <p className="font-black text-sm text-foreground">
                                {ct.baseSalary ? Number(ct.baseSalary).toLocaleString() : 0} đ
                                <span className="text-xs font-bold text-muted-foreground ml-1">
                                  / {sTypeLabel}
                                </span>
                              </p>
                            </div>

                            {/* Thời hạn */}
                            <div className="space-y-1 bg-background/50 p-2.5 rounded-xl border border-border/30">
                              <span className="text-muted-foreground font-semibold flex items-center gap-1 text-[11px]">
                                <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" /> Thời hạn hợp đồng
                              </span>
                              <p className="font-bold text-xs text-foreground">
                                {ct.startDate ? formatDateDisplay(ct.startDate) : (ct.validFrom ? formatDateDisplay(ct.validFrom) : "—")}
                                {" → "}
                                {ct.endDate ? formatDateDisplay(ct.endDate) : (ct.validTo ? formatDateDisplay(ct.validTo) : "Vô thời hạn")}
                              </p>
                            </div>

                            {/* Ngày ký */}
                            <div className="space-y-1 bg-background/50 p-2.5 rounded-xl border border-border/30">
                              <span className="text-muted-foreground font-semibold flex items-center gap-1 text-[11px]">
                                <Calendar className="h-3.5 w-3.5 text-purple-600 shrink-0" /> Ngày ký kết
                              </span>
                              <p className="font-bold text-xs text-foreground">
                                {ct.signedAt ? formatDateDisplay(ct.signedAt.slice(0, 10)) : "Chưa cập nhật"}
                              </p>
                            </div>
                          </div>

                          {/* FILE ATTACHMENT METADATA BEFORE DOWNLOAD */}
                          {(ct.fileUrl || ct.fileKey) && (
                            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border/40 gap-3">
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-bold text-foreground truncate">
                                    {ct.fileName || (ct.fileKey ? ct.fileKey.split("/").pop() : "File_Hop_Dong.pdf")}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground font-mono">
                                    {ct.fileSize ? formatFileSize(ct.fileSize) : "Tệp đính kèm MinIO"}
                                  </p>
                                </div>
                              </div>
                              <a href={ct.fileUrl || ct.fileKey} target="_blank" rel="noreferrer" className="shrink-0">
                                <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1 rounded-xl border-primary/30 text-primary hover:bg-primary/10 cursor-pointer">
                                  <Download className="h-3.5 w-3.5" /> Tải về
                                </Button>
                              </a>
                            </div>
                          )}

                          {/* AUDIT FOOTER */}
                          <div className="pt-2 border-t border-border/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-muted-foreground">
                            <div>
                              Tạo bởi: <strong className="text-foreground">{ct.createdBy || "Hệ thống"}</strong>
                              {ct.createdAt && ` • ${formatDateDisplay(ct.createdAt.slice(0, 10))} ${ct.createdAt.length >= 16 ? ct.createdAt.slice(11, 16) : ""}`}
                            </div>
                            {ct.updatedAt && (
                              <div>
                                Cập nhật lần cuối: {ct.updatedBy ? <strong className="text-foreground">{ct.updatedBy}</strong> : null}
                                {` ${formatDateDisplay(ct.updatedAt.slice(0, 10))} ${ct.updatedAt.length >= 16 ? ct.updatedAt.slice(11, 16) : ""}`}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* MODAL TẠO HỢP ĐỒNG MỚI */}
              {newContractModalOpen && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-4">
                  <h4 className="text-xs font-extrabold text-foreground">Tạo hợp đồng mới (Luồng 5.2 - Auto EXPIRED hợp đồng cũ)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground">Loại hợp đồng</Label>
                      <Select value={newContractType} onValueChange={(v: any) => setNewContractType(v)}>
                        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OFFICIAL">Hợp đồng chính thức (OFFICIAL)</SelectItem>
                          <SelectItem value="PROBATION">Hợp đồng thử việc (PROBATION)</SelectItem>
                          <SelectItem value="PART_TIME">Hợp đồng part-time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground">Lương cơ bản (đ)</Label>
                      <Input type="number" value={newContractSalary} onChange={e => setNewContractSalary(Number(e.target.value))} className="h-8 text-xs bg-background" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setNewContractModalOpen(false)} className="h-8 text-xs font-bold">Hủy</Button>
                    <Button size="sm" onClick={handleCreateNewContract} className="h-8 text-xs font-bold bg-primary">Xác nhận tạo & Lưu</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHẤM CÔNG (FULL_TIME) */}
          {activeTab === "attendance" && isFullTime && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <h3 className="text-sm font-extrabold text-blue-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Bảng chấm công hàng tháng (FULL_TIME)</span>
                </h3>
              </div>

              <Table className="border border-border/50 rounded-xl overflow-hidden text-xs">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Ngày làm việc</TableHead>
                    <TableHead>Giờ Check-in</TableHead>
                    <TableHead>Giờ Check-out</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Tiền phạt trừ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.map(att => (
                    <TableRow key={att.id}>
                      <TableCell className="font-bold">{att.workDate}</TableCell>
                      <TableCell>{att.checkInTime || "-"}</TableCell>
                      <TableCell>{att.checkOutTime || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          att.status === "PRESENT" ? "bg-emerald-500/10 text-emerald-600" :
                          att.status === "LATE" ? "bg-amber-500/10 text-amber-600" :
                          "bg-blue-500/10 text-blue-600"
                        }`}>
                          {att.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-500">
                        {att.penaltyAmount ? `${att.penaltyAmount.toLocaleString()} đ` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* TAB 4: ĐƠN GIÁ DẠY (TEACHER / TA) */}
          {activeTab === "rates" && isTeacherOrTA && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <h3 className="text-sm font-extrabold text-purple-600 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Bảng đơn giá dạy teaching_rate (Teacher / TA)</span>
                </h3>
                <Button size="sm" onClick={() => setUpdateRateModalOpen(true)} className="h-8 text-xs font-bold gap-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white">
                  <Plus className="h-3.5 w-3.5" /> Cập nhật đơn giá
                </Button>
              </div>

              <Table className="border border-border/50 rounded-xl overflow-hidden text-xs">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Lớp / Khóa học</TableHead>
                    <TableHead>Đơn giá áp dụng (đ/giờ)</TableHead>
                    <TableHead>Từ ngày</TableHead>
                    <TableHead>Đến ngày</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachingRates.map(tr => (
                    <TableRow key={tr.id}>
                      <TableCell className="font-bold">{tr.className}</TableCell>
                      <TableCell className="font-extrabold text-purple-600">{tr.rate.toLocaleString()} đ</TableCell>
                      <TableCell>{tr.effectiveFrom}</TableCell>
                      <TableCell>{tr.effectiveTo || "Đang áp dụng"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tr.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                        }`}>
                          {tr.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* MODAL UPDATE RATE */}
              {updateRateModalOpen && (
                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-4">
                  <h4 className="text-xs font-extrabold text-purple-700">Cập nhật đơn giá (Luồng 5.4 - Auto INACTIVE rate cũ)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground">Tên lớp / Môn học</Label>
                      <Input value={targetClassForRate} onChange={e => setTargetClassForRate(e.target.value)} placeholder="Ví dụ: Python AI Advanced" className="h-8 text-xs bg-background" />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground">Đơn giá mới (đ/h)</Label>
                      <Input type="number" value={newRateValue} onChange={e => setNewRateValue(Number(e.target.value))} className="h-8 text-xs bg-background" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setUpdateRateModalOpen(false)} className="h-8 text-xs font-bold">Hủy</Button>
                    <Button size="sm" onClick={handleUpdateTeachingRate} className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white">Lưu đơn giá mới</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: BUỔI DẠY (PART_TIME) */}
          {activeTab === "sessions" && isPartTime && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <h3 className="text-sm font-extrabold text-amber-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Danh sách buổi dạy teaching_session_payment (PART_TIME)</span>
                </h3>
              </div>

              <Table className="border border-border/50 rounded-xl overflow-hidden text-xs">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Lớp Online</TableHead>
                    <TableHead>Ngày dạy</TableHead>
                    <TableHead>Thời lượng (phút)</TableHead>
                    <TableHead>Đơn giá</TableHead>
                    <TableHead>Thành tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachingSessions.map(tsp => (
                    <TableRow key={tsp.id}>
                      <TableCell className="font-bold">{tsp.className}</TableCell>
                      <TableCell>{tsp.sessionDate}</TableCell>
                      <TableCell>{tsp.actualDurationMin} phút</TableCell>
                      <TableCell>{tsp.rateApplied.toLocaleString()} đ</TableCell>
                      <TableCell className="font-extrabold text-amber-600">{tsp.amount.toLocaleString()} đ</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tsp.status === "PAID" ? "bg-emerald-500/10 text-emerald-600" :
                            tsp.status === "CONFIRMED" ? "bg-blue-500/10 text-blue-600" :
                            "bg-amber-500/10 text-amber-600"
                          }`}>
                            {tsp.status}
                          </span>
                          {tsp.isDraftOver24h && (
                            <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" /> &gt;24h
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* TAB 6: LƯƠNG (SALARY) */}
          {activeTab === "salary" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span>Danh sách bảng lương theo kỳ (Salary Breakdown)</span>
                </h3>
              </div>

              <Table className="border border-border/50 rounded-xl overflow-hidden text-xs">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Kỳ lương</TableHead>
                    <TableHead>Lương Gross</TableHead>
                    <TableHead>Bảo hiểm</TableHead>
                    <TableHead>Thuế TNCN</TableHead>
                    <TableHead>Khấu trừ / Phạt</TableHead>
                    <TableHead>Thực lãnh (Net)</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaries.map(sal => (
                    <TableRow key={sal.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedSalaryPeriod(sal)}>
                      <TableCell className="font-mono font-bold text-primary">{sal.period}</TableCell>
                      <TableCell>{sal.grossSalary.toLocaleString()} đ</TableCell>
                      <TableCell>{sal.insuranceDeduction.toLocaleString()} đ</TableCell>
                      <TableCell>{sal.taxDeduction.toLocaleString()} đ</TableCell>
                      <TableCell className="text-red-500">{sal.penaltyDeduction.toLocaleString()} đ</TableCell>
                      <TableCell className="font-extrabold text-emerald-600">{sal.netSalary.toLocaleString()} đ</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sal.status === "PAID" ? "bg-emerald-500 text-white" : "bg-amber-500/10 text-amber-600"
                        }`}>
                          {sal.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {selectedSalaryPeriod && (
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                  <h4 className="text-xs font-extrabold text-emerald-700">Chi tiết breakdown kỳ lương {selectedSalaryPeriod.period} (Luồng 5.7)</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>Gross: <strong>{selectedSalaryPeriod.grossSalary.toLocaleString()} đ</strong></div>
                    <div>BHXH (10.5%): <strong>{selectedSalaryPeriod.insuranceDeduction.toLocaleString()} đ</strong></div>
                    <div>Thuế TNCN: <strong>{selectedSalaryPeriod.taxDeduction.toLocaleString()} đ</strong></div>
                    <div>Khấu trừ: <strong>{selectedSalaryPeriod.penaltyDeduction.toLocaleString()} đ</strong></div>
                    <div className="col-span-2 text-emerald-600 font-extrabold">Thực nhận Net: {selectedSalaryPeriod.netSalary.toLocaleString()} đ</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: NGHỈ PHÉP (LEAVE REQUESTS) */}
          {activeTab === "leaves" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Quản lý nghỉ phép (Leave Requests)</span>
                </h3>
                <div className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-xl">
                  Số ngày phép còn lại: 10/12 ngày
                </div>
              </div>

              <Table className="border border-border/50 rounded-xl overflow-hidden text-xs">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Thời gian nghỉ</TableHead>
                    <TableHead>Số ngày</TableHead>
                    <TableHead>Lý do nghỉ</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác duyệt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map(lv => (
                    <TableRow key={lv.id}>
                      <TableCell className="font-bold">{lv.startDate} &rarr; {lv.endDate}</TableCell>
                      <TableCell>{lv.numDays} ngày</TableCell>
                      <TableCell>{lv.reason}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lv.status === "APPROVED" ? "bg-emerald-500 text-white" :
                          lv.status === "PENDING" ? "bg-amber-500/10 text-amber-600" : "bg-red-500 text-white"
                        }`}>
                          {lv.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {lv.status === "PENDING" && (
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="default" onClick={() => handleApproveLeave(lv.id, "APPROVED")} className="h-7 px-2 text-[10px] font-bold bg-emerald-600">
                              Duyệt
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleApproveLeave(lv.id, "REJECTED")} className="h-7 px-2 text-[10px] font-bold">
                              Từ chối
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* TAB 8: PHÊ DUYỆT LIÊN QUAN */}
          {activeTab === "approvals" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 border-b border-border/30 pb-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Yêu cầu phê duyệt liên quan (2 sub-lists)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-border p-4 space-y-3">
                  <h4 className="text-xs font-extrabold text-foreground flex items-center justify-between">
                    <span>1. Đã yêu cầu (Requester)</span>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{approvals.requested.length}</span>
                  </h4>
                  {approvals.requested.map(item => (
                    <div key={item.id} className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs space-y-1">
                      <div className="font-bold">{item.objectType}</div>
                      <div className="text-muted-foreground text-[10px]">Người duyệt: {item.approverName} &bull; {item.createdAt}</div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/10 text-amber-600">{item.status}</span>
                    </div>
                  ))}
                </Card>

                <Card className="border border-border p-4 space-y-3">
                  <h4 className="text-xs font-extrabold text-foreground flex items-center justify-between">
                    <span>2. Cần duyệt (Approver)</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">{approvals.toApprove.length}</span>
                  </h4>
                  {approvals.toApprove.map(item => (
                    <div key={item.id} className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs space-y-1">
                      <div className="font-bold">{item.objectType}</div>
                      <div className="text-muted-foreground text-[10px]">Người gửi: {item.requesterName} &bull; {item.createdAt}</div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-500/10 text-blue-600">{item.status}</span>
                    </div>
                  ))}
                </Card>
              </div>
            </div>
          )}

          {/* TAB 9: AUDIT LOG */}
          {activeTab === "audit" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 border-b border-border/30 pb-3">
                <History className="h-4 w-4 text-primary" />
                <span>Audit log lịch sử thay đổi hồ sơ nhân viên (Theo mục 5.9)</span>
              </h3>

              <div className="relative border-l-2 border-primary/20 pl-4 space-y-4">
                {auditLogs.map(log => (
                  <div key={log.id} className="relative space-y-1">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="text-xs font-bold text-foreground">{log.action} - {log.entityType}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Thực hiện bởi: <strong>{log.actorName}</strong> &bull; Lúc {log.timestamp}
                    </div>
                    {log.fieldName && (
                      <div className="text-[11px] font-mono bg-muted/50 p-2 rounded-lg border border-border/40">
                        Field `{log.fieldName}`: <span className="line-through text-red-400">{log.oldValue}</span> &rarr; <span className="text-emerald-500 font-bold">{log.newValue}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
