# 📮 AILMS Postman API Testing & Verification Suite

Thư mục này chứa toàn bộ tài liệu hướng dẫn kiểm thử thủ công (**Manual API Testing**) và các tệp Export Collection/Environment mẫu cho các phân hệ nghiệp vụ chính của **AI Personalized LMS**.

---

## 📁 Danh mục Tài liệu Kiểm thử

| STT | Tài liệu kiểm thử | Phân hệ nghiệp vụ / Tính năng | Định dạng phản hồi |
| :---: | :--- | :--- | :--- |
| **1** | [ai-admin-hr-query-testing.md](ai-admin-hr-query-testing.md) | **AI System Query & Function Calling** (Admin / HR hỏi đáp dữ liệu nhân sự, hợp đồng, học viên) | Server-Sent Events (SSE) / JSON |
| **2** | [ai-assessment-generation-testing.md](ai-assessment-generation-testing.md) | **AI Assessment Authoring** (Sinh câu hỏi trắc nghiệm, bài tập tự luận và Rubric chấm điểm tự động) | JSON Structured Output |
| **3** | [public-support-chat-testing.md](public-support-chat-testing.md) | **Public Support Chatbot** (Trợ lý tư vấn khách truy cập, Quick replies, Queue hàng đợi hỗ trợ) | JSON / Stream |
| **4** | [public-landing-api-testing.md](public-landing-api-testing.md) | **Public Landing & Catalog APIs** (Danh mục khóa học nổi bật, giảng viên tiêu biểu, bộ lọc tìm kiếm) | JSON REST API |
| **5** | [paypal-checkout-manual-testing.md](paypal-checkout-manual-testing.md) | **PayPal Sandbox Checkout & Idempotency** (Tạo đơn hàng, Capture giao dịch, Kích hoạt gói học, Xuất hóa đơn PDF) | JSON REST API |

---

## 📦 Tệp Postman Collection & Environment mẫu

---

## 🚀 Hướng dẫn Sử dụng

### 1. Kiểm thử theo Checklist Markdown
Mỗi tệp `.md` cung cấp đầy đủ:
- Endpoint URL, HTTP Method, Headers.
- Mẫu Header xác thực (`Authorization: Bearer <JWT>`).
- Body JSON mẫu cho từng kịch bản thành công và ngoại lệ.
- Cấu trúc Response kỳ vọng và mã lỗi HTTP status tương ứng.
