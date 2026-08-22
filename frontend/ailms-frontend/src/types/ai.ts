export type MessageRole = "user" | "assistant" | "system";

export type MessageStatus = "sending" | "streaming" | "completed" | "error";

export type UserSystemRole = "ADMIN" | "HR" | "TA" | "TEACHER" | "STUDENT";

export interface ChatSource {
  sourceId: string;
  title?: string;
  sourceType?: string;
  chunkId: string;
  score?: number;
  courseId?: string;
  classId?: string;
  lessonId?: string;
  sectionId?: string;
  pageNumber?: number;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  status?: MessageStatus;
  feedback?: "THUMBS_UP" | "THUMBS_DOWN" | null;
  imageUrl?: string;
  fileName?: string;
  fileType?: string;
  sources?: ChatSource[];
  route?: string;
}

export interface AiChatRequestPayload {
  conversationId?: string;
  question: string;
  systemInstruction?: string;
  module?: string;
  route?: string;
  retrievalMode?: "AUTO" | "ALWAYS" | "NEVER";
  courseId?: string;
  lessonId?: string;
  retrievalScope?: "LESSON_ONLY" | "CLASS_MATERIALS" | "COURSE_MATERIALS" | "GENERAL";
}

export interface AiConversation {
  id: string;
  title: string;
  scope: "ADMIN_COPILOT" | "EMPLOYEE_COPILOT" | "STUDENT_ASSISTANT" | "COURSE_ASSISTANT";
  module: string;
  route?: string;
  courseId?: string;
  classId?: string;
  lessonId?: string;
  retrievalScope?: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}
