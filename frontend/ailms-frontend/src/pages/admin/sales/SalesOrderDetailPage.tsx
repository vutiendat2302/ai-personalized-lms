import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { salesApi, type OrderDetail, type InternalNote } from "@/api/sales/salesApi";
import { StatusBadge } from "@/components/sales/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Send,
  FileDown,
  User,
  Phone,
  Mail,
  ExternalLink,
  MessageSquare,
  ShieldAlert,
  CreditCard,
  History,
  Copy,
  Check,
  Plus,
} from "lucide-react";

import { useToast } from "@/hooks/useToast";

export const SalesOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const fetchOrderDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await salesApi.getOrderById(id);
      setOrder(data);
    } catch (err) {
      error("Không thể tải thông tin đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !order) return;
    setAddingNote(true);
    try {
      const note = await salesApi.addInternalNote(order.id, newNoteContent);
      setOrder((prev) => (prev ? { ...prev, notes: [note, ...prev.notes] } : prev));
      setNewNoteContent("");
      success("Đã thêm ghi chú nội bộ mới!");
    } catch (err) {
      error("Lỗi khi thêm ghi chú nội bộ");
    } finally {
      setAddingNote(false);
    }
  };

  const copyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    success(`Đã sao chép ID đơn hàng: ${text}`);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "N/A";
    const d = new Date(isoStr);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm font-semibold">Đang tải chi tiết đơn hàng...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-lg font-bold text-foreground">Không tìm thấy đơn hàng</h3>
        <Button onClick={() => navigate("/sales/orders")} variant="outline" className="mt-4">
          Quay lại danh sách đơn
        </Button>
      </div>
    );
  }

  // Stepper timeline logic
  const isCancelled = order.status === "CANCELLED";
  const isRefunded = order.status === "REFUNDED";
  const isPaid = order.status === "PAID";
  const isPending = order.status === "PENDING";

  return (
    <div className="space-y-6 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/sales/orders")}
          className="rounded-lg gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại danh sách
        </Button>
      </div>

      {/* Main 70/30 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* 70% MAIN COLUMN (7 cols in 10-grid) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header Card */}
          <Card className="border border-border/40 shadow-xs rounded-xl p-5 bg-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-foreground font-mono">{order.snowflakeId}</h1>
                  <StatusBadge status={order.status} size="md" />
                  <button
                    onClick={() => copyId(order.id)}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-xs flex items-center gap-1"
                  >
                    {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span className="font-mono text-[11px]">{order.id}</span>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ngày tạo: <span className="font-semibold text-foreground">{formatDate(order.createdAt)}</span>
                </p>
              </div>

              {order.expiredAt && order.status === "PENDING" && (
                <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-2.5 rounded-lg text-xs">
                  <span className="text-amber-700 dark:text-amber-300 font-semibold block">Tự động hủy sau:</span>
                  <span className="font-mono font-bold text-amber-800 dark:text-amber-200">{formatDate(order.expiredAt)}</span>
                </div>
              )}
            </div>

            {/* Stepper Timeline Horizontal */}
            <div className="pt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Tiến trình đơn hàng (Status Timeline)
              </h4>
              <div className="flex items-center justify-between relative">
                {/* Step 1: Tạo đơn */}
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-bold text-foreground">Tạo đơn</span>
                </div>

                {/* Line 1 */}
                <div className={`flex-1 h-1 mx-2 rounded ${isPending || isPaid ? "bg-emerald-500" : "bg-muted"}`} />

                {/* Step 2: Chờ thanh toán */}
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                    isPending ? "bg-amber-500 text-white animate-pulse" : isPaid ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    <Clock className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-bold text-foreground">Chờ thanh toán</span>
                </div>

                {/* Line 2 */}
                <div className={`flex-1 h-1 mx-2 rounded ${isPaid ? "bg-emerald-500" : isCancelled || isRefunded ? "bg-rose-500" : "bg-muted"}`} />

                {/* Step 3: Đã thanh toán hoặc Hủy/Hoàn */}
                <div className="flex flex-col items-center gap-1.5 z-10">
                  {isCancelled ? (
                    <div className="h-8 w-8 rounded-full bg-slate-600 text-white flex items-center justify-center text-xs font-bold">
                      <XCircle className="h-4 w-4" />
                    </div>
                  ) : isRefunded ? (
                    <div className="h-8 w-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                      isPaid ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  )}
                  <span className="text-[11px] font-bold text-foreground">
                    {isCancelled ? "Đã hủy" : isRefunded ? "Đã hoàn tiền" : "Đã thanh toán"}
                  </span>
                </div>

                {/* Line 3 */}
                <div className={`flex-1 h-1 mx-2 rounded ${isPaid ? "bg-emerald-500" : "bg-muted"}`} />

                {/* Step 4: Kích hoạt */}
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                    isPaid ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-bold text-foreground">Kích hoạt gói</span>
                </div>
              </div>

              {(order.cancelReason || order.refundReason) && (
                <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300">
                  <span className="font-bold block mb-0.5">Lý do hủy/hoàn tiền:</span>
                  {order.cancelReason || order.refundReason}
                </div>
              )}
            </div>
          </Card>

          {/* Bảng OrderItem */}
          <Card className="border border-border/40 shadow-xs rounded-xl overflow-hidden bg-card">
            <div className="p-4 border-b border-border/40 bg-muted/30">
              <h3 className="font-bold text-sm text-foreground">Danh sách sản phẩm (OrderItems)</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/40">
                  <TableHead className="text-xs font-bold">Gói học / Khóa học</TableHead>
                  <TableHead className="text-xs font-bold">Loại sản phẩm</TableHead>
                  <TableHead className="text-xs font-bold">Giá snapshot</TableHead>
                  <TableHead className="text-xs font-bold">Giảm giá</TableHead>
                  <TableHead className="text-xs font-bold">Thành tiền</TableHead>
                  <TableHead className="text-xs font-bold text-right">Ghi danh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id} className="border-b border-border/30">
                    <TableCell>
                      <div>
                        <p className="font-bold text-xs text-foreground">{item.packageName}</p>
                        <p className="text-[11px] text-muted-foreground">{item.courseName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-muted text-muted-foreground rounded">
                        {item.itemType}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground line-through">
                      {formatVND(item.priceSnapshot)}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-emerald-600">
                      -{formatVND(item.discountSnapshot)}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {formatVND(item.finalPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.relatedEnrollmentId ? (
                        <Link
                          to={`/sales/enrollments/${item.relatedEnrollmentId}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                        >
                          Xem enrollment <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Chưa kích hoạt</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Bảng PaymentTransactions */}
          <Card className="border border-border/40 shadow-xs rounded-xl overflow-hidden bg-card">
            <div className="p-4 border-b border-border/40 bg-muted/30 flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-600" />
                Lịch sử giao dịch thanh toán (Payment Transactions)
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/40">
                  <TableHead className="text-xs font-bold">Phương thức</TableHead>
                  <TableHead className="text-xs font-bold">Mã tham chiếu</TableHead>
                  <TableHead className="text-xs font-bold">Số tiền</TableHead>
                  <TableHead className="text-xs font-bold">Trạng thái</TableHead>
                  <TableHead className="text-xs font-bold">Đối soát</TableHead>
                  <TableHead className="text-xs font-bold text-right">Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-20 text-center text-muted-foreground text-xs">
                      Chưa có giao dịch thanh toán nào được thực hiện
                    </TableCell>
                  </TableRow>
                ) : (
                  order.transactions.map((tx) => (
                    <TableRow key={tx.id} className="border-b border-border/30">
                      <TableCell className="font-bold text-xs text-foreground">
                        {tx.paymentMethod}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {tx.transactionRef}
                      </TableCell>
                      <TableCell className="font-bold text-xs">
                        {formatVND(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} size="sm" />
                      </TableCell>
                      <TableCell>
                        {tx.isReconciled ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                            Khớp
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                            Chờ đối soát
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right">
                        {formatDate(tx.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Internal Notes Section */}
          <Card className="border border-border/40 shadow-xs rounded-xl p-5 bg-card space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              Ghi chú nội bộ Sales / CSKH (Internal Notes)
            </h3>

            <form onSubmit={handleAddNote} className="flex items-center gap-2">
              <Input
                placeholder="Nhập ghi chú nội bộ (VD: Khách hẹn chuyển khoản chiều nay)..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="bg-card text-xs h-9"
              />
              <Button
                type="submit"
                disabled={addingNote || !newNoteContent.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-9 px-4 text-xs font-semibold shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Lưu ghi chú
              </Button>
            </form>

            <div className="space-y-2.5 pt-2">
              {order.notes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Chưa có ghi chú nội bộ nào.</p>
              ) : (
                order.notes.map((note) => (
                  <div key={note.id} className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-bold text-foreground">{note.authorName}</span>
                      <span>{formatDate(note.createdAt)}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* 30% SIDEBAR COLUMN (3 cols in 10-grid) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Student Profile Card */}
          <Card className="border border-border/40 shadow-xs rounded-xl p-5 bg-card space-y-4">
            <h3 className="font-bold text-sm text-foreground border-b border-border/40 pb-3">
              Thông tin học viên
            </h3>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base overflow-hidden shrink-0">
                {order.userAvatar ? (
                  <img src={order.userAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  order.userName.charAt(0)
                )}
              </div>
              <div className="truncate">
                <h4 className="font-bold text-sm text-foreground truncate">{order.userName}</h4>
                <span className="text-[10px] text-muted-foreground font-mono">ID: {order.userId}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate font-medium">{order.userEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium">{order.userPhone}</span>
              </div>
            </div>

            <Link to={`/admin/students`}>
              <Button variant="outline" size="sm" className="w-full rounded-lg text-xs font-semibold gap-1.5 cursor-pointer mt-2">
                <User className="h-3.5 w-3.5" />
                Xem hồ sơ User
              </Button>
            </Link>
          </Card>

          {/* Financial Breakdown Card */}
          <Card className="border border-border/40 shadow-xs rounded-xl p-5 bg-card space-y-3">
            <h3 className="font-bold text-sm text-foreground border-b border-border/40 pb-3">
              Tóm tắt tài chính
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Tổng tiền gốc:</span>
                <span className="font-semibold text-foreground">{formatVND(order.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-600">
                <span>Giảm giá (Coupon):</span>
                <span className="font-semibold">-{formatVND(order.discountAmount)}</span>
              </div>
              {order.couponCode && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Mã áp dụng:</span>
                  <Link to="/sales/coupons" className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono font-bold rounded">
                    {order.couponCode}
                  </Link>
                </div>
              )}
              <div className="border-t border-border/40 pt-3 flex items-center justify-between text-sm">
                <span className="font-bold text-foreground">Thành tiền:</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400 text-base">
                  {formatVND(order.finalAmount)}
                </span>
              </div>
            </div>
          </Card>

          {/* Smart Action Buttons according to Order Status */}
          <Card className="border border-border/40 shadow-xs rounded-xl p-5 bg-card space-y-3">
            <h3 className="font-bold text-sm text-foreground border-b border-border/40 pb-3">
              Hành động nghiệp vụ (Smart Actions)
            </h3>

            {isPending && (
              <div className="space-y-2">
                <Button
                  onClick={async () => {
                    await salesApi.cancelOrder(order.id, "Admin hủy đơn trực tiếp");
                    success("Đã hủy đơn hàng thành công!");
                    fetchOrderDetail();
                  }}
                  variant="destructive"
                  className="w-full text-xs font-semibold gap-2 rounded-lg cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Hủy đơn hàng
                </Button>
                <Button
                  onClick={() => success("Đã gia hạn thời gian chờ thanh toán thêm 24 giờ!")}
                  variant="outline"
                  className="w-full text-xs font-semibold gap-2 rounded-lg cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Gia hạn thời gian chờ
                </Button>
              </div>
            )}

            {isPaid && (
              <div className="space-y-2">
                <Button
                  onClick={async () => {
                    const reason = prompt("Nhập lý do hoàn tiền:") || "Học viên yêu cầu hoàn tiền";
                    await salesApi.refundOrder(order.id, reason);
                    success("Đã thực hiện hoàn tiền thành công!");
                    fetchOrderDetail();
                  }}
                  variant="outline"
                  className="w-full text-xs font-semibold gap-2 rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Hoàn tiền (Refund)
                </Button>
                <Button
                  onClick={() => success("Đã khởi tạo và tải hóa đơn PDF thành công!")}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-2 rounded-lg cursor-pointer shadow-sm"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Xuất hóa đơn PDF
                </Button>
              </div>
            )}

            {(isCancelled || isRefunded) && (
              <Button
                onClick={() => success("Đã khởi tạo đơn hàng mới tương tự trong hệ thống!")}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-2 rounded-lg cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Tạo đơn mới tương tự
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
