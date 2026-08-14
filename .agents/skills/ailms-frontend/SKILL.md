---
name: ailms-frontend
description: Phát triển, sửa lỗi, refactor, review và kiểm thử Frontend AILMS tại frontend/ailms-frontend sử dụng React, TypeScript, Vite, Tailwind CSS, shadcn, Axios, React Router, Zustand, React Hook Form và Zod. Sử dụng khi làm page, component, hook, layout, form, routing, API client, TypeScript type, state, UI, responsive, loading/error/empty state, permission, lint hoặc frontend build. Không sử dụng cho Backend-only, AI Service, SQL, Docker hoặc tài liệu. Không dùng cửa sổ mặc định của window, phải dùng của shadcn. Mọi button, drowdown, select, ... dùng của shadcn. 
---

# AILMS Frontend

Làm việc trong `frontend/ailms-frontend`.

Luôn kiểm tra pattern hiện có trước khi tạo abstraction mới.

## Cấu trúc

Sử dụng đúng layer:

- `src/pages` → route-level page
- `src/components` → component nghiệp vụ
- `src/components/ui` → shadcn/UI primitive
- `src/api` → Backend API client
- `src/hooks` → custom hook
- `src/store` → Zustand global state
- `src/types` → TypeScript type/interface
- `src/layouts` → layout
- `src/services` → client service hiện có
- `src/utils` → pure utility
- `src/config` → frontend config

Không nhét toàn bộ logic vào page component.

## Luồng dữ liệu

Giữ:

`Page → Component/Hook → API Client → Backend`

Chỉ đưa state vào Zustand khi state thực sự cần dùng chung.

Giữ state cục bộ trong component khi không cần global.

## API

Frontend chỉ gọi Backend.

Không gọi trực tiếp:

- AI Service;
- Gemini;
- MySQL;
- Redis;
- MinIO.

Tính năng AI cũng phải đi:

`Frontend → Backend → AI Service`

Tái sử dụng Axios/API infrastructure hiện có.

Không viết raw HTTP request rải rác trong component.

## TypeScript và ID

Giữ request/response type đồng bộ Backend.

ID phía Frontend sử dụng `string`.

Không ép Snowflake ID sang JavaScript `number` nếu có nguy cơ mất precision.

Nếu API contract thay đổi, áp dụng `ailms-api-contract`.

## Dữ liệu

Không dùng fake/mock/hard-code business data trong UI production.

Không có dữ liệu thì hiển thị empty state.

Không tự tạo dữ liệu giả để giao diện trông có nội dung.

## React

Ưu tiên functional component.

Tuân thủ React Hooks rules.

Page chủ yếu làm nhiệm vụ composition.

Tách logic phức tạp hoặc reusable thành:

- component;
- custom hook;
- utility.

Kiểm tra component hiện có trước khi tạo component gần giống.

Không tạo global state chỉ để tránh truyền một vài props đơn giản.

## Form

Ưu tiên pattern React Hook Form + Zod hiện có.

Không quản lý cùng một field đồng thời bằng React state và React Hook Form nếu không cần thiết.

Hiển thị validation/API error rõ ràng.

Giữ schema frontend nhất quán với API contract.

## Trạng thái async

Màn hình lấy dữ liệu phải xử lý rõ:

- loading;
- success;
- empty;
- error;
- forbidden/permission khi cần.

Không để blank page hoặc loading vô hạn khi request lỗi.

## Tailwind + shadcn

Tái sử dụng `src/components/ui`.

Dùng Tailwind và design token hiện có.

Ưu tiên màu/theme trong `src/index.css`.

Không tự tạo một bộ màu khác song song với design system.

Hạn chế hard-code màu khi đã có token tương ứng.

Giữ responsive cho desktop và mobile.

Khi sửa UI, kiểm tra component lân cận để giữ thống nhất:

- spacing;
- typography;
- radius;
- color;
- layout.

## Dependency

Đọc `package.json` trước khi thêm package.

Không cài package mới nếu React, shadcn hoặc dependency hiện tại đã hỗ trợ chức năng đó.

## Kiểm tra

Chạy:

`npm run lint`

sau đó:

`npm run build`

Chạy test liên quan nếu project đã có test cho vùng thay đổi.

Không hoàn thành task khi TypeScript/build/lint lỗi do thay đổi vừa thực hiện.