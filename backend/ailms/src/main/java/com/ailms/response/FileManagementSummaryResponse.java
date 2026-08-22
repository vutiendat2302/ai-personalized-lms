package com.ailms.response;

import com.ailms.entity.enums.FileTypeEnum;
import com.ailms.entity.enums.FileUsageTypeEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileManagementSummaryResponse {
    private Long totalFiles;
    private Long totalSizeBytes;
    private Long orphanedFilesCount;
    private Long uploadedThisMonth;
    private Long archivedOrDeletedCount;

    private Map<FileUsageTypeEnum, Long> sizeByUsageType;
    private Map<FileTypeEnum, Long> sizeByFileType;
    private List<MonthlyUploadTrend> uploadTrend;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyUploadTrend {
        private String month; // Format: "YYYY-MM"
        private Long count;
        private Long sizeBytes;
    }
}
