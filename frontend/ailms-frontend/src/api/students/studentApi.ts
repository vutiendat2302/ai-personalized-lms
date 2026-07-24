import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface CreateStudentProfileRequest {
  userId?: string | number;
  educationLevel?: string;
  description?: string;
  goal?: string;
  schoolName?: string;
}

export type GuardianRelationship = "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";

export interface CreateGuardianRequest {
  studentUserId?: string | number;
  fullName?: string;
  relationship?: GuardianRelationship;
  phone?: string;
  email?: string;
  address?: string;
}

export type StudyGoalTypeEnum =
  | "DAILY_STREAK"
  | "WEEKLY_STUDY_DAYS"
  | "COURSE_COMPLETION"
  | "LESSON_COMPLETION"
  | "STUDY_HOURS";

export interface CreateStudyGoalRequest {
  userId?: string | number;
  studyGoalTypeEnum: StudyGoalTypeEnum;
  targetValue: number;
  courseId?: string | number | null;
}

export interface AssignInterestsRequest {
  interestIds: (string | number)[];
}

export const studentApi = {
  // Get Student Profile By ID
  getProfileById: (id: string | number) =>
    httpClient.get<ApiResponse<any>>(`/v1/student-profiles/${id}`),

  // Create Student Profile
  createProfile: (payload: CreateStudentProfileRequest) =>
    httpClient.post<ApiResponse<any>>("/v1/student-profiles", payload),

  // Create Guardian Profile (Optional for under 18)
  createGuardian: (payload: CreateGuardianRequest) =>
    httpClient.post<ApiResponse<any>>("/v1/guardians", payload),

  // Create Study Goal
  createStudyGoal: (payload: CreateStudyGoalRequest) =>
    httpClient.post<ApiResponse<any>>("/v1/study-goals", payload),

  // Assign Student Interests
  assignInterests: (payload: AssignInterestsRequest) =>
    httpClient.post<ApiResponse<any>>("/v1/students/interests", payload),

  // Set Has Goal / Complete Onboarding
  updateHasGoal: (id: string | number, hasGoal: boolean = true) =>
    httpClient.patch<ApiResponse<any>>(`/v1/student-profiles/${id}/has-goal`, { hasGoal }),
};
