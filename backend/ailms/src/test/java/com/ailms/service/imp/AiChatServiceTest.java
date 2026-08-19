package com.ailms.service.imp;

import com.ailms.client.AiServiceClient;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.AiConversationScope;
import com.ailms.security.CustomUserDetails;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.mockito.Mockito.*;

/** Kiểm tra backend tự suy scope chat từ authority đáng tin cậy. */
class AiChatServiceTest {

    /** Mỗi tầng trách nhiệm phải đọc đúng nhóm lịch sử của chính nó. */
    @ParameterizedTest
    @CsvSource({
            "ROLE_ADMIN, ADMIN_COPILOT",
            "ROLE_HR, ADMIN_COPILOT",
            "ROLE_TEACHER, EMPLOYEE_COPILOT",
            "ROLE_INSTRUCTOR, EMPLOYEE_COPILOT",
            "ROLE_TA, EMPLOYEE_COPILOT",
            "ROLE_STUDENT, STUDENT_ASSISTANT"
    })
    void listConversationsResolvesScopeFromRole(
            String role, AiConversationScope expectedScope) {
        AiConversationPersistenceService persistence = mock(AiConversationPersistenceService.class);
        AiChatService service = new AiChatService(
                mock(AiServiceClient.class),
                mock(AiServiceClient.class),
                persistence,
                mock(AiConversationBufferService.class),
                mock(AiToolAccessTokenService.class),
                mock(ManagementAiContextService.class));
        CustomUserDetails currentUser = mock(CustomUserDetails.class);
        UserEntity user = mock(UserEntity.class);
        when(user.getId()).thenReturn(10L);
        when(currentUser.getUser()).thenReturn(user);
        doReturn(List.of(new SimpleGrantedAuthority(role)))
                .when(currentUser).getAuthorities();
        var pageable = PageRequest.of(0, 20);
        when(persistence.list(10L, expectedScope, pageable)).thenReturn(Page.empty());

        service.listConversations(pageable, currentUser);

        verify(persistence).list(10L, expectedScope, pageable);
    }
}
