package com.ailms.controller;

import com.ailms.entity.BaseStatusEnum;
import com.ailms.entity.FileTypeEnum;
import com.ailms.exception.BusinessException;
import com.ailms.request.FileSearchRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.FileMetadataResponse;
import com.ailms.service.IFileMetadataService;
import com.ailms.service.IFileService;
import com.ailms.service.IFileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private final IFileService fileService;
    private final IFileMetadataService fileMetadataService;
    private final IFileStorageService fileStorageService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<FileMetadataResponse>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("fileType") FileTypeEnum fileType) {
        
        FileMetadataResponse metadata = fileService.uploadFile(file, fileType);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("File uploaded successfully", metadata));
    }

    @GetMapping("/download")
    public ResponseEntity<Resource> downloadFile(@RequestParam("fileKey") String fileKey) {
        FileMetadataResponse metadata = fileMetadataService.getByFileKey(fileKey);
        if (metadata.getStatus() != BaseStatusEnum.ACTIVE) {
            throw new BusinessException("File is not active or has been deleted");
        }

        InputStream stream = fileStorageService.download(fileKey);
        InputStreamResource resource = new InputStreamResource(stream);

        // Encode filename for Content-Disposition header
        String encodedFilename = URLEncoder.encode(metadata.getOriginalName(), StandardCharsets.UTF_8)
                .replace("+", "%20");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encodedFilename)
                .contentType(MediaType.parseMediaType(metadata.getContentType() != null ? metadata.getContentType() : "application/octet-stream"))
                .contentLength(metadata.getFileSize())
                .body(resource);
    }

    @GetMapping("/preview")
    public ResponseEntity<ApiResponse<String>> getPreviewUrl(@RequestParam("fileKey") String fileKey) {
        String presignedUrl = fileService.getDownloadUrl(fileKey);
        return ResponseEntity.ok(ApiResponse.of("Presigned preview URL generated", presignedUrl));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<FileMetadataResponse>>> searchFiles(FileSearchRequest request) {
        Page<FileMetadataResponse> result = fileMetadataService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Files searched successfully", result));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteFile(@RequestParam("fileKey") String fileKey) {
        fileService.deleteFile(fileKey);
        return ResponseEntity.ok(ApiResponse.message("File deleted successfully from storage"));
    }
}
