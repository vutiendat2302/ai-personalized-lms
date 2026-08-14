import { useCallback, useEffect, useRef, useState } from "react";
import type { AiConversation, AiChatRequestPayload, ChatMessage } from "@/types/ai";
import {
  deleteConversation,
  getConversation,
  getConversations,
  renameConversation as renameConversationApi,
  streamChat,
} from "@/services/aiChatService";

/** Sinh ID tạm cho message chỉ dùng để render phía frontend. */
const generateId = (prefix: string): string => {
  const value = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return `${prefix}_${value}`;
};

/** Quản lý stream, persistence và thao tác lịch sử Admin Copilot. */
export function useAiChat(route: string, module: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingBufferRef = useRef("");
  const animFrameRef = useRef<number | null>(null);

  /** Tải danh sách hội thoại thật từ backend. */
  const refreshConversations = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      setConversations(await getConversations());
    } catch {
      setHistoryError("Không thể tải lịch sử hội thoại.");
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  /** Gộp các chunk đang chờ vào message assistant để render mượt. */
  const flushPendingBuffer = useCallback((assistantMsgId: string) => {
    if (!pendingBufferRef.current) return;
    const chunk = pendingBufferRef.current;
    pendingBufferRef.current = "";
    setMessages((previous) => previous.map((message) =>
      message.id === assistantMsgId
        ? { ...message, content: message.content + chunk }
        : message
    ));
  }, []);

  /** Gửi câu hỏi hiện tại và nhận câu trả lời SSE. */
  const sendMessage = useCallback(async () => {
    const question = input.trim();
    if (!question || isStreaming) return;
    const userMessage: ChatMessage = {
      id: generateId("msg"), role: "user", content: question,
      createdAt: new Date().toISOString(), status: "completed",
    };
    const assistantMessage: ChatMessage = {
      id: generateId("msg"), role: "assistant", content: "",
      createdAt: new Date().toISOString(), status: "streaming",
    };
    setInput("");
    setMessages((previous) => [...previous, userMessage, assistantMessage]);
    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const payload: AiChatRequestPayload = {
      ...(conversationId ? { conversationId } : {}),
      question,
      route,
      module,
    };
    try {
      await streamChat(payload, {
        signal: controller.signal,
        onConversationId: setConversationId,
        onChunk: (chunk) => {
          pendingBufferRef.current += chunk;
          if (animFrameRef.current === null) {
            animFrameRef.current = requestAnimationFrame(() => {
              animFrameRef.current = null;
              flushPendingBuffer(assistantMessage.id);
            });
          }
        },
        onComplete: () => {
          flushPendingBuffer(assistantMessage.id);
          setMessages((previous) => previous.map((message) =>
            message.id === assistantMessage.id ? { ...message, status: "completed" } : message
          ));
          void refreshConversations();
        },
        onError: () => setMessages((previous) => previous.map((message) =>
          message.id === assistantMessage.id
            ? { ...message, content: message.content || "Không thể kết nối AI lúc này.", status: "error" }
            : message
        )),
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setMessages((previous) => previous.map((message) =>
          message.id === assistantMessage.id
            ? { ...message, content: message.content || "Có lỗi kết nối.", status: "error" }
            : message
        ));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [conversationId, flushPendingBuffer, input, isStreaming, module, refreshConversations, route]);

  /** Dừng stream đang chạy và giữ phần câu trả lời đã nhận. */
  const stopGenerating = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
    setMessages((previous) => previous.map((message) =>
      message.status === "streaming" ? { ...message, status: "completed" } : message
    ));
  }, []);

  /** Tạo hội thoại trống mới mà không xóa hội thoại cũ. */
  const startNewConversation = useCallback(() => {
    stopGenerating();
    setMessages([]);
    setConversationId(null);
  }, [stopGenerating]);

  /** Mở lại hội thoại đã lưu từ backend. */
  const openConversation = useCallback(async (id: string) => {
    stopGenerating();
    const conversation = await getConversation(id);
    setConversationId(conversation.id);
    setMessages(conversation.messages.map((message) => ({ ...message, status: "completed" })));
  }, [stopGenerating]);

  /** Xóa hội thoại trên backend và chuyển sang cuộc trò chuyện mới nếu cần. */
  const removeConversation = useCallback(async (id: string) => {
    await deleteConversation(id);
    if (id === conversationId) startNewConversation();
    await refreshConversations();
  }, [conversationId, refreshConversations, startNewConversation]);

  /** Đổi tiêu đề hội thoại và tải lại danh sách phân trang đầu tiên. */
  const renameConversation = useCallback(async (id: string, title: string) => {
    await renameConversationApi(id, title);
    await refreshConversations();
  }, [refreshConversations]);

  return {
    messages, conversations, input, setInput, isStreaming, isHistoryLoading, historyError,
    conversationId, sendMessage, stopGenerating, startNewConversation,
    openConversation, removeConversation, renameConversation, refreshConversations,
  };
}
