import React, { useState, useRef, useEffect, useMemo } from "react";
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
import { useParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Ánh xạ route toàn hệ thống sang module dùng để filter RAG. */
const resolveChatModule = (pathname: string): string => {
  if (pathname.startsWith("/sales")) return "SALES";
  if (pathname.startsWith("/analytics")) return "REPORTING";
  if (/contracts|employees|students|attendance|salaries|work-schedule|approval|category-teachers/.test(pathname)) return "HR";
  if (/courses|reviews|classrooms|sessions|quizzes|learn/.test(pathname)) return "TRAINING";
  return "SYSTEM";
};

export const AiChatWidget: React.FC = () => {
  const { auth } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const { courseId, lessonId, id } = useParams<{ courseId?: string; lessonId?: string; id?: string }>();
  // Course Builder của teacher dùng route /teacher/courses/:id, không phải :courseId.
  const resolvedCourseId = courseId || (location.pathname.includes("/courses/") ? id : undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [retrievalScope, setRetrievalScope] = useState<"LESSON_ONLY" | "CLASS_MATERIALS" | "COURSE_MATERIALS" | "GENERAL">(
    lessonId ? "LESSON_ONLY" : "COURSE_MATERIALS",
  );
  const widgetRef = useRef<HTMLDivElement>(null);
  const learningContext = useMemo(() => resolvedCourseId ? {
    courseId: resolvedCourseId,
    lessonId,
    retrievalScope: lessonId || retrievalScope !== "LESSON_ONLY" ? retrievalScope : "COURSE_MATERIALS",
  } as const : undefined, [resolvedCourseId, lessonId, retrievalScope]);

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
    sendFileMessage,
    sendImageMessage,
    stopGenerating,
    retryLastMessage,
    startNewConversation,
    openConversation,
    removeConversation,
    renameConversation,
  } = useAiChat(location.pathname, resolveChatModule(location.pathname), learningContext);

  const currentUser = auth.user;
  const userName = currentUser?.fullName?.trim()
    ? currentUser.fullName
    : currentUser?.username ?? "Người dùng";

  // Handle click outside to close chat window
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        !isFullscreen &&
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
  }, [isOpen, isFullscreen, isClearConfirmOpen]);

  /** Thoát chế độ toàn màn hình khi người dùng nhấn Escape. */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /** Suy vai trò hiển thị từ danh sách role code đã định kiểu trong AuthUser. */
  const getUserSystemRole = (): UserSystemRole => {
    const roles = currentUser?.roles ?? [];
    if (roles.includes("ADMIN")) return "ADMIN";
    if (roles.includes("HR")) return "HR";
    if (roles.includes("TEACHER")) return "TEACHER";
    if (roles.includes("TA")) return "TA";
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
    <div ref={widgetRef} className={isFullscreen ? "fixed inset-0 z-50" : "fixed bottom-6 right-6 z-50 flex flex-col items-end"}>
      {/* Floating Chat Container using Shadcn Card */}
      {isOpen && (
        <Card className={isFullscreen
          ? "h-full w-full max-w-none rounded-none shadow-2xl flex flex-col overflow-hidden border-0 p-0 gap-0 text-base [&_button]:text-base [&_input]:text-base [&_li]:text-base [&_p]:text-base [&_span]:text-base [&_textarea]:text-base"
          : "w-[380px] sm:w-[420px] h-[540px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] shadow-2xl flex flex-col mb-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 border border-border/80 p-0 gap-0 backdrop-blur-md"}>
          {/* Header */}
          <ChatHeader
            userRoleLabel={userRole}
            hasMessages={messages.length > 0}
            onClearHistory={() => { setIsClearConfirmOpen(true); }}
            onToggleHistory={() => { setIsHistoryOpen((value) => !value); }}
            onNewConversation={() => {
              startNewConversation();
              setIsHistoryOpen(false);
            }}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => { setIsFullscreen((value) => !value); }}
            onClose={() => {
              setIsOpen(false);
              setIsFullscreen(false);
            }}
          />

          {/* Messages List */}
          {isHistoryOpen ? (
            <ConversationHistory
              conversations={conversations}
              currentId={conversationId}
              loading={isHistoryLoading}
              error={historyError}
              onOpen={(id) => {
                void openConversation(id).then(() => {
                  setIsHistoryOpen(false);
                });
              }}
              onDelete={(id) => {
                void removeConversation(id);
              }}
              onRename={(id, title) => {
                void renameConversation(id, title)
                  .then(() => {
                    toast.success("Đã đổi tiêu đề hội thoại");
                  });
              }}
            />
          ) : (
            <>
              {courseId && userRole === "STUDENT" && (
                <div className="border-b bg-muted/20 px-3 py-2">
                  <Select value={retrievalScope} onValueChange={(value) => {
                    startNewConversation();
                    setRetrievalScope(value as typeof retrievalScope);
                  }} disabled={isStreaming}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {lessonId && <SelectItem value="LESSON_ONLY">Chỉ bài học hiện tại</SelectItem>}
                      <SelectItem value="CLASS_MATERIALS">Tài liệu của lớp</SelectItem>
                      <SelectItem value="COURSE_MATERIALS">Toàn bộ khóa học</SelectItem>
                      <SelectItem value="GENERAL">Kiến thức chung (không dùng tài liệu lớp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <ChatMessages
                messages={messages}
                userName={userName}
                userRole={userRole}
                isStreaming={isStreaming}
                onSelectPrompt={(prompt) => { void sendMessage(prompt); }}
                onRetry={retryLastMessage}
              />
            </>
          )}

          {/* Input Area */}
          {!isHistoryOpen && (
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={() => { void sendMessage(); }}
              onSendFile={(file) => { void sendFileMessage(file); }}
              onSendImage={(file) => { void sendImageMessage(file); }}
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
      {!isFullscreen && <Button
          size="icon"
          onClick={() => { setIsOpen((v) => !v); }}
          title={isOpen ? "Thu nhỏ AI Chat" : "Mở AI Copilot Chat"}
          className="h-14 w-14 rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20 group shrink-0"
        >
          {isOpen ? (
            <X className="h-6 w-6 transition-transform group-hover:rotate-90" />
          ) : (
            <Bot className="h-7 w-7 transition-transform group-hover:scale-110" />
          )}
        </Button>}
    </div>
  );
};
