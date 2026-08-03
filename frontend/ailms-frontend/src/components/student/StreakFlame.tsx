import React from "react";
import { Flame } from "lucide-react";

interface StreakFlameProps {
  currentStreak: number;
  longestStreak: number;
  size?: "sm" | "md" | "lg";
}

export const StreakFlame: React.FC<StreakFlameProps> = ({
  currentStreak,
  longestStreak,
  size = "md",
}) => {
  const sizeClasses = {
    sm: { icon: "h-5 w-5", text: "text-base", sub: "text-[10px]" },
    md: { icon: "h-7 w-7", text: "text-xl", sub: "text-xs" },
    lg: { icon: "h-10 w-10", text: "text-3xl", sub: "text-sm" },
  }[size];

  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-orange-500/20 rounded-2xl">
      <div className="p-2.5 bg-gradient-to-br from-amber-500 to-rose-500 text-white rounded-xl shadow-md shadow-orange-500/20 animate-pulse">
        <Flame className={sizeClasses.icon} />
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className={`${sizeClasses.text} font-black text-foreground`}>{currentStreak}</span>
          <span className={`${sizeClasses.sub} font-bold text-orange-500 uppercase tracking-wider`}>Ngày Streak 🔥</span>
        </div>
        <p className="text-[11px] text-muted-foreground">Kỷ lục cá nhân: <strong className="text-foreground">{longestStreak} ngày</strong></p>
      </div>
    </div>
  );
};
