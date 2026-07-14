package com.ailms.service;

import com.ailms.exception.FileStorageException;
import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class MinioFileStorageService implements IFileStorageService {

    private final MinioClient minioClient;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Value("${minio.endpoint}")
    private String minioEndpoint;

    @Value("${minio.external-endpoint:${minio.endpoint}}")
    private String minioExternalEndpoint;

    @Override
    public String upload(MultipartFile file, String fileKey) {
        if (file.isEmpty()) {
            throw new FileStorageException("File cannot be empty: " + fileKey);
        }
        try {
            upload(file.getInputStream(), fileKey, file.getContentType(), file.getSize());
            return fileKey;
        } catch (Exception e) {
            log.error("Failed to upload multipart file to MinIO: {}", fileKey, e);
            throw new FileStorageException("Failed to upload file to storage: " + fileKey, e);
        }
    }

    @Override
    public String upload(InputStream inputStream, String fileKey, String contentType, long size) {
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
            return fileKey;
        } catch (Exception e) {
            log.error("Failed to upload stream file to MinIO: {}", fileKey, e);
            throw new FileStorageException("Failed to upload file to storage: " + fileKey, e);
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
            throw new FileStorageException("File not found or unable to download from storage: " + fileKey, e);
        }
    }

    @Override
    public String getPresignedUrl(String fileKey, Duration expiry) {
        try {
            String url = minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucketName)
                            .object(fileKey)
                            .expiry((int) expiry.toSeconds(), TimeUnit.SECONDS)
                            .build()
            );
            if (!minioEndpoint.equals(minioExternalEndpoint)) {
                url = url.replace(minioEndpoint, minioExternalEndpoint);
            }
            return url;
        } catch (Exception e) {
            log.error("Failed to generate presigned URL for key: {}", fileKey, e);
            throw new FileStorageException("Failed to generate preview link for key: " + fileKey, e);
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
            throw new FileStorageException("Failed to delete file from storage: " + fileKey, e);
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
