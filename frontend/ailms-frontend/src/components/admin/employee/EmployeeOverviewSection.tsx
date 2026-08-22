import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Mail,
  RefreshCw,
  Users,
  ShieldAlert,
  Briefcase
} from "lucide-react";
import { employeeApi } from "@/api/employees/employeeApi";

// Harmonious 5-color Theme Palette matching index.css
const THEME_PALETTE = ["#2563eb", "#10b981", "#0284c7", "#f59e0b", "#8b5cf6"];
const EMPLOYMENT_COLORS = ["#2563eb", "#0284c7"]; // Full-time (Deep Blue), Part-time (Cobalt Blue)
const CONTRACT_COLORS = ["#10b981", "#0284c7", "#f59e0b", "#ef4444"]; // Active (Green), Probation (Cobalt), Expired (Amber), Terminated (Red)

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
        { name: "Chính thức", value: empRes.FULL_TIME || 0 },
        { name: "Thời vụ", value: empRes.PART_TIME || 0 }
      ]);

      // Chart 2: Department Vertical Bar
      const formattedDepts = Object.entries(deptRes)
        .map(([name, value]) => ({ name, value: Number(value) }))
        .sort((a, b) => b.value - a.value);
      setDeptStats(formattedDepts);

      // Chart 3: Contract Status Donut
      setContractStats([
        { name: "Đang hiệu lực", value: contractRes.ACTIVE || 0 },
        { name: "Thử việc", value: contractRes.PROBATION || 0 },
        { name: "Hết hạn", value: contractRes.EXPIRED || 0 },
        { name: "Đã chấm dứt", value: contractRes.TERMINATED || 0 }
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
        onShowBanner(res.message || "Đã gửi mail nhắc nhở phòng HR thành công!");
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
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">
            Tổng quan &amp; Phân tích nhân sự
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOverviewData}
          disabled={loading}
          className="h-8 gap-1.5 text-xs font-bold rounded-xl cursor-pointer"
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
            <CardTitle className="text-sm font-extrabold flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <span>Loại hình nhân viên</span>
            </CardTitle>
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
            <CardTitle className="text-sm font-extrabold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Nhân viên theo phòng ban</span>
            </CardTitle>
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
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {deptStats.map((_, index) => (
                    <Cell key={`dept-bar-${index}`} fill={THEME_PALETTE[index % THEME_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Card 4: Expiring Probation Warning KPI Card */}
        <Card
          onClick={onSelectExpiringProbationFilter}
          className="lg:col-span-4 border border-brand-cobalt/40 bg-brand-cobalt/5 shadow-xs hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold text-brand-cobalt flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-brand-cobalt" />
              <span>Hợp đồng thử việc sắp hết hạn</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="py-2 flex items-center justify-between">
            <div>
              <div className="text-4xl font-black tracking-tight text-brand-cobalt flex items-baseline gap-2">
                <span>{expiringProbationCount}</span>
                <span className="text-xs font-bold text-muted-foreground">hợp đồng</span>
              </div>
            </div>

            <Button
              size="sm"
              variant="default"
              onClick={handleTriggerNotifyHR}
              disabled={notifyLoading}
              className="bg-brand-cobalt hover:bg-brand-cobalt/90 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 cursor-pointer"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Gửi Mail HR</span>
            </Button>
          </CardContent>
        </Card>

        {/* Chart 3: Donut Chart Contract Status */}
        <Card className="lg:col-span-6 border-border shadow-xs hover:shadow-md transition-shadow bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" />
              <span>Trạng thái hợp đồng</span>
            </CardTitle>
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
            <CardTitle className="text-sm font-extrabold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Nhân viên theo vai trò nội bộ</span>
            </CardTitle>
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
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {roleStats.map((_, index) => (
                    <Cell key={`role-bar-${index}`} fill={THEME_PALETTE[index % THEME_PALETTE.length]} />
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
