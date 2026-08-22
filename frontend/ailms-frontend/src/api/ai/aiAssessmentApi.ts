import { httpClient } from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface AiAssessmentMaterial {
  id: string;
  classId: string;
  courseId: string;
  title: string;
  fileName?: string;
  fileType?: string;
  ragStatus: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  canUseForAi: boolean;
}

export interface AiDraftQuestion {
  content: string;
  questionType: string;
  points: number;
  explanation?: string;
  sourceIds?: string[];
  options: { content: string; isCorrect: boolean }[];
}

export interface AiAssessmentDraft {
  draftId: string;
  lessonId: string;
  expiresAt: string;
  quiz?: { title: string; questions: AiDraftQuestion[] };
  assignment?: { title: string; instructions: string };
  sources?: { sourceId: string; sourceType: string; title: string; fileName?: string }[];
}

export interface AppliedAssessment {
  quiz?: { id: string; title: string };
  assignment?: { id: string; title: string };
}

/** API Frontend duy nhất cho luồng AI assessment qua Backend gateway. */
export const aiAssessmentApi = {
  /** Lấy tài liệu lớp đã ingest để giáo viên chọn làm nguồn RAG. */
  getMaterials: async (lessonId: string, classId: string): Promise<AiAssessmentMaterial[]> => {
    const response = await httpClient.get<ApiResponse<AiAssessmentMaterial[]>>(
      `/v1/authoring/lessons/${encodeURIComponent(lessonId)}/ai-assessment-materials`,
      { params: { classId } },
    );
    return response.data.data;
  },

  /** Sinh draft từ lesson, source RAG và file upload tạm thời. */
  generateDraft: async (lessonId: string, formData: FormData): Promise<AiAssessmentDraft> => {
    const response = await httpClient.post<ApiResponse<AiAssessmentDraft>>(
      `/v1/authoring/lessons/${encodeURIComponent(lessonId)}/ai-assessment-drafts`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data.data;
  },

  /** Apply một lần draft đã review vào Course Builder. */
  applyDraft: async (
    draftId: string,
    payload: {
      applyQuiz: boolean;
      applyAssignment: boolean;
      quiz?: { title: string; questions: AiDraftQuestion[] };
    },
  ): Promise<AppliedAssessment> => {
    const response = await httpClient.post<ApiResponse<AppliedAssessment>>(
      `/v1/authoring/ai-assessment-drafts/${encodeURIComponent(draftId)}/apply`,
      payload,
    );
    return response.data.data;
  },

  /** Phát hành bản sao Quiz nguồn vào một lớp cụ thể. */
  publishQuiz: async (
    classId: string,
    quizId: string,
    payload: {
      title?: string;
      availableFrom?: string;
      dueAt?: string;
      maxAttempts?: number;
      showResultAfterSubmit?: boolean;
    },
  ): Promise<void> => {
    await httpClient.post(
      `/v1/teacher/classes/${encodeURIComponent(classId)}/quizzes/${encodeURIComponent(quizId)}/publish`,
      payload,
    );
  },
};
