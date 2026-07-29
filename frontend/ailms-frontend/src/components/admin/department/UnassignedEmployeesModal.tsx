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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Users,
  Building2,
  Loader2,
  AlertCircle,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { employeeApi } from "@/api/employees/employeeApi";
import { departmentApi, type DepartmentResponse } from "@/api/departments/departmentApi";

interface UnassignedEmployeesModalProps {
  open: boolean;
  onClose: () => void;
  allDepartments: DepartmentResponse[];
  onSuccess?: () => void;
  onShowBanner?: (msg: string, isError?: boolean) => void;
}

export const UnassignedEmployeesModal: React.FC<UnassignedEmployeesModalProps> = ({
  open,
  onClose,
  allDepartments = [],
  onSuccess,
  onShowBanner,
}) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search & Pagination States
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Selection & Bulk Action States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkTargetDeptId, setBulkTargetDeptId] = useState<string>("");
  const [submittingBulk, setSubmittingBulk] = useState(false);

  // Single Assign Popover States
  const [singleTargetDeptId, setSingleTargetDeptId] = useState<Record<string, string>>({});
  const [submittingSingle, setSubmittingSingle] = useState<string | null>(null);

  const fetchUnassignedEmployees = async () => {
    if (!open) return;
    setLoading(true);
    setError("");
    try {
      const res = await employeeApi.getEmployeesSearch({
        page,
        size: pageSize,
        unassignedOnly: true,
        keyword: keyword.trim() || undefined,
        sort: ["id:desc"],
      });

      if (res?.data?.success && res.data.data?.content) {
        setEmployees(res.data.data.content);
        setTotalPages(res.data.data.totalPages || 1);
        setTotalElements(res.data.data.totalElements || 0);
      } else {
        setEmployees([]);
        setTotalPages(1);
        setTotalElements(0);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Lỗi tải danh sách nhân viên chưa gán phòng ban.");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSelectedIds([]);
      setBulkTargetDeptId("");
      fetchUnassignedEmployees();
    }
  }, [open, page, pageSize]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setPage(0);
      fetchUnassignedEmployees();
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const getEmpId = (emp: any) => String(emp.id || emp.userId);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(employees.map((e) => getEmpId(e)));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkTargetDeptId) {
      if (onShowBanner) onShowBanner("Vui lòng chọn phòng ban đích!", true);
      return;
    }
    if (selectedIds.length === 0) {
      if (onShowBanner) onShowBanner("Vui lòng chọn ít nhất 1 nhân viên!", true);
      return;
    }
    setSubmittingBulk(true);
    try {
      await departmentApi.transferEmployees(bulkTargetDeptId, selectedIds);
      const deptObj = allDepartments.find((d) => String(d.id) === bulkTargetDeptId);
      const deptName = deptObj ? deptObj.name : "phòng ban mới";
      if (onShowBanner) onShowBanner(`Đã gán ${selectedIds.length} nhân viên vào phòng ban "${deptName}" thành công!`);
      setSelectedIds([]);
      setBulkTargetDeptId("");
      fetchUnassignedEmployees();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (onShowBanner) onShowBanner(err?.response?.data?.message || err.message || "Lỗi gán phòng ban", true);
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleSingleAssign = async (empId: string) => {
    const targetDeptId = singleTargetDeptId[empId];
    if (!targetDeptId) {
      if (onShowBanner) onShowBanner("Vui lòng chọn phòng ban đích!", true);
      return;
    }
    setSubmittingSingle(empId);
    try {
      await departmentApi.transferEmployees(targetDeptId, [empId]);
      const deptObj = allDepartments.find((d) => String(d.id) === targetDeptId);
      const deptName = deptObj ? deptObj.name : "phòng ban mới";
      if (onShowBanner) onShowBanner(`Đã gán nhân viên vào phòng ban "${deptName}" thành công!`);
      fetchUnassignedEmployees();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (onShowBanner) onShowBanner(err?.response?.data?.message || err.message || "Lỗi gán phòng ban", true);
    } finally {
      setSubmittingSingle(null);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="max-w-5xl w-[94vw] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border border-border/40 shadow-2xl backdrop-blur-xs"
      >
        {/* HEADER */}
        <DialogHeader className="p-6 bg-linear-to-r from-purple-500/10 via-card to-card border-b border-border/40 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/20 text-purple-600 font-black flex items-center justify-center border border-purple-500/30 shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <span>Danh sách Nhân viên Chưa Gán Phòng Ban</span>
                  <Badge className="bg-purple-500/10 text-purple-600 font-bold border-purple-500/20">
                    {totalElements} Nhân sự
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Danh sách nhân sự chưa được phân bổ vào bất kỳ phòng ban chức năng nào trong hệ thống.
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUnassignedEmployees}
              className="rounded-xl text-xs font-semibold gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Làm mới
            </Button>
          </div>
        </DialogHeader>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* BULK ASSIGN TOOLBAR */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserPlus className="h-5 w-5 text-purple-600 shrink-0" />
              <div>
                <div className="text-xs font-extrabold text-purple-700 uppercase">Gán phòng ban hàng loạt</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Đã chọn <strong className="text-purple-600 font-bold">{selectedIds.length}</strong> / {employees.length} nhân sự ở trang này
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Select value={bulkTargetDeptId} onValueChange={setBulkTargetDeptId}>
                <SelectTrigger className="h-9 w-56 text-xs bg-background border border-border/40 font-bold">
                  <SelectValue placeholder="Chọn phòng ban cần gán..." />
                </SelectTrigger>
                <SelectContent>
                  {allDepartments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleBulkAssign}
                disabled={selectedIds.length === 0 || !bulkTargetDeptId || submittingBulk}
                size="sm"
                className="font-bold text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl cursor-pointer"
              >
                {submittingBulk ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                {submittingBulk ? "Đang gán..." : `Gán phòng ban (${selectedIds.length})`}
              </Button>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo mã nhân viên, họ tên, email, vị trí..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9 text-xs h-9 rounded-xl"
              />
            </div>
          </div>

          {/* TABLE */}
          <div className="border border-border/40 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 font-bold border-b border-border/30 uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 w-8">
                    <Checkbox
                      checked={employees.length > 0 && selectedIds.length === employees.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-3">Mã NV</th>
                  <th className="p-3">Họ và tên</th>
                  <th className="p-3">Email / SĐT</th>
                  <th className="p-3">Chức vụ (Position)</th>
                  <th className="p-3 text-center">Hình thức HĐ</th>
                  <th className="p-3 text-center">Trạng thái</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                        <span className="text-xs">Đang tải danh sách nhân viên chưa gán...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <div className="flex flex-col items-center gap-2 text-red-500">
                        <AlertCircle className="h-7 w-7 opacity-70" />
                        <p className="font-semibold text-sm">Lỗi tải dữ liệu</p>
                        <p className="text-xs text-muted-foreground">{error}</p>
                      </div>
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground font-bold">
                      {keyword.trim()
                        ? "Không tìm thấy nhân viên chưa gán phù hợp với từ khóa."
                        : "Tất cả nhân viên đã được gán vào phòng ban trong hệ thống!"}
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => {
                    const empIdStr = getEmpId(emp);
                    const isSelected = selectedIds.includes(empIdStr);
                    const fullName = emp.fullName || emp.userEntity?.fullName || emp.userName || "—";
                    const email = emp.email || emp.userEntity?.email || "—";
                    const phone = emp.phone || emp.userEntity?.phoneNumber || "—";
                    const empCode = emp.employeeCode || "—";

                    return (
                      <tr key={empIdStr} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelect(empIdStr)}
                          />
                        </td>
                        <td className="p-3 font-mono font-extrabold text-purple-600">{empCode}</td>
                        <td className="p-3">
                          <div className="font-bold text-foreground">{fullName}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-foreground">{email}</div>
                          {phone !== "—" && <div className="text-[11px] text-muted-foreground font-mono">{phone}</div>}
                        </td>
                        <td className="p-3">{emp.position || "Nhân viên"}</td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[11px]">
                            {emp.employmentTypeEnum || emp.employmentType || "FULL_TIME"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              (emp.status || "ACTIVE") === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-red-500/10 text-red-600 border-red-500/20"
                            }`}
                          >
                            {emp.status || "ACTIVE"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Popover>
                            <PopoverTrigger>
                              render={
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs font-bold gap-1 border-purple-500/30 text-purple-600 hover:bg-purple-500/10 rounded-lg cursor-pointer"
                                  >
                                  <Building2 className="h-3.5 w-3.5" /> Gán phòng ban
                                </Button>
                              }
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3 space-y-3" align="end">
                              <div className="text-xs font-extrabold text-foreground">Chọn phòng ban cho NV:</div>
                              <Select
                                value={singleTargetDeptId[empIdStr] || ""}
                                onValueChange={(val) =>
                                  setSingleTargetDeptId((prev) => ({ ...prev, [empIdStr]: val }))
                                }
                              >
                                <SelectTrigger className="h-8 text-xs font-semibold">
                                  <SelectValue placeholder="Chọn phòng ban..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {allDepartments.map((d) => (
                                    <SelectItem key={d.id} value={String(d.id)}>
                                      {d.name} ({d.code})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                disabled={!singleTargetDeptId[empIdStr] || submittingSingle === empIdStr}
                                onClick={() => handleSingleAssign(empIdStr)}
                                className="w-full text-xs font-bold h-8 bg-purple-600 text-white rounded-lg cursor-pointer"
                              >
                                {submittingSingle === empIdStr ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  "Xác nhận gán"
                                )}
                              </Button>
                            </PopoverContent>
                          </Popover>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-muted-foreground font-medium">
                Trang <strong className="text-foreground">{page + 1}</strong> / {totalPages} (Tổng {totalElements} nhân sự)
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
