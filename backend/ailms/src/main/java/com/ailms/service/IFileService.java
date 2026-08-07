package com.ailms.service;
import com.ailms.entity.enums.FileTypeEnum;
import com.ailms.entity.enums.FileUsageTypeEnum;
import com.ailms.response.FileMetadataResponse;
import org.springframework.web.multipart.MultipartFile;

/**
 * Service xử lý tải lên, tải xuống và xóa tệp tin ở mức ứng dụng.
 */
public interface IFileService {

    /**
     * Tải tệp tin lên hệ thống lưu trữ và trả về thông tin metadata.
     *
     * @param file Tệp tin tải lên (MultipartFile)
     * @param fileType Phân loại tệp tin tải lên
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    FileMetadataResponse uploadFile(MultipartFile file, FileTypeEnum fileType);

    /**
     * Tải tệp tin lên MinIO và gán đầy đủ thông tin tham chiếu nghiệp vụ.
     */
    FileMetadataResponse uploadFile(
            MultipartFile file,
            FileTypeEnum fileType,
            FileUsageTypeEnum usageType,
            Long referenceEntityId,
            String referenceEntityType
    );

    /**
     * Tạo liên kết tải tệp tin dựa trên fileKey.
     *
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    String getDownloadUrl(String fileKey);

    /**
     * Tạo liên kết tải dành cho trang quản trị. Admin/HR được phép tải cả file
     * đã lưu trữ, nhưng không được tải file đã xóa.
     */
    String getAdminDownloadUrl(String fileKey);

    /**
     * Xóa vĩnh viễn file vật lý khỏi bộ lưu trữ.
     *
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     */
    void deleteHardFile(String fileKey);
}
