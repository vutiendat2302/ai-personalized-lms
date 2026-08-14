import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bot, Clock, ExternalLink, FileText, Headset, History, Loader2, Paperclip, RotateCcw, Send, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  closeVisitorSupportConversation,
  cancelSupportConversation,
  continueVisitorSupportConversation,
  ensureVisitor,
  getCurrentConversation,
  getSupportMessages,
  getSupportConversationHistory,
  getVisitorSupportConversation,
  getSupportOptions,
  sendQuickReply,
  sendVisitorMessage,
  startNewSupportConversation,
  submitContact,
  suggestGuidedIntents,
  uploadVisitorAttachment,
  type SupportConversation,
  type SupportMessage,
  type SupportOption,
  type SupportResource,
} from "@/api/support/supportApi";
import type { PublicCourseCard } from "@/api/public/publicCatalogApi";
import { resolveAvatarUrl } from "@/utils/avatarUrl";

interface ContactForm { fullName: string; phone: string; email: string; note: string }
type ContactErrors = Partial<Record<keyof ContactForm, string>>;
interface AttachmentMetadata { fileName: string; contentType: string; size: number; url: string }
interface SupportTypingEvent { senderType: "VISITOR" | "HR"; typing: boolean }
interface GuidedMetadata {
  options: { id: string; label: string }[];
  inputMode?: "BUDGET" | "COURSE_QUERY";
  selectionMode?: "SINGLE" | "MULTIPLE";
}

const SUPPORTED_FILES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain"];

const ANIMAL_AVATARS = [
  { emoji: "🐶", className: "bg-amber-100" },
  { emoji: "🐱", className: "bg-orange-100" },
  { emoji: "🐰", className: "bg-pink-100" },
  { emoji: "🐼", className: "bg-slate-100" },
  { emoji: "🦊", className: "bg-red-100" },
  { emoji: "🐨", className: "bg-zinc-100" },
  { emoji: "🐯", className: "bg-yellow-100" },
  { emoji: "🐧", className: "bg-sky-100" },
] as const;

/** Chọn avatar động vật ổn định từ visitor token thay vì đổi ngẫu nhiên mỗi render. */
const animalAvatarFor = (seed: string) => {
  let hash = 0;
  for (const character of seed) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return ANIMAL_AVATARS[Math.abs(hash) % ANIMAL_AVATARS.length] ?? ANIMAL_AVATARS[0];
};

/** Tạo ID local chỉ để hiển thị lựa chọn visitor trong lúc chờ response backend. */
const localId = () => `local_${String(Date.now())}_${Math.random().toString(36).slice(2, 8)}`;

/** Parse STOMP body và bỏ qua frame điều khiển. */
const parseSocketMessage = (frame: string): SupportMessage | null => {
  const separator = frame.indexOf("\n\n");
  if (separator < 0) return null;
  try { return JSON.parse(frame.slice(separator + 2).replace(/\0$/, "")) as SupportMessage; } catch { return null; }
};

/** Lấy destination của STOMP frame để phân biệt message và typing event. */
const parseSocketDestination = (frame: string): string | null => {
  const header = frame.slice(0, frame.indexOf("\n\n"));
  return header.split("\n").find((line) => line.startsWith("destination:"))?.slice("destination:".length) ?? null;
};

/** Parse typing event tạm thời từ backend. */
const parseSocketTyping = (frame: string): SupportTypingEvent | null => {
  const separator = frame.indexOf("\n\n");
  if (separator < 0) return null;
  try { return JSON.parse(frame.slice(separator + 2).replace(/\0$/, "")) as SupportTypingEvent; } catch { return null; }
};

/** Parse metadata JSON có kiểm soát và trả fallback khi dữ liệu cũ không hợp lệ. */
const parseMetadata = <T,>(metadata: string | null, fallback: T): T => {
  if (!metadata) return fallback;
  try { return JSON.parse(metadata) as T; } catch { return fallback; }
};

/** Lấy thông báo lỗi validation/API cụ thể để visitor biết cần sửa gì. */
const errorMessage = (error: unknown, fallback: string): string => {
  if (typeof error !== "object" || error === null || !("response" in error)) return fallback;
  const response = (error as { response?: { data?: { message?: string; details?: string[] } } }).response;
  return response?.data?.details?.[0] ?? response?.data?.message ?? fallback;
};

/** Format học phí course card theo locale Việt Nam, không dựng giá khi backend trả null. */
const formatCoursePrice = (price: number | null): string | null =>
  price == null ? null : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

/** Widget quick-action public và chat tự do chỉ sau khi kết nối tư vấn viên. */
export const PublicAiChatWidget: React.FC = () => {
  const { auth } = useAuth();
  const { error: showError } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [cancelConversationOpen, setCancelConversationOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [options, setOptions] = useState<SupportOption[]>([]);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactForm>(() => ({
    fullName: auth.user?.fullName ?? "", phone: "", email: auth.user?.email ?? "", note: "",
  }));
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
  const [chatText, setChatText] = useState("");
  const [loading, setLoading] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [supporterTyping, setSupporterTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SupportConversation[]>([]);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const visitorSocketRef = useRef<WebSocket | null>(null);
  const isOpenRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const typingTimerRef = useRef<number | null>(null);
  const typingStopTimerRef = useRef<number | null>(null);
  const supporterTypingTimerRef = useRef<number | null>(null);
  const lastTypingSentAtRef = useRef(0);
  const receivedRealtimeIdsRef = useRef<Set<string>>(new Set());
  const initializationAttemptedRef = useRef(false);
  const anonymousAnimal = useMemo(
    () => animalAvatarFor(visitorToken ?? "anonymous-visitor"),
    [visitorToken],
  );

  /** Khởi tạo session thật và khôi phục conversation/message khi widget được mở lần đầu. */
  useEffect(() => {
    if (!isOpen) { initializationAttemptedRef.current = false; return; }
    if (visitorToken || loading || initializationAttemptedRef.current) return;
    initializationAttemptedRef.current = true;
    setLoading(true);
    void Promise.all([ensureVisitor(), getSupportOptions()])
      .then(async ([session, supportOptions]) => {
        setOptions(supportOptions);
        setVisitorToken(session.visitorToken);
        const current = await getCurrentConversation(session.visitorToken);
        setConversation(current);
        setMessages(await getSupportMessages(session.visitorToken, current.id));
      })
      .catch((error: unknown) => { showError(errorMessage(error, "Không thể mở phiên tư vấn lúc này.")); })
      .finally(() => { setLoading(false); });
  }, [isOpen, loading, showError, visitorToken]);

  /** Xóa badge khi visitor mở widget và giữ trạng thái mới nhất cho socket callback. */
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  /** Chỉ bám cuối khi visitor chưa kéo lên đọc lịch sử. */
  useEffect(() => {
    if (shouldAutoScrollRef.current) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [botTyping, messages, supporterTyping]);

  /** Ghi nhận vị trí đọc để response/polling không cưỡng bức cuộn xuống cuối. */
  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    shouldAutoScrollRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
  };

  /** Hủy timer typing khi widget unmount để không cập nhật state muộn. */
  useEffect(() => () => {
    if (typingTimerRef.current != null) window.clearTimeout(typingTimerRef.current);
    if (typingStopTimerRef.current != null) window.clearTimeout(typingStopTimerRef.current);
    if (supporterTypingTimerRef.current != null) window.clearTimeout(supporterTypingTimerRef.current);
  }, []);

  /** Mở socket visitor khi conversation ACTIVE để nhận tin Support và đếm unread. */
  useEffect(() => {
    if (!visitorToken || !conversation?.id || conversation.status !== "ACTIVE") return;
    const socket = new WebSocket(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws/support`);
    visitorSocketRef.current = socket;
    socket.onopen = () => { socket.send(`CONNECT\naccept-version:1.2\nX-Visitor-Token:${visitorToken}\n\n\0`); };
    socket.onmessage = (event) => {
      if (typeof event.data === "string" && event.data.startsWith("CONNECTED")) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(`SUBSCRIBE\nid:visitor-support\ndestination:/topic/support/${conversation.id}\nack:auto\n\n\0`);
          socket.send(`SUBSCRIBE\nid:visitor-typing\ndestination:/topic/support/${conversation.id}/typing\nack:auto\n\n\0`);
        }
        return;
      }
      if (parseSocketDestination(event.data as string)?.endsWith("/typing")) {
        const typing = parseSocketTyping(event.data as string);
        if (typing?.senderType !== "HR") return;
        setSupporterTyping(typing.typing);
        if (supporterTypingTimerRef.current != null) window.clearTimeout(supporterTypingTimerRef.current);
        if (typing.typing) {
          supporterTypingTimerRef.current = window.setTimeout(() => { setSupporterTyping(false); }, 3000);
        }
        return;
      }
      const incoming = parseSocketMessage(event.data as string);
      if (!incoming || receivedRealtimeIdsRef.current.has(String(incoming.id))) return;
      receivedRealtimeIdsRef.current.add(String(incoming.id));
      if (incoming.senderType === "HR") setSupporterTyping(false);
      setMessages((current) => current.some((item) => item.id === incoming.id) ? current : [...current, incoming]);
      if (incoming.senderType === "HR" && !isOpenRef.current) setUnreadCount((current) => current + 1);
    };
    return () => { socket.close(); if (visitorSocketRef.current === socket) visitorSocketRef.current = null; };
  }, [conversation?.id, conversation?.status, visitorToken]);

  /** Phát trạng thái visitor đang nhập qua socket, không tạo message trong lịch sử. */
  const publishVisitorTyping = (typing: boolean) => {
    if (!conversation?.id || visitorSocketRef.current?.readyState !== WebSocket.OPEN) return;
    visitorSocketRef.current.send(`SEND\ndestination:/app/support/${conversation.id}/typing\ncontent-type:application/json\n\n${JSON.stringify({ typing })}\0`);
  };

  /** Cập nhật input và tự tắt typing sau khi visitor dừng gõ. */
  const handleActiveChatChange = (value: string) => {
    setChatText(value);
    if (typingStopTimerRef.current != null) window.clearTimeout(typingStopTimerRef.current);
    if (!value.trim()) {
      publishVisitorTyping(false);
      return;
    }
    const now = Date.now();
    if (now - lastTypingSentAtRef.current >= 700) {
      publishVisitorTyping(true);
      lastTypingSentAtRef.current = now;
    }
    typingStopTimerRef.current = window.setTimeout(() => { publishVisitorTyping(false); }, 1200);
  };

  /** Poll trạng thái queue/assignment để tự bật input khi Support accept. */
  useEffect(() => {
    if (!visitorToken || !conversation?.id || ["CLOSED", "CANCELLED"].includes(conversation.status)) return;
    const timer = window.setInterval(() => {
      void Promise.all([
        getCurrentConversation(visitorToken),
        getSupportMessages(visitorToken, conversation.id),
      ]).then(([current, currentMessages]) => {
        setConversation(current);
        setMessages(currentMessages);
      }).catch(() => undefined);
    }, 5000);
    return () => { window.clearInterval(timer); };
  }, [conversation?.id, conversation?.status, visitorToken]);

  /** Cập nhật đồng hồ queue và countdown đóng phiên từ mốc thời gian backend. */
  useEffect(() => {
    if (!conversation || !["QUEUED", "ASSIGNED", "ACTIVE", "WAITING_CONFIRMATION"].includes(conversation.status)) return;
    const interval = ["ACTIVE", "WAITING_CONFIRMATION"].includes(conversation.status) ? 1000 : 30000;
    const timer = window.setInterval(() => { setClockNow(Date.now()); }, interval);
    return () => { window.clearInterval(timer); };
  }, [conversation?.id, conversation?.status]);

  /** Đọc metadata guided mới và vẫn tương thích message quick array cũ. */
  const guidedMetadata = useMemo<GuidedMetadata | null>(() => {
    const latest = [...messages].reverse().find((message) => message.senderType === "BOT");
    if (latest?.messageType !== "QUICK_REPLIES") return null;
    const parsed = parseMetadata<unknown>(latest.metadata, []);
    if (Array.isArray(parsed)) return { options: parsed as GuidedMetadata["options"] };
    if (typeof parsed === "object" && parsed !== null && "options" in parsed) return parsed as GuidedMetadata;
    return null;
  }, [messages]);

  /** Gửi optionId về Backend; frontend không tự dựng câu trả lời hoặc gọi AI trực tiếp. */
  const chooseOption = async (option: { id: string; label: string }) => {
    if (!visitorToken || !conversation?.id || loading) return;
    setLoading(true);
    if (option.id !== "REQUEST_AGENT") {
      typingTimerRef.current = window.setTimeout(() => { setBotTyping(true); }, 450);
    }
    setMessages((current) => [...current, {
      id: localId(), senderType: "VISITOR", messageType: "TEXT", content: option.label,
      metadata: null, createdAt: new Date().toISOString(),
    }]);
    try {
      const response = await sendQuickReply(visitorToken, conversation.id, option.id);
      setMessages((current) => [...current, response]);
      setConversation((current) => current ? {
        ...current,
        status: option.id === "REQUEST_AGENT"
          ? "COLLECTING_CONTACT"
          : current.status === "COLLECTING_CONTACT" ? "GUIDED" : current.status,
      } : current);
    } catch (error) {
      showError(errorMessage(error, "Không thể xử lý lựa chọn này. Vui lòng thử lại."));
    } finally {
      const typingTimer = typingTimerRef.current;
      if (typingTimer != null) window.clearTimeout(typingTimer);
      typingTimerRef.current = null;
      setBotTyping(false);
      setLoading(false);
    }
  };

  /** Gửi mô tả guided để embedding chỉ gợi ý quick intent, không tự sinh dữ liệu nghiệp vụ. */
  const sendGuidedQuestion = async () => {
    if (!visitorToken || !conversation?.id || conversation.status !== "GUIDED" || loading) return;
    const text = chatText.trim();
    if (text.length < 2) { showError("Vui lòng mô tả nhu cầu ít nhất 2 ký tự."); return; }
    setChatText("");
    setLoading(true);
    typingTimerRef.current = window.setTimeout(() => { setBotTyping(true); }, 450);
    setMessages((current) => [...current, {
      id: localId(), senderType: "VISITOR", messageType: "TEXT", content: text,
      metadata: null, createdAt: new Date().toISOString(),
    }]);
    try {
      const response = await suggestGuidedIntents(visitorToken, conversation.id, text);
      setMessages((current) => [...current, response]);
    } catch (error) {
      setChatText(text);
      showError(errorMessage(error, "Không thể gợi ý nội dung lúc này."));
    } finally {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
      setBotTyping(false);
      setLoading(false);
    }
  };

  /** Validate contact ở client đồng bộ với Bean Validation backend. */
  const validateContact = (): boolean => {
    const errors: ContactErrors = {};
    if (!contact.fullName.trim()) errors.fullName = "Vui lòng nhập họ tên.";
    else if (contact.fullName.trim().length > 120) errors.fullName = "Họ tên tối đa 120 ký tự.";
    if (contact.phone.trim() && !/^(\+84|0)(3|5|7|8|9)[0-9]{8}$/.test(contact.phone.trim())) {
      errors.phone = "Số điện thoại không hợp lệ, ví dụ: 0912345678 hoặc +84912345678.";
    }
    if (!contact.email.trim()) errors.email = "Vui lòng nhập email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) errors.email = "Email không đúng định dạng.";
    if (contact.note.length > 1000) errors.note = "Nội dung ghi chú tối đa 1000 ký tự.";
    setContactErrors(errors);
    if (Object.keys(errors).length > 0) showError(Object.values(errors)[0] ?? "Thông tin liên hệ chưa hợp lệ.");
    return Object.keys(errors).length === 0;
  };

  /** Lưu contact hợp lệ rồi chuyển conversation sang queue/assignment. */
  const sendContact = async () => {
    if (!visitorToken || !conversation?.id || loading || !validateContact()) return;
    setLoading(true);
    try {
      const saved = await submitContact(visitorToken, conversation.id, {
        fullName: contact.fullName.trim(),
        phone: contact.phone.trim() || undefined, email: contact.email.trim(), note: contact.note.trim() || undefined,
      });
      setConversation(saved);
      setContactErrors({});
    } catch (error) {
      showError(errorMessage(error, "Không thể gửi thông tin liên hệ."));
    } finally { setLoading(false); }
  };

  /** Gửi text tự do chỉ trong conversation ACTIVE với tư vấn viên. */
  const sendChat = async () => {
    if (!visitorToken || !conversation?.id || conversation.status !== "ACTIVE" || loading) return;
    const text = chatText.trim();
    if (!text) { showError("Vui lòng nhập nội dung tin nhắn."); return; }
    if (text.length > 2000) { showError("Tin nhắn tối đa 2000 ký tự."); return; }
    setChatText("");
    publishVisitorTyping(false);
    if (typingStopTimerRef.current != null) window.clearTimeout(typingStopTimerRef.current);
    const socket = visitorSocketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(`SEND\ndestination:/app/support/${conversation.id}/message\ncontent-type:application/json\n\n${JSON.stringify({ content: text })}\0`);
      return;
    }
    try {
      const saved = await sendVisitorMessage(visitorToken, conversation.id, text);
      setMessages((current) => [...current, saved]);
    } catch (error) {
      setChatText(text);
      showError(errorMessage(error, "Không thể gửi tin nhắn."));
    }
  };

  /** Validate và upload một ảnh/tài liệu trong conversation ACTIVE. */
  const uploadAttachment = async (file: File | undefined) => {
    if (!file || !visitorToken || !conversation?.id || conversation.status !== "ACTIVE") return;
    if (file.size > 10 * 1024 * 1024) { showError("Tệp vượt quá giới hạn 10MB."); return; }
    if (!SUPPORTED_FILES.includes(file.type)) { showError("Chỉ hỗ trợ JPG, PNG, WEBP, GIF, PDF, DOCX, XLSX và TXT."); return; }
    setLoading(true);
    try {
      const saved = await uploadVisitorAttachment(visitorToken, conversation.id, file);
      setMessages((current) => current.some((item) => item.id === saved.id) ? current : [...current, saved]);
    } catch (error) {
      showError(errorMessage(error, "Không thể tải tệp lên."));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /** Kết thúc phiên cũ và tải lịch sử của conversation mới. */
  const createNewConversation = async () => {
    if (!visitorToken || loading) return;
    setLoading(true);
    try {
      const created = await startNewSupportConversation(visitorToken);
      setConversation(created);
      setMessages(await getSupportMessages(visitorToken, created.id));
      setContact({ fullName: "", phone: "", email: "", note: "" });
      setContactErrors({});
      setHistoryOpen(false);
    } catch (error) {
      showError(errorMessage(error, "Không thể tạo cuộc trò chuyện mới."));
    } finally { setLoading(false); }
  };

  /** Mở danh sách lịch sử thật của visitor từ Backend. */
  const openHistory = async () => {
    if (!visitorToken || loading) return;
    if (historyOpen) { setHistoryOpen(false); return; }
    setLoading(true);
    try {
      setHistory(await getSupportConversationHistory(visitorToken));
      setHistoryOpen(true);
    } catch (error) { showError(errorMessage(error, "Không thể tải lịch sử trò chuyện.")); }
    finally { setLoading(false); }
  };

  /** Chọn conversation lịch sử và tải lại detail/message sau ownership check. */
  const openHistoricalConversation = async (conversationId: string) => {
    if (!visitorToken || loading) return;
    setLoading(true);
    try {
      const [detail, oldMessages] = await Promise.all([
        getVisitorSupportConversation(visitorToken, conversationId),
        getSupportMessages(visitorToken, conversationId),
      ]);
      setConversation(detail);
      setMessages(oldMessages);
      setHistoryOpen(false);
    } catch (error) { showError(errorMessage(error, "Không thể mở cuộc trò chuyện này.")); }
    finally { setLoading(false); }
  };

  /** Đồng ý đóng theo yêu cầu tư vấn viên. */
  const confirmClose = async () => {
    if (!visitorToken || !conversation?.id || loading) return;
    setLoading(true);
    try { setConversation(await closeVisitorSupportConversation(visitorToken, conversation.id)); }
    catch (error) { showError(errorMessage(error, "Không thể đóng cuộc trò chuyện.")); }
    finally { setLoading(false); }
  };

  /** Hủy yêu cầu đang chờ và cập nhật ngay trạng thái conversation trong widget. */
  const cancelQueuedConversation = async () => {
    if (!visitorToken || !conversation?.id || loading) return;
    setLoading(true);
    try {
      const cancelled = await cancelSupportConversation(visitorToken, conversation.id);
      setConversation(cancelled);
      setCancelConversationOpen(false);
    } catch (error) {
      showError(errorMessage(error, "Không thể hủy yêu cầu tư vấn. Vui lòng thử lại."));
    } finally {
      setLoading(false);
    }
  };

  /** Từ chối đóng và đưa conversation trở lại ACTIVE. */
  const keepConversationActive = async () => {
    if (!visitorToken || !conversation?.id || loading) return;
    setLoading(true);
    try {
      const message = await continueVisitorSupportConversation(visitorToken, conversation.id);
      setConversation((current) => current ? { ...current, status: "ACTIVE" } : current);
      setMessages((current) => [...current, message]);
    } catch (error) { showError(errorMessage(error, "Không thể tiếp tục cuộc trò chuyện.")); }
    finally { setLoading(false); }
  };

  /** Render avatar theo người gửi; khách ẩn danh giữ cùng một con vật trong suốt phiên. */
  const renderChatAvatar = (senderType: SupportMessage["senderType"]) => {
    if (senderType === "VISITOR") {
      if (auth.user) {
        const normalizedName = auth.user.fullName?.trim();
        const displayName = normalizedName != null && normalizedName.length > 0 ? normalizedName : auth.user.username;
        const initials = displayName.split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();
        return <Avatar className="h-8 w-8 shrink-0 border bg-card">
          <AvatarImage src={auth.user.avatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">{initials.length > 0 ? initials : "U"}</AvatarFallback>
        </Avatar>;
      }
      return <Avatar className="h-8 w-8 shrink-0 border bg-card">
        <AvatarFallback className={`${anonymousAnimal.className} text-base`}>{anonymousAnimal.emoji}</AvatarFallback>
      </Avatar>;
    }
    return <Avatar className="h-8 w-8 shrink-0 border bg-card">
      {senderType === "HR" && <AvatarImage
        src={resolveAvatarUrl(conversation?.assignedSupportAvatarUrl)}
        alt={conversation?.assignedSupportName ?? "Tư vấn viên"}
      />}
      <AvatarFallback className={senderType === "HR" ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"}>
        {senderType === "HR" ? <Headset className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>;
  };

  /** Render message text, attachment và card catalog theo contract backend. */
  const renderMessage = (message: SupportMessage) => {
    const isVisitor = message.senderType === "VISITOR";
    const attachment = message.messageType === "ATTACHMENT"
      ? parseMetadata<AttachmentMetadata | null>(message.metadata, null) : null;
    const courses = message.messageType === "COURSE_RESULTS"
      ? parseMetadata<{ courses?: PublicCourseCard[]; presentation?: string }>(message.metadata, {}).courses ?? [] : [];
    const coursePresentation = message.messageType === "COURSE_RESULTS"
      ? parseMetadata<{ presentation?: string }>(message.metadata, {}).presentation : undefined;
    const resources = message.messageType === "RESOURCE_CARD"
      ? parseMetadata<{ resources?: SupportResource[] }>(message.metadata, {}).resources ?? [] : [];
    if (message.senderType === "SYSTEM") {
      return <div key={String(message.id)} className="flex justify-center">
        <p className="max-w-[90%] rounded-full bg-muted px-3 py-1 text-center text-[11px] text-muted-foreground">{message.content}</p>
      </div>;
    }
    const visitorName = auth.user?.fullName?.trim();
    const senderName = isVisitor
      ? visitorName != null && visitorName.length > 0 ? visitorName : auth.user?.username ?? "Khách"
      : message.senderType === "HR" ? conversation?.assignedSupportName ?? "Tư vấn viên" : "Trợ lý AI";
    return <div key={String(message.id)} className={`flex items-start gap-2 ${isVisitor ? "flex-row-reverse" : ""}`}>
      {renderChatAvatar(message.senderType)}
      <div className={`min-w-0 max-w-[82%] space-y-2 ${isVisitor ? "ml-auto" : "mr-auto"}`}>
      <p className={`px-1 text-[10px] font-medium text-muted-foreground ${isVisitor ? "text-right" : "text-left"}`}>{senderName}</p>
      <div className={`whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${isVisitor ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
        {attachment ? (
          attachment.contentType.startsWith("image/")
            ? <a href={attachment.url} target="_blank" rel="noreferrer"><img src={attachment.url} alt={attachment.fileName} className="max-h-48 rounded-lg object-cover" /></a>
            : <a href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline"><FileText className="h-4 w-4" />{attachment.fileName}</a>
        ) : message.content}
      </div>
      {courses.map((course, index) => <Link key={course.id} to={`/courses/${course.id}`} className="block overflow-hidden rounded-xl border bg-card hover:border-primary hover:shadow-sm">
        {course.thumbnailUrl
          ? <img src={course.thumbnailUrl} alt={course.name} className="h-32 w-full object-cover" />
          : <div className="flex h-20 items-center justify-center bg-muted"><ExternalLink className="h-5 w-5 text-primary" /></div>}
        <div className="space-y-2 p-3">
          <span className="inline-flex rounded bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">{coursePresentation === "LEARNING_PATH" ? `BƯỚC ${String(index + 1)} · ${course.level ?? "KHÓA HỌC"}` : course.level ?? "KHÓA HỌC"}</span>
          <p className="line-clamp-2 text-sm font-bold">{course.name}</p>
          <p className="text-[11px] text-muted-foreground">{course.categoryName ?? course.teacherName ?? "Khóa học"}</p>
          <div className="flex items-center justify-between border-t pt-2 text-xs">
            <span>{course.averageRating != null ? `★ ${course.averageRating.toFixed(1)}` : "Chưa có đánh giá"}</span>
            {formatCoursePrice(course.currentPrice) && <strong className="text-primary">{formatCoursePrice(course.currentPrice)}</strong>}
          </div>
        </div>
      </Link>)}
      {resources.map((resource) => {
        const card = <>
        {resource.imageUrl
          ? <img src={resource.imageUrl} alt={resource.title} className="h-28 w-full object-cover" />
          : <div className="flex h-20 items-center justify-center bg-muted"><ExternalLink className="h-5 w-5 text-primary" /></div>}
        <div className="space-y-1.5 p-3">
          <span className="inline-flex rounded bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">{resource.type}</span>
          <p className="line-clamp-2 text-sm font-bold">{resource.title}</p>
          <p className="line-clamp-2 text-[11px] text-muted-foreground">{resource.subtitle ?? "Nhấn để xem chi tiết"}</p>
        </div>
        </>;
        const className = "block overflow-hidden rounded-xl border bg-card hover:border-primary hover:shadow-sm";
        return resource.href.startsWith("http")
          ? <a key={`${resource.type}-${resource.id}`} href={resource.href} target="_blank" rel="noreferrer" className={className}>{card}</a>
          : <Link key={`${resource.type}-${resource.id}`} to={resource.href} className={className}>{card}</Link>;
      })}
      </div>
    </div>;
  };

  const shownOptions = guidedMetadata ? guidedMetadata.options : options;
  const isQueued = conversation?.status === "QUEUED" || conversation?.status === "ASSIGNED";
  const estimatedWaitMinutes = conversation?.estimatedWaitMinutes ?? null;
  const waitedMinutes = conversation
    ? Math.max(0, (clockNow - Number(conversation.createdAtEpochMs)) / 60000)
    : 0;
  const isQueueOverloaded = isQueued && estimatedWaitMinutes != null && waitedMinutes > estimatedWaitMinutes;
  const autoCloseSeconds = conversation?.autoCloseAtEpochMs
    ? Math.max(0, Math.ceil((Number(conversation.autoCloseAtEpochMs) - clockNow) / 1000))
    : null;
  const formatCountdown = (seconds: number): string =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const hasDirectSupportOpen = ["QUEUED", "ASSIGNED", "ACTIVE", "WAITING_CONFIRMATION"]
    .includes(conversation?.status ?? "");

  return <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
    {isOpen && <Card className="relative mb-4 flex h-[min(700px,calc(100vh-6rem))] w-[420px] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden border p-0 shadow-2xl">
      <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2"><Bot className="h-5 w-5" /><div><p className="text-sm font-semibold">Tư vấn AILMS</p><p className="text-sm opacity-80">Đồng hành cùng bạn</p></div></div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" disabled={!visitorToken || loading} onClick={() => void openHistory()} className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" aria-label="Lịch sử trò chuyện"><History className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" disabled={!visitorToken || loading || hasDirectSupportOpen} onClick={() => { setNewConversationOpen(true); }} className="h-8 px-2 text-sm text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><RotateCcw className="mr-1  h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => { setIsOpen(false); }} className="h-8 w-8 text-primary-foreground" aria-label="Đóng tư vấn"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {historyOpen && <div className="absolute inset-x-0 bottom-0 top-57 z-30 overflow-y-auto bg-card p-3">
        <div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold">Lịch sử trò chuyện</p><Button variant="ghost" size="sm" onClick={() => { setHistoryOpen(false); }}>Đóng</Button></div>
        {history.length > 0 ? <div className="space-y-2">{history.map((item) => <Button key={item.id} variant="outline" className="h-auto w-full justify-between p-3 text-left" onClick={() => void openHistoricalConversation(item.id)}>
          <span><span className="block text-xs font-bold">Ticket #{item.id.slice(-8)}</span><span className="block text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleString("vi-VN")}</span></span><span className="text-[10px] text-muted-foreground">{item.status}</span>
        </Button>)}</div> : <p className="py-12 text-center text-xs text-muted-foreground">Chưa có lịch sử trò chuyện.</p>}
      </div>}

      <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="flex-1 space-y-3 overflow-y-auto p-3">
        {loading && messages.length === 0 && <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
        {messages.map(renderMessage)}
        {botTyping && <div className="flex items-start gap-2" role="status" aria-label="Trợ lý AI đang trả lời">
          {renderChatAvatar("BOT")}
          <div className="space-y-1">
            <p className="px-1 text-[10px] font-medium text-muted-foreground">Trợ lý AI đang trả lời</p>
            <div className="flex w-fit items-center gap-1 rounded-xl bg-muted px-3 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
            </div>
          </div>
        </div>}
        {supporterTyping && <div className="flex items-start gap-2" role="status" aria-label="Tư vấn viên đang nhập">
          {renderChatAvatar("HR")}
          <div className="space-y-1">
            <p className="px-1 text-[10px] font-medium text-muted-foreground">{conversation?.assignedSupportName ?? "Tư vấn viên"} đang nhập</p>
            <div className="flex w-fit items-center gap-1 rounded-xl bg-muted px-3 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
            </div>
          </div>
        </div>}

        {conversation?.status === "GUIDED" && shownOptions.length > 0 && <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-3">
          {shownOptions.map((option) => <Button key={option.id} variant="outline" className="h-auto whitespace-normal py-2 text-left text-xs" disabled={loading} onClick={() => void chooseOption(option)}>{option.label}</Button>)}
        </div>}

        {conversation?.status === "COLLECTING_CONTACT" && !conversation.hasContact && <div className="space-y-2 rounded-xl border bg-card p-3">
          <p className="text-sm font-bold">Kết nối tư vấn viên</p>
          <Input aria-invalid={Boolean(contactErrors.fullName)} placeholder="Họ tên *" value={contact.fullName} onChange={(event) => { setContact({ ...contact, fullName: event.target.value }); }} />
          {contactErrors.fullName && <p className="text-[11px] text-destructive">{contactErrors.fullName}</p>}
          <Input aria-invalid={Boolean(contactErrors.phone)} placeholder="Số điện thoại (không bắt buộc)" value={contact.phone} onChange={(event) => { setContact({ ...contact, phone: event.target.value }); }} />
          {contactErrors.phone && <p className="text-[11px] text-destructive">{contactErrors.phone}</p>}
          <Input aria-invalid={Boolean(contactErrors.email)} placeholder="Email *" value={contact.email} onChange={(event) => { setContact({ ...contact, email: event.target.value }); }} />
          {contactErrors.email && <p className="text-[11px] text-destructive">{contactErrors.email}</p>}
          <Textarea aria-invalid={Boolean(contactErrors.note)} placeholder="Nội dung cần hỗ trợ (không bắt buộc, tối đa 1000 ký tự)" value={contact.note} onChange={(event) => { setContact({ ...contact, note: event.target.value }); }} rows={3} />
          {contactErrors.note && <p className="text-[11px] text-destructive">{contactErrors.note}</p>}
          <Button className="w-full" disabled={loading} onClick={() => void sendContact()}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Gửi yêu cầu</Button>
        </div>}

        {conversation?.status === "WAITING_CONFIRMATION" && <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-sm font-bold">Tư vấn viên đề nghị kết thúc cuộc trò chuyện.</p>
          <p className="text-xs text-muted-foreground">Nếu bạn không phản hồi, hệ thống sẽ tự đóng {autoCloseSeconds != null ? `sau ${formatCountdown(autoCloseSeconds)}` : "sau thời gian quy định"}.</p>
          <div className="flex gap-2"><Button variant="outline" className="flex-1" disabled={loading} onClick={() => void keepConversationActive()}>Tiếp tục</Button><Button className="flex-1" disabled={loading} onClick={() => void confirmClose()}>Đồng ý đóng</Button></div>
        </div>}
        {isQueued && <div className={`space-y-3 rounded-xl border p-4 ${isQueueOverloaded ? "border-amber-500/40 bg-amber-500/10" : "border-primary/20 bg-primary/5"}`}>
          <div className="flex items-start gap-3">
            {isQueueOverloaded
              ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              : <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" />}
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-bold text-foreground">
                {isQueueOverloaded ? "Hệ thống đang có nhiều yêu cầu hỗ trợ" : "Đang chờ tư vấn viên tiếp nhận"}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {isQueueOverloaded
                  ? "Thời gian chờ đã lâu hơn dự kiến. Bạn vui lòng chờ thêm, tư vấn viên sẽ tiếp nhận sớm nhất có thể."
                  : "Yêu cầu của bạn đang ở hàng đợi chung và sẽ được một tư vấn viên tiếp nhận."}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" />Thời gian dự kiến</span>
            <strong className="text-foreground">{estimatedWaitMinutes != null ? `Khoảng ${String(estimatedWaitMinutes)} phút` : "Đang cập nhật"}</strong>
          </div>
          {conversation.queuePosition != null && <p className="text-center text-[11px] text-muted-foreground">Vị trí hiện tại trong hàng đợi: <strong className="text-foreground">{conversation.queuePosition}</strong></p>}
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground" role="status" aria-live="polite">
            <Loader2 className="h-3 w-3 animate-spin" /> Đang cập nhật trạng thái kết nối...
          </p>
          {!isQueueOverloaded && <div className="flex justify-center gap-1" aria-label="Đang chờ">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:180ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:360ms]" />
          </div>}
          <Button variant="outline" className="w-full" disabled={loading} onClick={() => { setCancelConversationOpen(true); }}>
            Hủy kết nối với tư vấn viên
          </Button>
        </div>}
        {["CLOSED", "CANCELLED", "EXPIRED"].includes(conversation?.status ?? "") && <Button variant="outline" className="w-full" onClick={() => { setNewConversationOpen(true); }}><RotateCcw className="mr-2 h-4 w-4" />Tạo cuộc trò chuyện mới</Button>}
        <div ref={messagesEndRef} />
      </div>

      {conversation?.status === "GUIDED" && guidedMetadata?.inputMode && <div className="border-t bg-card p-3">
        <div className="flex items-end gap-2">
          <Textarea value={chatText} maxLength={1000} rows={2} placeholder={guidedMetadata.inputMode === "BUDGET" ? "Ví dụ: 2.000.000 VNĐ..." : "Nhập khóa học hoặc kỹ năng muốn học..."} onChange={(event) => { setChatText(event.target.value); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendGuidedQuestion(); } }} />
          <Button size="icon" disabled={loading || chatText.trim().length < 2} onClick={() => void sendGuidedQuestion()} aria-label="Gửi nhu cầu"><Send className="h-4 w-4" /></Button>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">Thông tin được gửi về Backend để bổ sung context; AI chỉ dùng dữ liệu thật của hệ thống.</p>
      </div>}

      {conversation?.status === "ACTIVE" && <div className="border-t bg-card p-3">
        <div className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.docx,.xlsx,.txt" onChange={(event) => void uploadAttachment(event.target.files?.[0])} />
          <Button variant="outline" size="icon" disabled={loading} onClick={() => fileInputRef.current?.click()} aria-label="Đính kèm ảnh hoặc tài liệu"><Paperclip className="h-4 w-4" /></Button>
          <Textarea value={chatText} maxLength={2000} rows={2} placeholder="Nhắn tin với tư vấn viên..." onChange={(event) => { handleActiveChatChange(event.target.value); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendChat(); } }} />
          <Button size="icon" disabled={loading || !chatText.trim()} onClick={() => void sendChat()} aria-label="Gửi tin nhắn"><Send className="h-4 w-4" /></Button>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">Tối đa 2000 ký tự · File tối đa 10MB</p>
      </div>}
    </Card>}

    <div className="relative"><Button size="icon" onClick={() => { if (!isOpen) setUnreadCount(0); setIsOpen((value) => !value); }} title={isOpen ? "Đóng tư vấn" : "Mở tư vấn"} className="h-14 w-14 rounded-full shadow-xl">{isOpen ? <X className="h-6 w-6" /> : <Bot className="h-7 w-7" />}</Button>{!isOpen && unreadCount > 0 && <span className="pointer-events-none absolute -right-1 -top-1 min-w-5 rounded-full bg-destructive px-1.5 py-1 text-center text-[10px] font-extrabold leading-none text-destructive-foreground shadow-md">{unreadCount > 99 ? "99+" : `+${String(unreadCount)}`}</span>}</div>

    <ConfirmDialog open={newConversationOpen} onOpenChange={setNewConversationOpen} title="Tạo cuộc trò chuyện mới?" description="Cuộc trò chuyện đang mở sẽ được kết thúc và lịch sử vẫn được lưu lại." confirmText="Tạo mới" variant="warning" loading={loading} onConfirm={createNewConversation} />
    <ConfirmDialog open={cancelConversationOpen} onOpenChange={setCancelConversationOpen} title="Hủy kết nối với tư vấn viên?" description="Yêu cầu sẽ được rút khỏi hàng đợi. Bạn có thể tạo yêu cầu mới bất cứ lúc nào." confirmText="Hủy kết nối" variant="warning" loading={loading} onConfirm={cancelQueuedConversation} />
  </div>;
};
