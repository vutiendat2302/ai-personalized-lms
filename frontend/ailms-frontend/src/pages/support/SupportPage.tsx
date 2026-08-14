import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Headset,
  Send,
  UserCheck,
  RotateCw,
  Inbox,
  MessageCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Circle,
  MessageSquareText,
  Paperclip,
  Link2,
  FileText,
  ExternalLink,
  Loader2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getAccessToken } from "@/api/httpClient";
import type { SupportConversation, SupportMessage, SupportResource } from "@/api/support/supportApi";
import {
  acceptSupportConversation,
  getAssignedSupportConversations,
  getSupportAgentMessages,
  getSupportQueue,
  requestSupportClose,
  sendSupportAgentMessage,
  uploadSupportAttachment,
  searchSupportResources,
  sendSupportResource,
  updateSupportPresence,
} from "@/api/support/supportAgentApi";

interface AttachmentMetadata { fileName: string; contentType: string; size: number; url: string }
interface SupportTypingEvent { senderType: "VISITOR" | "HR"; typing: boolean }

/** Parse metadata message và trả fallback khi gặp dữ liệu lịch sử không hợp lệ. */
const parseMessageMetadata = <T,>(metadata: string | null, fallback: T): T => {
  if (!metadata) return fallback;
  try { return JSON.parse(metadata) as T; } catch { return fallback; }
};

/** Parse STOMP frame body và chỉ nhận event message hợp lệ từ backend. */
const parseStompMessage = (frame: string): SupportMessage | null => {
  const separator = frame.indexOf("\n\n");
  if (separator < 0) return null;
  try {
    return JSON.parse(frame.slice(separator + 2).replace(/\0$/, "")) as SupportMessage;
  } catch {
    return null;
  }
};

/** Lấy destination của STOMP frame để phân biệt message và typing event. */
const parseStompDestination = (frame: string): string | null => {
  const header = frame.slice(0, frame.indexOf("\n\n"));
  return header.split("\n").find((line) => line.startsWith("destination:"))?.slice("destination:".length) ?? null;
};

/** Parse typing event tạm thời từ đầu còn lại của conversation. */
const parseStompTyping = (frame: string): SupportTypingEvent | null => {
  const separator = frame.indexOf("\n\n");
  if (separator < 0) return null;
  try { return JSON.parse(frame.slice(separator + 2).replace(/\0$/, "")) as SupportTypingEvent; } catch { return null; }
};

interface SupportMessageNotification {
  conversationId: string;
  message: SupportMessage;
}

/** Parse thông báo chung để Support biết conversation nào vừa có tin mới. */
const parseStompNotification = (frame: string): SupportMessageNotification | null => {
  const separator = frame.indexOf("\n\n");
  if (separator < 0) return null;
  try {
    return JSON.parse(frame.slice(separator + 2).replace(/\0$/, "")) as SupportMessageNotification;
  } catch {
    return null;
  }
};

/** Lấy thông báo nghiệp vụ từ API để supporter biết lý do không nhận được ticket. */
const supportErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error !== "object" || error === null || !("response" in error)) return fallback;
  const response = (error as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message ?? fallback;
};

/** Lấy tên hiển thị an toàn cho conversation cũ chưa có fullName. */
const contactName = (conversation: SupportConversation): string => {
  const name = conversation.fullName?.trim();
  return name != null && name.length > 0 ? name : "Khách chưa cập nhật tên";
};

/** Tạo chữ cái avatar từ tên thật, fallback K cho dữ liệu lịch sử. */
const contactInitials = (conversation: SupportConversation): string => {
  const parts = conversation.fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.length > 0 ? parts.slice(-2).map((part) => part[0]).join("").toUpperCase() : "K";
};

/** Mẫu câu trả lời nhanh cho tư vấn viên. */
const QUICK_TEMPLATES = [
  "Xin chào! Em có thể tư vấn thông tin khóa học nào cho anh/chị ạ?",
  "Anh/Chị có thể mô tả rõ hơn mục tiêu học tập để em hỗ trợ chính xác hơn ạ?",
  "Em đang kiểm tra dữ liệu khóa học và gói học hiện có trên hệ thống.",
  "Em đã gửi nội dung tham khảo, anh/chị có thể nhấn vào card để xem chi tiết.",
];

/** Màn hình Support Chat chuyên nghiệp cho tư vấn viên. */
export const SupportPage: React.FC = () => {
  const { auth } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [queue, setQueue] = useState<SupportConversation[]>([]);
  const [assigned, setAssigned] = useState<SupportConversation[]>([]);
  const [selected, setSelected] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [content, setContent] = useState("");
  const [presence, setPresence] = useState<"ONLINE_AVAILABLE" | "ONLINE_BUSY" | "OFFLINE">("ONLINE_AVAILABLE");
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false);
  const [resourceQuery, setResourceQuery] = useState("");
  const [resources, setResources] = useState<SupportResource[]>([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [visitorTyping, setVisitorTyping] = useState(false);

  // Dialog States
  const [requestCloseConfirmOpen, setRequestCloseConfirmOpen] = useState(false);
  const [countdownNow, setCountdownNow] = useState(() => Date.now());

  const socketRef = useRef<WebSocket | null>(null);
  const notificationSocketRef = useRef<WebSocket | null>(null);
  const selectedRef = useRef<SupportConversation | null>(null);
  const subscriptionId = useRef("support-subscription");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingStopTimerRef = useRef<number | null>(null);
  const visitorTypingTimerRef = useRef<number | null>(null);
  const lastTypingSentAtRef = useRef(0);
  const totalUnread = Object.values(unreadCounts).reduce((total, count) => total + count, 0);
  const hasActiveConversation = assigned.some((item) =>
    ["ACTIVE", "WAITING_CONFIRMATION"].includes(item.status)
  );
  const requestCloseSeconds = selected?.requestCloseAvailableAtEpochMs
    ? Math.max(0, Math.ceil((Number(selected.requestCloseAvailableAtEpochMs) - countdownNow) / 1000))
    : null;
  const autoCloseSeconds = selected?.autoCloseAtEpochMs
    ? Math.max(0, Math.ceil((Number(selected.autoCloseAtEpochMs) - countdownNow) / 1000))
    : null;

  /** Format countdown đóng phiên dạng mm:ss. */
  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };

  /** Cập nhật countdown mỗi giây khi đang mở một cuộc trò chuyện. */
  useEffect(() => {
    if (!selected || !["ACTIVE", "WAITING_CONFIRMATION"].includes(selected.status)) return;
    const timer = window.setInterval(() => { setCountdownNow(Date.now()); }, 1000);
    return () => { window.clearInterval(timer); };
  }, [selected]);

  /** Tự động cuộn xuống cuối khung chat khi có tin nhắn mới. */
  const scrollToBottom = () => {
    if (shouldAutoScrollRef.current) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, visitorTyping]);

  /** Giữ nguyên vị trí khi supporter đang kéo lên đọc lịch sử. */
  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    shouldAutoScrollRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
  };

  /** Hủy các timer typing khi rời màn hình support. */
  useEffect(() => () => {
    if (typingStopTimerRef.current != null) window.clearTimeout(typingStopTimerRef.current);
    if (visitorTypingTimerRef.current != null) window.clearTimeout(visitorTypingTimerRef.current);
  }, []);

  /** Giữ conversation đang xem cho callback socket chung mà không phải reconnect. */
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  /** Tải danh sách hàng đợi và ticket được phân công. */
  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const [queueResponse, assignedResponse] = await Promise.all([
        getSupportQueue(),
        getAssignedSupportConversations(),
      ]);
      setQueue(queueResponse.conversations || []);
      setAssigned(assignedResponse.conversations || []);
      setSelected((current) =>
        current ? (assignedResponse.conversations || []).find((item) => item.id === current.id) ?? current : null
      );
    } catch (err) {
      console.error("Lỗi cập nhật danh sách hỗ trợ:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  /** Gửi heartbeat tự động và định kỳ làm mới queue, không cho sửa presence thủ công. */
  useEffect(() => {
    void updateSupportPresence("ONLINE_AVAILABLE");
    void refresh();
    const refreshTimer = window.setInterval(() => void refresh(), 5000);
    const heartbeatTimer = window.setInterval(() => void updateSupportPresence("ONLINE_AVAILABLE"), 30000);
    return () => {
      window.clearInterval(refreshTimer);
      window.clearInterval(heartbeatTimer);
      void updateSupportPresence("OFFLINE");
      socketRef.current?.close();
    };
  }, [refresh]);

  /** Suy ra trạng thái hiển thị từ workload mà backend đã phân công. */
  useEffect(() => {
    const busy = assigned.some((item) => ["ASSIGNED", "ACTIVE", "WAITING_CONFIRMATION"].includes(item.status));
    setPresence(busy ? "ONLINE_BUSY" : "ONLINE_AVAILABLE");
  }, [assigned]);

  /** Subscribe kênh chung để báo tin visitor mới ở mọi ticket đang phụ trách. */
  useEffect(() => {
    if (!auth.accessToken) return;
    const socketUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws/support`;
    const socket = new WebSocket(socketUrl);
    notificationSocketRef.current = socket;
    socket.onopen = () => {
      socket.send(`CONNECT\naccept-version:1.2\nauthorization:Bearer ${getAccessToken() ?? auth.accessToken}\n\n\0`);
    };
    socket.onmessage = (event) => {
      if (typeof event.data === "string" && event.data.startsWith("CONNECTED")) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send("SUBSCRIBE\nid:support-notifications\ndestination:/user/queue/support-notifications\nack:auto\n\n\0");
        }
        return;
      }
      const notification = parseStompNotification(event.data as string);
      if (!notification?.conversationId || !notification.message) return;
      void refresh();
      if (selectedRef.current?.id === notification.conversationId) {
        setMessages((current) => current.some((item) => item.id === notification.message.id)
          ? current : [...current, notification.message]);
        return;
      }
      setUnreadCounts((current) => ({
        ...current,
        [notification.conversationId]: (current[notification.conversationId] ?? 0) + 1,
      }));
      showSuccess(`Tin nhắn mới từ Ticket #${notification.conversationId.slice(-8)}`);
    };
    return () => {
      socket.close();
      if (notificationSocketRef.current === socket) notificationSocketRef.current = null;
    };
  }, [auth.accessToken, refresh, showSuccess]);

  /** Subscribe kênh chat của cuộc trò chuyện đang chọn. */
  useEffect(() => {
    if (!selected || !auth.accessToken) return;
    void getSupportAgentMessages(selected.id)
      .then(setMessages)
      .catch(() => { setMessages([]); });

    const socketUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws/support`;
    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(`CONNECT\naccept-version:1.2\nauthorization:Bearer ${getAccessToken() ?? auth.accessToken}\n\n\0`);
    };

    socket.onmessage = (event) => {
      if (typeof event.data === "string" && event.data.startsWith("CONNECTED")) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(`SUBSCRIBE\nid:${subscriptionId.current}\ndestination:/topic/support/${selected.id}\nack:auto\n\n\0`);
          socket.send(`SUBSCRIBE\nid:${subscriptionId.current}-typing\ndestination:/topic/support/${selected.id}/typing\nack:auto\n\n\0`);
        }
        return;
      }
      if (parseStompDestination(event.data as string)?.endsWith("/typing")) {
        const typing = parseStompTyping(event.data as string);
        if (typing?.senderType !== "VISITOR") return;
        setVisitorTyping(typing.typing);
        if (visitorTypingTimerRef.current != null) window.clearTimeout(visitorTypingTimerRef.current);
        if (typing.typing) {
          visitorTypingTimerRef.current = window.setTimeout(() => { setVisitorTyping(false); }, 3000);
        }
        return;
      }
      const message = parseStompMessage(event.data as string);
      if (message) {
        if (message.senderType === "VISITOR") setVisitorTyping(false);
        setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      }
    };

    return () => {
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [auth.accessToken, selected]);

  /** Phát trạng thái supporter đang nhập qua socket, không lưu thành message. */
  const publishSupportTyping = (typing: boolean) => {
    if (!selected?.id || socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(`SEND\ndestination:/app/support/${selected.id}/typing\ncontent-type:application/json\n\n${JSON.stringify({ typing })}\0`);
  };

  /** Cập nhật nội dung và tự tắt typing sau khi supporter dừng nhập. */
  const handleSupportContentChange = (value: string) => {
    setContent(value);
    if (typingStopTimerRef.current != null) window.clearTimeout(typingStopTimerRef.current);
    if (!value.trim()) {
      publishSupportTyping(false);
      return;
    }
    const now = Date.now();
    if (now - lastTypingSentAtRef.current >= 700) {
      publishSupportTyping(true);
      lastTypingSentAtRef.current = now;
    }
    typingStopTimerRef.current = window.setTimeout(() => { publishSupportTyping(false); }, 1200);
  };

  /** Tìm catalog thật có debounce khi tư vấn viên mở picker link. */
  useEffect(() => {
    if (!resourcePickerOpen) return;
    const timer = window.setTimeout(() => {
      setResourceLoading(true);
      void searchSupportResources(resourceQuery, 12)
        .then(setResources)
        .catch(() => { showError("Không thể tải danh sách khóa học đang mở bán"); })
        .finally(() => { setResourceLoading(false); });
    }, 250);
    return () => { window.clearTimeout(timer); };
  }, [resourcePickerOpen, resourceQuery, showError]);

  /** Mở ticket và xóa badge chưa đọc của riêng conversation đó. */
  const handleSelectConversation = (conversation: SupportConversation) => {
    selectedRef.current = conversation;
    setSelected(conversation);
    setUnreadCounts((current) => {
      if (!current[conversation.id]) return current;
      const next = { ...current };
      delete next[conversation.id];
      return next;
    });
  };

  /** Claim ticket từ queue chung; backend tiếp tục khóa và kiểm tra giới hạn một phiên. */
  const handleAcceptTicket = async (conversation: SupportConversation) => {
    try {
      setBusyAction(true);
      const accepted = await acceptSupportConversation(conversation.id);
      handleSelectConversation(accepted);
      showSuccess(`Đã tiếp nhận thành công Ticket #${conversation.id}`);
      await refresh();
    } catch (error) {
      showError(supportErrorMessage(error, "Không thể tiếp nhận ticket này. Vui lòng thử lại."));
    } finally {
      setBusyAction(false);
    }
  };

  /** Gửi tin nhắn tư vấn realtime hoặc HTTP fallback. */
  const handleSendMessage = async () => {
    if (!selected || !content.trim()) return;
    const textToSend = content.trim();
    if (textToSend.length > 2000) { showError("Tin nhắn tối đa 2000 ký tự"); return; }
    setContent("");
    publishSupportTyping(false);
    if (typingStopTimerRef.current != null) window.clearTimeout(typingStopTimerRef.current);

    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(
        `SEND\ndestination:/app/support/${selected.id}/message\ncontent-type:application/json\n\n${JSON.stringify({
          content: textToSend,
        })}\0`
      );
    } else {
      try {
        const saved = await sendSupportAgentMessage(selected.id, textToSend);
        setMessages((current) => [...current, saved]);
      } catch {
        showError("Gửi tin nhắn thất bại");
        setContent(textToSend);
      }
    }
  };

  /** Validate và upload ảnh/tài liệu của tư vấn viên vào ticket đang ACTIVE. */
  const handleUploadAttachment = async (file: File | undefined) => {
    if (!selected || !file) return;
    const supported = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain"];
    if (file.size > 10 * 1024 * 1024) { showError("Tệp vượt quá giới hạn 10MB"); return; }
    if (!supported.includes(file.type)) { showError("Chỉ hỗ trợ JPG, PNG, WEBP, GIF, PDF, DOCX, XLSX và TXT"); return; }
    setBusyAction(true);
    try {
      const saved = await uploadSupportAttachment(selected.id, file);
      setMessages((current) => current.some((item) => item.id === saved.id) ? current : [...current, saved]);
    } catch { showError("Không thể tải tệp lên"); }
    finally {
      setBusyAction(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /** Gửi card catalog đã được Backend xác thực vào conversation. */
  const handleSendResource = async (resource: SupportResource) => {
    if (!selected) return;
    setResourceLoading(true);
    try {
      const saved = await sendSupportResource(selected.id, resource);
      setMessages((current) => current.some((item) => item.id === saved.id) ? current : [...current, saved]);
      setResourcePickerOpen(false);
      setResourceQuery("");
    } catch { showError("Không thể gửi nội dung tham khảo"); }
    finally { setResourceLoading(false); }
  };

  /** Gửi yêu cầu đóng cuộc trò chuyện. */
  const handleConfirmRequestClose = async () => {
    if (!selected) return;
    try {
      setBusyAction(true);
      const updated = await requestSupportClose(selected.id);
      showSuccess("Đã gửi yêu cầu đóng ticket tới khách hàng");
      setSelected(updated);
      await refresh();
    } catch (error) {
      showError(supportErrorMessage(error, "Gửi yêu cầu đóng thất bại"));
    } finally {
      setBusyAction(false);
      setRequestCloseConfirmOpen(false);
    }
  };


  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-6 space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border/50 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Headset className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                  Trung Tâm Tư Vấn & Hỗ Trợ Realtime
                </h1>
                <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold">
                  <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500" />
                  Live Consultant
                </Badge>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Tiếp nhận lượt chat tư vấn từ Landing Page & hỗ trợ khách hàng tức thì qua WebSocket
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Badge variant="outline" className={`h-9 gap-2 px-3 text-xs font-bold ${presence === "ONLINE_BUSY" ? "text-amber-600" : presence === "ONLINE_AVAILABLE" ? "text-emerald-600" : "text-muted-foreground"}`}>
              <Circle className={`h-2.5 w-2.5 ${presence === "ONLINE_BUSY" ? "fill-amber-500 text-amber-500" : presence === "ONLINE_AVAILABLE" ? "fill-emerald-500 text-emerald-500 animate-pulse" : "fill-muted-foreground text-muted-foreground"}`} />
              {presence === "ONLINE_BUSY" ? "Đang tư vấn · có hàng đợi" : presence === "ONLINE_AVAILABLE" ? "Đang online · sẵn sàng" : "Ngoại tuyến"}
            </Badge>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={refreshing}
              className="h-9 px-3 rounded-xl border-border/60 hover:bg-muted"
              title="Làm mới hàng đợi"
            >
              <RotateCw className={`h-4 w-4 ${refreshing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
              <span className="hidden sm:inline text-xs font-medium ml-1.5">Làm mới</span>
            </Button>
          </div>
        </div>

        {/* MAIN WORKSPACE GRID */}
        <div className="grid min-h-0 grid-cols-1 gap-6 lg:h-[calc(100vh-210px)] lg:min-h-[620px] lg:max-h-[780px] lg:grid-cols-[340px_1fr]">
          {/* LEFT PANEL: TICKET HUB */}
          <Card className="flex h-[520px] min-h-0 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xs lg:h-auto">
            <Tabs defaultValue="queue" className="flex h-full min-h-0 flex-col">
              <div className="p-3.5 border-b border-border/50 bg-muted/20">
                <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/60 rounded-xl">
                  <TabsTrigger value="queue" className="text-xs font-bold rounded-lg py-1.5">
                    Hàng đợi ({queue.length})
                  </TabsTrigger>
                  <TabsTrigger value="assigned" className="text-xs font-bold rounded-lg py-1.5">
                    Cuộc trò chuyện ({assigned.length})
                    {totalUnread > 0 && (
                      <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] leading-none text-destructive-foreground">
                        {totalUnread > 99 ? "99+" : `+${totalUnread}`}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* TAB 1: QUEUE */}
              <TabsContent value="queue" className="flex-1 overflow-y-auto p-3 m-0 space-y-2.5">
                {queue.length > 0 ? (
                  queue.map((item) => (
                    <div
                      key={item.id}
                      className="group relative flex flex-col justify-between p-3.5 rounded-xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-xs transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold tracking-tight text-foreground">
                            {contactName(item)}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                            {item.email ?? "Chưa có email"}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          {item.status || "WAITING"}
                        </Badge>
                      </div>

                      <div className="pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />Vị trí {item.queuePosition ?? 1} · Chờ {item.estimatedWaitMinutes == null ? "< 1 phút" : `${String(item.estimatedWaitMinutes)} phút`}
                        </span>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-[11px] font-bold"
                          disabled={busyAction || hasActiveConversation}
                          onClick={() => { void handleAcceptTicket(item); }}
                          title={hasActiveConversation ? "Bạn cần kết thúc cuộc trò chuyện hiện tại trước" : "Nhận ticket này"}
                        >
                          {busyAction ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <UserCheck className="mr-1 h-3.5 w-3.5" />}
                          {hasActiveConversation ? "Đang bận" : "Nhận tư vấn"}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center p-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                      <Inbox className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Hàng đợi trống</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                      Hiện không có yêu cầu tư vấn nào mới từ khách hàng Landing Page.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: CURRENT AND CLOSED CONVERSATIONS */}
              <TabsContent value="assigned" className="flex-1 overflow-y-auto p-3 m-0 space-y-2.5">
                {assigned.length > 0 ? (
                  assigned.map((item) => {
                    const isSelected = selected?.id === item.id;
                    const unread = unreadCounts[item.id] ?? 0;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { handleSelectConversation(item); }}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-xs font-semibold"
                            : "border-border/60 bg-card hover:bg-muted/40 hover:border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="truncate text-sm font-bold text-foreground">
                            {contactName(item)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {unread > 0 && (
                              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-destructive-foreground">
                                {unread > 99 ? "99+" : `+${unread}`}
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                item.status === "WAITING_CONFIRMATION"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                  : item.status === "ACTIVE"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {item.status === "WAITING_CONFIRMATION" ? "Chờ xác nhận"
                                : item.status === "ACTIVE" ? "Đang chat" : "Đã đóng"}
                            </Badge>
                          </div>
                        </div>
                        <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />{item.email ?? "Chưa có email"}
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center p-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                      <MessageSquareText className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Chưa có cuộc trò chuyện</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                      Vui lòng chuyển sang tab Hàng đợi để nhận yêu cầu tư vấn.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          {/* RIGHT PANEL: LIVE CHAT WORKSPACE */}
          <Card className="flex h-[720px] min-h-0 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xs lg:h-auto">
            {selected ? (
              <>
                {/* WORKSPACE HEADER */}
                <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10 border border-border/40">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                          {contactInitials(selected)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-foreground">
                          {contactName(selected)}
                        </h2>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {selected.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <Mail className="mr-1 inline h-3.5 w-3.5" />{selected.email ?? "Chưa có email"}
                      </p>
                    </div>
                  </div>

                  {/* Header Quick Actions */}
                  <div className="flex items-center gap-2">
                    {selected.status === "ASSIGNED" && <Button
                      size="sm"
                      disabled={busyAction}
                      onClick={() => void handleAcceptTicket(selected)}
                      className="h-8 text-xs font-semibold"
                    >
                      <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                      Bắt đầu tư vấn
                    </Button>}
                    {["ACTIVE", "WAITING_CONFIRMATION"].includes(selected.status) && <Button
                      variant="outline"
                      size="sm"
                      disabled={selected.status !== "ACTIVE" || requestCloseSeconds == null || requestCloseSeconds > 0}
                      onClick={() => { setRequestCloseConfirmOpen(true); }}
                      className="h-8 text-xs font-semibold rounded-lg border-border/60 hover:bg-muted"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                      {selected.status === "WAITING_CONFIRMATION" && autoCloseSeconds != null
                        ? `Tự đóng sau ${formatCountdown(autoCloseSeconds)}`
                        : requestCloseSeconds == null
                          ? "Hãy gửi tin trước"
                          : requestCloseSeconds > 0
                            ? `Chờ phản hồi ${formatCountdown(requestCloseSeconds)}`
                            : "Yêu cầu đóng"}
                    </Button>}
                  </div>
                </div>

                {/* MESSAGES CONTAINER */}
                <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/10 p-4 md:p-6 space-y-4">
                  {messages.length > 0 ? (
                    messages.map((msg) => {
                      const isSupport = msg.senderType === "HR";
                      const isSystem = msg.senderType === "SYSTEM";
                      const attachment = msg.messageType === "ATTACHMENT"
                        ? parseMessageMetadata<AttachmentMetadata | null>(msg.metadata, null) : null;
                      const linkedResources = msg.messageType === "RESOURCE_CARD"
                        ? parseMessageMetadata<{ resources?: SupportResource[] }>(msg.metadata, {}).resources ?? [] : [];

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-2">
                            <span className="text-[11px] text-muted-foreground bg-muted/60 border border-border/40 px-3 py-1 rounded-full font-medium shadow-2xs">
                              {msg.content}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isSupport ? "items-end" : "items-start"} space-y-1`}
                        >
                          <div className="flex items-center gap-1.5 px-1">
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {isSupport ? "Tư vấn viên (Bạn)" : "Khách hàng"}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60">
                              {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>

                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs md:text-sm leading-relaxed shadow-2xs ${
                              isSupport
                                ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                                : "bg-card text-foreground border border-border/50 rounded-tl-xs"
                            }`}
                          >
                            {attachment ? (
                              attachment.contentType.startsWith("image/")
                                ? <a href={attachment.url} target="_blank" rel="noreferrer"><img src={attachment.url} alt={attachment.fileName} className="max-h-64 rounded-xl object-cover" /></a>
                                : <a href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline"><FileText className="h-4 w-4" />{attachment.fileName}</a>
                            ) : msg.content}
                          </div>
                          {linkedResources.map((resource) => (
                            <a key={`${resource.type}-${resource.id}`} href={resource.href} target="_blank" rel="noreferrer" className="block w-full max-w-sm overflow-hidden rounded-xl border bg-card hover:border-primary hover:shadow-sm">
                              {resource.imageUrl
                                ? <img src={resource.imageUrl} alt={resource.title} className="h-32 w-full object-cover" />
                                : <div className="flex h-20 items-center justify-center bg-muted"><ExternalLink className="h-6 w-6 text-primary" /></div>}
                              <div className="space-y-1.5 p-3">
                                <Badge variant="secondary" className="text-[9px]">{resource.type}</Badge>
                                <p className="line-clamp-2 text-sm font-bold">{resource.title}</p>
                                <p className="line-clamp-2 text-[11px] text-muted-foreground">{resource.subtitle ?? "Nhấn để xem chi tiết"}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16">
                      <MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-2" />
                      <p className="text-xs font-semibold text-muted-foreground">Chưa có tin nhắn nào trong cuộc trò chuyện này.</p>
                    </div>
                  )}
                  {visitorTyping && <div className="flex items-start gap-2" role="status" aria-label={`${contactName(selected)} đang nhập`}>
                    <Avatar className="h-8 w-8 border border-border/40">
                      <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">{contactInitials(selected)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="px-1 text-[10px] font-bold text-muted-foreground">{contactName(selected)} đang nhập</p>
                      <div className="flex w-fit items-center gap-1 rounded-2xl rounded-tl-xs border border-border/50 bg-card px-3 py-3">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>}
                  <div ref={messagesEndRef} />
                </div>

                {selected.status === "ACTIVE" && <>
                {/* QUICK TEMPLATES CHIPS */}
                <div className="px-4 py-2 bg-muted/30 border-t border-border/40 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Mẫu nhanh:
                  </span>
                  {QUICK_TEMPLATES.map((tmpl, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => { setContent((prev) => (prev ? `${prev} ${tmpl}` : tmpl)); }}
                      className="h-7 shrink-0 text-[11px] font-medium"
                    >
                      {tmpl.slice(0, 30)}...
                    </Button>
                  ))}
                </div>

                {/* FOOTER INPUT BAR */}
                <div className="relative p-4 border-t border-border/50 bg-card">
                  {resourcePickerOpen && <div className="absolute bottom-full left-4 right-4 z-20 mb-2 max-h-72 overflow-y-auto rounded-xl border bg-popover p-3 shadow-xl">
                    <Input value={resourceQuery} onChange={(event) => { setResourceQuery(event.target.value); }} placeholder="Tìm khóa học có gói đang bán..." className="mb-2" />
                    {resourceLoading ? <div className="flex justify-center p-5"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : resources.length > 0 ? <div className="space-y-1">
                      {resources.map((resource) => <Button key={`${resource.type}-${resource.id}`} variant="ghost" className="h-auto w-full justify-start gap-2 p-2 text-left" onClick={() => void handleSendResource(resource)}>
                        {resource.imageUrl ? <img src={resource.imageUrl} alt="" className="h-10 w-12 rounded object-cover" /> : <Link2 className="h-4 w-4 text-primary" />}
                        <span className="min-w-0"><span className="block truncate text-xs font-bold">{resource.title}</span><span className="block truncate text-[10px] text-muted-foreground">Khóa học · {resource.subtitle ?? "Chưa có danh mục"}</span></span>
                      </Button>)}
                    </div> : <p className="p-4 text-center text-xs text-muted-foreground">Không có dữ liệu phù hợp.</p>}
                  </div>}
                  <div className="flex items-center gap-2">
                    <input ref={fileInputRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.docx,.xlsx,.txt" onChange={(event) => void handleUploadAttachment(event.target.files?.[0])} />
                    <Button variant="outline" size="icon" disabled={busyAction} onClick={() => fileInputRef.current?.click()} title="Gửi ảnh hoặc tài liệu"><Paperclip className="h-4 w-4" /></Button>
                    <Button variant={resourcePickerOpen ? "secondary" : "outline"} size="icon" disabled={busyAction} onClick={() => { setResourcePickerOpen((current) => !current); }} title="Gửi khóa học"><Link2 className="h-4 w-4" /></Button>
                    <Input
                      value={content}
                      maxLength={2000}
                      onChange={(e) => { handleSupportContentChange(e.target.value); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      placeholder="Nhập nội dung tư vấn cho khách hàng... (ấn Enter để gửi)"
                      className="flex-1 h-10 rounded-xl text-xs md:text-sm border-border/60"
                    />
                    <Button
                      onClick={() => void handleSendMessage()}
                      disabled={!content.trim()}
                      className="h-10 px-4 rounded-xl font-bold text-xs shrink-0 shadow-xs"
                    >
                      <Send className="h-4 w-4 mr-1.5" />
                      Gửi
                    </Button>
                  </div>
                </div>
                </>}
              </>
            ) : (
              /* EMPTY WORKSPACE PLACEHOLDER */
              <div className="flex flex-col items-center justify-center flex-1 text-center p-8 min-h-[500px]">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 shadow-xs">
                  <Headset className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-foreground">Chưa chọn lượt tư vấn nào</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                  Vui lòng chọn một Ticket từ <strong className="text-foreground">Hàng đợi</strong> hoặc <strong className="text-foreground">Cuộc trò chuyện</strong> ở cột bên trái.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* CONFIRM DIALOGS */}
      <ConfirmDialog
        open={requestCloseConfirmOpen}
        onOpenChange={setRequestCloseConfirmOpen}
        title="Yêu cầu đóng Ticket tư vấn"
        description={`Xác nhận gửi thông báo đề nghị đóng lượt tư vấn tới Ticket #${selected?.id.slice(-8)}?`}
        confirmText="Gửi yêu cầu đóng"
        variant="default"
        loading={busyAction}
        onConfirm={handleConfirmRequestClose}
      />

    </div>
  );
};
