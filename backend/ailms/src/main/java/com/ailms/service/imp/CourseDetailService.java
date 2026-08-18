package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.*;
import com.ailms.response.*;
import com.ailms.service.ICourseAuthoringService;
import com.ailms.service.ICourseDetailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

/** Service tổng hợp course detail từ dữ liệu thật và tính quyền theo enrollment package. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseDetailService implements ICourseDetailService {

    private final CourseRepository courseRepository;
    private final CoursePackageRepository coursePackageRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentPackageRepository enrollmentPackageRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ClassScheduleRepository classScheduleRepository;
    private final ICourseAuthoringService courseAuthoringService;

    /** Tổng hợp khóa học, người biên soạn, chương trình, gói bán và trạng thái sở hữu. */
    @Override
    public CourseDetailResponse getDetail(Long courseId, Long currentUserId) {
        CourseEntity course = getPublicCourse(courseId);
        List<EnrollmentPackageEntity> owned = currentUserId == null
                ? List.of()
                : enrollmentPackageRepository.findActiveOwnedByUserAndCourse(
                        currentUserId, courseId, LocalDateTime.now());
        Set<Long> ownedPackageIds = owned.stream()
                .map(item -> item.getCoursePackageEntity().getId())
                .collect(java.util.stream.Collectors.toSet());
        boolean hasIncludedSelfStudyAccess = !owned.isEmpty();

        List<CoursePackageEntity> activePackages = coursePackageRepository
                .findByCourseEntity_IdAndStatus(courseId, CoursePackageStatusEnum.ACTIVE);
        List<CourseDetailResponse.PackageItem> packages = activePackages.stream()
                .map(pkg -> mapPackage(pkg, ownedPackageIds.contains(pkg.getId()), hasIncludedSelfStudyAccess))
                .toList();
        List<Long> purchasableIds = packages.stream()
                .filter(item -> Boolean.TRUE.equals(item.getPurchasable()))
                .map(CourseDetailResponse.PackageItem::getId)
                .toList();

        EnrollmentEntity enrollment = currentUserId == null ? null
                : enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(currentUserId, courseId).orElse(null);
        boolean hasAccess = currentUserId != null && enrollmentPackageRepository.existsActiveCourseAccess(
                currentUserId, courseId, LocalDateTime.now());

        return CourseDetailResponse.builder()
                .id(course.getId())
                .code(course.getCode())
                .name(course.getName())
                .link(course.getLink())
                .description(course.getDescription())
                .thumbnailUrl(course.getThumbnailUrl())
                .learningObjectives(course.getLearningObjectives())
                .prerequisites(course.getPrerequisites())
                .level(course.getLevel() != null ? course.getLevel().name() : null)
                .status(course.getStatus())
                .category(mapCategory(course))
                .creator(mapCreator(course.getCreatedBy()))
                .curriculum(buildSecuredCurriculum(courseId, currentUserId, hasAccess, enrollment))
                .packages(packages)
                .enrollment(CourseDetailResponse.EnrollmentAccess.builder()
                        .enrollmentId(enrollment != null ? enrollment.getId() : null)
                        .authenticated(currentUserId != null)
                        .hasCourseAccess(hasAccess)
                        .ownedPackageIds(new ArrayList<>(ownedPackageIds))
                        .purchasablePackageIds(purchasableIds)
                        .build())
                .build();
    }

    /** Trả curriculum công khai và chỉ mở nội dung preview khi chưa sở hữu khóa học. */
    @Override
    public CourseCurriculumResponse getCurriculum(Long courseId, Long currentUserId) {
        getPublicCourse(courseId);
        EnrollmentEntity enrollment = currentUserId == null ? null
                : enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(currentUserId, courseId).orElse(null);
        boolean hasAccess = currentUserId != null && enrollmentPackageRepository.existsActiveCourseAccess(
                currentUserId, courseId, LocalDateTime.now());
        return buildSecuredCurriculum(courseId, currentUserId, hasAccess, enrollment);
    }

    /** Trả chi tiết lớp của gói GROUP_CLASS đang hoạt động. */
    @Override
    public CourseClassDetailResponse getGroupClassDetail(Long packageId) {
        CoursePackageEntity pkg = coursePackageRepository.findById(packageId)
                .orElseThrow(() -> ResourceNotFoundException.of("CoursePackage", packageId));
        if (pkg.getStatus() != CoursePackageStatusEnum.ACTIVE
                || pkg.getCourseEntity() == null
                || !courseRepository.isPubliclySellable(pkg.getCourseEntity().getId())
                || !requiresGroupClass(pkg)
                || pkg.getClassEntity() == null) {
            throw ResourceNotFoundException.of("GroupClassPackage", packageId);
        }
        return mapClassDetail(pkg.getClassEntity());
    }

    /** Lấy khóa học đã xuất bản và có gói tự học hợp lệ để không lộ khóa chưa bán. */
    private CourseEntity getPublicCourse(Long courseId) {
        if (!courseRepository.isPubliclySellable(courseId)) {
            throw ResourceNotFoundException.of("Course", courseId);
        }
        return courseRepository.findById(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", courseId));
    }

    /** Gắn quyền bài học và loại bỏ URL/tài nguyên khỏi response trang giới thiệu. */
    private CourseCurriculumResponse buildSecuredCurriculum(
            Long courseId, Long currentUserId, boolean hasAccess, EnrollmentEntity enrollment) {
        CourseCurriculumResponse curriculum = courseAuthoringService.getLearningCurriculum(courseId);
        curriculum.setEnrollmentId(hasAccess && enrollment != null ? enrollment.getId() : null);
        if (curriculum.getSections() != null) {
            curriculum.getSections().forEach(section -> {
                if (section.getLessons() == null) return;
                section.getLessons().forEach(lesson -> {
                    boolean preview = PreviewTypeEnum.FREE.name().equals(lesson.getPreviewType());
                    boolean accessible = hasAccess || preview;
                    lesson.setTitle(lesson.getName());
                    lesson.setDuration(lesson.getDurationMin());
                    lesson.setPreview(preview);
                    lesson.setAccessible(accessible);
                    lesson.setLocked(!accessible);
                    lesson.setContentUrl(null);
                    lesson.setResources(null);
                    lesson.setLinkedQuiz(null);
                    lesson.setLinkedAssignment(null);
                });
            });
        }
        curriculum.setFinalExamQuizzes(List.of());
        curriculum.setFinalExamAssignments(List.of());
        return curriculum;
    }

    /** Chuyển danh mục sang DTO nhỏ gọn. */
    private CourseDetailResponse.Category mapCategory(CourseEntity course) {
        CategoryEntity category = course.getCategoryEntity();
        return category == null ? null : CourseDetailResponse.Category.builder()
                .id(category.getId())
                .name(category.getName())
                .build();
    }

    /** Lấy đúng người tạo khóa học; không thay bằng giáo viên lớp nhóm. */
    private CourseDetailResponse.Creator mapCreator(Long creatorId) {
        if (creatorId == null) return null;
        UserEntity creator = userRepository.findById(creatorId).orElse(null);
        if (creator == null) return null;
        EmployeeEntity employee = employeeRepository.findById(creatorId).orElse(null);
        String code = employee != null && employee.getEmployeeCode() != null ? employee.getEmployeeCode() : creator.getUsername();
        return CourseDetailResponse.Creator.builder()
                .id(creator.getId())
                .code(code)
                .fullName(creator.getFullName())
                .avatarUrl(creator.getAvatarUrl())
                .title(employee != null ? employee.getPosition() : null)
                .bio(employee != null ? employee.getBio() : null)
                .build();
    }

    /** Chuyển gói bán và tính lý do không thể mua ở thời điểm hiện tại. */
    private CourseDetailResponse.PackageItem mapPackage(
            CoursePackageEntity pkg, boolean owned, boolean hasIncludedSelfStudyAccess) {
        boolean groupClassRequired = requiresGroupClass(pkg);
        CourseClassDetailResponse classDetail = groupClassRequired && pkg.getClassEntity() != null
                ? mapClassDetail(pkg.getClassEntity()) : null;
        boolean selfStudyIncluded = pkg.getDeliveryMode() == DeliveryModeEnum.SELF_STUDY
                && hasIncludedSelfStudyAccess;
        String unavailableReason = owned ? "Bạn đang sở hữu gói học này."
                : selfStudyIncluded
                ? "Bạn đã có quyền tự học từ gói group/1-1 đang sở hữu."
                : pkg.getDeliveryMode() == DeliveryModeEnum.ONE_ON_ONE
                        && (pkg.getIncludedTutorSessions() == null || pkg.getIncludedTutorSessions() <= 0)
                ? "Gói học 1-1 chưa được cấu hình số buổi kèm riêng."
                : groupClassRequired && pkg.getClassEntity() == null
                ? "Gói học chưa được gắn với lớp học."
                : classDetail != null && !Boolean.TRUE.equals(classDetail.getPurchasable())
                ? classDetail.getUnavailableReason() : null;
        return CourseDetailResponse.PackageItem.builder()
                .id(pkg.getId())
                .code(pkg.getCode())
                .name(pkg.getName())
                .description(pkg.getDescription())
                .deliveryMode(pkg.getDeliveryMode())
                .price(pkg.getPrice())
                .originalPrice(pkg.getOriginalPrice())
                .durationDays(pkg.getDurationDays())
                .includedTutorSessions(pkg.getIncludedTutorSessions())
                .maxGroupSize(pkg.getMaxGroupSize())
                .classDetail(classDetail)
                .owned(owned || selfStudyIncluded)
                .purchasable(!owned && !selfStudyIncluded && unavailableReason == null
                        && (!groupClassRequired || Boolean.TRUE.equals(classDetail.getPurchasable())))
                .unavailableReason(unavailableReason)
                .build();
    }

    /** Xác định gói lớp nhóm bắt buộc phải gắn lớp và kiểm tra lịch. */
    private boolean requiresGroupClass(CoursePackageEntity pkg) {
        return pkg.getDeliveryMode() == DeliveryModeEnum.GROUP_CLASS;
    }

    /** Tổng hợp giáo viên, trợ giảng, lịch và sức chứa thực tế của lớp nhóm. */
    private CourseClassDetailResponse mapClassDetail(ClassEntity clazz) {
        List<ClassMemberEntity> staff = classMemberRepository.findById_ClassIdAndRoleInClassInAndStatus(
                clazz.getId(), List.of(ClassMemberRole.TEACHER, ClassMemberRole.TA), ClassMemberStatusEnum.ACTIVE);
        CourseClassDetailResponse.Person teacher = staff.stream()
                .filter(item -> item.getRoleInClass() == ClassMemberRole.TEACHER)
                .map(this::mapPerson)
                .findFirst().orElse(null);
        List<CourseClassDetailResponse.Person> assistants = staff.stream()
                .filter(item -> item.getRoleInClass() == ClassMemberRole.TA)
                .map(this::mapPerson).toList();
        int currentStudents = (int) classMemberRepository.countById_ClassIdAndStatusAndRoleInClass(
                clazz.getId(), ClassMemberStatusEnum.ACTIVE, ClassMemberRole.STUDENT);
        int capacity = clazz.getMaxMembers() != null ? clazz.getMaxMembers() : 0;
        int remaining = Math.max(0, capacity - currentStudents);
        String reason = getGroupClassUnavailableReason(clazz, currentStudents);
        List<ClassScheduleResponse> schedules = classScheduleRepository.findByClassEntity_Id(clazz.getId()).stream()
                .filter(item -> item.getStatus() == BaseStatusEnum.ACTIVE)
                .map(item -> ClassScheduleResponse.builder()
                        .id(item.getId())
                        .classId(clazz.getId())
                        .dayOfWeek(item.getDayOfWeek())
                        .startTime(item.getStartTime())
                        .endTime(item.getEndTime())
                        .status(item.getStatus().name())
                        .build())
                .toList();
        return CourseClassDetailResponse.builder()
                .id(clazz.getId())
                .code(clazz.getCode())
                .name(clazz.getName())
                .description(clazz.getDescription())
                .courseId(clazz.getCourseEntity() != null ? clazz.getCourseEntity().getId() : null)
                .courseName(clazz.getCourseEntity() != null ? clazz.getCourseEntity().getName() : null)
                .timeZone(ZoneId.systemDefault().getId())
                .deliveryMode(DeliveryModeEnum.GROUP_CLASS)
                .teacher(teacher)
                .teachingAssistants(assistants)
                .startDate(clazz.getStartDate())
                .endDate(clazz.getEndDate())
                .schedules(schedules)
                .currentStudents(currentStudents)
                .maxMembers(capacity)
                .remainingSlots(remaining)
                .status(clazz.getStatus())
                .registrationOpen(clazz.getRegistrationOpen())
                .allowLateEnrollment(clazz.getAllowLateEnrollment())
                .purchasable(reason == null)
                .unavailableReason(reason)
                .build();
    }

    /** Chuyển thành viên lớp thành thông tin công khai tối thiểu. */
    private CourseClassDetailResponse.Person mapPerson(ClassMemberEntity member) {
        UserEntity user = member.getUserEntity();
        return CourseClassDetailResponse.Person.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }

    /** Kiểm tra trạng thái nhận học viên của lớp nhóm. */
    private String getGroupClassUnavailableReason(ClassEntity clazz, int currentStudents) {
        if (clazz.getStatus() != BaseStatusEnum.ACTIVE) return "Lớp học hiện không hoạt động.";
        if (!Boolean.TRUE.equals(clazz.getRegistrationOpen())) return "Lớp học đã ngừng nhận học viên.";
        if (clazz.getEndDate() != null && LocalDateTime.now().isAfter(clazz.getEndDate())) {
            return "Lớp học đã kết thúc.";
        }
        if (clazz.getMaxMembers() == null || clazz.getMaxMembers() <= currentStudents) return "Lớp học đã đủ chỗ.";
        if (clazz.getStartDate() != null && LocalDateTime.now().isAfter(clazz.getStartDate())
                && !Boolean.TRUE.equals(clazz.getAllowLateEnrollment())) {
            return "Lớp đã bắt đầu và không nhận đăng ký muộn.";
        }
        return null;
    }
}
