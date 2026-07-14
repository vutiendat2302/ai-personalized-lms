package com.ailms.repository.specification;

import com.ailms.entity.FileMetadataEntity;
import com.ailms.request.FileSearchRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

public final class FileSpecification {

    private FileSpecification() {
    }

    public static Specification<FileMetadataEntity> filterAndSearch(FileSearchRequest request) {
        Specification<FileMetadataEntity> spec = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request == null) {
            return spec;
        }

        if (StringUtils.hasText(request.getKeyword())) {
            String pattern = "%" + request.getKeyword().toLowerCase() + "%";
            spec = spec.and((root, query, criteriaBuilder) -> criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("originalName")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("fileKey")), pattern)
            ));
        }

        if (!CollectionUtils.isEmpty(request.getFileTypes())) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    root.get("fileType").in(request.getFileTypes()));
        }

        if (!CollectionUtils.isEmpty(request.getStatuses())) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    root.get("status").in(request.getStatuses()));
        }

        if (StringUtils.hasText(request.getContentType())) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("contentType"), request.getContentType()));
        }

        if (request.getCreatedFrom() != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), request.getCreatedFrom()));
        }

        if (request.getCreatedTo() != null) {
            spec = spec.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), request.getCreatedTo()));
        }

        return spec;
    }
}
