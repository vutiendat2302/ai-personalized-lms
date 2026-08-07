package com.ailms.service.imp;
import com.ailms.service.IFileStorageService;


import com.ailms.exception.FileStorageException;
import io.minio.*;
import io.minio.http.Method;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Triển khai dịch vụ lưu trữ file sử dụng MinIO.
 * - Upload file lên MinIO
 * - Tải file từ MinIO
 * - Tạo presigned URL để truy cập file
 * - Xóa file
 * - Kiểm tra file tồn tại
 */
@Service
@Slf4j
public class MinioFileStorageService implements IFileStorageService {

    private final MinioClient minioClient;
    private final MinioClient minioPresignClient;

    @Value("${minio.bucket-name}")
    private String bucketName;

    public MinioFileStorageService(
            MinioClient minioClient,
            @Qualifier("minioPresignClient") MinioClient minioPresignClient) {
        this.minioClient = minioClient;
        this.minioPresignClient = minioPresignClient;
    }

    @Override
    public void upload(MultipartFile file, String fileKey) {
        if (file.isEmpty()) {
            throw new FileStorageException("File cannot be empty: " + fileKey);
        }
        try {
            upload(file.getInputStream(), fileKey, file.getContentType(), file.getSize());
        } catch (Exception e) {
            log.error("Failed to upload multipart file to MinIO: {}", fileKey, e);
            throw new FileStorageException("Failed to upload file to storage");
        }
    }

    @Override
    public void upload(InputStream inputStream, String fileKey, String contentType, long size) {
        try {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucketName).build()
            );
            if (!exists) {
                minioClient.makeBucket(
                        MakeBucketArgs.builder().bucket(bucketName).build()
                );
            }
            
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(fileKey)
                            .stream(inputStream, size, -1)
                            .contentType(contentType)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to upload stream file to MinIO: {}", fileKey, e);
            throw new FileStorageException("Failed to upload file to storage");
        }
    }

    @Override
    public InputStream download(String fileKey) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucketName)
                            .object(fileKey)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to download file from MinIO: {}", fileKey, e);
            throw new FileStorageException("File not found or unable to download from storage");
        }
    }

    @Override
    public String getPresignedUrl(String fileKey, Duration expiry) {
        try {
            return minioPresignClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucketName)
                            .object(fileKey)
                            .expiry((int) expiry.toSeconds(), TimeUnit.SECONDS)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to generate presigned URL for key: {}", fileKey, e);
            throw new FileStorageException("Failed to generate preview link for key");
        }
    }

    @Override
    public void delete(String fileKey) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(fileKey)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to delete file from MinIO: {}", fileKey, e);
            throw new FileStorageException("Failed to delete file from storage");
        }
    }

    @Override
    public boolean exists(String fileKey) {
        try {
            minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(bucketName)
                            .object(fileKey)
                            .build()
            );
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
