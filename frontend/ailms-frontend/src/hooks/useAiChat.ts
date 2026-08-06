import { useState, useRef, useCallback } from "react";
import type { ChatMessage, AiChatRequestPayload } from "@/types/ai";
import { streamChat } from "@/services/aiChatService";

const generateId = (): string => {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

const generateConversationId = (): string => {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string>(generateConversationId());
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingBufferRef = useRef<string>("");
  const animFrameRef = useRef<number | null>(null);

  // Throttled UI updater using requestAnimationFrame for smooth 60fps rendering without lag
  const flushPendingBuffer = useCallback((assistantMsgId: string) => {
    if (!pendingBufferRef.current) return;
    const chunkToFlush = pendingBufferRef.current;
    pendingBufferRef.current = "";

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantMsgId
          ? { ...msg, content: msg.content + chunkToFlush }
          : msg
      )
    );
  }, []);

  const sendMessage = useCallback(async () => {
    const question = input.trim();
    if (!question || isStreaming) return;

    const userMsgId = generateId();
    const assistantMsgId = generateId();
    const nowIso = new Date().toISOString();

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: question,
      createdAt: nowIso,
      status: "completed",
    };

    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      createdAt: nowIso,
      status: "streaming",
    };

    setInput("");
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const payload: AiChatRequestPayload = {
      conversationId,
      question,
    };

    try {
      await streamChat(payload, {
        signal: controller.signal,
        onChunk: (chunk: string) => {
          pendingBufferRef.current += chunk;
          if (animFrameRef.current === null) {
            animFrameRef.current = requestAnimationFrame(() => {
              animFrameRef.current = null;
              flushPendingBuffer(assistantMsgId);
            });
          }
        },
        onComplete: () => {
          // Flush remaining buffer
          if (pendingBufferRef.current) {
            flushPendingBuffer(assistantMsgId);
          }
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, status: "completed" } : msg
            )
          );
        },
        onError: (err: Error) => {
          console.error("AI Chat error:", err);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content: msg.content || "Xin lỗi, đã xảy ra lỗi kết nối với AI. Vui lòng thử lại.",
                    status: "error",
                  }
                : msg
            )
          );
        },
      });
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: msg.content || "Có lỗi kết nối. Vui lòng thử lại sau.",
                  status: "error",
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [input, isStreaming, conversationId, flushPendingBuffer]);

  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const lastMsg = prev[prev.length - 1];
      if (lastMsg.role === "assistant" && lastMsg.status === "streaming") {
        return prev.map((msg) =>
          msg.id === lastMsg.id ? { ...msg, status: "completed" } : msg
        );
      }
      return prev;
    });
  }, []);

  const clearHistory = useCallback(() => {
    stopGenerating();
    setMessages([]);
    setConversationId(generateConversationId());
  }, [stopGenerating]);

  return {
    messages,
    input,
    setInput,
    isStreaming,
    conversationId,
    sendMessage,
    stopGenerating,
    clearHistory,
  };
}
