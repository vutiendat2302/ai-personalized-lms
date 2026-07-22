package com.ailms.service;

import com.ailms.entity.FileMetadataEntity;
import com.ailms.entity.enums.FileTypeEnum;
import com.ailms.response.FileMetadataResponse;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;
import java.util.Optional;

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
     * Tạo liên kết tải tệp tin dựa trên fileKey.
     *
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    String getDownloadUrl(String fileKey);

    /**
     * Xóa vĩnh viễn file vật lý khỏi bộ lưu trữ.
     *
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     */
    void deleteHardFile(String fileKey);
}
