import React, { useRef, useEffect } from "react";
import { MessageSquare, Sparkles, BookOpen, BarChart3, Lightbulb, FileText, Users, Building2, Calendar } from "lucide-react";
import type { ChatMessage, UserSystemRole } from "@/types/ai";
import { MessageBubble } from "./MessageBubble";

interface ChatMessagesProps {
  messages: ChatMessage[];
  userName?: string;
  userRole?: UserSystemRole;
  isStreaming?: boolean;
  onSelectPrompt?: (prompt: string) => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  userName,
  userRole,
  isStreaming,
  onSelectPrompt,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);

  // Track scroll position to determine if user scrolled up
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
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

  // Gợi ý câu hỏi thông minh theo vai trò
  const getPromptSuggestions = () => {
    if (userRole === "STUDENT") {
      return [
        { icon: BookOpen, text: "Khóa học này gồm những bài học nào?", prompt: "Khóa học này gồm những chương và bài học nào?" },
        { icon: BarChart3, text: "Tiến độ học tập của tôi", prompt: "Cho tôi xem tiến độ học tập và điểm số của tôi trong các khóa học." },
        { icon: Lightbulb, text: "Gợi ý bài học tiếp theo", prompt: "Gợi ý cho tôi bài học tiếp theo cần hoàn thành hoặc nội dung cần ôn tập." },
        { icon: FileText, text: "Tóm tắt bài học & tài liệu", prompt: "Bài học này tóm tắt những nội dung chính gì và có tài liệu đính kèm nào không?" },
      ];
    }
    if (userRole === "TEACHER" || userRole === "TA") {
      return [
        { icon: Users, text: "Tiến độ học viên", prompt: "Thống kê danh sách học viên và tiến độ học tập trong khóa học." },
        { icon: BookOpen, text: "Khung chương trình khóa học", prompt: "Chi tiết các chương và bài học trong khóa học đang phụ trách." },
        { icon: BarChart3, text: "Phân tích điểm số & rủi ro", prompt: "Phân tích số học viên có nguy cơ chậm tiến độ (dưới 50%)." },
      ];
    }
    return [
      { icon: Building2, text: "Tổng quan hệ thống", prompt: "Thống kê tổng quan số lượng nhân sự, học viên và hợp đồng." },
      { icon: Users, text: "Tìm kiếm nhân viên", prompt: "Tìm kiếm danh sách nhân viên đang hoạt động trong hệ thống." },
      { icon: Calendar, text: "Hợp đồng sắp hết hạn", prompt: "Liệt kê các hợp đồng lao động sẽ hết hạn trong 30 ngày tới." },
      { icon: BarChart3, text: "Xu hướng chấm công", prompt: "Phân tích xu hướng chấm công và số phút đi muộn trong 30 ngày qua." },
    ];
  };

  const suggestions = getPromptSuggestions();

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm bg-gradient-to-b from-background to-muted/20"
    >
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center p-2 space-y-4 text-muted-foreground">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
            <MessageSquare className="h-7 w-7 animate-bounce" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Xin chào {userName}!
            </p>
            <p className="text-[11px] text-muted-foreground max-w-[260px] mx-auto">
              {userRole === "STUDENT"
                ? "Tôi có thể giúp bạn tra cứu nội dung bài học, kiểm tra tiến độ hoặc gợi ý lộ trình học tiếp theo."
                : "Tôi có thể hỗ trợ bạn tra cứu dữ liệu, khung chương trình đào tạo và phân tích chỉ số hệ thống."}
            </p>
          </div>

          {/* Role-based Suggestion Chips */}
          <div className="w-full space-y-1.5 pt-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left pl-1">
              Gợi ý câu hỏi nhanh:
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {suggestions.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectPrompt?.(item.prompt)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card hover:bg-primary/10 border border-border/50 hover:border-primary/30 text-left transition-all text-xs font-medium text-foreground hover:text-primary cursor-pointer group shadow-2xs"
                  >
                    <div className="h-6 w-6 rounded-lg bg-muted group-hover:bg-primary/20 flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                      <IconComponent className="h-3.5 w-3.5" />
                    </div>
                    <span className="truncate">{item.text}</span>
                  </button>
                );
              })}
            </div>
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
