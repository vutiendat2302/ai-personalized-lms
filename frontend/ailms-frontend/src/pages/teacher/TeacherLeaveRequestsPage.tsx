import React, { useState, useEffect } from "react";
import { teacherApi, type LeaveRequestRecord } from "@/api/teacher/teacherApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { CalendarOff, Plus } from "lucide-react";

export const TeacherLeaveRequestsPage: React.FC = () => {
  const { success, error } = useToast();
  const [requests, setRequests] = useState<LeaveRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    teacherApi.getLeaveRequests().then((res) => {
      setRequests(res);
      setLoading(false);
    });
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

  const handleCancelRequest = (req: LeaveRequestRecord) => {
    if (req.status === "PENDING") {
      alert("Đơn của bạn đã được gửi cho HR. Để hủy đơn PENDING này, hệ thống cần Admin/HR xác nhận.");
    } else {
      success("Đã hủy đơn xin nghỉ!");
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
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
                <label className="text-foreground font-semibold block mb-1">Từ ngày:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground"
                  required
                />
              </div>
              <div>
                <label className="text-foreground font-semibold block mb-1">Đến ngày:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-foreground font-semibold block mb-1">Lý do nghỉ / báo bận:</label>
              <textarea
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
                      onClick={() => handleCancelRequest(r)}
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
    </div>
  );
};
