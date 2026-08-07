import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import type { OperationalRequest } from "@/types/adminCourseClass";

export const PendingRequestsQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<OperationalRequest[]>([]);
  const [activeTab, setActiveTab] = useState<string>("transfer");

  // State for Orange Notification Toast after approving transfer when full
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Dialog for rejecting teacher leave request with reason
  const [rejectingLeaveReq, setRejectingLeaveReq] = useState<OperationalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Counts per tab
  const transferReqs = requests.filter((r) => r.type === "CLASS_TRANSFER_REQUEST");
  const teacherChangeReqs = requests.filter((r) => r.type === "TEACHER_CHANGE_REQUEST");
  const pendingMatchingReqs = requests.filter((r) => r.type === "PENDING_MATCHING");
  const teacherLeaveReqs = requests.filter((r) => r.type === "CLASS_TEACHER_LEAVE_REQUEST");

  // Handle Approve Class Transfer Request
  const handleApproveTransfer = (req: OperationalRequest) => {
    if (req.targetClassFull) {
      setNoticeMessage(
        `Đã duyệt yêu cầu cho ${req.studentName}, nhưng ${req.newClassName} hiện đã đầy sĩ số! Học viên đã được đưa vào waitlist hoặc nhận thông báo chọn lớp khác.`
      );
    } else {
      setNoticeMessage(`Duyệt thành công! Học viên ${req.studentName} đã được chuyển sang ${req.newClassName}.`);
    }

    // Remove from active queue
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  const handleRejectTransfer = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const handleConfirmRejectLeave = () => {
    if (!rejectingLeaveReq) return;
    // Remove from queue & clear dialog
    setRequests((prev) => prev.filter((r) => r.id !== rejectingLeaveReq.id));
    setRejectingLeaveReq(null);
    setRejectReason("");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Hàng Đợi Yêu Cầu Xử Lý
            </h1>
            <Badge className="bg-amber-500 text-white font-extrabold px-2.5 py-0.5 text-xs rounded-full">
              {requests.length} Yêu Cầu Chờ
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Trung tâm tiếp nhận và giải quyết biến động lớp học, đổi giáo viên và ghép lớp
          </p>
        </div>
      </div>

      {/* Notice Callout Banner */}
      {noticeMessage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-3 text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{noticeMessage}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-amber-800 hover:bg-amber-100"
            onClick={() => setNoticeMessage(null)}
          >
            Đóng
          </Button>
        </div>
      )}

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
          <TabsTrigger value="transfer" className="data-[state=active]:bg-white font-semibold text-xs sm:text-sm">
            Đổi Lớp ({transferReqs.length})
          </TabsTrigger>
          <TabsTrigger value="teacher_change" className="data-[state=active]:bg-white font-semibold text-xs sm:text-sm">
            Đổi Giáo Viên ({teacherChangeReqs.length})
          </TabsTrigger>
          <TabsTrigger value="pending_matching" className="data-[state=active]:bg-white font-semibold text-xs sm:text-sm">
            Chờ Ghép Giáo Viên ({pendingMatchingReqs.length})
          </TabsTrigger>
          <TabsTrigger value="teacher_leave" className="data-[state=active]:bg-white font-semibold text-xs sm:text-sm">
            Giáo Viên Xin Nghỉ ({teacherLeaveReqs.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ĐỔI LỚP */}
        <TabsContent value="transfer" className="space-y-4">
          {transferReqs.length === 0 ? (
            <Card className="border-dashed p-8 text-center bg-slate-50">
              <p className="text-sm text-slate-500">Không có yêu cầu đổi lớp nào đang chờ.</p>
            </Card>
          ) : (
            transferReqs.map((req) => (
              <Card key={req.id} className="border-slate-200 shadow-none hover:border-slate-300 transition-all">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="flex items-start gap-4">
                    <img
                      src={req.studentAvatar}
                      alt={req.studentName}
                      className="w-10 h-10 rounded-full object-cover border"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{req.studentName}</h4>
                        <span className="text-xs text-slate-400">• {req.createdAt}</span>
                      </div>

                      {/* Class Transfer Arrow Display */}
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {req.oldClassName}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                          {req.newClassName}
                        </span>

                        {req.targetClassFull && (
                          <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px]">
                            Lớp đích đã đầy chỗ
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 italic">"{req.reason}"</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectTransfer(req.id)}
                      className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Từ Chối
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproveTransfer(req)}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Duyệt Chuyển Lớp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* TAB 2: ĐỔI GIÁO VIÊN */}
        <TabsContent value="teacher_change" className="space-y-4">
          {teacherChangeReqs.length === 0 ? (
            <Card className="border-dashed p-8 text-center bg-slate-50">
              <p className="text-sm text-slate-500">Không có yêu cầu đổi giáo viên nào.</p>
            </Card>
          ) : (
            teacherChangeReqs.map((req) => (
              <Card key={req.id} className="border-slate-200 shadow-none">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={req.studentAvatar}
                      alt={req.studentName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{req.studentName}</h4>
                        <Badge variant="outline" className="text-xs">
                          {req.className}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">
                        Giáo viên hiện tại:{" "}
                        <span className="font-semibold text-slate-800">{req.currentTeacherName}</span>
                      </p>
                      <p className="text-xs text-slate-600 italic">Lý do: "{req.reason}"</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => navigate(`/admin/pending-requests/matching/${req.id}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                  >
                    Xử Lý Matching Giáo Viên Mới <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* TAB 3: CHỜ GHÉP GIÁO VIÊN (PENDING MATCHING) */}
        <TabsContent value="pending_matching" className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-100 text-xs text-slate-600 flex items-center justify-between">
            <span>
              Danh sách sắp xếp theo thời gian chờ lâu nhất (FIFO). Màu cảnh báo tăng dần theo độ trễ.
            </span>
            <span className="font-bold text-slate-800">&gt;3 ngày: Vàng | &gt;7 ngày: Đỏ</span>
          </div>

          {pendingMatchingReqs.length === 0 ? (
            <Card className="border-dashed p-8 text-center bg-slate-50">
              <p className="text-sm text-slate-500">Tất cả các lớp đã được ghép giáo viên đầy đủ.</p>
            </Card>
          ) : (
            pendingMatchingReqs.map((req) => {
              const isUrgentRed = (req.daysWaiting || 0) > 7;
              const isUrgentYellow = (req.daysWaiting || 0) > 3 && !isUrgentRed;

              return (
                <Card
                  key={req.id}
                  className={`border-2 shadow-none transition-all ${
                    isUrgentRed
                      ? "border-red-300 bg-red-50/20"
                      : isUrgentYellow
                      ? "border-amber-300 bg-amber-50/20"
                      : "border-slate-200"
                  }`}
                >
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={req.studentAvatar}
                        alt={req.studentName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{req.studentName}</h4>
                          <span className="text-xs text-slate-500">• {req.courseName}</span>
                          {isUrgentRed && (
                            <Badge className="bg-red-600 text-white font-bold text-[10px]">
                              Chờ {req.daysWaiting} ngày (Cấp bách)
                            </Badge>
                          )}
                          {isUrgentYellow && (
                            <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                              Chờ {req.daysWaiting} ngày
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 font-medium">
                          Khung giờ mong muốn: <span className="font-bold text-blue-600">{req.desiredSchedule}</span>
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => navigate(`/admin/pending-requests/matching/${req.id}`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                    >
                      Ghép Thủ Công / Tự Động <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* TAB 4: GIÁO VIÊN XIN NGHỈ DẠY */}
        <TabsContent value="teacher_leave" className="space-y-4">
          {teacherLeaveReqs.length === 0 ? (
            <Card className="border-dashed p-8 text-center bg-slate-50">
              <p className="text-sm text-slate-500">Không có yêu cầu xin nghỉ nào từ giáo viên.</p>
            </Card>
          ) : (
            teacherLeaveReqs.map((req) => (
              <Card key={req.id} className="border-slate-200 shadow-none">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={req.currentTeacherAvatar}
                      alt={req.currentTeacherName}
                      className="w-10 h-10 rounded-full object-cover border"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">
                          {req.currentTeacherName} (Giáo viên)
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {req.className}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 italic">Lý do xin nghỉ: "{req.reason}"</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRejectingLeaveReq(req)}
                      className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Hủy Yêu Cầu
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/admin/pending-requests/matching/${req.id}`)}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    >
                      Chấp Nhận & Ghép Giáo Viên Mới
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Leave Dialog with Reason Input */}
      <Dialog
        open={Boolean(rejectingLeaveReq)}
        onOpenChange={(open) => !open && setRejectingLeaveReq(null)}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-slate-900">
              Hủy Yêu Cầu Xin Nghỉ Dạy
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Giáo viên: <span className="font-bold">{rejectingLeaveReq?.currentTeacherName}</span> (Lớp {rejectingLeaveReq?.className})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold text-slate-800">
              Nhập lý do phản hồi cho giáo viên *
            </Label>
            <Input
              placeholder="VD: Lớp đã khai giảng giữa chừng, chưa có GV thay thế phù hợp."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="h-10 text-xs"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRejectingLeaveReq(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!rejectReason}
              onClick={handleConfirmRejectLeave}
            >
              Gửi Phản Hồi Từ Chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
