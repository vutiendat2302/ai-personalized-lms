import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CheckCircle2, Clock, GraduationCap, Lock, PlayCircle, ShoppingBag, ShoppingCart, UserRound } from "lucide-react";
import { courseApi, type CourseDetailLesson, type CourseDetailPackage, type CourseDetailResponse } from "@/api/courses/courseApi";
import { orderApi, type OneOnOneNeedsPayload } from "@/api/orders/orderApi";
import { CoursePackageModal } from "@/components/courses/CoursePackageModal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useModalStore } from "@/store/useModalStore";
import { useCartStore } from "@/store/useCartStore";

/** Hiển thị tiền Việt Nam từ giá backend trả về. */
const formatPrice = (value: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value);

/** Tách nội dung nhiều dòng thành các mục hiển thị mà không tạo dữ liệu bổ sung. */
const splitLines = (value?: string | null) => value
  ? value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
  : [];

/** Hiển thị trang chi tiết khóa học từ response tổng hợp của backend. */
export const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { openLogin } = useModalStore();
  const { error: showError, success: showSuccess } = useToast();
  const addCartItem = useCartStore((state) => state.addToCart);
  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [packageAction, setPackageAction] = useState<"checkout" | "cart">("checkout");
  const [scheduleConflict, setScheduleConflict] = useState("");
  const [pendingCheckout, setPendingCheckout] = useState<{
    coursePackage: CourseDetailPackage;
    needs?: OneOnOneNeedsPayload;
  } | null>(null);

  /** Tải toàn bộ dữ liệu trang bằng API tổng hợp duy nhất. */
  const loadCourse = async () => {
    if (!id) {
      setErrorMessage("Đường dẫn khóa học không hợp lệ.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMessage(null);
      setCourse(await courseApi.getCourseDetail(id));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setErrorMessage("Khóa học không tồn tại hoặc hiện không được mở bán.");
      } else if (axios.isAxiosError(error) && error.response?.status === 403) {
        setErrorMessage("Bạn không có quyền xem khóa học này.");
      } else {
        setErrorMessage("Không thể tải thông tin khóa học. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCourse();
  }, [id, auth.accessToken]);

  /** Điều hướng vào bài được backend cho phép hoặc thông báo bài đang khóa. */
  const handleLessonClick = (lesson: CourseDetailLesson) => {
    if (!course) return;
    if (lesson.locked || !lesson.accessible) {
      showError("Bạn cần đăng ký khóa học để mở bài học này.");
      return;
    }
    navigate(`/learn/courses/${course.id}/lessons/${lesson.id}`);
  };

  /** Mở chọn gói sau khi đảm bảo người dùng đã đăng nhập. */
  const openPackageSelection = (action: "checkout" | "cart") => {
    if (!auth.accessToken) {
      openLogin();
      return;
    }
    setPackageAction(action);
    setPackageModalOpen(true);
  };

  /** Tạo order backend rồi chuyển thẳng sang trang thanh toán PayPal Sandbox. */
  const handleCheckout = async (
    selectedPackage: CourseDetailPackage,
    needs?: OneOnOneNeedsPayload,
    acceptScheduleConflict = false,
  ) => {
    if (!course) return;
    try {
      setSubmitting(true);
      const payment = await orderApi.checkoutCoursePackage(selectedPackage.id, needs, acceptScheduleConflict);
      sessionStorage.setItem("ailms_pending_order_id", payment.orderId);
      sessionStorage.setItem("ailms_pending_course_id", course.id);
      globalThis.location.assign(payment.payUrl);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? String(error.response?.data?.message || "")
        : null;
      if (message?.includes("acceptScheduleConflict=true")) {
        setPendingCheckout({ coursePackage: selectedPackage, needs });
        setScheduleConflict(message);
      } else {
        showError(message || "Không thể tạo giao dịch PayPal. Vui lòng kiểm tra lại gói học.");
      }
      setSubmitting(false);
    }
  };

  /** Thêm package và draft 1-1 vào backend, cập nhật badge nhưng giữ nguyên trang hiện tại. */
  const handleAddToCart = async (selectedPackage: CourseDetailPackage, needs?: OneOnOneNeedsPayload) => {
    try {
      setSubmitting(true);
      await addCartItem(selectedPackage.id, needs);
      showSuccess("Đã thêm gói học vào giỏ hàng");
      setPackageModalOpen(false);
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
      showError(message || "Không thể thêm gói học vào giỏ hàng.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-10">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </main>
    );
  }

  if (errorMessage || !course) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="max-w-lg text-center">
          <CardContent className="space-y-4 p-8">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Không thể hiển thị khóa học</h1>
            <p className="text-sm text-muted-foreground">{errorMessage || "Không có dữ liệu khóa học."}</p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Quay lại</Button>
              <Button onClick={() => void loadCourse()}>Thử lại</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const objectives = splitLines(course.learningObjectives);
  const prerequisites = splitLines(course.prerequisites);
  const purchasablePackages = course.packages.filter((item) => item.purchasable);
  const firstAccessibleLesson = course.curriculum.sections
    .flatMap((section) => section.lessons)
    .find((lesson) => lesson.accessible && !lesson.locked);

  return (
    <main className="min-h-screen bg-muted/20 pb-16">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_380px] lg:py-14">
          <div>
            <Button variant="ghost" className="mb-5 px-0 text-slate-300 hover:bg-transparent hover:text-white" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />Quay lại
            </Button>
            {course.category && <Badge className="mb-4 bg-primary/20 text-primary-foreground">{course.category.name}</Badge>}
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">{course.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
              {course.description || "Khóa học hiện chưa có mô tả."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
              <span><BookOpen className="mr-1 inline h-4 w-4" />{course.curriculum.totalLessons} bài học</span>
              {course.curriculum.totalDurationMin > 0 && <span><Clock className="mr-1 inline h-4 w-4" />{course.curriculum.totalDurationMin} phút</span>}
              {course.level && <span><GraduationCap className="mr-1 inline h-4 w-4" />{course.level}</span>}
            </div>
          </div>

          <Card className="overflow-hidden border-slate-700 bg-white text-foreground">
            {course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt={`Ảnh đại diện ${course.name}`} className="aspect-video w-full object-cover" />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-muted text-sm text-muted-foreground">Khóa học chưa có ảnh đại diện</div>
            )}
            <CardContent className="space-y-4 p-5">
              {course.packages.length > 0 ? (
                <div>
                  <p className="text-xs text-muted-foreground">Giá gói học từ</p>
                  <p className="text-2xl font-bold">{formatPrice(Math.min(...course.packages.map((item) => item.price)))}</p>
                </div>
              ) : <p className="text-sm text-muted-foreground">Hiện chưa có gói học đang hoạt động.</p>}

              {course.enrollment.hasCourseAccess ? (
                <>
                  <Button className="w-full" onClick={() => navigate(`/learn/courses/${course.id}${firstAccessibleLesson ? `/lessons/${firstAccessibleLesson.id}` : ""}`)}>
                    <PlayCircle className="mr-2 h-4 w-4" />Vào học ngay
                  </Button>
                  {purchasablePackages.length > 0 && (
                    <>
                      <Button variant="outline" className="w-full" onClick={() => openPackageSelection("checkout")}>
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        {course.enrollment.ownedPackageIds.length > 0 ? "Nâng cấp trải nghiệm học" : "Mua thêm gói học"}
                      </Button>
                      <Button variant="ghost" className="w-full" onClick={() => openPackageSelection("cart")}>
                        <ShoppingCart className="mr-2 h-4 w-4" />Thêm gói nâng cấp vào giỏ
                      </Button>
                    </>
                  )}
                </>
              ) : purchasablePackages.length > 0 ? (
                <div className="space-y-2">
                  <Button className="w-full" onClick={() => openPackageSelection("checkout")}>Đăng ký học ngay</Button>
                  <Button variant="outline" className="w-full" onClick={() => openPackageSelection("cart")}>
                    <ShoppingCart className="mr-2 h-4 w-4" />Thêm vào giỏ hàng
                  </Button>
                </div>
              ) : (
                <Button className="w-full" disabled>Chưa thể đăng ký</Button>
              )}
              <p className="text-center text-xs text-muted-foreground">Thanh toán trực tiếp qua PayPal Sandbox</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Giới thiệu khóa học</CardTitle></CardHeader>
            <CardContent className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {course.description || "Khóa học hiện chưa có mô tả."}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Mục tiêu học tập</CardTitle></CardHeader>
              <CardContent>
                {objectives.length > 0 ? objectives.map((item) => (
                  <p key={item} className="mb-3 flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</p>
                )) : <p className="text-sm text-muted-foreground">Chưa có dữ liệu mục tiêu học tập.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Yêu cầu đầu vào</CardTitle></CardHeader>
              <CardContent>
                {prerequisites.length > 0 ? prerequisites.map((item) => (
                  <p key={item} className="mb-3 flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</p>
                )) : <p className="text-sm text-muted-foreground">Chưa có dữ liệu yêu cầu đầu vào.</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Chương trình học</CardTitle>
              <p className="text-sm text-muted-foreground">Toàn bộ chương và bài học; biểu tượng khóa thể hiện bài chưa được cấp quyền.</p>
            </CardHeader>
            <CardContent>
              {course.curriculum.sections.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Khóa học chưa có chương trình học.</div>
              ) : (
                <Accordion defaultValue={course.curriculum.sections.map((section) => section.id)} className="space-y-2">
                  {course.curriculum.sections.map((section, sectionIndex) => (
                    <AccordionItem key={section.id} value={section.id} className="rounded-lg border px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <span className="text-left">Chương {sectionIndex + 1}: {section.name}</span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-1 pb-4">
                        {section.lessons.length === 0 ? (
                          <p className="py-3 text-sm text-muted-foreground">Chương này chưa có bài học.</p>
                        ) : section.lessons.map((lesson) => (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => handleLessonClick(lesson)}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-muted"
                          >
                            {lesson.locked ? <Lock className="h-4 w-4 shrink-0 text-muted-foreground" /> : <PlayCircle className="h-4 w-4 shrink-0 text-primary" />}
                            <span className="flex-1">{lesson.title || lesson.name}</span>
                            {lesson.preview && <Badge variant="secondary">Xem thử</Badge>}
                            {lesson.durationMin != null && <span className="text-xs text-muted-foreground">{lesson.durationMin} phút</span>}
                          </button>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Giảng viên biên soạn</CardTitle></CardHeader>
            <CardContent>
              {course.creator ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14">
                      {course.creator.avatarUrl && <AvatarImage src={course.creator.avatarUrl} alt={course.creator.fullName || "Giảng viên"} />}
                      <AvatarFallback>
                        {course.creator.fullName?.trim().charAt(0).toUpperCase() || <UserRound className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{course.creator.fullName || "Chưa có họ tên"}</p>
                      {course.creator.title && <p className="text-sm text-muted-foreground">{course.creator.title}</p>}
                      <p className="text-xs text-muted-foreground">ID: {course.creator.id}</p>
                    </div>
                  </div>
                  {course.creator.bio ? <p className="text-sm leading-6 text-muted-foreground">{course.creator.bio}</p> : <p className="text-sm text-muted-foreground">Chưa có mô tả giảng viên.</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Không có dữ liệu người biên soạn khóa học.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Các gói học</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {course.packages.length === 0 ? <p className="text-sm text-muted-foreground">Không có gói học đang hoạt động.</p> : course.packages.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.deliveryMode}</p></div>
                    {item.owned && <Badge variant="secondary">Đang sở hữu</Badge>}
                  </div>
                  <p className="mt-2 font-semibold">{formatPrice(item.price)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>

      <CoursePackageModal
        isOpen={packageModalOpen}
        onClose={() => setPackageModalOpen(false)}
        courseName={course.name}
        packages={course.packages}
        submitting={submitting}
        action={packageAction}
        onConfirm={packageAction === "cart" ? handleAddToCart : handleCheckout}
      />
      <ConfirmDialog
        open={Boolean(scheduleConflict)}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setScheduleConflict("");
            setPendingCheckout(null);
          }
        }}
        title="Lịch học bị trùng"
        description={scheduleConflict}
        confirmText="Vẫn tiếp tục thanh toán"
        cancelText="Xem lại gói học"
        variant="warning"
        loading={submitting}
        onConfirm={async () => {
          if (!pendingCheckout) return;
          const retry = pendingCheckout;
          setScheduleConflict("");
          setPendingCheckout(null);
          await handleCheckout(retry.coursePackage, retry.needs, true);
        }}
      />
    </main>
  );
};
