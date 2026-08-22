import React from "react";
import { Bot, User, Shield, Briefcase, GraduationCap, AlertCircle, Loader2, FileText, BookOpen } from "lucide-react";
import type { ChatMessage, UserSystemRole } from "@/types/ai";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  message: ChatMessage;
  userName?: string;
  userRole?: UserSystemRole;
  onRetry?: () => void;
}

/** Ẩn protocol function-calling cũ nếu Backend/AI trả nhầm payload kỹ thuật ra giao diện. */
const naturalAssistantContent = (content: string): string => {
  const normalized = content.toLowerCase();
  const exposesToolProtocol = normalized.includes("arguments")
    || normalized.includes("create_quiz_for_course_or_lesson")
    || normalized.includes("chọn:");
  if (!exposesToolProtocol) return content;
  return "Mình đang xử lý yêu cầu với hệ thống. Nếu phiếu kiểm tra chưa xuất hiện trong kho, bạn hãy gửi lại yêu cầu kèm tên khóa học hoặc bài học cần gắn phiếu.";
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  userName = "Người dùng",
  userRole,
  onRetry,
}) => {
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const isError = message.status === "error";
  const displayContent = isUser ? message.content : naturalAssistantContent(message.content);

  const renderRoleIcon = () => {
    switch (userRole) {
      case "ADMIN":
        return <Shield className="h-3.5 w-3.5" />;
      case "HR":
        return <Briefcase className="h-3.5 w-3.5" />;
      case "TEACHER":
      case "TA":
        return <GraduationCap className="h-3.5 w-3.5" />;
      default:
        return <User className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <Avatar className="h-7 w-7 border border-primary/20 bg-primary/10 text-primary">
          <AvatarFallback className="bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={`px-3.5 py-2.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-xs shadow-xs"
            : isError
            ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-xs"
            : "bg-muted/80 text-foreground border border-border/50 rounded-bl-xs shadow-2xs"
        }`}
      >
        {/* Header line for sender name */}
        <div className="text-[10px] opacity-70 mb-1 font-medium flex items-center gap-1">
          {isUser ? userName : "AI Copilot"}
        </div>

        {/* Attached image if any */}
        {message.imageUrl && (
          <div className="mb-2">
            <img
              src={message.imageUrl}
              alt="Ảnh đính kèm"
              className="max-h-48 max-w-full rounded-lg object-contain border border-border/40 shadow-xs cursor-pointer hover:opacity-95"
              onClick={() => window.open(message.imageUrl, "_blank")}
            />
          </div>
        )}

        {/* Attached document if any */}
        {message.fileName && !message.imageUrl && (
          <div className={`mb-2 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${
            isUser ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground" : "bg-card border-border/60 text-foreground"
          }`}>
            <FileText className="h-4 w-4 shrink-0 opacity-80" />
            <span className="truncate max-w-[200px] font-medium text-[11px]">{message.fileName}</span>
          </div>
        )}

        {/* Message content */}
        {displayContent ? (
          <div>
            {!isUser ? (
              <MarkdownRenderer content={displayContent} className="text-xs" />
            ) : (
              <div className="whitespace-pre-wrap">{displayContent}</div>
            )}
            {isStreaming && (
              <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse align-middle" />
            )}
          </div>
        ) : isStreaming ? (
          <div className="flex items-center gap-1.5 text-muted-foreground italic">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Đang suy nghĩ...</span>
          </div>
        ) : null}

        {/* Citation References - Chỉ hiển thị khi có nguồn được xác thực thật */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-border/40 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              <BookOpen className="h-3 w-3 text-primary" />
              <span>Nguồn tham chiếu ({message.sources.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.sources.map((src) => (
                <div
                  key={src.chunkId}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-card/90 border border-border/50 text-[10px] text-foreground hover:bg-card transition-colors shadow-2xs"
                  title={`Score: ${src.score != null ? `${String(Math.round(src.score * 100))}%` : "N/A"}`}
                >
                  <FileText className="h-3 w-3 text-primary shrink-0" />
                  <span className="font-medium truncate max-w-[160px]">{src.title ?? src.sourceId}</span>
                  {src.pageNumber != null && (
                    <span className="text-muted-foreground shrink-0">(Trang {src.pageNumber})</span>
                  )}
                  {src.score != null && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-primary/10 text-primary font-semibold shrink-0">
                      {Math.round(src.score * 100)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error alert indicator */}
        {isError && (
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-medium text-destructive">
            <span className="flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />Lỗi kết nối</span>
            {onRetry && <Button type="button" size="xs" variant="outline" onClick={onRetry}>Thử lại</Button>}
          </div>
        )}
      </div>

      {isUser && (
        <Avatar className="h-7 w-7 bg-primary text-primary-foreground shadow-xs">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {renderRoleIcon()}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
