package com.ailms.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.Duration;

/**
 * Service lưu trữ tệp vật lý tương tác trực tiếp với hệ thống lưu trữ (như MinIO, S3).
 */
public interface IFileStorageService {

    /**
     * Lưu trữ tệp tin với thông tin được chỉ định.
     *
     * @param file Tệp tin tải lên (MultipartFile)
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     */
    void upload(MultipartFile file, String fileKey);

    /**
     * Lưu trữ tệp tin với thông tin được chỉ định.
     *
     * @param inputStream Luồng dữ liệu tệp tin cần tải lên
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     * @param contentType Định dạng kiểu nội dung của tệp tin
     * @param size Kích thước của tệp tin tính theo byte
     */
    void upload(InputStream inputStream, String fileKey, String contentType, long size);

    /**
     * Tải tệp tin dưới dạng InputStream.
     *
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    InputStream download(String fileKey);

    /**
     * Tạo liên kết truy cập tạm thời (Presigned URL) cho tệp tin.
     *
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     * @param expiry Thời gian hết hạn hiệu lực của liên kết
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    String getPresignedUrl(String fileKey, Duration expiry);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     */
    void delete(String fileKey);

    /**
     * Kiểm tra xem tệp tin có tồn tại trong bộ lưu trữ hay không.
     *
     * @param fileKey Khóa duy nhất định danh tệp tin trong hệ thống lưu trữ
     * @return true nếu xử lý thành công hoặc hợp lệ, ngược lại là false
     */
    boolean exists(String fileKey);
}
