package com.ailms.service.imp;
import com.ailms.service.IFileStorageService;


import com.ailms.exception.FileStorageException;
import io.minio.*;
import io.minio.http.Method;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
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
    private final ConcurrentMap<String, MinioClient> clientCache = new ConcurrentHashMap<>();

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Value("${minio.external-endpoint:${minio.endpoint}}")
    private String externalEndpoint;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Value("${app.frontend.url}")
    private List<String> frontendUrls;

    public MinioFileStorageService(
            MinioClient minioClient,
            @Qualifier("minioPresignClient") MinioClient minioPresignClient) {
        this.minioClient = minioClient;
        this.minioPresignClient = minioPresignClient;
    }

    private MinioClient getOrCreateClient(String endpoint) {
        if (externalEndpoint.equals(endpoint)) {
            return minioPresignClient;
        }
        return clientCache.computeIfAbsent(endpoint, ep ->
                MinioClient.builder()
                        .endpoint(ep)
                        .credentials(accessKey, secretKey)
			.region("us-east-1")
                        .build()
        );
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
        String targetEndpoint = externalEndpoint;

        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                String hostHeader = request.getHeader("X-Forwarded-Host");
                if (!StringUtils.hasText(hostHeader)) {
                    hostHeader = request.getHeader("Host");
                }
                if (StringUtils.hasText(hostHeader)) {
                    String hostOnly = hostHeader.contains(":")
                            ? hostHeader.substring(0, hostHeader.indexOf(":"))
                            : hostHeader;

                    boolean isAllowed = (frontendUrls != null && frontendUrls.stream().anyMatch(url -> url.contains(hostOnly)))
                            || "localhost".equals(hostOnly)
                            || "127.0.0.1".equals(hostOnly);

                    if (isAllowed) {
                        String scheme = request.getHeader("X-Forwarded-Proto");
                        if (!StringUtils.hasText(scheme)) scheme = "http";
                        if ("https".equalsIgnoreCase(scheme) || hostOnly.contains("ts.net") || hostOnly.contains("taile")) {
                            targetEndpoint = scheme + "://" + hostOnly;
                        } else {
                            targetEndpoint = scheme + "://" + hostOnly + ":9000";
                        }
                    } else {
                        log.warn("Unrecognized host header for presigned URL: {}", hostOnly);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to resolve dynamic MinIO endpoint, using default: {}", e.getMessage());
        }

        MinioClient clientToUse = getOrCreateClient(targetEndpoint);

        try {
            return clientToUse.getPresignedObjectUrl(
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
