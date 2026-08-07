package com.ailms.controller;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.FileTypeEnum;
import com.ailms.exception.BusinessException;
import com.ailms.request.BulkFileActionRequest;
import com.ailms.request.FileSearchRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.FileExistenceResponse;
import com.ailms.response.FileManagementSummaryResponse;
import com.ailms.response.FileMetadataResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.IFileMetadataService;
import com.ailms.service.IFileService;
import com.ailms.service.IFileStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

import com.ailms.entity.enums.FileUsageTypeEnum;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("${api.prefix}/files")
@RequiredArgsConstructor
public class FileController {

    private final IFileService fileService;
    private final IFileMetadataService fileMetadataService;
    private final IFileStorageService fileStorageService;

    // ==========================================
    // 1. PUBLIC / USER FILE ENDPOINTS
    // ==========================================

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<FileMetadataResponse>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "fileType", required = false) FileTypeEnum fileType,
            @RequestParam(value = "usageType", required = false) FileUsageTypeEnum usageType,
            @RequestParam(value = "referenceEntityId", required = false) Long referenceEntityId,
            @RequestParam(value = "referenceEntityType", required = false) String referenceEntityType) {

        FileMetadataResponse metadata = fileService.uploadFile(file, fileType, usageType, referenceEntityId, referenceEntityType);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("File uploaded to MinIO and metadata saved successfully", metadata));
    }

    @GetMapping("/download")
    public ResponseEntity<?> downloadFile(
            @RequestParam("fileKey") String fileKey,
            @RequestHeader(value = "Range", required = false) String rangeHeader) {
        FileMetadataResponse metadata = fileMetadataService.getByFileKey(fileKey);
        if (metadata.getStatus() != BaseStatusEnum.ACTIVE) {
            throw new BusinessException("File is not active or has been deleted");
        }

        String encodedFilename = URLEncoder.encode(metadata.getOriginalName(), StandardCharsets.UTF_8)
                .replace("+", "%20");

        String disposition = (metadata.getFileType() == FileTypeEnum.VIDEO || metadata.getFileType() == FileTypeEnum.IMAGE || metadata.getFileType() == FileTypeEnum.AUDIO || metadata.getFileType() == FileTypeEnum.DOCUMENT)
                ? "inline"
                : "attachment";
        MediaType mediaType = MediaType.parseMediaType(metadata.getContentType() != null ? metadata.getContentType() : "application/octet-stream");
        if (metadata.getOriginalName() != null && metadata.getOriginalName().toLowerCase().endsWith(".pdf")) {
            mediaType = MediaType.APPLICATION_PDF;
        }

        if (metadata.getFileType() == FileTypeEnum.VIDEO && rangeHeader != null) {
            long fileSize = metadata.getFileSize() != null ? metadata.getFileSize() : 0;
            try {
                List<HttpRange> ranges = HttpRange.parseRanges(rangeHeader);
                if (!ranges.isEmpty()) {
                    HttpRange range = ranges.get(0);
                    long start = range.getRangeStart(fileSize);
                    long end = range.getRangeEnd(fileSize);

                    // 1. Validate Range Boundaries (Return HTTP 416 if invalid range requested)
                    if (start < 0 || start >= fileSize || start > end) {
                        return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                                .header(HttpHeaders.CONTENT_RANGE, "bytes */" + fileSize)
                                .build();
                    }

                    long rangeLength = end - start + 1;

                    InputStream stream = fileStorageService.download(fileKey);

                    // 2. Guaranteed safe skip loop for MinIO/network streams
                    safeSkip(stream, start);

                    // 3. Wrap stream in BoundedInputStream so stream terminates exactly at rangeLength (prevents Broken Pipe log spam)
                    InputStream boundedStream = new BoundedInputStream(stream, rangeLength);
                    InputStreamResource resource = new InputStreamResource(boundedStream);

                    return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                            .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename*=UTF-8''" + encodedFilename)
                            .header(HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + fileSize)
                            .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                            .contentType(mediaType)
                            .contentLength(rangeLength)
                            .body(resource);
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                        .header(HttpHeaders.CONTENT_RANGE, "bytes */" + fileSize)
                        .build();
            } catch (Exception e) {
                log.error("Error processing video range request for fileKey: {}", fileKey, e);
            }
        }

        InputStream stream = fileStorageService.download(fileKey);
        InputStreamResource resource = new InputStreamResource(stream);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename*=UTF-8''" + encodedFilename)
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .contentType(mediaType)
                .contentLength(metadata.getFileSize() != null ? metadata.getFileSize() : 0)
                .body(resource);
    }

    @GetMapping("/preview")
    public ResponseEntity<ApiResponse<String>> getPreviewUrl(@RequestParam("fileKey") String fileKey) {
        String presignedUrl = fileService.getDownloadUrl(fileKey);
        return ResponseEntity.ok(ApiResponse.of("Presigned preview URL generated", presignedUrl));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<FileMetadataResponse>>> searchFiles(FileSearchRequest request) {
        PageResponse<FileMetadataResponse> result = fileMetadataService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Files searched successfully", result));
    }

    @DeleteMapping("/delete/hard")
    public ResponseEntity<ApiResponse<Void>> deleteHardFile(@RequestParam("fileKey") String fileKey) {
        fileService.deleteHardFile(fileKey);
        return ResponseEntity.ok(ApiResponse.message("File deleted successfully from storage"));
    }

    @DeleteMapping("/delete/soft")
    public ResponseEntity<ApiResponse<Void>> deleteSoftFile(@RequestParam("fileKey") String fileKey) {
        fileMetadataService.softDelete(fileKey);
        return ResponseEntity.ok(ApiResponse.message("File deleted successfully from storage"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FileMetadataResponse>>> getAllFiles() {
        List<FileMetadataResponse> files = fileMetadataService.getAllFiles();
        return ResponseEntity.ok(ApiResponse.of("Successfully", files));
    }

    @PatchMapping("/rename")
    public ResponseEntity<ApiResponse<FileMetadataResponse>> updateOriginalName(
            @RequestParam("fileKey") String fileKey,
            @RequestParam("newOriginalName") String newOriginalName) {

        FileMetadataResponse response = fileMetadataService.updateOriginalName(fileKey, newOriginalName);
        return ResponseEntity.ok(ApiResponse.of("File renamed successfully", response));
    }

    @PutMapping("/status")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<FileMetadataResponse>> updateStatus(
            @RequestParam("fileKey") String fileKey,
            @RequestParam("status") BaseStatusEnum status) {

        FileMetadataResponse response = fileMetadataService.updateStatus(fileKey, status);
        return ResponseEntity.ok(ApiResponse.of("File status updated successfully", response));
    }

    @GetMapping("/exists")
    public ResponseEntity<ApiResponse<FileExistenceResponse>> existsByFileKey(
            @RequestParam("fileKey") String fileKey) {

        boolean inMetadata = fileMetadataService.existsByFileKey(fileKey);
        boolean inStorage = fileStorageService.exists(fileKey);

        FileExistenceResponse response = new FileExistenceResponse(inMetadata, inStorage, inMetadata && inStorage);
        return ResponseEntity.ok(ApiResponse.of("File existence checked successfully", response));
    }

    // ==========================================
    // 2. ADMIN FILE MANAGEMENT ENDPOINTS
    // ==========================================

    @GetMapping("/admin")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<PageResponse<FileMetadataResponse>>> getAdminFiles(FileSearchRequest request) {
        PageResponse<FileMetadataResponse> page = fileMetadataService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Lấy danh sách file thành công", page));
    }

    @GetMapping("/admin/summary")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<FileManagementSummaryResponse>> getSummary() {
        FileManagementSummaryResponse summary = fileMetadataService.getSummary();
        return ResponseEntity.ok(ApiResponse.of("Lấy tổng quan quản lý file thành công", summary));
    }

    @GetMapping("/admin/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<FileMetadataResponse>> getFileDetail(@PathVariable("id") Long id) {
        FileMetadataResponse detail = fileMetadataService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Lấy chi tiết file thành công", detail));
    }

    @GetMapping("/admin/{id}/download-url")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<String>> getAdminDownloadUrl(@PathVariable("id") Long id) {
        FileMetadataResponse detail = fileMetadataService.getById(id);
        String url = fileService.getAdminDownloadUrl(detail.getFileKey());
        return ResponseEntity.ok(ApiResponse.of("Tạo presigned URL tải file thành công", url));
    }

    @PostMapping("/admin/bulk-archive")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<Void>> bulkArchive(@RequestBody @Valid BulkFileActionRequest request) {
        fileMetadataService.bulkArchive(request);
        return ResponseEntity.ok(ApiResponse.message("Lưu trữ danh sách file thành công"));
    }

    @PostMapping("/admin/bulk-delete")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<Void>> bulkDelete(@RequestBody @Valid BulkFileActionRequest request) {
        fileMetadataService.bulkDelete(request);
        return ResponseEntity.ok(ApiResponse.message("Xoá mềm danh sách file mồ côi thành công"));
    }

    @PostMapping("/admin/bulk-purge")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<Void>> bulkPurge(@RequestBody @Valid BulkFileActionRequest request) {
        fileMetadataService.bulkPurge(request);
        return ResponseEntity.ok(ApiResponse.message("Xoá vĩnh viễn danh sách file thành công"));
    }

    @PostMapping("/admin/rescan-orphaned")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<Integer>> rescanOrphaned() {
        int count = fileMetadataService.triggerRescanOrphaned();
        return ResponseEntity.ok(ApiResponse.of("Phát hiện " + count + " file mồ côi", count));
    }

    @GetMapping("/admin/export")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<byte[]> exportCsv(FileSearchRequest request) {
        byte[] csvBytes = fileMetadataService.exportCsv(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"files_export.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvBytes);
    }

    private static void safeSkip(InputStream stream, long targetBytes) throws IOException {
        long skipped = 0;
        while (skipped < targetBytes) {
            long s = stream.skip(targetBytes - skipped);
            if (s <= 0) {
                if (stream.read() == -1) break;
                skipped++;
            } else {
                skipped += s;
            }
        }
    }

    private static class BoundedInputStream extends InputStream {
        private final InputStream delegate;
        private long remaining;

        public BoundedInputStream(InputStream delegate, long maxBytesToRead) {
            this.delegate = delegate;
            this.remaining = maxBytesToRead;
        }

        @Override
        public int read() throws IOException {
            if (remaining <= 0) return -1;
            int result = delegate.read();
            if (result != -1) remaining--;
            return result;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (remaining <= 0) return -1;
            int maxToRead = (int) Math.min(len, remaining);
            int bytesRead = delegate.read(b, off, maxToRead);
            if (bytesRead > 0) remaining -= bytesRead;
            return bytesRead;
        }

        @Override
        public void close() throws IOException {
            delegate.close();
        }
    }
}
