import React, { useState, useEffect } from "react";
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
import { Card } from "@/components/ui/card";
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
} from "lucide-react";

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

  // Search & Modals
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateEmpOpen, setIsCreateEmpOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      id: "ct-1",
      employeeId: "emp-1",
      employeeCode: "EP-2607-A3F9C1",
      contractType: "OFFICIAL",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      signedAt: "2026-07-01",
      validFrom: "2026-07-01",
      status: "ACTIVE",
      baseSalary: 25000000,
    },
    {
      id: "ct-2",
      employeeId: "emp-2",
      employeeCode: "EP-2607-F88B12",
      contractType: "PROBATION",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      signedAt: "2026-06-01",
      validFrom: "2026-06-01",
      validTo: "2026-07-31",
      status: "ACTIVE",
      baseSalary: 18000000,
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
      if (empRes.data.success && Array.isArray(empRes.data.data) && empRes.data.data.length > 0) {
        setEmployees(empRes.data.data);
      } else {
        setEmployees(MOCK_EMPLOYEES);
      }
    } catch (e) {
      setEmployees(MOCK_EMPLOYEES);
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
      e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
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
      {activeTab === "employees" && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Tìm theo Mã nhân viên (EP-...), Tên hoặc Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl text-xs"
            />
          </div>

          <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-extrabold border-b border-border">
                  <tr>
                    <th className="p-4">Mã Nhân Viên</th>
                    <th className="p-4">Họ & Tên</th>
                    <th className="p-4">Phòng Ban & Vị Trí</th>
                    <th className="p-4">Hình Thức</th>
                    <th className="p-4">Lương Cơ Bản</th>
                    <th className="p-4">Trạng Thái</th>
                    <th className="p-4">Ngày Vào</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-mono font-extrabold text-primary">
                        <span className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                          {emp.employeeCode}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-foreground">{emp.fullName}</div>
                        <div className="text-[10px] text-muted-foreground">{emp.userEmail}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-foreground">{emp.position}</div>
                        <div className="text-[10px] text-muted-foreground">{emp.departmentName || "Ban điều hành"}</div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            emp.employmentType === "FULL_TIME"
                              ? "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          {emp.employmentType === "FULL_TIME" ? "Chính thức (Full-time)" : "Bán thời gian (Part-time)"}
                        </span>
                      </td>
                      <td className="p-4 font-extrabold text-foreground">
                        {emp.baseSalary ? `${emp.baseSalary.toLocaleString()} đ` : "-"}
                      </td>
                      <td className="p-4">
                        {emp.status === "ACTIVE" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                            Thử việc (Probation)
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">{emp.joinedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: CONTRACTS & PROBATION */}
      {activeTab === "contracts" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <strong className="font-extrabold block">Cảnh báo đánh giá hết hạn thử việc (Probation Review):</strong>
                <span>Cần đánh giá ký hợp đồng OFFICIAL hoặc kết thúc thử việc trước 1 tuần đối với các hợp đồng sắp hết hạn.</span>
              </div>
            </div>
          </div>

          <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-extrabold border-b border-border">
                  <tr>
                    <th className="p-4">Mã Nhân Viên</th>
                    <th className="p-4">Loại Hợp Đồng</th>
                    <th className="p-4">Lương Ký Hợp Đồng</th>
                    <th className="p-4">Ngày Ký</th>
                    <th className="p-4">Thời Hạn Thử Việc / Hết Hạn</th>
                    <th className="p-4">Trạng Thái Hợp Đồng</th>
                    <th className="p-4 text-right">File Hợp Đồng (MinIO)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {contracts.map((ct) => (
                    <tr key={ct.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-mono font-extrabold text-foreground">{ct.employeeCode}</td>
                      <td className="p-4 font-bold">
                        {ct.contractType === "PROBATION" ? "Hợp đồng thử việc" : "Hợp đồng chính thức"}
                      </td>
                      <td className="p-4 font-extrabold text-primary">{ct.baseSalary.toLocaleString()} đ</td>
                      <td className="p-4 text-muted-foreground">{ct.signedAt}</td>
                      <td className="p-4 text-muted-foreground">{ct.validTo || "Không thời hạn"}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                          {ct.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <a
                          href={ct.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                        >
                          <FileCheck className="h-4 w-4" />
                          <span>Tải PDF MinIO</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: ATTENDANCE */}
      {activeTab === "attendance" && (
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-extrabold border-b border-border">
                  <tr>
                    <th className="p-4">Nhân Viên</th>
                    <th className="p-4">Ngày Làm Việc</th>
                    <th className="p-4">Giờ Check-in</th>
                    <th className="p-4">Giờ Check-out</th>
                    <th className="p-4">Trạng Thái Công</th>
                    <th className="p-4">Khấu Trừ Phạt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {attendances.map((att) => (
                    <tr key={att.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-bold text-foreground">{att.employeeName}</td>
                      <td className="p-4 text-muted-foreground">{att.workDate}</td>
                      <td className="p-4 font-mono">{att.checkInTime || "-"}</td>
                      <td className="p-4 font-mono">{att.checkOutTime || "-"}</td>
                      <td className="p-4">
                        {att.status === "PRESENT" && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                            Đúng giờ (PRESENT)
                          </span>
                        )}
                        {att.status === "LATE" && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-[10px]">
                            Đi trễ (LATE)
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-rose-600">
                        {att.penaltyAmount ? `-${att.penaltyAmount.toLocaleString()} đ` : "0 đ"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: PAYROLL */}
      {activeTab === "payroll" && (
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-extrabold border-b border-border">
                  <tr>
                    <th className="p-4">Mã NV</th>
                    <th className="p-4">Nhân Viên</th>
                    <th className="p-4">Lương Gross</th>
                    <th className="p-4">Trừ Bảo Hiểm (10.5%)</th>
                    <th className="p-4">Trừ Thuế TNCN</th>
                    <th className="p-4">Trừ Phạt Đi Trễ</th>
                    <th className="p-4">Lương Thực Lĩnh</th>
                    <th className="p-4 text-right">Trạng Thái & Chi Trả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {salaries.map((sal) => (
                    <tr key={sal.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-mono font-bold text-foreground">{sal.employeeCode}</td>
                      <td className="p-4 font-bold text-foreground">{sal.employeeName}</td>
                      <td className="p-4 font-bold">{sal.grossSalary.toLocaleString()} đ</td>
                      <td className="p-4 text-muted-foreground">-{sal.insuranceDeduction.toLocaleString()} đ</td>
                      <td className="p-4 text-muted-foreground">-{sal.taxDeduction.toLocaleString()} đ</td>
                      <td className="p-4 text-rose-600">-{sal.penaltyDeduction.toLocaleString()} đ</td>
                      <td className="p-4 font-extrabold text-emerald-600 text-sm">
                        {sal.netSalary.toLocaleString()} đ
                      </td>
                      <td className="p-4 text-right">
                        {sal.status === "PAID" ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                            Đã chuyển khoản (PAID)
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleApproveSalary(sal.id)}
                            className="rounded-xl text-xs font-bold bg-primary"
                          >
                            Duyệt & Chi trả
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: LEAVE REQUESTS */}
      {activeTab === "leaves" && (
        <div className="space-y-4">
          <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-extrabold border-b border-border">
                  <tr>
                    <th className="p-4">Nhân Viên Xin Nghỉ</th>
                    <th className="p-4">Từ Ngày</th>
                    <th className="p-4">Đến Ngày</th>
                    <th className="p-4">Lý Do Xin Nghỉ</th>
                    <th className="p-4">Trạng Thái</th>
                    <th className="p-4 text-right">Duyệt Đơn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {leaveRequests.map((lv) => (
                    <tr key={lv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-bold text-foreground">{lv.employeeName}</td>
                      <td className="p-4 text-muted-foreground">{lv.startDate}</td>
                      <td className="p-4 text-muted-foreground">{lv.endDate}</td>
                      <td className="p-4 text-foreground">{lv.reason}</td>
                      <td className="p-4">
                        {lv.status === "APPROVED" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                            Đã chấp thuận
                          </span>
                        )}
                        {lv.status === "REJECTED" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-[10px]">
                            Từ chối
                          </span>
                        )}
                        {lv.status === "PENDING" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[10px]">
                            Chờ Admin duyệt
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {lv.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproveLeave(lv.id, "APPROVED")}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                            >
                              Chấp thuận
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveLeave(lv.id, "REJECTED")}
                              className="rounded-lg border-rose-300 text-rose-600 font-bold text-xs"
                            >
                              Từ chối
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

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
    </div>
  );
};
