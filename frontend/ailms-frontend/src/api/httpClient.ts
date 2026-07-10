// api/httpClient.ts
import axios from "axios";
import type { JwtAuthenticationResponse } from "@/types/jwtAuthentication";
import type { ApiResponse, ErrorResponse } from "@/types/base";

/* ============================================================
 * ACCESS TOKEN
 * ============================================================
 * Access Token chỉ được lưu trong bộ nhớ (memory), không lưu
 * vào localStorage/sessionStorage nhằm giảm nguy cơ bị đánh cắp
 * thông qua XSS.
 * Sau khi người dùng reload trang, Access Token sẽ mất.
 * Khi đó frontend sẽ gọi /auth/refresh để lấy Access Token mới
 * bằng Refresh Token được lưu trong HttpOnly Cookie.
 * ============================================================ */

let accessToken: string | null = null;

/* Lưu Access Token mới */
export const setAccessToken = (token: string | null) => (accessToken = token);

/* Lấy Access Token hiện tại */
export const getAccessToken = () => accessToken;

/* Xóa Access Token */
export const clearAuth = () => {
  accessToken = null;
};


/* ============================================================
 * AXIOS INSTANCE
 * ============================================================
 * Tạo một Axios Instance dùng chung cho toàn bộ project.
 * baseURL:
 *  - URL gốc của Backend.
 * withCredentials:
 *  - Cho phép Browser tự động gửi HttpOnly Cookie.
 *  - Đây là điều kiện bắt buộc để Refresh Token hoạt động.
 * ============================================================ */
const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BE_URL,

  // Gửi kèm Cookie trong mọi request
  withCredentials: true,
});

/* ============================================================
 * REQUEST INTERCEPTOR
 * ============================================================
 * Chạy trước khi Request được gửi tới Server.
 * Nếu đang có Access Token thì tự động thêm Authorization Header.
 * Authorization: Bearer xxx ở từng API.
 * ============================================================ */
httpClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/* ============================================================
 * REFRESH TOKEN STATE
 * ============================================================
 * isRefreshing
 * --------------
 * Đánh dấu xem Frontend có đang Refresh Token hay không.
 * queue
 * --------------
 * Danh sách các Request đang chờ Refresh Token hoàn tất.
 * Mục đích:
 * Nếu cùng lúc có 20 request bị 401,
 * Frontend chỉ Refresh đúng 1 lần.
 * 19 request còn lại sẽ đứng đợi trong queue.
 * ============================================================ */
let isRefreshing = false;
let queue: ((token: string) => void)[] = [];

/* ============================================================
 * RESPONSE INTERCEPTOR
 * ============================================================
 * Chạy sau khi Server trả Response.
 * Nếu thành công:
 *      return response
 * Nếu Access Token hết hạn:
 *      Tự Refresh Token
 * Sau khi Refresh thành công:
 *      Gửi lại Request cũ.
 * ============================================================ */
httpClient.interceptors.response.use(
  (res) => res, // Response thành công
  async (error) => { // Response lỗi
    // Request ban đầu
    const originalReq = error.config;
    // Response lỗi của Backend
    const errData: ErrorResponse | undefined = error.response?.data;

    /* ========================================================
     * Không Refresh đối với:
     *  - /auth/login
     *  - /auth/refresh
     * ======================================================== */
    const isAuthEndpoint = originalReq?.url?.includes("/auth/login") || originalReq?.url?.includes("/auth/refresh");

    /* ========================================================
     * Điều kiện cần Refresh Token 401 Access Token hết hạn.
     * !_retry
     *      Chưa từng thử Refresh.
     * !isAuthEndpoint
     *      Không phải Login hoặc Refresh.
     * ======================================================== */
    if (error.response?.status === 401 && !originalReq._retry && !isAuthEndpoint) {
      originalReq._retry = true;

      /* =====================================================
       * Nếu đang có Request khác Refresh Token
       * Không gọi Refresh thêm.
       * Chỉ đưa Request hiện tại vào Queue.
       * ===================================================== */
      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((newToken: string) => {
            originalReq.headers.Authorization = `Bearer ${newToken}`;
            resolve(httpClient(originalReq));
          });
        });
      }

      /* =====================================================
       * Request đầu tiên thực hiện Refresh Token
       * ===================================================== */
      isRefreshing = true;
      try {
        /* ===================================================
         * Gọi API Refresh Token
         * Refresh Token được Browser tự gửi thông qua Cookie.
         * =================================================== */
        const { data } = await axios.post<ApiResponse<JwtAuthenticationResponse>>(
          `${import.meta.env.VITE_BE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Access Token mới
        const newToken = data.data.accessToken;

        // Lưu Access Token mới
        setAccessToken(newToken);

        /* ===================================================
         * Đánh thức toàn bộ Request đang chờ.
         * =================================================== */
        queue.forEach((cb) => cb(newToken));
        queue = [];

         // Gắn Access Token mới vào Request hiện tại
        originalReq.headers.Authorization = `Bearer ${newToken}`;

        // Gửi lại Request
        return httpClient(originalReq);
      } catch {
        /* ===================================================
         * Refresh Token không hợp lệ hoặc đã hết hạn.
         * Xóa Access Token và chuyển người dùng về Login.
         * =================================================== */
        setAccessToken(null);
        queue = [];
        window.location.href = "/login";
        return Promise.reject(errData);
      } finally {
        isRefreshing = false;
      }
    }

    /* ========================================================
     * Các lỗi khác
     * Trả ErrorResponse của Backend.
     * Nếu Backend không trả dữ liệu,
     * sinh một ErrorResponse mặc định.
     * ======================================================== */
    return Promise.reject(errData ?? { message: "Đã có lỗi xảy ra", status: 500 } as ErrorResponse);
  }
);

export default httpClient;