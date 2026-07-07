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