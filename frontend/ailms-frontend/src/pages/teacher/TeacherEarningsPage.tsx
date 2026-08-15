import React, { useState, useEffect } from "react";
import { teacherApi, type SessionPaymentRecord } from "@/api/teacher/teacherApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TeacherEarningsPage: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<SessionPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    teacherApi.getEarnings().then((res) => {
      setRecords(res); setLoadError("");
    }).catch(() => {
      setRecords([]); setLoadError("Không thể tải hoặc đối soát thu nhập buổi dạy.");
    }).finally(() => { setLoading(false); });
  }, []);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const totalConfirmed = records
    .filter((r) => r.status === "CONFIRMED")
    .reduce((acc, r) => acc + r.totalAmount, 0);

  const totalPaid = records
    .filter((r) => r.status === "PAID")
    .reduce((acc, r) => acc + r.totalAmount, 0);

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải lịch sử thù lao buổi dạy...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          Thu nhập & Buổi dạy (Teaching Session Payments)
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Theo dõi minh bạch trạng thái thù lao theo từng buổi dạy (Draft → Pending → Confirmed → Paid).
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/40 p-4 shadow-xs">
          <span className="text-xs text-muted-foreground font-semibold">Thù lao Tạm tính (CONFIRMED)</span>
          <p className="text-2xl font-black text-primary mt-1">{formatVND(totalConfirmed)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Sẽ chi trả vào kỳ lương tiếp theo</p>
        </Card>

        <Card className="bg-card border-border/40 p-4 shadow-xs">
          <span className="text-xs text-muted-foreground font-semibold">Đã thanh toán (PAID)</span>
          <p className="text-2xl font-black text-foreground mt-1">{formatVND(totalPaid)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Đã giải ngân qua tài khoản ngân hàng</p>
        </Card>

        <Card className="bg-card border-border/40 p-4 shadow-xs">
          <span className="text-xs text-muted-foreground font-semibold">Buổi dạy chờ HR duyệt (PENDING)</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {records.filter((r) => r.status === "PENDING").length} buổi
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Đã nhận xét, đang chờ HR/Admin xác nhận</p>
        </Card>
      </div>

      {/* Session Payments History Table */}
      <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-foreground">Lịch sử thù lao buổi dạy (teaching_session_payment)</h3>

        <div className="overflow-x-auto rounded-xl border border-border/40">
          {loadError && <p className="p-4 text-sm text-destructive">{loadError}</p>}
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/40 text-muted-foreground font-bold uppercase text-[11px]">
                <th className="p-3">Buổi dạy / Lớp</th>
                <th className="p-3">Ngày dạy</th>
                <th className="p-3">Thời lượng</th>
                <th className="p-3">Đơn giá / giờ</th>
                <th className="p-3">Thành tiền</th>
                <th className="p-3">Quy trình Trạng thái</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-border/40 hover:bg-muted/40">
                  <td className="p-3 font-bold text-foreground">{r.className}</td>
                  <td className="p-3 text-muted-foreground font-mono">{r.date}</td>
                  <td className="p-3 font-mono text-foreground">{r.durationHours} giờ</td>
                  <td className="p-3 font-mono text-muted-foreground">{formatVND(r.hourlyRate)}</td>
                  <td className="p-3 font-mono text-primary font-bold">{formatVND(r.totalAmount)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                      <span className={r.status === "DRAFT" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>Draft</span>
                      <span>→</span>
                      <span className={r.status === "PENDING" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>Pending</span>
                      <span>→</span>
                      <span className={r.status === "CONFIRMED" ? "text-primary" : "text-muted-foreground"}>Confirmed</span>
                      <span>→</span>
                      <span className={r.status === "PAID" ? "text-primary font-extrabold" : "text-muted-foreground"}>Paid</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    {r.status === "DRAFT" ? (
                      <Button
                        size="sm"
                        onClick={() => navigate("/teacher/schedule")}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg h-7 px-2.5 cursor-pointer"
                      >
                        Nhận xét ngay
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground font-semibold">Đã hoàn thành</span>
                    )}
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
