import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  ArrowUpRight,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  PieChart,
  Eye,
  X
} from "lucide-react";

export interface TransactionRecord {
  id: string;
  orderCode: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  categoryName: string;
  amount: number;
  paymentMethod: "VNPAY" | "MOMO" | "BANK_TRANSFER" | "CREDIT_CARD";
  status: "COMPLETED" | "REFUNDED" | "PENDING";
  paidAt: string;
}

const getPageNumbers = (currentPage: number, total: number) => {
  const pages: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 0; i < total; i++) pages.push(i);
  } else {
    pages.push(0);
    if (currentPage > 2) {
      pages.push("...");
    }
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(total - 2, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < total - 3) {
      pages.push("...");
    }
    pages.push(total - 1);
  }
  return pages;
};

export const RevenueManagement: React.FC = () => {
  const [transactions] = useState<TransactionRecord[]>([
    {
      id: "tx-1001",
      orderCode: "ORD-2026-88F101",
      studentName: "Nguyễn Văn An",
      studentEmail: "an.nv@gmail.com",
      courseName: "Lập trình ReactJS & NextJS Chuyên Sâu",
      categoryName: "Lập trình Web & Frontend",
      amount: 1490000,
      paymentMethod: "VNPAY",
      status: "COMPLETED",
      paidAt: "2026-07-26 09:15:22",
    },
    {
      id: "tx-1002",
      orderCode: "ORD-2026-77B202",
      studentName: "Trần Thị Huệ",
      studentEmail: "hue.tt@outlook.com",
      courseName: "Trí Tuệ Nhân Tạo & LLM Production",
      categoryName: "AI & Machine Learning",
      amount: 2990000,
      paymentMethod: "MOMO",
      status: "COMPLETED",
      paidAt: "2026-07-25 14:40:10",
    },
    {
      id: "tx-1003",
      orderCode: "ORD-2026-66C303",
      studentName: "Phạm Quốc Hùng",
      studentEmail: "hung.pq@yahoo.com",
      courseName: "Frontend Realtime WebSockets & WebRTC",
      categoryName: "Lập trình Web & Frontend",
      amount: 1290000,
      paymentMethod: "BANK_TRANSFER",
      status: "COMPLETED",
      paidAt: "2026-07-24 18:02:45",
    },
    {
      id: "tx-1004",
      orderCode: "ORD-2026-55D404",
      studentName: "Lê Hoàng Yến",
      studentEmail: "yen.lh@ailms.edu.vn",
      courseName: "Khoa học Dữ liệu & Python Data Analysis",
      categoryName: "Data Science",
      amount: 1890000,
      paymentMethod: "VNPAY",
      status: "REFUNDED",
      paidAt: "2026-07-22 11:20:00",
    },
    {
      id: "tx-1005",
      orderCode: "ORD-2026-44E505",
      studentName: "Đỗ Minh Tuấn",
      studentEmail: "tuan.dm@gmail.com",
      courseName: "Thiết kế UI/UX Product Design Systems",
      categoryName: "UI/UX Design",
      amount: 990000,
      paymentMethod: "MOMO",
      status: "COMPLETED",
      paidAt: "2026-07-20 16:55:12",
    },
  ]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [timeRange, setTimeRange] = useState("THIS_MONTH");

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  // Detail Modal
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.courseName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMethod =
      methodFilter === "ALL" ? true : tx.paymentMethod === methodFilter;

    const matchesStatus =
      statusFilter === "ALL" ? true : tx.status === statusFilter;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const totalElements = filteredTransactions.length;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedTransactions = filteredTransactions.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  // Financial Computations
  const totalCompletedRevenue = transactions
    .filter((tx) => tx.status === "COMPLETED")
    .reduce((acc, cur) => acc + cur.amount, 0);

  const totalRefundedAmount = transactions
    .filter((tx) => tx.status === "REFUNDED")
    .reduce((acc, cur) => acc + cur.amount, 0);

  const completedTxCount = transactions.filter((tx) => tx.status === "COMPLETED").length;
  const avgOrderValue = completedTxCount > 0 ? totalCompletedRevenue / completedTxCount : 0;
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const showBanner = (text: string, isError = false) => {
    setActionMessage({ text, isError });
    setTimeout(() => setActionMessage(null), 4000);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-600" />
            <span>Quản Lý Doanh Thu & Báo Cáo Tài Chính (Revenue Analytics)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Thống kê dòng tiền giao dịch khóa học, cổng thanh toán VNPay/Momo và lịch sử hoàn tiền (Refund).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(val) => setTimeRange(val || "THIS_MONTH")}>
            <SelectTrigger className="h-9 text-xs font-semibold bg-background border border-border rounded-xl">
              <SelectValue placeholder="Chọn khoảng thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAY">Hôm nay</SelectItem>
              <SelectItem value="THIS_WEEK">Tuần này</SelectItem>
              <SelectItem value="THIS_MONTH">Tháng này (07/2026)</SelectItem>
              <SelectItem value="THIS_QUARTER">Quý này (Q3/2026)</SelectItem>
              <SelectItem value="THIS_YEAR">Năm 2026</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => showBanner("Đang xuất file báo cáo doanh thu Excel / CSV...")}
            variant="outline"
            className="rounded-xl font-bold text-xs gap-1 h-9"
          >
            <Download className="h-3.5 w-3.5" /> Xuất Báo Cáo Excel
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Tổng Doanh Thu Thực Nhận
            </p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {totalCompletedRevenue.toLocaleString()} đ
            </p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1">
              <ArrowUpRight className="h-3 w-3" /> +18.5% so với tháng trước
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-600">
            <DollarSign className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Giá Trị Trung Bình / Đơn
            </p>
            <p className="text-2xl font-extrabold text-foreground mt-1">
              {Math.round(avgOrderValue).toLocaleString()} đ
            </p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold mt-1">
              Dựa trên {completedTxCount} đơn hoàn tất
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Tỷ Lệ Chuyển Đổi Thanh Toán
            </p>
            <p className="text-2xl font-extrabold text-foreground mt-1">94.2%</p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1">
              <ArrowUpRight className="h-3 w-3" /> +2.1% tăng trưởng
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600">
            <TrendingUp className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-4 border border-rose-500/30 bg-rose-500/5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Tổng Tiền Hoàn (Refund)
            </p>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              -{totalRefundedAmount.toLocaleString()} đ
            </p>
            <div className="flex items-center gap-1 text-[10px] text-rose-600 font-semibold mt-1">
              {transactions.filter((tx) => tx.status === "REFUNDED").length} yêu cầu hoàn tiền
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Breakdown by Payment Method & Category */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="md:col-span-6 p-5 border border-border/80 bg-card rounded-2xl space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Tỷ Tỷ Lệ Cổng Thanh Toán (Payment Methods)
            </h3>
            <span className="text-[10px] font-bold text-muted-foreground">Cập nhật tự động</span>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-foreground">Cổng VNPay (QR / Thẻ ATM)</span>
                <span className="text-primary font-extrabold">58% (3.380.000 đ)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: "58%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-foreground">Ví MoMo</span>
                <span className="text-indigo-600 font-extrabold">27% (1.570.000 đ)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: "27%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-foreground">Chuyển Khoản Ngân Hàng (Bank Transfer)</span>
                <span className="text-emerald-600 font-extrabold">15% (870.000 đ)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "15%" }}></div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-6 p-5 border border-border/80 bg-card rounded-2xl space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
              <PieChart className="h-4 w-4 text-emerald-600" />
              Doanh Thu Theo Lĩnh Vực Đào Tạo (Categories)
            </h3>
            <span className="text-[10px] font-bold text-muted-foreground">TOP Doanh thu</span>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-foreground">AI & Machine Learning</span>
                <span className="text-emerald-600 font-extrabold">42% (2.990.000 đ)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "42%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-foreground">Lập trình Web & Frontend</span>
                <span className="text-primary font-extrabold">39% (2.780.000 đ)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: "39%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-foreground">Data Science & Thiết kế UI/UX</span>
                <span className="text-amber-600 font-extrabold">19% (1.350.000 đ)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: "19%" }}></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Transactions Log Table */}
      <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
        {/* Toolbar & Filters */}
        <div className="p-4 bg-muted/20 border-b border-border/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
          <div className="flex flex-col gap-1 lg:col-span-6">
            <Label className="text-[11px] font-bold text-muted-foreground">Từ khóa tìm kiếm</Label>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Tìm theo Mã đơn (ORD-...), Tên học viên, Email hoặc Tên khóa học..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-8 h-9 text-xs border border-border bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-3">
            <Label className="text-[11px] font-bold text-muted-foreground">Phương thức thanh toán</Label>
            <Select value={methodFilter} onValueChange={(val) => { setMethodFilter(val || "ALL"); setPage(0); }}>
              <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                <SelectValue placeholder="Tất cả phương thức" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả phương thức</SelectItem>
                <SelectItem value="VNPAY">Cổng VNPay</SelectItem>
                <SelectItem value="MOMO">Ví MoMo</SelectItem>
                <SelectItem value="BANK_TRANSFER">Chuyển khoản Ngân hàng</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-3">
            <Label className="text-[11px] font-bold text-muted-foreground">Trạng thái giao dịch</Label>
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || "ALL"); setPage(0); }}>
              <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="COMPLETED">Thành công (COMPLETED)</SelectItem>
                <SelectItem value="REFUNDED">Hoàn tiền (REFUNDED)</SelectItem>
                <SelectItem value="PENDING">Chờ xử lý (PENDING)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="p-0 relative">
          <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
              <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Mã Đơn Hàng</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Học Viên</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Khóa Học & Danh Mục</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phương Thức</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Số Tiền</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thời Gian</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Chi Tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="opacity-90">
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                    <TableCell className="font-mono font-bold text-xs text-primary pl-4">{tx.orderCode}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">{tx.studentName}</div>
                      <div className="text-[10px] text-muted-foreground">{tx.studentEmail}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground max-w-xs">{tx.courseName}</div>
                      <div className="text-[10px] text-muted-foreground">{tx.categoryName}</div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 font-extrabold text-[10px] border border-slate-500/20">
                        {tx.paymentMethod}
                      </span>
                    </TableCell>
                    <TableCell className="font-extrabold text-xs text-foreground">
                      {tx.amount.toLocaleString()} đ
                    </TableCell>
                    <TableCell>
                      {tx.status === "COMPLETED" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                          Thành công
                        </span>
                      )}
                      {tx.status === "REFUNDED" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold border border-rose-500/20">
                          Đã hoàn tiền
                        </span>
                      )}
                      {tx.status === "PENDING" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold border border-amber-500/20">
                          Chờ xử lý
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-medium">{tx.paidAt}</TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        onClick={() => setSelectedTx(tx)}
                        variant="ghost"
                        size="icon"
                        title="Xem chi tiết"
                        className="h-7 w-7 text-muted-foreground hover:bg-muted"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                    Không tìm thấy giao dịch doanh thu nào phù hợp.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Modern Table Footer */}
        <div className="px-5 py-3 border-t border-border/40 bg-card/40 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          {/* Left: Total Results Summary */}
          <div className="text-muted-foreground font-medium">
            Showing <span className="font-semibold text-foreground">{totalElements === 0 ? 0 : page * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-foreground">{Math.min((page + 1) * pageSize, totalElements)}</span> of{" "}
            <span className="font-semibold text-foreground">{totalElements}</span> results
          </div>

          <div className="flex flex-wrap items-center gap-5">
            {/* Middle: Rows per page Select */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border/40 rounded-lg font-semibold">
                  <SelectValue placeholder={String(pageSize)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Go to Page Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const pageNum = parseInt(jumpPageInput, 10);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                  setPage(pageNum - 1);
                } else {
                  setJumpPageInput(String(page + 1));
                }
              }}
              className="flex items-center gap-1.5"
            >
              <span className="text-muted-foreground font-medium">Go to:</span>
              <Input
                type="number"
                min={1}
                max={totalPages || 1}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                onBlur={() => {
                  const pageNum = parseInt(jumpPageInput, 10);
                  if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                    setPage(pageNum - 1);
                  } else {
                    setJumpPageInput(String(page + 1));
                  }
                }}
                className="h-8 w-14 text-center text-xs font-semibold bg-background border border-border/40 rounded-lg px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                title="Nhập số trang và nhấn Enter"
              />
            </form>

            {/* Right: Numbered Pagination Buttons */}
            <div className="flex items-center gap-1">
              <Button
                disabled={page === 0}
                onClick={() => setPage((prev) => prev - 1)}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </Button>

              {getPageNumbers(page, totalPages).map((p, pIdx) => {
                if (p === "...") {
                  return (
                    <span key={`dots-${pIdx}`} className="px-2 text-muted-foreground font-bold pointer-events-none">
                      ...
                    </span>
                  );
                }
                const pageNum = p as number;
                const isCurrent = pageNum === page;
                return (
                  <Button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    variant={isCurrent ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 min-w-[32px] px-2 text-xs font-semibold rounded-lg transition-all",
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border-border/40 text-foreground hover:bg-muted/70"
                    )}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}

              <Button
                disabled={page >= totalPages - 1 || totalPages === 0}
                onClick={() => setPage((prev) => prev + 1)}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* TRANSACTION DETAIL MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <h3 className="font-extrabold text-foreground text-sm">Chi Tiết Giao Dịch: {selectedTx.orderCode}</h3>
              </div>
              <button onClick={() => setSelectedTx(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Học viên:</span>
                  <span className="font-bold text-foreground">{selectedTx.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-bold text-foreground">{selectedTx.studentEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Khóa học đăng ký:</span>
                  <span className="font-bold text-foreground max-w-[200px] text-right">{selectedTx.courseName}</span>
                </div>
                <div className="flex justify-between border-t border-border/40 pt-2">
                  <span className="text-muted-foreground">Số tiền thanh toán:</span>
                  <span className="font-extrabold text-emerald-600 text-sm">{selectedTx.amount.toLocaleString()} đ</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phương thức thanh toán:</span>
                  <span className="font-bold text-foreground">{selectedTx.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Thời gian ghi nhận:</span>
                  <span className="font-mono text-muted-foreground">{selectedTx.paidAt}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Trạng thái:</span>
                  {selectedTx.status === "COMPLETED" ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                      Thành công (COMPLETED)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-[10px]">
                      Đã hoàn tiền (REFUNDED)
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 flex justify-end border-t border-border">
                <Button onClick={() => setSelectedTx(null)} className="h-9 font-bold text-xs bg-primary rounded-xl">
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST BANNER NOTIFICATIONS */}
      {actionMessage && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300",
            actionMessage.isError ? "bg-destructive" : "bg-emerald-600"
          )}
        >
          <span className="text-sm font-semibold">{actionMessage.text}</span>
        </div>
      )}

    </div>
  );
};
