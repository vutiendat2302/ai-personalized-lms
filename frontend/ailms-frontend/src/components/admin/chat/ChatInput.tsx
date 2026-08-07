import React, { useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  isStreaming,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-3 bg-card border-t border-border/60 flex items-end gap-2">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nhập câu hỏi cho AI (Shift + Enter để xuống dòng)..."
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
          onClick={onSend}
          disabled={!input.trim()}
          title="Gửi câu hỏi"
          className="rounded-xl h-[38px] w-[38px] shrink-0 shadow-xs"
        >
          <Send className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
