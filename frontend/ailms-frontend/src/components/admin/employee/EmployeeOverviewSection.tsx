import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from "recharts";
import {
  PieChart as PieIcon,
  BarChart3,
  AlertTriangle,
  Mail,
  CheckCircle2,
  RefreshCw,
  Users,
  ShieldAlert,
  Briefcase
} from "lucide-react";
import { employeeApi } from "@/api/employees/employeeApi";

const EMPLOYMENT_COLORS = ["#2563eb", "#f59e0b"]; // Full-time (Blue), Part-time (Amber)
const DEPT_COLORS = ["#2b5748", "#7b2525", "#ba6a4c", "#ff97d0", "#fe7f2d", "#4e220f"];
const CONTRACT_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6b7280"]; // ACTIVE, PROBATION, EXPIRED, TERMINATED
const ROLE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4"];

interface EmployeeOverviewSectionProps {
  onSelectExpiringProbationFilter?: () => void;
  onShowBanner?: (msg: string, isError?: boolean) => void;
}

export const EmployeeOverviewSection: React.FC<EmployeeOverviewSectionProps> = ({
  onSelectExpiringProbationFilter,
  onShowBanner
}) => {
  const [loading, setLoading] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);

  const [employmentStats, setEmploymentStats] = useState<{ name: string; value: number }[]>([]);
  const [deptStats, setDeptStats] = useState<{ name: string; value: number }[]>([]);
  const [contractStats, setContractStats] = useState<{ name: string; value: number }[]>([]);
  const [expiringProbationCount, setExpiringProbationCount] = useState<number>(0);
  const [roleStats, setRoleStats] = useState<{ name: string; value: number }[]>([]);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes, contractRes, probationRes, roleRes] = await Promise.all([
        employeeApi.getEmploymentTypeStats(),
        employeeApi.getDepartmentStats(),
        employeeApi.getContractStatusStats(),
        employeeApi.getExpiringProbationCount(),
        employeeApi.getStaffRoleStats()
      ]);

      // Chart 1: Employment Type Donut
      setEmploymentStats([
        { name: "Toàn thời gian (FULL_TIME)", value: empRes.FULL_TIME || 0 },
        { name: "Bán thời gian (PART_TIME)", value: empRes.PART_TIME || 0 }
      ]);

      // Chart 2: Department Vertical Bar (Sorted DESC)
      const formattedDepts = Object.entries(deptRes)
        .map(([name, value]) => ({ name, value: Number(value) }))
        .sort((a, b) => b.value - a.value);
      setDeptStats(formattedDepts);

      // Chart 3: Contract Status Donut
      setContractStats([
        { name: "Đang hiệu lực (ACTIVE)", value: contractRes.ACTIVE || 0 },
        { name: "Thử việc (PROBATION)", value: contractRes.PROBATION || 0 },
        { name: "Hết hạn (EXPIRED)", value: contractRes.EXPIRED || 0 },
        { name: "Chấm dứt (TERMINATED)", value: contractRes.TERMINATED || 0 }
      ]);

      // Card 4: Expiring Probation Count
      setExpiringProbationCount(probationRes);

      // Chart 5: Role Vertical Bar
      const formattedRoles = Object.entries(roleRes)
        .map(([name, value]) => ({ name, value: Number(value) }))
        .sort((a, b) => b.value - a.value);
      setRoleStats(formattedRoles);

    } catch (err: any) {
      console.error("Error loading overview section:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const handleTriggerNotifyHR = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifyLoading(true);
    try {
      const res = await employeeApi.notifyExpiringProbation();
      if (onShowBanner) {
        onShowBanner(res.message || "Đã gửi mail/thông báo nhắc nhở phòng HR thành công!");
      }
    } catch (err: any) {
      if (onShowBanner) {
        onShowBanner(err.message || "Lỗi gửi thông báo nhắc HR", true);
      }
    } finally {
      setNotifyLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* Section Sub-header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
            <PieIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-foreground">
              Overview & Analytics (5.11.1 Khu vực tổng quan)
            </h2>
            <p className="text-xs text-muted-foreground">
              Load song song không block UI - Tự động cập nhật cache định kỳ 5 phút
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOverviewData}
          disabled={loading}
          className="h-8 gap-1.5 text-xs font-bold rounded-xl"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Tải lại dữ liệu</span>
        </Button>
      </div>

      {/* Grid Layout for Charts & KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        
        {/* Chart 1: Donut Chart Employment Type */}
        <Card className="lg:col-span-4 border-border shadow-xs hover:shadow-md transition-shadow bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-500" />
                <span>1. Loại hình nhân viên</span>
              </CardTitle>
              <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                Active Staff
              </span>
            </div>
            <CardDescription className="text-xs">
              Phân bổ FULL_TIME vs PART_TIME (trừ TERMINATED)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex flex-col items-center justify-center min-h-[220px]">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={employmentStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {employmentStats.map((_, index) => (
                    <Cell key={`emp-type-${index}`} fill={EMPLOYMENT_COLORS[index % EMPLOYMENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val} nhân viên`, "Số lượng"]}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2: Vertical Bar Chart Department */}
        <Card className="lg:col-span-4 border-border shadow-xs hover:shadow-md transition-shadow bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                <span>2. Nhân viên theo Phòng ban</span>
              </CardTitle>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                Sắp xếp giảm dần
              </span>
            </div>
            <CardDescription className="text-xs">
              Số lượng nhân viên theo từng department
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex items-center justify-center min-h-[220px]">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={deptStats} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} style={{ fontSize: "10px" }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: "10px" }} />
                <Tooltip
                  formatter={(val: any) => [`${val} người`, "Số lượng"]}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#2b5748">
                  {deptStats.map((_, index) => (
                    <Cell key={`dept-bar-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Card 4: Expiring Probation Warning KPI Card */}
        <Card
          onClick={onSelectExpiringProbationFilter}
          className="lg:col-span-4 border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
              Alert 7 ngày
            </span>
          </div>

          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600 animate-bounce" />
              <span>4. HĐ Thử việc sắp hết hạn</span>
            </CardTitle>
            <CardDescription className="text-xs text-amber-600/90 dark:text-amber-400">
              Click vào card để filter ngay các hợp đồng cần đánh giá trong 7 ngày tới
            </CardDescription>
          </CardHeader>

          <CardContent className="py-2 flex items-center justify-between">
            <div>
              <div className="text-4xl font-black tracking-tight text-amber-600 dark:text-amber-400 flex items-baseline gap-2">
                <span>{expiringProbationCount}</span>
                <span className="text-xs font-bold text-muted-foreground">hợp đồng</span>
              </div>
              <p className="text-[11px] font-semibold text-amber-700/80 dark:text-amber-300 mt-1">
                Yêu cầu HR thực hiện probation-review
              </p>
            </div>

            <Button
              size="sm"
              variant="default"
              onClick={handleTriggerNotifyHR}
              disabled={notifyLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Gửi Mail HR</span>
            </Button>
          </CardContent>

          <div className="px-4 py-1.5 bg-amber-500/10 border-t border-amber-500/20 text-[10px] font-extrabold text-amber-800 dark:text-amber-200 flex items-center justify-between">
            <span>Liên kết tự động luồng 5.2</span>
            <span className="underline group-hover:translate-x-1 transition-transform">Lọc danh sách &rarr;</span>
          </div>
        </Card>

        {/* Chart 3: Donut Chart Contract Status */}
        <Card className="lg:col-span-6 border-border shadow-xs hover:shadow-md transition-shadow bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-purple-600" />
                <span>3. Trạng thái Hợp đồng (Bao gồm TERMINATED)</span>
              </CardTitle>
              <span className="text-[10px] bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full font-bold">
                1 Hợp đồng / Nhân viên
              </span>
            </div>
            <CardDescription className="text-xs">
              Tỷ lệ hợp đồng ACTIVE, PROBATION, EXPIRED và TERMINATED
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex flex-col items-center justify-center min-h-[220px]">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={contractStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {contractStats.map((_, index) => (
                    <Cell key={`contract-pie-${index}`} fill={CONTRACT_COLORS[index % CONTRACT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val} hợp đồng`, "Số lượng"]}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 5: Vertical Bar Chart Staff Roles */}
        <Card className="lg:col-span-6 border-border shadow-xs hover:shadow-md transition-shadow bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                <span>5. Nhân viên theo Vai trò (Chỉ role nội bộ)</span>
              </CardTitle>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                Excludes Student/Parent
              </span>
            </div>
            <CardDescription className="text-xs">
              Số lượng nhân viên theo vai trò HR, Accountant, Manager, Teacher, TA...
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex items-center justify-center min-h-[220px]">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={roleStats} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} style={{ fontSize: "10px" }} interval={0} angle={-10} textAnchor="end" />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: "10px" }} />
                <Tooltip
                  formatter={(val: any) => [`${val} nhân sự`, "Số lượng"]}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#6366f1">
                  {roleStats.map((_, index) => (
                    <Cell key={`role-bar-${index}`} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </section>
  );
};
