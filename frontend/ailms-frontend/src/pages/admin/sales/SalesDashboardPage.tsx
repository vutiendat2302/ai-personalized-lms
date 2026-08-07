import React, { useState, useEffect } from "react";
import { salesApi, type SalesKPI, type DailyRevenueStat, type TopCoursePackageStat, type UrgentTaskItem } from "@/api/sales/salesApi";
import { StatusBadge } from "@/components/sales/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ShoppingCart,
  Tag,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  DollarSign,
  User,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Link } from "react-router-dom";

export const SalesDashboardPage: React.FC = () => {
  const [kpi, setKpi] = useState<SalesKPI | null>(null);
  const [revenueData, setRevenueData] = useState<DailyRevenueStat[]>([]);
  const [topPackages, setTopPackages] = useState<TopCoursePackageStat[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<UrgentTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "EXPIRING_PENDING" | "FAILED_PAYMENT" | "PAID_NO_ENROLLMENT">("ALL");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kpiRes, revRes, topRes, taskRes] = await Promise.all([
        salesApi.getSalesKPI(),
        salesApi.getDailyRevenueStats(),
        salesApi.getTopCoursePackages(),
        salesApi.getUrgentTasks(),
      ]);
      setKpi(kpiRes);
      setRevenueData(revRes);
      setTopPackages(topRes);
      setUrgentTasks(taskRes);
    } catch (error) {
      console.error("Error loading sales dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUrgentTasks = urgentTasks.filter((t) =>
    activeTab === "ALL" ? true : t.type === activeTab
  );

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Sales Dashboard</h1>
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full">
              Live Metrics
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Tổng quan 5 giây về sức khỏe bán hàng & các công việc cần xử lý ngay lập tức
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="rounded-lg gap-2 cursor-pointer text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Link to="/sales/orders">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg gap-2 cursor-pointer text-xs font-semibold shadow-sm">
              Xem đơn hàng
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Row 1 — 4 KPI Cards (Borderless, minimal, clean shadow) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Revenue */}
        <Card className="border border-border/40 shadow-xs hover:shadow-md transition-all rounded-xl overflow-hidden bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Doanh thu hôm nay</span>
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black tracking-tight text-foreground">
                {kpi ? formatVND(kpi.todayRevenue) : "0 ₫"}
              </h3>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                {kpi && kpi.revenueChangePercent >= 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                    <TrendingUp className="h-3 w-3" /> +{kpi.revenueChangePercent}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                    <TrendingDown className="h-3 w-3" /> {kpi?.revenueChangePercent}%
                  </span>
                )}
                <span className="text-muted-foreground">so với hôm qua</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Pending Orders */}
        <Card className="border border-border/40 shadow-xs hover:shadow-md transition-all rounded-xl overflow-hidden bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Đơn PENDING chờ xử lý</span>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black tracking-tight text-foreground">
                  {kpi?.pendingOrdersCount ?? 0}
                </h3>
                <span className="text-xs font-semibold text-muted-foreground">đơn hàng</span>
              </div>
              <div className="mt-2 text-xs">
                {kpi?.isPendingWarning ? (
                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium">
                    <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                    Cảnh báo &gt; 5 đơn cần giục
                  </span>
                ) : (
                  <span className="text-emerald-600 font-medium">Trong ngưỡng an toàn</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Conversion Rate */}
        <Card className="border border-border/40 shadow-xs hover:shadow-md transition-all rounded-xl overflow-hidden bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Tỉ lệ chuyển đổi giỏ hàng</span>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black tracking-tight text-foreground">
                {kpi?.conversionRate ?? 0}%
              </h3>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Giỏ hàng → Đơn thành công</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Expiring Coupons */}
        <Card className="border border-border/40 shadow-xs hover:shadow-md transition-all rounded-xl overflow-hidden bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Coupon sắp hết lượt dùng</span>
              <div className="p-2 bg-rose-50 dark:bg-rose-950/50 rounded-lg text-rose-600 dark:text-rose-400">
                <Tag className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black tracking-tight text-foreground">
                  {kpi?.expiringCouponsCount ?? 0}
                </h3>
                <span className="text-xs font-semibold text-muted-foreground">mã giảm giá</span>
              </div>
              <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
                Đã dùng &gt; 90% giới hạn
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2 — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart 30-day Revenue */}
        <Card className="lg:col-span-2 border border-border/40 shadow-xs rounded-xl overflow-hidden bg-card">
          <div className="p-5 border-b border-border/40 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base text-foreground">Biểu đồ doanh thu 30 ngày</h3>
              <p className="text-xs text-muted-foreground">Tổng số tiền thanh toán thực nhận theo paid_at</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-full">
              30 ngày qua
            </span>
          </div>
          <CardContent className="p-5 pt-6">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    tickFormatter={(val) => val.slice(8, 10) + "/" + val.slice(5, 7)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatVND(Number(value)), "Doanh thu"]}
                    labelFormatter={(label) => `Ngày: ${label}`}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4F46E5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart Top 5 Course Packages */}
        <Card className="border border-border/40 shadow-xs rounded-xl overflow-hidden bg-card">
          <div className="p-5 border-b border-border/40 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base text-foreground">Top 5 Gói học</h3>
              <p className="text-xs text-muted-foreground">Theo tổng doanh thu bán ra</p>
            </div>
          </div>
          <CardContent className="p-5 pt-6">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPackages} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    width={110}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatVND(Number(val)), "Doanh thu"]}
                    contentStyle={{ borderRadius: "10px", border: "1px solid #E2E8F0" }}
                  />
                  <Bar dataKey="revenue" fill="#6366F1" radius={[0, 8, 8, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Bảng "Cần xử lý ngay" (Smart list) */}
      <Card className="border border-border/40 shadow-xs rounded-xl overflow-hidden bg-card">
        <div className="p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Bảng "Cần xử lý ngay" (Smart Action List)</h3>
              <p className="text-xs text-muted-foreground">Các đơn hàng, giao dịch lỗi hoặc gói kích hoạt cần admin can thiệp khẩn</p>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "ALL" ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Tất cả ({urgentTasks.length})
            </button>
            <button
              onClick={() => setActiveTab("EXPIRING_PENDING")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "EXPIRING_PENDING" ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              PENDING sắp hết hạn
            </button>
            <button
              onClick={() => setActiveTab("FAILED_PAYMENT")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "FAILED_PAYMENT" ? "bg-rose-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Giao dịch FAILED
            </button>
            <button
              onClick={() => setActiveTab("PAID_NO_ENROLLMENT")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "PAID_NO_ENROLLMENT" ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Lỗi kích hoạt
            </button>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            {filteredUrgentTasks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Sparkles className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold">Tuyệt vời! Không có tác vụ khẩn cấp nào cần xử lý.</p>
              </div>
            ) : (
              filteredUrgentTasks.map((task) => (
                <div key={task.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                  <div className="flex items-start gap-3.5">
                    {task.type === "EXPIRING_PENDING" && (
                      <div className="p-2.5 bg-amber-50 text-amber-600 dark:bg-amber-950/60 rounded-xl shrink-0 mt-0.5">
                        <Clock className="h-5 w-5" />
                      </div>
                    )}
                    {task.type === "FAILED_PAYMENT" && (
                      <div className="p-2.5 bg-rose-50 text-rose-600 dark:bg-rose-950/60 rounded-xl shrink-0 mt-0.5">
                        <PhoneCall className="h-5 w-5" />
                      </div>
                    )}
                    {task.type === "PAID_NO_ENROLLMENT" && (
                      <div className="p-2.5 bg-purple-50 text-purple-600 dark:bg-purple-950/60 rounded-xl shrink-0 mt-0.5">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-foreground">{task.title}</h4>
                        {task.type === "EXPIRING_PENDING" && <StatusBadge status="PENDING" size="sm" />}
                        {task.type === "FAILED_PAYMENT" && <StatusBadge status="FAILED" size="sm" />}
                        {task.type === "PAID_NO_ENROLLMENT" && <StatusBadge status="PAID" size="sm" label="Cần gán gói" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{task.subtitle}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <User className="h-3.5 w-3.5" />
                          {task.studentName} ({task.studentPhone})
                        </span>
                        <span>•</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {formatVND(task.amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Link to={`/sales/orders/${task.orderId}`}>
                      <Button size="sm" variant="outline" className="rounded-lg text-xs font-semibold gap-1.5 cursor-pointer">
                        Xử lý ngay
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
