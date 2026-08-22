import React, { useEffect, useState } from "react";
import type { FileMetadataResponse } from "@/types/fileManagement";
import { fileAdminApi } from "@/api/file/fileAdminApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Download,
  ExternalLink,
  Archive,
  Trash2,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileCheck,
  AlertTriangle,
  Clock,
  User,
  HardDrive,
  Link2,
  Eye,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { formatBytes, formatDateTime, getUsageTypeBadge, getStatusBadge } from "./fileUtils";

interface FileDetailDrawerProps {
  file: FileMetadataResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onActionSuccess?: (msg: string) => void;
}

export const FileDetailDrawer: React.FC<FileDetailDrawerProps> = ({
  file,
  isOpen,
  onClose,
  onRefresh,
  onActionSuccess,
}) => {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (file && isOpen) {
      fetchDownloadUrl(file.id);
    } else {
      setDownloadUrl(null);
    }
  }, [file, isOpen]);

  const fetchDownloadUrl = async (fileId: string) => {
    try {
      setLoadingUrl(true);
      const url = await fileAdminApi.getDownloadUrl(fileId);
      setDownloadUrl(url ? String(url) : null);
    } catch (err) {
      console.error("Failed to fetch download url:", err);
    } finally {
      setLoadingUrl(false);
    }
  };

  if (!isOpen || !file) return null;

  const isOrphaned = file.orphaned || !file.referenceEntityId;

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
  };

  const handleArchive = async () => {
    try {
      setActionLoading(true);
      await fileAdminApi.bulkArchive({ fileIds: [file.id] });
      onActionSuccess?.(`Đã lưu trữ file "${file.originalName}"`);
      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Không thể archive file");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isOrphaned) {
      alert(`Không thể xoá file này — file đang được sử dụng bởi ${file.referenceEntityType || "Entity"} #${file.referenceEntityId}`);
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xoá mềm file "${file.originalName}"?`)) return;

    try {
      setActionLoading(true);
      await fileAdminApi.bulkDelete({ fileIds: [file.id] });
      onActionSuccess?.(`Đã xoá mềm file "${file.originalName}"`);
      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Không thể xoá file");
    } finally {
      setActionLoading(false);
    }
  };

  const getEntityRoute = () => {
    if (!file.referenceEntityType || !file.referenceEntityId) return null;
    switch (file.referenceEntityType) {
      case "CONTRACT":
        return `/admin/contracts?id=${file.referenceEntityId}`;
      case "COURSE":
        return `/admin/courses?id=${file.referenceEntityId}`;
      case "DEPARTMENT":
        return `/admin/departments?id=${file.referenceEntityId}`;
      default:
        return null;
    }
  };

  const entityRoute = getEntityRoute();

  /** Trả về Icon tương ứng với định dạng tệp tin theo token màu index.css */
  const renderFileIcon = () => {
    switch (file.fileType) {
      case "IMAGE":
        return <FileImage className="h-12 w-12 text-brand-cobalt" />;
      case "VIDEO":
        return <FileVideo className="h-12 w-12 text-primary" />;
      case "AUDIO":
        return <FileAudio className="h-12 w-12 text-success-forest" />;
      case "DOCUMENT":
        return <FileText className="h-12 w-12 text-brand-cobalt" />;
      default:
        return <FileCode className="h-12 w-12 text-muted-foreground" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity duration-300">
      <div
        className="w-full max-w-lg bg-card border-l border-border/80 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Drawer */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2 truncate">
            {renderFileIcon()}
            <div className="truncate">
              <h3 className="text-sm font-bold text-foreground truncate" title={file.originalName}>
                {file.originalName}
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono truncate">ID: {file.id}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 cursor-pointer">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
          {/* Section 1: Preview Area */}
          <div className="rounded-xl border border-border/60 bg-muted/10 p-4 flex flex-col items-center justify-center min-h-48 relative overflow-hidden">
            {file.fileType === "IMAGE" && downloadUrl ? (
              <img
                src={downloadUrl}
                alt={file.originalName}
                className="max-h-64 object-contain rounded-lg shadow-sm"
              />
            ) : file.fileType === "DOCUMENT" && downloadUrl ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <FileText className="h-16 w-16 text-brand-cobalt stroke-[1.5]" />
                <span className="text-xs font-semibold text-muted-foreground">{file.contentType || "Tài liệu PDF"}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs gap-1.5 rounded-lg border-brand-cobalt/40 hover:bg-brand-cobalt/10 text-brand-cobalt cursor-pointer"
                  onClick={handleDownload}
                >
                  <Eye className="h-3.5 w-3.5" /> Xem trước tệp tin
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6">
                {renderFileIcon()}
                <span className="text-xs font-medium text-muted-foreground mt-1">
                  {file.contentType || file.fileType}
                </span>
              </div>
            )}

            {loadingUrl && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Section 2: Basic Metadata */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-primary" /> Thông tin cơ bản
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs bg-muted/20 p-3.5 rounded-xl border border-border/40">
              <div>
                <span className="text-muted-foreground block text-[11px]">Dung lượng:</span>
                <span className="font-semibold">{formatBytes(file.fileSize)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">MIME Type:</span>
                <span className="font-mono text-[11px] truncate block" title={file.contentType}>
                  {file.contentType || "N/A"}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-[11px]">Mã khóa tệp tin (File Key):</span>
                <span className="font-mono text-[10px] text-muted-foreground/80 break-all select-all block bg-background p-1.5 rounded border border-border/40 mt-0.5">
                  {file.fileKey}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Business Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-primary" /> Thông tin nghiệp vụ & Tham chiếu
            </h4>
            <div className="bg-muted/20 p-4 rounded-xl border border-border/40 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Phân loại mục đích:</span>
                {getUsageTypeBadge(file.usageType)}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Trạng thái tệp tin:</span>
                {getStatusBadge(file.status)}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tham chiếu hệ thống:</span>
                {isOrphaned ? (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] font-bold gap-1">
                    <AlertTriangle className="h-3 w-3" /> Chưa liên kết
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-success-forest/10 text-success-forest border-success-forest/30 text-[10px] font-bold gap-1">
                    <FileCheck className="h-3 w-3" /> Đang sử dụng
                  </Badge>
                )}
              </div>

              <div className="pt-2 border-t border-border/40 flex items-start justify-between">
                <span className="text-muted-foreground">Đối tượng sở hữu:</span>
                <div className="text-right">
                  {file.referenceEntityType && file.referenceEntityId ? (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-primary">
                        {file.referenceEntityType} {file.referenceEntityId}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">Không có tham chiếu</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Audit Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" /> Lịch sử thay đổi
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs bg-muted/20 p-3.5 rounded-xl border border-border/40">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground block text-[11px]">Người tải lên:</span>
                  <span className="font-semibold text-foreground">
                    {file.createdByName || (file.createdBy ? `ID: ${file.createdBy}` : "Hệ thống")}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground block text-[11px]">Ngày tải lên:</span>
                  <span className="font-medium text-foreground">{formatDateTime(file.createdAt)}</span>
                </div>
              </div>

              {file.updatedAt && (
                <div className="col-span-2 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Cập nhật gần nhất:</span>
                  <span className="font-mono">{formatDateTime(file.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Action Bar Footer */}
        <div className="p-4 border-t border-border/60 bg-card space-y-2">
          {!isOrphaned && (
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-chart-1/10 text-chart-1 text-[11px]">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>Nút Xóa bị khóa vì tệp tin đang được sử dụng bởi {file.referenceEntityType} ID {file.referenceEntityId}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!downloadUrl}
              className="flex-1 text-xs gap-1.5 h-9 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-primary" /> Tải tệp tin
            </Button>

            {file.status === "ACTIVE" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchive}
                disabled={actionLoading}
                className="text-xs gap-1.5 h-9 border-brand-cobalt/30 text-brand-cobalt hover:bg-brand-cobalt/10 cursor-pointer"
              >
                <Archive className="h-3.5 w-3.5" /> Lưu trữ
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={actionLoading || !isOrphaned}
              title={!isOrphaned ? `Không thể xóa — tệp tin đang được sử dụng` : "Xóa mềm tệp tin này"}
              className="text-xs gap-1.5 h-9 border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" /> Xóa tệp tin
            </Button>
          </div>

          {entityRoute && (
            <a
              href={entityRoute}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Đi tới bản ghi gốc ({file.referenceEntityType} #{file.referenceEntityId})
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
