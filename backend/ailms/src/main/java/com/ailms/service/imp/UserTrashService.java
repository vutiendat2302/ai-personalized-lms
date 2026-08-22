package com.ailms.service.imp;

import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.UserRepository;
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
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service("userTrashService")
@RequiredArgsConstructor
@Slf4j
public class UserTrashService implements ITrashable {

    private final UserRepository userRepository;
    private final EntityManager entityManager;
    private final IAuditLogService auditLogService;
    private final TrashItemTransactionExecutor transactionExecutor;

    @Override
    public String getEntityType() {
        return "USER";
    }

    @Transactional(readOnly = true)
    @Override
    public PageResponse<TrashItemResponse> getTrashItems(String keyword, Pageable pageable) {
        log.info("Fetching trash users with keyword: {}", keyword);
        List<UserEntity> trashUsers = userRepository.findByStatus(UserStatusEnum.DELETED);

        if (keyword != null && !keyword.trim().isEmpty()) {
            String kw = keyword.trim().toLowerCase();
            trashUsers = trashUsers.stream().filter(u ->
                    (u.getUsername() != null && u.getUsername().toLowerCase().contains(kw)) ||
                    (u.getEmail() != null && u.getEmail().toLowerCase().contains(kw)) ||
                    (u.getFullName() != null && u.getFullName().toLowerCase().contains(kw)) ||
                    String.valueOf(u.getId()).contains(kw)
            ).toList();
        }

        List<TrashItemResponse> items = trashUsers.stream().map(this::mapToTrashResponse).toList();

        if (pageable.isUnpaged()) {
            return PageResponse.from(new PageImpl<>(items));
        }

        int total = items.size();
        int start = (int) pageable.getOffset();
        if (start >= total) {
            return PageResponse.from(new PageImpl<>(Collections.emptyList(), pageable, total));
        }
        int end = Math.min(start + pageable.getPageSize(), total);
        List<TrashItemResponse> paged = items.subList(start, end);
        return PageResponse.from(new PageImpl<>(paged, pageable, total));
    }

    @Transactional(readOnly = true)
    @Override
    public TrashItemResponse getTrashItemDetail(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));
        return mapToTrashResponse(user);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    @Override
    public Map<String, Long> checkChildRecords(Long id) {
        Map<String, Long> childCounts = new HashMap<>();

        checkAndAddCount(childCounts, "employee_contract", "SELECT COUNT(*) FROM employee_contract WHERE employee_id = :id", id);
        checkAndAddCount(childCounts, "salary", "SELECT COUNT(*) FROM salary WHERE employee_id = :id", id);
        checkAndAddCount(childCounts, "quiz_attempt", "SELECT COUNT(*) FROM quiz_attempt WHERE user_id = :id", id);
        checkAndAddCount(childCounts, "enrollment", "SELECT COUNT(*) FROM enrollment WHERE user_id = :id", id);
        checkAndAddCount(childCounts, "leave_request", "SELECT COUNT(*) FROM leave_request WHERE employee_id = :id", id);

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
            log.warn("Error checking child records for table {}: {}", key, e.getMessage());
        }
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED, readOnly = true)
    @Override
    public List<ChildRecordDetailResponse> getChildRecordDetails(Long id) {
        List<ChildRecordDetailResponse> details = new ArrayList<>();

        fetchChildTableDetail(details, "employee_contract", "Hợp đồng lao động",
                "SELECT id, contract_type, base_salary, status, start_date FROM employee_contract WHERE employee_id = :id", id);

        fetchChildTableDetail(details, "salary", "Bảng lương & Thu nhập",
                "SELECT id, period, total_salary, status, paid_at FROM salary WHERE employee_id = :id", id);

        fetchChildTableDetail(details, "quiz_attempt", "Lịch sử làm bài Quiz",
                "SELECT id, quiz_id, score, status, started_at FROM quiz_attempt WHERE user_id = :id", id);

        fetchChildTableDetail(details, "enrollment", "Đăng ký khóa học",
                "SELECT id, course_id, status, enrolled_at FROM enrollment WHERE user_id = :id", id);

        fetchChildTableDetail(details, "leave_request", "Đơn xin nghỉ phép",
                "SELECT id, reason, status, start_date, end_date FROM leave_request WHERE employee_id = :id", id);

        return details;
    }

    private void fetchChildTableDetail(List<ChildRecordDetailResponse> list, String tableName, String displayName, String sql, Long id) {
        try {
            Query query = entityManager.createNativeQuery(sql);
            query.setParameter("id", id);
            List<?> resultList = query.getResultList();

            if (resultList != null && !resultList.isEmpty()) {
                List<Map<String, Object>> items = new ArrayList<>();
                for (Object rowObj : resultList) {
                    Map<String, Object> map = new LinkedHashMap<>();
                    if (rowObj instanceof Object[] row) {
                        map.put("ID", row[0] != null ? row[0].toString() : "N/A");
                        if (row.length > 1 && row[1] != null) map.put("Mã / Kỳ", row[1].toString());
                        if (row.length > 2 && row[2] != null) map.put("Chi tiết / Mức tiền", row[2].toString());
                        if (row.length > 3 && row[3] != null) map.put("Trạng thái", row[3].toString());
                        if (row.length > 4 && row[4] != null) map.put("Thời gian / Ngày hiệu lực", row[4].toString());
                    } else if (rowObj != null) {
                        map.put("ID", rowObj.toString());
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
        log.info("Executing hard delete for user ID: {}", id);
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));

        String oldValInfo = String.format("User: %s (%s)", user.getFullName(), user.getEmail());

        // Clean up child tables
        executeNativeUpdate("DELETE FROM teacher_availability WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM teacher_category WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM course_teacher WHERE user_id = :id", id);
        executeNativeUpdate("UPDATE class_online SET teacher_id = NULL WHERE teacher_id = :id", id);
        executeNativeUpdate("DELETE FROM teaching_session_payment WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM attendance WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM leave_request WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM employee_contract WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM salary_detail WHERE salary_id IN (SELECT id FROM salary WHERE employee_id = :id)", id);
        executeNativeUpdate("DELETE FROM salary WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM teaching_rate WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM employee WHERE user_id = :id", id);

        executeNativeUpdate("DELETE FROM guardian WHERE student_user_id = :id", id);
        executeNativeUpdate("DELETE FROM student_interest WHERE student_user_id = :id", id);
        executeNativeUpdate("DELETE FROM student_profile WHERE user_id = :id", id);

        executeNativeUpdate("DELETE FROM quiz_answer WHERE attempt_id IN (SELECT id FROM quiz_attempt WHERE user_id = :id)", id);
        executeNativeUpdate("DELETE FROM quiz_attempt WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM submission WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM lesson_progress WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM course_progress WHERE user_id = :id", id);
        // Orders and enrollment packages can still reference the user's enrollments.
        // Remove those references before deleting enrollment to satisfy the foreign keys.
        executeNativeUpdate("DELETE FROM payment_transaction WHERE order_id IN (SELECT id FROM `order` WHERE user_id = :id)", id);
        executeNativeUpdate("DELETE FROM order_item WHERE order_id IN (SELECT id FROM `order` WHERE user_id = :id)", id);
        executeNativeUpdate("DELETE FROM `order` WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM order_item WHERE related_enrollment_id IN (SELECT id FROM enrollment WHERE user_id = :id)", id);
        executeNativeUpdate("DELETE FROM enrollment_package WHERE enrollment_id IN (SELECT id FROM enrollment WHERE user_id = :id)", id);
        executeNativeUpdate("DELETE FROM enrollment WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM certificate WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM study_goal WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM class_member WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM course_member WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM learning_activity_log WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM learning_session WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM waitlist WHERE user_id = :id", id);

        executeNativeUpdate("DELETE FROM user_role WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM audit_log WHERE user_id = :id", id);
        executeNativeUpdate("UPDATE notification SET created_by_admin_id = NULL WHERE created_by_admin_id = :id", id);
        executeNativeUpdate("DELETE FROM notification WHERE user_id = :id", id);
        executeNativeUpdate("UPDATE leave_request SET approver_id = NULL WHERE approver_id = :id", id);
        executeNativeUpdate("DELETE FROM cart_item WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM review WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM search_history WHERE user_id = :id", id);

        executeNativeUpdate("DELETE FROM `user` WHERE id = :id", id);

        auditAfterCommit("HARD_DELETE", id, oldValInfo, null);
        log.info("Successfully hard deleted user ID: {}", id);
    }

    @Transactional
    @Override
    public void restore(Long id) {
        log.info("Restoring user ID: {}", id);
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));

        if (user.getStatus() != UserStatusEnum.DELETED) {
            throw new BusinessException("Chỉ được khôi phục người dùng đang nằm trong thùng rác.");
        }

        UserStatusEnum restoreStatus = user.getStatusBeforeDelete() != null
                ? user.getStatusBeforeDelete()
                : UserStatusEnum.ACTIVE;
        if (restoreStatus == UserStatusEnum.DELETED) restoreStatus = UserStatusEnum.ACTIVE;

        String oldStatusStr = String.valueOf(user.getStatus());
        user.setStatus(restoreStatus);
        user.setStatusBeforeDelete(null);
        userRepository.saveAndFlush(user);

        auditAfterCommit("RESTORE", id, "Status: " + oldStatusStr, "Status: " + restoreStatus);
        log.info("Successfully restored user ID: {} to status: {}", id, restoreStatus);
    }

    @Override
    public Map<String, Object> bulkHardDelete(List<Long> ids) {
        log.info("Bulk hard deleting users: {}", ids);
        int successCount = 0;
        int failureCount = 0;
        List<String> errors = new ArrayList<>();

        if (ids != null) {
            for (Long id : ids) {
                try {
                    transactionExecutor.hardDelete(this, id);
                    successCount++;
                } catch (Exception e) {
                    failureCount++;
                    errors.add("User ID " + id + ": " + e.getMessage());
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("successCount", successCount);
        result.put("failureCount", failureCount);
        result.put("errors", errors);
        return result;
    }

    @Override
    public Map<String, Object> bulkRestore(List<Long> ids) {
        log.info("Bulk restoring users: {}", ids);
        int successCount = 0;
        int failureCount = 0;
        List<String> errors = new ArrayList<>();

        if (ids != null) {
            for (Long id : ids) {
                try {
                    transactionExecutor.restore(this, id);
                    successCount++;
                } catch (Exception e) {
                    failureCount++;
                    errors.add("User ID " + id + ": " + e.getMessage());
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("successCount", successCount);
        result.put("failureCount", failureCount);
        result.put("errors", errors);
        return result;
    }

    private void executeNativeUpdate(String sql, Long id) {
        entityManager.createNativeQuery(sql)
                .setParameter("id", id)
                .executeUpdate();
    }

    /**
     * AuditLogService uses REQUIRES_NEW. Calling it while the user transaction still owns
     * row/FK locks can deadlock the two transactions, so audit only after the main commit.
     */
    private void auditAfterCommit(String action, Long id, Object oldValue, Object newValue) {
        Runnable writeAudit = () -> {
            try {
                auditLogService.log(action, "USER", id, oldValue, newValue);
            } catch (Exception exception) {
                // The business operation is already committed; an audit outage must not
                // turn a successful delete/restore into an HTTP 500 response.
                log.error("Could not write {} audit for user ID {}", action, id, exception);
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

    private TrashItemResponse mapToTrashResponse(UserEntity user) {
        LocalDateTime deletedAt = user.getUpdatedAt() != null ? user.getUpdatedAt() : LocalDateTime.now();
        long daysInTrash = ChronoUnit.DAYS.between(deletedAt, LocalDateTime.now());
        Map<String, Long> childRecordCounts = checkChildRecords(user.getId());
        boolean hasChildRecords = !childRecordCounts.isEmpty();

        String code = user.getUsername() != null ? user.getUsername() : "USR-" + user.getId();

        return TrashItemResponse.builder()
                .entityType("USER")
                .id(String.valueOf(user.getId()))
                .code(code)
                .name(user.getFullName() != null ? user.getFullName() : user.getEmail())
                .email(user.getEmail())
                .deletedAt(deletedAt)
                .daysInTrash(daysInTrash < 0 ? 0 : daysInTrash)
                .hasChildRecords(hasChildRecords)
                .childRecordCounts(childRecordCounts)
                .build();
    }
}
