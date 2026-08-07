import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { salesApi, type PaymentTransaction } from "@/api/sales/salesApi";
import { StatusBadge } from "@/components/sales/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileCode2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

import { useToast } from "@/hooks/useToast";

export const SalesPaymentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success } = useToast();
  const [payment, setPayment] = useState<PaymentTransaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    salesApi.getPaymentById(id).then((res) => {
      setPayment(res);
      setLoading(false);
    });
  }, [id]);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "N/A";
    return new Date(isoStr).toLocaleString("vi-VN");
  };

  if (loading) {
    return <div className="p-12 text-center text-sm font-semibold">Đang tải giao dịch...</div>;
  }

  if (!payment) {
    return <div className="p-12 text-center text-sm font-semibold">Không tìm thấy giao dịch</div>;
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/sales/payments")}
          className="rounded-lg gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại danh sách thanh toán
        </Button>
      </div>

      <Card className="border border-border/40 shadow-xs rounded-xl p-6 bg-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-mono text-foreground">{payment.id}</h1>
              <StatusBadge status={payment.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Đơn hàng:{" "}
              <Link to={`/sales/orders/${payment.orderId}`} className="font-bold text-indigo-600 hover:underline">
                {payment.orderId}
              </Link>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {payment.isReconciled ? (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                Đã đối soát khớp ({formatDate(payment.reconciledAt)})
              </span>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  setPayment({ ...payment, isReconciled: true, reconciledAt: new Date().toISOString() });
                  success("Đã xác nhận đối soát giao dịch thủ công thành công!");
                }}
                className="bg-indigo-600 text-white text-xs font-semibold rounded-lg"
              >
                Xác nhận đối soát thủ công
              </Button>
            )}
          </div>
        </div>

        {/* Transaction Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 bg-muted/40 rounded-xl space-y-1">
            <span className="text-muted-foreground font-medium block">Số tiền giao dịch:</span>
            <span className="font-black text-lg text-indigo-600">{formatVND(payment.amount)}</span>
          </div>
          <div className="p-3.5 bg-muted/40 rounded-xl space-y-1">
            <span className="text-muted-foreground font-medium block">Phương thức:</span>
            <span className="font-bold text-sm text-foreground">{payment.paymentMethod}</span>
          </div>
          <div className="p-3.5 bg-muted/40 rounded-xl space-y-1">
            <span className="text-muted-foreground font-medium block">Mã tham chiếu hệ thống:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{payment.transactionRef}</span>
          </div>
          <div className="p-3.5 bg-muted/40 rounded-xl space-y-1">
            <span className="text-muted-foreground font-medium block">Mã tham chiếu cổng:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{payment.gatewayRef || "N/A"}</span>
          </div>
        </div>

        {/* Raw Webhook Payload Section */}
        <div className="space-y-3 pt-4 border-t border-border/40">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-indigo-600" />
            Raw Webhook Callback Log (Dành cho Dev / Support Debug)
          </h3>

          <div className="p-4 bg-slate-950 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto">
            <pre>
              {JSON.stringify(
                payment.rawWebhookPayload || {
                  status: payment.status,
                  transactionRef: payment.transactionRef,
                  gatewayRef: payment.gatewayRef,
                  amount: payment.amount,
                  timestamp: payment.createdAt,
                  note: "Initial webhook event log",
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
};
