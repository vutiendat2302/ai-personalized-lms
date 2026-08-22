import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { reviewApi } from "@/api/reviews/reviewApi";
import { courseApi } from "@/api/courses/courseApi";
import type { CourseResponse } from "@/types/admin";
import { ReviewDetailModal, type ReviewItem } from "@/components/admin/review/ReviewDetailModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DatePickerInput, formatDateDisplay } from "@/components/ui/DatePickerInput";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Search,
  RefreshCw,
  RotateCcw,
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle2,
  Trash2,
  EyeOff,
  MessageSquare,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Loader2,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

const getPageNumbers = (currentPage: number, total: number) => {
  const pages: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 0; i < total; i++) pages.push(i);
  } else {
    pages.push(0);
    if (currentPage > 2) pages.push("...");
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(total - 2, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < total - 3) pages.push("...");
    pages.push(total - 1);
  }
  return pages;
};

export const ReviewModerationPage: React.FC = () => {
  // Data States
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [selectedReviewIds, setSelectedReviewIds] = useState<(string | number)[]>([]);

  // Overview Stats
  const [avgRating, setAvgRating] = useState<number>(0);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState(false);

  // Filter & Search States
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterRating, setFilterRating] = useState<string>("1");
  const [filterCourseId, setFilterCourseId] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Course Filter Popover Search & Pagination States
  const [coursePage, setCoursePage] = useState(0);
  const [courseTotalPages, setCourseTotalPages] = useState(1);
  const [courseSearchKeyword, setCourseSearchKeyword] = useState("");
  const [coursePopoverOpen, setCoursePopoverOpen] = useState(false);
  const [selectedCourseName, setSelectedCourseName] = useState<string>("Tất cả khóa học");

  // Multi-column sorting (Mặc định: ngày tạo mới nhất createdAt:DESC)
  const [sortRules, setSortRules] = useState<Array<{ field: string; dir: "ASC" | "DESC" }>>([
    { field: "createdAt", dir: "DESC" },
  ]);

  // Pagination States
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  // Loading & Toast States
  const [loading, setLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  // Modal States
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedReviewForDetail, setSelectedReviewForDetail] = useState<ReviewItem | null>(null);

  // Confirm Delete, Approve & Reject Dialog States
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmBulkApprove, setConfirmBulkApprove] = useState(false);
  const [confirmBulkReject, setConfirmBulkReject] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetReview, setRejectTargetReview] = useState<ReviewItem | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const showBanner = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setTimeout(() => setErrorBanner(""), 3500);
    } else {
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(""), 3500);
    }
  };

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCourses(courseSearchKeyword, coursePage);
    }, 250);
    return () => clearTimeout(timer);
  }, [courseSearchKeyword, coursePage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReviews();
    }, 300);
    return () => clearTimeout(timer);
  }, [
    page,
    pageSize,
    searchKeyword,
    filterRating,
    filterCourseId,
    filterStatus,
    filterStartDate,
    filterEndDate,
    sortRules,
  ]);

  const fetchCourses = async (keyword = courseSearchKeyword, p = coursePage) => {
    try {
      const res = await courseApi.searchCourses({
        page: p,
        size: 5,
        keyword: keyword.trim() || undefined,
      });
      const pageData = res?.data?.data;
      if (pageData) {
        setCourses(pageData.content || []);
        setCourseTotalPages(pageData.totalPages || 1);
      } else {
        setCourses([]);
        setCourseTotalPages(1);
      }
    } catch (err) {
      console.warn("Failed to fetch courses with search/pagination for review filter", err);
      setCourses([]);
      setCourseTotalPages(1);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const [avgRes, activeRes, pendingRes] = await Promise.all([
        reviewApi.getAverageRating().catch(() => ({ data: { data: 0 } })),
        reviewApi.searchReviews({ status: "ACTIVE", page: 0, size: 1 }).catch(() => null),
        reviewApi.searchReviews({ status: "INACTIVE", page: 0, size: 1 }).catch(() => null),
      ]);

      const avgVal = avgRes?.data?.data ?? 0;
      setAvgRating(typeof avgVal === "number" ? avgVal : Number(avgVal) || 0);

      if (activeRes?.data?.data?.totalElements !== undefined) {
        setActiveCount(activeRes.data.data.totalElements);
      }
      if (pendingRes?.data?.data?.totalElements !== undefined) {
        setPendingCount(pendingRes.data.data.totalElements);
      }
    } catch (err) {
      console.error("Error fetching review stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const sortParams =
        sortRules.length > 0
          ? sortRules.map((r) => `${r.field}:${r.dir.toLowerCase()}`)
          : ["id:desc"];

      const params: any = {
        page,
        size: pageSize,
        sort: sortParams,
        keyword: searchKeyword.trim() || undefined,
      };

      if (filterRating !== "ALL") {
        params.rating = Number(filterRating);
      }
      if (filterCourseId !== "ALL") {
        params.courseId = filterCourseId;
      }
      if (filterStatus !== "ALL") {
        params.status = filterStatus;
      }
      if (filterStartDate) {
        params.createdFrom = `${filterStartDate}T00:00:00`;
      }
      if (filterEndDate) {
        params.createdTo = `${filterEndDate}T23:59:59`;
      }

      const res = await reviewApi.searchReviews(params);

      if (res?.data?.success && res.data.data?.content) {
        const pageData = res.data.data;
        setReviews(pageData.content || []);
        setTotalPages(pageData.totalPages || 1);
        setTotalElements(pageData.totalElements || 0);
      } else {
        setReviews([]);
        setTotalPages(1);
        setTotalElements(0);
      }
    } catch (err: any) {
      showBanner(err.message || "Lỗi khi tải danh sách đánh giá", true);
      setReviews([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchReviews();
  };

  const handleResetFilters = () => {
    setSearchKeyword("");
    setFilterRating("1");
    setFilterCourseId("ALL");
    setSelectedCourseName("Tất cả khóa học");
    setCourseSearchKeyword("");
    setCoursePage(0);
    setFilterStatus("ALL");
    setFilterStartDate("");
    setFilterEndDate("");
    setSortRules([{ field: "createdAt", dir: "DESC" }]);
    setPage(0);
  };

  // Multi-column sorting helper
  const handleSort = (field: string) => {
    setSortRules((prevRules) => {
      const existingIndex = prevRules.findIndex((r) => r.field === field);

      if (existingIndex === -1) {
        const filtered = prevRules.filter((r) => r.field !== "id");
        return [...filtered, { field, dir: "ASC" }];
      } else {
        const currentRule = prevRules[existingIndex];
        if (currentRule.dir === "ASC") {
          const updated = [...prevRules];
          updated[existingIndex] = { field, dir: "DESC" };
          return updated;
        } else {
          const updated = prevRules.filter((r) => r.field !== field);
          return updated.length === 0 ? [{ field: "id", dir: "DESC" }] : updated;
        }
      }
    });
    setPage(0);
  };

  const getSortRuleInfo = (field: string) => {
    const idx = sortRules.findIndex((r) => r.field === field);
    if (idx === -1) return null;
    return { priority: idx + 1, dir: sortRules[idx].dir };
  };

  const renderSortIcon = (field: string) => {
    const info = getSortRuleInfo(field);
    if (!info) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />;
    return (
      <span className="flex items-center gap-0.5 text-primary font-bold text-xs">
        {info.dir === "ASC" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
        {sortRules.length > 1 && <span className="text-[10px]">{info.priority}</span>}
      </span>
    );
  };

  const handleSelectAllReviews = (checked: boolean) => {
    if (checked) setSelectedReviewIds(reviews.map((r) => r.id));
    else setSelectedReviewIds([]);
  };

  const handleSelectReview = (id: string | number) => {
    if (selectedReviewIds.includes(id)) {
      setSelectedReviewIds(selectedReviewIds.filter((i) => i !== id));
    } else {
      setSelectedReviewIds([...selectedReviewIds, id]);
    }
  };

  const handleOpenDetail = (reviewItem: ReviewItem) => {
    setSelectedReviewForDetail(reviewItem);
    setDetailModalOpen(true);
  };

  const handleModerateReview = async (reviewItem: ReviewItem, approve: boolean) => {
    if (!approve) {
      setRejectTargetReview(reviewItem);
      setRejectionReasonInput("Nội dung nhận xét không phù hợp tiêu chuẩn");
      setRejectModalOpen(true);
      return;
    }

    setActionBusy(true);
    try {
      await reviewApi.moderate(reviewItem.id, true);
      showBanner("Đã duyệt & hiển thị đánh giá thành công!");
      fetchReviews();
      fetchStats();
    } catch (err: any) {
      showBanner(err?.response?.data?.message || err.message || "Lỗi duyệt đánh giá", true);
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetReview) return;
    setActionBusy(true);
    try {
      await reviewApi.moderate(
        rejectTargetReview.id,
        false,
        rejectionReasonInput.trim() || "Nội dung nhận xét không phù hợp tiêu chuẩn"
      );
      showBanner("Đã từ chối / ẩn bài đánh giá.");
      setRejectModalOpen(false);
      setRejectTargetReview(null);
      fetchReviews();
      fetchStats();
    } catch (err: any) {
      showBanner(err?.response?.data?.message || err.message || "Lỗi khi ẩn bài đánh giá", true);
    } finally {
      setActionBusy(false);
    }
  };

  const confirmDeleteSingle = async () => {
    if (!confirmDeleteId) return;
    setActionBusy(true);
    try {
      await reviewApi.deleteReview(confirmDeleteId);
      showBanner("Đã xóa vĩnh viễn bài đánh giá thành công!");
      if (detailModalOpen) setDetailModalOpen(false);
      fetchReviews();
      fetchStats();
    } catch (err: any) {
      showBanner(err?.response?.data?.message || err.message || "Lỗi khi xóa bài đánh giá", true);
    } finally {
      setConfirmDeleteId(null);
      setActionBusy(false);
    }
  };

  const confirmBulkDeleteReviews = async () => {
    if (selectedReviewIds.length === 0) return;
    setActionBusy(true);
    try {
      await Promise.all(selectedReviewIds.map((id) => reviewApi.deleteReview(id)));
      showBanner(`Đã xóa thành công ${selectedReviewIds.length} bài đánh giá!`);
      setSelectedReviewIds([]);
      fetchReviews();
      fetchStats();
    } catch (err: any) {
      showBanner("Lỗi khi xóa các bài đánh giá đã chọn", true);
    } finally {
      setConfirmBulkDelete(false);
      setActionBusy(false);
    }
  };

  const confirmBulkApproveReviews = async () => {
    if (selectedReviewIds.length === 0) return;
    setActionBusy(true);
    try {
      await Promise.all(selectedReviewIds.map((id) => reviewApi.moderate(id, true)));
      showBanner(`Đã duyệt công khai ${selectedReviewIds.length} bài đánh giá thành công!`);
      setSelectedReviewIds([]);
      fetchReviews();
      fetchStats();
    } catch (err: any) {
      showBanner("Lỗi khi duyệt hàng loạt bài đánh giá", true);
    } finally {
      setConfirmBulkApprove(false);
      setActionBusy(false);
    }
  };

  const confirmBulkRejectReviews = async () => {
    if (selectedReviewIds.length === 0) return;
    setActionBusy(true);
    try {
      await Promise.all(
        selectedReviewIds.map((id) =>
          reviewApi.moderate(id, false, "Ẩn hàng loạt bởi quản trị viên")
        )
      );
      showBanner(`Đã ẩn ${selectedReviewIds.length} bài đánh giá thành công!`);
      setSelectedReviewIds([]);
      fetchReviews();
      fetchStats();
    } catch (err: any) {
      showBanner("Lỗi khi ẩn hàng loạt bài đánh giá", true);
    } finally {
      setConfirmBulkReject(false);
      setActionBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-none w-full px-4 sm:px-6 lg:px-10 py-6 space-y-8 animate-in fade-in-50 duration-300">
      {/* Toast Banners */}
      {successBanner && (
        <div className="fixed bottom-6 right-6 z-9999 flex items-center gap-3 rounded-2xl bg-emerald-600 text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="fixed bottom-6 right-6 z-9999 flex items-center gap-3 rounded-2xl bg-red-600 text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{errorBanner}</span>
        </div>
      )}

      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/30 pb-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3 mt-2">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
              <MessageSquare className="h-7 w-7" />
            </div>
            <span>Kiểm duyệt đánh giá</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => {
              fetchReviews();
              fetchStats();
            }}
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5 font-semibold cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới
          </Button>
        </div>
      </div>

      {/* KPI Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Tổng số đánh giá */}
        <Card
          onClick={() => {
            handleResetFilters();
            showBanner("Đã hiển thị toàn bộ đánh giá!");
          }}
          className="border-border shadow-xs bg-card overflow-hidden relative cursor-pointer hover:border-primary/50 transition-all"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
            <MessageSquare className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
              Tổng số đánh giá
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-foreground flex items-center gap-2 mt-1">
              <span className="text-primary">{statsLoading ? "..." : totalElements}</span>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Card 2: Điểm sao trung bình */}
        <Card className="border-border shadow-xs bg-card overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-500">
            <Star className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
              Điểm sao trung bình
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-foreground flex items-center gap-2 mt-1">
              <span className="text-amber-500">{statsLoading ? "..." : avgRating.toFixed(1)}</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(avgRating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Card 3: Đánh giá Công khai */}
        <Card
          onClick={() => {
            handleResetFilters();
            setFilterStatus("ACTIVE");
            showBanner("Đã lọc bài đánh giá công khai!");
          }}
          className="border-border shadow-xs bg-card overflow-hidden relative cursor-pointer hover:border-success-forest/50 transition-all"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 text-success-forest">
            <ShieldCheck className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
              Đã duyệt công khai
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-success-forest flex items-center gap-2 mt-1">
              <span>{activeCount}</span>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Card 4: Chờ kiểm duyệt */}
        <Card
          onClick={() => {
            handleResetFilters();
            setFilterStatus("INACTIVE");
            showBanner("Đã lọc bài đánh giá chờ kiểm duyệt!");
          }}
          className="border-border shadow-xs bg-card overflow-hidden relative cursor-pointer hover:border-amber-500/50 transition-all"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-500">
            <ShieldAlert className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
              Chờ kiểm duyệt
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-amber-500 flex items-center gap-2 mt-1">
              <span>{pendingCount}</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Datatable Section */}
      <div className="space-y-4">
        {/* Search & Filter Bar */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
              {/* Keyword input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm kiếm theo học viên, khóa học hoặc nội dung..."
                  className="pl-10 h-10 rounded-xl"
                />
              </div>

              {/* Star Rating Select */}
              <div className="w-full lg:w-44">
                <Select value={filterRating} onValueChange={setFilterRating}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Lọc theo sao" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả số sao</SelectItem>
                    <SelectItem value="5">5 sao</SelectItem>
                    <SelectItem value="4">4 sao</SelectItem>
                    <SelectItem value="3">3 sao</SelectItem>
                    <SelectItem value="2">2 sao</SelectItem>
                    <SelectItem value="1">1 sao</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Course Select Filter Popover (Search + Pagination) */}
              <div className="w-full lg:w-60">
                <Popover open={coursePopoverOpen} onOpenChange={setCoursePopoverOpen}>
                  <PopoverTrigger
                    nativeButton={true}
                    render={
                      <Button
                        variant="outline"
                        type="button"
                        className="h-10 w-full justify-between rounded-xl font-normal text-xs bg-background border-input cursor-pointer"
                      >
                        <span className="truncate">{selectedCourseName}</span>
                        <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-72 p-3 space-y-3 z-50 rounded-2xl shadow-xl border-border/50" align="start">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={courseSearchKeyword}
                        onChange={(e) => {
                          setCourseSearchKeyword(e.target.value);
                          setCoursePage(0);
                        }}
                        placeholder="Tìm tên khóa học..."
                        className="pl-8 h-8 text-xs rounded-lg"
                      />
                    </div>

                    {/* Course List */}
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterCourseId("ALL");
                          setSelectedCourseName("Tất cả khóa học");
                          setCoursePopoverOpen(false);
                          setPage(0);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                          filterCourseId === "ALL" ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                        }`}
                      >
                        <span>Tất cả khóa học</span>
                        {filterCourseId === "ALL" && <Check className="h-3.5 w-3.5" />}
                      </button>

                      {courses.length > 0 ? (
                        courses.map((c) => {
                          const isSelected = String(c.id) === String(filterCourseId);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setFilterCourseId(String(c.id));
                                setSelectedCourseName(c.name || `Khóa #${c.id}`);
                                setCoursePopoverOpen(false);
                                setPage(0);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                isSelected ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                              }`}
                            >
                              <span className="truncate pr-2">{c.name || `Khóa #${c.id}`}</span>
                              {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-3 text-center text-xs text-muted-foreground">Không tìm thấy khóa học</div>
                      )}
                    </div>

                    {/* Mini Pagination */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={coursePage === 0}
                        onClick={() => setCoursePage((p) => Math.max(0, p - 1))}
                        className="h-7 px-2 text-xs"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" /> Trước
                      </Button>

                      <span className="font-semibold font-mono">
                        Trang {coursePage + 1}/{courseTotalPages}
                      </span>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={coursePage >= courseTotalPages - 1}
                        onClick={() => setCoursePage((p) => p + 1)}
                        className="h-7 px-2 text-xs"
                      >
                        Sau <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Status Select */}
              <div className="w-full lg:w-48">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Lọc trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                    <SelectItem value="ACTIVE">Đã duyệt</SelectItem>
                    <SelectItem value="INACTIVE">Chờ kiểm duyệt</SelectItem>
                    <SelectItem value="REJECTED">Đã ẩn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filters & Reset Button */}
              <div className="flex items-center gap-2">
                <DatePickerInput
                  value={filterStartDate}
                  onChange={setFilterStartDate}
                  placeholder="Từ ngày"
                  className="h-10 w-32 rounded-xl text-xs"
                />
                <span className="text-muted-foreground">-</span>
                <DatePickerInput
                  value={filterEndDate}
                  onChange={setFilterEndDate}
                  placeholder="Đến ngày"
                  className="h-10 w-32 rounded-xl text-xs"
                />

                <Button
                  type="button"
                  onClick={handleResetFilters}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl cursor-pointer"
                  title="Đặt lại bộ lọc"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Bulk Action Bar if items selected */}
        {selectedReviewIds.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">
                Đã chọn {selectedReviewIds.length} bài đánh giá
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedReviewIds([])}
                className="h-7 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Bỏ chọn
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => setConfirmBulkApprove(true)}
                size="sm"
                disabled={actionBusy}
                className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" /> Duyệt công khai ({selectedReviewIds.length})
              </Button>

              <Button
                onClick={() => setConfirmBulkReject(true)}
                size="sm"
                variant="outline"
                disabled={actionBusy}
                className="rounded-xl font-bold border-amber-500/30 text-amber-600 hover:bg-amber-500/10 gap-1.5 cursor-pointer"
              >
                <EyeOff className="h-4 w-4" /> Ẩn bài ({selectedReviewIds.length})
              </Button>

              <Button
                onClick={() => setConfirmBulkDelete(true)}
                size="sm"
                variant="destructive"
                disabled={actionBusy}
                className="rounded-xl font-bold gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="h-4 w-4" /> Xóa vĩnh viễn ({selectedReviewIds.length})
              </Button>
            </div>
          </div>
        )}

        {/* Table View */}
        <Card className="border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-12 text-center">
                  <Checkbox
                    checked={reviews.length > 0 && selectedReviewIds.length === reviews.length}
                    onCheckedChange={(checked) => handleSelectAllReviews(Boolean(checked))}
                  />
                </TableHead>
                <TableHead>Học viên</TableHead>
                <TableHead>Khóa học</TableHead>
                <TableHead
                  onClick={() => handleSort("rating")}
                  className="cursor-pointer hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Đánh giá sao</span>
                    {renderSortIcon("rating")}
                  </div>
                </TableHead>
                <TableHead className="max-w-xs">Nội dung nhận xét</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead
                  onClick={() => handleSort("createdAt")}
                  className="cursor-pointer hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Ngày tạo</span>
                    {renderSortIcon("createdAt")}
                  </div>
                </TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      <span className="text-xs font-semibold">Đang tải danh sách đánh giá...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : reviews.length > 0 ? (
                reviews.map((r) => {
                  const isSelected = selectedReviewIds.includes(r.id);
                  const isActive = r.status === "ACTIVE";
                  const isRejected = r.status === "REJECTED";

                  return (
                    <TableRow key={r.id} className={isSelected ? "bg-primary/5" : undefined}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelectReview(r.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20 overflow-hidden">
                            {r.avatarUrl ? (
                              <img src={r.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (r.userName || "HV").substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-foreground truncate">
                              {r.userName || "Học viên ẩn danh"}
                            </p>
                            {r.schoolName && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {r.schoolName}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0 max-w-48">
                          <p className="font-semibold text-xs text-foreground truncate">
                            {r.courseName || `Khóa #${r.courseId}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i < r.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-1">
                            {r.rating}.0
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {r.comment || <span className="italic text-muted-foreground/60">(Không có nhận xét)</span>}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isActive
                              ? "bg-success-forest/10 text-success-forest border-success-forest/20"
                              : isRejected
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          }`}
                        >
                          {isActive ? "Đã duyệt" : isRejected ? "Đã ẩn" : "Chờ duyệt"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.createdAt ? formatDateDisplay(r.createdAt) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => handleOpenDetail(r)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {isActive ? (
                            <Button
                              onClick={() => handleModerateReview(r, false)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-amber-600 hover:bg-amber-500/10 cursor-pointer"
                              title="Ẩn / Từ chối đánh giá"
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleModerateReview(r, true)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                              title="Duyệt / Công khai"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            onClick={() => setConfirmDeleteId(r.id)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-red-600 hover:bg-red-500/10 cursor-pointer"
                            title="Xóa đánh giá"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Sparkles className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm font-semibold">Không tìm thấy bài đánh giá nào</p>
                      <p className="text-xs">Thử thay đổi từ khóa hoặc bộ lọc tìm kiếm.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/40 text-xs font-semibold text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>Hiển thị</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-20 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>bản ghi / trang (Tổng: {totalElements})</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {getPageNumbers(page, totalPages).map((p, idx) =>
                  typeof p === "number" ? (
                    <Button
                      key={idx}
                      variant={p === page ? "default" : "outline"}
                      size="icon"
                      onClick={() => setPage(p)}
                      className={`h-8 w-8 rounded-lg text-xs font-bold ${
                        p === page ? "bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {p + 1}
                    </Button>
                  ) : (
                    <span key={idx} className="px-1 text-muted-foreground">
                      ...
                    </span>
                  )
                )}
              </div>

              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const targetPage = Math.max(1, Math.min(totalPages, Number(jumpPageInput))) - 1;
                  setPage(targetPage);
                }}
                className="flex items-center gap-1 ml-2"
              >
                <span className="text-xs">Đến trang:</span>
                <Input
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  className="h-8 w-14 text-center rounded-lg text-xs"
                />
              </form>
            </div>
          </div>
        </Card>
      </div>

      {/* Review Detail Modal */}
      <ReviewDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        review={selectedReviewForDetail}
        onModerate={handleModerateReview}
        onDelete={async (id) => {
          setConfirmDeleteId(id);
        }}
      />

      {/* Confirm Delete Single Dialog */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
        title="Xác nhận xóa đánh giá"
        description="Bạn có chắc chắn muốn xóa vĩnh viễn bài đánh giá này không? Hành động này không thể hoàn tác."
        onConfirm={confirmDeleteSingle}
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
        variant="destructive"
      />

      {/* Confirm Bulk Approve Dialog */}
      <ConfirmDialog
        open={confirmBulkApprove}
        onOpenChange={setConfirmBulkApprove}
        title={`Duyệt hàng loạt ${selectedReviewIds.length} đánh giá`}
        description={`Bạn có chắc chắn muốn duyệt công khai ${selectedReviewIds.length} bài đánh giá đã chọn lên hệ thống không?`}
        onConfirm={confirmBulkApproveReviews}
        confirmText="Duyệt tất cả"
        cancelText="Hủy"
      />

      {/* Confirm Bulk Reject Dialog */}
      <ConfirmDialog
        open={confirmBulkReject}
        onOpenChange={setConfirmBulkReject}
        title={`Ẩn hàng loạt ${selectedReviewIds.length} đánh giá`}
        description={`Bạn có chắc chắn muốn ẩn ${selectedReviewIds.length} bài đánh giá đã chọn không?`}
        onConfirm={confirmBulkRejectReviews}
        confirmText="Ẩn tất cả"
        cancelText="Hủy"
        variant="destructive"
      />

      {/* Confirm Bulk Delete Dialog */}
      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title={`Xóa hàng loạt ${selectedReviewIds.length} đánh giá`}
        description={`Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedReviewIds.length} bài đánh giá đã chọn không? Hành động này không thể hoàn tác.`}
        onConfirm={confirmBulkDeleteReviews}
        confirmText="Xóa tất cả chọn"
        cancelText="Hủy"
        variant="destructive"
      />

      {/* Rejection Reason Shadcn Dialog */}
      <Dialog open={rejectModalOpen} onOpenChange={(open) => !open && setRejectModalOpen(false)}>
        <DialogContent className="max-w-md rounded-3xl p-6 space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <EyeOff className="h-5 w-5" />
              <span>Ẩn / Từ chối bài đánh giá</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Nhập lý do ẩn hoặc từ chối hiển thị bài đánh giá này trên hệ thống.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">Lý do ẩn đánh giá:</label>
            <Textarea
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="Nhập lý do ẩn bài đánh giá..."
              className="rounded-2xl text-xs h-28 focus-visible:ring-amber-500/20"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
              className="rounded-xl font-semibold text-xs"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={actionBusy}
              onClick={handleConfirmReject}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              {actionBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Xác nhận ẩn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewModerationPage;
