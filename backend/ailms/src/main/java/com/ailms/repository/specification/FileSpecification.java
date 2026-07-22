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
        builder.greaterOrEqualIfPresent("createdAt", request.getCreatedFrom());
        builder.lessOrEqualIfPresent("createdAt", request.getCreatedTo());

        return builder.build();
    }
}
