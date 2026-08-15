import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock3, LoaderCircle, XCircle } from "lucide-react";
import { orderApi, type OrderStatusResponse } from "@/api/orders/orderApi";
import { studentApi, type StudentOneOnOneRequest } from "@/api/student/studentApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const MAX_POLLS = 60;

/** Hiển thị trạng thái đơn hàng do backend capture và xác nhận sau redirect PayPal. */
export const PaymentResultPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<OrderStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [matchingRequest, setMatchingRequest] = useState<StudentOneOnOneRequest | null>(null);
  // PayPal giữ token gateway; orderId chỉ khôi phục ngữ cảnh và vẫn được backend kiểm tra ownership.
  const orderId = sessionStorage.getItem("ailms_pending_order_id") || searchParams.get("orderId");
  const courseId = sessionStorage.getItem("ailms_pending_course_id");

  useEffect(() => {
    if (!orderId) {
      setErrorMessage("Không tìm thấy đơn hàng cần kiểm tra.");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    /** Capture chỉ khi PayPal redirect về; backend dùng PayPal order đã lưu, không tin token query. */
    const captureIfApproved = async (): Promise<OrderStatusResponse | null | false> => {
      if (searchParams.get("cancelled") === "1") {
        setErrorMessage("Bạn đã hủy thanh toán PayPal.");
        return false;
      }
      if (!searchParams.get("token")) return null;
      return orderApi.capturePaypalPayment(orderId);
    };

    /** Hỏi backend về kết quả capture PayPal, không sử dụng query redirect để cấp quyền học. */
    const pollStatus = async () => {
      try {
        const captured = attempts === 0 ? await captureIfApproved() : null;
        if (captured === false) return;
        // Capture response đã chứa trạng thái authoritative nên không gọi GET dư ngay sau redirect.
        const result = captured || await orderApi.getOrderStatus(orderId);
        if (cancelled) return;
        setStatus(result);
        const completed = result.orderStatus === "PAID"
          || result.orderStatus === "CANCELLED"
          || result.orderStatus === "EXPIRED"
          || result.orderStatus === "REFUNDED"
          || result.paymentStatus === "FAILED";
        if (result.orderStatus === "PAID") {
          sessionStorage.removeItem("ailms_pending_order_id");
          const requests = await studentApi.getOneOnOneRequests();
          setMatchingRequest(requests.find((request) => request.orderId === orderId && request.status !== "CANCELLED") || null);
        }
        if (!completed && attempts < MAX_POLLS) {
          attempts += 1;
          timer = setTimeout(() => void pollStatus(), 2000);
        } else if (!completed) {
          setTimedOut(true);
        }
      } catch {
        if (!cancelled) setErrorMessage("Không thể kiểm tra trạng thái đơn hàng. Vui lòng thử lại.");
      }
    };

    void pollStatus();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, searchParams]);

  /** Điều hướng về khóa học liên quan sau khi kiểm tra thanh toán. */
  const goToCourse = () => navigate(courseId ? `/courses/${courseId}` : "/student/orders");

  const paid = status?.orderStatus === "PAID";
  const failed = Boolean(errorMessage) || timedOut || status?.paymentStatus === "FAILED"
    || ["CANCELLED", "EXPIRED"].includes(status?.orderStatus || "");

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-muted/20 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-5 p-8 text-center">
          {paid ? (
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          ) : failed ? (
            <XCircle className="mx-auto h-14 w-14 text-destructive" />
          ) : status ? (
            <Clock3 className="mx-auto h-14 w-14 text-amber-600" />
          ) : (
            <LoaderCircle className="mx-auto h-14 w-14 animate-spin text-primary" />
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {paid ? "Thanh toán thành công" : failed ? "Thanh toán chưa thành công" : "Đang xác nhận thanh toán..."}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {paid
                ? "Quyền học đã được backend kích hoạt sau khi PayPal capture thành công."
                : errorMessage || (timedOut
                  ? "Đã hết thời gian chờ xác nhận. Bạn có thể kiểm tra lại trong lịch sử đơn hàng."
                  : "Trang này tự kiểm tra trạng thái server; bạn không cần tải lại trang.")}
            </p>
          </div>
          {orderId && <p className="text-xs text-muted-foreground">Mã đơn hàng: {orderId}</p>}
          {paid && matchingRequest && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <p className="font-semibold">Gói 1-1 đang được xử lý</p>
              <p className="mt-1">{matchingRequest.status === "WAITING_INSTRUCTOR" || matchingRequest.status === "REMATCHING" ? "Hệ thống đang tìm người dạy phù hợp với nhu cầu bạn đã gửi." : "Yêu cầu 1-1 đã được tiếp nhận và đang cập nhật lịch học."}</p>
              <Button variant="link" className="mt-1 h-auto p-0" onClick={() => navigate("/student/schedule")}>Theo dõi trạng thái matching</Button>
            </div>
          )}
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => navigate("/student/orders")}>Xem đơn hàng</Button>
            <Button onClick={goToCourse}>{paid ? "Vào khóa học" : "Quay lại khóa học"}</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};
