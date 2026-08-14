import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CourseScrollContainerProps {
  /** Danh sách thẻ con (course cards) */
  children: React.ReactNode;
  /** Callback khi cuộn danh sách */
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  /** ClassName bổ sung cho container cuộn */
  className?: string;
  /** Số lượng item trong danh sách để trigger re-check khi thay đổi */
  itemCount?: number;
}

/**
 * Component container hỗ trợ cuộn ngang danh sách khóa học với 2 nút mũi tên điều hướng (quay lui/đi tiếp) dùng shadcn UI Button,
 * vị trí nút nằm hoàn toàn ngoài vùng hiển thị thẻ khóa học (không che thẻ), phản hồi click 1 lần ngay lập tức,
 * chống double-fire trên cảm ứng và hỗ trợ giữ nút để lướt liên tục.
 */
export const CourseScrollContainer: React.FC<CourseScrollContainerProps> = ({
  children,
  onScroll,
  className = "",
  itemCount = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Ref quản lý trạng thái nhấn giữ cuộn
  const isHoldingRef = useRef(false);
  const wasHoldingRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdRef = useRef<number | null>(null);

  /**
   * Kiểm tra vị trí cuộn để cập nhật trạng thái bật/tắt (min/max) của 2 nút mũi tên.
   */
  const checkScrollBounds = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  /**
   * Cuộn danh sách sang trái/phải một khoảng cách mượt mà (bằng 75% chiều rộng hiển thị).
   */
  const scrollByStep = useCallback((direction: -1 | 1) => {
    if (containerRef.current) {
      const scrollDistance = containerRef.current.clientWidth * 0.75;
      containerRef.current.scrollBy({
        left: direction * scrollDistance,
        behavior: "smooth",
      });
    }
  }, []);

  /**
   * Cập nhật biên cuộn khi component mount, itemCount thay đổi hoặc container đổi kích thước qua ResizeObserver.
   */
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      checkScrollBounds();
    });
    const el = containerRef.current;
    if (!el) {
      return () => {
        cancelAnimationFrame(id);
      };
    }

    const observer = new ResizeObserver(() => {
      checkScrollBounds();
    });
    observer.observe(el);

    const handleResize = () => {
      checkScrollBounds();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(id);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [checkScrollBounds, itemCount]);

  /**
   * Xử lý sự kiện cuộn của container và kích hoạt callback bên ngoài nếu có.
   */
  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    checkScrollBounds();
    if (onScroll) {
      onScroll(e);
    }
  };

  /**
   * Dừng hành động nhấn giữ cuộn và dọn dẹp timer / requestAnimationFrame.
   */
  const stopHoldScroll = useCallback(() => {
    isHoldingRef.current = false;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  /**
   * Bắt đầu theo dõi hành động nhấn giữ nút để cuộn liên tục theo hướng chỉ định.
   */
  const startHoldScroll = (direction: -1 | 1) => {
    stopHoldScroll();
    isHoldingRef.current = true;
    wasHoldingRef.current = false;

    // Ngưỡng giữ 250ms chuẩn cho long press, tránh nhầm lẫn với click 1 lần
    holdTimerRef.current = setTimeout(() => {
      wasHoldingRef.current = true;
      const scrollStep = () => {
        if (!isHoldingRef.current || !containerRef.current) return;
        const speed = 12 * direction;
        containerRef.current.scrollLeft += speed;
        checkScrollBounds();
        rafIdRef.current = requestAnimationFrame(scrollStep);
      };
      rafIdRef.current = requestAnimationFrame(scrollStep);
    }, 250);
  };

  /**
   * Xử lý sự kiện nhấp chuột 1 lần (single click) hoặc bấm bàn phím (Enter / Space).
   */
  const handleButtonClick = (direction: -1 | 1) => {
    // Nếu vừa thực hiện lướt liên tục (long hold) thì không cuộn thêm click step
    if (wasHoldingRef.current) {
      wasHoldingRef.current = false;
      return;
    }
    scrollByStep(direction);
  };

  /**
   * Xử lý kết thúc chạm cảm ứng (mobile touch) chống double-fire event.
   */
  const handleTouchEnd = (e: React.TouchEvent, direction: -1 | 1) => {
    e.preventDefault();
    const wasLongHold = wasHoldingRef.current;
    stopHoldScroll();

    if (!wasLongHold) {
      scrollByStep(direction);
    }
  };

  /**
   * Lắng nghe sự kiện thả chuột toàn cục để dừng giữ cuộn an toàn.
   */
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isHoldingRef.current) {
        stopHoldScroll();
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      stopHoldScroll();
    };
  }, [stopHoldScroll]);

  return (
    <div className="relative group/carousel w-full">
      {/* Nút quay lui (Left Arrow) shadcn Button */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Quay lui"
        disabled={!canScrollLeft}
        onMouseDown={() => {
          startHoldScroll(-1);
        }}
        onMouseUp={stopHoldScroll}
        onMouseLeave={stopHoldScroll}
        onTouchStart={(e) => {
          e.preventDefault();
          startHoldScroll(-1);
        }}
        onTouchEnd={(e) => {
          handleTouchEnd(e, -1);
        }}
        onClick={() => {
          handleButtonClick(-1);
        }}
        className="absolute -left-4 sm:-left-7 md:-left-10 lg:-left-14 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-card/95 border border-border/70 text-foreground shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-110 hover:shadow-xl active:scale-95 disabled:opacity-0 disabled:pointer-events-none select-none cursor-pointer"
      >
        <ChevronLeft className="w-6 h-6 shrink-0" />
      </Button>

      {/* Container cuộn danh sách khóa học */}
      <div
        ref={containerRef}
        onScroll={handleContainerScroll}
        className={className}
      >
        {children}
      </div>

      {/* Nút đi tiếp (Right Arrow) shadcn Button */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Đi tiếp"
        disabled={!canScrollRight}
        onMouseDown={() => {
          startHoldScroll(1);
        }}
        onMouseUp={stopHoldScroll}
        onMouseLeave={stopHoldScroll}
        onTouchStart={(e) => {
          e.preventDefault();
          startHoldScroll(1);
        }}
        onTouchEnd={(e) => {
          handleTouchEnd(e, 1);
        }}
        onClick={() => {
          handleButtonClick(1);
        }}
        className="absolute -right-4 sm:-right-7 md:-right-10 lg:-right-14 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-card/95 border border-border/70 text-foreground shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-110 hover:shadow-xl active:scale-95 disabled:opacity-0 disabled:pointer-events-none select-none cursor-pointer"
      >
        <ChevronRight className="w-6 h-6 shrink-0" />
      </Button>
    </div>
  );
};
