import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  User,
  X,
  AlertCircle,
} from "lucide-react";

export interface ApprovalRequest {
  id: string;
  objectType: "LEAVE_REQUEST" | "CLASS_TRANSFER_REQUEST" | "TEACHER_CHANGE_REQUEST" | "CONTRACT_EXPIRY";
  objectId: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  approverId: string;
  approverName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  metadata: Record<string, any>;
  rejectReason?: string;
  auditLogs?: { timestamp: string; action: string; actor: string }[];
}

export const ApprovalCenterPage: React.FC = () => {
  const { auth } = useAuth();
  const currentUserId = auth.user?.id || "usr-1";

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [rejectModalRequest, setRejectModalRequest] = useState<ApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [requests, setRequests] = useState<ApprovalRequest[]>([
    {
      id: "app-101",
      objectType: "LEAVE_REQUEST",
      objectId: "lv-1",
      requesterId: "usr-4",
      requesterName: "Lê Minh Triết",
      requesterEmail: "triet.lm@outlook.com",
      approverId: "usr-1",
      approverName: "Vũ Tiến Đạt (Admin)",
      status: "PENDING",
      createdAt: "2026-07-24T08:00:00Z",
      metadata: {
        startDate: "2026-07-28",
        endDate: "2026-07-29",
        reason: "Nghỉ phép cá nhân đi khám sức khỏe định kỳ",
        days: 2,
      },
      auditLogs: [
        { timestamp: "2026-07-24 08:00", action: "Tạo đơn xin nghỉ phép", actor: "Lê Minh Triết" },
      ],
    },
    {
      id: "app-102",
      objectType: "CLASS_TRANSFER_REQUEST",
      objectId: "enr-55",
      requesterId: "usr-2",
      requesterName: "Bùi Xuân Huấn",
      requesterEmail: "huanrose@ailms.edu.vn",
      approverId: "usr-1",
      approverName: "Vũ Tiến Đạt (Admin)",
      status: "PENDING",
      createdAt: "2026-07-23T14:20:00Z",
      metadata: {
        courseName: "Cấu trúc dữ liệu & Giải thuật C++",
        fromClass: "Lớp Nhóm C++ K19 (Thứ 2 - 19:30)",
        toClass: "Lớp Nhóm C++ K20 (Thứ 7 - 09:00)",
        reason: "Trùng lịch học ca tối ở đại học",
      },
      auditLogs: [
        { timestamp: "2026-07-23 14:20", action: "Tạo yêu cầu chuyển lớp", actor: "Bùi Xuân Huấn" },
      ],
    },
    {
      id: "app-103",
      objectType: "TEACHER_CHANGE_REQUEST",
      objectId: "enr-88",
      requesterId: "usr-3",
      requesterName: "Nguyễn Hải Yến",
      requesterEmail: "yen.nh@gmail.com",
      approverId: "usr-1",
      approverName: "Vũ Tiến Đạt (Admin)",
      status: "APPROVED",
      createdAt: "2026-07-22T09:10:00Z",
      metadata: {
        courseName: "Nhập môn Python AI Engineer (1 kèm 1)",
        currentTeacher: "Trần Văn Nam",
        reason: "Muốn học cùng gia sư có chuyên môn sâu hơn về Deep Learning",
      },
      auditLogs: [
        { timestamp: "2026-07-22 09:10", action: "Tạo yêu cầu đổi gia sư 1-1", actor: "Nguyễn Hải Yến" },
        { timestamp: "2026-07-22 10:15", action: "Đã phê duyệt & Đổi gia sư", actor: "Vũ Tiến Đạt" },
      ],
    },
  ]);

  const handleApprove = (req: ApprovalRequest) => {
    // Rule: Cannot approve self-created requests
    if (req.requesterId === currentUserId) {
      alert("Bạn không thể tự phê duyệt yêu cầu do chính mình tạo ra.");
      return;
    }

    setRequests((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? {
              ...r,
              status: "APPROVED",
              auditLogs: [
                ...(r.auditLogs || []),
                {
                  timestamp: new Date().toLocaleString("vi-VN"),
                  action: "Đã phê duyệt yêu cầu",
                  actor: auth.user?.fullName || "Admin",
                },
              ],
            }
          : r
      )
    );
    alert(`Đã phê duyệt yêu cầu ${req.id} thành công. Hệ thống đã gửi email thông báo.`);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối.");
      return;
    }
    if (!rejectModalRequest) return;

    setSubmitting(true);
    setTimeout(() => {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === rejectModalRequest.id
            ? {
                ...r,
                status: "REJECTED",
                rejectReason,
                auditLogs: [
                  ...(r.auditLogs || []),
                  {
                    timestamp: new Date().toLocaleString("vi-VN"),
                    action: `Từ chối yêu cầu (Lý do: ${rejectReason})`,
                    actor: auth.user?.fullName || "Admin",
                  },
                ],
              }
            : r
        )
      );

      alert(`Đã từ chối yêu cầu ${rejectModalRequest.id}. Email giải thích lý do đã được gửi.`);
      setRejectModalRequest(null);
      setRejectReason("");
      setSubmitting(false);
    }, 500);
  };

  const renderSummaryText = (req: ApprovalRequest) => {
    switch (req.objectType) {
      case "LEAVE_REQUEST":
        return `Xin nghỉ phép từ ${req.metadata.startDate} đến ${req.metadata.endDate} (${req.metadata.days} ngày). Lý do: ${req.metadata.reason}`;
      case "CLASS_TRANSFER_REQUEST":
        return `Chuyển từ "${req.metadata.fromClass}" sang "${req.metadata.toClass}". Lý do: ${req.metadata.reason}`;
      case "TEACHER_CHANGE_REQUEST":
        return `Yêu cầu đổi gia sư cho khóa "${req.metadata.courseName}". Gia sư hiện tại: ${req.metadata.currentTeacher}. Lý do: ${req.metadata.reason}`;
      case "CONTRACT_EXPIRY":
        return `Gia hạn hợp đồng thử việc / Chuyển chính thức cho nhân viên ${req.requesterName}`;
      default:
        return JSON.stringify(req.metadata);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesTab = activeTab === "ALL" || req.objectType === activeTab;
    const matchesSearch =
      req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requesterEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span>Trung Tâm Phê Duyệt (Approval Center)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Duyệt tập trung Đơn nghỉ phép, Yêu cầu đổi lớp, Đổi gia sư 1-1 và Hợp đồng nhân sự.
          </p>
        </div>
        <Button onClick={() => setRequests([...requests])} variant="outline" size="sm" className="rounded-xl gap-1 text-xs font-bold">
          <RefreshCw className="h-3.5 w-3.5" /> Làm mới
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: "ALL", label: "Tất cả yêu cầu" },
            { id: "LEAVE_REQUEST", label: "Đơn nghỉ phép" },
            { id: "CLASS_TRANSFER_REQUEST", label: "Yêu cầu đổi lớp" },
            { id: "TEACHER_CHANGE_REQUEST", label: "Duyệt đổi gia sư" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                activeTab === t.id
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-card text-foreground border-border/70 hover:border-primary/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Tìm người gửi, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((req) => {
          const isSelfCreated = req.requesterId === currentUserId;

          return (
            <Card key={req.id} className="border border-border/80 rounded-2xl bg-card shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {req.requesterName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-foreground text-sm">{req.requesterName}</h4>
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-extrabold uppercase">
                        {req.objectType.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{req.requesterEmail} • Tạo lúc: {req.createdAt}</p>
                  </div>
                </div>

                <div>
                  {req.status === "APPROVED" && (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-extrabold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Đã duyệt
                    </span>
                  )}
                  {req.status === "REJECTED" && (
                    <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 text-xs font-extrabold flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" /> Đã từ chối
                    </span>
                  )}
                  {req.status === "PENDING" && (
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-extrabold flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Chờ duyệt
                    </span>
                  )}
                </div>
              </div>

              {/* Summary Text */}
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 text-xs text-foreground space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Nội dung yêu cầu:
                </span>
                <p className="font-medium leading-relaxed">{renderSummaryText(req)}</p>
                {req.rejectReason && (
                  <p className="text-rose-600 font-bold pt-1">Lý do từ chối: {req.rejectReason}</p>
                )}
              </div>

              {/* Audit Trail & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 text-xs">
                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>Người duyệt phân công: <strong className="text-foreground">{req.approverName}</strong></span>
                </div>

                {req.status === "PENDING" && (
                  <div className="flex items-center gap-2">
                    {isSelfCreated ? (
                      <span className="text-[11px] text-amber-600 font-bold flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Không thể tự duyệt yêu cầu của chính mình
                      </span>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectModalRequest(req)}
                          className="rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-xs"
                        >
                          Từ chối
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(req)}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        >
                          Duyệt yêu cầu
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* REJECT REASON MODAL */}
      {rejectModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <h3 className="font-bold text-foreground text-sm">Từ Chối Yêu Cầu</h3>
              <button onClick={() => setRejectModalRequest(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-muted-foreground">
                Nhập lý do từ chối yêu cầu của <strong className="text-foreground">{rejectModalRequest.requesterName}</strong>. Lý do này sẽ được gửi tới email của người gửi.
              </p>
              <Input
                type="text"
                placeholder="Nhập lý do từ chối..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="rounded-xl text-xs"
                required
              />

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRejectModalRequest(null)} className="rounded-xl">
                  Hủy
                </Button>
                <Button onClick={handleConfirmReject} disabled={submitting} className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold">
                  {submitting ? "Đang xử lý..." : "Xác nhận Từ chối"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
