import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Gift, Percent, ShoppingCart, Tag } from "lucide-react";
import { studentApi, type StudentVoucher } from "@/api/student/studentApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentPageSkeleton } from "@/components/student/StudentPageSkeleton";

type VoucherFilter = "ALL" | "USABLE" | "UNAVAILABLE";

/** Hiển thị đúng các voucher đã được backend cấp cho học viên. */
export const StudentVouchersPage: React.FC = () => {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<StudentVoucher[]>([]);
  const [filter, setFilter] = useState<VoucherFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /** Tải lại ví voucher theo JWT để nhận voucher mới được quản trị viên cấp. */
  const refreshVouchers = useCallback(async () => {
    try {
      setVouchers(await studentApi.getVouchers());
      setError("");
    } catch {
      setError("Không thể tải voucher của bạn.");
    } finally {
      setLoading(false);
    }
  }, []);

  /** Tự đồng bộ khi tab đang mở và tải lại ngay khi học viên quay lại trang. */
  useEffect(() => {
    const load = () => { void refreshVouchers(); };
    queueMicrotask(load);
    const intervalId = window.setInterval(load, 15000);
    window.addEventListener("focus", load);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", load);
    };
  }, [refreshVouchers]);

  const visibleVouchers = useMemo(() => vouchers.filter((voucher) => filter === "ALL"
    || (filter === "USABLE" ? voucher.usable : !voucher.usable)), [filter, vouchers]);

  /** Định dạng giá trị giảm đúng theo loại coupon backend. */
  const discountLabel = (voucher: StudentVoucher) => voucher.discountType === "PERCENT"
    ? `${voucher.discountValue}%`
    : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(voucher.discountValue);

  /** Định dạng thời hạn voucher hoặc trạng thái không giới hạn. */
  const formatExpiry = (value?: string) => value
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Không giới hạn";

  if (loading) return <StudentPageSkeleton cards={4} columns={2} />;
  if (error) return <Card className="p-10 text-center text-sm text-destructive">{error}</Card>;

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <Gift className="h-6 w-6 text-primary" /> Voucher của tôi
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Chọn voucher đã được cấp và sử dụng khi thanh toán. Hệ thống không có chức năng lưu voucher hoặc gợi ý AI.
        </p>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as VoucherFilter)}>
        <TabsList>
          <TabsTrigger value="ALL">Tất cả ({vouchers.length})</TabsTrigger>
          <TabsTrigger value="USABLE">Có thể dùng ({vouchers.filter((item) => item.usable).length})</TabsTrigger>
          <TabsTrigger value="UNAVAILABLE">Không khả dụng ({vouchers.filter((item) => !item.usable).length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {visibleVouchers.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <Tag className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <h2 className="font-bold text-foreground">Không có voucher phù hợp</h2>
          <p className="mt-1 text-sm text-muted-foreground">Voucher được cấp cho tài khoản sẽ xuất hiện tại đây.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {visibleVouchers.map((voucher) => (
            <Card key={voucher.id} className={`overflow-hidden border-border/60 ${voucher.usable ? "hover:border-primary/40 hover:shadow-lg" : "opacity-75"}`}>
              <div className="flex">
                <div className="flex w-28 shrink-0 flex-col items-center justify-center gap-2 bg-primary p-4 text-center text-primary-foreground">
                  {voucher.discountType === "PERCENT" ? <Percent className="h-6 w-6" /> : <Tag className="h-6 w-6" />}
                  <strong className="text-xl leading-none">{discountLabel(voucher)}</strong>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Giảm giá</span>
                </div>
                <CardContent className="min-w-0 flex-1 space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-base font-black tracking-wide text-primary">{voucher.code}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {voucher.applicableCourseNames?.length ? `Áp dụng cho ${voucher.applicableCourseNames.join(", ")}` : voucher.applicableCourseName ? `Áp dụng cho ${voucher.applicableCourseName}` : "Áp dụng cho các gói học đủ điều kiện"}
                      </p>
                    </div>
                    <Badge variant={voucher.usable ? "default" : "secondary"}>{voucher.status}</Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClock className="h-4 w-4 text-primary" /> Hạn dùng: {formatExpiry(voucher.validTo)}
                  </div>
                  {!voucher.usable && voucher.unavailableReason && (
                    <p className="rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">{voucher.unavailableReason}</p>
                  )}

                  <Button className="w-full gap-2" disabled={!voucher.usable}
                    onClick={() => navigate("/student/cart", { state: { couponCode: voucher.code } })}>
                    <ShoppingCart className="h-4 w-4" /> Dùng trong giỏ hàng
                  </Button>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
