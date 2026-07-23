# Yêu Cầu Các API Backend Cho Trang Danh Mục & Chi Tiết Khóa Học

Tài liệu này tổng hợp chi tiết các API cần bổ sung, nâng cấp hoặc xây dựng mới ở Backend để đáp ứng dữ liệu hiển thị cho các trang **Chi tiết khóa học (Course Detail)** và **Danh mục khóa học (Category Detail)** trên Frontend.

---

## 1. API Chi Tiết Danh Mục (Nâng cấp)
API này dùng để lấy thông tin chi tiết của danh mục khi người dùng truy cập trang danh mục. Cần bổ sung các trường đếm số lượng (thống kê) để hiển thị giống như Coursera.

* **Endpoint:** `GET /api/v1/categories/{id}`
* **Method:** `GET`
* **URL Parameter:** 
  * `id` (String hoặc Long): ID của danh mục.
* **Trạng thái hiện tại:** Đã có cơ bản, **cần nâng cấp dữ liệu trả về**.
* **Dữ liệu trả về mong muốn (Response Body):**

```json
{
  "success": true,
  "message": "Lấy chi tiết danh mục thành công",
  "data": {
    "id": "355563233593135106",
    "name": "Marketing số",
    "description": "Khám phá các khóa học tiếp thị số chuyên nghiệp từ cơ bản đến nâng cao...",
    "status": "ACTIVE",
    "createdAt": "2026-05-20T11:32:42",
    "updatedAt": "2026-07-23T15:27:31",
    
    // --- CÁC TRƯỜNG CẦN BỔ SUNG Ở BE ---
    "coursesCount": 5789,      // Tổng số lượng khóa học thuộc danh mục này
    "degreesCount": 14,        // Số lượng chương trình cấp bằng (Bachelors/Masters) trực tuyến
    "credentialsCount": 1026   // Số chứng chỉ nghề nghiệp liên quan
  },
  "timestamp": "2026-07-23T15:42:42"
}
```

---

## 2. API Lọc/Tìm Kiếm Khóa Học Theo Danh Mục & Cấp Độ (Kiểm tra & Hoàn thiện)
API này dùng để tải danh sách các khóa học phổ biến nhất thuộc danh mục đó, hỗ trợ phân trang và lọc theo cấp độ của khóa học (Cơ bản, Trung cấp, Nâng cao).

* **Endpoint:** `GET /api/v1/courses/search`
* **Method:** `GET`
* **Trạng thái hiện tại:** Đã có, **cần kiểm tra xem BE đã hỗ trợ đầy đủ các tham số sau chưa**:
* **Tham số truy vấn (Query Parameters):**
  * `categoryId` (String/Long): ID của danh mục cần lấy khóa học.
  * `level` (String): Cấp độ cần lọc. Các giá trị hợp lệ: `BEGINNER` (Cơ bản), `INTERMEDIATE` (Trung cấp), `ADVANCED` (Nâng cao). *Không truyền nếu chọn "Tất cả"*.
  * `status` (String): Trạng thái hoạt động, mặc định truyền `ACTIVE`.
  * `page` (int): Số trang (bắt đầu từ 0).
  * `size` (int): Kích thước trang (Frontend đang truyền mặc định là `8`).
* **Dữ liệu trả về (Response Body - Dạng phân trang PageResponse):**

```json
{
  "success": true,
  "message": "Tìm kiếm khóa học thành công",
  "data": {
    "content": [
      {
        "id": "355582871404154883",
        "categoryId": "355563233593135106",
        "categoryName": "Marketing số",
        "name": "Toàn tập Marketing số cho người mới bắt đầu #1994",
        "link": "toan-tap-marketing-so-cho-nguoi-moi-bat-au-1994-148",
        "description": "Khóa học thiết kế chuyên sâu dành cho học viên mong muốn nắm vững kiến thức về Marketing số...",
        "suggestedPrice": 4100000.0,
        "level": "ADVANCED",
        "status": "ACTIVE",
        "avgRating": 4.6,
        "reviewCount": 170,
        "viewCount": 99451,
        "enrollmentCount": 2550,
        "createdAt": "2025-05-22T11:32:42",
        "updatedAt": "2026-05-20T11:32:42"
      }
    ],
    "pageNumber": 0,
    "pageSize": 8,
    "totalElements": 25,
    "totalPages": 4,
    "first": true,
    "last": false
  },
  "timestamp": "2026-07-23T15:42:42"
}
```

---

## 3. API Bằng Cấp Trực Tuyến - Online Degrees (Xây dựng mới)
API này dùng để lấy danh sách các chương trình bằng đại học/thạc sĩ trực tuyến liên kết với các trường đại học đối tác.

* **Endpoint:** `GET /api/v1/degrees/search` hoặc `GET /api/v1/categories/{categoryId}/degrees`
* **Method:** `GET`
* **Trạng thái hiện tại:** **Cần tạo mới hoàn toàn ở Backend** (Entity `Degree`, `DegreeRepository`, `DegreeService`, `DegreeController`).
* **Tham số truy vấn (Query Parameters):**
  * `categoryId` (String/Long): ID danh mục liên quan.
  * `type` (String): Loại bằng cấp. Các giá trị hợp lệ: `BACHELORS` (Cử nhân), `MASTERS` (Thạc sĩ). *Không truyền nếu chọn "Tất cả bằng cấp"*.
  * `page` (int): Số trang (bắt đầu từ 0).
  * `size` (int): Kích thước phân trang (mặc định là `6` hoặc `8`).
* **Dữ liệu trả về mong muốn (Response Body):**

```json
{
  "success": true,
  "message": "Tìm kiếm bằng cấp trực tuyến thành công",
  "data": {
    "content": [
      {
        "id": "deg-1",
        "universityName": "Đại học Bách Khoa Hà Nội",
        "universityLogo": "BK", // Ký hiệu viết tắt hoặc URL ảnh Logo trường
        "title": "Cử nhân Công nghệ thông tin (Khoa học máy tính)",
        "type": "BACHELORS", // BACHELORS hoặc MASTERS
        "duration": "36 - 48 tháng học trực tuyến",
        "image": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500", // Link ảnh nền chương trình học
        "status": "ACTIVE"
      }
    ],
    "pageNumber": 0,
    "pageSize": 6,
    "totalElements": 3,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "timestamp": "2026-07-23T15:42:42"
}
```

---

## 4. API Lấy Tất Cả Danh Mục Hoạt Động (Đã có sẵn)
Dùng để lấy danh sách danh mục hiển thị dưới chân trang danh mục (Explore other categories).

* **Endpoint:** `GET /api/v1/categories`
* **Method:** `GET`
* **Trạng thái hiện tại:** Đã hoạt động tốt. Frontend đang gọi qua `courseApi.getAllCategories()`.
