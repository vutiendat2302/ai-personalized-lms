export type MessageRole = "user" | "assistant" | "system";

export type MessageStatus = "sending" | "streaming" | "completed" | "error";

export type UserSystemRole = "ADMIN" | "HR" | "TA" | "TEACHER" | "STUDENT";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  status?: MessageStatus;
}

export interface AiChatRequestPayload {
  conversationId?: string;
  question: string;
  systemInstruction?: string;
}
