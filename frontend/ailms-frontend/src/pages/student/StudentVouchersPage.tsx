import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SmartVoucherCard, type VoucherTicketData } from "@/components/common/ShopeeTicketCard";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { Tag, Sparkles, Zap, ShieldCheck, Gift } from "lucide-react";

export const StudentVouchersPage: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();

  const [activeTab, setActiveTab] = useState<string>("ALL");

  const [vouchers, setVouchers] = useState<VoucherTicketData[]>([
    {
      id: "v-1",
      code: "SUMMER2026",
      title: "Giảm 20% Học Phí",
      discountType: "PERCENT",
      value: 20,
      maxDiscountText: "Giảm tối đa 500.000 VNĐ",
      minOrderText: "Đơn Tối Thiểu 2.000.000 VNĐ",
      expiryText: "Hạn: 31/12/2026",
      badgeText: "AI Recommended",
      matchScorePercent: 98,
      colorTheme: "indigo",
      applicableCourseName: "Khóa học Fullstack Web Pro & Next.js",
      isSaved: false,
    },
    {
      id: "v-2",
      code: "VIPMEMBER",
      title: "Tặng 500.000 VNĐ",
      discountType: "FIXED",
      value: 500000,
      maxDiscountText: "Giảm trực tiếp 500.000 VNĐ",
      minOrderText: "Đơn Tối Thiểu 3.500.000 VNĐ",
      expiryText: "Hạn: 15/08/2026",
      badgeText: "Gói Kèm 1-1",
      matchScorePercent: 95,
      colorTheme: "amber",
      applicableCourseName: "Gói Kèm 1-1 Chuyên Sâu Pro",
      isSaved: true,
    },
    {
      id: "v-3",
      code: "WELCOME2026",
      title: "Ưu Đãi Học Viên Mới 15%",
      discountType: "PERCENT",
      value: 15,
      maxDiscountText: "Giảm tối đa 300.000 VNĐ",
      minOrderText: "Đơn Tối Thiểu 990.000 VNĐ",
      expiryText: "Hạn: 30/09/2026",
      badgeText: "Newbie",
      matchScorePercent: 90,
      colorTheme: "emerald",
      applicableCourseName: "Tất cả các khóa học Tự học Standard",
      isSaved: false,
    },
    {
      id: "v-4",
      code: "FLASHSALE",
      title: "Giảm 8% Đặc Quyền",
      discountType: "PERCENT",
      value: 8,
      maxDiscountText: "Giảm tối đa 200.000 VNĐ",
      minOrderText: "Đơn Tối Thiểu 500.000 VNĐ",
      expiryText: "Hạn: 05/08/2026",
      badgeText: "Flash Reward",
      matchScorePercent: 88,
      colorTheme: "rose",
      applicableCourseName: "Toàn bộ chương trình học trực tuyến",
      isSaved: false,
    },
  ]);

  const handleSave = (v: VoucherTicketData) => {
    success(`Đã lưu Smart Voucher [${v.code}] vào ví cá nhân thành công!`);
  };

  const handleUseNow = (v: VoucherTicketData) => {
    success(`Đã chọn mã [${v.code}]. Đang chuyển tới Giỏ hàng để áp dụng...`);
    navigate("/student/cart");
  };

  const filteredVouchers = vouchers.filter((v) => {
    if (activeTab === "AI_RECOMMENDED") return v.matchScorePercent && v.matchScorePercent >= 95;
    if (activeTab === "ONE_ON_ONE") return v.badgeText?.includes("1-1");
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Gift className="h-6 w-6 text-primary" />
          Kho Smart Voucher & Ưu Đãi Học Tập
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Hệ thống AI tự động phân tích và đề xuất các mã giảm giá học phí phù hợp nhất với lộ trình của bạn.
        </p>
      </div>

      {/* AI Smart Banner */}
      <div className="p-4 bg-gradient-to-r from-primary/10 via-card to-card border border-primary/30 rounded-2xl flex items-center gap-3 text-xs shadow-xs">
        <div className="p-2.5 bg-primary/20 text-primary rounded-xl shrink-0">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <strong className="text-foreground text-sm font-bold block">Gợi ý thông minh từ AI-LMS:</strong>
          <span className="text-muted-foreground">
            Lưu voucher vào Ví cá nhân để hệ thống tự động áp dụng mức giảm tối đa cho bạn khi tiến hành Checkout!
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-border/40 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === "ALL"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          🌟 Tất cả Voucher ({vouchers.length})
        </button>
        <button
          onClick={() => setActiveTab("AI_RECOMMENDED")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === "AI_RECOMMENDED"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          🎯 AI Đề Xuất Phù Hợp (&gt; 95%)
        </button>
        <button
          onClick={() => setActiveTab("ONE_ON_ONE")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === "ONE_ON_ONE"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          💎 Ưu Đãi Gói Kèm 1-1
        </button>
      </div>

      {/* Voucher Ticket Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredVouchers.map((v) => (
          <SmartVoucherCard
            key={v.id}
            voucher={v}
            onSave={handleSave}
            onUseNow={handleUseNow}
          />
        ))}
      </div>
    </div>
  );
};
