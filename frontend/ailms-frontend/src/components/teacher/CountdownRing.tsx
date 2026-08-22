import React, { useEffect, useState } from "react";

interface CountdownRingProps {
  initialSeconds: number; // e.g. 24 * 3600 = 86400
  size?: number;
  strokeWidth?: number;
  onExpire?: () => void;
}

export const CountdownRing: React.FC<CountdownRingProps> = ({
  initialSeconds,
  size = 44,
  strokeWidth = 3,
  onExpire,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onExpire) onExpire();
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, onExpire]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, secondsLeft / initialSeconds));
  const strokeDashoffset = circumference - progress * circumference;

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);

  const isUrgent = secondsLeft < 4 * 3600; // less than 4 hours left

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ${
            isUrgent ? "text-rose-600 animate-pulse" : "text-amber-500"
          }`}
          fill="transparent"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
        <span className={`text-[10px] font-black font-mono leading-none ${isUrgent ? "text-rose-600 font-bold" : "text-amber-600 font-bold"}`}>
          {hours}h{minutes}m
        </span>
      </div>
    </div>
  );
};
