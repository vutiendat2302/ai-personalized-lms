import React, { useState, useEffect } from "react";
import { salesApi, type PaymentTransaction } from "@/api/sales/salesApi";
import { StatusBadge } from "@/components/sales/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Receipt,
  Search,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { Link } from "react-router-dom";

export const SalesPaymentListPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const data = await salesApi.getPayments();
      setPayments(data);
    } catch (err) {
      console.error("Error fetching payments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredPayments = payments.filter((p) => {
    if (methodFilter !== "ALL" && p.paymentMethod !== methodFilter) return false;
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchId = p.id.toLowerCase().includes(term);
      const matchRef = p.transactionRef.toLowerCase().includes(term);
      const matchOrder = p.orderId.toLowerCase().includes(term);
      if (!matchId && !matchRef && !matchOrder) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Danh sách Giao dịch Thanh toán</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi, tra cứu & đối soát các giao dịch cổng thanh toán VNPAY, MOMO, Chuyển khoản
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayments}
            disabled={loading}
            className="rounded-lg gap-2 cursor-pointer text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button size="sm" variant="outline" className="rounded-lg gap-2 text-xs font-semibold cursor-pointer">
            <Download className="h-3.5 w-3.5" />
            Xuất CSV Kế toán
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-4 rounded-xl border border-border/50 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo Mã GD / Mã tham chiếu / Mã đơn hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9 bg-card"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-9 text-xs bg-card border border-border/60 rounded-lg px-3 text-foreground font-medium"
          >
            <option value="ALL">Tất cả cổng thanh toán</option>
            <option value="VNPAY">VNPAY</option>
            <option value="PAYPAL">PAYPAL</option>
            <option value="BANK_TRANSFER">Chuyển khoản</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-xs bg-card border border-border/60 rounded-lg px-3 text-foreground font-medium"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="SUCCESS">Thành công</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="FAILED">Thất bại</option>
            <option value="REFUNDED">Hoàn tiền</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Card className="border border-border/40 shadow-xs rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-b border-border/50">
              <TableHead className="font-bold text-xs">Mã Giao Dịch</TableHead>
              <TableHead className="font-bold text-xs">Đơn hàng liên kết</TableHead>
              <TableHead className="font-bold text-xs">Phương thức</TableHead>
              <TableHead className="font-bold text-xs">Số tiền</TableHead>
              <TableHead className="font-bold text-xs">Trạng thái</TableHead>
              <TableHead className="font-bold text-xs">Đối soát (Reconciliation)</TableHead>
              <TableHead className="font-bold text-xs">Thời gian</TableHead>
              <TableHead className="font-bold text-xs text-right">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">Chưa có giao dịch thanh toán nào</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((p) => (
                <TableRow key={p.id} className="border-b border-border/30 hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                  <TableCell className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <Link to={`/sales/payments/${p.id}`} className="hover:underline">
                      {p.id}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium text-foreground">
                    <Link to={`/sales/orders/${p.orderId}`} className="hover:underline">
                      {p.orderId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-muted text-muted-foreground rounded">
                      {p.paymentMethod}
                    </span>
                  </TableCell>
                  <TableCell className="font-bold text-xs text-foreground">
                    {formatVND(p.amount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} size="sm" />
                  </TableCell>
                  <TableCell>
                    {p.isReconciled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                        Khớp (Matched)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full">
                        <AlertTriangle className="h-3 w-3" />
                        Chờ đối soát
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(p.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/sales/payments/${p.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg cursor-pointer">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-indigo-600" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
