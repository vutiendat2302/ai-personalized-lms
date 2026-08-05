import React, { useState, useEffect } from "react";
import { salesApi, type EnrollmentItem } from "@/api/sales/salesApi";
import { StatusBadge } from "@/components/sales/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
} from "lucide-react";
import { Link } from "react-router-dom";

export const SalesEnrollmentListPage: React.FC = () => {
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString("vi-VN");
  };

  const isExpiringWithin7Days = (expiresAtIso: string) => {
    const diffMs = new Date(expiresAtIso).getTime() - Date.now();
    const diffDays = diffMs / (1000 * 3600 * 24);
    return diffDays > 0 && diffDays <= 7;
  };

  const filteredEnrollments = enrollments.filter((e) => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = e.studentName.toLowerCase().includes(term);
      const matchEmail = e.studentEmail.toLowerCase().includes(term);
      const matchCourse = e.courseName.toLowerCase().includes(term);
      if (!matchName && !matchEmail && !matchCourse) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Ghi danh & Kích hoạt (Enrollments)</h1>
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
            {filteredEnrollments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                  <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">Chưa có thông tin ghi danh nào</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredEnrollments.map((enr) => {
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
      </Card>
    </div>
  );
};
