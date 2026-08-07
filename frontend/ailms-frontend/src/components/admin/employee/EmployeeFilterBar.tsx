import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  RotateCcw,
  Clock,
  BookOpen,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  AlertCircle
} from "lucide-react";
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
import { employeeApi } from "@/api/employees/employeeApi";

interface FilterBarProps {
  searchKeyword: string;
  setSearchKeyword: (val: string) => void;
  selectedDepartments: string[];
  setSelectedDepartments: (depts: string[]) => void;
  selectedRoles: string[];
  setSelectedRoles: (roles: string[]) => void;
  employmentType: string;
  setEmploymentType: (type: string) => void;
  contractStatus: string;
  setContractStatus: (status: string) => void;
  selectedTeacherCategories: string[];
  setSelectedTeacherCategories: (cats: string[]) => void;

  departmentOptions: { id: string; name: string }[];
  roleOptions: { id: string; code: string; name: string }[];
  teacherCategoryOptions: string[];

  onResetFilters: () => void;
}

const ATTENDANCE_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6"]; // PRESENT (Green), LATE (Amber), ABSENT (Red), ON_LEAVE (Blue)
const SESSION_COLORS = ["#94a3b8", "#f59e0b", "#3b82f6", "#10b981"]; // Draft (Gray), Pending (Amber), CONFIRMED (Blue), PAID (Green)

export const EmployeeFilterBar: React.FC<FilterBarProps> = ({
  searchKeyword,
  setSearchKeyword,
  selectedDepartments,
  setSelectedDepartments,
  selectedRoles,
  setSelectedRoles,
  employmentType,
  setEmploymentType,
  contractStatus,
  setContractStatus,
  selectedTeacherCategories,
  setSelectedTeacherCategories,
  departmentOptions,
  roleOptions,
  teacherCategoryOptions,
  onResetFilters,
}) => {
  const isTeacherOrTARoleSelected = selectedRoles.some(r => {
    const roleObj = roleOptions.find(opt => String(opt.id) === String(r) || opt.code === r);
    const code = (roleObj?.code || r).toUpperCase();
    return code.includes("TEACHER") || code.includes("TA") || code.includes("GIANG_VIEN") || code.includes("TRO_GIANG");
  });

  // Dynamic Mini-chart states
  const [fulltimeAttendanceStats, setFulltimeAttendanceStats] = useState<{ name: string; value: number }[]>([]);
  const [parttimeSessionStats, setParttimeSessionStats] = useState<{ name: string; value: number }[]>([]);
  const [miniChartLoading, setMiniChartLoading] = useState(false);

  useEffect(() => {
    if (employmentType === "FULL_TIME") {
      setMiniChartLoading(true);
      employeeApi.getFulltimeMonthlyAttendanceStats()
        .then(res => {
          setFulltimeAttendanceStats([
            { name: "Có mặt (PRESENT)", value: res.PRESENT || 0 },
            { name: "Đi muộn (LATE)", value: res.LATE || 0 },
            { name: "Vắng (ABSENT)", value: res.ABSENT || 0 },
            { name: "Nghỉ phép (ON_LEAVE)", value: res.ON_LEAVE || 0 }
          ]);
        })
        .finally(() => setMiniChartLoading(false));
    } else if (employmentType === "PART_TIME") {
      setMiniChartLoading(true);
      employeeApi.getParttimeTeachingSessionStats()
        .then(res => {
          setParttimeSessionStats([
            { name: "Nháp (Draft)", value: res.Draft || 0 },
            { name: "Chờ duyệt (Pending)", value: res.Pending || 0 },
            { name: "Xác nhận (CONFIRMED)", value: res.CONFIRMED || 0 },
            { name: "Đã chi trả (PAID)", value: res.PAID || 0 }
          ]);
        })
        .finally(() => setMiniChartLoading(false));
    }
  }, [employmentType]);

  const toggleMultiSelect = (currentList: string[], value: string, setter: (list: string[]) => void) => {
    if (currentList.includes(value)) {
      setter(currentList.filter(item => item !== value));
    } else {
      setter([...currentList, value]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Filter Bar Card */}
      <Card className="border-border shadow-xs bg-card overflow-hidden">
        <div className="p-4 bg-muted/20 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-extrabold text-foreground">
              5.11.2 Bộ lọc & Tìm kiếm (Filter Bar)
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Đặt lại bộ lọc</span>
          </Button>
        </div>

        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          
          {/* Keyword Search (4 cols) */}
          <div className="lg:col-span-4 space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">
              Từ khóa tìm kiếm
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Tìm mã (EP-...), Họ tên, Email, SĐT..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-8 h-9 text-xs bg-background border-border rounded-xl"
              />
            </div>
          </div>

          {/* Department Multi-select (2 cols) */}
          <div className="lg:col-span-2 space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">
              Phòng ban
            </Label>
            <Select
              value={selectedDepartments[0] || "ALL"}
              onValueChange={(val) => setSelectedDepartments(val === "ALL" ? [] : [val])}
            >
              <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl">
                <SelectValue placeholder="Tất cả phòng ban" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả phòng ban</SelectItem>
                {departmentOptions.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role Multi-select (2 cols) */}
          <div className="lg:col-span-2 space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">
              Vai trò (Staff Role)
            </Label>
            <Select
              value={selectedRoles[0] || "ALL"}
              onValueChange={(val) => setSelectedRoles(val === "ALL" ? [] : [val])}
            >
              <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl">
                <SelectValue placeholder="Tất cả vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả vai trò</SelectItem>
                {roleOptions.map(role => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employment Type Single-select (2 cols) */}
          <div className="lg:col-span-2 space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">
              Loại hình làm việc
            </Label>
            <Select
              value={employmentType || "ALL"}
              onValueChange={(val) => setEmploymentType(val === "ALL" ? "" : val)}
            >
              <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl font-bold">
                <SelectValue placeholder="Tất cả loại hình" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả loại hình</SelectItem>
                <SelectItem value="FULL_TIME">Chính thức (FULL_TIME)</SelectItem>
                <SelectItem value="PART_TIME">Bán thời gian (PART_TIME)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contract Status Single-select (2 cols) */}
          <div className="lg:col-span-2 space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">
              Trạng thái hợp đồng
            </Label>
            <Select
              value={contractStatus || "ALL"}
              onValueChange={(val) => setContractStatus(val === "ALL" ? "" : val)}
            >
              <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE">Đang hiệu lực (ACTIVE)</SelectItem>
                <SelectItem value="PROBATION">Thử việc (PROBATION)</SelectItem>
                <SelectItem value="EXPIRED">Hết hạn (EXPIRED)</SelectItem>
                <SelectItem value="TERMINATED">Đã chấm dứt (TERMINATED)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional Teaching Category Multi-select (Only visible when role is Teacher/TA) */}
          {isTeacherOrTARoleSelected && (
            <div className="lg:col-span-12 p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5 animate-in fade-in duration-300">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <BookOpen className="h-4 w-4" />
                <span>Lĩnh vực giảng dạy (Dành cho Teacher / TA)</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {teacherCategoryOptions.map(cat => {
                  const isChecked = selectedTeacherCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleMultiSelect(selectedTeacherCategories, cat, setSelectedTeacherCategories)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isChecked
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-background border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* DYNAMIC MINI CHART SECTION (Position: Right below filter bar, above list table) */}
      {employmentType && (
        <div className="animate-in slide-in-from-top-3 duration-300">
          {employmentType === "FULL_TIME" && (
            <Card className="border-2 border-blue-500/30 bg-gradient-to-r from-blue-500/5 via-card to-card shadow-xs overflow-hidden">
              <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1 md:w-1/3">
                  <div className="flex items-center gap-2 text-blue-600 font-extrabold text-sm">
                    <Clock className="h-4 w-4" />
                    <span>Mini Chart Chấm Công (FULL_TIME)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tỷ lệ trạng thái PRESENT / LATE / ABSENT / ON_LEAVE trong tháng hiện tại (nguồn: attendance).
                  </p>
                </div>

                <div className="w-full md:w-2/3 h-44 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={fulltimeAttendanceStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {fulltimeAttendanceStats.map((_, index) => (
                          <Cell key={`att-${index}`} fill={ATTENDANCE_COLORS[index % ATTENDANCE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`${val} lượt`, "Số lượng"]}
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {employmentType === "PART_TIME" && (
            <Card className="border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-card to-card shadow-xs overflow-hidden">
              <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1 md:w-1/3">
                  <div className="flex items-center gap-2 text-amber-600 font-extrabold text-sm">
                    <BarChart3 className="h-4 w-4" />
                    <span>Mini Chart Buổi Dạy (PART_TIME)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Số buổi dạy theo trạng thái Draft / Pending / CONFIRMED / PAID trong kỳ lương (nguồn: teaching_session_payment).
                  </p>
                </div>

                <div className="w-full md:w-2/3 h-44 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={parttimeSessionStats} margin={{ top: 10, right: 20, left: -10, bottom: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tickLine={false} style={{ fontSize: "10px" }} />
                      <YAxis tickLine={false} axisLine={false} style={{ fontSize: "10px" }} />
                      <Tooltip
                        formatter={(val: any) => [`${val} buổi`, "Số lượng"]}
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#f59e0b">
                        {parttimeSessionStats.map((_, index) => (
                          <Cell key={`tsp-bar-${index}`} fill={SESSION_COLORS[index % SESSION_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
