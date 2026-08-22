import { useCallback, useEffect, useRef, useState } from "react";
import type { AiConversation, AiChatRequestPayload, ChatMessage } from "@/types/ai";
import {
  deleteConversation,
  getConversation,
  getConversations,
  renameConversation as renameConversationApi,
  streamChat,
  streamChatWithImage,
} from "@/services/aiChatService";

/** Sinh ID tạm cho message chỉ dùng để render phía frontend. */
const generateId = (prefix: string): string => {
  const value = crypto.randomUUID();
  return `${prefix}_${value}`;
};

/** Quản lý stream, persistence và thao tác lịch sử Admin Copilot. */
export function useAiChat(
  route: string,
  module: string,
  learningContext?: Pick<AiChatRequestPayload, "courseId" | "lessonId" | "retrievalScope">,
) {
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
    const timer = window.setTimeout(() => {
      void refreshConversations();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
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
  const sendMessage = useCallback(async (customText?: string) => {
    const question = (typeof customText === "string" ? customText : input).trim();
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
      ...learningContext,
    };
    try {
      await streamChat(payload, {
        signal: controller.signal,
        onConversationId: setConversationId,
        onMetadata: (metadata) => {
          if (metadata.sources) {
            setMessages((previous) => previous.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, sources: metadata.sources, route: metadata.route }
                : message
            ));
          }
        },
        onChunk: (chunk) => {
          pendingBufferRef.current += chunk;
          animFrameRef.current ??= requestAnimationFrame(() => {
              animFrameRef.current = null;
              flushPendingBuffer(assistantMessage.id);
            });
        },
        onComplete: () => {
          flushPendingBuffer(assistantMessage.id);
          setMessages((previous) => previous.map((message) =>
            message.id === assistantMessage.id ? { ...message, status: "completed" } : message
          ));
          void refreshConversations();
        },
        onError: (error) => {
          setMessages((previous) => previous.map((message) => message.id === assistantMessage.id
            ? {
                ...message,
                content: message.content.length > 0
                  ? message.content
                  : error.message.length > 0 ? error.message : "Không thể kết nối AI lúc này.",
                status: "error",
              }
            : message));
        },
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setMessages((previous) => previous.map((message) =>
          message.id === assistantMessage.id
            ? { ...message, content: message.content.length > 0 ? message.content : "Có lỗi kết nối.", status: "error" }
            : message
        ));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [conversationId, flushPendingBuffer, input, isStreaming, learningContext, module, refreshConversations, route]);

  /** Gửi câu hỏi kèm tệp tài liệu hoặc hình ảnh để AI phân tích. */
  const sendFileMessage = useCallback(async (file: File, customText?: string) => {
    if (isStreaming) return;
    const question = (typeof customText === "string" ? customText : input).trim();
    const isImage = file.type.startsWith("image/");
    const imageUrl = isImage ? URL.createObjectURL(file) : undefined;
    const userMessage: ChatMessage = {
      id: generateId("msg"), role: "user",
      content: question.length > 0
        ? question
        : isImage ? "Phân tích hình ảnh này" : `Phân tích tài liệu: ${file.name}`,
      imageUrl,
      fileName: file.name,
      fileType: file.type,
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
    try {
      await streamChatWithImage({
        image: file,
        question: question.length > 0 ? question : undefined,
        conversationId: conversationId ?? undefined,
        route,
        module,
        ...learningContext,
      }, {
        signal: controller.signal,
        onConversationId: setConversationId,
        onMetadata: (metadata) => {
          if (metadata.sources) {
            setMessages((previous) => previous.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, sources: metadata.sources, route: metadata.route }
                : message
            ));
          }
        },
        onChunk: (chunk: string) => {
          pendingBufferRef.current += chunk;
          animFrameRef.current ??= requestAnimationFrame(() => {
              animFrameRef.current = null;
              flushPendingBuffer(assistantMessage.id);
            });
        },
        onComplete: () => {
          flushPendingBuffer(assistantMessage.id);
          setMessages((previous) => previous.map((message) =>
            message.id === assistantMessage.id ? { ...message, status: "completed" } : message
          ));
          void refreshConversations();
        },
        onError: () => {
          setMessages((previous) => previous.map((message) => message.id === assistantMessage.id
            ? {
                ...message,
                content: message.content.length > 0 ? message.content : "Không thể phân tích tệp lúc này.",
                status: "error",
              }
            : message));
        },
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setMessages((previous) => previous.map((message) =>
          message.id === assistantMessage.id
            ? { ...message, content: message.content.length > 0 ? message.content : "Có lỗi phân tích tệp.", status: "error" }
            : message
        ));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [conversationId, flushPendingBuffer, input, isStreaming, learningContext, module, refreshConversations, route]);

  /** Gửi câu hỏi kèm tệp hình ảnh để Gemini Vision phân tích. */
  const sendImageMessage = sendFileMessage;

  /** Gửi lại câu hỏi gần nhất sau lỗi stream và bỏ cặp message lỗi khỏi giao diện. */
  const retryLastMessage = useCallback(() => {
    if (isStreaming) return;
    let failedIndex = -1;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === "assistant" && messages[index].status === "error") {
        failedIndex = index;
        break;
      }
    }
    if (failedIndex < 0) return;
    let userIndex = -1;
    for (let index = failedIndex - 1; index >= 0; index -= 1) {
      if (messages[index].role === "user") {
        userIndex = index;
        break;
      }
    }
    if (userIndex < 0) return;
    const question = messages[userIndex].content;
    setMessages((previous) => previous.slice(0, userIndex));
    void sendMessage(question);
  }, [isStreaming, messages, sendMessage]);

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
    conversationId, sendMessage, sendImageMessage, sendFileMessage, stopGenerating, startNewConversation,
    retryLastMessage, openConversation, removeConversation, renameConversation, refreshConversations,
  };
}
