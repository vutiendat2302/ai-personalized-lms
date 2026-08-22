import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { FileMetadataResponse, FileUsageTypeEnum } from "@/types/fileManagement";
import { formatBytes, formatDateTime, getUsageTypeBadge, getStatusBadge } from "./fileUtils";
import { fileAdminApi } from "@/api/file/fileAdminApi";
import { auditLogApi, type AuditLogResponse } from "@/api/audit/auditLogApi";
import { DetailAuditLogModal } from "@/components/admin/audit/DetailAuditLogModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  DownloadCloud,
  Archive,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Info,
  History,
  Eye,
  Calendar,
  User,
  HardDrive,
  X,
  Edit2,
  Save,
  RotateCcw,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface FileDetailModalProps {
  file: FileMetadataResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onFileUpdated?: (updated: FileMetadataResponse) => void;
  onActionSuccess?: (msg: string) => void;
}

export const FileDetailModal: React.FC<FileDetailModalProps> = ({
  file,
  isOpen,
  onClose,
  onRefresh,
  onFileUpdated,
  onActionSuccess,
}) => {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Edit metadata form state
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [usageTypeInput, setUsageTypeInput] = useState<FileUsageTypeEnum>("OTHER");

  // Confirm dialogs states
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmPurgeOpen, setConfirmPurgeOpen] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogResponse | null>(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  useEffect(() => {
    if (file && isOpen) {
      setNameInput(file.originalName || "");
      setUsageTypeInput(file.usageType || "OTHER");
      setIsEditing(false);
      setErrorMsg("");
      setSuccessMsg("");
      fetchDownloadUrl();
      fetchAuditLogs();
    } else {
      setDownloadUrl(null);
      setErrorMsg("");
      setSuccessMsg("");
      setAuditLogs([]);
      setIsEditing(false);
    }
  }, [file?.id, isOpen]);

  /** Tải đường dẫn xem trước và tải xuống từ hệ thống lưu trữ */
  const fetchDownloadUrl = async () => {
    if (!file) return;
    try {
      setLoadingUrl(true);
      const url = await fileAdminApi.getDownloadUrl(file.id);
      setDownloadUrl(url);
    } catch (err) {
      console.error("Failed to load presigned URL:", err);
    } finally {
      setLoadingUrl(false);
    }
  };

  /** Truy vấn lịch sử thay đổi của tệp tin từ hệ thống nhật ký Audit Log */
  const fetchAuditLogs = async () => {
    if (!file) return;
    try {
      setLoadingAuditLogs(true);
      const [resMeta, resFile] = await Promise.all([
        auditLogApi.getAuditLogsByEntity("FILE_METADATA", String(file.id)).catch(() => []),
        auditLogApi.getAuditLogsByEntity("FILE", String(file.id)).catch(() => []),
      ]);
      const listMeta = resMeta?.content || (Array.isArray(resMeta) ? resMeta : []);
      const listFile = resFile?.content || (Array.isArray(resFile) ? resFile : []);
      const merged = [...listMeta, ...listFile];
      const uniqueMap = new Map();
      merged.forEach((item) => uniqueMap.set(item.id, item));
      setAuditLogs(Array.from(uniqueMap.values()));
    } catch (err) {
      setAuditLogs([]);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  if (!file) return null;

  const isOrphan = file.orphaned || !file.referenceEntityId;

  /** Lấy đường dẫn chuyển hướng chi tiết của thực thể tham chiếu */
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

  /** Lưu tên hiển thị và phân loại mục đích tệp tin */
  const handleUpdateMetadata = async () => {
    if (!file) return;
    const name = nameInput.trim();
    if (!name) {
      setErrorMsg("Tên tệp tin gốc không được để trống!");
      return;
    }
    if (name.length > 255) {
      setErrorMsg("Tên tệp tin gốc không được vượt quá 255 ký tự!");
      return;
    }
    if (/[\\/\r\n\t]/.test(name)) {
      setErrorMsg("Tên tệp tin gốc không được chứa các ký tự đặc biệt (\\, /, Enter, Tab)!");
      return;
    }

    const getExt = (filename: string) => {
      const parts = filename.split(".");
      return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
    };

    const oldExt = getExt(file.originalName);
    const newExt = getExt(name);

    if (oldExt && newExt && oldExt !== newExt) {
      setErrorMsg(`Định dạng tệp tin không hợp lệ! Vui lòng giữ nguyên đuôi .${oldExt}`);
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg("");
      setSuccessMsg("");
      const updated = await fileAdminApi.updateFileMetadata(file.id, name, usageTypeInput);
      const msg = "Đã cập nhật thông tin tệp tin thành công!";
      setSuccessMsg(msg);
      onActionSuccess?.(msg);
      setIsEditing(false);
      if (updated) {
        onFileUpdated?.(updated);
      }
      fetchAuditLogs();
      onRefresh?.();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Lỗi khi đổi tên tệp tin");
    } finally {
      setActionLoading(false);
    }
  };

  /** Thực hiện lưu trữ tệp tin */
  const executeArchive = async () => {
    try {
      setActionLoading(true);
      setErrorMsg("");
      await fileAdminApi.bulkArchive({ fileIds: [file.id] });
      onActionSuccess?.("Đã lưu trữ tệp tin thành công!");
      onRefresh?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Lỗi khi chuyển trạng thái tệp tin");
    } finally {
      setActionLoading(false);
    }
  };

  /** Thực hiện xóa mềm tệp tin */
  const executeDelete = async () => {
    try {
      setActionLoading(true);
      setErrorMsg("");
      await fileAdminApi.bulkDelete({ fileIds: [file.id] });
      onActionSuccess?.("Đã xóa mềm tệp tin thành công!");
      onRefresh?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Không thể xóa tệp tin");
    } finally {
      setActionLoading(false);
    }
  };

  /** Thực hiện xóa vĩnh viễn tệp tin */
  const executePurge = async () => {
    try {
      setActionLoading(true);
      setErrorMsg("");
      await fileAdminApi.bulkPurge({ fileIds: [file.id] });
      onActionSuccess?.("Đã xóa vĩnh viễn tệp tin khỏi hệ thống!");
      onRefresh?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Lỗi khi xóa vĩnh viễn tệp tin");
    } finally {
      setActionLoading(false);
    }
  };

  /** Trả về Icon loại tệp tin theo token màu index.css */
  const renderFileIcon = () => {
    switch (file.fileType) {
      case "IMAGE":
        return <FileImage className="h-10 w-10 text-brand-cobalt" />;
      case "VIDEO":
        return <FileVideo className="h-10 w-10 text-primary" />;
      case "AUDIO":
        return <FileAudio className="h-10 w-10 text-success-forest" />;
      case "DOCUMENT":
        return <FileText className="h-10 w-10 text-brand-cobalt" />;
      default:
        return <FileCode className="h-10 w-10 text-muted-foreground" />;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-card border border-border/40 shadow-xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                  {renderFileIcon()}
                  <span className="truncate max-w-md">{file.originalName}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Mã tệp tin nội bộ: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{file.fileKey}</code>
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-xs gap-1.5 rounded-xl border-border/80 cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Chỉnh sửa
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setNameInput(file.originalName);
                      setUsageTypeInput(file.usageType || "OTHER");
                    }}
                    className="text-xs gap-1 rounded-xl cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Hủy bỏ
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  title="Đóng"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {errorMsg && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-success-forest/10 border border-success-forest/30 text-success-forest rounded-xl text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg("")} className="text-xs opacity-70 hover:opacity-100 font-bold cursor-pointer">
                ✕
              </button>
            </div>
          )}

          {/* Form chỉnh sửa metadata file */}
          {isEditing && (
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3 animate-in fade-in duration-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Edit2 className="h-3.5 w-3.5" /> Chỉnh sửa tệp tin
              </h4>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Tên hiển thị</Label>
                <div className="flex gap-2">
                  <Input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Nhập tên hiển thị..."
                    className="h-9 text-xs rounded-xl bg-background border-border/80 flex-1 text-foreground"
                  />
                  <Button
                    size="sm"
                    onClick={handleUpdateMetadata}
                    disabled={actionLoading || !nameInput.trim()}
                    className="text-xs gap-1.5 rounded-xl shadow-xs cursor-pointer"
                  >
                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Lưu thay đổi
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Phân loại mục đích sử dụng</Label>
                <Select value={usageTypeInput} onValueChange={(value) => setUsageTypeInput(value as FileUsageTypeEnum)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 text-foreground">
                    <SelectValue placeholder="Chọn mục đích" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONTRACT">Hợp đồng</SelectItem>
                    <SelectItem value="AVATAR">Ảnh đại diện</SelectItem>
                    <SelectItem value="LESSON_RESOURCE">Tài liệu bài học</SelectItem>
                    <SelectItem value="LESSON_VIDEO">Video bài học</SelectItem>
                    <SelectItem value="COURSE_LESSON">Bài học khóa học</SelectItem>
                    <SelectItem value="ASSIGNMENT">Bài tập</SelectItem>
                    <SelectItem value="ASSIGNMENT_SUBMISSION">Bài nộp bài tập</SelectItem>
                    <SelectItem value="QUIZ_ATTACHMENT">Đính kèm bài trắc nghiệm</SelectItem>
                    <SelectItem value="POLICY">Chính sách</SelectItem>
                    <SelectItem value="OTHER">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Tabs defaultValue="overview" className="w-full mt-2">
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/40 p-1">
              <TabsTrigger value="overview" className="text-xs font-semibold rounded-lg gap-1.5 cursor-pointer">
                <Info className="h-3.5 w-3.5" /> Tổng quan &amp; Nghiệp vụ
              </TabsTrigger>
              <TabsTrigger value="audit" className="text-xs font-semibold rounded-lg gap-1.5 cursor-pointer">
                <History className="h-3.5 w-3.5" /> Lịch sử thay đổi
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="space-y-4 pt-3">
              {/* Preview Box */}
              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col items-center justify-center min-h-[140px] relative">
                {loadingUrl ? (
                  <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span>Đang sinh đường dẫn xem trước tệp tin...</span>
                  </div>
                ) : file.fileType === "IMAGE" && downloadUrl ? (
                  <img
                    src={downloadUrl}
                    alt={file.originalName}
                    className="max-h-48 object-contain rounded-lg border shadow-xs"
                  />
                ) : file.fileType === "DOCUMENT" && downloadUrl ? (
                  <div className="text-center space-y-2">
                    <FileText className="h-12 w-12 text-brand-cobalt mx-auto" />
                    <p className="text-xs text-muted-foreground font-medium">Tài liệu PDF</p>
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                    >
                      <Eye className="h-3.5 w-3.5" /> Xem trước ở tab mới
                    </a>
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    {renderFileIcon()}
                    <p className="text-xs text-muted-foreground">Tệp tin không hỗ trợ xem trực tiếp</p>
                  </div>
                )}
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Thông tin cơ bản */}
                <div className="p-4 rounded-xl border border-border/60 space-y-2.5 bg-card">
                  <h4 className="font-bold text-muted-foreground uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5 text-primary" /> Thông tin tệp tin gốc
                  </h4>

                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">Tên tệp tin gốc:</span>
                    <span className="font-semibold text-foreground truncate max-w-[160px]" title={file.originalName}>
                      {file.originalName}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">Kích thước:</span>
                    <span className="font-mono font-bold text-foreground">{formatBytes(file.fileSize)}</span>
                  </div>

                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">Định dạng MIME:</span>
                    <span className="font-mono text-foreground">{file.contentType || "N/A"}</span>
                  </div>

                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">Loại tệp:</span>
                    <span className="font-mono font-semibold text-foreground">{file.fileType}</span>
                  </div>

                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">Thời gian chỉnh sửa:</span>
                    <span className="font-mono text-foreground">
                      {file.updatedAt ? formatDateTime(file.updatedAt) : "Chưa chỉnh sửa"}
                    </span>
                  </div>

                  <div className="flex justify-between pt-0.5">
                    <span className="text-muted-foreground">Trạng thái:</span>
                    <span>{getStatusBadge(file.status)}</span>
                  </div>
                </div>

                {/* Thông tin nghiệp vụ */}
                <div className="p-4 rounded-xl border border-border/60 space-y-2.5 bg-card">
                  <h4 className="font-bold text-muted-foreground uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-success-forest" /> Nghiệp vụ &amp; Tham chiếu
                  </h4>

                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">Phân loại mục đích:</span>
                    <span>{getUsageTypeBadge(file.usageType)}</span>
                  </div>

                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">Đối tượng sở hữu:</span>
                    {file.referenceEntityType && file.referenceEntityId ? (
                      entityRoute ? (
                        <a
                          href={entityRoute}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          {file.referenceEntityType} {file.referenceEntityId} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="font-semibold text-foreground">
                          {file.referenceEntityType} {file.referenceEntityId}
                        </span>
                      )
                    ) : (
                      <span className="text-muted-foreground italic">Không có (Chưa liên kết)</span>
                    )}
                  </div>

                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">Trạng thái tham chiếu:</span>
                    {isOrphan ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                        Chưa liên kết
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-forest/10 text-success-forest border border-success-forest/20">
                        Đang sử dụng
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">Ngày tải lên:</span>
                    <span className="font-mono text-foreground">{formatDateTime(file.createdAt)}</span>
                  </div>

                  <div className="flex justify-between items-start pt-0.5">
                    <span className="text-muted-foreground">Người tải lên:</span>
                    <div className="text-right">
                      <span className="font-medium text-foreground block">
                        {file.createdByName || (file.createdBy ? `ID: ${file.createdBy}` : "Hệ thống")}
                      </span>
                      {file.createdByCode && (
                        <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-semibold mt-0.5 inline-block">
                          Mã: {file.createdByCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {downloadUrl && (
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download>
                      <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-xl cursor-pointer">
                        <DownloadCloud className="h-3.5 w-3.5" /> Tải tệp gốc
                      </Button>
                    </a>
                  )}
                  <Button variant="ghost" size="sm" onClick={onClose} className="text-xs rounded-xl cursor-pointer">
                    Đóng
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {file.status === "ACTIVE" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmArchiveOpen(true)}
                      disabled={actionLoading}
                      className="text-xs gap-1.5 rounded-xl border-brand-cobalt/40 text-brand-cobalt hover:bg-brand-cobalt/10 cursor-pointer"
                    >
                      {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                      Lưu trữ tệp tin
                    </Button>
                  )}

                  {file.status === "DELETED" ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmPurgeOpen(true)}
                      disabled={actionLoading}
                      className="text-xs gap-1.5 rounded-xl bg-destructive hover:bg-destructive/90 cursor-pointer"
                    >
                      {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Xóa vĩnh viễn
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmDeleteOpen(true)}
                      disabled={actionLoading}
                      className="text-xs gap-1.5 rounded-xl cursor-pointer"
                    >
                      {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Xóa mềm
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: AUDIT LOGS */}
            <TabsContent value="audit" className="pt-3">
              {loadingAuditLogs ? (
                <div className="h-40 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Đang tải nhật ký thay đổi...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="h-36 flex flex-col items-center justify-center text-xs text-muted-foreground italic border border-dashed border-border/60 rounded-xl">
                  <span>Chưa ghi nhận nhật ký thay đổi nào cho tệp tin này.</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {auditLogs.map((logItem) => (
                    <div
                      key={logItem.id}
                      onClick={() => {
                        setSelectedAuditLog(logItem);
                        setAuditModalOpen(true);
                      }}
                      className="p-3 rounded-xl border border-border/60 hover:border-primary/50 bg-card hover:bg-muted/30 transition-all cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase bg-primary/10 text-primary border-primary/20">
                          {logItem.action}
                        </Badge>
                        <span className="font-semibold text-foreground">
                          {logItem.userFullName || logItem.userEmail || (logItem.userId ? `ID: ${logItem.userId}` : "Hệ thống")}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-primary" />
                          {formatDateTime(logItem.occurredAt || (logItem as any).createdAt)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Eye className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ConfirmDialog của Shadcn UI thay cho window.confirm */}
      <ConfirmDialog
        open={confirmArchiveOpen}
        onOpenChange={setConfirmArchiveOpen}
        title="Xác nhận lưu trữ tệp tin"
        description={`Bạn có chắc chắn muốn chuyển trạng thái tệp tin "${file.originalName}" sang đã lưu trữ?`}
        variant="warning"
        confirmText="Lưu trữ"
        onConfirm={executeArchive}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Xác nhận xóa mềm tệp tin"
        description={`Bạn có chắc chắn muốn xóa mềm tệp tin "${file.originalName}"? Tệp tin sẽ được chuyển vào trạng thái đã xóa.`}
        variant="destructive"
        confirmText="Xóa mềm"
        onConfirm={executeDelete}
      />

      <ConfirmDialog
        open={confirmPurgeOpen}
        onOpenChange={setConfirmPurgeOpen}
        title="Cảnh báo xóa vĩnh viễn"
        description={`Hành động này sẽ xóa vĩnh viễn tệp tin "${file.originalName}" khỏi hệ thống lưu trữ và cơ sở dữ liệu. Dữ liệu không thể phục hồi!`}
        variant="destructive"
        confirmText="Xóa vĩnh viễn"
        onConfirm={executePurge}
      />

      {/* Detail Audit Log Modal xem chi tiết từng Log */}
      <DetailAuditLogModal
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        log={selectedAuditLog}
      />
    </>
  );
};
