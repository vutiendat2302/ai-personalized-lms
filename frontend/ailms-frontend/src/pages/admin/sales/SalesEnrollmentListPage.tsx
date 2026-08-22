import React, { useState, useEffect, useMemo } from "react";
import { salesApi, type EnrollmentItem } from "@/api/sales/salesApi";
import { StatusBadge } from "@/components/sales/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
import {
  UserCheck,
  Search,
  RefreshCw,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

/** Sinh mảng số trang hiển thị dạng rút gọn có dấu ba chấm khi nhiều trang. */
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

/** Màn hình quản lý ghi danh, kích hoạt và theo dõi thời hạn học viên kèm phân trang. */
export const SalesEnrollmentListPage: React.FC = () => {
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination states
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState("");

  /** Lấy danh sách ghi danh khóa học từ Backend API. */
  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const data = await salesApi.getEnrollments();
      setEnrollments(data);
    } catch (err) {
      console.error("Error fetching enrollments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  /** Định dạng chuỗi ngày ISO sang ngày/tháng/năm tiếng Việt. */
  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString("vi-VN");
  };

  /** Kiểm tra khóa học có sắp hết hạn trong vòng 7 ngày tới hay không. */
  const isExpiringWithin7Days = (expiresAtIso: string) => {
    const diffMs = new Date(expiresAtIso).getTime() - Date.now();
    const diffDays = diffMs / (1000 * 3600 * 24);
    return diffDays > 0 && diffDays <= 7;
  };

  /** Lọc danh sách ghi danh theo từ khóa tìm kiếm. */
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((e) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = e.studentName.toLowerCase().includes(term);
        const matchEmail = e.studentEmail.toLowerCase().includes(term);
        const matchCourse = e.courseName.toLowerCase().includes(term);
        if (!matchName && !matchEmail && !matchCourse) return false;
      }
      return true;
    });
  }, [enrollments, searchTerm]);

  // Phân trang dữ liệu sau khi lọc
  const totalElements = filteredEnrollments.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;
  const paginatedEnrollments = useMemo(() => {
    const start = page * pageSize;
    return filteredEnrollments.slice(start, start + pageSize);
  }, [filteredEnrollments, page, pageSize]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Ghi danh & Kích hoạt</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi trạng thái tham gia khóa học sau bán hàng, quản lý thời hạn gói & cảnh báo remarketing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEnrollments}
            disabled={loading}
            className="rounded-lg gap-2 cursor-pointer text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-4 rounded-xl border border-border/50 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search theo Tên học viên / Email / Tên khóa học..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            className="pl-9 text-xs h-9 bg-card"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border border-border/40 shadow-xs rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-b border-border/50">
              <TableHead className="font-bold text-xs">Học viên</TableHead>
              <TableHead className="font-bold text-xs">Khóa học</TableHead>
              <TableHead className="font-bold text-xs">Lớp học (nếu có)</TableHead>
              <TableHead className="font-bold text-xs">Trạng thái</TableHead>
              <TableHead className="font-bold text-xs">Cảnh báo hết hạn</TableHead>
              <TableHead className="font-bold text-xs">Ngày ghi danh</TableHead>
              <TableHead className="font-bold text-xs text-right">Chi tiết Timeline</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEnrollments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                  <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">Chưa có thông tin ghi danh nào</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedEnrollments.map((enr) => {
                const isWarningExpiring = isExpiringWithin7Days(enr.expiresAt);

                return (
                  <TableRow key={enr.id} className="border-b border-border/30 hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {enr.studentAvatar ? (
                            <img src={enr.studentAvatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            enr.studentName.charAt(0)
                          )}
                        </div>
                        <div className="truncate max-w-40">
                          <p className="text-xs font-bold text-foreground truncate">{enr.studentName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{enr.studentEmail}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-semibold text-xs text-foreground max-w-50 truncate">
                      {enr.courseName}
                    </TableCell>

                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      {enr.className || "Tự học"}
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={enr.status} size="sm" />
                    </TableCell>

                    {/* Section 3.7 Smart Expiration Warning */}
                    <TableCell>
                      {isWarningExpiring ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full border border-amber-300/60">
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                          Sắp hết hạn (&lt; 7 ngày)
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Hạn: {formatDate(enr.expiresAt)}</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(enr.enrolledAt)}
                    </TableCell>

                    <TableCell className="text-right">
                      <Link to={`/sales/enrollments/${enr.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 cursor-pointer">
                          <Eye className="h-3.5 w-3.5 text-indigo-600" />
                          Xem timeline
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Table Footer & Pagination */}
        {!loading && totalElements > 0 && (
          <div className="px-5 py-3 border-t border-border/40 bg-card flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium">
            <div className="text-muted-foreground text-xs sm:text-sm">
              Hiển thị <span className="font-semibold text-foreground">{totalElements === 0 ? 0 : page * pageSize + 1}</span> đến{" "}
              <span className="font-semibold text-foreground">{Math.min((page + 1) * pageSize, totalElements)}</span> trên{" "}
              <span className="font-semibold text-foreground">{totalElements}</span> bản ghi
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Số dòng/trang:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border rounded-lg font-bold">
                    <SelectValue placeholder={String(pageSize)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const pNum = parseInt(jumpPageInput, 10);
                  if (!isNaN(pNum) && pNum >= 1 && pNum <= totalPages) setPage(pNum - 1);
                }}
                className="flex items-center gap-1.5"
              >
                <span className="text-muted-foreground text-xs">Tới trang:</span>
                <Input
                  type="number"
                  min={1}
                  max={totalPages || 1}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  className="h-8 w-14 text-center text-xs font-bold bg-background border border-border rounded-lg"
                />
              </form>

              <div className="flex items-center gap-1">
                <Button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Trước
                </Button>

                {getPageNumbers(page, totalPages).map((p, idx) => {
                  if (p === "...") {
                    return (
                      <span key={`dots-${idx}`} className="px-1 text-muted-foreground font-bold">
                        ...
                      </span>
                    );
                  }
                  const pageNum = p as number;
                  const isCurrent = pageNum === page;
                  return (
                    <Button
                      key={pageNum}
                      variant={isCurrent ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className={`h-8 w-8 p-0 text-xs font-bold rounded-lg cursor-pointer ${
                        isCurrent ? "bg-primary text-primary-foreground shadow-xs" : ""
                      }`}
                    >
                      {pageNum + 1}
                    </Button>
                  );
                })}

                <Button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Sau <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
