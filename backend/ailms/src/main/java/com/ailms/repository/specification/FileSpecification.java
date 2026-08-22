package com.ailms.repository.specification;

import com.ailms.entity.FileMetadataEntity;
import com.ailms.common.util.SpecificationBuilder;
import com.ailms.request.FileSearchRequest;
import org.springframework.data.jpa.domain.Specification;

public final class FileSpecification {

    private FileSpecification() {
    }

    public static Specification<FileMetadataEntity> filterAndSearch(FileSearchRequest request) {
        SpecificationBuilder<FileMetadataEntity> builder = SpecificationBuilder.of();

        if (request == null) {
            return builder.build();
        }

        builder.likeAnyIfPresent(request.getKeyword(), "originalName", "fileKey");
        builder.equalIfPresent("status", request.getStatus());
        builder.equalIfPresent("fileType", request.getFileType());
        builder.equalIfPresent("usageType", request.getUsageType());
        builder.equalIfPresent("createdBy", request.getCreatedBy());

        if (request.getIsOrphaned() != null) {
            if (Boolean.TRUE.equals(request.getIsOrphaned())) {
                builder.custom((root, query, cb) -> cb.or(
                        cb.isNull(root.get("referenceEntityId")),
                        cb.isNotNull(root.get("orphanedDetectedAt"))
                ));
            } else {
                builder.custom((root, query, cb) -> cb.and(
                        cb.isNotNull(root.get("referenceEntityId")),
                        cb.isNull(root.get("orphanedDetectedAt"))
                ));
            }
        }

        if (request.getMinSize() != null) {
            builder.custom((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("fileSize"), request.getMinSize()));
        }
        if (request.getMaxSize() != null) {
            builder.custom((root, query, cb) -> cb.lessThanOrEqualTo(root.get("fileSize"), request.getMaxSize()));
        }

        if (request.getStartDate() != null) {
            builder.greaterOrEqualIfPresent("createdAt", request.getStartDate());
        } else if (request.getCreatedFrom() != null) {
            builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        }

        if (request.getEndDate() != null) {
            builder.lessOrEqualIfPresent("createdAt", request.getEndDate());
        } else if (request.getCreatedTo() != null) {
            builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());
        }

        return builder.build();
    }
}
