1. Spring Boot Backend gửi HTTP POST
   → kèm header "X-Internal-Token"
   
2. main.py nhận request, route tới đúng router (test_ai.py)

3. security.py (verify_internal_token) chạy trước (Depends)
   → so khớp token với INTERNAL_SECRET trong .env
   → sai/thiếu → trả 401 ngay, không đi tiếp

4. test_schema.py validate body request
   → đúng field (prompt, system_instruction) → tiếp tục
   → sai kiểu dữ liệu → FastAPI tự trả 422

5. Router gọi gemini_provider.generate_text(prompt, system_instruction)

6. gemini_provider.py:
   → lấy GEMINI_API_KEY, GEMINI_MODEL từ config.py
   → gọi Google Gemini API thật qua SDK google-genai
   → trả text response

7. Router đóng gói kết quả theo GenerateTestResponse
   → trả về Spring Boot dạng JSON

   ---
   python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt