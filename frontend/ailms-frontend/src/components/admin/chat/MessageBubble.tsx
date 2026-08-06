import React from "react";
import { Bot, User, Shield, Briefcase, GraduationCap, AlertCircle, Loader2 } from "lucide-react";
import type { ChatMessage, UserSystemRole } from "@/types/ai";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MessageBubbleProps {
  message: ChatMessage;
  userName?: string;
  userRole?: UserSystemRole;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  userName = "Người dùng",
  userRole,
}) => {
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const isError = message.status === "error";

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

        {/* Message content */}
        {message.content ? (
          <div>
            {!isUser ? (
              <MarkdownRenderer content={message.content} className="text-xs" />
            ) : (
              <div className="whitespace-pre-wrap">{message.content}</div>
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

        {/* Error alert indicator */}
        {isError && (
          <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Lỗi kết nối</span>
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
