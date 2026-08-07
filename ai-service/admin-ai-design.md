# 15. AI cho trang Quản trị (Admin/Management)
 
> Dựa trên sidebar Admin hiện có (Hệ thống & Phân quyền / Nhân sự & Vận hành / Đào tạo & Kinh doanh / Bán hàng / Báo cáo).
> Dùng chung hạ tầng đã thiết kế ở tài liệu AI Service (Gemini, RAG, Qdrant, `ai-service` trong monorepo).
> Nguyên tắc xuyên suốt: **AI chỉ hỗ trợ ra quyết định, không tự động thực thi hành động ghi/xóa dữ liệu nhạy cảm** — mọi thao tác thay đổi trạng thái vẫn do Admin bấm xác nhận.
 
---
 
## 15.1 Kiến trúc: 2 tầng AI trong trang quản trị
 
```
┌─────────────────────────────────────────────────────────────┐
│  TẦNG 1 — Admin AI Copilot (global, 1 widget chat nổi)         │
│  Xuất hiện trên MỌI trang /admin/**                            │
│  Trả lời câu hỏi chính sách, hướng dẫn thao tác, tra cứu nhanh │
│  → RAG trên policy_document + AGENTS.md-style docs nội bộ      │
├─────────────────────────────────────────────────────────────┤
│  TẦNG 2 — AI Action cục bộ (theo từng trang)                    │
│  Nút/insight AI gắn trực tiếp vào UI của từng module            │
│  → generate/summarize/detect theo context trang đang mở        │
└─────────────────────────────────────────────────────────────┘
```
 
Cả 2 tầng đều đi qua `backend/ailms` → `ai-service`, không có endpoint AI nào lộ thẳng ra FE (giữ nguyên nguyên tắc đã chốt).
 
---
 
## 15.2 Tầng 1 — Admin AI Copilot (ưu tiên xây trước)
 
### Vì sao làm trước
- Tận dụng ngay bảng `policy_document` (mục 12) đã có sẵn field `content` dạng markdown — chỉ cần ingest là có RAG chạy được, không cần chờ các module khác.
- Giá trị cao ngay lập tức: Admin/HR mới vào nghề hỏi "quy định chấm công trễ giờ là gì?" thay vì phải lục tài liệu.
### Cách hoạt động
```
Bước 1  Khi policy_document.status chuyển PUBLISHED (hoặc content được sửa)
        → Backend gọi POST /rag/ingest, sourceType = "text", content = policy.content
 
Bước 2  Admin bấm icon chat góc dưới phải (bất kỳ trang /admin/** nào),
        hỏi: "Nhân viên đi trễ quá 1 tiếng thì tính công thế nào?"
 
Bước 3  Backend forward → AI Service:
          - Embed câu hỏi
          - Retrieve top-k trong Qdrant, filter theo courseId=null/policyScope
            (dùng chung collection nhưng payload sourceType=policy để tách khỏi RAG khóa học)
          - Augment prompt + gọi Gemini streaming
        → SSE trả lời kèm trích dẫn: "Theo ATTENDANCE_POLICY (bản v3)..."
 
Bước 4  Nếu câu hỏi liên quan thao tác UI (không có trong policy_document),
        fallback trả lời chung dựa trên context trang hiện tại (route + role) mà FE gửi kèm
```
 
### Payload bổ sung cho collection Qdrant (tách khỏi RAG khóa học)
```json
{
  "sourceType": "policy",
  "policyCode": "ATTENDANCE_POLICY",
  "version": 3,
  "chunkText": "..."
}
```
Retrieval cho Copilot filter `sourceType = policy`; retrieval cho AI Assistant học viên filter `sourceType = lesson`. Dùng chung 1 Qdrant instance, khác collection hoặc khác payload filter — đề xuất **khác payload filter trong cùng 1 collection** để đơn giản hóa vận hành (đỡ quản lý nhiều collection).
 
### Phân quyền nội dung trả lời
- Copilot phải biết **role của Admin đang hỏi** (Admin/HR/Manager...) để không trả lời vượt quyền — VD nhân viên thường hỏi Copilot không được thấy chi tiết `SALARY_POLICY` mức lương cụ thể của người khác.
- Cách làm đơn giản nhất ở Phase đầu: filter thêm theo `policyCode` mà role đó được phép đọc (map cứng trong Backend trước khi forward, không để AI Service tự quyết định phân quyền).
---
 
## 15.3 Tầng 2 — AI Action theo từng nhóm menu
 
### A. HỆ THỐNG & PHÂN QUYỀN
 
| Trang | AI action | Cơ chế |
|---|---|---|
| Nhật ký hoạt động | Nút "Tóm tắt hoạt động hôm nay" → 1 đoạn văn tự nhiên thay vì đọc bảng log thô | `generate`, input = aggregate query kết quả (không phải raw log), Gemini viết tóm tắt |
| Quản lý vai trò/quyền hạn | Gợi ý phân quyền khi tạo Role mới: nhập mô tả "Role cho nhân viên kế toán" → AI gợi ý danh sách permission phù hợp dựa trên permission của các role tương tự đã có | `generate` + structured output (list permission id), Admin vẫn tick chọn tay trước khi lưu |
| Quản lý File | Semantic search file theo nội dung (không chỉ theo tên file) | Tận dụng RAG ingestion đã ingest ảnh/PDF — search bar gọi `/rag/search` (retrieval-only, không cần Gemini generate) |
 
### B. NHÂN SỰ & VẬN HÀNH
 
| Trang | AI action | Cơ chế |
|---|---|---|
| Quản lý hợp đồng | Trích xuất nhanh điều khoản chính từ file hợp đồng scan/PDF vừa upload (loại hợp đồng, thời hạn, lương cơ bản) → điền sẵn gợi ý vào form, HR review lại trước khi lưu | Dùng `pdf_extractor`/`image_extractor` đã thiết kế, KHÔNG lưu thẳng vào DB — chỉ prefill form |
| Quản lý nhân viên | Hỗ trợ soạn nội dung mô tả công việc/thông báo tuyển dụng | `generate/course-info`-style, đổi tên thành `generate/text` dùng chung |
| Điểm danh | Cảnh báo pattern bất thường: "Nhân viên X đi trễ 4/5 ngày tuần này" | Không cần AI generate — đây là rule-based alert (threshold), AI chỉ cần khi muốn **diễn giải bằng ngôn ngữ tự nhiên** cho báo cáo tổng hợp cuối tháng |
| Quản lý bảng lương | Giải thích bảng lương bằng ngôn ngữ tự nhiên khi nhân viên thắc mắc ("vì sao lương tháng này thấp hơn tháng trước?") | Backend tính số liệu chính xác trước (KHÔNG để AI tự tính lương), chỉ đưa số liệu đã tính cho Gemini **diễn giải thành câu chữ dễ hiểu** |
| Hàng đợi yêu cầu xử lý (Approval Center) | Tóm tắt nhanh nội dung request dài (VD đơn xin nghỉ có lý do dài) thành 1 dòng trong danh sách chờ duyệt, giúp người duyệt lướt nhanh | `generate`, input = nội dung request, output = 1 câu tóm tắt |
| Phân công giảng viên | AI-augment cho `TeacherMatchingService` đã có: khi matching rule-based ra nhiều ứng viên ngang điểm, AI đọc thêm ghi chú/đánh giá trước đây của giáo viên để gợi ý xếp hạng ưu tiên | Không thay thế matching logic hiện có — chỉ là tie-breaker phụ trợ, luôn optional |
 
⚠️ **Lưu ý quan trọng cho nhóm này:** dữ liệu lương, hợp đồng, đánh giá nhân viên là dữ liệu nhạy cảm nhất trong hệ thống — áp dụng chặt nguyên tắc mục 11 của thiết kế AI Service ("không đưa dữ liệu cá nhân vào prompt trừ khi thật cần"), và **không ingest các dữ liệu này vào RAG chung** — nếu cần AI đọc hợp đồng, xử lý theo kiểu one-shot (gửi thẳng nội dung vào prompt, không lưu vector, không cache).
 
### C. ĐÀO TẠO & KINH DOANH
 
| Trang | AI action | Cơ chế |
|---|---|---|
| Quản lý khóa học | Đã thiết kế chi tiết ở tài liệu Course Authoring: generate-quiz, generate-rubric, generate-course-info | (không lặp lại ở đây) |
| Kiểm duyệt đánh giá (Review Moderation) | Tự động pre-screen review mới: phát hiện spam/toxic/nghi ngờ trước khi vào hàng chờ duyệt thủ công (đã có bước "Auto-check từ khóa nhạy cảm/spam" ở mục 7.6 — nâng cấp bằng Gemini để bắt được các case tinh vi hơn rule từ khóa cứng) | `generate` structured output: `{isSuspicious: bool, reason: string}`, nếu `isSuspicious=true` → giữ `PENDING` cho người duyệt, không tự động reject |
| Thời khóa biểu online | Phát hiện xung đột lịch khi tạo `class_schedule` mới (giáo viên đã có lớp khác trùng giờ) | Đây là rule-based query (đã có ở mục 9.2), không cần AI — chỉ cần AI khi muốn **gợi ý khung giờ thay thế tốt nhất** dựa trên `teacher_availability` còn trống |
| Quản lý Quiz / Assignment | Đã gộp vào Course Authoring (`generate-quiz`, `generate-rubric`) | (không lặp lại) |
 
### D. QUẢN LÝ BÁN HÀNG
 
| Trang | AI action | Cơ chế |
|---|---|---|
| Sales Dashboard | Insight tự nhiên: "Doanh thu tuần này tăng 12% so với tuần trước, chủ yếu nhờ gói ONE_ON_ONE của category X" | Backend tính số liệu chính xác (aggregate query) → Gemini chỉ **diễn giải thành câu**, không tự tính toán số liệu |
| Đơn hàng / Thanh toán | Phát hiện giao dịch bất thường nhẹ (VD 1 user tạo nhiều order PENDING liên tục rồi hủy — có thể đang test coupon lỗi) | Rule-based là chính; AI chỉ hỗ trợ khi cần tổng hợp báo cáo bất thường thành ngôn ngữ tự nhiên cuối kỳ |
| Coupon | Gợi ý coupon mới dựa trên hiệu quả các coupon cũ (loại nào tăng conversion tốt nhất) | `generate`, input = số liệu hiệu quả coupon cũ đã tổng hợp sẵn ở Backend |
| Giỏ hàng đang treo | Gợi ý nội dung email nhắc nhở được cá nhân hóa theo sản phẩm trong giỏ | `generate/text`, input = tên khóa học/gói trong giỏ, output = draft email — Admin review trước khi gửi hàng loạt |
 
### E. BÁO CÁO & GIÁM SÁT
 
| Trang | AI action | Cơ chế |
|---|---|---|
| Thống kê & Analytics | "AI Insight" — tự động sinh 3-5 nhận xét đáng chú ý nhất từ dashboard hiện tại thay vì Admin tự đọc hết biểu đồ | Backend tính toán số liệu (giữ nguyên các aggregate query đã thiết kế ở mục 11) → gửi số liệu đã tính cho Gemini, yêu cầu chọn ra điểm đáng chú ý nhất và diễn giải — **AI không được tự bịa số liệu, chỉ diễn giải số liệu đã tính sẵn** |
 
---
 
## 15.4 Nguyên tắc thiết kế xuyên suốt cho AI trong trang Admin
 
1. **AI không bao giờ tự tính toán số liệu nghiệp vụ** (lương, doanh thu, điểm) — Backend luôn tính bằng logic nghiệp vụ chính xác trước, AI chỉ **diễn giải** kết quả đã có sẵn thành ngôn ngữ tự nhiên. Đây là khác biệt quan trọng so với AI trong Course Authoring (nơi AI được phép *sinh* nội dung mới như câu hỏi quiz).
2. **Dữ liệu nhạy cảm (lương, hợp đồng, đánh giá cá nhân) không ingest vào RAG dùng chung** — chỉ xử lý one-shot, không cache, không lưu vector.
3. **Copilot phải tôn trọng phân quyền role** — không trả lời thông tin vượt quyền của người hỏi, filter theo `policyCode`/scope trước khi retrieve.
4. **Mọi gợi ý AI đều ở dạng "prefill" hoặc "draft"** — không có action nào của AI tự động ghi/xóa/duyệt dữ liệu; con người luôn là người bấm nút cuối cùng.
5. **Tái sử dụng tối đa hạ tầng đã có** — không tạo thêm endpoint AI Service mới cho mỗi module; gộp vào các nhóm chung: `generate/text` (diễn giải/soạn thảo chung), `generate/structured` (output có schema như gợi ý permission), `/chat/stream` (Copilot), `/rag/ingest` + `/rag/search` (policy + file semantic search).
---
 
## 15.5 Roadmap tích hợp AI cho trang Admin (bổ sung sau roadmap AI Service gốc)
 
```
Phase A  Admin AI Copilot cơ bản
         → ingest policy_document vào RAG, chat widget global, chưa phân quyền theo role
 
Phase B  Copilot: thêm phân quyền theo role/policyCode
 
Phase C  AI Insight cho Sales Dashboard + Analytics
         → giá trị cao, dữ liệu không nhạy cảm cá nhân, rủi ro thấp
 
Phase D  Review Moderation pre-screen (Gemini nâng cấp rule từ khóa cứng)
 
Phase E  Approval Center — tóm tắt request dài
         → giá trị vận hành cao, độ rủi ro thấp (chỉ tóm tắt, không quyết định)
 
Phase F  Hợp đồng — trích xuất điều khoản từ file upload (prefill form)
         → cẩn trọng vì dữ liệu nhạy cảm, làm sau khi các phase trên ổn định
 
Phase G  Gợi ý phân quyền Role/Permission
         → rủi ro cao nhất nếu sai (ảnh hưởng bảo mật hệ thống), làm sau cùng,
           cần review kỹ trước khi bật cho Admin thật dùng
```
 
---
 
## 15.6 Giữ lịch sử hội thoại (Multi-turn Context) cho Copilot
 
### Vì sao cần
Không giữ lịch sử → mỗi câu hỏi bị coi độc lập, Admin hỏi tiếp "còn với nhân viên thử việc thì sao?" AI sẽ không hiểu "thì sao" đang nối tiếp câu hỏi chấm công trước đó. Multi-turn là bắt buộc để Copilot dùng được thật sự, không chỉ demo.
 
### 15.6.1 Lưu session ở đâu
 
| Lựa chọn | Đánh giá |
|---|---|
| **Redis, key theo `sessionId`** (đề xuất) | Đã có Redis sẵn trong `ai-service` (dùng cho cache dedup) — tận dụng luôn, TTL tự hết hạn, không cần thêm hạ tầng |
| Lưu MySQL (bảng `ai_chat_session`) | Bền hơn (không mất khi Redis restart), nhưng cần thêm bảng + không cần thiết ở mức "chat hỗ trợ thao tác", không phải dữ liệu nghiệp vụ phải giữ vĩnh viễn |
 
**Chọn Redis**, cấu trúc:
```
Key:   chat_session:{sessionId}
Value: [
  { role: "user", content: "quy định chấm công trễ giờ là gì?" },
  { role: "assistant", content: "Theo ATTENDANCE_POLICY..." },
  { role: "user", content: "còn với nhân viên thử việc thì sao?" }
]
TTL: 30 phút không hoạt động thì tự xóa (giống session học tập ở mục 6.6 đã thiết kế)
```
 
`sessionId` được **FE sinh ra** (UUID) khi Admin mở widget chat lần đầu trong phiên làm việc, giữ nguyên cho tới khi đóng tab hoặc F5 — không cần Backend cấp phát.
 
### 15.6.2 Luồng hỏi có lịch sử — cập nhật lại pipeline mục 15.2
 
```
Bước 1  FE gửi: POST /chat/stream
        { sessionId, question, courseId: null, policyScope: [...] }
        (Backend forward y hệt sang AI Service kèm sessionId)
 
Bước 2  AI Service:
        a. Lấy lịch sử từ Redis theo sessionId (nếu có, tối đa N lượt gần nhất — xem 15.6.3)
        b. Câu hỏi RETRIEVE vào Qdrant KHÔNG dùng nguyên văn câu hỏi mới,
           mà dùng "câu hỏi đã viết lại có ngữ cảnh" (xem 15.6.4 — query rewriting)
        c. Prompt Builder ghép: system_prompt + lịch sử hội thoại (rút gọn)
           + retrieved_chunks + câu hỏi hiện tại
        d. Gemini streaming trả lời
 
Bước 3  Sau khi trả lời xong (stream kết thúc):
        AI Service append cặp (user question, assistant answer) vào Redis session
```
 
### 15.6.3 Giới hạn độ dài lịch sử — tránh phình token
 
Không gửi toàn bộ lịch sử nguyên văn mỗi lượt (token sẽ tăng dần theo cấp số cộng qua từng câu hỏi). Áp dụng:
 
- **Giữ tối đa 5 lượt hỏi-đáp gần nhất** (10 message) trong prompt gửi đi — đủ cho ngữ cảnh thực tế, không cần toàn bộ session dài.
- Lượt cũ hơn: nếu cần, tóm tắt lại thành 1-2 câu ("Trước đó đã hỏi về chính sách chấm công và nghỉ phép") thay vì giữ nguyên văn — làm ở Phase sau nếu thấy cần, **Phase A chưa cần bước tóm tắt này**, chỉ cắt bớt (drop lượt cũ) là đủ.
### 15.6.4 Query Rewriting — điểm kỹ thuật quan trọng nhất của multi-turn RAG
 
Đây là phần dễ bị bỏ sót nhất: nếu retrieve thẳng câu hỏi mới "còn với nhân viên thử việc thì sao?" vào Qdrant, kết quả sẽ rất kém vì câu này thiếu chủ ngữ (không có từ khóa "chấm công" để match).
 
**Giải pháp — 1 bước Gemini call rẻ trước khi retrieve:**
```
Input:  lịch sử 5 lượt gần nhất + câu hỏi mới
Prompt: "Viết lại câu hỏi cuối cùng thành 1 câu hỏi độc lập,
         đầy đủ ngữ cảnh, không cần đọc lịch sử phía trên mới hiểu được."
Output: "Quy định chấm công trễ giờ đối với nhân viên thử việc là gì?"
        → dùng câu NÀY để embed + retrieve, không dùng câu gốc
```
Bước này tốn thêm 1 lần gọi Gemini (nhanh, input ngắn) nhưng cải thiện chất lượng retrieval rất nhiều — đáng đánh đổi.
 
### 15.6.5 Cập nhật cấu trúc thư mục `ai-service`
 
```
ai-service/app/
 ├─ chat/
 │   ├─ session_store.py       # Redis get/append/clear theo sessionId
 │   └─ query_rewriter.py      # gọi Gemini viết lại câu hỏi có ngữ cảnh (mục 15.6.4)
 └─ routers/
     └─ chat.py                # cập nhật: nhận sessionId, gọi session_store + query_rewriter
                                  trước khi vào retriever.py
```
 
### 15.6.6 Reset hội thoại
 
- Nút "Cuộc trò chuyện mới" trên widget chat → FE sinh `sessionId` mới, không cần gọi API xóa (Redis TTL tự dọn session cũ).
- Nếu Admin muốn xóa ngay lập tức (VD lỡ hỏi nhầm thông tin nhạy cảm) → thêm `DELETE /chat/session/{sessionId}` xóa key Redis ngay, không đợi TTL.
---
 
## 15.7 Việc cần chốt trước khi triển khai Phase A
 
- [ ] `policy_document` hiện đã có field `content` markdown — xác nhận toàn bộ policy hiện có đã được nhập đủ nội dung (không chỉ có file PDF đính kèm mà `content` để trống)?
- [ ] Ai là người quyết định `policyCode` nào role nào được phép hỏi Copilot — cấu hình cứng trong code hay thêm bảng mapping `policy_access_scope`?
- [x] Multi-turn context: **có giữ**, dùng Redis session (`sessionId` do FE sinh, TTL 30 phút, tối đa 5 lượt gần nhất, kèm query rewriting trước khi retrieve).
- [ ] Giới hạn 5 lượt/30 phút có phù hợp thực tế hay cần điều chỉnh sau khi đo hành vi dùng thật?