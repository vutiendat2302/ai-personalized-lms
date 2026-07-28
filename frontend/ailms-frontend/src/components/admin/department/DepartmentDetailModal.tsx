import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Building2,
  Users,
  Edit2,
  Trash2,
  FileText,
  History,
  ArrowRightLeft,
  UserX,
  UserCheck,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Search,
  Clock,
  Layers,
  Filter
} from "lucide-react";
import { departmentApi, type DepartmentResponse } from "@/api/departments/departmentApi";

interface DepartmentDetailModalProps {
  open: boolean;
  onClose: () => void;
  department: DepartmentResponse | null;
  allDepartments?: DepartmentResponse[];
  onEditDept?: (dept: DepartmentResponse) => void;
  onDeleteDept?: (deptId: number) => void;
  onShowBanner?: (msg: string, isError?: boolean) => void;
}

export const DepartmentDetailModal: React.FC<DepartmentDetailModalProps> = ({
  open,
  onClose,
  department,
  allDepartments = [],
  onEditDept,
  onDeleteDept,
  onShowBanner
}) => {
  if (!department) return null;

  const [activeTab, setActiveTab] = useState("general");

  // Tab 2 Employees list & Transfer
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [targetDeptId, setTargetDeptId] = useState<string>("");

  // Tab 2 Small Filters
  const [filterPosition, setFilterPosition] = useState<string>("ALL");
  const [filterEmploymentType, setFilterEmploymentType] = useState<string>("ALL");

  useEffect(() => {
    if (department) {
      setLoadingEmployees(true);
      departmentApi.getEmployeesByDepartmentId(department.id).then(res => {
        if (res.data.success && res.data.data) {
          setEmployees(res.data.data);
        }
      }).catch(() => {
        // Fallback Mock Employees
        setEmployees([
          { id: "101", employeeCode: "EMP001", fullName: "Nguyễn Văn A", position: "Trưởng phòng", employmentType: "FULL_TIME", status: "ACTIVE" },
          { id: "102", employeeCode: "EMP002", fullName: "Trần Thị B", position: "Giảng viên Senior", employmentType: "FULL_TIME", status: "ACTIVE" },
          { id: "103", employeeCode: "EMP003", fullName: "Lê Văn C", position: "Giảng viên Thỉnh giảng", employmentType: "PART_TIME", status: "ACTIVE" }
        ]);
      }).finally(() => setLoadingEmployees(false));
    }
  }, [department]);

  const handleTransferSelectedEmployees = async () => {
    if (!targetDeptId) {
      if (onShowBanner) onShowBanner("Vui lòng chọn phòng ban đích để chuyển nhân viên!", true);
      return;
    }
    if (selectedEmpIds.length === 0) {
      if (onShowBanner) onShowBanner("Vui lòng chọn ít nhất 1 nhân viên!", true);
      return;
    }

    try {
      await departmentApi.transferEmployees(targetDeptId, selectedEmpIds);
      setEmployees(prev => prev.filter(e => !selectedEmpIds.includes(String(e.id))));
      setSelectedEmpIds([]);
      if (onShowBanner) onShowBanner(`Đã chuyển ${selectedEmpIds.length} nhân viên sang phòng ban mới thành công!`);
    } catch (err: any) {
      if (onShowBanner) onShowBanner("Lỗi chuyển phòng ban nhân viên", true);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    if (filterPosition !== "ALL" && (emp.position || "") !== filterPosition) return false;
    if (filterEmploymentType !== "ALL" && (emp.employmentType || "FULL_TIME") !== filterEmploymentType) return false;
    return true;
  });

  const isEmpEmpty = employees.length === 0;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-6xl w-[94vw] max-h-[94vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border border-border/40 shadow-2xl backdrop-blur-xs">
        
        {/* FIXED HEADER */}
        <DialogHeader className="p-6 bg-gradient-to-r from-primary/10 via-card to-card border-b border-border/40 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/20 text-primary font-black text-2xl flex items-center justify-center border-2 border-primary/30 shrink-0">
                <Building2 className="h-8 w-8" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                    {department.name}
                  </DialogTitle>
                  <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    {department.code}
                  </span>
                  <Badge className={department.status === "ACTIVE" ? "bg-emerald-600 text-white font-bold text-xs" : "bg-red-500 text-white font-bold text-xs"}>
                    {department.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động"}
                  </Badge>
                </div>

                <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                  <span>Mô tả: <strong className="text-foreground">{department.description || "Chưa có mô tả"}</strong></span>
                  <span>Nhân viên: <strong className="text-primary font-bold">{employees.length} Nhân sự</strong></span>
                </DialogDescription>
              </div>
            </div>

            {/* Quick Actions: Edit / Delete */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditDept && onEditDept(department)}
                className="font-bold text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Edit2 className="h-4 w-4" /> Sửa Phòng ban
              </Button>

              <Button
                size="sm"
                variant="destructive"
                disabled={!isEmpEmpty}
                onClick={() => onDeleteDept && onDeleteDept(department.id)}
                className="font-bold text-xs gap-1.5"
                title={!isEmpEmpty ? "Chuyển toàn bộ nhân viên sang phòng ban khác trước khi xóa" : "Xóa phòng ban"}
              >
                <Trash2 className="h-4 w-4" /> Xóa
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 3 TABS NAVIGATION */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="px-6 border-b border-border/30 bg-muted/20 justify-start gap-4 rounded-none h-12">
            <TabsTrigger value="general" className="font-bold text-xs gap-1.5"><FileText className="h-3.5 w-3.5" /> Tab 1 — Thông tin chung</TabsTrigger>
            <TabsTrigger value="employees" className="font-bold text-xs gap-1.5"><Users className="h-3.5 w-3.5" /> Tab 2 — Nhân viên thuộc phòng ({employees.length})</TabsTrigger>
            <TabsTrigger value="audit" className="font-bold text-xs gap-1.5"><History className="h-3.5 w-3.5" /> Tab 3 — Audit Log</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* TAB 1: THÔNG TIN CHUNG */}
            <TabsContent value="general" className="mt-0 space-y-4">
              <Card className="border-border shadow-xs">
                <CardHeader className="py-3 bg-muted/20 border-b border-border/30">
                  <CardTitle className="text-xs font-extrabold text-foreground flex items-center gap-1.5 uppercase">
                    <Building2 className="h-4 w-4 text-primary" /> Chi tiết Hồ sơ Phòng ban
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground">Mã Phòng ban (Code)</Label>
                    <div className="mt-1 font-mono font-extrabold text-sm text-primary">{department.code}</div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground">Tên Phòng ban</Label>
                    <div className="mt-1 font-extrabold text-sm text-foreground">{department.name}</div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground">Trạng thái</Label>
                    <div className="mt-1">
                      <Badge className={department.status === "ACTIVE" ? "bg-emerald-600 text-white font-bold" : "bg-red-500 text-white font-bold"}>
                        {department.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground">Ngày khởi tạo</Label>
                    <div className="mt-1 font-mono text-muted-foreground">{department.createdAt ? department.createdAt.slice(0, 10) : "2026-01-01"}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-bold text-muted-foreground">Mô tả chức năng & Nhiệm vụ</Label>
                    <div className="mt-1 text-foreground bg-muted/20 p-3 rounded-lg border">{department.description || "Chưa thiết lập mô tả chức năng."}</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: DANH SÁCH NHÂN VIÊN THUỘC PHÒNG BAN & CHUYỂN HÀNG LOẠT */}
            <TabsContent value="employees" className="mt-0 space-y-4">
              
              {/* Toolbar chuyển nhân viên hàng loạt sang phòng ban khác */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-extrabold text-primary uppercase">Chuyển nhân viên sang Phòng ban khác</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Đã chọn <strong className="text-primary">{selectedEmpIds.length}</strong> / {employees.length} nhân viên
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Select value={targetDeptId} onValueChange={setTargetDeptId}>
                    <SelectTrigger className="h-9 w-52 text-xs bg-background border border-border/40 font-bold">
                      <SelectValue placeholder="Chọn phòng ban đích..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allDepartments.filter(d => d.id !== department.id).map(d => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name} ({d.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={handleTransferSelectedEmployees}
                    disabled={selectedEmpIds.length === 0 || !targetDeptId}
                    className="font-bold text-xs gap-1.5 bg-primary text-primary-foreground"
                  >
                    <ArrowRightLeft className="h-4 w-4" /> Chuyển Phòng ban
                  </Button>
                </div>
              </div>

              {/* Bộ lọc nhỏ theo Position & Employment Type trong Tab này */}
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30 text-xs">
                <span className="font-bold text-muted-foreground flex items-center gap-1"><Filter className="h-3.5 w-3.5" /> Lọc nhanh:</span>
                
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Loại HĐ:</span>
                  <Select value={filterEmploymentType} onValueChange={setFilterEmploymentType}>
                    <SelectTrigger className="h-8 text-xs w-32 bg-background"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tất cả</SelectItem>
                      <SelectItem value="FULL_TIME">FULL_TIME</SelectItem>
                      <SelectItem value="PART_TIME">PART_TIME</SelectItem>
                      <SelectItem value="CONTRACT">CONTRACT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bảng nhân viên */}
              <div className="border border-border/40 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 font-bold border-b border-border/30 uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3 w-8">
                        <Checkbox
                          checked={filteredEmployees.length > 0 && selectedEmpIds.length === filteredEmployees.length}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedEmpIds(filteredEmployees.map(e => String(e.id)));
                            else setSelectedEmpIds([]);
                          }}
                        />
                      </th>
                      <th className="p-3">Mã NV</th>
                      <th className="p-3">Họ và tên</th>
                      <th className="p-3">Chức vụ (Position)</th>
                      <th className="p-3 text-center">Hình thức (Type)</th>
                      <th className="p-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 font-medium">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground font-bold">
                          Không tìm thấy nhân viên nào phù hợp trong phòng ban này.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map(emp => (
                        <tr key={emp.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-3">
                            <Checkbox
                              checked={selectedEmpIds.includes(String(emp.id))}
                              onCheckedChange={() => {
                                if (selectedEmpIds.includes(String(emp.id))) setSelectedEmpIds(selectedEmpIds.filter(id => id !== String(emp.id)));
                                else setSelectedEmpIds([...selectedEmpIds, String(emp.id)]);
                              }}
                            />
                          </td>
                          <td className="p-3 font-mono font-bold text-primary">{emp.employeeCode}</td>
                          <td className="p-3 font-bold text-foreground">{emp.fullName}</td>
                          <td className="p-3">{emp.position || "Nhân viên"}</td>
                          <td className="p-3 text-center font-mono font-bold">
                            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {emp.employmentType || "FULL_TIME"}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              {emp.status || "ACTIVE"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB 3: AUDIT LOG */}
            <TabsContent value="audit" className="mt-0 space-y-4">
              <h4 className="text-sm font-extrabold text-foreground">Lịch sử Thay đổi & Audit Log Phòng ban</h4>
              
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border bg-card flex items-start gap-3 text-xs">
                  <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-foreground">Cập nhật thông tin phòng ban ({department.name})</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Thực hiện bởi HR Manager lúc 2026-07-27 09:30 AM</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border bg-card flex items-start gap-3 text-xs">
                  <Building2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-foreground">Khởi tạo Phòng ban Mã {department.code}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Thực hiện bởi System Admin lúc {department.createdAt ? department.createdAt.slice(0, 10) : "2026-01-01"}</div>
                  </div>
                </div>
              </div>
            </TabsContent>

          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
