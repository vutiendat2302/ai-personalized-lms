import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fileAdminApi } from "@/api/file/fileAdminApi";
import { UploadCloud, File, X, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";

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
  const [usageType, setUsageType] = useState<string>("OTHER");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMsg("Vui lòng chọn một tệp tin từ máy tính của bạn!");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      await fileAdminApi.uploadFile(selectedFile, "AUTO", usageType);
      onSuccess(`Tải tệp tin "${selectedFile.name}" lên MinIO và lưu Metadata thành công!`);
      setSelectedFile(null);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Tải tệp tin thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-primary" /> Tải Tệp Tin Mới Lên MinIO
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Tải tệp tin vật lý từ máy tính. Hệ thống sẽ tự động lưu vào MinIO Bucket và sinh dòng thông tin Metadata trong Database.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl text-xs flex items-center gap-2">
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
                  Hỗ trợ các file PDF, HÌNH ẢNH, DOCX, VIDEO, AUDIO...
                </p>
              </div>
            )}
          </div>

          {/* Module Usage Type Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Phân loại Module (Usage Type)</Label>
            <Select value={usageType} onValueChange={setUsageType}>
              <SelectTrigger className="h-9 text-xs rounded-xl border-border/80">
                <SelectValue placeholder="Chọn Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONTRACT">Hợp đồng (CONTRACT)</SelectItem>
                <SelectItem value="AVATAR">Ảnh đại diện (AVATAR)</SelectItem>
                <SelectItem value="LESSON_RESOURCE">Tài liệu Bài học (LESSON_RESOURCE)</SelectItem>
                <SelectItem value="ASSIGNMENT">Bài tập (ASSIGNMENT)</SelectItem>
                <SelectItem value="QUIZ_ATTACHMENT">Đính kèm Quiz (QUIZ_ATTACHMENT)</SelectItem>
                <SelectItem value="OTHER">Khác (OTHER)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs rounded-xl">
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={handleUpload}
            disabled={loading || !selectedFile}
            className="text-xs gap-1.5 rounded-xl shadow-xs"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
            Bắt đầu Tải lên
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
