import React, { useState, useEffect } from "react";
import {
  teacherApi,
  type LeaveRequestRecord,
  type TeacherClassCard,
  type TeacherWorkRequest,
} from "@/api/teacher/teacherApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { CalendarOff, Plus } from "lucide-react";

export const TeacherLeaveRequestsPage: React.FC = () => {
  const { success, error } = useToast();
  const [requests, setRequests] = useState<LeaveRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequestRecord | null>(null);
  const [classes, setClasses] = useState<TeacherClassCard[]>([]);
  const [workRequests, setWorkRequests] = useState<TeacherWorkRequest[]>([]);
  const [withdrawalClassId, setWithdrawalClassId] = useState("");
  const [withdrawalReason, setWithdrawalReason] = useState("");
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    Promise.all([teacherApi.getLeaveRequests(), teacherApi.getClasses(), teacherApi.getWorkRequests()])
      .then(([leaveRows, classRows, workRows]) => {
        setRequests(leaveRows);
        setClasses(classRows);
        setWorkRequests(workRows.filter((item) => item.type === "CLASS_TEACHER_LEAVE_REQUEST"));
      })
      .catch((cause: any) => error(cause?.response?.data?.message || "Không tải được dữ liệu yêu cầu."))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      error("Vui lòng điền đầy đủ ngày bắt đầu, ngày kết thúc & lý do xin nghỉ!");
      return;
    }

    const created = await teacherApi.createLeaveRequest({ startDate, endDate, reason });
    setRequests((prev) => [created, ...prev]);
    success("Đã tạo đơn xin nghỉ / báo bận thành công (đang chờ HR duyệt)!");
    setShowForm(false);
    setStartDate("");
    setEndDate("");
    setReason("");
  };

  /** Hủy đơn nghỉ qua API và giữ bản ghi trạng thái CANCELLED trong lịch sử. */
  const handleCancelRequest = async () => {
    if (!cancelTarget) return;
    try {
      await teacherApi.cancelLeaveRequest(cancelTarget.id);
      setRequests((prev) => prev.map((item) => item.id === cancelTarget.id
        ? { ...item, status: item.status === "APPROVED" ? "PENDING" : "CANCELLED" }
        : item));
      success(cancelTarget.status === "APPROVED"
        ? "Đã gửi yêu cầu hủy đơn đã duyệt tới HR."
        : "Đã hủy đơn nghỉ.");
      setCancelTarget(null);
    } catch (cause: any) {
      error(cause?.response?.data?.message || "Không thể hủy đơn nghỉ.");
    }
  };

  /** Gửi yêu cầu rời lớp và để backend kiểm tra tỷ lệ buổi đã dạy. */
  const handleClassWithdrawal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!withdrawalClassId || !withdrawalReason.trim()) {
      error("Vui lòng chọn lớp và nhập lý do xin nghỉ lớp.");
      return;
    }
    setSubmittingWithdrawal(true);
    try {
      const created = await teacherApi.createClassWithdrawalRequest(withdrawalClassId, withdrawalReason.trim());
      setWorkRequests((prev) => [created, ...prev]);
      setWithdrawalClassId("");
      setWithdrawalReason("");
      success("Đã gửi yêu cầu xin nghỉ lớp tới HR/Admin.");
    } catch (cause: any) {
      error(cause?.response?.data?.message || "Không thể gửi yêu cầu xin nghỉ lớp.");
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải danh sách đơn nghỉ / báo bận...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarOff className="h-6 w-6 text-primary" />
            Đơn nghỉ / Báo bận (Leave Requests & Availability)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Gửi đơn nghỉ hoặc báo bận lịch rảnh để hệ thống tạm ngừng phân công lớp học mới.
          </p>
        </div>

        <Button
          onClick={() => setShowForm(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="h-4 w-4" />
          Tạo Đơn nghỉ / Báo bận
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">
            Tạo Đơn nghỉ / Báo bận mới
          </h3>
          <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground font-semibold block mb-1">Từ ngày:</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground"
                  required
                />
              </div>
              <div>
                <Label className="text-foreground font-semibold block mb-1">Đến ngày:</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-foreground font-semibold block mb-1">Lý do nghỉ / báo bận:</Label>
              <Textarea
                rows={3}
                placeholder="Nhập lý do chi tiết..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground"
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="text-xs border-border text-foreground cursor-pointer"
              >
                Hủy
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold cursor-pointer">
                Gửi đơn duyệt
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-foreground">Xin nghỉ phụ trách lớp</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Chỉ được gửi khi số buổi đã hoàn thành dưới 30%. Lớp và lịch vẫn giữ nguyên cho tới khi HR/Admin duyệt.
          </p>
        </div>
        <form onSubmit={handleClassWithdrawal} className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_2fr_auto] md:items-end">
          <div className="space-y-1.5">
            <Label>Lớp đang phụ trách</Label>
            <Select value={withdrawalClassId} onValueChange={setWithdrawalClassId}>
              <SelectTrigger><SelectValue placeholder="Chọn lớp" /></SelectTrigger>
              <SelectContent>
                {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.className}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Lý do</Label>
            <Textarea value={withdrawalReason} onChange={(event) => setWithdrawalReason(event.target.value)}
              placeholder="Nêu rõ lý do để HR/Admin xử lý" rows={2} />
          </div>
          <Button type="submit" disabled={submittingWithdrawal || classes.length === 0}>
            {submittingWithdrawal ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        </form>
        {classes.length === 0 && <p className="text-xs text-muted-foreground">Bạn chưa có lớp đang phụ trách.</p>}
        {workRequests.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            {workRequests.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-xs">
                <span>Lớp #{item.targetId}: {item.reason}</span>
                <span className="font-semibold">{item.status}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* History Table */}
      <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-foreground">Lịch sử đơn nghỉ đã gửi</h3>

        <div className="overflow-x-auto rounded-xl border border-border/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/40 text-muted-foreground font-bold uppercase text-[11px]">
                <th className="p-3">Khoảng thời gian</th>
                <th className="p-3">Lý do</th>
                <th className="p-3">Ngày gửi đơn</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-border/40 hover:bg-muted/40">
                  <td className="p-3 font-bold text-foreground font-mono">{r.startDate} → {r.endDate}</td>
                  <td className="p-3 text-foreground">{r.reason}</td>
                  <td className="p-3 text-muted-foreground font-mono">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                        r.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          : r.status === "PENDING"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCancelTarget(r)}
                      disabled={r.status === "CANCELLED" || r.status === "REJECTED"}
                      className="text-[11px] border-border text-muted-foreground hover:text-foreground h-7 px-2.5 cursor-pointer"
                    >
                      Hủy đơn
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Hủy đơn nghỉ?"
        description={cancelTarget?.status === "APPROVED"
          ? "Đơn đã được duyệt nên thao tác này sẽ gửi lại yêu cầu hủy cho HR."
          : "Đơn chờ duyệt sẽ được chuyển sang trạng thái đã hủy."}
        confirmText="Xác nhận hủy"
        variant="warning"
        onConfirm={handleCancelRequest}
      />
    </div>
  );
};
