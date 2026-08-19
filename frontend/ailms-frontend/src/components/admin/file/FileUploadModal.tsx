import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fileAdminApi } from "@/api/file/fileAdminApi";
import { UploadCloud, File, X, Loader2, ShieldAlert } from "lucide-react";

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalName, setOriginalName] = useState("");
  const [usageType, setUsageType] = useState<string>("OTHER");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  /** Xử lý sự kiện khi chọn tệp tin từ máy tính */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setOriginalName(file.name);
      setErrorMsg("");
    }
  };

  /** Xử lý tải tệp tin lên hệ thống MinIO */
  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMsg("Vui lòng chọn một tệp tin từ máy tính của bạn!");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      const displayName = originalName.trim() || selectedFile.name;
      await fileAdminApi.uploadFile(selectedFile, "AUTO", usageType, displayName);
      onSuccess(`Tải tệp tin "${displayName}" lên hệ thống lưu trữ thành công!`);
      setSelectedFile(null);
      setOriginalName("");
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Tải tệp tin thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl p-6 border border-border/40 bg-card shadow-xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <UploadCloud className="h-5 w-5 text-primary" /> Tải tệp tin mới lên hệ thống
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Tải tệp tin từ máy tính. Hệ thống sẽ tự động lưu vào bộ nhớ lưu trữ MinIO và cập nhật thông tin dữ liệu tệp tin.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl text-xs flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* File Selector Dropzone */}
          <div className="border-2 border-dashed border-border/80 hover:border-primary/60 transition-colors rounded-xl p-6 text-center bg-muted/20 relative cursor-pointer">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <File className="h-10 w-10 text-primary" />
                <span className="text-xs font-bold text-foreground truncate max-w-xs">
                  {selectedFile.name}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                <p className="text-xs font-semibold text-foreground">
                  Nhấp để chọn file hoặc kéo thả tệp tin vào đây
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Hỗ trợ các tệp tin PDF, hình ảnh, tài liệu, video, âm thanh...
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="file-original-name" className="text-xs font-semibold text-muted-foreground">
              Tên hiển thị
            </Label>
            <Input
              id="file-original-name"
              value={originalName}
              onChange={(event) => setOriginalName(event.target.value)}
              placeholder="Tự lấy từ tên tệp tin đã chọn"
              disabled={!selectedFile}
              className="h-9 text-xs rounded-xl border-border/80 bg-background text-foreground"
            />
            <p className="text-[11px] text-muted-foreground">Có thể đổi tên; hệ thống luôn giữ đúng định dạng tệp tin gốc.</p>
          </div>

          {/* Module Usage Type Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Phân loại mục đích sử dụng</Label>
            <Select value={usageType} onValueChange={setUsageType}>
              <SelectTrigger className="h-9 text-xs rounded-xl border-border/80 bg-background text-foreground">
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

        <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs rounded-xl cursor-pointer">
            Hủy bỏ
          </Button>
          <Button
            size="sm"
            onClick={handleUpload}
            disabled={loading || !selectedFile}
            className="text-xs gap-1.5 rounded-xl shadow-xs cursor-pointer"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
            Bắt đầu tải lên
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
