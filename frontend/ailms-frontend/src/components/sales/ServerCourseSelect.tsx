import React, { useState, useEffect, useRef, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";
import { Search, BookOpen, Check, ChevronsUpDown, Loader2, X, Info, GraduationCap, Tag, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CourseItemOption {
  id: string;
  name: string;
  code?: string;
  categoryName?: string;
  level?: string;
  status?: string;
  price?: number;
}

interface ServerCourseSelectProps {
  value: string;
  onChange: (courseId: string, courseName?: string) => void;
  placeholder?: string;
  allowAll?: boolean;
  allLabel?: string;
  className?: string;
  disabled?: boolean;
}

export const ServerCourseSelect: React.FC<ServerCourseSelectProps> = ({
  value,
  onChange,
  placeholder = "Chọn khóa học...",
  allowAll = true,
  allLabel = "Tất cả khóa học",
  className,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [courses, setCourses] = useState<CourseItemOption[]>([]);
  const [selectedCourseName, setSelectedCourseName] = useState<string>("");
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Hover preview state
  const [hoveredCourse, setHoveredCourse] = useState<CourseItemOption | null>(null);

  const pageRef = useRef(0);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  // Debounce search keyword
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Fetch page 0 when popover opens or keyword changes
  const fetchPageZero = useCallback(async (searchKey: string) => {
    loadingRef.current = true;
    setLoading(true);
    pageRef.current = 0;
    try {
      const res = await adminCourseClassApi.searchCourses({
        keyword: searchKey.trim() || undefined,
        page: 0,
        size: 15,
        status: "ACTIVE",
      });

      const items = (res?.content || []).map((c: any) => ({
        id: String(c.id),
        name: c.name || `Khóa học #${c.id}`,
        code: c.code || String(c.id),
        categoryName: c.categoryName || c.category?.name,
        level: c.level,
        status: c.status || "ACTIVE",
        price: c.price,
      }));

      setCourses(items);
      setTotalElements(res?.totalElements || items.length);
      setTotalPages(res?.totalPages || 1);
      const more = res ? res.page < res.totalPages - 1 : false;
      setHasMore(more);
      hasMoreRef.current = more;
    } catch {
      setCourses([]);
      setHasMore(false);
      hasMoreRef.current = false;
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Fetch next page (Infinite Scroll / Phân trang tiếp)
  const fetchNextPage = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    const nextPage = pageRef.current + 1;
    try {
      const res = await adminCourseClassApi.searchCourses({
        keyword: debouncedKeyword.trim() || undefined,
        page: nextPage,
        size: 15,
        status: "ACTIVE",
      });

      const newItems = (res?.content || []).map((c: any) => ({
        id: String(c.id),
        name: c.name || `Khóa học #${c.id}`,
        code: c.code || String(c.id),
        categoryName: c.categoryName || c.category?.name,
        level: c.level,
        status: c.status || "ACTIVE",
        price: c.price,
      }));

      setCourses((prev) => [...prev, ...newItems]);
      pageRef.current = nextPage;
      setTotalElements(res?.totalElements || 0);
      setTotalPages(res?.totalPages || 1);
      const more = res ? res.page < res.totalPages - 1 : false;
      setHasMore(more);
      hasMoreRef.current = more;
    } catch {
      setHasMore(false);
      hasMoreRef.current = false;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [debouncedKeyword]);

  // Load single course details when value is set from external
  useEffect(() => {
    if (!value || value === "ALL") {
      setSelectedCourseName("");
      return;
    }

    const found = courses.find((c) => c.id === value);
    if (found) {
      setSelectedCourseName(found.name);
    } else {
      adminCourseClassApi
        .getCourse(value)
        .then((c) => {
          if (c) setSelectedCourseName(c.name || `Khóa học #${c.id}`);
        })
        .catch(() => setSelectedCourseName(`Khóa học #${value}`));
    }
  }, [value, courses]);

  // Trigger search on open or keyword change
  useEffect(() => {
    if (open) {
      fetchPageZero(debouncedKeyword);
    }
  }, [open, debouncedKeyword, fetchPageZero]);

  // Scroll listener for infinite scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 30) {
      fetchNextPage();
    }
  };

  const displayTitle = value === "ALL" || !value ? allLabel : selectedCourseName || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-between font-normal text-xs h-9 bg-background border border-border/60 rounded-xl px-3 truncate hover:bg-muted/50 cursor-pointer",
          className
        )}
      >
        <span className="flex items-center gap-1.5 truncate">
          <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span className="truncate">{displayTitle}</span>
        </span>
        <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2 bg-popover border border-border shadow-2xl rounded-2xl z-50">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Gõ tên tìm kiếm khóa học..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-8 pr-7 text-xs h-8 bg-background border-border/60 rounded-lg"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Course items scroll list */}
        <div
          onScroll={handleScroll}
          className="max-h-60 overflow-y-auto space-y-1 text-xs pr-1 relative"
        >
          {allowAll && (
            <div
              onClick={() => {
                onChange("ALL", allLabel);
                setOpen(false);
              }}
              onMouseEnter={() => setHoveredCourse(null)}
              className={cn(
                "flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors hover:bg-muted/60",
                (value === "ALL" || !value) && "bg-primary/10 text-primary font-bold"
              )}
            >
              <span className="truncate">{allLabel}</span>
              {(value === "ALL" || !value) && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </div>
          )}

          {courses.map((course) => {
            const isSelected = value === course.id;
            return (
              <div
                key={course.id}
                onClick={() => {
                  onChange(course.id, course.name);
                  setSelectedCourseName(course.name);
                  setOpen(false);
                }}
                onMouseEnter={() => setHoveredCourse(course)}
                className={cn(
                  "group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all hover:bg-muted/70 border border-transparent hover:border-border/50",
                  isSelected && "bg-primary/10 text-primary font-bold border-primary/20"
                )}
              >
                <div className="truncate pr-2">
                  <p className="truncate font-semibold text-foreground group-hover:text-primary transition-colors">
                    {course.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {course.code && (
                      <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.2 rounded">
                        Mã: {course.code}
                      </span>
                    )}
                    {course.categoryName && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                        {course.categoryName}
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </div>
            );
          })}

          {loading && (
            <div className="p-3 text-center text-muted-foreground flex items-center justify-center gap-2 text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Đang nạp phân trang khóa học...</span>
            </div>
          )}

          {!loading && courses.length === 0 && (
            <div className="p-4 text-center text-muted-foreground text-xs">
              Không tìm thấy khóa học nào phù hợp.
            </div>
          )}
        </div>

        {/* 🌟 HOVER PREVIEW DETAILS CARD 🌟 */}
        {hoveredCourse && (
          <div className="mt-2 p-2.5 rounded-xl bg-muted/50 border border-border/60 text-xs space-y-1 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="font-mono font-bold text-primary">ID: {hoveredCourse.id}</span>
              {hoveredCourse.code && <span className="font-mono">Mã: {hoveredCourse.code}</span>}
            </div>
            <p className="font-bold text-foreground leading-snug">{hoveredCourse.name}</p>
            {hoveredCourse.categoryName && (
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium">
                <Tag className="h-3 w-3" /> {hoveredCourse.categoryName}
              </p>
            )}
          </div>
        )}

        {/* 🌟 PAGINATION FOOTER & INFINITE SCROLL STATS 🌟 */}
        <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-medium px-1">
          <span>
            Đã nạp <strong className="text-foreground">{courses.length}</strong> / {totalElements} khóa học
          </span>
          {hasMore && (
            <button
              type="button"
              onClick={fetchNextPage}
              disabled={loading}
              className="text-primary hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
            >
              Tải thêm <ChevronDown className="h-3 w-3" />
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
