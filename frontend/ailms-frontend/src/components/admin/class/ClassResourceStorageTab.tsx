import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Upload,
  Search,
  Trash2,
  Download,
  Plus,
  Loader2,
  CheckCircle2,
  File,
  FileSpreadsheet,
  FileCode,
  FileImage,
  Video,
  Eye,
} from "lucide-react";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";
import httpClient from "@/api/httpClient";
import { fileAdminApi } from "@/api/file/fileAdminApi";

export interface ClassResourceItem {
  id: string;
  title: string;
  fileKey: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileUrl: string;
  uploadedByName: string;
  createdAt: string;
}

interface ClassResourceStorageTabProps {
  classId: string;
  className: string;
  membersCount?: number;
  currentUserName?: string;
}

export const ClassResourceStorageTab: React.FC<ClassResourceStorageTabProps> = ({
  classId,
  className,
  currentUserName = "Giảng viên",
}) => {
  const [resources, setResources] = useState<ClassResourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (classId) {
      fetchResources();
    }
  }, [classId, searchKeyword]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await adminCourseClassApi.getClassResources(classId, {
        keyword: searchKeyword.trim() || undefined,
        page: 0,
        size: 100,
      });

      if (res && res.content) {
        setResources(
          res.content.map((r: any) => ({
            id: String(r.id),
            title: r.title,
            fileKey: r.fileKey,
            fileName: r.fileName,
            fileType: r.fileType,
            fileSize: r.fileSize,
            fileUrl: r.fileUrl || `/api/v1/files/download?fileKey=${encodeURIComponent(r.fileKey)}`,
            uploadedByName: r.uploadedByName || "Giảng viên",
            createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : "Hôm nay",
          }))
        );
      } else {
        setResources([]);
      }
    } catch (err) {
      console.warn("Could not fetch class resources:", err);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  const canPreviewInBrowser = (fileType?: string, fileName?: string) => {
    const text = `${fileType || ""} ${fileName || ""}`.toLowerCase();
    if (text.match(/\.(doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z)$/)) return false;
    return (
      text.includes("pdf") ||
      text.includes("image") ||
      text.includes("video") ||
      text.includes("audio") ||
      text.includes("text") ||
      text.includes("csv")
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!newTitle) {
        setNewTitle(file.name);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast("Vui lòng chọn một file từ máy tính!");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload to MinIO
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("referenceEntityType", "CLASS_RESOURCE");

      const fileRes = await httpClient.post("/v1/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const fileData = fileRes.data?.data;
      if (!fileData) throw new Error("Upload failed");

      // 2. Save Class Resource entity
      await adminCourseClassApi.createClassResource(classId, {
        title: newTitle.trim() || selectedFile.name,
        fileKey: fileData.fileKey || fileData.key,
        fileName: fileData.originalName || selectedFile.name,
        fileType: fileData.fileType || selectedFile.type,
        fileSize: fileData.fileSize || selectedFile.size,
      });

      showToast("Tải lên tài liệu mới thành công!");
      setNewTitle("");
      setSelectedFile(null);
      setShowUploadForm(false);
      await fetchResources();
    } catch (err) {
      console.error("Upload resource error:", err);
      showToast("Tải lên tài liệu thất bại, vui lòng thử lại!");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      await adminCourseClassApi.deleteClassResource(classId, id);
      setResources((prev) => prev.filter((r) => r.id !== id));
      showToast("Đã xóa tài liệu khỏi kho lưu trữ");
    } catch (err) {
      console.error("Could not delete resource:", err);
    }
  };

  const handleViewResource = async (item: ClassResourceItem) => {
    if (!canPreviewInBrowser(item.fileType, item.fileName)) {
      return;
    }

    try {
      const previewUrl = await fileAdminApi.getPreviewUrl(item.fileKey);
      if (previewUrl) {
        window.open(previewUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(`/api/v1/files/download?fileKey=${encodeURIComponent(item.fileKey)}`, "_blank", "noopener,noreferrer");
    }
  };

  const getDownloadFileName = (contentDisposition?: string, fallback?: string) => {
    const utf8Match = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
    const plainMatch = contentDisposition?.match(/filename="?([^"]+)"?/i);
    return plainMatch?.[1] || fallback || "download";
  };

  const handleDownloadResource = async (item: ClassResourceItem) => {
    try {
      const response = await httpClient.get("/v1/files/download", {
        params: { fileKey: item.fileKey },
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = getDownloadFileName(response.headers["content-disposition"], item.fileName || item.title);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Could not download resource:", err);
      showToast("KhÃ´ng thá»ƒ táº£i file, vui lÃ²ng thá»­ láº¡i.");
    }
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <File className="h-6 w-6 text-blue-600" />;
    const ft = fileType.toLowerCase();
    if (ft.includes("pdf")) return <FileText className="h-6 w-6 text-red-600" />;
    if (ft.includes("sheet") || ft.includes("excel") || ft.includes("csv"))
      return <FileSpreadsheet className="h-6 w-6 text-emerald-600" />;
    if (ft.includes("image")) return <FileImage className="h-6 w-6 text-purple-600" />;
    if (ft.includes("video")) return <Video className="h-6 w-6 text-pink-600" />;
    if (ft.includes("zip") || ft.includes("code"))
      return <FileCode className="h-6 w-6 text-amber-600" />;
    return <File className="h-6 w-6 text-blue-600" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-emerald-600 text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="border-b border-border/60 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span>Kho Lưu Trữ Tài Liệu Lớp Học</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Nơi giảng viên đăng tải tài liệu học tập, bài giảng và tài liệu đính kèm cho lớp học <span className="font-semibold text-foreground">{className}</span>.
          </p>
        </div>

        <Button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="rounded-2xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1.5 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {showUploadForm ? "Đóng Form" : "Tải Lên Tài Liệu Mới"}
        </Button>
      </div>

      {/* Form Upload Slide Down */}
      {showUploadForm && (
        <Card className="border-indigo-100 bg-indigo-50/40 rounded-3xl overflow-hidden animate-in fade-in duration-200">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              <Upload className="h-4 w-4 text-indigo-600" />
              Tải Lên Tài Liệu Học Tập Mới (MinIO File Server)
            </h3>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Tên / Tiêu đề tài liệu</label>
                <Input
                  placeholder="Nhập tên tài liệu hiển thị..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-white text-xs rounded-xl"
                />
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-xs font-bold border-indigo-200 rounded-xl gap-2 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5 text-indigo-600" />
                  {selectedFile ? "Đổi file khác" : "Chọn File Từ Máy Tính"}
                </Button>

                {selectedFile && (
                  <span className="text-xs text-indigo-900 font-semibold truncate">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-indigo-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUploadForm(false)}
                  className="rounded-xl text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={uploading || !selectedFile}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-2 cursor-pointer"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Xác Nhận Tải Lên
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Toolbar: Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm tài liệu theo tên file..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-9 text-xs rounded-2xl bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* Resource Grid / List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> Đang tải danh sách tài liệu...
        </div>
      ) : resources.length === 0 ? (
        <Card className="border-dashed border-slate-200 shadow-none rounded-3xl">
          <CardContent className="p-12 text-center space-y-3">
            <FileText className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Kho tài liệu đang trống</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Lớp học chưa có tài liệu nào được tải lên. Bấm nút "Tải Lên Tài Liệu Mới" để thêm tài liệu học tập đầu tiên.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((item) => (
            <Card key={item.id} className="border-slate-200 shadow-none rounded-2xl hover:border-indigo-200 transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                    {getFileIcon(item.fileType)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate" title={item.title}>
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.fileName || "Tài liệu"} • {formatFileSize(item.fileSize)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Đăng bởi: <span className="font-semibold text-slate-600">{item.uploadedByName}</span> • {item.createdAt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {canPreviewInBrowser(item.fileType, item.fileName) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewResource(item)}
                      className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-50 rounded-xl"
                      title="Xem"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadResource(item)}
                    className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-50 rounded-xl"
                    title="Tải về"
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteResource(item.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 rounded-xl"
                    title="Xóa tài liệu"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
