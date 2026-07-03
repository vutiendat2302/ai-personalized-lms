# Backend 

- Các biểu đồ: High - Level design, Deployment diagram , erd, 
sequence Diagram, DFD: data flow diagram, activity diagram 

- Cấu trúc thư mục tổ chức theo layer (truyền thống)
+  cách 2: là theo module 


- Viết be flow snowflake id 


- entity-> repo -> service (dto, mapper, exception, validation) -> cotroller -> securety -> tesst 


## Module 2: Course management (Ai - LMS)
- CRUD: Khóa học, bài học 
- Tổ chức nội dung:
- Quản lý danh mục 
- Tìm kiếm 
- Sắp xếp 
- Gán giảng viên 
- Hiển thị học viên, giảng viên 
- Truy cập 


### Chức năng: 
* Course: CRUD, ẩn khóa học, xem danh sách khóa học, chi tiết khóa học, gán giảng viên, hủy gán, xem danh sách giảng viên, filter, find 

* Course Section: CRUD, sắp xếp, find, filter 

* Category: CRUD, gán course vào category, Filter course theo category, find category 

* Lessson: CRUD, find, filter, preivew (free, locked) 

* Lesson Resource: Upload file, gắn file vào leeson, xóa file, dowload file, 

* Metadata: số lesson, tổng thời lượng một khóa, level, rating, tổng số bài học một khóa 

src/main/java/com/ailms/coursemanagement/
│
├── config/ # Spring configs
│ ├── SecurityConfig.java

├── controller/ layer: presentation
│
├── service/ layer:
│
├── repository/ layer: data access
│
├── entity/ # JPA @Entity
│
├── dto/
│
├── mapper/ 
│
├── exception/
│
│- request 
|-response 
|
└── CourseManagementApplication.java
