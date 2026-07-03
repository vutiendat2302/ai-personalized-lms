# PROGRESS — AI LMS Backend (Module 2: Course Management)

> Cập nhật lần cuối: xem theo commit/chat gần nhất. File này dùng để chat mới đọc và biết tiếp tục từ đâu.

## Quy ước chung
- Package gốc: `com.ailms`
- Cấu trúc layer: `entity -> repository -> service(dto, mapper, exception, validation) -> controller -> security -> test`
- Mapper: **MapStruct** (`componentModel = "spring"`), interface đặt trong `mapper/`
- Service: tách **interface** (`service/XxxService.java`) và **implementation** (`service/impl/XxxServiceImpl.java`)
- Id: Snowflake (`@SnowflakeId`, có sẵn trong `common.snowflake`)
- **Entity Builder**: dùng `@SuperBuilder` (Lombok, KHÔNG dùng `@Builder` thường) cho mọi entity vì có kế thừa từ `BaseEntity`. Đi kèm `@NoArgsConstructor` (JPA bắt buộc). KHÔNG dùng `@AllArgsConstructor` chung với `@SuperBuilder` (dễ xung đột). `BaseEntity` cũng phải có `@SuperBuilder` + `@NoArgsConstructor` để class con gọi `super(builder)` được.
- Exception dùng chung (đã code xong, áp dụng cho mọi entity): `ResourceNotFoundException`, `DuplicateResourceException`, `BusinessException`, `ErrorResponse`, `GlobalExceptionHandler`
- Response chung (đã code xong, áp dụng cho mọi entity):
  - `response/ApiResponse.java` — generic envelope `{success, message, data, timestamp}`, dùng ở Controller. Có static factory `ApiResponse.of(message, data)`, `ApiResponse.of(data)`, `ApiResponse.message(msg)`
  - `response/PageResponse.java` — generic wrapper cho dữ liệu phân trang `{content, pageNumber, pageSize, totalElements, totalPages, first, last}`. Build từ `Page<T>` qua `PageResponse.from(page)`
- Search/Filter/Pagination pattern (áp dụng cho mọi entity từ giờ về sau):
  - 'request/BaseSearchRequest.java` — abstract class chứa `page, size, sortBy, sortDirection` + method `toPageable()`. Mọi `XxxSearchRequest` sẽ `extends BaseSearchRequest`
  - `repository/specification/XxxSpecification.java` — build `Specification<XxxEntity>` động theo các field filter trong `XxxSearchRequest`
  - Repository phải `extends JpaSpecificationExecutor<XxxEntity>` để dùng `findAll(spec, pageable)`
  - Service có thêm method `PageResponse<XxxResponse> search(XxxSearchRequest request)`

## Input đã có (đầu vào từ user, không phải Claude sinh ra)
- [x] `CategoryEntity` + `CategoryRepository` (gốc)
- [x] `CourseEntity` + `CourseRepository` — Đã có và đã update (`JpaSpecificationExecutor`)
- [X ] `CourseSectionEntity` + repo — **CHƯA gửi**
- [ X] `LessonEntity` + repo — **CHƯA gửi**
- [ X] `LessonResourceEntity` + repo — **CHƯA gửi**
- [ ] `CourseMetadataEntity` + repo — **CHƯA gửi**
- [ ] `CourseInstructorEntity` (entity gán giảng viên) + repo — **CHƯA gửi**

## Tiến độ theo entity (CRUD cơ bản trước, nghiệp vụ sau)

### 1. Category — 🟢 CRUD + search/filter/pagination: DONE / Nghiệp vụ business khác: TODO
- [x] `dto/request/CategoryRequest.java`
- [x] `dto/request/CategoryStatusRequest.java`
- [x] `dto/request/CategorySearchRequest.java` (extends `BaseSearchRequest`) — search theo `name` (LIKE), filter `status` (exact), filter khoảng ngày `createdFrom`/`createdTo`
- [x] `dto/response/CategoryResponse.java`
- [x] `mapper/CategoryMapper.java` (MapStruct)
- [x] `repository/specification/CategorySpecification.java`
- [x] `service/CategoryService.java` (interface) — có thêm `search(CategorySearchRequest)`
- [x] `service/impl/CategoryServiceImpl.java`
- [x] `repository/CategoryRepository.java` (bổ sung: `extends JpaSpecificationExecutor`, existsByNameIgnoreCase, existsByNameIgnoreCaseAndIdNot, findByNameIgnoreCase, countCoursesByCategoryId)
- [x] `controller/CategoryController.java` — full CRUD + search/pagination, dùng `ApiResponse<T>` wrapper
- [ ] 
- [ ] Unit test cho `CategoryService` — TODO (đang làm tiếp)
- [ ] Unit test cho `CategoryService` — TODO (đang làm tiếp)
- [ ] Nghiệp vụ: "Filter course theo category", "Gán course vào category" (thuộc về Course service, không phải Category service)
- ⚠️ Cần verify: tên field `categoryEntity` trong `CourseEntity` khi có entity thật (đang dùng trong query `countCoursesByCategoryId`)

> ⚠️ **Lưu ý quan trọng — user đã tự đổi cấu trúc package so với bản Claude generate ban đầu:**
> - Request/Response KHÔNG nằm trong `dto/request`, `dto/response` nữa mà ở top-level `com.ailms.request`, `com.ailms.response`
> - `CategoryRequest` gộp chung đã tách thành `CreateCategoryRequest` + `UpdateCategoryRequest` (2 file riêng, cùng field name/description nhưng để tách validate sau này nếu cần)
> - Interface đặt tên `ICategoryService` (có tiền tố `I`), implementation đặt tên `CategoryService implements ICategoryService` (KHÔNG phải `CategoryServiceImpl`) — khác quy ước mình đề xuất ban đầu, nhưng đây là lựa chọn của user, **từ giờ làm Course/Lesson... phải theo đúng pattern này**: `ICourseService` (interface) + `CourseService implements ICourseService` (impl), cùng nằm trong `service/` (không tách `service/impl/` nữa)
> - Khi cần file cũ tham chiếu lại, ưu tiên đọc message gần nhất user paste code thật, đừng dùng bản Claude tự generate trước đó (đã lỗi thời)

### 2. Course — 🟢 CRUD + search/filter/pagination: DONE / Nghiệp vụ business khác: TODO
- [x] DTO (CreateCourseRequest, UpdateCourseRequest, CourseStatusRequest, CourseSearchRequest, CourseResponse)
- [x] Mapper (CourseMapper)
- [x] Service interface + impl (ICourseService, CourseService - có auto-generate slug)
- [ ] Nghiệp vụ sau CRUD: gán/hủy gán giảng viên, gắn metadata vào response

### 3. CourseSection — 🟢 CRUD + reorder: DONE / Nghiệp vụ business khác: DONE
- [x] DTO, Mapper, Service CRUD
- [x] Nghiệp vụ: sắp xếp thứ tự (reorder)

### 4. Lesson — 🟢 CRUD + reorder: DONE / Nghiệp vụ business khác: TODO
- [x] DTO, Mapper, Service CRUD
- [x] Nghiệp vụ: sắp xếp thứ tự (reorder)
- [ ] Nghiệp vụ: preview (free/locked), filter

### 5. LessonResource — 🟢 CRUD: DONE / Nghiệp vụ business khác: TODO
- [x] DTO, Mapper, Service CRUD
- [ ] Nghiệp vụ: upload file (storage S3/GCS), validate mime/size, download qua signed URL, gắn/xóa file khỏi lesson

### 6. CourseMetadata — 🟢 DONE
- [x] DTO, Mapper, Service (tự động tính toán qua recalculateMetadata khi lesson/section thay đổi — xem DFD 2.3 trong doc gốc)

### 7. CourseInstructor (gán giảng viên) — ⬜ TODO
- [ ] DTO, Mapper, Service: gán/hủy gán, danh sách giảng viên theo course
- [ ] Nghiệp vụ: gửi notification khi gán (xem sequence diagram 1.2)

## Controller / Security / Test — ⬜ Chưa bắt đầu (làm sau khi tất cả Service CRUD xong)

## Việc cần làm tiếp theo (next action)
1. Phân quyền, thiết kế database phân quyền, quản lý nhân sự (giảng viên, giáo viên, học sinh) 
1. Thực hiện nghiệp vụ CourseInstructor (gán giảng viên, danh sách giảng viên, gửi notification).
2. Hoàn thiện các nghiệp vụ business nâng cao khác: Preview lesson (free/locked), Download resource qua signed URL, tích hợp Upload file (S3/GCS).
3. Viết Unit test và hoàn tất tích hợp Security.


## Lưu ý kỹ thuật cần nhớ
- Mapper dùng MapStruct → cần đảm bảo `pom.xml` có `mapstruct` + `mapstruct-processor` (annotation processor). Chưa được user xác nhận.
- `CategoryResponse.courseCount` không map tự động qua MapStruct (vì cần query riêng) — set thủ công qua `categoryMapper.withCourseCount(...)` trong service.
- `getAll()` của Category **không** kèm courseCount (tránh N+1 query) — chỉ `getById()` mới tính.
- `getAll()` trả `List<CategoryResponse>` (lấy hết, không phân trang) — chỉ phù hợp khi dữ liệu category ít (vd: dropdown filter). Khi cần phân trang/filter thật sự thì dùng `search()`.
- `search()` dùng Spring Data JPA Specification (`Criteria API`), filter động: name LIKE (case-insensitive), status exact match, createdAt range. Pattern này sẽ tái dùng cho Course (search/filter theo title, category, level, status), Lesson, v.v.
- `ApiResponse<T>` và `PageResponse<T>` đặt ở `common/response/`, KHÔNG đặt trong `dto/response/` vì đây là response chung toàn hệ thống, không gắn với entity cụ thể.
