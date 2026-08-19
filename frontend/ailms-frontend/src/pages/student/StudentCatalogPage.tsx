import { useCallback, useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { studentApi, type CatalogCourseItem } from "@/api/student/studentApi";
import { courseApi, type CourseDetailPackage } from "@/api/courses/courseApi";
import type { OneOnOneNeedsPayload } from "@/api/orders/orderApi";
import { CoursePackageModal } from "@/components/courses/CoursePackageModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/useToast";
import { useCartStore } from "@/store/useCartStore";
import { StudentPageSkeleton } from "@/components/student/StudentPageSkeleton";

import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImageIcon,
  Layers,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  X,
} from "lucide-react";

type CatalogTab = "catalog" | "all_courses";

/** Hiển thị catalog cá nhân hóa và danh sách khóa học công khai bằng hai API độc lập. */
export const StudentCatalogPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<CatalogTab>("catalog");
  const [draftKeywords, setDraftKeywords] = useState<Record<CatalogTab, string>>({ catalog: "", all_courses: "" });
  const [appliedKeywords, setAppliedKeywords] = useState<Record<CatalogTab, string>>({ catalog: "", all_courses: "" });
  const [catalogItems, setCatalogItems] = useState<CatalogCourseItem[]>([]);
  const [catalogPage, setCatalogPage] = useState(0);
  const [catalogTotalPages, setCatalogTotalPages] = useState(1);
  const [catalogTotalElements, setCatalogTotalElements] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [allCoursesItems, setAllCoursesItems] = useState<CatalogCourseItem[]>([]);
  const [allCoursesPage, setAllCoursesPage] = useState(0);
  const [allCoursesTotalPages, setAllCoursesTotalPages] = useState(1);
  const [allCoursesTotalElements, setAllCoursesTotalElements] = useState(0);
  const [allCoursesLoading, setAllCoursesLoading] = useState(false);
  const [allCoursesError, setAllCoursesError] = useState<string | null>(null);
  const [packageCourse, setPackageCourse] = useState<CatalogCourseItem | null>(null);
  const [packageOptions, setPackageOptions] = useState<CourseDetailPackage[]>([]);
  const [packageLoading, setPackageLoading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  /** Lấy trang catalog chỉ gồm khóa học khớp sở thích hiện tại của học viên. */
  const fetchCatalog = useCallback(async (page: number, keyword: string) => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const response = await studentApi.getCatalog({ page, size: 12, keyword: keyword.trim() || undefined });
      setCatalogItems(response.content ?? []);
      setCatalogPage(response.pageNumber ?? page);
      setCatalogTotalPages(response.totalPages ?? 1);
      setCatalogTotalElements(response.totalElements ?? 0);
    } catch {
      setCatalogError("Không thể tải catalog phù hợp với sở thích của bạn.");
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  /** Lấy trang tất cả khóa học công khai từ API tìm kiếm khóa học. */
  const fetchAllCourses = useCallback(async (page: number, keyword: string) => {
    setAllCoursesLoading(true);
    setAllCoursesError(null);
    try {
      const data = await studentApi.getAllCatalogCourses({ page, size: 12, keyword: keyword.trim() || undefined });
      setAllCoursesItems(data.content ?? []);
      setAllCoursesPage(data.pageNumber ?? page);
      setAllCoursesTotalPages(data.totalPages ?? 1);
      setAllCoursesTotalElements(data.totalElements ?? 0);
    } catch {
      setAllCoursesError("Không thể tải danh sách khóa học đang mở bán.");
    } finally {
      setAllCoursesLoading(false);
    }
  }, []);

  /** Tải lại đúng nguồn dữ liệu của tab khi trang hoặc từ khóa đã áp dụng thay đổi. */
  useEffect(() => {
    if (activeTab === "catalog") {
      void fetchCatalog(catalogPage, appliedKeywords.catalog);
      return;
    }
    void fetchAllCourses(allCoursesPage, appliedKeywords.all_courses);
  }, [activeTab, catalogPage, allCoursesPage, appliedKeywords, fetchCatalog, fetchAllCourses]);

  /** Áp dụng từ khóa độc lập cho tab hiện tại và đưa phân trang về trang đầu. */
  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setAppliedKeywords((current) => ({ ...current, [activeTab]: draftKeywords[activeTab] }));
    if (activeTab === "catalog") setCatalogPage(0);
    else setAllCoursesPage(0);
  };

  /** Xóa riêng từ khóa tìm kiếm của tab hiện tại. */
  const handleClearSearch = () => {
    setDraftKeywords((current) => ({ ...current, [activeTab]: "" }));
    setAppliedKeywords((current) => ({ ...current, [activeTab]: "" }));
    if (activeTab === "catalog") setCatalogPage(0);
    else setAllCoursesPage(0);
  };

  /** Định dạng số tiền VND lấy từ backend. */
  const formatVnd = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

  /** Mở component chọn package dùng chung bằng dữ liệu chi tiết và quyền mua từ backend. */
  const openPackageSelection = useCallback(async (course: CatalogCourseItem) => {
    setPackageCourse(course);
    setPackageOptions([]);
    setPackageLoading(true);
    try {
      const detail = await courseApi.getCourseDetail(course.id);
      setPackageOptions(detail.packages);
    } catch (loadError) {
      const message = axios.isAxiosError(loadError) ? loadError.response?.data?.message : null;
      error(message || "Không thể tải các gói đang mở bán của khóa học.");
      setPackageCourse(null);
    } finally {
      setPackageLoading(false);
    }
  }, [error]);

  /** Mở khóa học catalog từ URL bằng đúng component chọn package dùng chung. */
  useEffect(() => {
    if (!id || packageCourse || catalogLoading) return;
    const found = catalogItems.find((course) => course.id === id);
    if (found) void openPackageSelection(found);
  }, [id, packageCourse, catalogLoading, catalogItems, openPackageSelection]);

  const addCartItem = useCartStore((state) => state.addToCart);

  /** Thêm package và nhu cầu gia sư vào giỏ hàng, cập nhật badge mà không điều hướng rời khỏi trang. */
  const handleAddToCart = async (coursePackage: CourseDetailPackage, needs?: OneOnOneNeedsPayload) => {
    setAddingToCart(true);
    try {
      await addCartItem(coursePackage.id, needs);
      success(`Đã thêm gói ${coursePackage.name} vào giỏ hàng.`);
      setPackageCourse(null);
    } catch (addError) {
      const message = axios.isAxiosError(addError) ? addError.response?.data?.message : null;
      error(message || "Không thể thêm gói học vào giỏ hàng.");
    } finally {
      setAddingToCart(false);
    }
  };

  /** Mở trang chi tiết công khai của khóa học. */

  const openCourseDetail = (courseId: string) => {
    navigate(`/courses/${courseId}`, { state: { from: "/student/catalog" } });
  };

  const isCatalog = activeTab === "catalog";
  const currentPage = isCatalog ? catalogPage : allCoursesPage;
  const totalPages = isCatalog ? catalogTotalPages : allCoursesTotalPages;
  const totalElements = isCatalog ? catalogTotalElements : allCoursesTotalElements;
  const loading = isCatalog ? catalogLoading : allCoursesLoading;
  const pageError = isCatalog ? catalogError : allCoursesError;
  const appliedKeyword = appliedKeywords[activeTab];

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><ShoppingBag className="h-6 w-6 text-primary" />Khám phá khóa học</h1>
        <p className="mt-1 text-sm text-muted-foreground">Catalog được cá nhân hóa theo sở thích đã khai báo; tab tất cả khóa học dùng nguồn dữ liệu công khai riêng.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CatalogTab)}>
        <div className="space-y-4 border-b pb-4">
          <TabsList className="rounded-xl">
            <TabsTrigger value="catalog" className="gap-2 rounded-lg"><Sparkles className="h-3.5 w-3.5 text-amber-500" />Dành cho bạn</TabsTrigger>
            <TabsTrigger value="all_courses" className="gap-2 rounded-lg"><Layers className="h-3.5 w-3.5 text-primary" />Tất cả khóa học</TabsTrigger>
          </TabsList>
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draftKeywords[activeTab]}
                onChange={(event) => setDraftKeywords((current) => ({ ...current, [activeTab]: event.target.value }))}
                placeholder={isCatalog ? "Tìm trong các khóa học phù hợp sở thích" : "Tìm trong tất cả khóa học"}
                className="h-10 rounded-xl pl-9 pr-9"
              />
              {draftKeywords[activeTab] && <button type="button" aria-label="Xóa tìm kiếm" onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="h-4 w-4" /></button>}
            </div>
            <Button type="submit" className="h-10 gap-2 rounded-xl"><Search className="h-4 w-4" />Tìm kiếm</Button>
          </form>
          <p className="text-xs text-muted-foreground">Có <strong className="text-foreground">{totalElements}</strong> khóa học{appliedKeyword ? ` cho từ khóa “${appliedKeyword}”` : ""}.</p>
        </div>

        <TabsContent value="catalog" className="mt-6">
          <CatalogContent
            loading={loading}
            errorMessage={pageError}
            emptyMessage={appliedKeyword ? "Không có khóa học phù hợp với từ khóa trong sở thích của bạn." : "Chưa có khóa học nào khớp với sở thích đã khai báo."}
            items={catalogItems}
            formatVnd={formatVnd}
            onOpen={openCourseDetail}
            onSelect={(course) => void openPackageSelection(course)}
          />
        </TabsContent>

        <TabsContent value="all_courses" className="mt-6">
          <CatalogContent
            loading={loading}
            errorMessage={pageError}
            emptyMessage="Không có khóa học đang mở bán phù hợp."
            items={allCoursesItems}
            formatVnd={formatVnd}
            onOpen={openCourseDetail}
            onSelect={(course) => void openPackageSelection(course)}
          />
        </TabsContent>
      </Tabs>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-6">
          <Button variant="outline" size="sm" disabled={currentPage === 0 || loading} onClick={() => isCatalog ? setCatalogPage((page) => Math.max(0, page - 1)) : setAllCoursesPage((page) => Math.max(0, page - 1))}><ChevronLeft className="h-4 w-4" />Trang trước</Button>
          <span className="text-xs text-muted-foreground">Trang <strong className="text-foreground">{currentPage + 1}</strong> / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1 || loading} onClick={() => isCatalog ? setCatalogPage((page) => page + 1) : setAllCoursesPage((page) => page + 1)}>Trang sau<ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}
      <CoursePackageModal
        isOpen={Boolean(packageCourse)}
        onClose={() => { if (!addingToCart) setPackageCourse(null); }}
        courseName={packageCourse?.title || "Khóa học"}
        packages={packageOptions}
        loading={packageLoading}
        submitting={addingToCart}
        action="cart"
        onConfirm={handleAddToCart}
      />
    </div>
  );
};

/** Hiển thị danh sách catalog cá nhân hóa với dữ liệu giá và đánh giá thật. */
const CatalogContent = ({ loading, errorMessage, emptyMessage, items, formatVnd, onOpen, onSelect }: {
  loading: boolean;
  errorMessage: string | null;
  emptyMessage: string;
  items: CatalogCourseItem[];
  formatVnd: (value: number) => string;
  onOpen: (id: string) => void;
  onSelect: (course: CatalogCourseItem) => void;
}) => {
  if (loading) return <LoadingState />;
  if (errorMessage) return <EmptyState message={errorMessage} />;
  if (items.length === 0) return <EmptyState message={emptyMessage} />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((course) => (
        <Card key={course.id} className="overflow-hidden border-border/60 shadow-sm transition hover:border-primary/40">
          <div className="grid h-full sm:grid-cols-[150px_1fr]">
            <div className="min-h-36 bg-muted">
              {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" /> : <div className="flex h-full min-h-36 items-center justify-center text-muted-foreground"><ImageIcon className="h-9 w-9" /></div>}
            </div>
            <div className="flex flex-col gap-3 p-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{course.categoryName}</p>
                  {course.enrolled && <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-emerald-600"><CheckCircle2 className="h-3 w-3" />Đã sở hữu</span>}
                </div>
                <h3 className="mt-1 line-clamp-2 text-sm font-bold">{course.title}</h3>
              </div>
              {course.description && <p className="line-clamp-2 text-xs text-muted-foreground">{course.description}</p>}
              <div className="mt-auto flex items-end justify-between gap-3">
                <div>
                  {course.reviewCount > 0 && <p className="flex items-center gap-1 text-xs text-amber-600"><Star className="h-3.5 w-3.5 fill-current" />{course.rating.toFixed(1)} ({course.reviewCount})</p>}
                  <p className="mt-1 text-sm font-bold text-primary">Từ {formatVnd(course.sellingPrice)}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" aria-label="Xem chi tiết" onClick={() => onOpen(course.id)}><Eye className="h-4 w-4" /></Button>
                  <Button size="sm" disabled={course.packages.length === 0} onClick={() => onSelect(course)}>Chọn gói</Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

/** Hiển thị trạng thái đang tải dùng chung cho hai tab. */
/** Giữ bố cục catalog ổn định khi chuyển tab hoặc phân trang. */
const LoadingState = () => <StudentPageSkeleton cards={6} columns={3} />;

/** Hiển thị trạng thái rỗng hoặc lỗi mà không tạo dữ liệu thay thế. */
const EmptyState = ({ message }: { message: string }) => <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-16 text-center"><BookOpen className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><p className="text-sm text-muted-foreground">{message}</p></div>;
