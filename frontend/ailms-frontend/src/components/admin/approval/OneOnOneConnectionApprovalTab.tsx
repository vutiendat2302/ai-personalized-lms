import { useState } from "react";
import axios from "axios";
import { CheckCircle2, Loader2, Send, UserRound, XCircle } from "lucide-react";
import {
  hrApi,
  type HrInstructorCandidateResponse,
  type HrOneOnOneRequestResponse,
  type OneOnOneRequestStatus,
} from "@/api/hr/hrApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";

interface OneOnOneConnectionApprovalTabProps {
  requests: HrOneOnOneRequestResponse[];
  loading: boolean;
  onRequestUpdated: (request: HrOneOnOneRequestResponse) => void;
}

const STATUS_LABELS: Record<OneOnOneRequestStatus, string> = {
  WAITING_INSTRUCTOR: "Chờ người dạy",
  INSTRUCTOR_ACCEPTED: "Chờ HR phê duyệt",
  CONTACTED: "Đã phê duyệt kết nối",
  TRIAL_SCHEDULED: "Đã lên lịch học thử",
  TRIAL_COMPLETED: "Đã học thử",
  MATCHED: "Đã ghép thành công",
  REMATCHING: "Đang tìm người khác",
  CANCELLED: "Đã hủy",
};

/** Lấy thông báo lỗi API an toàn cho các thao tác kết nối 1-1. */
const errorMessage = (cause: unknown, fallback: string) => axios.isAxiosError<{ message?: string }>(cause)
  ? (cause.response?.data.message ?? fallback)
  : fallback;

/** Hiển thị riêng hàng đợi HR phê duyệt và phân phối kết nối học 1-1. */
export function OneOnOneConnectionApprovalTab({ requests, loading, onRequestUpdated }: OneOnOneConnectionApprovalTabProps) {
  const { success, error } = useToast();
  const [approveTarget, setApproveTarget] = useState<HrOneOnOneRequestResponse | null>(null);
  const [rejectTarget, setRejectTarget] = useState<HrOneOnOneRequestResponse | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [distributionTarget, setDistributionTarget] = useState<HrOneOnOneRequestResponse | null>(null);
  const [candidates, setCandidates] = useState<HrInstructorCandidateResponse[]>([]);
  const [selectedInstructorIds, setSelectedInstructorIds] = useState<string[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  /** Phê duyệt kết nối để người dạy được quyền tạo lớp và lịch học thử. */
  const approveConnection = async () => {
    if (!approveTarget) return;
    setBusy(true);
    try {
      const response = await hrApi.markOneOnOneContacted(approveTarget.id);
      onRequestUpdated(response.data.data);
      success("Đã phê duyệt kết nối học viên và người dạy.");
    } catch (cause) {
      error(errorMessage(cause, "Không thể phê duyệt kết nối hai bên."));
    } finally {
      setBusy(false);
    }
  };

  /** Từ chối kết nối hiện tại và trả yêu cầu về hàng đợi tìm người dạy khác. */
  const rejectConnection = async () => {
    if (!rejectTarget || rejectReason.trim().length < 5) return;
    setBusy(true);
    try {
      const response = await hrApi.rejectOneOnOneConnection(rejectTarget.id, rejectReason.trim());
      onRequestUpdated(response.data.data);
      setRejectTarget(null);
      setRejectReason("");
      success("Đã từ chối kết nối và thông báo cho các Teacher/TA phù hợp khác.");
    } catch (cause) {
      error(errorMessage(cause, "Không thể từ chối kết nối hiện tại."));
    } finally {
      setBusy(false);
    }
  };

  /** Mở danh sách Teacher/TA đúng danh mục để HR lựa chọn người nhận thông báo. */
  const openDistribution = async (request: HrOneOnOneRequestResponse) => {
    setDistributionTarget(request);
    setCandidates([]);
    setSelectedInstructorIds([]);
    setCandidateLoading(true);
    try {
      const response = await hrApi.getOneOnOneInstructorCandidates(request.id);
      setCandidates(response.data.data);
    } catch (cause) {
      error(errorMessage(cause, "Không thể tải danh sách người dạy phù hợp."));
      setDistributionTarget(null);
    } finally {
      setCandidateLoading(false);
    }
  };

  /** Bật hoặc bỏ chọn một ứng viên nhận thông báo lớp 1-1. */
  const toggleCandidate = (instructorId: string, checked: boolean) => {
    setSelectedInstructorIds((current) => checked
      ? [...new Set([...current, instructorId])]
      : current.filter((id) => id !== instructorId));
  };

  /** Gửi yêu cầu tới đúng danh sách Teacher/TA mà HR đã chọn. */
  const notifySelectedInstructors = async () => {
    if (!distributionTarget || selectedInstructorIds.length === 0) return;
    setBusy(true);
    try {
      await hrApi.notifyOneOnOneInstructors(distributionTarget.id, selectedInstructorIds);
      success(`Đã gửi lớp đến ${String(selectedInstructorIds.length)} người dạy được chọn.`);
      setDistributionTarget(null);
      setSelectedInstructorIds([]);
    } catch (cause) {
      error(errorMessage(cause, "Không thể gửi thông báo lớp đến người dạy."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">Phê duyệt kết nối học viên – người dạy</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Duyệt hoặc từ chối người đã nhận; có thể gửi yêu cầu tới Teacher/TA cụ thể cùng danh mục.
              </p>
            </div>
            <Badge variant="outline">
              {requests.filter((item) => item.status === "INSTRUCTOR_ACCEPTED").length} cần phê duyệt
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />Đang tải yêu cầu kết nối...
            </div>
          ) : requests.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Chưa có yêu cầu kết nối 1-1.
            </p>
          ) : requests.map((request) => (
            <div key={request.id} className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{request.studentName}</p>
                  <Badge variant={request.status === "INSTRUCTOR_ACCEPTED" ? "default" : "secondary"}>
                    {STATUS_LABELS[request.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {request.courseName} · {request.packageName} · {request.categoryName ?? "Chưa có danh mục"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Người dạy: <span className="font-medium text-foreground">{request.assignedInstructorName ?? "Chưa có"}</span>
                  {request.preferredTimes ? ` · Khung giờ: ${request.preferredTimes}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {(request.status === "WAITING_INSTRUCTOR" || request.status === "REMATCHING") && (
                  <Button size="sm" variant="outline" onClick={() => { void openDistribution(request); }}>
                    <Send className="mr-2 h-4 w-4" />Gửi đến người dạy
                  </Button>
                )}
                {request.status === "INSTRUCTOR_ACCEPTED" && (
                  <>
                    <Button size="sm" variant="outline" className="border-destructive/40 text-destructive" onClick={() => {
                      setRejectTarget(request);
                      setRejectReason("");
                    }}>
                      <XCircle className="mr-2 h-4 w-4" />Từ chối kết nối
                    </Button>
                    <Button size="sm" onClick={() => { setApproveTarget(request); }}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />Phê duyệt kết nối
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => { if (!open) setApproveTarget(null); }}
        title="Phê duyệt kết nối"
        description={`Xác nhận kết nối ${approveTarget?.studentName ?? "học viên"} với ${approveTarget?.assignedInstructorName ?? "người dạy"}? Sau bước này người dạy có thể tạo lớp học thử.`}
        confirmText="Phê duyệt kết nối"
        variant="default"
        loading={busy}
        onConfirm={approveConnection}
      />

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => {
        if (!open && !busy) {
          setRejectTarget(null);
          setRejectReason("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Từ chối kết nối hiện tại</DialogTitle>
            <DialogDescription>
              Người dạy hiện tại sẽ không nhận lại yêu cầu này. Hệ thống sẽ thông báo cho các Teacher/TA phù hợp khác.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(event) => { setRejectReason(event.target.value); }} rows={5} maxLength={1000} placeholder="Nhập lý do từ chối kết nối..." />
          <p className="text-right text-xs text-muted-foreground">{rejectReason.trim().length}/1000</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); }} disabled={busy}>Quay lại</Button>
            <Button variant="destructive" onClick={() => { void rejectConnection(); }} disabled={busy || rejectReason.trim().length < 5}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(distributionTarget)} onOpenChange={(open) => {
        if (!open && !busy) setDistributionTarget(null);
      }}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gửi lớp đến người dạy</DialogTitle>
            <DialogDescription>
              Chỉ hiển thị Teacher/TA ACTIVE thuộc danh mục {distributionTarget?.categoryName ?? "của khóa học"} và chưa bị loại khỏi yêu cầu.
            </DialogDescription>
          </DialogHeader>
          {candidateLoading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />Đang tải người dạy phù hợp...
            </div>
          ) : candidates.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Không có Teacher/TA phù hợp để gửi yêu cầu.
            </p>
          ) : (
            <div className="space-y-2">
              {candidates.map((candidate) => (
                <label key={candidate.instructorId} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/40">
                  <Checkbox
                    checked={selectedInstructorIds.includes(candidate.instructorId)}
                    onCheckedChange={(checked) => { toggleCandidate(candidate.instructorId, checked); }}
                  />
                  <UserRound className="h-5 w-5 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{candidate.instructorName}</span>
                    <span className="block text-xs text-muted-foreground">{candidate.employeeCode} · {candidate.role}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDistributionTarget(null); }} disabled={busy}>Hủy</Button>
            <Button onClick={() => { void notifySelectedInstructors(); }} disabled={busy || selectedInstructorIds.length === 0}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Gửi đến {selectedInstructorIds.length > 0 ? String(selectedInstructorIds.length) : "người đã chọn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
