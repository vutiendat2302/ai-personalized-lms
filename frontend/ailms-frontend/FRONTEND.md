# Frontend for **AI Personalized Learning Management System (AILMS)**.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui


## Project Structure 

ailms-frontend/
├── public/                 # Tài nguyên tĩnh không qua xử lý của Vite, public 
│
├── src/                    # THƯ MỤC CHÍNH: Chứa toàn bộ code ứng dụng
│   ├── assets/             # Hình ảnh, font, icon dùng bên trong code (được Vite tối ưu)
│   ├── components/         # Chứa các component giao diện
│   │   ├── ui/             # NƠI SHADCN/UI TỰ ĐỘNG THÊM VÀO (button, dialog, card,...)
│   │   └── ...             # Các component dùng chung khác (Header, Sidebar, Navbar...)
│   ├── hooks/              # Custom React Hooks (useAuth, useFetch, useDebounce...)
│   ├── layouts/            # Khung giao diện dùng chung cho nhiều trang (MainLayout, AuthLayout...)
│   ├── pages/              # Các trang chính của app (Home, Login, Dashboard...)
│   ├── routes/             # Cấu hình phân luồng đường dẫn (AppRouter, ProtectedRoute...)
│   ├── services/           # Gọi API backend (httpClient.ts, userService.ts...)
│   ├── types/              # Định nghĩa kiểu dữ liệu TypeScript (như AuthState, User...)
│   ├── utils/              # Các hàm tiện ích dùng nhiều nơi (formatDate, tokenStore...)
│   ├── App.css             # CSS phụ trợ cho App
│   ├── App.tsx             # Component khung điều hướng gốc của React
│   ├── index.css           # File CSS quan trọng nhất (chứa cấu hình Tailwind & theme của shadcn)
│   └── main.tsx            # Điểm khởi chạy app (render App vào div#root)
│
├── .gitignore              # Các file không đẩy lên Git (node_modules, dist...)
├── components.json         # File cấu hình của shadcn/ui (để CLI biết đường dẫn alias)
├── eslint.config.js        # Cấu hình dò lỗi code chuẩn (ESLint)
├── index.html              # Trang HTML gốc (chứa <div id="root">)
├── package.json            # Quản lý thư viện đã tải (dependencies) & lệnh chạy (npm run dev...)
├── tsconfig.json           # Cấu hình TypeScript tổng của project
└── vite.config.ts          # Cấu hình Vite (cài plugin React, khai báo alias "@/"...)

# Summary

| Item | Convention |
|------|------------|
| Folder | camelCase |
| Component | PascalCase |
| Page | PascalCase |
| Layout | PascalCase |
| Hook | useXxx |
| Service | xxx.service.ts |
| Function | camelCase |
| Variable | camelCase |
| Interface | PascalCase |
| Enum | PascalCase |
| Constant | UPPER_SNAKE_CASE |
| Route | kebab-case |
| CSS Class | kebab-case |
| Asset | kebab-case |


User truy cập

/dashboard
      │
      ▼
ProtectedRoute
      │
      ▼
Có Access Token?
      │
  ┌───┴────┐
  │        │
 Không     Có
  │        │
  ▼        ▼
/login  Kiểm tra Role
              │
         ┌────┴─────┐
         │          │
      Sai Role   Đúng Role
         │          │
         ▼          ▼
/unauthorized   <Outlet/>
                     │
                     ▼
                Dashboard

## React Compiler:
- Là công cụ tự động tối ưu hiệu năng của React. Trong dự án này không sử dụng. 

## Cấu hình ESLint 

- Update cấu hình, bật các quy tắc kiểm tra cú phát nhận biết kiểu dữ liệu 


## Thư viện Axios để gửi HTTP request từ fe -> be. Thay vì dùng fetch() mặc định của javascript. 



# TÀI LIỆU THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG

**Tên dự án:** Nền tảng Quản lý Học tập Trực tuyến **AILMS** (AI Learning Management System)  
**Phiên bản:** 1.0  
**Nền tảng mục tiêu:** Web Desktop
**Phông chữ chủ đạo:** Source Sans 3  

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

### 1.1. Mục tiêu hệ thống
**AILMS (AI Learning Management System)** là nền tảng quản lý học tập trực tuyến thông minh được thiết kế nhằm tối ưu hóa trải nghiệm học tập của học viên, đồng thời cung cấp công cụ quản trị và phân tích số liệu chuyên sâu cho Quản trị viên (Admin)

### 1.2. Đối tượng Người dùng (User Personas)
* **Học viên (STUDENT):** Tìm kiếm và đăng ký khóa học, theo dõi tiến độ học tập hàng ngày/tuần, duy trì động lực học tập (Streak), làm bài kiểm tra và nhận chứng chỉ.
* **Quản trị viên (Admin):** Quản lý toàn diện hệ thống bao gồm: người dùng (học viên, nhân viên), danh mục khóa học, thống kê chỉ số KPI, theo dõi biểu đồ doanh thu và chi phí.
* **Quản lý nhân sự (HR):** 
* **Giáo viên (TEACHER):** 
* **Trợ giảng (TA):** 

---

## 2. HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM / UI KIT)

### 2.1. Nghệ thuật chữ (Typography)
* **Font Family:** `Source Sans 3` (Google Fonts)
* **Đặc điểm:** Phông chữ Sans-serif hiện đại, có độ khả độc (readability) cao trên các màn hình hiển thị mật độ điểm ảnh cao, rất phù hợp với các hệ thống bảng biểu, số liệu và nội dung giáo dục.
* **Thang kích thước (Type Scale):**
  * **Heading 1 (Tiêu đề trang):** 24px – 28px | Bold (700) | Line-height: 1.3
  * **Heading 2 (Tiêu đề khối/Section):** 18px – 20px | Semi-Bold (600) | Line-height: 1.4
  * **Heading 3 (Tiêu đề thẻ/Card):** 16px – 18px | Medium (500) | Line-height: 1.4
  * **Body Text (Nội dung chuẩn):** 14px – 16px | Regular (400) | Line-height: 1.5
  * **Caption / Label (Nhãn phụ/Chú thích):** 12px – 13px | Regular (400) hoặc Italic | Color: Muted Gray

### 2.2. Bảng màu (Color Palette)
Hệ thống sử dụng quy tắc phối màu 60-30-10 nhằm tạo sự cân bằng thị giác, làm nổi bật các số liệu quan trọng và hành động chính (CTA):

| Nhóm màu | Mã màu (Hex) | Tên màu gợi ý | Ứng dụng trong giao diện |
| :--- | :--- | :--- | :--- |
| **Màu thương hiệu (Primary)** | `#293681` | Deep Royal Blue | Màu Logo, thanh điều hướng active, tiêu đề chính |
| | `#4274D9` | Cobalt Blue | Màu các liên kết (Links), icon tương tác |
| | `#95CCDD` | Sky Blue | Màu nền phụ, màu phụ trợ trong biểu đồ |
| | `#233D4D` | Dark Slate | Màu chữ chính (Body text), tiêu đề khối |
| **Màu nền & Trung tính (Neutrals)**| `#D9D9D9` | Light Gray | Đường viền (Border), đường phân cách (Divider) |
| | `#EAECF0` | Soft Gray | Nền Card, nền form input disabled |
| | `#F8EBAB` | Soft Yellow | Nền khối banner chào mừng (Highlight nhẹ) |
| | `#EEE0CC` | Warm Cream | Nền trang phụ, khối thông tin tổng quan |
| **Màu Cảnh báo & Lỗi (Alerts)** | `#BE1A1A` | Crimson Red | Nút "Đăng xuất", thông báo lỗi (Error/Danger) |
| | `#D0311E` | Rust Red | Chỉ số sụt giảm, trạng thái hủy |
| | `#FE7F2D` | Orange | Cảnh báo tiến độ chậm, màu Series biểu đồ |
| | `#F7D87F` | Yellow Gold | Đánh giá sao (Star rating), huy hiệu |
| **Màu Thành công (Success)** | `#2B5748` | Forest Green | Trạng thái hoàn thành xuất sắc |
| | `#618764` | Sage Green | Text chỉ số tăng trưởng (e.g., Tỷ lệ hoàn thành 90%) |
| | `#9CB080` | Soft Green | Màu nền của thông báo thành công (Success Toast) |

### 2.3. Các thành phần giao diện chung (Common UI Components)

#### A. Header / Navigation Bar
* **Logo:** Chữ `AILMS` màu `#293681`, đậm, đặt góc trái trên cùng.
* **Context Selector (Dropdown):** Cho phép chọn ngữ cảnh làm việc như `"Các khóa học của tôi"`, `"Quản lý khóa học"`.
* **Global Search Bar (Thanh tìm kiếm):** 
  * Placeholder: *"Bạn muốn học gì ?"*
  * Icon kính lúp góc phải bên trong ô input.
  * Bo góc: 20px (Pill shape), viền màu `#95CCDD` hoặc `#D9D9D9`.
* **Action Icons (Góc phải):**
  * **Ngôn ngữ:** Icon quả địa cầu (Chuyển đổi VI/EN).
  * **Thông báo:** Icon quả chuông (Có chấm đỏ hiển thị thông báo mới).
  * **User Avatar:** Hình tròn (32x32px hoặc 40x40px) tích hợp Dropdown Menu.

#### B. Buttons (Nút bấm)
* **Primary Button (Nút hành động chính):**
  * Nền: `#293681` hoặc `#1D2D5A` | Chữ: Màu trắng (White) | Bo góc: 6px – 8px.
  * *Ví dụ:* Nút **"Lưu thay đổi"**, **"Xem tất cả"**.
* **Danger Button (Nút hành động nguy hiểm):**
  * Nền: `#BE1A1A` | Chữ: Màu trắng | Bo góc: 6px – 8px.
  * *Ví dụ:* Nút **"Đăng xuất"**.
* **Secondary / Outline Button (Nút phụ):**
  * Nền: Trong suốt hoặc xám nhạt `#EAECF0` | Viền: `#233D4D` hoặc `#D9D9D9` | Chữ: `#233D4D`.
  * *Ví dụ:* Nút **"Tải ảnh lên"**, **"Xóa ảnh"**.

#### C. Form Inputs (Ô nhập liệu)
* Bo góc 6px, nền `#EAECF0` hoặc màu trắng với viền `#D9D9D9`.
* Khi Focus: Viền chuyển sang màu xanh Primary `#4274D9`, đổ bóng nhẹ (Glow effect).
* Trạng thái Disabled/ReadOnly: Nền xám nhạt hơn, con trỏ chuột `not-allowed`.

---

### 5.2. Trạng thái giao diện (UI States)
* **Loading State (Trạng thái đang tải):**
  * Khi nhấn **"Lưu thay đổi"**, nút bấm chuyển sang trạng thái disabled, màu sắc tối đi 15% và hiển thị icon Spinner xoay thay cho text, ngăn người dùng bấm gửi yêu cầu nhiều lần (Prevent double submit).
  * Các khối biểu đồ và danh sách khóa học sử dụng hiệu ứng **Skeleton Loading** (màu xám nhạt nhấp nháy `#EAECF0`) trong thời gian chờ tải dữ liệu từ API.
* **Empty State (Trạng thái trống):**
  * Khi học viên chưa đăng ký khóa học nào hoặc Admin tìm kiếm không ra kết quả, hiển thị hình minh họa (Illustration) thân thiện kèm thông điệp rõ ràng và Nút CTA (Ví dụ: *"Bạn chưa có khóa học nào. Khám phá ngay!"*).
* **Feedback / Notifications (Phản hồi hệ thống):**
  * Sử dụng **Toast Notification** (Góc trên bên phải màn hình, tự động ẩn sau 4 giây):
    * *Thành công:* Nền `#9CB080` (hoặc viền xanh lá), icon tick xanh: *"Cập nhật thông tin thành công!"*
    * *Thất bại:* Nền đỏ nhạt, viền `#BE1A1A`, icon cảnh báo: *"Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại sau."*

### 5.3. Trải nghiệm Đáp ứng (Responsive Design & Accessibility)
* **Breakpoints chuẩn:**
  * **Desktop (≥ 1200px):** Giữ nguyên bố cục lưới 2 - 3 cột, hiển thị đầy đủ sidebar và bảng biểu đồ rộng như Mockup.
  * **Tablet (768px – 1199px):** Các thẻ KPI chuyển từ 5 cột xuống 2 - 3 cột (Grid autolayout). Biểu đồ và bảng dữ liệu thu gọn lề, cho phép cuộn ngang (Horizontal scroll) đối với bảng dữ liệu chi tiết nếu cần.
  * **Mobile (< 768px):** 
    * Bố cục chuyển hoàn toàn sang 1 cột dọc (Stack vertically).
    * Thanh Header ẩn các icon phụ vào Menu Hamburger hoặc Drawer kéo từ cạnh màn hình.
    * Các trường Input trong màn hình Cài đặt tự động mở bàn phím số (Numeric keyboard) trên điện thoại khi focus vào ô *Số điện thoại* hoặc *Ngày sinh*.
* **Khả năng truy cập (Accessibility - a11y):**
  * Đảm bảo độ tương phản màu sắc (Color Contrast Ratio) đạt chuẩn **WCAG AA** (tỷ lệ tối thiểu 4.5:1 đối với chữ thường và 3:1 đối với chữ lớn/icon).
  * Hỗ trợ điều hướng bằng bàn phím (Tab navigation) qua tất cả các trường input, nút bấm và dropdown menu.