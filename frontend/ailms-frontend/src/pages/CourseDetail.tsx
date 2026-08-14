import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CheckCircle2, Clock, GraduationCap, Lock, PlayCircle, ShoppingBag, ShoppingCart, Star, UserRound } from "lucide-react";
import { courseApi, type CourseDetailLesson, type CourseDetailPackage, type CourseDetailResponse } from "@/api/courses/courseApi";
import { publicCatalogApi, type PublicCourseCard } from "@/api/public/publicCatalogApi";
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
import { CourseScrollContainer } from "@/components/courses/CourseScrollContainer";

import { formatCourseLevel } from "@/utils/searchUtils";

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

/** Hiển thị một card khóa học public trong các dải gợi ý cuối trang. */
const RelatedCourseCard = ({ course }: { course: PublicCourseCard }) => (
  <Link
    to={`/courses/${course.id}`}
    className="group relative block w-70 shrink-0 overflow-hidden rounded-2xl border border-border/40 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md"
  >
    <div className="relative aspect-video w-full overflow-hidden">
      {course.thumbnailUrl ? (
        <img src={course.thumbnailUrl} alt={course.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground"><BookOpen className="h-8 w-8" /></div>
      )}
      {course.level && (
        <div className="absolute top-3 left-3 bg-foreground/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-xs border border-border/20">
          {formatCourseLevel(course.level)}
        </div>
      )}
    </div>
    <div className="space-y-2 p-4">
      <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 group-hover:text-primary transition-colors">{course.name}</h3>
      {course.description && <p className="truncate text-xs text-muted-foreground">{course.description}</p>}
      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
        {course.averageRating != null && (
          <span className="flex items-center gap-1 font-bold text-foreground">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 stroke-amber-400" />
            {course.averageRating.toFixed(1)}
          </span>
        )}
        <p className="font-semibold text-primary text-sm">{course.currentPrice != null ? formatPrice(course.currentPrice) : "Chưa cập nhật giá"}</p>
      </div>
    </div>
  </Link>
);

/** Hiển thị một dải khóa học thật có thể cuộn ngang bằng mũi tên shadcn. */
const RelatedCourseRail = ({ title, courses }: { title: string; courses: PublicCourseCard[] }) => {
  if (courses.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <CourseScrollContainer
        itemCount={courses.length}
        className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin"
      >
        {courses.map((item) => <RelatedCourseCard key={item.id} course={item} />)}
      </CourseScrollContainer>
    </section>
  );
};

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
  const [sameCategoryCourses, setSameCategoryCourses] = useState<PublicCourseCard[]>([]);
  const [relatedCourses, setRelatedCourses] = useState<PublicCourseCard[]>([]);
  const [relatedCoursesLoading, setRelatedCoursesLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let ignore = false;
    const fetchCourseData = async () => {
      if (!id) {
        setErrorMessage("Đường dẫn khóa học không hợp lệ.");
        setLoading(false);
        return;
      }
      try {
        const data = await courseApi.getCourseDetail(id);
        if (!ignore) {
          setErrorMessage(null);
          setCourse(data);
        }
      } catch (error) {
        if (!ignore) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            setErrorMessage("Khóa học không tồn tại hoặc hiện không được mở bán.");
          } else if (axios.isAxiosError(error) && error.response?.status === 403) {
            setErrorMessage("Bạn không có quyền xem khóa học này.");
          } else {
            setErrorMessage("Không thể tải thông tin khóa học. Vui lòng thử lại.");
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void fetchCourseData();
    return () => {
      ignore = true;
    };
  }, [id, auth.accessToken, retryCount]);

  /** Tải hai dải gợi ý public thật, loại khóa hiện tại và loại category trùng khỏi vector related. */
  useEffect(() => {
    if (!course?.id) return;
    const loadRelatedCourses = async () => {
      setRelatedCoursesLoading(true);
      try {
        const [sameCategoryResponse, relatedResponse] = await Promise.all([
          course.category?.id
            ? publicCatalogApi.getCategoryCourses(course.category.id, { page: 0, size: 50 })
            : Promise.resolve(null),
          publicCatalogApi.getCourseRelatedCourses(course.id, { page: 0, size: 50 }),
        ]);
        const sameList = sameCategoryResponse ? sameCategoryResponse.data.data.content : [];
        setSameCategoryCourses(
          sameList.filter((item) => item.id !== course.id),
        );
        setRelatedCourses(
          relatedResponse.data.data.content.filter((item) => item.id !== course.id),
        );
      } catch {
        setSameCategoryCourses([]);
        setRelatedCourses([]);
      } finally {
        setRelatedCoursesLoading(false);
      }
    };
    void loadRelatedCourses();
  }, [course?.id, course?.category?.id]);

  /** Điều hướng vào bài được backend cho phép hoặc thông báo bài đang khóa. */
  const handleLessonClick = (lesson: CourseDetailLesson) => {
    if (!course) return;
    if (lesson.locked || !lesson.accessible) {
      showError("Bạn cần đăng ký khóa học để mở bài học này.");
      return;
    }
    void navigate(`/learn/courses/${course.id}/lessons/${lesson.id}`);
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
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data.message ?? "")
        : null;
      if (message?.includes("acceptScheduleConflict=true")) {
        setPendingCheckout({ coursePackage: selectedPackage, needs });
        setScheduleConflict(message);
      } else {
        showError(message ?? "Không thể tạo giao dịch PayPal. Vui lòng kiểm tra lại gói học.");
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
      const message = axios.isAxiosError<{ message?: string }>(error) ? error.response?.data.message : null;
      showError(message ?? "Không thể thêm gói học vào giỏ hàng.");
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
            <p className="text-sm text-muted-foreground">{errorMessage ?? "Không có dữ liệu khóa học."}</p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => { void navigate(-1); }}><ArrowLeft className="mr-2 h-4 w-4" />Quay lại</Button>
              <Button onClick={() => { setLoading(true); setRetryCount((prev) => prev + 1); }}>Thử lại</Button>
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
      <section className="bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_380px] lg:py-14">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2.5 py-0.5 text-xs font-semibold bg-foreground/80 rounded-2xl text-white hover:bg-foreground hover:text-white cursor-pointer"
                onClick={() => { void navigate(-1); }}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Quay lại
              </Button>
          
              {course.category && (
                <Badge className="bg-foreground/80 text-white border font-semibold px-2.5 py-0.5 text-xs">
                  {course.category.name}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">{course.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
              {course.description ?? "Khóa học hiện chưa có mô tả."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
              <span><BookOpen className="mr-1 inline h-4 w-4" />{course.curriculum.totalLessons} bài học</span>
              {course.curriculum.totalDurationMin > 0 && <span><Clock className="mr-1 inline h-4 w-4" />{course.curriculum.totalDurationMin} phút</span>}
              {course.level && <span><GraduationCap className="mr-1 inline h-4 w-4" />{formatCourseLevel(course.level)}</span>}
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
                  <Button className="w-full" onClick={() => { void navigate(`/learn/courses/${course.id}${firstAccessibleLesson ? `/lessons/${firstAccessibleLesson.id}` : ""}`); }}>
                    <PlayCircle className="mr-2 h-4 w-4" />Vào học ngay
                  </Button>
                  {purchasablePackages.length > 0 && (
                    <>
                      <Button variant="outline" className="w-full" onClick={() => { openPackageSelection("checkout"); }}>
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        {course.enrollment.ownedPackageIds.length > 0 ? "Nâng cấp trải nghiệm học" : "Mua thêm gói học"}
                      </Button>
                      <Button variant="ghost" className="w-full" onClick={() => { openPackageSelection("cart"); }}>
                        <ShoppingCart className="mr-2 h-4 w-4" />Thêm gói nâng cấp vào giỏ
                      </Button>
                    </>
                  )}
                </>
              ) : purchasablePackages.length > 0 ? (
                <div className="space-y-2">
                  <Button className="w-full" onClick={() => { openPackageSelection("checkout"); }}>Đăng ký học ngay</Button>
                  <Button variant="outline" className="w-full" onClick={() => { openPackageSelection("cart"); }}>
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
              {course.description ?? "Khóa học hiện chưa có mô tả."}
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
                            onClick={() => { handleLessonClick(lesson); }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-muted"
                          >
                            {lesson.locked ? <Lock className="h-4 w-4 shrink-0 text-muted-foreground" /> : <PlayCircle className="h-4 w-4 shrink-0 text-primary" />}
                            <span className="flex-1">{lesson.title}</span>
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
                      {course.creator.avatarUrl && <AvatarImage src={course.creator.avatarUrl} alt={course.creator.fullName ?? "Giảng viên"} />}
                      <AvatarFallback>
                        {(course.creator.fullName ? course.creator.fullName.trim().charAt(0).toUpperCase() : null) ?? <UserRound className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{course.creator.fullName ?? "Chưa có họ tên"}</p>
                      {course.creator.title && <p className="text-sm text-muted-foreground">{course.creator.title}</p>}
                      <p className="text-xs text-muted-foreground">Mã: {course.creator.code ?? course.creator.id}</p>
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

      <div className="mx-auto max-w-7xl space-y-8 px-4 pb-8">
        {relatedCoursesLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải khóa học gợi ý...</p>
        ) : (
          <>
            <RelatedCourseRail title="Khóa học cùng danh mục" courses={sameCategoryCourses} />
            <RelatedCourseRail title="Khóa học liên quan" courses={relatedCourses} />
          </>
        )}
      </div>

      <CoursePackageModal
        isOpen={packageModalOpen}
        onClose={() => { setPackageModalOpen(false); }}
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
