import React, { useState } from "react";
import { Sparkles, Check, Tag, Info, Clock, Zap, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface VoucherTicketData {
  id: string;
  code: string;
  title: string; // e.g. "Giảm 20% Học Phí" or "Tặng 500.000 VNĐ"
  discountType: "PERCENT" | "FIXED";
  value: number;
  maxDiscountText?: string;
  minOrderText?: string;
  expiryText: string;
  badgeText?: string; // e.g. "AI Recommended", "Khóa Hot", "Học Viên Mới"
  matchScorePercent?: number; // e.g. 98%
  colorTheme?: "indigo" | "amber" | "emerald" | "rose" | "orange" | "red";
  applicableCourseName?: string;
  isSaved?: boolean;
}

interface SmartVoucherCardProps {
  voucher: VoucherTicketData;
  onSave?: (voucher: VoucherTicketData) => void;
  onUseNow?: (voucher: VoucherTicketData) => void;
}

export const SmartVoucherCard: React.FC<SmartVoucherCardProps> = ({
  voucher,
  onSave,
  onUseNow,
}) => {
  const [saved, setSaved] = useState(voucher.isSaved || false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const themeMap = {
    indigo: {
      stubGradient: "bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700",
      accentBadge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
      btnClass: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20",
      borderHover: "hover:border-indigo-500/50",
    },
    amber: {
      stubGradient: "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600",
      accentBadge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      btnClass: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20",
      borderHover: "hover:border-amber-500/50",
    },
    orange: {
      stubGradient: "bg-gradient-to-br from-orange-500 via-amber-500 to-rose-600",
      accentBadge: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
      btnClass: "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20",
      borderHover: "hover:border-orange-500/50",
    },
    red: {
      stubGradient: "bg-gradient-to-br from-red-600 via-rose-600 to-pink-700",
      accentBadge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
      btnClass: "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20",
      borderHover: "hover:border-red-500/50",
    },
    emerald: {
      stubGradient: "bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700",
      accentBadge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20",
      borderHover: "hover:border-emerald-500/50",
    },
    rose: {
      stubGradient: "bg-gradient-to-br from-rose-600 via-pink-600 to-purple-700",
      accentBadge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
      btnClass: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20",
      borderHover: "hover:border-rose-500/50",
    },
  };

  const themeConfig = themeMap[voucher.colorTheme || "indigo"] || themeMap.indigo;

  const handleSaveClick = () => {
    if (saved) {
      if (onUseNow) onUseNow(voucher);
    } else {
      setSaved(true);
      if (onSave) onSave(voucher);
    }
  };

  return (
    <>
      {/* Modern Ticket Container */}
      <div
        className={`group relative flex w-full h-40 rounded-2xl border border-border/50 bg-card shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden ${themeConfig.borderHover} select-none`}
      >
        {/* Left Stub (30% width) with glassmorphism & curved ticket notch cutouts */}
        <div className={`w-[30%] shrink-0 ${themeConfig.stubGradient} text-white flex flex-col items-center justify-between p-3.5 relative overflow-hidden`}>
          {/* Top Notch Cutout */}
          <div className="absolute -top-3 right-0 transform translate-x-1/2 w-5 h-5 rounded-full bg-background border border-border/40 z-10" />
          {/* Bottom Notch Cutout */}
          <div className="absolute -bottom-3 right-0 transform translate-x-1/2 w-5 h-5 rounded-full bg-background border border-border/40 z-10" />

          {/* Background Glow Ring */}
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          <div className="flex flex-col items-center text-center space-y-1.5 z-0">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/90">
              AI VOUCHER
            </span>
          </div>

          {/* Code Badge */}
          <div className="px-2 py-0.5 rounded-md bg-black/30 backdrop-blur-xs font-mono text-[10px] font-bold text-white tracking-wider border border-white/20">
            {voucher.code}
          </div>

          {/* Vertical Perforated Line */}
          <div className="absolute right-0 top-3 bottom-3 w-0 border-r-2 border-dashed border-white/40" />
        </div>

        {/* Right Content Body (70% width) */}
        <div className="flex-1 p-4 flex flex-col justify-between relative bg-gradient-to-r from-card to-card/50">
          {/* Header Row: Title & Smart AI Badge */}
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-black text-foreground tracking-tight leading-none">
                  {voucher.title}
                </h3>
                <p className="text-xs font-semibold text-primary mt-1">
                  {voucher.applicableCourseName || "Tất cả các khóa học trên hệ thống"}
                </p>
              </div>

              {voucher.matchScorePercent && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                  <Sparkles className="h-3 w-3" />
                  Match {voucher.matchScorePercent}%
                </span>
              )}
            </div>

            {/* Conditions Subtitle */}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
              {voucher.maxDiscountText && <span>{voucher.maxDiscountText}</span>}
              {voucher.minOrderText && <span>• {voucher.minOrderText}</span>}
            </div>
          </div>

          {/* Expiration & Actions Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" />
                {voucher.expiryText}
              </span>
              <button
                onClick={() => setShowTermsModal(true)}
                className="text-[11px] font-bold text-muted-foreground hover:text-primary transition cursor-pointer"
              >
                Điều khoản
              </button>
            </div>

            <Button
              size="sm"
              onClick={handleSaveClick}
              className={`h-8 px-4 text-xs font-bold rounded-xl cursor-pointer transition shadow-md ${
                saved
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                  : themeConfig.btnClass
              }`}
            >
              {saved ? (
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Dùng ngay
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Lưu Voucher
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-popover border border-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h4 className="text-sm font-bold text-foreground">Thể lệ & Điều khoản Voucher</h4>
              </div>
              <button onClick={() => setShowTermsModal(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-foreground bg-muted/40 p-3 rounded-xl border border-border/40">
              <p>• Mã ưu đãi: <strong className="font-mono text-primary">{voucher.code}</strong></p>
              <p>• Giá trị ưu đãi: <strong>{voucher.title}</strong></p>
              {voucher.maxDiscountText && <p>• {voucher.maxDiscountText}</p>}
              {voucher.minOrderText && <p>• {voucher.minOrderText}</p>}
              <p>• Thời hạn sử dụng: <strong>{voucher.expiryText}</strong></p>
              <p>• Phạm vi áp dụng: <strong>{voucher.applicableCourseName || "Toàn bộ khóa học trên AI-LMS"}</strong></p>
            </div>

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => setShowTermsModal(false)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl cursor-pointer"
              >
                Đã hiểu
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const ShopeeTicketCard = SmartVoucherCard;
