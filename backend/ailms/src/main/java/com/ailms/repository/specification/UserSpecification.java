package com.ailms.repository.specification;

import com.ailms.entity.UserEntity;
import com.ailms.entity.UserRoleEntity;
import com.ailms.entity.UserStatusEnum;
import com.ailms.request.UserSearchRequest;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

/**
 * Specification dùng để xây dựng điều kiện tìm kiếm động cho User.
 *
 * Hỗ trợ:
 * - Tìm kiếm theo từ khóa (username, email, fullName)
 * - Lọc theo trạng thái tài khoản
 * - Lọc theo khoảng thời gian tạo
 * - Lọc theo role đang còn hiệu lực
 *
 * Kết quả trả về sẽ được kết hợp với Pageable để hỗ trợ
 * phân trang và sắp xếp trong Spring Data JPA.
 */

public class UserSpecification {

    /**
     * Xây dựng Specification dựa trên các điều kiện trong UserSearchRequest.
     *
     * @param request chứa các tiêu chí tìm kiếm và lọc
     * @return Specification<UserEntity>
     */
    public static Specification<UserEntity> filterAndSearch(UserSearchRequest request) {
        Specification<UserEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request == null) {
            return spec;
        }

       // keyword search: tolowercase va like %keyword% username, email, fullname
        if (StringUtils.hasText(request.getKeyword())) {
            String pattern = "%" + request.getKeyword().toLowerCase() + "%";
            spec = spec.and((root, query, criteriaBuilder) -> criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("username")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("email")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("fullName")), pattern)
            ));
        }

        // Status filter: lay cac user thuoc trang thai do
        if (!CollectionUtils.isEmpty(request.getStatuses())) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    root.get("status").in(request.getStatuses()));
        } else {
            // khong lay trang thai deleted
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.notEqual(root.get("status"), UserStatusEnum.DELETED));
        }

        // Date filter: loc theo khoang thoi gian tao tai khoan
        if (request.getCreatedFrom() != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), request.getCreatedFrom()));
        }
        if (request.getCreatedTo() != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), request.getCreatedTo()));
        }

        // Role filter: lay cac role trong danh sach roleids, query theo cac role (active)
        if (!CollectionUtils.isEmpty(request.getRoleIds())) {
            spec = spec.and((root, query1, criteriaBuilder) -> {
                Subquery<Long> subquery = query1.subquery(Long.class);
                Root<UserRoleEntity> subRoot = subquery.from(UserRoleEntity.class);
                subquery.select(subRoot.get("userEntity").get("id"));
                subquery.where(
                        criteriaBuilder.and(
                                subRoot.get("roleEntity").get("id").in(request.getRoleIds()),
                                criteriaBuilder.or(
                                        criteriaBuilder.isNull(subRoot.get("expired_at")),
                                        criteriaBuilder.greaterThan(subRoot.get("expired_at"), LocalDateTime.now())
                                )
                        )
                );
                return root.get("id").in(subquery);
            });
        }

        return spec;
    }
}