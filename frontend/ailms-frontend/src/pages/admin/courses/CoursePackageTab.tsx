import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  ExternalLink,
  BookOpen,
  Users,
  User,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Info,
  Clock,
  Calendar,
} from "lucide-react";
import type { CoursePackage, DeliveryMode } from "@/types/adminCourseClass";
import { CreatePackageDialog } from "./CreatePackageDialog";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";

interface CoursePackageTabProps {
  courseId: string;
  courseName: string;
  courseStatus: string;
  packages: CoursePackage[];
}

export const CoursePackageTab: React.FC<CoursePackageTabProps> = ({
  courseId,
  courseName,
  courseStatus,
  packages: initialPackages,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as {
    autoOpenCreatePackage?: boolean;
    createdClassId?: string;
  } | null;

  const [packages, setPackages] = useState<CoursePackage[]>(initialPackages);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CoursePackage | null>(null);
  const [initialClassId, setInitialClassId] = useState<string | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    if (locationState?.autoOpenCreatePackage) {
      if (locationState.createdClassId) {
        setInitialClassId(locationState.createdClassId);
      }
      setIsDialogOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [locationState]);

  // Detail dialog state
  const [detailPkg, setDetailPkg] = useState<CoursePackage | null>(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<CoursePackage | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canCreatePackage = courseStatus === "ACTIVE";

  const openCreateDialog = () => {
    if (!canCreatePackage) {
      setError("Chỉ khóa học ở trạng thái Đang hoạt động (ACTIVE) mới được tạo gói bán.");
      return;
    }
    setError("");
    setEditingPackage(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (pkg: CoursePackage) => {
    setError("");
    setEditingPackage(pkg);
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (id: string) => {
    const pkg: any = packages.find((item) => item.id === id);
    if (!pkg) return;
    setError("");
    try {
      const saved = await adminCourseClassApi.updatePackage(id, {
        courseId, classId: pkg.attachedClassId || pkg.classId || null, name: pkg.name,
        deliveryMode: pkg.deliveryMode, price: pkg.price, originalPrice: pkg.originalPrice ?? pkg.price,
        durationDays: pkg.durationDays, description: pkg.description,
        includedTutorSessions: pkg.includedTutorSessions, maxGroupSize: pkg.maxGroupSize,
        status: pkg.active ? "INACTIVE" : "ACTIVE",
      });
      setPackages((prev) => prev.map((item) => item.id === id ? { ...item, active: saved.status === "ACTIVE" } : item));
    } catch (err: any) { setError(err?.response?.data?.message || "Không thể cập nhật trạng thái gói bán"); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminCourseClassApi.deletePackage(deleteTarget.id);
      setPackages((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể xóa gói bán. Vui lòng thử lại.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePackageCreated = (newPkg: CoursePackage) => {
    setPackages((prev) => {
      // If editing: replace existing package
      if (editingPackage) {
        return prev.map((p) => p.id === newPkg.id ? newPkg : p);
      }
      return [newPkg, ...prev];
    });
    setEditingPackage(null);
  };

  const getDeliveryModeBadge = (mode: DeliveryMode | string) => {
    switch (mode) {
      case "SELF_STUDY":
      case "SELF_PACED":
        return (
          <Badge className="bg-muted text-muted-foreground border border-border font-extrabold px-2.5 py-1 text-[11px] uppercase rounded-full shadow-xs">
            <BookOpen className="w-3.5 h-3.5 mr-1 text-muted-foreground" /> Tự Học
          </Badge>
        );
      case "GROUP_CLASS":
      case "LIVE_CLASS":
        return (
          <Badge className="bg-primary/10 text-primary border border-primary/20 font-extrabold px-2.5 py-1 text-[11px] uppercase rounded-full shadow-xs">
            <Users className="w-3.5 h-3.5 mr-1 text-primary" /> Lớp Học Nhóm
          </Badge>
        );
      case "ONE_ON_ONE":
        return (
          <Badge className="bg-secondary text-secondary-foreground border border-border font-extrabold px-2.5 py-1 text-[11px] uppercase rounded-full shadow-xs">
            <User className="w-3.5 h-3.5 mr-1 text-secondary-foreground" /> 1 Kèm 1 VIP
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-extrabold px-2.5 py-1 text-[11px] uppercase rounded-full shadow-xs">
            Không xác định
          </Badge>
        );
    }
  };

  const formatVND = (val?: number) => {
    if (val == null) return "—";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Danh Sách Gói Bán Khóa Học</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cấu hình giá bán và hình thức triển khai cho học viên
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          disabled={!canCreatePackage}
          title={!canCreatePackage ? "Khóa học phải được phê duyệt và ở trạng thái ACTIVE" : undefined}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Tạo Gói Bán Mới
        </Button>
      </div>

      {!canCreatePackage && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-600 font-medium">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Chưa thể tạo gói bán</p>
            <p className="mt-0.5">Khóa học hiện ở trạng thái {courseStatus}. Hãy phê duyệt và chuyển khóa học sang ACTIVE trước.</p>
          </div>
        </div>
      )}

      {/* Package Cards List */}
      <div className="space-y-3">
        {packages.length === 0 ? (
          <Card className="border-dashed border-2 p-8 text-center bg-muted/20">
            <p className="text-sm text-muted-foreground">Chưa có gói bán nào cho khóa học này.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 cursor-pointer"
              onClick={openCreateDialog}
              disabled={!canCreatePackage}
            >
              + Thêm Gói Đầu Tiên
            </Button>
          </Card>
        ) : (
          packages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`border transition-all ${
                pkg.active
                  ? "border-border bg-card hover:border-primary/40"
                  : "border-border bg-muted/40 opacity-70"
              }`}
            >
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Mode Badge */}
                <div className="flex items-center gap-3 md:w-1/5">
                  {getDeliveryModeBadge(pkg.deliveryMode)}
                </div>

                {/* Middle: Title, Price, Duration */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground text-base">{pkg.name}</h3>
                    {!pkg.active && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Đang ẩn
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="font-extrabold text-primary text-lg">
                      {formatVND(pkg.price)}
                    </span>
                    {(pkg as any).originalPrice && (pkg as any).originalPrice > pkg.price && (
                      <span className="text-muted-foreground text-xs line-through font-semibold">
                        {formatVND((pkg as any).originalPrice)}
                      </span>
                    )}
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground font-medium text-xs bg-muted px-2 py-0.5 rounded">
                      {pkg.durationDays ? `${pkg.durationDays} ngày` : "Trọn đời"}
                    </span>
                  </div>
                </div>

                {/* Class link for GROUP_CLASS */}
                {pkg.deliveryMode === "GROUP_CLASS" && (
                  <div className="md:w-1/3 bg-muted/30 border border-border rounded-lg p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-muted-foreground block">Lớp gán kèm:</span>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="font-bold text-foreground">
                          {pkg.attachedClassName || (pkg as any).className || "Chưa gắn lớp"}
                        </span>
                        {((pkg as any).currentMemberCount != null || pkg.attachedClassCapacity) && (
                          <Badge variant="outline" className="text-[11px] font-semibold bg-background text-foreground border-border px-1.5 py-0">
                            ({(pkg as any).currentMemberCount ?? pkg.attachedClassCapacity?.current ?? 0}/{(pkg as any).maxMembers ?? pkg.attachedClassCapacity?.max ?? 0})
                          </Badge>
                        )}
                      </div>
                    </div>
                    {(pkg.attachedClassId || (pkg as any).classId) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary hover:bg-primary/10 p-1 font-semibold cursor-pointer"
                        onClick={() =>
                          navigate(`/admin/classes/${pkg.attachedClassId || (pkg as any).classId}`, {
                            state: { returnUrl: `/admin/courses/${courseId}` },
                          })
                        }
                      >
                        Chi tiết lớp <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-border flex-wrap justify-end">
                  {/* View Detail */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs text-foreground hover:bg-muted gap-1.5 cursor-pointer"
                    onClick={() => setDetailPkg(pkg)}
                    title="Xem chi tiết gói bán"
                  >
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    Chi tiết
                  </Button>

                  {/* Toggle Hide/Show */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-2.5 text-xs gap-1.5 cursor-pointer ${
                      pkg.active
                        ? "text-amber-600 hover:bg-amber-500/10"
                        : "text-emerald-600 hover:bg-emerald-500/10"
                    }`}
                    onClick={() => handleToggleActive(pkg.id)}
                    title={pkg.active ? "Ẩn gói bán" : "Hiện gói bán"}
                  >
                    {pkg.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {pkg.active ? "Ẩn" : "Hiện"}
                  </Button>

                  {/* Edit */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
                    onClick={() => openEditDialog(pkg)}
                    title="Chỉnh sửa gói bán"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Sửa
                  </Button>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs gap-1.5 text-destructive hover:bg-destructive/10 cursor-pointer"
                    onClick={() => setDeleteTarget(pkg)}
                    title="Xóa gói bán"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ─── Detail Dialog ─── */}
      <Dialog open={Boolean(detailPkg)} onOpenChange={(o) => { if (!o) setDetailPkg(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Info className="h-4 w-4 text-primary" />
              Thông tin chi tiết Gói bán
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Xem toàn bộ thông số cấu hình của gói bán khóa học này
            </DialogDescription>
          </DialogHeader>
          {detailPkg && (
            <div className="space-y-4 py-1">
              {/* Mode badge + active state */}
              <div className="flex items-center gap-2 flex-wrap">
                {getDeliveryModeBadge(detailPkg.deliveryMode)}
                {detailPkg.active ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">● Đang hoạt động</Badge>
                ) : (
                  <Badge className="bg-muted text-muted-foreground border-border">● Đang ẩn</Badge>
                )}
              </div>

              <div>
                <p className="text-lg font-bold text-foreground">{detailPkg.name}</p>
                {(detailPkg as any).description && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{(detailPkg as any).description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-xl p-3 space-y-0.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Giá bán</p>
                  <p className="text-base font-black text-primary">{formatVND(detailPkg.price)}</p>
                </div>
                {(detailPkg as any).originalPrice && (
                  <div className="bg-muted/40 rounded-xl p-3 space-y-0.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Giá gốc</p>
                    <p className="text-base font-black text-muted-foreground line-through">{formatVND((detailPkg as any).originalPrice)}</p>
                  </div>
                )}
                {detailPkg.durationDays && (
                  <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-2.5">
                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Thời hạn</p>
                      <p className="text-sm font-bold text-foreground">{detailPkg.durationDays} ngày</p>
                    </div>
                  </div>
                )}
                {(detailPkg as any).includedTutorSessions != null && (
                  <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-2.5">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Buổi kèm</p>
                      <p className="text-sm font-bold text-foreground">{(detailPkg as any).includedTutorSessions} buổi</p>
                    </div>
                  </div>
                )}
                {(detailPkg as any).maxGroupSize != null && (
                  <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-2.5">
                    <Users className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Sĩ số</p>
                      <p className="text-sm font-bold text-foreground">Tối đa {(detailPkg as any).maxGroupSize} HV</p>
                    </div>
                  </div>
                )}
              </div>

              {(detailPkg.attachedClassName || (detailPkg as any).className) && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-muted-foreground">Lớp gán kèm</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <p className="font-bold text-foreground">{detailPkg.attachedClassName || (detailPkg as any).className}</p>
                      {((detailPkg as any).currentMemberCount != null || detailPkg.attachedClassCapacity) && (
                        <Badge variant="outline" className="text-[11px] font-semibold bg-background text-foreground border-border px-1.5 py-0">
                          ({(detailPkg as any).currentMemberCount ?? detailPkg.attachedClassCapacity?.current ?? 0}/{(detailPkg as any).maxMembers ?? detailPkg.attachedClassCapacity?.max ?? 0})
                        </Badge>
                      )}
                    </div>
                  </div>
                  {(detailPkg.attachedClassId || (detailPkg as any).classId) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-primary hover:bg-primary/10 p-1 font-semibold cursor-pointer"
                      onClick={() =>
                        navigate(`/admin/classes/${detailPkg.attachedClassId || (detailPkg as any).classId}`, {
                          state: { returnUrl: `/admin/courses/${courseId}` },
                        })
                      }
                    >
                      Xem lớp <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setDetailPkg(null)} className="rounded-lg text-xs font-semibold cursor-pointer">
                  Đóng
                </Button>
                <Button
                  size="sm"
                  onClick={() => { setDetailPkg(null); openEditDialog(detailPkg); }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Chỉnh sửa gói
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm Dialog ─── */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => { if (!o && !deleteLoading) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Xác nhận xóa Gói bán
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Thao tác này không thể hoàn tác. Gói bán sẽ bị xóa vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm font-bold text-foreground">{deleteTarget?.name}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                {deleteTarget && getDeliveryModeBadge(deleteTarget.deliveryMode)}
                <span className="font-semibold text-primary">{formatVND(deleteTarget?.price)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
              className="rounded-lg text-xs font-semibold cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {deleteLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Xác nhận xóa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Package Dialog */}
      <CreatePackageDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        courseId={courseId}
        courseName={courseName}
        courseStatus={courseStatus}
        onPackageCreated={handlePackageCreated}
        editingPackage={editingPackage}
        initialSelectedClassId={initialClassId}
      />
    </div>
  );
};
