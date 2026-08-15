export type MessageRole = "user" | "assistant" | "system";

export type MessageStatus = "sending" | "streaming" | "completed" | "error";

export type UserSystemRole = "ADMIN" | "HR" | "TA" | "TEACHER" | "STUDENT";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  status?: MessageStatus;
  feedback?: "THUMBS_UP" | "THUMBS_DOWN" | null;
  imageUrl?: string;
}

export interface AiChatRequestPayload {
  conversationId?: string;
  question: string;
  systemInstruction?: string;
  module?: string;
  route?: string;
}

export interface AiConversation {
  id: string;
  title: string;
  scope: "ADMIN_COPILOT" | "EMPLOYEE_COPILOT" | "STUDENT_ASSISTANT" | "COURSE_ASSISTANT";
  module: string;
  route?: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}
