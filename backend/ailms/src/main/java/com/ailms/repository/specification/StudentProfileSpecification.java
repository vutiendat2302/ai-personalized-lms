package com.ailms.repository.specification;

import com.ailms.entity.StudentProfileEntity;
import com.ailms.entity.GuardianEntity;
import com.ailms.entity.StudyGoalEntity;
import com.ailms.entity.StudentInterestEntity;
import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.StudentProfileSearchRequest;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.LocalDateTime;

public final class StudentProfileSpecification {

    private StudentProfileSpecification() {
    }

    public static Specification<StudentProfileEntity> filterAndSearch(StudentProfileSearchRequest request) {
        SpecificationBuilder<StudentProfileEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.equalIfPresent("userId", request.getUserId());
        builder.likeAnyIfPresent(request.getKeyword(), "studentCode", "userEntity.fullName", "userEntity.email", "userEntity.phone", "schoolName");
        builder.equalIfPresent("isMinor", request.getIsMinor());
        builder.equalIfPresent("hasGoal", request.getHasGoal());
        builder.equalIfPresent("userEntity.status", request.getUserStatus());
        builder.equalIfPresent("userEntity.gender", request.getGender());
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        builder.custom((root, query, cb) -> cb.notEqual(root.get("userEntity").get("status"), UserStatusEnum.DELETED));

        if (request.getHasGuardian() != null) {
            builder.custom((root, query, cb) -> {
                Subquery<Long> subquery = query.subquery(Long.class);
                Root<GuardianEntity> guardian = subquery.from(GuardianEntity.class);
                subquery.select(guardian.get("id")).where(cb.equal(guardian.get("studentProfile").get("userId"), root.get("userId")));
                return request.getHasGuardian() ? cb.exists(subquery) : cb.not(cb.exists(subquery));
            });
        }
        if (request.getHasEnrollment() != null) {
            builder.custom((root, query, cb) -> {
                Subquery<Long> enrollmentQuery = query.subquery(Long.class);
                Root<EnrollmentEntity> enrollment = enrollmentQuery.from(EnrollmentEntity.class);
                enrollmentQuery.select(enrollment.get("userEntity").get("id")).where(
                        cb.equal(enrollment.get("userEntity").get("id"), root.get("userId")));
                return request.getHasEnrollment() ? cb.exists(enrollmentQuery) : cb.not(cb.exists(enrollmentQuery));
            });
        }
        if (request.getGoalTypes() != null && !request.getGoalTypes().isEmpty()) {
            builder.custom((root, query, cb) -> {
                Subquery<Long> subquery = query.subquery(Long.class);
                Root<StudyGoalEntity> goal = subquery.from(StudyGoalEntity.class);
                subquery.select(goal.get("id")).where(cb.equal(goal.get("userId"), root.get("userId")), goal.get("studyGoalTypeEnum").in(request.getGoalTypes()));
                return cb.exists(subquery);
            });
        }
        if (request.getInterestIds() != null && !request.getInterestIds().isEmpty()) {
            builder.custom((root, query, cb) -> {
                Subquery<Long> subquery = query.subquery(Long.class);
                Root<StudentInterestEntity> interest = subquery.from(StudentInterestEntity.class);
                subquery.select(interest.get("studentProfile").get("userId")).where(cb.equal(interest.get("studentProfile").get("userId"), root.get("userId")), interest.get("interest").get("id").in(request.getInterestIds()));
                return cb.exists(subquery);
            });
        }
        if (request.getInactiveDays() != null && request.getInactiveDays() > 0) {
            builder.custom((root, query, cb) -> {
                Subquery<Long> recentActivity = query.subquery(Long.class);
                Root<LearningActivityLogEntity> activity = recentActivity.from(LearningActivityLogEntity.class);
                recentActivity.select(activity.get("id")).where(
                        cb.equal(activity.get("userId"), root.get("userId")),
                        cb.greaterThanOrEqualTo(activity.get("occurredAt"), LocalDateTime.now().minusDays(request.getInactiveDays())));
                return cb.not(cb.exists(recentActivity));
            });
        }

        return builder.build();
    }
}
