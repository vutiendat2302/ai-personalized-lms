import React from "react";
import { Bot, Sparkles, Trash2, Minimize2, History, Plus } from "lucide-react";
import type { UserSystemRole } from "@/types/ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  userRoleLabel?: UserSystemRole;
  hasMessages: boolean;
  onClearHistory: () => void;
  onToggleHistory: () => void;
  onNewConversation: () => void;
  onClose: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  userRoleLabel,
  hasMessages,
  onClearHistory,
  onToggleHistory,
  onNewConversation,
  onClose,
}) => {
  const subtitle = userRoleLabel === "STUDENT"
    ? "Trợ lý hỗ trợ học tập AILMS"
    : userRoleLabel === "TEACHER" || userRoleLabel === "TA"
      ? "Trợ lý hỗ trợ giảng dạy AILMS"
      : "Trợ lý hỗ trợ quản trị AILMS";

  return (
    <div className="px-4 py-3 bg-primary/10 border-b border-border/60 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-xs">
          <Bot className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-foreground">AI Copilot</h3>
            <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            {userRoleLabel && (
              <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">
                {userRoleLabel}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onToggleHistory}
          title="Lịch sử hội thoại"
        >
          <History className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onNewConversation}
          title="Cuộc trò chuyện mới"
        >
          <Plus className="h-4 w-4" />
        </Button>
        {hasMessages && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClearHistory}
            title="Xóa lịch sử trò chuyện"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          title="Thu nhỏ"
          className="text-muted-foreground hover:text-foreground"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
