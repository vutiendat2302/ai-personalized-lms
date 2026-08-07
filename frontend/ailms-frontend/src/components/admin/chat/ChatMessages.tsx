import React, { useRef, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import type { ChatMessage, UserSystemRole } from "@/types/ai";
import { MessageBubble } from "./MessageBubble";

interface ChatMessagesProps {
  messages: ChatMessage[];
  userName?: string;
  userRole?: UserSystemRole;
  isStreaming?: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  userName,
  userRole,
  isStreaming,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);

  // Track scroll position to determine if user scrolled up
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // Consider near bottom if within 120px of bottom
    isNearBottomRef.current = scrollHeight - (scrollTop + clientHeight) < 120;
  };

  useEffect(() => {
    if (containerRef.current && isNearBottomRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: isStreaming ? "auto" : "smooth",
      });
    }
  }, [messages, isStreaming]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm bg-gradient-to-b from-background to-muted/20"
    >
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3 text-muted-foreground">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
            <MessageSquare className="h-8 w-8 animate-bounce" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">
              Xin chào {userName}!
            </p>
            <p className="text-xs text-muted-foreground max-w-[240px] mt-1">
              Bạn có thắc mắc gì về quy định, dữ liệu hay thao tác trong hệ thống AILMS không?
            </p>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          userName={userName}
          userRole={userRole}
        />
      ))}
    </div>
  );
};
