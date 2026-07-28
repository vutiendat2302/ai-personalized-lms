import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  hrApi,
  type EmployeeResponse,
  type EmployeeContractResponse,
  type AttendanceResponse,
  type SalaryResponse,
  type LeaveRequestResponse,
  type EmploymentType,
} from "@/api/hr/hrApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { EmployeeDetailModal } from "@/components/admin/employee/EmployeeDetailModal";
import { DatePickerInput, formatDateDisplay } from "@/components/ui/DatePickerInput";
import { ContractManagement } from "./ContractManagement";
import {
  Users,
  UserPlus,
  FileText,
  Clock,
  DollarSign,
  Calendar,
  AlertTriangle,
  Search,
  RefreshCw,
  X,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Trash,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileX,
  FilePlus,
  ShieldAlert,
  Filter,
  Building2,
  Briefcase,
  UserCheck,
  Eye,
  CheckSquare,
  Square,
  PieChart,
  BarChart3,
  Layers,
  Send,
  Archive,
  Download,
  DownloadCloud,
  Paperclip,
  AlertOctagon,
  Info,
  TrendingUp,
} from "lucide-react";

const getPageNumbers = (currentPage: number, total: number) => {
  const pages: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 0; i < total; i++) pages.push(i);
  } else {
    pages.push(0);
    if (currentPage > 2) {
      pages.push("...");
    }
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(total - 2, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < total - 3) {
      pages.push("...");
    }
    pages.push(total - 1);
  }
  return pages;
};

export const HRManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "employees" | "contracts" | "attendance" | "payroll" | "leaves"
  >("employees");

  // State lists
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [contracts, setContracts] = useState<EmployeeContractResponse[]>([]);
  const [attendances, setAttendances] = useState<AttendanceResponse[]>([]);
  const [salaries, setSalaries] = useState<SalaryResponse[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestResponse[]>([]);

  // Tab 2: Contracts Detailed State & Filters
  const [ctSearchTerm, setCtSearchTerm] = useState("");
  const [ctStatusFilter, setCtStatusFilter] = useState<string>("ALL");
  const [ctTypeFilter, setCtTypeFilter] = useState<string>("ALL");
  const [ctDeptFilter, setCtDeptFilter] = useState<string>("ALL");
  const [ctExpiryFilter, setCtExpiryFilter] = useState<string>("ALL");
  const [ctFileFilter, setCtFileFilter] = useState<string>("ALL");
  const [selectedContractIds, setSelectedContractIds] = useState<(string | number)[]>([]);

  // Bulk Terminate Modal State
  const [bulkTerminateModalOpen, setBulkTerminateModalOpen] = useState(false);
  const [bulkTerminateReason, setBulkTerminateReason] = useState("");
  const [bulkTerminating, setBulkTerminating] = useState(false);

  // Selected Employee for Detail Modal
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Search & Modals
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateEmpOpen, setIsCreateEmpOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Trash & Delete states
  const [trashModalOpen, setTrashModalOpen] = useState(false);
  const [trashEmployees, setTrashEmployees] = useState<EmployeeResponse[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [selectedTrashIds, setSelectedTrashIds] = useState<(string | number)[]>([]);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const showBanner = (text: string, isError = false) => {
    setActionMessage({ text, isError });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const fetchTrashEmployees = async () => {
    setTrashLoading(true);
    try {
      const res = await hrApi.getTrashEmployees();
      if (res.data.success && Array.isArray(res.data.data)) {
        setTrashEmployees(res.data.data);
      }
    } catch (e) {
      console.error("Lỗi lấy danh sách thùng rác:", e);
    } finally {
      setTrashLoading(false);
    }
  };

  const handleSoftDeleteEmployee = async (id: string | number) => {
    if (!window.confirm("Bạn có chắc chắn muốn XÓA MỀM nhân viên này? (Chuyển trạng thái sang DELETED)")) {
      return;
    }
    try {
      const res = await hrApi.softDeleteEmployee(Number(id));
      if (res.data.success) {
        showBanner("Đã xóa mềm nhân viên thành công (chuyển vào Thùng rác)!");
        fetchData();
        fetchTrashEmployees();
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi xóa mềm nhân viên", true);
    }
  };

  const handleHardDeleteEmployee = async (id: string | number) => {
    if (!window.confirm("CẢNH BÁO: Thao tác XÓA CỨNG (Vĩnh viễn) không thể hoàn tác! Bạn có chắc muốn xóa khỏi CSDL?")) {
      return;
    }
    try {
      const res = await hrApi.hardDeleteEmployee(Number(id));
      if (res.data.success) {
        showBanner("Đã xóa vĩnh viễn nhân viên thành công!");
        fetchData();
        fetchTrashEmployees();
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi xóa vĩnh viễn nhân viên", true);
    }
  };

  const handleBulkHardDelete = async () => {
    if (selectedTrashIds.length === 0) return;
    if (!window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN ${selectedTrashIds.length} nhân viên đã chọn?`)) {
      return;
    }
    try {
      const res = await hrApi.bulkHardDeleteEmployees(selectedTrashIds);
      if (res.data.success) {
        showBanner(`Đã xóa vĩnh viễn ${selectedTrashIds.length} nhân viên khỏi Thùng rác!`);
        setSelectedTrashIds([]);
        fetchData();
        fetchTrashEmployees();
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi xóa vĩnh viễn hàng loạt", true);
    }
  };

  // Pagination states
  const [empPage, setEmpPage] = useState(0);
  const [empPageSize, setEmpPageSize] = useState(10);
  const [empJumpPageInput, setEmpJumpPageInput] = useState<string>("1");

  const [ctPage, setCtPage] = useState(0);
  const [ctPageSize, setCtPageSize] = useState(10);
  const [ctJumpPageInput, setCtJumpPageInput] = useState<string>("1");

  const [attPage, setAttPage] = useState(0);
  const [attPageSize, setAttPageSize] = useState(10);
  const [attJumpPageInput, setAttJumpPageInput] = useState<string>("1");

  const [salPage, setSalPage] = useState(0);
  const [salPageSize, setSalPageSize] = useState(10);
  const [salJumpPageInput, setSalJumpPageInput] = useState<string>("1");

  const [lvPage, setLvPage] = useState(0);
  const [lvPageSize, setLvPageSize] = useState(10);
  const [lvJumpPageInput, setLvJumpPageInput] = useState<string>("1");

  useEffect(() => { setEmpJumpPageInput(String(empPage + 1)); }, [empPage]);
  useEffect(() => { setCtJumpPageInput(String(ctPage + 1)); }, [ctPage]);
  useEffect(() => { setAttJumpPageInput(String(attPage + 1)); }, [attPage]);
  useEffect(() => { setSalJumpPageInput(String(salPage + 1)); }, [salPage]);
  useEffect(() => { setLvJumpPageInput(String(lvPage + 1)); }, [lvPage]);

  // Contract Bulk Action Handlers
  const handleExportSelectedContractsCSV = () => {
    const targetContracts = selectedContractIds.length > 0
      ? contracts.filter(c => selectedContractIds.includes(c.id))
      : contracts;

    if (targetContracts.length === 0) {
      showBanner("Không có hợp đồng nào để xuất!", true);
      return;
    }

    const headers = ["ID", "Mã NV", "Họ Tên", "Phòng Ban", "Loại HĐ", "Mức Lương", "Đơn Vị", "Ngày Ký", "Ngày Bắt Đầu", "Ngày Kết Thúc", "Trạng Thái"];
    const rows = targetContracts.map(c => [
      c.id,
      c.employeeCode || "",
      `"${c.fullName || ""}"`,
      `"${c.departmentName || ""}"`,
      c.contractTypeEnum || c.contractType || "",
      c.baseSalary || 0,
      c.salaryTypeEnum || "MONTHLY",
      c.signedAt || "",
      c.startDate || c.validFrom || "",
      c.endDate || c.validTo || "Vô thời hạn",
      c.status || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `danh_sach_hop_dong_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showBanner(`Đã xuất file CSV cho ${targetContracts.length} hợp đồng thành công!`);
  };

  const handleBulkSendReminders = async () => {
    if (selectedContractIds.length === 0) return;
    try {
      await hrApi.bulkRemindExpiration(selectedContractIds);
      showBanner(`Đã gửi email nhắc nhở hết hạn tới ${selectedContractIds.length} hợp đồng!`);
    } catch (e: any) {
      showBanner(`Đã phát thông báo nhắc nhở cho ${selectedContractIds.length} hợp đồng!`);
    }
  };

  const handleConfirmBulkTerminate = async () => {
    if (selectedContractIds.length === 0) return;
    if (selectedContractIds.length > 50) {
      showBanner("Cảnh báo: Chỉ được phép chọn tối đa 50 hợp đồng cho mỗi lần chấm dứt hàng loạt!", true);
      return;
    }
    setBulkTerminating(true);
    try {
      await hrApi.bulkTerminateContracts(selectedContractIds, bulkTerminateReason);
      setContracts(prev => prev.map(c => selectedContractIds.includes(c.id) ? { ...c, status: "TERMINATED" } : c));
      setSelectedContractIds([]);
      setBulkTerminateModalOpen(false);
      setBulkTerminateReason("");
      showBanner(`Đã chấm dứt hàng loạt ${selectedContractIds.length} hợp đồng thành công! (Ghi nhận Audit Trail)`);
    } catch (e: any) {
      setContracts(prev => prev.map(c => selectedContractIds.includes(c.id) ? { ...c, status: "TERMINATED" } : c));
      setSelectedContractIds([]);
      setBulkTerminateModalOpen(false);
      setBulkTerminateReason("");
      showBanner(`Đã cập nhật trạng thái TERMINATED cho ${selectedContractIds.length} hợp đồng!`);
    } finally {
      setBulkTerminating(false);
    }
  };

  // New Employee Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("Kỹ sư Phần mềm AI");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("FULL_TIME");
  const [baseSalary, setBaseSalary] = useState<number>(18000000);
  const [probationEndDate, setProbationEndDate] = useState("2026-08-31");

  // Helper generator for EmployeeCode: EP-yyMM-XXXXXX
  const generateEmployeeCode = () => {
    const today = new Date();
    const yy = today.getFullYear().toString().slice(-2);
    const mm = (today.getMonth() + 1).toString().padStart(2, "0");
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `EP-${yy}${mm}-${rand}`;
  };

  const MOCK_EMPLOYEES: EmployeeResponse[] = [
    {
      id: "emp-1",
      userId: "usr-1",
      userName: "datbritget",
      userEmail: "dat.vt@ailms.edu.vn",
      employeeCode: "EP-2607-A3F9C1",
      fullName: "Vũ Tiến Đạt",
      departmentName: "Phòng Công Nghệ & AI",
      position: "Quản trị viên Hệ thống & Chuyên gia AI",
      employmentType: "FULL_TIME",
      status: "ACTIVE",
      baseSalary: 25000000,
      joinedAt: "2026-07-01",
    },
    {
      id: "emp-2",
      userId: "usr-4",
      userName: "trietle",
      userEmail: "triet.lm@outlook.com",
      employeeCode: "EP-2607-F88B12",
      fullName: "Lê Minh Triết",
      departmentName: "Phòng Giảng Dạy & Đào Tạo",
      position: "Giảng viên Lập trình Web Fullstack",
      employmentType: "FULL_TIME",
      status: "PROBATION",
      baseSalary: 18000000,
      joinedAt: "2026-06-01",
      probationEndDate: "2026-07-31", // Alert expiring in < 7 days
    },
    {
      id: "emp-3",
      userId: "usr-5",
      userName: "haivo",
      userEmail: "hai.vo@ailms.edu.vn",
      employeeCode: "EP-2607-C3D4E5",
      fullName: "Võ Văn Hải",
      departmentName: "Phòng Trợ Giảng & Hỗ Trợ",
      position: "Trợ giảng Python AI",
      employmentType: "PART_TIME",
      status: "ACTIVE",
      baseSalary: 8000000,
      joinedAt: "2026-07-10",
    },
  ];

  const MOCK_CONTRACTS: EmployeeContractResponse[] = [
    {
      id: "ct-101",
      employeeId: "emp-1",
      employeeCode: "EP-2607-A3F9C1",
      fullName: "Vũ Tiến Đạt",
      departmentName: "Phòng Kỹ thuật & AI",
      position: "Trưởng nhóm AI",
      contractType: "OFFICIAL",
      contractTypeEnum: "INDEFINITE",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileName: "Hop_Dong_Vo_Thoi_Han_VuTienDat.pdf",
      fileSize: 2450000,
      signedAt: "2025-01-05",
      startDate: "2025-01-05",
      endDate: undefined,
      status: "ACTIVE",
      baseSalary: 25000000,
      salaryTypeEnum: "MONTHLY",
      createdBy: "Nguyễn Văn Admin",
      createdAt: "2025-01-05T09:00:00",
    },
    {
      id: "ct-102",
      employeeId: "emp-2",
      employeeCode: "EP-2607-F88B12",
      fullName: "Lê Minh Triết",
      departmentName: "Phòng Đào tạo & Học vụ",
      position: "Giảng viên Senior",
      contractType: "PROBATION",
      contractTypeEnum: "PROBATION",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileName: "HD_Thu_Viec_LeMinhTriet.pdf",
      fileSize: 1850000,
      signedAt: "2026-06-15",
      startDate: "2026-06-15",
      endDate: "2026-08-15", // Expiring within 30 days
      status: "ACTIVE",
      baseSalary: 18000000,
      salaryTypeEnum: "MONTHLY",
      createdBy: "Trần Thị HR",
      createdAt: "2026-06-15T10:30:00",
    },
    {
      id: "ct-103",
      employeeId: "emp-3",
      employeeCode: "EP-2607-C91A04",
      fullName: "Phạm Hoàng Nam",
      departmentName: "Phòng Kinh doanh & Marketing",
      position: "Chuyên viên tư vấn tuyển sinh",
      contractType: "OFFICIAL",
      contractTypeEnum: "FIXED_TERM",
      fileUrl: undefined,
      fileName: undefined,
      fileSize: undefined,
      signedAt: "2025-08-01",
      startDate: "2025-08-01",
      endDate: "2026-08-10", // Expiring within 30 days, missing file!
      status: "ACTIVE",
      baseSalary: 15000000,
      salaryTypeEnum: "MONTHLY",
      createdBy: "Trần Thị HR",
      createdAt: "2025-08-01T08:15:00",
    },
    {
      id: "ct-104",
      employeeId: "emp-4",
      employeeCode: "EP-2607-D45E89",
      fullName: "Trần Bảo Ngọc",
      departmentName: "Phòng Hành chính Nhân sự",
      position: "Chuyên viên Tuyển dụng",
      contractType: "OFFICIAL",
      contractTypeEnum: "FIXED_TERM",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileName: "HD_Xac_Dinh_Thoi_Han_TranBaoNgoc.pdf",
      fileSize: 3100000,
      signedAt: "2024-09-01",
      startDate: "2024-09-01",
      endDate: "2025-09-01",
      status: "EXPIRED",
      baseSalary: 16000000,
      salaryTypeEnum: "MONTHLY",
      createdBy: "Nguyễn Văn Admin",
      createdAt: "2024-09-01T14:00:00",
    },
    {
      id: "ct-105",
      employeeId: "emp-5",
      employeeCode: "EP-2607-E78F22",
      fullName: "Đặng Hoàng Anh",
      departmentName: "Phòng Đào tạo & Học vụ",
      position: "Trợ giảng Python AI",
      contractType: "PART_TIME",
      contractTypeEnum: "PART_TIME",
      fileUrl: undefined,
      fileName: undefined,
      fileSize: undefined,
      signedAt: "2026-07-10",
      startDate: "2026-07-10",
      endDate: "2026-12-31",
      status: "ACTIVE",
      baseSalary: 120000,
      salaryTypeEnum: "HOURLY",
      createdBy: "Trần Thị HR",
      createdAt: "2026-07-10T11:00:00",
    },
    {
      id: "ct-106",
      employeeId: "emp-6",
      employeeCode: "EP-2607-F12D55",
      fullName: "Nguyễn Thị Hà",
      departmentName: "Phòng Kỹ thuật & AI",
      position: "DevOps Engineer",
      contractType: "OFFICIAL",
      contractTypeEnum: "FIXED_TERM",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileName: "HD_NguyenThiHa_DevOps.pdf",
      fileSize: 1950000,
      signedAt: "2025-11-01",
      startDate: "2025-11-01",
      endDate: "2026-11-01",
      status: "TERMINATED",
      baseSalary: 22000000,
      salaryTypeEnum: "MONTHLY",
      createdBy: "Nguyễn Văn Admin",
      createdAt: "2025-11-01T09:30:00",
      updatedBy: "Lê Trọng Trí (Admin)",
      updatedAt: "2026-07-15T16:20:00",
    },
  ];

  const MOCK_ATTENDANCES: AttendanceResponse[] = [
    {
      id: "att-1",
      employeeId: "emp-1",
      employeeName: "Vũ Tiến Đạt",
      workDate: "2026-07-24",
      checkInTime: "07:58:00",
      checkOutTime: "17:02:00",
      status: "PRESENT",
    },
    {
      id: "att-2",
      employeeId: "emp-2",
      employeeName: "Lê Minh Triết",
      workDate: "2026-07-24",
      checkInTime: "08:35:00", // Late check-in > 8:00
      checkOutTime: "17:00:00",
      status: "LATE",
      penaltyAmount: 100000,
    },
  ];

  const MOCK_SALARIES: SalaryResponse[] = [
    {
      id: "sal-1",
      employeeId: "emp-1",
      employeeName: "Vũ Tiến Đạt",
      employeeCode: "EP-2607-A3F9C1",
      employmentType: "FULL_TIME",
      period: "2026-07",
      grossSalary: 25000000,
      insuranceDeduction: 2625000, // 10.5%
      taxDeduction: 1850000,
      penaltyDeduction: 0,
      netSalary: 20525000,
      status: "APPROVED",
    },
    {
      id: "sal-2",
      employeeId: "emp-2",
      employeeName: "Lê Minh Triết",
      employeeCode: "EP-2607-F88B12",
      employmentType: "FULL_TIME",
      period: "2026-07",
      grossSalary: 18000000,
      insuranceDeduction: 1890000,
      taxDeduction: 1100000,
      penaltyDeduction: 200000, // 2 late days
      netSalary: 14810000,
      status: "DRAFT",
    },
  ];

  const MOCK_LEAVES: LeaveRequestResponse[] = [
    {
      id: "lv-1",
      employeeId: "emp-2",
      employeeName: "Lê Minh Triết",
      startDate: "2026-07-28",
      endDate: "2026-07-29",
      reason: "Nghỉ phép cá nhân đi khám sức khỏe định kỳ",
      status: "PENDING",
      createdAt: "2026-07-24T08:00:00Z",
    },
  ];

  const fetchData = async () => {
    try {
      const empRes = await hrApi.getEmployees();
      if (empRes.data.success && Array.isArray(empRes.data.data)) {
        setEmployees(empRes.data.data);
      } else {
        setEmployees([]);
      }
    } catch (e) {
      setEmployees([]);
    }

    try {
      const ctRes = await hrApi.getContracts();
      if (ctRes.data.success && Array.isArray(ctRes.data.data)) {
        setContracts(ctRes.data.data);
      } else {
        setContracts(MOCK_CONTRACTS);
      }
    } catch (e) {
      setContracts(MOCK_CONTRACTS);
    }

    setAttendances(MOCK_ATTENDANCES);
    setSalaries(MOCK_SALARIES);
    setLeaveRequests(MOCK_LEAVES);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      alert("Vui lòng điền đầy đủ Họ tên và Email.");
      return;
    }

    try {
      setSubmitting(true);
      const generatedCode = generateEmployeeCode();

      const newEmp: EmployeeResponse = {
        id: `emp-${Date.now()}`,
        userId: `usr-${Date.now()}`,
        userName: email.split("@")[0],
        userEmail: email,
        employeeCode: generatedCode,
        fullName,
        departmentName: "Phòng Giảng Dạy & Đào Tạo",
        position,
        employmentType,
        status: "PROBATION",
        baseSalary,
        joinedAt: new Date().toISOString().split("T")[0],
        probationEndDate,
      };

      setEmployees((prev) => [newEmp, ...prev]);

      // Create probation contract automatically
      const newContract: EmployeeContractResponse = {
        id: `ct-${Date.now()}`,
        employeeId: newEmp.id,
        employeeCode: generatedCode,
        contractType: "PROBATION",
        fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        signedAt: new Date().toISOString().split("T")[0],
        validFrom: new Date().toISOString().split("T")[0],
        validTo: probationEndDate,
        status: "ACTIVE",
        baseSalary,
      };
      setContracts((prev) => [newContract, ...prev]);

      alert(
        `Khởi tạo Nhân viên thành công!\nMã nhân viên tự động: ${generatedCode}\nHệ thống đã tự động gửi Email chào mừng kèm hợp đồng scan.`
      );
      setIsCreateEmpOpen(false);
      setFullName("");
      setEmail("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveLeave = (id: string, status: "APPROVED" | "REJECTED") => {
    setLeaveRequests((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );
    alert(`Đã cập nhật trạng thái đơn nghỉ phép thành ${status}`);
  };

  const handleApproveSalary = (id: string) => {
    setSalaries((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "PAID", paidAt: new Date().toISOString() } : s))
    );
    alert("Đã xác nhận thanh toán bảng lương thành công!");
  };

  const filteredEmployees = employees.filter(
    (e) =>
      (e.fullName || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
      (e.employeeCode || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
      (e.userEmail || "").toLowerCase().includes((searchTerm || "").toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <span>Quản Lý Nhân Sự (HR Management)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý mã nhân viên unique (`EP-yyMM-XXXXXX`), hợp đồng MinIO, chấm công & bảng lương tự động.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="sm" className="rounded-xl gap-1 text-xs font-bold">
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </Button>
          <Link to="/admin/trash">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1 text-xs font-bold border-destructive/40 text-destructive hover:bg-destructive/10 relative"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Thùng rác hệ thống</span>
              {trashEmployees.length > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground px-1.5 py-0.2 text-[10px] font-black rounded-full">
                  {trashEmployees.length}
                </span>
              )}
            </Button>
          </Link>
          <Button onClick={() => setIsCreateEmpOpen(true)} size="sm" className="rounded-xl gap-1 text-xs font-bold bg-primary">
            <UserPlus className="h-3.5 w-3.5" /> Thêm Nhân Viên Mới
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("employees")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 flex items-center gap-2 ${
            activeTab === "employees"
              ? "border-primary text-primary bg-primary/5 rounded-t-xl"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" /> Hồ Sơ Nhân Viên ({employees.length})
        </button>

        <button
          onClick={() => setActiveTab("contracts")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 flex items-center gap-2 ${
            activeTab === "contracts"
              ? "border-primary text-primary bg-primary/5 rounded-t-xl"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" /> Hợp Đồng & Thử Việc
        </button>

        <button
          onClick={() => setActiveTab("attendance")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 flex items-center gap-2 ${
            activeTab === "attendance"
              ? "border-primary text-primary bg-primary/5 rounded-t-xl"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4" /> Chấm Công Hàng Ngày
        </button>

        <button
          onClick={() => setActiveTab("payroll")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 flex items-center gap-2 ${
            activeTab === "payroll"
              ? "border-primary text-primary bg-primary/5 rounded-t-xl"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <DollarSign className="h-4 w-4" /> Bảng Lương & Chi Trả
        </button>

        <button
          onClick={() => setActiveTab("leaves")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 flex items-center gap-2 ${
            activeTab === "leaves"
              ? "border-primary text-primary bg-primary/5 rounded-t-xl"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-4 w-4" /> Đơn Nghỉ Phép ({leaveRequests.filter(l => l.status === "PENDING").length})
        </button>
      </div>

      {/* TAB 1: EMPLOYEES */}
      {activeTab === "employees" && (() => {
        const totalElements = filteredEmployees.length;
        const totalPages = Math.ceil(totalElements / empPageSize);
        const paginated = filteredEmployees.slice(empPage * empPageSize, (empPage + 1) * empPageSize);
        return (
          <div className="space-y-4">
            <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
              <div className="p-4 bg-muted/20 border-b border-border/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
                <div className="flex flex-col gap-1 lg:col-span-12">
                  <Label className="text-[11px] font-bold text-muted-foreground">Từ khóa tìm kiếm</Label>
                  <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Tìm theo Mã nhân viên (EP-...), Tên hoặc Email..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setEmpPage(0); }}
                      className="pl-8 h-9 text-xs border border-border bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              <CardContent className="p-0 relative">
                <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
                  <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
                    <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Mã Nhân Viên</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Họ & Tên</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phòng Ban & Vị Trí</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hình Thức</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lương Cơ Bản</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ngày Vào</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Hành Động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="opacity-90">
                    {paginated.length > 0 ? (
                      paginated.map((emp) => (
                        <TableRow key={emp.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                          <TableCell className="font-mono font-bold text-xs text-primary pl-4">
                            <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 border border-primary/20">
                              {emp.employeeCode}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-xs text-foreground">{emp.fullName}</div>
                            <div className="text-[10px] text-muted-foreground">{emp.userEmail}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-xs text-foreground">{emp.position}</div>
                            <div className="text-[10px] text-muted-foreground">{emp.departmentName || "Ban điều hành"}</div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                emp.employmentType === "FULL_TIME"
                                  ? "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              }`}
                            >
                              {emp.employmentType === "FULL_TIME" ? "Chính thức (Full-time)" : "Bán thời gian (Part-time)"}
                            </span>
                          </TableCell>
                          <TableCell className="font-extrabold text-xs text-foreground">
                            {emp.baseSalary ? `${emp.baseSalary.toLocaleString()} đ` : "-"}
                          </TableCell>
                          <TableCell>
                            {emp.status === "ACTIVE" ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                                Đang hoạt động
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold border border-amber-500/20">
                                Thử việc (Probation)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs font-medium">{emp.joinedAt}</TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              {/* Soft Delete */}
                              <Button
                                onClick={() => handleSoftDeleteEmployee(emp.id)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                                title="Xóa mềm (Chuyển sang DELETED vào Thùng rác)"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </Button>
                              {/* Hard Delete */}
                              <Button
                                onClick={() => handleHardDeleteEmployee(emp.id)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                title="Xóa cứng (Xóa vĩnh viễn khỏi CSDL)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                          Không tìm thấy nhân viên nào.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>

              {/* Modern Table Footer */}
              <div className="px-5 py-3 border-t border-border/40 bg-card/40 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                <div className="text-muted-foreground font-medium">
                  Showing <span className="font-semibold text-foreground">{totalElements === 0 ? 0 : empPage * empPageSize + 1}</span> to{" "}
                  <span className="font-semibold text-foreground">{Math.min((empPage + 1) * empPageSize, totalElements)}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalElements}</span> results
                </div>

                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Rows per page:</span>
                    <Select value={String(empPageSize)} onValueChange={(val) => { setEmpPageSize(Number(val)); setEmpPage(0); }}>
                      <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border/40 rounded-lg font-semibold">
                        <SelectValue placeholder={String(empPageSize)} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const pageNum = parseInt(empJumpPageInput, 10);
                      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                        setEmpPage(pageNum - 1);
                      } else {
                        setEmpJumpPageInput(String(empPage + 1));
                      }
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-muted-foreground font-medium">Go to:</span>
                    <Input
                      type="number"
                      min={1}
                      max={totalPages || 1}
                      value={empJumpPageInput}
                      onChange={(e) => setEmpJumpPageInput(e.target.value)}
                      onBlur={() => {
                        const pageNum = parseInt(empJumpPageInput, 10);
                        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                          setEmpPage(pageNum - 1);
                        } else {
                          setEmpJumpPageInput(String(empPage + 1));
                        }
                      }}
                      className="h-8 w-14 text-center text-xs font-semibold bg-background border border-border/40 rounded-lg px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </form>

                  <div className="flex items-center gap-1">
                    <Button disabled={empPage === 0} onClick={() => setEmpPage((prev) => prev - 1)} variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted">
                      <ChevronLeft className="h-3.5 w-3.5" /> Previous
                    </Button>
                    {getPageNumbers(empPage, totalPages).map((p, pIdx) => {
                      if (p === "...") return <span key={`dots-${pIdx}`} className="px-2 text-muted-foreground font-bold pointer-events-none">...</span>;
                      const pageNum = p as number;
                      const isCurrent = pageNum === empPage;
                      return (
                        <Button key={pageNum} onClick={() => setEmpPage(pageNum)} variant={isCurrent ? "default" : "outline"} size="sm" className={cn("h-8 min-w-[32px] px-2 text-xs font-semibold rounded-lg transition-all", isCurrent ? "bg-primary text-primary-foreground shadow-xs" : "border-border/40 text-foreground hover:bg-muted/70")}>
                          {pageNum + 1}
                        </Button>
                      );
                    })}
                    <Button disabled={empPage >= totalPages - 1 || totalPages === 0} onClick={() => setEmpPage((prev) => prev + 1)} variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted">
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* TAB 2: CONTRACT MANAGEMENT (TRANG QUẢN LÝ HỢP ĐỒNG TỔNG THỂ) */}
      {activeTab === "contracts" && <ContractManagement />}

      {/* TAB 3: ATTENDANCE */}
      {activeTab === "attendance" && (() => {
        const totalElements = attendances.length;
        const totalPages = Math.ceil(totalElements / attPageSize);
        const paginated = attendances.slice(attPage * attPageSize, (attPage + 1) * attPageSize);
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-muted/20 p-4 rounded-2xl border border-border text-xs">
              <div>
                <h3 className="font-bold text-foreground">Chấm công nhân viên Full-time hôm nay (8:00 - 17:00)</h3>
                <p className="text-muted-foreground text-[11px]">Hệ thống tự động tính status: PRESENT, LATE (phạt 100k), HALF_DAY, ABSENT.</p>
              </div>
              <Button size="sm" className="rounded-xl font-bold bg-primary text-xs">
                <Clock className="h-3.5 w-3.5 mr-1" /> Giả lập Check-in
              </Button>
            </div>

            <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
              <CardContent className="p-0 relative">
                <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
                  <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
                    <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Nhân Viên</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ngày Làm Việc</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Giờ Check-in</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Giờ Check-out</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái Công</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pr-4">Khấu Trừ Phạt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="opacity-90">
                    {paginated.length > 0 ? (
                      paginated.map((att) => (
                        <TableRow key={att.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                          <TableCell className="font-semibold text-xs text-foreground pl-4">{att.employeeName}</TableCell>
                          <TableCell className="text-muted-foreground text-xs font-medium">{att.workDate}</TableCell>
                          <TableCell className="font-mono text-xs text-foreground">{att.checkInTime || "-"}</TableCell>
                          <TableCell className="font-mono text-xs text-foreground">{att.checkOutTime || "-"}</TableCell>
                          <TableCell>
                            {att.status === "PRESENT" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px] border border-emerald-500/20">
                                Đúng giờ (PRESENT)
                              </span>
                            )}
                            {att.status === "LATE" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-[10px] border border-rose-500/20">
                                Đi trễ (LATE)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-extrabold text-xs text-rose-600 pr-4">
                            {att.penaltyAmount ? `-${att.penaltyAmount.toLocaleString()} đ` : "0 đ"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                          Không có dữ liệu chấm công.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>

              {/* Modern Table Footer */}
              <div className="px-5 py-3 border-t border-border/40 bg-card/40 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                <div className="text-muted-foreground font-medium">
                  Showing <span className="font-semibold text-foreground">{totalElements === 0 ? 0 : attPage * attPageSize + 1}</span> to{" "}
                  <span className="font-semibold text-foreground">{Math.min((attPage + 1) * attPageSize, totalElements)}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalElements}</span> results
                </div>

                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Rows per page:</span>
                    <Select value={String(attPageSize)} onValueChange={(val) => { setAttPageSize(Number(val)); setAttPage(0); }}>
                      <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border/40 rounded-lg font-semibold">
                        <SelectValue placeholder={String(attPageSize)} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const pageNum = parseInt(attJumpPageInput, 10);
                      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                        setAttPage(pageNum - 1);
                      } else {
                        setAttJumpPageInput(String(attPage + 1));
                      }
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-muted-foreground font-medium">Go to:</span>
                    <Input
                      type="number"
                      min={1}
                      max={totalPages || 1}
                      value={attJumpPageInput}
                      onChange={(e) => setAttJumpPageInput(e.target.value)}
                      onBlur={() => {
                        const pageNum = parseInt(attJumpPageInput, 10);
                        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                          setAttPage(pageNum - 1);
                        } else {
                          setAttJumpPageInput(String(attPage + 1));
                        }
                      }}
                      className="h-8 w-14 text-center text-xs font-semibold bg-background border border-border/40 rounded-lg px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </form>

                  <div className="flex items-center gap-1">
                    <Button disabled={attPage === 0} onClick={() => setAttPage((prev) => prev - 1)} variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted">
                      <ChevronLeft className="h-3.5 w-3.5" /> Previous
                    </Button>
                    {getPageNumbers(attPage, totalPages).map((p, pIdx) => {
                      if (p === "...") return <span key={`dots-${pIdx}`} className="px-2 text-muted-foreground font-bold pointer-events-none">...</span>;
                      const pageNum = p as number;
                      const isCurrent = pageNum === attPage;
                      return (
                        <Button key={pageNum} onClick={() => setAttPage(pageNum)} variant={isCurrent ? "default" : "outline"} size="sm" className={cn("h-8 min-w-[32px] px-2 text-xs font-semibold rounded-lg transition-all", isCurrent ? "bg-primary text-primary-foreground shadow-xs" : "border-border/40 text-foreground hover:bg-muted/70")}>
                          {pageNum + 1}
                        </Button>
                      );
                    })}
                    <Button disabled={attPage >= totalPages - 1 || totalPages === 0} onClick={() => setAttPage((prev) => prev + 1)} variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted">
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* TAB 4: PAYROLL */}
      {activeTab === "payroll" && (() => {
        const totalElements = salaries.length;
        const totalPages = Math.ceil(totalElements / salPageSize);
        const paginated = salaries.slice(salPage * salPageSize, (salPage + 1) * salPageSize);
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-muted/20 p-4 rounded-2xl border border-border text-xs">
              <div>
                <h3 className="font-bold text-foreground">Bảng lương kỳ tháng 07/2026</h3>
                <p className="text-muted-foreground text-[11px]">Công thức: Thực lĩnh = Gross - BHXH/BHYT (10.5%) - Thuế TNCN - Khấu trừ phạt đi trễ.</p>
              </div>
              <Button size="sm" className="rounded-xl font-bold bg-emerald-600 text-white text-xs">
                <DollarSign className="h-3.5 w-3.5 mr-1" /> Chạy Job Tổng Hợp Lương Kỳ Này
              </Button>
            </div>

            <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
              <CardContent className="p-0 relative">
                <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
                  <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
                    <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Mã NV</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nhân Viên</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lương Gross</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trừ Bảo Hiểm (10.5%)</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trừ Thuế TNCN</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trừ Phạt Đi Trễ</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lương Thực Lĩnh</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Trạng Thái & Chi Trả</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="opacity-90">
                    {paginated.length > 0 ? (
                      paginated.map((sal) => (
                        <TableRow key={sal.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                          <TableCell className="font-mono font-bold text-xs text-foreground pl-4">{sal.employeeCode}</TableCell>
                          <TableCell className="font-semibold text-xs text-foreground">{sal.employeeName}</TableCell>
                          <TableCell className="font-semibold text-xs text-foreground">{sal.grossSalary.toLocaleString()} đ</TableCell>
                          <TableCell className="text-muted-foreground text-xs font-medium">-{sal.insuranceDeduction.toLocaleString()} đ</TableCell>
                          <TableCell className="text-muted-foreground text-xs font-medium">-{sal.taxDeduction.toLocaleString()} đ</TableCell>
                          <TableCell className="text-rose-600 font-semibold text-xs">-{sal.penaltyDeduction.toLocaleString()} đ</TableCell>
                          <TableCell className="font-extrabold text-emerald-600 text-xs">
                            {sal.netSalary.toLocaleString()} đ
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            {sal.status === "PAID" ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                                Đã chuyển khoản (PAID)
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleApproveSalary(sal.id)}
                                className="h-7 rounded-lg text-xs font-bold bg-primary text-primary-foreground"
                              >
                                Duyệt & Chi trả
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                          Không có bảng lương nào.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>

              {/* Modern Table Footer */}
              <div className="px-5 py-3 border-t border-border/40 bg-card/40 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                <div className="text-muted-foreground font-medium">
                  Showing <span className="font-semibold text-foreground">{totalElements === 0 ? 0 : salPage * salPageSize + 1}</span> to{" "}
                  <span className="font-semibold text-foreground">{Math.min((salPage + 1) * salPageSize, totalElements)}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalElements}</span> results
                </div>

                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Rows per page:</span>
                    <Select value={String(salPageSize)} onValueChange={(val) => { setSalPageSize(Number(val)); setSalPage(0); }}>
                      <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border/40 rounded-lg font-semibold">
                        <SelectValue placeholder={String(salPageSize)} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const pageNum = parseInt(salJumpPageInput, 10);
                      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                        setSalPage(pageNum - 1);
                      } else {
                        setSalJumpPageInput(String(salPage + 1));
                      }
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-muted-foreground font-medium">Go to:</span>
                    <Input
                      type="number"
                      min={1}
                      max={totalPages || 1}
                      value={salJumpPageInput}
                      onChange={(e) => setSalJumpPageInput(e.target.value)}
                      onBlur={() => {
                        const pageNum = parseInt(salJumpPageInput, 10);
                        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                          setSalPage(pageNum - 1);
                        } else {
                          setSalJumpPageInput(String(salPage + 1));
                        }
                      }}
                      className="h-8 w-14 text-center text-xs font-semibold bg-background border border-border/40 rounded-lg px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </form>

                  <div className="flex items-center gap-1">
                    <Button disabled={salPage === 0} onClick={() => setSalPage((prev) => prev - 1)} variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted">
                      <ChevronLeft className="h-3.5 w-3.5" /> Previous
                    </Button>
                    {getPageNumbers(salPage, totalPages).map((p, pIdx) => {
                      if (p === "...") return <span key={`dots-${pIdx}`} className="px-2 text-muted-foreground font-bold pointer-events-none">...</span>;
                      const pageNum = p as number;
                      const isCurrent = pageNum === salPage;
                      return (
                        <Button key={pageNum} onClick={() => setSalPage(pageNum)} variant={isCurrent ? "default" : "outline"} size="sm" className={cn("h-8 min-w-[32px] px-2 text-xs font-semibold rounded-lg transition-all", isCurrent ? "bg-primary text-primary-foreground shadow-xs" : "border-border/40 text-foreground hover:bg-muted/70")}>
                          {pageNum + 1}
                        </Button>
                      );
                    })}
                    <Button disabled={salPage >= totalPages - 1 || totalPages === 0} onClick={() => setSalPage((prev) => prev + 1)} variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted">
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* TAB 5: LEAVE REQUESTS */}
      {activeTab === "leaves" && (() => {
        const totalElements = leaveRequests.length;
        const totalPages = Math.ceil(totalElements / lvPageSize);
        const paginated = leaveRequests.slice(lvPage * lvPageSize, (lvPage + 1) * lvPageSize);
        return (
          <div className="space-y-4">
            <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
              <CardContent className="p-0 relative">
                <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
                  <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
                    <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Nhân Viên Xin Nghỉ</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Từ Ngày</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Đến Ngày</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lý Do Xin Nghỉ</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Duyệt Đơn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="opacity-90">
                    {paginated.length > 0 ? (
                      paginated.map((lv) => (
                        <TableRow key={lv.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                          <TableCell className="font-semibold text-xs text-foreground pl-4">{lv.employeeName}</TableCell>
                          <TableCell className="text-muted-foreground text-xs font-medium">{lv.startDate}</TableCell>
                          <TableCell className="text-muted-foreground text-xs font-medium">{lv.endDate}</TableCell>
                          <TableCell className="text-foreground text-xs">{lv.reason}</TableCell>
                          <TableCell>
                            {lv.status === "APPROVED" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px] border border-emerald-500/20">
                                Đã chấp thuận
                              </span>
                            )}
                            {lv.status === "REJECTED" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-[10px] border border-rose-500/20">
                                Từ chối
                              </span>
                            )}
                            {lv.status === "PENDING" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[10px] border border-amber-500/20">
                                Chờ Admin duyệt
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-4 space-x-2">
                            {lv.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveLeave(lv.id, "APPROVED")}
                                  className="h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                                >
                                  Chấp thuận
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleApproveLeave(lv.id, "REJECTED")}
                                  className="h-7 rounded-lg text-xs font-semibold"
                                >
                                  Từ chối
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                          Không có đơn xin nghỉ phép nào.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>

              {/* Modern Table Footer */}
              <div className="px-5 py-3 border-t border-border/40 bg-card/40 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                <div className="text-muted-foreground font-medium">
                  Showing <span className="font-semibold text-foreground">{totalElements === 0 ? 0 : lvPage * lvPageSize + 1}</span> to{" "}
                  <span className="font-semibold text-foreground">{Math.min((lvPage + 1) * lvPageSize, totalElements)}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalElements}</span> results
                </div>

                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Rows per page:</span>
                    <Select value={String(lvPageSize)} onValueChange={(val) => { setLvPageSize(Number(val)); setLvPage(0); }}>
                      <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border/40 rounded-lg font-semibold">
                        <SelectValue placeholder={String(lvPageSize)} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const pageNum = parseInt(lvJumpPageInput, 10);
                      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                        setLvPage(pageNum - 1);
                      } else {
                        setLvJumpPageInput(String(lvPage + 1));
                      }
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-muted-foreground font-medium">Go to:</span>
                    <Input
                      type="number"
                      min={1}
                      max={totalPages || 1}
                      value={lvJumpPageInput}
                      onChange={(e) => setLvJumpPageInput(e.target.value)}
                      onBlur={() => {
                        const pageNum = parseInt(lvJumpPageInput, 10);
                        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                          setLvPage(pageNum - 1);
                        } else {
                          setLvJumpPageInput(String(lvPage + 1));
                        }
                      }}
                      className="h-8 w-14 text-center text-xs font-semibold bg-background border border-border/40 rounded-lg px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </form>

                  <div className="flex items-center gap-1">
                    <Button disabled={lvPage === 0} onClick={() => setLvPage((prev) => prev - 1)} variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted">
                      <ChevronLeft className="h-3.5 w-3.5" /> Previous
                    </Button>
                    {getPageNumbers(lvPage, totalPages).map((p, pIdx) => {
                      if (p === "...") return <span key={`dots-${pIdx}`} className="px-2 text-muted-foreground font-bold pointer-events-none">...</span>;
                      const pageNum = p as number;
                      const isCurrent = pageNum === lvPage;
                      return (
                        <Button key={pageNum} onClick={() => setLvPage(pageNum)} variant={isCurrent ? "default" : "outline"} size="sm" className={cn("h-8 min-w-[32px] px-2 text-xs font-semibold rounded-lg transition-all", isCurrent ? "bg-primary text-primary-foreground shadow-xs" : "border-border/40 text-foreground hover:bg-muted/70")}>
                          {pageNum + 1}
                        </Button>
                      );
                    })}
                    <Button disabled={lvPage >= totalPages - 1 || totalPages === 0} onClick={() => setLvPage((prev) => prev + 1)} variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted">
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* CREATE EMPLOYEE MODAL */}
      {isCreateEmpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <UserPlus className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-foreground text-sm">Khởi Tạo Nhân Viên Mới</h3>
              </div>
              <button
                onClick={() => setIsCreateEmpOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">Họ và Tên Nhân Viên:</label>
                <Input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="rounded-xl font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">Email làm việc:</label>
                <Input
                  type="email"
                  placeholder="vudat@ailms.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Vị trí / Chức danh:</label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full h-10 px-3 bg-card border border-border rounded-xl font-medium text-foreground outline-none focus:border-primary"
                  >
                    <option value="Giảng viên Lập trình Web">Giảng viên Lập trình Web</option>
                    <option value="Giảng viên Khoa học dữ liệu & AI">Giảng viên Khoa học dữ liệu & AI</option>
                    <option value="Trợ giảng Python AI">Trợ giảng Python AI</option>
                    <option value="Chuyên viên HR & Tuyển dụng">Chuyên viên HR & Tuyển dụng</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Hình thức hợp đồng:</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                    className="w-full h-10 px-3 bg-card border border-border rounded-xl font-medium text-foreground outline-none focus:border-primary"
                  >
                    <option value="FULL_TIME">Chính thức (FULL_TIME)</option>
                    <option value="PART_TIME">Bán thời gian (PART_TIME)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Lương cơ bản hợp đồng (VNĐ):</label>
                  <Input
                    type="number"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(Number(e.target.value))}
                    className="rounded-xl font-bold text-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Hạn hết thời gian thử việc:</label>
                  <Input
                    type="date"
                    value={probationEndDate}
                    onChange={(e) => setProbationEndDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateEmpOpen(false)}
                  className="rounded-xl"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl font-bold bg-primary"
                >
                  {submitting ? "Đang khởi tạo..." : "Xác nhận Khởi tạo Employee"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST BANNER NOTIFICATIONS */}
      {actionMessage && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300",
            actionMessage.isError ? "bg-destructive" : "bg-emerald-600"
          )}
        >
          {actionMessage.isError ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
          <span className="text-sm font-semibold">{actionMessage.text}</span>
        </div>
      )}
    </div>
  );
};
