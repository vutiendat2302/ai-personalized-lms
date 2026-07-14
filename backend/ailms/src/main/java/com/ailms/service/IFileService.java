package com.ailms.service;

import com.ailms.entity.FileMetadataEntity;
import com.ailms.entity.FileTypeEnum;
import com.ailms.response.FileMetadataResponse;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;
import java.util.Optional;

public interface IFileService {
    /**
     * Upload file hoàn chỉnh: sinh fileKey, lưu vào storage, rồi lưu metadata vào DB.
     *
     * @param file     file gốc từ request
     * @param fileType loại file (CONTRACT, AVATAR, DOCUMENT...)
     * @return metadata của file vừa upload
     */
    FileMetadataResponse uploadFile(MultipartFile file, FileTypeEnum fileType);

    /**
     * Lấy URL để client tải file — có check metadata tồn tại + status ACTIVE trước khi sinh URL.
     *
     * @param fileKey object key cần tải
     * @return presigned URL
     */
    String getDownloadUrl(String fileKey);

    /**
     * Xóa file hoàn chỉnh: xóa file vật lý trên storage rồi xóa/soft-delete metadata.
     *
     * @param fileKey object key cần xóa
     */
    void deleteFile(String fileKey);
}
