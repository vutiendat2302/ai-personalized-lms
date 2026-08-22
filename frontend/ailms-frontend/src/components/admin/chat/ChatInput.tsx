import React, { useRef, useEffect, useState } from "react";
import { Send, Square, Paperclip, FileText, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onSendFile?: (file: File) => void;
  onSendImage?: (file: File) => void;
  onStop: () => void;
  isStreaming: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onSendFile,
  onSendImage,
  onStop,
  isStreaming,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Auto resize textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${String(Math.min(textareaRef.current.scrollHeight, 120))}px`;
    }
  }, [input]);

  /** Thu hồi object URL còn lại khi chat input bị unmount. */
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  /** Chọn file mới và quản lý vòng đời URL preview ảnh. */
  const selectFile = (file: File) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreviewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setSelectedFile(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      selectFile(file);
    }
    e.target.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          selectFile(file);
          break;
        }
      }
    }
  };

  const handleSubmit = () => {
    if (isStreaming) return;
    const fileHandler = onSendFile ?? onSendImage;
    if (selectedFile && fileHandler) {
      fileHandler(selectedFile);
      clearFile();
    } else if (input.trim()) {
      onSend();
    }
  };

  const clearFile = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  const isImage = selectedFile?.type.startsWith("image/");
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${String(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-card border-t border-border/60 p-2.5 space-y-2">
      {/* File Preview Thumbnail / File Badge */}
      {selectedFile && (
        <div className="flex items-center gap-2.5 p-1.5 bg-muted/40 rounded-xl border border-border/60 w-fit max-w-full">
          <div className="relative group">
            {isImage && previewUrl ? (
              <img
                src={previewUrl}
                alt="Ảnh đính kèm"
                className="h-12 w-12 object-cover rounded-lg border border-border/80 shadow-2xs"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
                <FileText className="h-6 w-6" />
              </div>
            )}
            <Button
              type="button"
              variant="destructive"
              size="icon-xs"
              onClick={clearFile}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full shadow-sm hover:scale-110"
              title="Xóa tệp đính kèm"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="text-[11px] pr-2 text-muted-foreground truncate max-w-[200px]">
            <p className="font-medium text-foreground truncate">{selectedFile.name}</p>
            <p className="text-[10px] text-muted-foreground/80">
              {formatFileSize(selectedFile.size)} • {isImage ? "Gemini Vision OCR" : "AI Doc Parser"}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-end gap-1.5">
        {/* Hidden File Input for Images and Docs */}
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Upload File/Image Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => { fileInputRef.current?.click(); }}
          disabled={isStreaming}
          title="Đính kèm tài liệu (PDF, Word, TXT) hoặc hình ảnh"
          className="rounded-xl h-[38px] w-[38px] shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            selectedFile
              ? `Hỏi AI về tệp ${selectedFile.name} (Enter để gửi)...`
              : "Nhập câu hỏi cho AI (Shift + Enter để xuống dòng, dán ảnh Ctrl+V)..."
          }
          rows={1}
          disabled={isStreaming}
          className="flex-1 resize-none bg-muted/40 border-input rounded-xl px-3 py-2 text-xs focus-visible:ring-primary/40 disabled:opacity-50 min-h-[38px] max-h-[120px]"
        />

        {isStreaming ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={onStop}
            title="Dừng phản hồi"
            className="rounded-xl h-[38px] px-3 shrink-0 flex items-center gap-1 text-xs font-medium shadow-xs"
          >
            <Square className="h-4 w-4 fill-current" />
            <span className="hidden sm:inline">Dừng</span>
          </Button>
        ) : (
          <Button
            variant="default"
            size="icon-sm"
            onClick={handleSubmit}
            disabled={!input.trim() && !selectedFile}
            title="Gửi câu hỏi"
            className="rounded-xl h-[38px] w-[38px] shrink-0 shadow-xs"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
