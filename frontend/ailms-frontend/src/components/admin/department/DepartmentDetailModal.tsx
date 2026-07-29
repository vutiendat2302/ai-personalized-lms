import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateDisplay } from "@/components/ui/DatePickerInput";
import {
  Building2,
  Users,
  Edit2,
  Trash2,
  FileText,
  History,
  ArrowRightLeft,
  Clock,
  Filter,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  Activity,
  UserMinus,
} from "lucide-react";
import { departmentApi, type DepartmentResponse } from "@/api/departments/departmentApi";
import { userApi } from "@/api/users/userApi";

interface DepartmentDetailModalProps {
  open: boolean;
  onClose: () => void;
  department: DepartmentResponse | null;
  allDepartments?: DepartmentResponse[];
  initialTab?: string;
  onEditDept?: (dept: DepartmentResponse) => void;
  onDeleteDept?: (deptId: string | number) => void;
  onShowBanner?: (msg: string, isError?: boolean) => void;
  onRefreshData?: () => void;
}

export const DepartmentDetailModal: React.FC<DepartmentDetailModalProps> = ({
  open,
  onClose,
  department,
  allDepartments = [],
  initialTab = "general",
  onEditDept,
  onDeleteDept,
  onShowBanner,
  onRefreshData,
}) => {

  const [activeTab, setActiveTab] = useState(initialTab || "general");

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab || "general");
    }
  }, [open, initialTab]);

  // User Map for resolving CreatedBy / UpdatedBy IDs to Email/Name
  const [userMap, setUserMap] = useState<Record<string, { name: string; email: string }>>({});

  // Tab 2: Employees State
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeesError, setEmployeesError] = useState("");
  const [targetDeptId, setTargetDeptId] = useState<string>("");
  const [filterEmploymentType, setFilterEmploymentType] = useState<string>("ALL");
  const [transferring, setTransferring] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Tab 3: Audit Log State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  const fetchEmployees = async () => {
    if (!department) return;
    setLoadingEmployees(true);
    setEmployeesError("");
    try {
      const res = await departmentApi.getEmployeesByDepartmentId(String(department.id));
      if (res.data?.success && Array.isArray(res.data.data)) {
        setEmployees(res.data.data);
      } else {
        setEmployees([]);
        if (res.data?.message) setEmployeesError(res.data.message);
      }
    } catch (err: any) {
      setEmployees([]);
      setEmployeesError(
        err?.response?.data?.message || err.message || "Lỗi tải danh sách nhân viên."
      );
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!department) return;
    setLoadingAuditLogs(true);
    try {
      const res = await departmentApi.getAuditLogsByEntity("DEPARTMENT", String(department.id));
      const data = res.data?.data;
      let logsList: any[] = [];
      if (data?.content && Array.isArray(data.content)) {
        logsList = data.content;
      } else if (Array.isArray(data)) {
        logsList = data;
      }
      setAuditLogs(logsList);

      // Resolve numeric userIds in audit logs to Email/Name
      logsList.forEach((logItem) => {
        const uId = String(logItem.userId || logItem.userEmail || "");
        if (uId && !uId.includes("@") && uId !== "null" && uId !== "undefined" && !userMap[uId]) {
          userApi
            .getUserById(uId)
            .then((uRes) => {
              if (uRes?.data?.data) {
                const u = uRes.data.data;
                setUserMap((prev) => ({
                  ...prev,
                  [uId]: { name: u.fullName || u.username, email: u.email },
                }));
              }
            })
            .catch(() => null);
        }
      });
    } catch {
      setAuditLogs([]);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  useEffect(() => {
    if (department && open) {
      // Resolve CreatedBy / UpdatedBy Users if ID
      const idsToFetch = [department.createdBy, department.updatedBy].filter(Boolean) as string[];
      idsToFetch.forEach((idStr) => {
        const id = String(idStr);
        if (id && !id.includes("@") && !userMap[id]) {
          userApi
            .getUserById(id)
            .then((res) => {
              if (res?.data?.data) {
                const u = res.data.data;
                setUserMap((prev) => ({
                  ...prev,
                  [id]: { name: u.fullName || u.username, email: u.email },
                }));
              }
            })
            .catch(() => null);
        }
      });

      fetchEmployees();
      fetchAuditLogs();
    }
  }, [department, open]);

  const formatUserDisplay = (userVal?: string | null, fallback = "Hệ thống") => {
    if (!userVal) return fallback;
    const str = String(userVal);
    if (str.includes("@")) return str;
    if (userMap[str]) {
      const u = userMap[str];
      return u.email ? `${u.name ? `${u.name} — ` : ""}${u.email}` : u.name || str;
    }
    return str;
  };

  const handleTransferSelectedEmployees = async () => {
    if (!targetDeptId) {
      if (onShowBanner) onShowBanner("Vui lòng chọn phòng ban đích để chuyển nhân viên!", true);
      return;
    }
    if (selectedEmpIds.length === 0) {
      if (onShowBanner) onShowBanner("Vui lòng chọn ít nhất 1 nhân viên!", true);
      return;
    }
    setTransferring(true);
    try {
      await departmentApi.transferEmployees(targetDeptId, selectedEmpIds);
      setEmployees((prev) => prev.filter((e) => !selectedEmpIds.includes(String(e.id || e.userId))));
      setSelectedEmpIds([]);
      setTargetDeptId("");
      if (onShowBanner) onShowBanner(`Đã chuyển ${selectedEmpIds.length} nhân viên sang phòng ban mới thành công!`);

      // Instantly refresh Employees & Audit Logs for this department
      fetchEmployees();
      fetchAuditLogs();

      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      if (onShowBanner)
        onShowBanner(
          err?.response?.data?.message || err.message || "Lỗi chuyển phòng ban nhân viên",
          true
        );
    } finally {
      setTransferring(false);
    }
  };

  const handleRemoveSelectedEmployees = async (specificEmpId?: string) => {
    const idsToRemove = specificEmpId ? [specificEmpId] : selectedEmpIds;
    if (idsToRemove.length === 0) {
      if (onShowBanner) onShowBanner("Vui lòng chọn ít nhất 1 nhân viên để gỡ khỏi phòng ban!", true);
      return;
    }
    setRemoving(true);
    try {
      await departmentApi.removeEmployeesFromDepartment(idsToRemove);
      setEmployees((prev) => prev.filter((e) => !idsToRemove.includes(getEmpId(e))));
      setSelectedEmpIds((prev) => prev.filter((id) => !idsToRemove.includes(id)));
      if (onShowBanner) onShowBanner(`Đã gỡ ${idsToRemove.length} nhân viên khỏi phòng ban thành công!`);

      fetchEmployees();
      fetchAuditLogs();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      if (onShowBanner)
        onShowBanner(
          err?.response?.data?.message || err.message || "Lỗi gỡ nhân viên khỏi phòng ban",
          true
        );
    } finally {
      setRemoving(false);
    }
  };

  const getEmpId = (emp: any) => String(emp.id || emp.userId);

  // Lọc động các loại HĐ xuất hiện trong database của phòng ban
  const availableEmploymentTypes = Array.from(
    new Set(
      employees
        .map((e) => e.employmentTypeEnum || e.employmentType)
        .filter(Boolean)
    )
  );

  const filteredEmployees = employees.filter((emp) => {
    const empType = emp.employmentTypeEnum || emp.employmentType || "FULL_TIME";
    if (filterEmploymentType !== "ALL" && empType !== filterEmploymentType) return false;
    return true;
  });

  const isEmpEmpty = employees.length === 0;

  if (!department) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="max-w-6xl w-[94vw] max-h-[94vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border border-border/40 shadow-2xl backdrop-blur-xs"
      >

        {/* FIXED HEADER */}
        <DialogHeader className="p-6 bg-linear-to-r from-primary/10 via-card to-card border-b border-border/40 shrink-0">
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

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditDept && onEditDept(department)}
                className="font-bold text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
              >
                <Edit2 className="h-4 w-4" /> Sửa Phòng ban
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={!isEmpEmpty}
                onClick={() => onDeleteDept && onDeleteDept(department.id)}
                className="font-bold text-xs gap-1.5 cursor-pointer"
                title={!isEmpEmpty ? "Chuyển toàn bộ nhân viên sang phòng ban khác trước khi xóa" : "Xóa phòng ban"}
              >
                <Trash2 className="h-4 w-4" /> Xóa
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 3 TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="px-6 border-b border-border/30 bg-muted/20 justify-start gap-4 rounded-none h-12">
            <TabsTrigger value="general" className="font-bold text-xs gap-1.5 cursor-pointer">
              <FileText className="h-3.5 w-3.5" /> Tab 1 — Thông tin chung
            </TabsTrigger>
            <TabsTrigger value="employees" className="font-bold text-xs gap-1.5 cursor-pointer">
              <Users className="h-3.5 w-3.5" /> Tab 2 — Nhân viên thuộc phòng ({employees.length})
            </TabsTrigger>
            <TabsTrigger value="audit" className="font-bold text-xs gap-1.5 cursor-pointer">
              <History className="h-3.5 w-3.5" /> Tab 3 — Audit Log
            </TabsTrigger>
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
                    <Label className="text-xs font-bold text-muted-foreground">ID Hệ thống (ID)</Label>
                    <div className="mt-1 font-mono font-bold text-sm text-foreground">{department.id}</div>
                  </div>
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
                    <Label className="text-xs font-bold text-muted-foreground">Số lượng Nhân viên</Label>
                    <div className="mt-1 font-bold text-sm text-primary">
                      {department.employeeCount ?? employees.length} Nhân sự
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground">Ngày khởi tạo</Label>
                    <div className="mt-1 font-mono text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {department.createdAt ? formatDateDisplay(department.createdAt) : "—"}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground">Cập nhật lần cuối</Label>
                    <div className="mt-1 font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {department.updatedAt ? formatDateDisplay(department.updatedAt) : "—"}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground">Người tạo (Created By)</Label>
                    <div className="mt-1 font-semibold text-foreground flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-primary" />
                      <span>{formatUserDisplay(department.createdBy, "Hệ thống")}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground">Người cập nhật (Updated By)</Label>
                    <div className="mt-1 font-semibold text-foreground flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-blue-500" />
                      <span>{formatUserDisplay(department.updatedBy, "Chưa cập nhật")}</span>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-bold text-muted-foreground">Mô tả chức năng & Nhiệm vụ</Label>
                    <div className="mt-1 text-foreground bg-muted/20 p-3 rounded-lg border">{department.description || "Chưa thiết lập mô tả chức năng."}</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: DANH SÁCH NHÂN VIÊN & CHUYỂN PHÒNG */}
            <TabsContent value="employees" className="mt-0 space-y-4">

              {/* Toolbar chuyển phòng */}
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
                      {allDepartments.filter(d => String(d.id) !== String(department.id)).map(d => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name} ({d.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleTransferSelectedEmployees}
                    disabled={selectedEmpIds.length === 0 || !targetDeptId || transferring}
                    className="font-bold text-xs gap-1.5 bg-primary text-primary-foreground cursor-pointer"
                  >
                    {transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                    {transferring ? "Đang chuyển..." : "Chuyển Phòng ban"}
                  </Button>
                  <Button
                    onClick={() => handleRemoveSelectedEmployees()}
                    disabled={selectedEmpIds.length === 0 || removing}
                    variant="outline"
                    className="font-bold text-xs gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10 cursor-pointer"
                  >
                    {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                    {removing ? "Đang gỡ..." : `Gỡ khỏi phòng (${selectedEmpIds.length})`}
                  </Button>
                </div>
              </div>

              {/* Filter loại hợp đồng - LẤY ĐỘNG TỪ DATABASE */}
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30 text-xs">
                <span className="font-bold text-muted-foreground flex items-center gap-1"><Filter className="h-3.5 w-3.5" /> Lọc nhanh:</span>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Loại HĐ:</span>
                  <Select value={filterEmploymentType} onValueChange={setFilterEmploymentType}>
                    <SelectTrigger className="h-8 text-xs w-44 bg-background font-semibold"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tất cả ({employees.length})</SelectItem>
                      {availableEmploymentTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type} ({employees.filter((e) => (e.employmentTypeEnum || e.employmentType) === type).length})
                        </SelectItem>
                      ))}
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
                            if (checked) setSelectedEmpIds(filteredEmployees.map(e => getEmpId(e)));
                            else setSelectedEmpIds([]);
                          }}
                        />
                      </th>
                      <th className="p-3">Mã NV</th>
                      <th className="p-3">Họ và tên</th>
                      <th className="p-3">Chức vụ (Position)</th>
                      <th className="p-3 text-center">Hình thức (Type)</th>
                      <th className="p-3 text-center">Trạng thái</th>
                      <th className="p-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 font-medium">
                    {loadingEmployees ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-xs">Đang tải danh sách nhân viên...</span>
                          </div>
                        </td>
                      </tr>
                    ) : employeesError ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-2 text-red-500">
                            <AlertCircle className="h-7 w-7 opacity-70" />
                            <p className="font-semibold text-sm">Lỗi tải nhân viên</p>
                            <p className="text-xs text-muted-foreground">{employeesError}</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground font-bold">
                          {employees.length === 0
                            ? "Phòng ban này chưa có nhân viên nào."
                            : "Không tìm thấy nhân viên phù hợp với bộ lọc."}
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const empIdStr = getEmpId(emp);
                        const isSelected = selectedEmpIds.includes(empIdStr);
                        return (
                          <tr key={empIdStr} className="hover:bg-muted/10 transition-colors">
                            <td className="p-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => {
                                  if (isSelected)
                                    setSelectedEmpIds(selectedEmpIds.filter((id) => id !== empIdStr));
                                  else
                                    setSelectedEmpIds([...selectedEmpIds, empIdStr]);
                                }}
                              />
                            </td>
                            <td className="p-3 font-mono font-bold text-primary">{emp.employeeCode || "—"}</td>
                            <td className="p-3 font-bold text-foreground">{emp.fullName || emp.userName || emp.userEmail || "—"}</td>
                            <td className="p-3">{emp.position || "Nhân viên"}</td>
                            <td className="p-3 text-center font-mono font-bold">
                              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                {emp.employmentTypeEnum || emp.employmentType || "FULL_TIME"}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                (emp.status || "ACTIVE") === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-red-500/10 text-red-600 border-red-500/20"
                              }`}>
                                {emp.status || "ACTIVE"}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={removing}
                                onClick={() => handleRemoveSelectedEmployees(empIdStr)}
                                className="h-7 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-500/10 rounded-lg gap-1 cursor-pointer"
                                title="Gỡ nhân viên khỏi phòng ban này"
                              >
                                <UserMinus className="h-3.5 w-3.5" /> Gỡ khỏi phòng
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB 3: AUDIT LOG */}
            <TabsContent value="audit" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Lịch sử Thay đổi & Audit Log Phòng ban
                </h4>
                {loadingAuditLogs && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </div>

              <div className="space-y-3">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log: any) => (
                    <div key={log.id} className="p-3.5 rounded-xl border border-border/40 bg-card flex items-start gap-3 text-xs shadow-2xs">
                      <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <Badge className="text-[10px] font-mono px-2 py-0">{log.action || "LOG"}</Badge>
                            <span>{log.userFullName || log.userEmail || formatUserDisplay(log.userId, "Hệ thống")}</span>
                          </div>
                          <span className="font-mono text-muted-foreground text-[11px]">
                            {log.occurredAt ? formatDateDisplay(log.occurredAt) : "—"}
                          </span>
                        </div>
                        {log.userEmail && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Thực hiện bởi: <strong className="text-foreground">{log.userEmail}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center border border-dashed border-border/50 rounded-2xl bg-muted/10">
                    <History className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="font-bold text-sm text-foreground">Không có dữ liệu audit log</p>
                    <p className="text-xs text-muted-foreground mt-1">Chưa có nhật ký ghi nhận lịch sử thay đổi nào cho phòng ban này.</p>
                  </div>
                )}
              </div>
            </TabsContent>

          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
