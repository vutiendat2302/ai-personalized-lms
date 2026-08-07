import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Calendar, Award, Building2, GraduationCap, Loader2, Shield } from "lucide-react";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";

interface MemberDetailModalProps {
  open: boolean;
  onClose: () => void;
  classId: string;
  userId: string;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  open,
  onClose,
  classId,
  userId,
}) => {
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && classId && userId) {
      fetchDetail();
    }
  }, [open, classId, userId]);

  const fetchDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminCourseClassApi.getMemberDetail(classId, userId);
      setDetail(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể tải hồ sơ chi tiết thành viên");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-3xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" /> Hồ Sơ Chi Tiết Thành Viên
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Thông tin quản lý hệ thống LMS của người dùng
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex justify-center items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> Đang tải thông tin hồ sơ...
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-red-50 text-xs text-red-700 font-medium">
            {error}
          </div>
        ) : detail ? (
          <div className="space-y-4 py-2">
            {/* Header profile card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3.5">
              {detail.avatarUrl ? (
                <img
                  src={detail.avatarUrl}
                  alt={detail.fullName}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {(detail.fullName || "U").substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base text-slate-900 truncate">
                    {detail.fullName}
                  </h3>
                  <Badge
                    className={
                      detail.roleInClass === "TEACHER"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : detail.roleInClass === "TA"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }
                  >
                    {detail.roleInClass === "TEACHER"
                      ? "Giảng viên"
                      : detail.roleInClass === "TA"
                      ? "Trợ giảng"
                      : "Học viên"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">@{detail.username}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">User ID: #{detail.userId}</p>
              </div>
            </div>

            {/* General Info list */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> Email liên hệ:
                </span>
                <span className="font-semibold text-slate-800">{detail.email || "Chưa cập nhật"}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> Số điện thoại:
                </span>
                <span className="font-semibold text-slate-800">{detail.phone || "Chưa cập nhật"}</span>
              </div>

              {detail.studentCode && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <span className="text-emerald-800 flex items-center gap-1.5 font-medium">
                    <GraduationCap className="h-3.5 w-3.5 text-emerald-600" /> Mã Học Viên:
                  </span>
                  <span className="font-bold text-emerald-900 font-mono">{detail.studentCode}</span>
                </div>
              )}

              {detail.employeeCode && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/50 border border-blue-100">
                  <span className="text-blue-800 flex items-center gap-1.5 font-medium">
                    <Shield className="h-3.5 w-3.5 text-blue-600" /> Mã Nhân Sự / Giảng Viên:
                  </span>
                  <span className="font-bold text-blue-900 font-mono">{detail.employeeCode}</span>
                </div>
              )}

              {detail.departmentName && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/50 border border-purple-100">
                  <span className="text-purple-800 flex items-center gap-1.5 font-medium">
                    <Building2 className="h-3.5 w-3.5 text-purple-600" /> Phòng Ban / Khoa:
                  </span>
                  <span className="font-semibold text-purple-900">{detail.departmentName}</span>
                </div>
              )}

              {detail.joinedAt && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" /> Ngày gia nhập lớp:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {new Date(detail.joinedAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              )}
            </div>

            {/* Degrees / Qualifications */}
            {detail.degrees && detail.degrees.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-amber-500" /> Trình độ Học vấn & Bằng cấp
                </p>
                <div className="space-y-1">
                  {detail.degrees.map((deg: any, idx: number) => (
                    <div key={idx} className="p-2 rounded-lg bg-amber-50/50 border border-amber-100 text-[11px]">
                      <p className="font-bold text-amber-950">{deg.degreeName || deg.title}</p>
                      <p className="text-slate-600">{deg.institution || deg.universityName} • {deg.yearOfGraduation || "Đã tốt nghiệp"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl w-full">
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
