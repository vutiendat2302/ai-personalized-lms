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

public interface IMinioFileStorageService {
    void upload(MultipartFile file, String fileKey);
    void upload(InputStream inputStream, String fileKey, String contentType, long size);
    InputStream download(String fileKey);
    String getPresignedUrl(String fileKey, Duration expiry);
    void delete(String fileKey);
    boolean exists(String fileKey);
}
