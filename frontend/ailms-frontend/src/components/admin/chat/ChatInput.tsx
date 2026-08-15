import React, { useRef, useEffect, useState } from "react";
import { Send, Square, Image as ImageIcon, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onSendImage?: (file: File) => void;
  onStop: () => void;
  isStreaming: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onSendImage,
  onStop,
  isStreaming,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Auto resize textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Clean up preview url
  useEffect(() => {
    if (selectedImage) {
      const url = URL.createObjectURL(selectedImage);
      setImagePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImagePreviewUrl(null);
    }
  }, [selectedImage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file);
    }
    e.target.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          setSelectedImage(file);
          break;
        }
      }
    }
  };

  const handleSubmit = () => {
    if (isStreaming) return;
    if (selectedImage && onSendImage) {
      onSendImage(selectedImage);
      setSelectedImage(null);
    } else if (input.trim()) {
      onSend();
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
  };

  return (
    <div className="bg-card border-t border-border/60 p-2.5 space-y-2">
      {/* Image Preview Thumbnail */}
      {imagePreviewUrl && (
        <div className="flex items-center gap-2 p-1.5 bg-muted/40 rounded-xl border border-border/60 w-fit max-w-full">
          <div className="relative group">
            <img
              src={imagePreviewUrl}
              alt="Ảnh đính kèm"
              className="h-14 w-14 object-cover rounded-lg border border-border/80 shadow-2xs"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
              title="Xóa ảnh"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="text-[11px] pr-2 text-muted-foreground truncate max-w-[180px]">
            <p className="font-medium text-foreground truncate">{selectedImage?.name}</p>
            <p className="text-[10px]">Gemini Vision OCR sẵn sàng</p>
          </div>
        </div>
      )}

      <div className="flex items-end gap-1.5">
        {/* Hidden File Input for Images */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Upload Image Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          title="Tải lên ảnh bài tập, sơ đồ hoặc đề thi"
          className="rounded-xl h-[38px] w-[38px] shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            selectedImage
              ? "Nhập câu hỏi về hình ảnh này (hoặc Enter để gửi)..."
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
            disabled={!input.trim() && !selectedImage}
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
