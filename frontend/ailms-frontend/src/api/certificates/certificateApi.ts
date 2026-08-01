import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface CertificateVerification {
  certificateCode: string;
  studentName?: string;
  courseName?: string;
  status: "ISSUED" | "REVOKED";
  issuedAt?: string;
  revokedAt?: string;
  revokedReason?: string;
  isValid: boolean;
}

export const certificateApi = {
  verify: async (code: string) => {
    const response = await httpClient.get<ApiResponse<CertificateVerification>>(
      `/v1/certificates/verify/${encodeURIComponent(code.trim())}`,
    );
    return response.data.data;
  },
};
