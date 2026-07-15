package com.ailms.controller;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.FileTypeEnum;
import com.ailms.exception.BusinessException;
import com.ailms.request.FileSearchRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.FileExistenceResponse;
import com.ailms.response.FileMetadataResponse;
import com.ailms.service.IFileMetadataService;
import com.ailms.service.IFileService;
import com.ailms.service.IFileStorageService;
import com.ailms.service.imp.MinioFileStorageService;
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
import java.util.List;

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

    @DeleteMapping("delete/hard")
    public ResponseEntity<ApiResponse<Void>> deleteHardFile(@RequestParam("fileKey") String fileKey) {
        fileService.deleteHardFile(fileKey);
        return ResponseEntity.ok(ApiResponse.message("File deleted successfully from storage"));
    }

    @DeleteMapping("delete/soft")
    public ResponseEntity<ApiResponse<Void>> deleteSoftFile(@RequestParam("fileKey") String fileKey) {
        fileMetadataService.softDelete(fileKey);
        return ResponseEntity.ok(ApiResponse.message("File deleted successfully from storage"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FileMetadataResponse>>> getAllFiles() {
        List<FileMetadataResponse> files = fileMetadataService.getAllFiles();

        return ResponseEntity.ok(
                ApiResponse.of("Successfully", files)
        );
    }

    @PatchMapping("/rename")
    public ResponseEntity<ApiResponse<FileMetadataResponse>> updateOriginalName(
            @RequestParam("fileKey") String fileKey,
            @RequestParam("newOriginalName") String newOriginalName) {

        FileMetadataResponse response =
                fileMetadataService.updateOriginalName(fileKey, newOriginalName);

        return ResponseEntity.ok(
                ApiResponse.of("File renamed successfully", response)
        );
    }

    @PutMapping("/status")
    public ResponseEntity<ApiResponse<FileMetadataResponse>> updateStatus(
            @RequestParam("fileKey") String fileKey,
            @RequestParam("status") BaseStatusEnum status) {

        FileMetadataResponse response =
                fileMetadataService.updateStatus(fileKey, status);

        return ResponseEntity.ok(
                ApiResponse.of("File status updated successfully", response)
        );
    }


    @GetMapping("/exists")
    public ResponseEntity<ApiResponse<FileExistenceResponse>> existsByFileKey(
            @RequestParam("fileKey") String fileKey) {

        boolean inMetadata = fileMetadataService.existsByFileKey(fileKey);
        boolean inStorage = fileStorageService.exists(fileKey);

        FileExistenceResponse response = new FileExistenceResponse(inMetadata, inStorage, inMetadata && inStorage);
        return ResponseEntity.ok(ApiResponse.of("File existence checked successfully", response));
    }
}

