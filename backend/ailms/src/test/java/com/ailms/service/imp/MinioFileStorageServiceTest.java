package com.ailms.service.imp;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MinioFileStorageServiceTest {

    /** Multipart không có MIME type phải được lưu bằng MIME type nhị phân an toàn. */
    @Test
    void resolvesMissingContentTypeToOctetStream() {
        assertEquals("application/octet-stream", MinioFileStorageService.resolveContentType(null));
        assertEquals("application/octet-stream", MinioFileStorageService.resolveContentType(" "));
    }

    /** MIME type hợp lệ do client gửi phải được giữ nguyên. */
    @Test
    void preservesProvidedContentType() {
        assertEquals("image/jpeg", MinioFileStorageService.resolveContentType("image/jpeg"));
    }
}
