import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { studentApi, type CatalogCourseItem } from "@/api/student/studentApi";
import { TimeSlotPicker } from "@/components/student/TimeSlotPicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { ShoppingBag, Star, ArrowLeft, ShoppingCart, CheckCircle2 } from "lucide-react";

export const StudentCatalogPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [catalog, setCatalog] = useState<CatalogCourseItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CatalogCourseItem | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi.getCatalog({ page: 0, size: 100 }).then((res) => {
      setCatalog(res.content);
      if (id) {
        const found = res.content.find((c) => c.id === id);
        if (found) {
          setSelectedCourse(found);
          setSelectedPackageId(found.packages[0]?.id ?? "");
        }
      }
      setLoading(false);
    });
  }, [id]);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const handleAddToCart = async () => {
    const pkg = selectedCourse?.packages.find((p) => p.id === selectedPackageId);
    if (pkg?.deliveryMode === "ONE_ON_ONE" && selectedSlots.length < 2) {
      error("Vui lòng chọn ít nhất 2 khung giờ mong muốn khi mua gói kèm 1-1!");
      return;
    }
    if (!pkg) {
      error("Vui lòng chọn một gói học đang mở bán.");
      return;
    }
    await studentApi.addToCart(pkg.id);
    success(`Đã thêm gói [${pkg?.name}] vào giỏ hàng thành công!`);
    navigate("/student/cart");
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải danh mục khóa học...</p>
      </div>
    );
  }

  // COURSE DETAIL & PACKAGE SELECTION VIEW
  if (selectedCourse) {
    const currentPkg = selectedCourse.packages.find((p) => p.id === selectedPackageId);

    return (
      <div className="space-y-6 pb-16">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              setSelectedCourse(null);
              navigate("/student/catalog");
            }
          }}
          className="rounded-lg gap-1.5 text-xs border-border text-foreground cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại
        </Button>

        <Card className="bg-card border-border/40 p-6 space-y-6 shadow-md">
          <div className="space-y-2 border-b border-border/40 pb-4">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{selectedCourse.categoryName}</span>
            <h1 className="text-2xl font-bold text-foreground">{selectedCourse.title}</h1>
            <p className="text-xs text-muted-foreground">{selectedCourse.description}</p>
          </div>

          {/* Package Selection Options */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground block">Chọn Gói Đào Tạo (Course Package):</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {selectedCourse.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`p-4 rounded-xl border space-y-2 cursor-pointer transition ${
                    selectedPackageId === pkg.id
                      ? "bg-primary/10 border-primary shadow-xs"
                      : "bg-background border-border/40 hover:border-primary/50"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase text-primary">{pkg.deliveryMode}</span>
                  <h4 className="text-xs font-bold text-foreground">{pkg.name}</h4>
                  <p className="text-sm font-black text-primary">{formatVND(pkg.price)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* If ONE_ON_ONE package selected, render TimeSlotPicker */}
          {currentPkg?.deliveryMode === "ONE_ON_ONE" && (
            <div className="pt-4 border-t border-border/40">
              <TimeSlotPicker selectedSlots={selectedSlots} onChange={setSelectedSlots} />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <Button
              onClick={handleAddToCart}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl gap-2 cursor-pointer shadow-md"
            >
              <ShoppingCart className="h-4 w-4" />
              Thêm vào giỏ & Mua ngay
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // MAIN CATALOG GRID VIEW
  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          Khám phá Khóa học (Course Catalog)
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Tìm kiếm & chọn mua các gói học Tự học, Lớp Nhóm hoặc Gia sư Kèm 1-1 Chuyên Sâu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {catalog.map((crs) => (
          <Card key={crs.id} className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-primary tracking-wider">{crs.categoryName}</span>
                <h3 className="text-base font-bold text-foreground mt-0.5">{crs.title}</h3>
              </div>
              {crs.enrolled && (
                <span className="px-2.5 py-0.5 text-[9px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Đã sở hữu
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2">{crs.description}</p>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="h-3.5 w-3.5 fill-amber-500" />
                <span>{crs.rating} ({crs.reviewCount} đánh giá)</span>
              </div>
              <span className="text-sm font-black text-primary">{formatVND(crs.sellingPrice)}</span>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setSelectedCourse(crs);
                setSelectedPackageId(crs.packages[0]?.id ?? "");
              }}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg cursor-pointer"
            >
              Xem chi tiết & Chọn gói học
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
