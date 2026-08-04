package com.ailms.service.imp;

import com.ailms.entity.CourseEntity;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.CourseRepository;
import com.ailms.response.ChildRecordDetailResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.TrashItemResponse;
import com.ailms.service.IAuditLogService;
import com.ailms.service.ITrashable;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Consumer;

@Service("courseTrashService")
@RequiredArgsConstructor
@Slf4j
public class CourseTrashService implements ITrashable {

    private final CourseRepository courseRepository;
    private final EntityManager entityManager;
    private final IAuditLogService auditLogService;
    private final TrashItemTransactionExecutor transactionExecutor;

    @Override
    public String getEntityType() {
        return "COURSE";
    }

    @Transactional(readOnly = true)
    @Override
    public PageResponse<TrashItemResponse> getTrashItems(String keyword, Pageable pageable) {
        log.info("Fetching trash courses with keyword: {}", keyword);
        List<CourseEntity> trashCourses = courseRepository.findAll().stream()
                .filter(c -> c.getStatus() == CourseStatusEnum.DELETED)
                .toList();

        if (keyword != null && !keyword.trim().isEmpty()) {
            String kw = keyword.trim().toLowerCase();
            trashCourses = trashCourses.stream().filter(c ->
                    (c.getName() != null && c.getName().toLowerCase().contains(kw)) ||
                    (c.getLink() != null && c.getLink().toLowerCase().contains(kw)) ||
                    (c.getDescription() != null && c.getDescription().toLowerCase().contains(kw)) ||
                    String.valueOf(c.getId()).contains(kw)
            ).toList();
        }

        List<TrashItemResponse> items = trashCourses.stream().map(this::mapToTrashResponse).toList();
        return toPageResponse(items, pageable);
    }

    private <T> PageResponse<T> toPageResponse(List<T> items, Pageable pageable) {
        if (pageable.isUnpaged()) {
            return PageResponse.from(new PageImpl<>(items));
        }
        int total = items.size();
        int start = (int) pageable.getOffset();
        if (start >= total) {
            return PageResponse.from(new PageImpl<>(Collections.emptyList(), pageable, total));
        }
        int end = Math.min(start + pageable.getPageSize(), total);
        return PageResponse.from(new PageImpl<>(items.subList(start, end), pageable, total));
    }

    @Transactional(readOnly = true)
    @Override
    public TrashItemResponse getTrashItemDetail(Long id) {
        CourseEntity course = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", id));
        return mapToTrashResponse(course);
    }

    @Override
    public Map<String, Long> checkChildRecords(Long id) {
        Map<String, Long> childCounts = new HashMap<>();

        checkAndAddCount(childCounts, "course_section", "SELECT COUNT(*) FROM course_section WHERE course_id = :id", id);
        checkAndAddCount(childCounts, "enrollment", "SELECT COUNT(*) FROM enrollment WHERE course_id = :id", id);
        checkAndAddCount(childCounts, "class", "SELECT COUNT(*) FROM class WHERE course_id = :id", id);
        checkAndAddCount(childCounts, "review", "SELECT COUNT(*) FROM review WHERE course_id = :id", id);
        checkAndAddCount(childCounts, "quiz", "SELECT COUNT(*) FROM quiz WHERE course_id = :id", id);
        checkAndAddCount(childCounts, "assignment", "SELECT COUNT(*) FROM assignment WHERE course_id = :id", id);
        checkAndAddCount(childCounts, "course_package", "SELECT COUNT(*) FROM course_package WHERE course_id = :id", id);

        return childCounts;
    }

    private void checkAndAddCount(Map<String, Long> map, String key, String sql, Long id) {
        try {
            Query query = entityManager.createNativeQuery(sql);
            query.setParameter("id", id);
            Number count = (Number) query.getSingleResult();
            if (count != null && count.longValue() > 0) {
                map.put(key, count.longValue());
            }
        } catch (Exception e) {
            log.warn("Could not check child records count for table {}: {}", key, e.getMessage());
        }
    }

    @Override
    public List<ChildRecordDetailResponse> getChildRecordDetails(Long id) {
        List<ChildRecordDetailResponse> list = new ArrayList<>();

        fetchTableChildDetails(list, "course_section", "Chương bài giảng (Sections)",
                "SELECT id, name FROM course_section WHERE course_id = :id LIMIT 20", id);
        fetchTableChildDetails(list, "enrollment", "Ghi danh học viên (Enrollments)",
                "SELECT id, user_id, status FROM enrollment WHERE course_id = :id LIMIT 20", id);
        fetchTableChildDetails(list, "class", "Lớp học liên kết (Classes)",
                "SELECT id, name FROM class WHERE course_id = :id LIMIT 20", id);
        fetchTableChildDetails(list, "review", "Đánh giá học viên (Reviews)",
                "SELECT id, rating, comment FROM review WHERE course_id = :id LIMIT 20", id);

        return list;
    }

    private void fetchTableChildDetails(List<ChildRecordDetailResponse> list, String tableName, String displayName, String sql, Long id) {
        try {
            Query query = entityManager.createNativeQuery(sql);
            query.setParameter("id", id);
            @SuppressWarnings("unchecked")
            List<Object[]> rows = query.getResultList();
            if (rows != null && !rows.isEmpty()) {
                List<Map<String, Object>> items = new ArrayList<>();
                for (Object[] arr : rows) {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("ID", arr[0] != null ? arr[0].toString() : "N/A");
                    if (arr.length > 1 && arr[1] != null) {
                        map.put("Chi tiết", arr[1].toString());
                    }
                    items.add(map);
                }

                list.add(ChildRecordDetailResponse.builder()
                        .tableName(tableName)
                        .displayName(displayName)
                        .count((long) items.size())
                        .items(items)
                        .build());
            }
        } catch (Exception e) {
            log.warn("Could not query child details for table {}: {}", tableName, e.getMessage());
        }
    }

    @Transactional
    @Override
    public void hardDelete(Long id) {
        log.info("Executing hard delete for course ID: {}", id);
        CourseEntity course = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", id));

        String oldValInfo = String.format("Course: %s (ID: %d)", course.getName(), course.getId());

        // Clean up child tables cascading
        executeNativeUpdate("DELETE FROM review WHERE course_id = :id", id);
        executeNativeUpdate("DELETE FROM search_history WHERE course_id = :id", id);
        executeNativeUpdate("DELETE FROM course_teacher WHERE course_id = :id", id);
        executeNativeUpdate("DELETE FROM course_package WHERE course_id = :id", id);
        executeNativeUpdate("DELETE FROM course_member WHERE course_id = :id", id);
        executeNativeUpdate("UPDATE coupon SET applicable_course_id = NULL WHERE applicable_course_id = :id", id);
        executeNativeUpdate("DELETE FROM order_item WHERE course_id = :id", id);
        executeNativeUpdate("DELETE FROM enrollment_package WHERE enrollment_id IN (SELECT id FROM enrollment WHERE course_id = :id)", id);
        executeNativeUpdate("DELETE FROM enrollment WHERE course_id = :id", id);
        executeNativeUpdate("UPDATE class SET course_id = NULL WHERE course_id = :id", id);
        executeNativeUpdate("DELETE FROM submission WHERE assignment_id IN (SELECT id FROM assignment WHERE course_id = :id)", id);
        executeNativeUpdate("DELETE FROM assignment WHERE course_id = :id", id);
        executeNativeUpdate("DELETE FROM quiz_answer WHERE attempt_id IN (SELECT id FROM quiz_attempt WHERE quiz_id IN (SELECT id FROM quiz WHERE course_id = :id))", id);
        executeNativeUpdate("DELETE FROM quiz_attempt WHERE quiz_id IN (SELECT id FROM quiz WHERE course_id = :id)", id);
        executeNativeUpdate("DELETE FROM quiz_question WHERE quiz_id IN (SELECT id FROM quiz WHERE course_id = :id)", id);
        executeNativeUpdate("DELETE FROM quiz WHERE course_id = :id", id);
        executeNativeUpdate("DELETE FROM lesson_material WHERE lesson_id IN (SELECT id FROM lesson WHERE section_id IN (SELECT id FROM course_section WHERE course_id = :id))", id);
        executeNativeUpdate("DELETE FROM lesson_progress WHERE lesson_id IN (SELECT id FROM lesson WHERE section_id IN (SELECT id FROM course_section WHERE course_id = :id))", id);
        executeNativeUpdate("DELETE FROM lesson WHERE section_id IN (SELECT id FROM course_section WHERE course_id = :id)", id);
        executeNativeUpdate("DELETE FROM course_section WHERE course_id = :id", id);

        executeNativeUpdate("DELETE FROM course WHERE id = :id", id);

        auditAfterCommit("HARD_DELETE", id, oldValInfo, null);
        log.info("Successfully hard deleted course ID: {}", id);
    }

    @Transactional
    @Override
    public void restore(Long id) {
        log.info("Restoring course ID: {}", id);
        CourseEntity course = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Course", id));

        if (course.getStatus() != CourseStatusEnum.DELETED) {
            throw new BusinessException("Chỉ được khôi phục khóa học đang nằm trong thùng rác.");
        }

        course.setStatus(CourseStatusEnum.INACTIVE);
        courseRepository.saveAndFlush(course);

        auditAfterCommit("RESTORE", id, "Status: DELETED", "Status: INACTIVE");
        log.info("Successfully restored course ID: {}", id);
    }

    @Override
    public Map<String, Object> bulkHardDelete(List<Long> ids) {
        return executeBulkAction(ids, id -> transactionExecutor.hardDelete(this, id));
    }

    @Override
    public Map<String, Object> bulkRestore(List<Long> ids) {
        return executeBulkAction(ids, id -> transactionExecutor.restore(this, id));
    }

    private Map<String, Object> executeBulkAction(List<Long> ids, Consumer<Long> action) {
        int success = 0;
        int failure = 0;
        List<String> errors = new ArrayList<>();

        for (Long id : ids) {
            try {
                action.accept(id);
                success++;
            } catch (Exception e) {
                failure++;
                errors.add("ID " + id + ": " + e.getMessage());
            }
        }

        return Map.of("successCount", success, "failureCount", failure, "errors", errors);
    }

    private void executeNativeUpdate(String sql, Long id) {
        try {
            Query query = entityManager.createNativeQuery(sql);
            query.setParameter("id", id);
            query.executeUpdate();
        } catch (Exception e) {
            log.warn("Native query execution warning for SQL [{}]: {}", sql, e.getMessage());
        }
    }

    private void auditAfterCommit(String action, Long entityId, String oldValue, String newValue) {
        Runnable writeAudit = () -> {
            try {
                auditLogService.log(action, "COURSE", entityId, oldValue, newValue);
            } catch (Exception exception) {
                log.error("Could not write {} audit for course ID {}", action, entityId, exception);
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    writeAudit.run();
                }
            });
        } else {
            writeAudit.run();
        }
    }

    private TrashItemResponse mapToTrashResponse(CourseEntity course) {
        LocalDateTime deletedAt = course.getUpdatedAt() != null ? course.getUpdatedAt() : LocalDateTime.now();
        long daysInTrash = ChronoUnit.DAYS.between(deletedAt, LocalDateTime.now());
        Map<String, Long> childRecordCounts = checkChildRecords(course.getId());

        return TrashItemResponse.builder()
                .entityType("COURSE")
                .id(String.valueOf(course.getId()))
                .code(course.getLink() != null ? course.getLink() : "CRS-" + course.getId())
                .name(course.getName())
                .deletedAt(deletedAt)
                .deletedBy("System Admin")
                .daysInTrash(daysInTrash < 0 ? 0L : daysInTrash)
                .hasChildRecords(!childRecordCounts.isEmpty())
                .childRecordCounts(childRecordCounts)
                .build();
    }
}
