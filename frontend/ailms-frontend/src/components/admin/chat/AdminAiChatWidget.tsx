import React, { useState, useRef, useEffect } from "react";
import { Bot, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAiChat } from "@/hooks/useAiChat";
import { useToast } from "@/hooks/useToast";
import type { UserSystemRole } from "@/types/ai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { ConversationHistory } from "./ConversationHistory";
import { useLocation } from "react-router-dom";

/** Ánh xạ route toàn hệ thống sang module dùng để filter RAG. */
const resolveChatModule = (pathname: string): string => {
  if (pathname.startsWith("/sales")) return "SALES";
  if (pathname.startsWith("/analytics")) return "REPORTING";
  if (/contracts|employees|students|attendance|salaries|work-schedule|approval|category-teachers/.test(pathname)) return "HR";
  if (/courses|reviews|classrooms|sessions|quizzes/.test(pathname)) return "TRAINING";
  return "SYSTEM";
};

export const AiChatWidget: React.FC = () => {
  const { auth } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    setInput,
    isStreaming,
    conversations,
    conversationId,
    isHistoryLoading,
    historyError,
    sendMessage,
    stopGenerating,
    startNewConversation,
    openConversation,
    removeConversation,
    renameConversation,
  } = useAiChat(location.pathname, resolveChatModule(location.pathname));

  const currentUser = auth.user;
  const userName = currentUser?.fullName || currentUser?.username || "Người dùng";

  // Handle click outside to close chat window
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        !isClearConfirmOpen &&
        widgetRef.current &&
        !widgetRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, isClearConfirmOpen]);

  // Derive user's AILMS system role (ADMIN, HR, TA, TEACHER, STUDENT)
  const getUserSystemRole = (): UserSystemRole => {
    const roles = currentUser?.roles || [];
    const roleStrings = roles.map((r: any) =>
      (typeof r === "object" ? r?.code || r?.name || "" : String(r)).toUpperCase()
    );

    if (roleStrings.some((r: string) => r.includes("ADMIN"))) return "ADMIN";
    if (roleStrings.some((r: string) => r.includes("HR"))) return "HR";
    if (roleStrings.some((r: string) => r.includes("TEACHER"))) return "TEACHER";
    if (roleStrings.some((r: string) => r === "TA" || r.includes("ASSISTANT"))) return "TA";
    return "STUDENT";
  };

  const userRole = getUserSystemRole();

  /** Xóa conversation đã lưu hoặc chỉ dọn chat mới chưa được backend cấp ID. */
  const handleConfirmClearHistory = async () => {
    if (conversationId) {
      await removeConversation(conversationId);
    } else {
      startNewConversation();
    }
    setIsClearConfirmOpen(false);
    toast.success("Đã xóa cuộc trò chuyện!");
  };

  return (
    <div ref={widgetRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Chat Container using Shadcn Card */}
      {isOpen && (
        <Card className="w-[380px] sm:w-[420px] h-[540px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] shadow-2xl flex flex-col mb-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 border border-border/80 p-0 gap-0 backdrop-blur-md">
          {/* Header */}
          <ChatHeader
            userRoleLabel={userRole}
            hasMessages={messages.length > 0}
            onClearHistory={() => setIsClearConfirmOpen(true)}
            onToggleHistory={() => setIsHistoryOpen((value) => !value)}
            onNewConversation={() => {
              startNewConversation();
              setIsHistoryOpen(false);
            }}
            onClose={() => setIsOpen(false)}
          />

          {/* Messages List */}
          {isHistoryOpen ? (
            <ConversationHistory
              conversations={conversations}
              currentId={conversationId}
              loading={isHistoryLoading}
              error={historyError}
              onOpen={(id) => {
                void openConversation(id).then(() => setIsHistoryOpen(false));
              }}
              onDelete={(id) => {
                void removeConversation(id);
              }}
              onRename={(id, title) => {
                void renameConversation(id, title)
                  .then(() => toast.success("Đã đổi tiêu đề hội thoại"));
              }}
            />
          ) : (
            <ChatMessages
              messages={messages}
              userName={userName}
              userRole={userRole}
              isStreaming={isStreaming}
            />
          )}

          {/* Input Area */}
          {!isHistoryOpen && (
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={sendMessage}
              onStop={stopGenerating}
              isStreaming={isStreaming}
            />
          )}
        </Card>
      )}

      {/* Confirm Dialog using Shadcn ConfirmDialog */}
      <ConfirmDialog
        open={isClearConfirmOpen}
        onOpenChange={setIsClearConfirmOpen}
        title="Xóa lịch sử trò chuyện"
        description="Bạn có chắc chắn muốn xóa cuộc trò chuyện hiện tại không? Thao tác này không thể hoàn tác."
        confirmText="Xóa hội thoại"
        cancelText="Hủy bỏ"
        variant="destructive"
        onConfirm={handleConfirmClearHistory}
      />

      {/* Floating Toggle Trigger Button using Shadcn Button */}
      <Button
        size="icon"
        onClick={() => setIsOpen((v) => !v)}
        title={isOpen ? "Thu nhỏ AI Chat" : "Mở AI Copilot Chat"}
        className="h-14 w-14 rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20 group shrink-0"
      >
        {isOpen ? (
          <X className="h-6 w-6 transition-transform group-hover:rotate-90" />
        ) : (
          <Bot className="h-7 w-7 transition-transform group-hover:scale-110" />
        )}
      </Button>
    </div>
  );
};
