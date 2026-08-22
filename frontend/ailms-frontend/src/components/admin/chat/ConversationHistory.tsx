import React from "react";
import { Check, Loader2, MessageSquare, Pencil, Trash2, X } from "lucide-react";
import type { AiConversation } from "@/types/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConversationHistoryProps {
  conversations: AiConversation[];
  currentId: string | null;
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

/** Hiển thị danh sách hội thoại thật đã lưu trên backend. */
export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations, currentId, loading, error, onOpen, onDelete, onRename,
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");

  /** Bắt đầu chỉnh sửa bằng tiêu đề hiện tại. */
  const startRename = (conversation: AiConversation) => {
    setEditingId(conversation.id);
    setTitle(conversation.title);
  };

  /** Gửi tiêu đề hợp lệ rồi đóng chế độ chỉnh sửa. */
  const saveRename = (id: string) => {
    const normalized = title.trim();
    if (!normalized) return;
    onRename(id, normalized);
    setEditingId(null);
  };
  if (loading) {
    return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  if (error) {
    return <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-destructive">{error}</div>;
  }
  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <MessageSquare className="h-8 w-8" />
        <p className="text-xs">Chưa có lịch sử hội thoại</p>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/20">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className={`flex items-center gap-2 rounded-lg border p-2 ${conversation.id === currentId ? "border-primary bg-primary/5" : "bg-background"}`}
        >
          {editingId === conversation.id ? (
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <Input
                value={title}
                maxLength={160}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && saveRename(conversation.id)}
                className="h-7 text-xs"
                autoFocus
              />
              <Button variant="ghost" size="icon-xs" onClick={() => saveRename(conversation.id)}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => setEditingId(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(conversation.id)}>
              <p className="truncate text-xs font-medium">{conversation.title}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {conversation.module} · {new Date(conversation.updatedAt).toLocaleString("vi-VN")}
              </p>
            </button>
          )}
          {editingId !== conversation.id && (
            <Button
              variant="ghost" size="icon-xs" title="Đổi tiêu đề"
              className="shrink-0 text-muted-foreground"
              onClick={() => startRename(conversation)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost" size="icon-xs" title="Xóa hội thoại"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(conversation.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
};
