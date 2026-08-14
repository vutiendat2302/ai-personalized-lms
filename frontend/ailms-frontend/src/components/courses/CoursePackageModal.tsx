import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarDays, CheckCircle2, Clock, GraduationCap, Loader2, ShoppingCart, Users } from "lucide-react";
import type { CourseDetailPackage } from "@/api/courses/courseApi";
import { orderApi, type OneOnOneNeedsPayload } from "@/api/orders/orderApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { TutorSchedulePicker, type TutorScheduleSlot } from "@/components/courses/TutorSchedulePicker";

const EMPTY_SCHEDULE_SLOT: TutorScheduleSlot = { id: "initial", dayOfWeek: 1, startTime: "", endTime: "" };

/** Kiểm tra danh sách lịch mong muốn không có hai khung giờ giao nhau trong cùng ngày. */
const hasNoOverlappingSlots = (slots: TutorScheduleSlot[]) => slots.every((left, leftIndex) => (
  slots.every((right, rightIndex) => leftIndex === rightIndex
    || left.dayOfWeek !== right.dayOfWeek
    || left.startTime >= right.endTime
    || right.startTime >= left.endTime)
));

const needsSchema = z.object({
  availablePeriod: z.string().trim().min(1, "Vui lòng nhập khoảng thời gian có thể bắt đầu học.").max(255, "Tối đa 255 ký tự."),
  scheduleSlots: z.array(z.object({
    id: z.string(),
    dayOfWeek: z.number().int().min(1).max(7),
    startTime: z.string(),
    endTime: z.string(),
  }))
    .min(1, "Vui lòng thêm ít nhất một khung lịch có thể học.")
    .max(14, "Chỉ được khai báo tối đa 14 khung lịch.")
    .refine((slots) => slots.every((slot) => slot.startTime && slot.endTime), "Vui lòng chọn đủ giờ bắt đầu và kết thúc.")
    .refine((slots) => slots.every((slot) => slot.startTime < slot.endTime), "Giờ kết thúc phải sau giờ bắt đầu.")
    .refine(hasNoOverlappingSlots, "Các khung giờ trong cùng một ngày không được trùng nhau."),
  currentLevel: z.string().trim().min(1, "Vui lòng nhập trình độ hiện tại.").max(255, "Tối đa 255 ký tự."),
  learningSituation: z.string().trim().min(1, "Tình hình học tập là bắt buộc.").max(2000, "Tối đa 2.000 ký tự."),
  learningGoals: z.string().trim().min(1, "Mục tiêu học tập là bắt buộc.").max(2000, "Tối đa 2.000 ký tự."),
  weakAreas: z.string().trim().min(1, "Vui lòng nhập nội dung đang yếu hoặc cần hỗ trợ.").max(2000, "Tối đa 2.000 ký tự."),
  instructorPreferences: z.string().trim().max(2000, "Tối đa 2.000 ký tự."),
  additionalNotes: z.string().trim().max(2000, "Tối đa 2.000 ký tự."),
});

type NeedsForm = z.infer<typeof needsSchema>;

interface CoursePackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseName: string;
  packages: CourseDetailPackage[];
  loading?: boolean;
  submitting: boolean;
  action: "checkout" | "cart";
  onConfirm: (coursePackage: CourseDetailPackage, needs?: OneOnOneNeedsPayload, acceptScheduleConflict?: boolean) => Promise<void>;
}

const EMPTY_NEEDS: NeedsForm = {
  availablePeriod: "",
  scheduleSlots: [{ ...EMPTY_SCHEDULE_SLOT }],
  currentLevel: "",
  learningSituation: "",
  learningGoals: "",
  weakAreas: "",
  instructorPreferences: "",
  additionalNotes: "",
};

/** Hiển thị tiền Việt Nam từ mức giá backend cung cấp. */
const formatPrice = (value: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value);

/** Hiển thị loại gói bằng nhãn nghiệp vụ thân thiện. */
const packageTypeLabel = (type: CourseDetailPackage["deliveryMode"]) => ({
  SELF_STUDY: "Tự học",
  GROUP_CLASS: "Lớp học nhóm",
  ONE_ON_ONE: "Học 1-1",
  COMBO: "Gói kết hợp",
})[type];

/** Đổi chỉ số ngày backend thành nhãn lịch học tiếng Việt. */
const dayLabel = (day: number) => day === 7 ? "Chủ nhật" : `Thứ ${String(day + 1)}`;

/** Chuyển lịch chọn có cấu trúc sang hai trường chuỗi tương thích hợp đồng backend hiện tại. */
const toNeedsPayload = ({ scheduleSlots, ...values }: NeedsForm): OneOnOneNeedsPayload => ({
  ...values,
  availableDays: scheduleSlots.map((slot) => dayLabel(slot.dayOfWeek)).join("; "),
  preferredTimes: scheduleSlots.map((slot) => `${slot.startTime}-${slot.endTime}`).join("; "),
});

/** Xác định package có phần lớp nhóm và phải hiển thị lịch trước khi mua. */
const requiresGroupClass = (item: CourseDetailPackage) => item.deliveryMode === "GROUP_CLASS"
  || (item.deliveryMode === "COMBO" && ((item.maxGroupSize ?? 0) > 1 || item.classDetail != null));

/** Xác định package có quyền lợi gia sư và phải thu thập nhu cầu học tập. */
const requiresTutorNeeds = (item: CourseDetailPackage) => item.deliveryMode === "ONE_ON_ONE"
  || (item.deliveryMode === "COMBO" && (item.includedTutorSessions ?? 0) > 0);

/** Hiển thị chọn package, chi tiết lớp và form nhu cầu dùng chung cho checkout/thêm giỏ. */
export function CoursePackageModal({
  isOpen,
  onClose,
  courseName,
  packages,
  loading = false,
  submitting,
  action,
  onConfirm,
}: CoursePackageModalProps) {
  const [selectedId, setSelectedId] = useState("");
  const [classDetailOpen, setClassDetailOpen] = useState(false);
  const [scheduleChecking, setScheduleChecking] = useState(false);
  const [scheduleConflict, setScheduleConflict] = useState("");
  const [scheduleCheckError, setScheduleCheckError] = useState("");
  const [pendingNeeds, setPendingNeeds] = useState<OneOnOneNeedsPayload | null>(null);
  const form = useForm<NeedsForm>({
    resolver: zodResolver(needsSchema),
    defaultValues: EMPTY_NEEDS,
    mode: "onTouched",
    reValidateMode: "onChange",
  });
  const { reset } = form;
  const selectedPackage = useMemo(
    () => packages.find((item) => item.id === selectedId) ?? null,
    [packages, selectedId],
  );

  /** Chọn sẵn gói mua được đầu tiên, kể cả khóa học chỉ có một gói. */
  useEffect(() => {
    if (!isOpen) return;
    const firstPurchasable = packages.find((item) => item.purchasable);
    requestAnimationFrame(() => {
      setSelectedId(firstPurchasable?.id ?? "");
      setClassDetailOpen(firstPurchasable ? requiresGroupClass(firstPurchasable) : false);
      setScheduleConflict("");
      setScheduleCheckError("");
      setPendingNeeds(null);
      reset(EMPTY_NEEDS);
    });
  }, [isOpen, packages, reset]);

  /** Chọn package mới, reset nhu cầu cũ và tự mở lịch nếu package có lớp nhóm. */
  const selectPackage = (packageId: string) => {
    const nextPackage = packages.find((item) => item.id === packageId);
    if (packageId !== selectedId) reset(EMPTY_NEEDS);
    setSelectedId(packageId);
    setClassDetailOpen(nextPackage ? requiresGroupClass(nextPackage) : false);
    setScheduleConflict("");
    setScheduleCheckError("");
    setPendingNeeds(null);
  };

  /** Kiểm tra xung đột lịch 1-1 trước khi chuyển dữ liệu cho hành động cha. */
  const confirmTutorNeeds = async (needs: OneOnOneNeedsPayload) => {
    if (!selectedPackage) return;
    setScheduleChecking(true);
    setScheduleCheckError("");
    try {
      const result = await orderApi.checkTutorScheduleConflict(needs);
      if (result.conflict) {
        setPendingNeeds(needs);
        setScheduleConflict(result.message ?? "Khung giờ mong muốn đang trùng với lịch học hiện tại.");
        return;
      }
      await onConfirm(selectedPackage, needs, false);
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data.message
        : null;
      setScheduleCheckError(message ?? "Không thể kiểm tra thời khóa biểu hiện tại. Vui lòng thử lại.");
    } finally {
      setScheduleChecking(false);
    }
  };

  /** Xác thực toàn bộ form và chuẩn hóa các dòng lịch trước khi kiểm tra xung đột. */
  const handleConfirm = async () => {
    if (!selectedPackage?.purchasable) return;
    if (!requiresTutorNeeds(selectedPackage)) {
      await onConfirm(selectedPackage);
      return;
    }
    await form.handleSubmit(async (values) => confirmTutorNeeds(toNeedsPayload(values)))();
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chọn gói học</DialogTitle>
          <DialogDescription>
            {courseName}. Hãy xác nhận rõ package trước khi {action === "cart" ? "thêm vào giỏ hàng" : "thanh toán PayPal Sandbox"}.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2"><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
        ) : packages.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Hiện không có gói học đang hoạt động và đủ điều kiện đăng ký.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {packages.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={item.purchasable ? 0 : -1}
                aria-disabled={!item.purchasable}
                onClick={() => { if (item.purchasable) selectPackage(item.id); }}
                onKeyDown={(event) => { if (event.key === "Enter" && item.purchasable) selectPackage(item.id); }}
                className={`rounded-xl border p-4 text-left transition ${
                  selectedId === item.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                } ${item.purchasable ? "cursor-pointer hover:border-primary/60" : "cursor-not-allowed opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant="secondary">{packageTypeLabel(item.deliveryMode)}</Badge>
                    <h3 className="mt-2 font-semibold text-foreground">{item.name}</h3>
                  </div>
                  {selectedId === item.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="text-xl font-bold text-foreground">{formatPrice(item.price)}</p>
                  {item.originalPrice != null && item.originalPrice > item.price && (
                    <p className="text-xs text-muted-foreground line-through">{formatPrice(item.originalPrice)}</p>
                  )}
                </div>
                {item.description && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{item.description}</p>}
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p><Clock className="mr-1 inline h-3.5 w-3.5" />{item.durationDays != null ? `${String(item.durationDays)} ngày sử dụng` : "Không giới hạn thời hạn"}</p>
                  <p><GraduationCap className="mr-1 inline h-3.5 w-3.5" />{item.includedTutorSessions ?? 0} buổi gia sư chính thức</p>
                  {item.maxGroupSize != null && <p><Users className="mr-1 inline h-3.5 w-3.5" />Tối đa {item.maxGroupSize} học viên</p>}
                  <p>Trạng thái mua: {item.purchasable ? "Có thể mua" : "Không thể mua"}</p>
                </div>
                {requiresGroupClass(item) && item.classDetail && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (selectedId !== item.id) selectPackage(item.id);
                      else setClassDetailOpen((open) => !open);
                    }}
                  >
                    {selectedId === item.id && classDetailOpen ? "Ẩn lịch lớp" : "Xem lịch và chi tiết lớp"}
                  </Button>
                )}
                {!item.purchasable && (
                  <p className="mt-3 text-xs font-medium text-destructive">
                    {item.unavailableReason ?? (item.owned ? "Bạn đang sở hữu gói này." : "Gói hiện không thể mua.")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {classDetailOpen && selectedPackage && requiresGroupClass(selectedPackage) && (
          <section className="rounded-xl border bg-muted/30 p-4">
            {!selectedPackage.classDetail ? (
              <p className="text-sm text-muted-foreground">Gói học chưa có dữ liệu lớp liên quan.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">{selectedPackage.classDetail.name} ({selectedPackage.classDetail.code})</h3>
                  <p className="text-sm text-muted-foreground">Khóa học: {selectedPackage.classDetail.courseName}</p>
                </div>
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <p>Giáo viên: {selectedPackage.classDetail.teacher?.fullName ?? "Chưa phân công"}</p>
                  <p>Trợ giảng: {selectedPackage.classDetail.teachingAssistants.length > 0 ? selectedPackage.classDetail.teachingAssistants.map((item) => item.fullName).join(", ") : "Chưa phân công"}</p>
                  <p><CalendarDays className="mr-1 inline h-4 w-4" />{selectedPackage.classDetail.startDate ?? "Chưa có ngày bắt đầu"} – {selectedPackage.classDetail.endDate ?? "Chưa có ngày kết thúc"}</p>
                  <p>Múi giờ: {selectedPackage.classDetail.timeZone}</p>
                  <p>Hình thức: {selectedPackage.deliveryMode === "COMBO" ? "Gói kết hợp có lớp nhóm" : packageTypeLabel(selectedPackage.classDetail.deliveryMode)}</p>
                  <p><Users className="mr-1 inline h-4 w-4" />{selectedPackage.classDetail.currentStudents}/{selectedPackage.classDetail.maxMembers}, còn {selectedPackage.classDetail.remainingSlots} chỗ</p>
                  <p>Trạng thái lớp: {selectedPackage.classDetail.status}</p>
                  <p>Nhận học viên: {selectedPackage.classDetail.registrationOpen && selectedPackage.classDetail.purchasable ? "Còn nhận" : "Ngừng nhận"}</p>
                  <p>Đăng ký muộn: {selectedPackage.classDetail.allowLateEnrollment ? "Cho phép" : "Không cho phép"}</p>
                </div>
                {selectedPackage.classDetail.description && <p className="text-sm text-muted-foreground">{selectedPackage.classDetail.description}</p>}
                <div className="space-y-1 text-sm text-muted-foreground">
                  {selectedPackage.classDetail.schedules.length === 0 ? <p>Chưa có lịch học.</p> : selectedPackage.classDetail.schedules.map((schedule) => (
                    <p key={schedule.id}>{dayLabel(schedule.dayOfWeek)}: {schedule.startTime} – {schedule.endTime}</p>
                  ))}
                </div>
                {!selectedPackage.classDetail.purchasable && <p className="text-sm font-medium text-destructive">{selectedPackage.classDetail.unavailableReason ?? "Lớp hiện không thể đăng ký."}</p>}
              </div>
            )}
          </section>
        )}

        {selectedPackage && requiresTutorNeeds(selectedPackage) && (
          <Form {...form}>
            <form className="grid gap-4 rounded-xl border bg-muted/30 p-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); }} noValidate>
              <div className="md:col-span-2 rounded-lg bg-primary/5 p-3 text-sm font-medium">
                Gói gồm {selectedPackage.includedTutorSessions ?? 0} buổi gia sư chính thức.
              </div>
              {(["availablePeriod", "currentLevel"] as const).map((field) => (
                <FormField key={field} control={form.control} name={field} render={({ field: input }) => (
                  <FormItem>
                    <FormLabel>{({ availablePeriod: "Khoảng thời gian có thể bắt đầu", currentLevel: "Trình độ hiện tại" })[field]} *</FormLabel>
                    <FormControl><Input {...input} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}
              <FormField control={form.control} name="scheduleSlots" render={({ field: input }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Các ngày và khung giờ có thể học *</FormLabel>
                  <FormControl>
                    <TutorSchedulePicker value={input.value} onChange={input.onChange} disabled={submitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {scheduleCheckError && (
                <p className="md:col-span-2 text-sm font-medium text-destructive">{scheduleCheckError}</p>
              )}
              {(["learningSituation", "learningGoals", "weakAreas", "instructorPreferences", "additionalNotes"] as const).map((field) => (
                <FormField key={field} control={form.control} name={field} render={({ field: input }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{({ learningSituation: "Tình hình học tập", learningGoals: "Mục tiêu học tập", weakAreas: "Nội dung đang yếu hoặc cần hỗ trợ", instructorPreferences: "Mong muốn đối với gia sư", additionalNotes: "Ghi chú bổ sung" })[field]}{["learningSituation", "learningGoals", "weakAreas"].includes(field) ? " *" : ""}</FormLabel>
                    <FormControl><Textarea {...input} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}
            </form>
          </Form>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Đóng</Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={loading || !selectedPackage?.purchasable || submitting || scheduleChecking}>
            {submitting || scheduleChecking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{scheduleChecking ? "Đang kiểm tra lịch..." : action === "cart" ? "Đang thêm..." : "Đang tạo thanh toán..."}</> : action === "cart" ? <><ShoppingCart className="mr-2 h-4 w-4" />Thêm vào giỏ hàng</> : "Thanh toán qua PayPal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={Boolean(scheduleConflict)}
      onOpenChange={(open) => {
        if (!open && !submitting) {
          setScheduleConflict("");
          setPendingNeeds(null);
        }
      }}
      title="Lịch học bị trùng"
      description={scheduleConflict}
      confirmText={action === "cart" ? "Vẫn thêm vào giỏ hàng" : "Vẫn tiếp tục thanh toán"}
      cancelText="Chọn lại lịch"
      variant="warning"
      loading={submitting}
      onConfirm={async () => {
        if (!selectedPackage || !pendingNeeds) return;
        await onConfirm(selectedPackage, pendingNeeds, true);
      }}
    />
    </>
  );
}
