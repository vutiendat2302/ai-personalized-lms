import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { salesApi, type EnrollmentItem } from "@/api/sales/salesApi";
import { StatusBadge } from "@/components/sales/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock, ShoppingBag, CheckCircle2, User } from "lucide-react";

export const SalesEnrollmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState<EnrollmentItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    salesApi.getEnrollmentById(id).then((res) => {
      setEnrollment(res);
      setLoading(false);
    });
  }, [id]);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "N/A";
    return new Date(isoStr).toLocaleDateString("vi-VN");
  };

  if (loading) return <div className="p-12 text-center text-sm font-semibold">Đang tải thông tin ghi danh...</div>;
  if (!enrollment) return <div className="p-12 text-center text-sm font-semibold">Không tìm thấy bản ghi</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/sales/enrollments")}
          className="rounded-lg gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại danh sách
        </Button>
      </div>

      <Card className="border border-border/40 shadow-xs rounded-xl p-6 bg-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">{enrollment.studentName}</h1>
              <StatusBadge status={enrollment.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Khóa học: <span className="font-bold text-foreground">{enrollment.courseName}</span>
            </p>
          </div>

          <div className="text-xs text-right">
            <span className="text-muted-foreground block">Thời hạn ghi danh hiện tại:</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
              {formatDate(enrollment.enrolledAt)} → {formatDate(enrollment.expiresAt)}
            </span>
          </div>
        </div>

        {/* Vertical Timeline of EnrollmentPackages (Specification 3.7) */}
        <div className="space-y-4 pt-2">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-600" />
            Lịch sử các lần gia hạn / gia nhập gói (Vertical Package Timeline)
          </h3>

          <div className="relative border-l-2 border-indigo-200 dark:border-indigo-800 ml-4 space-y-6 pl-6 pt-2">
            {enrollment.packageTimeline.map((record) => (
              <div key={record.id} className="relative group">
                {/* Dot */}
                <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-indigo-600 border-2 border-white shadow-xs" />

                <div className="p-4 bg-muted/40 rounded-xl border border-border/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-foreground">{record.packageName}</h4>
                    <span className="text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 px-2 py-0.5 rounded">
                      {formatDate(record.activatedAt)} → {formatDate(record.expiresAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs pt-1 border-t border-border/40">
                    <Link
                      to={`/sales/orders/${record.orderId}`}
                      className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Link ngược về Order: #{record.orderId}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
