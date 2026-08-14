package com.ailms.service.imp;

import com.ailms.entity.UserEntity;
import com.ailms.exception.ForbiddenException;
import com.ailms.security.CustomUserDetails;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Kiểm tra token tool không cho AI Service tự chọn identity hoặc role. */
class AiToolAccessTokenServiceTest {

    /** Token hợp lệ phải khôi phục đúng owner và role đã lấy từ JWT Backend. */
    @Test
    void issueAndVerifyPreservesTrustedContext() {
        AiToolAccessTokenService service = new AiToolAccessTokenService("test-internal-secret");
        CustomUserDetails user = new CustomUserDetails(
                UserEntity.builder().id(123L).build(),
                List.of(new SimpleGrantedAuthority("ROLE_HR")));

        AiToolAccessContext context = service.verify(service.issue(user));

        assertEquals(123L, context.ownerId());
        assertEquals(List.of("ROLE_HR"), context.roles());
    }

    /** Chữ ký sai phải bị từ chối trước khi Backend thực hiện bất kỳ query nào. */
    @Test
    void verifyRejectsTamperedToken() {
        AiToolAccessTokenService service = new AiToolAccessTokenService("test-internal-secret");

        assertThrows(ForbiddenException.class, () -> service.verify("payload.invalid"));
    }
}
