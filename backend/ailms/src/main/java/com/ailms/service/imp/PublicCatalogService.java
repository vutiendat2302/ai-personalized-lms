package com.ailms.service.imp;

import com.ailms.entity.CategoryEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.TeacherCategoryEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.CourseLevelEnum;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.client.AiServiceClient;
import com.ailms.request.ai.AiCatalogSearchRequest;
import com.ailms.response.ai.AiCatalogSearchResponse;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.CategoryRepository;
import com.ailms.repository.CoursePackageRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.CourseTeacherRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.TeacherCategoryRepository;
import com.ailms.response.PageResponse;
import com.ailms.response.publicapi.PublicCategoryResponse;
import com.ailms.response.publicapi.PublicCourseCardResponse;
import com.ailms.response.publicapi.PublicTeacherResponse;
import com.ailms.service.IPublicCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Comparator;
import java.util.regex.Pattern;

/** Nghiệp vụ catalog công khai, chỉ đọc dữ liệu đã được xuất bản và đang bán. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicCatalogService implements IPublicCatalogService {
    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+" );
    private final EmployeeRepository employeeRepository;
    private final TeacherCategoryRepository teacherCategoryRepository;
    private final CourseTeacherRepository courseTeacherRepository;
    private final CourseRepository courseRepository;
    private final CoursePackageRepository coursePackageRepository;
    private final CategoryRepository categoryRepository;
    private final AiServiceClient aiServiceClient;
    @Value("${api.prefix}")
    private String apiPrefix;

    /** Lấy giáo viên công khai, ưu tiên người có rating và nhiều khóa học đang bán. */
    @Override
    public PageResponse<PublicTeacherResponse> getTeachers(String keyword, int page, int size) {
        int normalizedPage = page(page, size);
        int normalizedSize = size(size);
        List<PublicTeacherResponse> ranked = toTeachers(employeeRepository.findAllPublicTeachers(clean(keyword))).stream()
                .filter(teacher -> teacher.getCourseCount() > 0 && teacher.getAverageRating() != null
                        && teacher.getAverageRating() > 0)
                .sorted(Comparator.comparing(PublicTeacherResponse::getAverageRating, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(PublicTeacherResponse::getCourseCount, Comparator.reverseOrder())
                        .thenComparing(PublicTeacherResponse::getStudentCount, Comparator.reverseOrder())
                        .thenComparing(PublicTeacherResponse::getFullName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
        int from = Math.min(normalizedPage * normalizedSize, ranked.size());
        int to = Math.min(from + normalizedSize, ranked.size());
        return PageResponse.<PublicTeacherResponse>builder().content(ranked.subList(from, to))
                .pageNumber(normalizedPage).pageSize(normalizedSize).totalElements(ranked.size())
                .totalPages((int) Math.ceil((double) ranked.size() / normalizedSize)).first(from == 0).last(to >= ranked.size()).build();
    }

    /** Lấy chi tiết giáo viên và từ chối tài khoản không còn ở trạng thái công khai. */
    @Override
    public PublicTeacherResponse getTeacher(Long teacherId) {
        EmployeeEntity teacher = employeeRepository.findById(teacherId)
                .filter(this::isPublicTeacher)
                .orElseThrow(() -> ResourceNotFoundException.of("Teacher", teacherId));
        return toTeacher(teacher);
    }

    /** Lấy khóa học công khai của giáo viên, lọc thêm level và category nếu có. */
    @Override
    public PageResponse<PublicCourseCardResponse> getTeacherCourses(Long teacherId, CourseLevelEnum level,
                                                                      Long categoryId, int page, int size) {
        getTeacher(teacherId);
        Page<CourseEntity> courses = courseRepository.findPublicCoursesByTeacher(
                teacherId, level, categoryId, pageable(page, size, Sort.unsorted()));
        return PageResponse.from(courses.map(this::toCourseCard));
    }

    /** Đếm và trả danh mục công khai bằng kết quả GROUP BY từ database. */
    @Override
    public List<PublicCategoryResponse> getCategoryCourseCounts() {
        return categoryRepository.findPublicCategoryCourseCounts(BaseStatusEnum.ACTIVE)
                .stream().map(this::toCategory).toList();
    }

    /** Trả danh mục nổi bật theo số khóa học và tổng lượt ghi danh thực tế. */
    @Override
    public PageResponse<PublicCategoryResponse> getHotCategories(int page, int size) {
        List<PublicCategoryResponse> all = getCategoryCourseCounts();
        int from = Math.min(page(page, size) * size, all.size());
        int to = Math.min(from + size, all.size());
        List<PublicCategoryResponse> content = all.subList(from, to);
        return PageResponse.<PublicCategoryResponse>builder().content(content).pageNumber(page(page, size))
                .pageSize(size).totalElements(all.size()).totalPages((int) Math.ceil((double) all.size() / size))
                .first(from == 0).last(to >= all.size()).build();
    }

    /** Lấy khóa học phổ biến trong danh mục, đã kiểm tra category tồn tại và đang hoạt động. */
    @Override
    public PageResponse<PublicCourseCardResponse> getCategoryCourses(Long categoryId, CourseLevelEnum level,
                                                                       int page, int size) {
        requireActiveCategory(categoryId);
        return PageResponse.from(courseRepository.findPublicCoursesByCategory(
                categoryId, level, pageable(page, size, Sort.unsorted())).map(this::toCourseCard));
    }

    /** Lấy danh mục khác theo cosine similarity của hồ sơ semantic catalog. */
    @Override
    public List<PublicCategoryResponse> getRelatedCategories(Long categoryId, int limit) {
        CategoryEntity source = requireActiveCategory(categoryId);
        Map<Long, PublicCategoryResponse> counts = new HashMap<>();
        getCategoryCourseCounts().forEach(item -> counts.put(item.getId(), item));
        try {
            List<AiCatalogSearchResponse> results = aiServiceClient.searchCatalog(AiCatalogSearchRequest.builder()
                    .query(categoryText(source)).entityType("category").limit(Math.min(limit + 20, 200))
                    .filters(Map.of("excludeCategoryId", categoryId)).build());
            return results.stream().map(item -> parseId(item.getId())).filter(Objects::nonNull)
                    .filter(id -> !id.equals(categoryId)).map(counts::get).filter(Objects::nonNull)
                    .filter(item -> item.getPublicCourseCount() > 0)
                    .limit(limit).toList();
        } catch (Exception exception) {
            return categoryRepository.findOtherActiveCategories(categoryId, BaseStatusEnum.ACTIVE,
                            PageRequest.of(0, Math.min(limit, 20))).stream()
                    .map(CategoryEntity::getId).map(counts::get).filter(Objects::nonNull)
                    .filter(item -> item.getPublicCourseCount() > 0).toList();
        }
    }

    /** Lấy khóa học khác danh mục theo cosine similarity với hồ sơ danh mục hiện tại. */
    @Override
    public PageResponse<PublicCourseCardResponse> getRelatedCourses(Long categoryId, int page, int size) {
        CategoryEntity source = requireActiveCategory(categoryId);
        try {
            List<AiCatalogSearchResponse> results = aiServiceClient.searchCatalog(AiCatalogSearchRequest.builder()
                    .query(categoryText(source)).entityType("course").limit(200)
                    .filters(Map.of("excludeCategoryId", categoryId)).build());
            List<Long> ids = results.stream().map(item -> parseId(item.getId())).filter(Objects::nonNull)
                    .toList();
            Map<Long, Integer> order = new HashMap<>();
            ids.forEach(id -> order.put(id, order.size()));
            List<CourseEntity> courses = courseRepository.findPublicCoursesByIds(ids).stream()
                    .filter(course -> course.getCategoryEntity() == null
                            || !categoryId.equals(course.getCategoryEntity().getId()))
                    .sorted((left, right) -> Integer.compare(order.getOrDefault(left.getId(), Integer.MAX_VALUE),
                            order.getOrDefault(right.getId(), Integer.MAX_VALUE))).toList();
            int from = Math.min(page(page, size) * size, courses.size());
            int to = Math.min(from + size, courses.size());
            List<PublicCourseCardResponse> content = courses.subList(from, to).stream().map(this::toCourseCard).toList();
            return PageResponse.<PublicCourseCardResponse>builder().content(content).pageNumber(page(page, size))
                    .pageSize(size).totalElements(courses.size()).totalPages((int) Math.ceil((double) courses.size() / size))
                    .first(from == 0).last(to >= courses.size()).build();
        } catch (Exception exception) {
            return PageResponse.from(courseRepository.findRelatedPublicCourses(
                    categoryId, pageable(page, size, Sort.unsorted())).map(this::toCourseCard));
        }
    }

    /** Lấy khóa học công khai gần nghĩa với khóa học nguồn bằng local catalog vector. */
    @Override
    public PageResponse<PublicCourseCardResponse> getRelatedCoursesByCourse(Long courseId, int page, int size) {
        CourseEntity source = requirePublicCourse(courseId);
        try {
            Map<String, Object> vectorFilters = new HashMap<>();
            vectorFilters.put("excludeCourseId", courseId);
            if (source.getCategoryEntity() != null) {
                vectorFilters.put("excludeCategoryId", source.getCategoryEntity().getId());
            }
            List<AiCatalogSearchResponse> results = aiServiceClient.searchCatalog(AiCatalogSearchRequest.builder()
                    .query(courseText(source)).entityType("course").limit(200)
                    .filters(vectorFilters).build());
            PageResponse<PublicCourseCardResponse> related = pageCoursesByVector(results, courseId,
                    source.getCategoryEntity() == null ? null : source.getCategoryEntity().getId(), page, size);
            return related.getContent().isEmpty() ? fallbackRelatedCourses(source, page, size) : related;
        } catch (Exception exception) {
            return fallbackRelatedCourses(source, page, size);
        }
    }

    /** Lấy khóa học khác danh mục có giáo viên liên quan khi semantic index chưa có dữ liệu. */
    private PageResponse<PublicCourseCardResponse> fallbackRelatedCourses(CourseEntity source, int page, int size) {
        if (source.getCategoryEntity() == null || source.getCategoryEntity().getId() == null) {
            return PageResponse.<PublicCourseCardResponse>builder().content(List.of()).pageNumber(page)
                    .pageSize(size).totalElements(0).totalPages(0).first(page == 0).last(true).build();
        }
        return PageResponse.from(courseRepository.findRelatedPublicCourses(
                source.getCategoryEntity().getId(), pageable(page, size, Sort.unsorted())).map(this::toCourseCard));
    }

    /** Lấy category ACTIVE có khóa học công khai gần nghĩa với khóa học nguồn. */
    @Override
    public List<PublicCategoryResponse> getRelatedCategoriesByCourse(Long courseId, int limit) {
        CourseEntity source = requirePublicCourse(courseId);
        Map<Long, PublicCategoryResponse> counts = new HashMap<>();
        getCategoryCourseCounts().forEach(item -> counts.put(item.getId(), item));
        try {
            List<AiCatalogSearchResponse> results = aiServiceClient.searchCatalog(AiCatalogSearchRequest.builder()
                    .query(courseText(source)).entityType("category").limit(Math.min(limit + 20, 200))
                    .filters(Map.of("excludeCategoryId", source.getCategoryEntity().getId())).build());
            return results.stream().map(item -> parseId(item.getId())).filter(Objects::nonNull)
                    .filter(id -> !id.equals(source.getCategoryEntity().getId())).map(counts::get)
                    .filter(Objects::nonNull).filter(item -> item.getPublicCourseCount() > 0).limit(limit).toList();
        } catch (Exception exception) {
            return categoryRepository.findOtherActiveCategories(source.getCategoryEntity().getId(), BaseStatusEnum.ACTIVE,
                            PageRequest.of(0, Math.min(limit, 20))).stream().map(CategoryEntity::getId)
                    .map(counts::get).filter(Objects::nonNull).filter(item -> item.getPublicCourseCount() > 0).toList();
        }
    }

    /** Dùng AI catalog vector để chọn khóa học thật theo category, level và mục tiêu guided. */
    @Override
    public PageResponse<PublicCourseCardResponse> recommendCourses(Long categoryId, CourseLevelEnum level,
                                                                     String goal, int limit) {
        CategoryEntity category = requireActiveCategory(categoryId);
        int boundedLimit = Math.min(Math.max(limit, 1), 12);
        String query = "Lĩnh vực: %s\nTrình độ: %s\nMục tiêu: %s".formatted(
                value(category.getName()), level, value(goal));
        try {
            List<AiCatalogSearchResponse> results = aiServiceClient.searchCatalog(AiCatalogSearchRequest.builder()
                    .query(query).entityType("course").limit(100).filters(Map.of()).build());
            List<Long> ids = results.stream().map(item -> parseId(item.getId())).filter(Objects::nonNull).toList();
            Map<Long, Integer> order = new HashMap<>();
            ids.forEach(id -> order.putIfAbsent(id, order.size()));
            List<PublicCourseCardResponse> courses = courseRepository.findPublicCoursesByIds(ids).stream()
                    .filter(item -> item.getCategoryEntity() != null && categoryId.equals(item.getCategoryEntity().getId()))
                    .filter(item -> level == null || level == item.getLevel())
                    .sorted((left, right) -> Integer.compare(order.getOrDefault(left.getId(), Integer.MAX_VALUE),
                            order.getOrDefault(right.getId(), Integer.MAX_VALUE)))
                    .limit(boundedLimit).map(this::toCourseCard).toList();
            if (!courses.isEmpty()) return coursePage(courses, boundedLimit);
            return fallbackRecommendations(categoryId, level, boundedLimit);
        } catch (Exception exception) {
            return fallbackRecommendations(categoryId, level, boundedLimit);
        }
    }

    /** Fallback dữ liệu thật theo category/level khi AI vector chưa được index hoặc chưa có điểm phù hợp. */
    private PageResponse<PublicCourseCardResponse> fallbackRecommendations(Long categoryId, CourseLevelEnum level,
                                                                            int limit) {
        return PageResponse.from(courseRepository.findPublicCoursesByCategory(categoryId, level,
                pageable(0, limit, Sort.unsorted())).map(this::toCourseCard));
    }

    /** Đóng gói danh sách semantic recommendation theo response phân trang chung. */
    private PageResponse<PublicCourseCardResponse> coursePage(List<PublicCourseCardResponse> courses, int size) {
        return PageResponse.<PublicCourseCardResponse>builder().content(courses).pageNumber(0).pageSize(size)
                .totalElements(courses.size()).totalPages(courses.isEmpty() ? 0 : 1).first(true).last(true).build();
    }

    /** Lọc kết quả vector theo khóa học public thật và giữ nguyên thứ tự similarity. */
    private PageResponse<PublicCourseCardResponse> pageCoursesByVector(List<AiCatalogSearchResponse> results,
                                                                         Long excludedCourseId, Long excludedCategoryId,
                                                                         int page, int size) {
        List<Long> ids = results.stream().map(item -> parseId(item.getId())).filter(Objects::nonNull)
                .filter(id -> !id.equals(excludedCourseId)).toList();
        Map<Long, Integer> order = new HashMap<>();
        ids.forEach(id -> order.put(id, order.size()));
        List<CourseEntity> courses = courseRepository.findPublicCoursesByIds(ids).stream()
                .filter(course -> excludedCategoryId == null || course.getCategoryEntity() == null
                        || !excludedCategoryId.equals(course.getCategoryEntity().getId()))
                .sorted((left, right) -> Integer.compare(order.getOrDefault(left.getId(), Integer.MAX_VALUE),
                        order.getOrDefault(right.getId(), Integer.MAX_VALUE))).toList();
        int from = Math.min(page(page, size) * size, courses.size());
        int to = Math.min(from + size, courses.size());
        List<PublicCourseCardResponse> content = courses.subList(from, to).stream().map(this::toCourseCard).toList();
        return PageResponse.<PublicCourseCardResponse>builder().content(content).pageNumber(page(page, size))
                .pageSize(size).totalElements(courses.size()).totalPages((int) Math.ceil((double) courses.size() / size))
                .first(from == 0).last(to >= courses.size()).build();
    }

    /** Chuyển employee thành hồ sơ công khai và nạp thống kê theo batch cho một giáo viên. */
    private PublicTeacherResponse toTeacher(EmployeeEntity teacher) {
        return toTeachers(List.of(teacher)).get(0);
    }

    /** Dựng nhiều hồ sơ giáo viên bằng các projection batch, tránh N+1 query ở landing page. */
    private List<PublicTeacherResponse> toTeachers(List<EmployeeEntity> teachers) {
        if (teachers.isEmpty()) return List.of();
        List<Long> ids = teachers.stream().map(EmployeeEntity::getUserId).toList();
        Map<Long, Long> courseCounts = new HashMap<>();
        Map<Long, Long> studentCounts = new HashMap<>();
        Map<Long, Double> ratings = new HashMap<>();
        courseTeacherRepository.findPublicTeacherStats(ids).forEach(row -> {
            courseCounts.put((Long) row[0], ((Number) row[1]).longValue());
            studentCounts.put((Long) row[0], ((Number) row[2]).longValue());
            double rawRating = ((Number) row[3]).doubleValue();
            ratings.put((Long) row[0], Math.round(rawRating * 10.0) / 10.0);
        });
        Map<Long, List<PublicCategoryResponse>> categories = new HashMap<>();
        teacherCategoryRepository.findPublicTeacherCategories(ids, BaseStatusEnum.ACTIVE).forEach(row ->
                categories.computeIfAbsent((Long) row[0], ignored -> new ArrayList<>()).add(
                        PublicCategoryResponse.builder().id((Long) row[1]).name((String) row[2])
                                .slug(slug((String) row[2])).description((String) row[3]).iconUrl(null)
                                .publicCourseCount(0).popularityScore(0).build()));
        return teachers.stream().map(teacher -> {
            Long id = teacher.getUserId();
            return PublicTeacherResponse.builder().id(id).fullName(teacher.getUserEntity().getFullName())
                    .avatarUrl(toPublicAvatarUrl(teacher)).title(teacher.getPosition())
                    .bio(teacher.getBio()).experienceYears(experienceYears(teacher)).categories(categories.getOrDefault(id, List.of()))
                    .courseCount(courseCounts.getOrDefault(id, 0L)).studentCount(studentCounts.getOrDefault(id, 0L))
                    .averageRating(ratings.getOrDefault(id, 0D)).build();
        }).toList();
    }

    /** Chuyển khóa học và các gói đang bán thành response card mà không lazy-load lặp từng bản ghi. */
    private PublicCourseCardResponse toCourseCard(CourseEntity course) {
        List<CoursePackageEntity> packages = coursePackageRepository.findByCourseEntity_IdAndStatus(
                course.getId(), CoursePackageStatusEnum.ACTIVE).stream()
                .filter(item -> item.getDeliveryMode() != null).toList();
        BigDecimal current = packages.stream().map(CoursePackageEntity::getPrice).filter(Objects::nonNull).min(BigDecimal::compareTo).orElse(null);
        BigDecimal original = packages.stream().map(CoursePackageEntity::getOriginalPrice).filter(Objects::nonNull).min(BigDecimal::compareTo).orElse(null);
        String teacher = courseTeacherRepository.findPublicTeacherNames(List.of(course.getId())).stream()
                .map(row -> (String) row[1]).filter(Objects::nonNull).findFirst().orElse(null);
        return PublicCourseCardResponse.builder().id(course.getId()).name(course.getName()).slug(course.getLink())
                .thumbnailUrl(course.getThumbnailUrl()).description(course.getDescription()).level(course.getLevel() == null ? null : course.getLevel().name())
                .currentPrice(current).originalPrice(original).teacherName(teacher).averageRating(course.getAvgRating())
                .reviewCount(course.getReviewCount()).studentCount(course.getEnrollmentCount())
                .categoryName(course.getCategoryEntity() == null ? null : course.getCategoryEntity().getName())
                .deliveryModes(packages.stream().map(CoursePackageEntity::getDeliveryMode)
                        .map(DeliveryModeEnum::name).distinct().toList()).build();
    }

    /** Tạo category response với thống kê đã có trong GROUP BY. */
    private PublicCategoryResponse toCategory(Object[] row) {
        long courses = ((Number) row[3]).longValue();
        long students = ((Number) row[4]).longValue();
        return PublicCategoryResponse.builder().id((Long) row[0]).name((String) row[1]).slug(slug((String) row[1]))
                .description((String) row[2]).iconUrl(null).publicCourseCount(courses)
                .popularityScore(courses * 100 + students).build();
    }

    /** Tạo category response không tự phát sinh số liệu khi dùng trong hồ sơ giáo viên. */
    private PublicCategoryResponse toCategoryWithoutCount(CategoryEntity category) {
        return PublicCategoryResponse.builder().id(category.getId()).name(category.getName()).slug(slug(category.getName()))
                .description(category.getDescription()).iconUrl(null).publicCourseCount(0).popularityScore(0).build();
    }

    /** Kiểm tra giáo viên có tài khoản và phân công chuyên môn đang hoạt động. */
    private boolean isPublicTeacher(EmployeeEntity teacher) {
        return (teacher.getStatus() == EmployeeStatusEnum.ACTIVE || teacher.getStatus() == EmployeeStatusEnum.PROBATION)
                && teacher.getUserEntity() != null && teacher.getUserEntity().getStatus() == UserStatusEnum.ACTIVE
                && !teacherCategoryRepository.findByEmployee_UserIdAndStatus(teacher.getUserId(), BaseStatusEnum.ACTIVE).isEmpty();
    }

    /** Bắt buộc category tồn tại và đang công khai. */
    private CategoryEntity requireActiveCategory(Long categoryId) {
        return categoryRepository.findById(categoryId).filter(item -> item.getStatus() == BaseStatusEnum.ACTIVE)
                .orElseThrow(() -> ResourceNotFoundException.of("Category", categoryId));
    }

    /** Bắt buộc khóa học tồn tại, ACTIVE và có ít nhất một package ACTIVE. */
    private CourseEntity requirePublicCourse(Long courseId) {
        return courseRepository.findById(courseId).filter(course -> course.getStatus() == CourseStatusEnum.ACTIVE)
                .filter(course -> !coursePackageRepository.findByCourseEntity_IdAndStatus(
                        courseId, CoursePackageStatusEnum.ACTIVE).isEmpty())
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseId));
    }

    /** Tạo cùng một hồ sơ văn bản với hồ sơ đã embedding trong Backend. */
    private String categoryText(CategoryEntity category) {
        return "Danh mục: %s\nMô tả: %s".formatted(category.getName() == null ? "" : category.getName(),
                category.getDescription() == null ? "" : category.getDescription());
    }

    /** Tạo hồ sơ văn bản cùng format với dữ liệu đã index trong local catalog vector. */
    private String courseText(CourseEntity course) {
        String category = course.getCategoryEntity() == null ? "" : course.getCategoryEntity().getName();
        return "Khóa học: %s\nDanh mục: %s\nMô tả: %s\nMục tiêu: %s\nĐiều kiện đầu vào: %s\nTrình độ: %s"
                .formatted(value(course.getName()), value(category), value(course.getDescription()),
                        value(course.getLearningObjectives()), value(course.getPrerequisites()), course.getLevel());
    }

    /** Chuẩn hóa nội dung null trước khi đưa vào truy vấn embedding. */
    private String value(String value) {
        return value == null ? "" : value.trim();
    }

    /** Parse ID vector và bỏ qua metadata hỏng từ vector store. */
    private Long parseId(String id) {
        try {
            return Long.valueOf(id);
        } catch (RuntimeException exception) {
            return null;
        }
    }

    /** Giới hạn trang và kích thước để public endpoint không bị truy vấn quá lớn. */
    private Pageable pageable(int page, int size, Sort sort) {
        return PageRequest.of(page(page, size), size(size), sort);
    }

    /** Chuẩn hóa số trang hợp lệ theo giới hạn của API public. */
    private int page(int page, int size) {
        return Math.max(page, 0);
    }

    /** Chuẩn hóa kích thước trang trong khoảng 1..50. */
    private int size(int size) {
        return Math.min(Math.max(size, 1), 50);
    }

    /** Chuẩn hóa keyword rỗng thành null để JPQL xử lý đúng. */
    private String clean(String keyword) {
        return keyword == null || keyword.isBlank() ? null : keyword.trim();
    }

    /** Tính số năm kinh nghiệm tròn từ ngày tạo tài khoản giáo viên đến hiện tại. */
    private Integer experienceYears(EmployeeEntity teacher) {
        if (teacher == null || teacher.getUserEntity() == null || teacher.getUserEntity().getCreatedAt() == null) {
            return null;
        }
        java.time.LocalDate createdDate = teacher.getUserEntity().getCreatedAt().toLocalDate();
        java.time.LocalDate today = java.time.LocalDate.now();
        return createdDate.isAfter(today) ? 0 : java.time.Period.between(createdDate, today).getYears();
    }

    /** Chuẩn hóa file key avatar thành endpoint ảnh public thay vì trả raw key MinIO cho frontend. */
    private String toPublicAvatarUrl(EmployeeEntity teacher) {
        String avatar = teacher.getUserEntity().getAvatarUrl();
        if (avatar == null || avatar.isBlank()) return null;
        String value = avatar.trim();
        if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return value;
        return apiPrefix + "/users/" + teacher.getUserId() + "/avatar";
    }

    /** Tạo slug hiển thị ổn định từ tên khi schema hiện chưa lưu trường slug. */
    private String slug(String value) {
        if (value == null) return null;
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
        return NON_ALNUM.matcher(normalized).replaceAll("-").replaceAll("^-|-$", "");
    }
}
