package com.ailms.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.Duration;

/**
 * Service quản lý file vật lý trên object storage (MinIO/S3).
 */
public interface IFileStorageService {
    /**
     * Upload file lên storage.
     *
     * @param file    file gốc từ request (multipart/form-data)
     * @param fileKey object key duy nhất trong bucket (do tầng gọi sinh ra trước)
     * @return fileKey đã upload thành công (trùng với tham số đầu vào)
     */
    String upload(MultipartFile file, String fileKey);

    /**
     * Upload file từ InputStream (dùng khi file được generate động, không qua MultipartFile).
     *
     * @param inputStream stream nội dung file
     * @param fileKey     object key duy nhất trong bucket
     * @param contentType MIME type của file
     * @param size        kích thước file (byte), bắt buộc phải biết trước với MinIO SDK
     * @return fileKey đã upload thành công
     */
    String upload(InputStream inputStream, String fileKey, String contentType, long size);

    /**
     * Tải nội dung file từ storage.
     *
     * @param fileKey object key cần tải
     * @return InputStream nội dung file — caller chịu trách nhiệm đóng stream sau khi dùng
     */
    InputStream download(String fileKey);

    /**
     * Sinh presigned URL để client tải file trực tiếp từ storage.
     *
     * @param fileKey object key cần tạo URL
     * @param expiry  thời gian hiệu lực của URL
     * @return presigned URL dạng String
     */
    String getPresignedUrl(String fileKey, Duration expiry);

    /**
     * Xóa file vật lý khỏi storage.
     *
     * @param fileKey object key cần xóa
     */
    void delete(String fileKey);

    /**
     * Kiểm tra file có tồn tại trên storage không.
     *
     * @param fileKey object key cần kiểm tra
     * @return true nếu tồn tại, false nếu không
     */
    boolean exists(String fileKey);
}