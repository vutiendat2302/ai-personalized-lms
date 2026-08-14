package com.ailms.service.imp;

import com.ailms.entity.AnonymousVisitorEntity;
import com.ailms.entity.SupportChatMessageEntity;
import com.ailms.entity.SupportConversationEntity;
import com.ailms.repository.AnonymousVisitorRepository;
import com.ailms.repository.CategoryRepository;
import com.ailms.repository.SupportChatMessageRepository;
import com.ailms.repository.SupportConversationRepository;
import com.ailms.repository.SupportHrPresenceRepository;
import com.ailms.repository.FileMetadataRepository;
import com.ailms.service.IPublicCatalogService;
import com.ailms.search.MeilisearchCourseService;
import com.ailms.response.CourseResponse;
import com.ailms.response.PageResponse;
import com.ailms.entity.enums.CourseStatusEnum;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Kiểm tra các invariant cơ bản của visitor session và guided options. */
class SupportChatServiceTest {
    private final AnonymousVisitorRepository visitorRepository = mock(AnonymousVisitorRepository.class);
    private final SupportConversationRepository conversationRepository = mock(SupportConversationRepository.class);
    private final SupportChatMessageRepository messageRepository = mock(SupportChatMessageRepository.class);
    private final MeilisearchCourseService meilisearchCourseService = mock(MeilisearchCourseService.class);
    private final SupportChatService service = new SupportChatService(
            visitorRepository,
            conversationRepository,
            messageRepository,
            mock(SupportHrPresenceRepository.class),
            mock(FileMetadataRepository.class),
            mock(CategoryRepository.class),
            mock(IPublicCatalogService.class),
            new ObjectMapper(),
            mock(ApplicationEventPublisher.class),
            mock(com.ailms.repository.CourseRepository.class),
            mock(com.ailms.repository.CoursePackageRepository.class),
            meilisearchCourseService,
            mock(com.ailms.service.IFileStorageService.class),
            mock(PublicAiChatService.class));

    /** Visitor session trả token đủ dài và repository chỉ nhận token hash. */
    @Test
    void createsVisitorWithHashedToken() {
        ArgumentCaptor<AnonymousVisitorEntity> captor = ArgumentCaptor.forClass(AnonymousVisitorEntity.class);

        org.mockito.Mockito.when(visitorRepository.save(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> {
                    AnonymousVisitorEntity visitor = invocation.getArgument(0);
                    visitor.setId(1L);
                    return visitor;
                });
        org.mockito.Mockito.when(conversationRepository.save(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> {
                    SupportConversationEntity conversation = invocation.getArgument(0);
                    conversation.setId(2L);
                    return conversation;
                });
        org.mockito.Mockito.when(messageRepository.save(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> {
                    SupportChatMessageEntity message = invocation.getArgument(0);
                    message.setId(3L);
                    return message;
                });
        var response = service.createVisitor();

        verify(visitorRepository).save(captor.capture());
        assertThat(response.visitorId()).isNotBlank();
        assertThat(response.conversationId()).isEqualTo("2");
        assertThat(response.visitorToken()).isNotBlank();
        assertThat(captor.getValue().getVisitorTokenHash()).isNotEqualTo(response.visitorToken());
        assertThat(captor.getValue().getVisitorTokenHash()).hasSize(64);
    }

    /** Guided options có ID ổn định để frontend không gửi label tự do. */
    @Test
    void exposesStableGuidedOptions() {
        assertThat(service.getOptions()).extracting("id")
                .contains("COURSE_CONSULTING", "REQUEST_AGENT")
                .doesNotContain("OTHER", "TEACHERS");
    }

    /** Support picker dùng Meilisearch với filter khóa học ACTIVE có gói đang bán. */
    @Test
    void searchesSellableCoursesThroughMeilisearch() {
        CourseResponse course = CourseResponse.builder().id(10L).name("Toán ứng dụng")
                .categoryName("Toán").thumbnailUrl("/images/toan.webp").build();
        when(meilisearchCourseService.search(org.mockito.ArgumentMatchers.any())).thenReturn(
                PageResponse.<CourseResponse>builder().content(java.util.List.of(course)).pageNumber(0)
                        .pageSize(12).totalElements(1).totalPages(1).first(true).last(true).build());

        var resources = service.searchResources("Toán", 12);

        ArgumentCaptor<com.ailms.request.CourseSearchRequest> requestCaptor =
                ArgumentCaptor.forClass(com.ailms.request.CourseSearchRequest.class);
        verify(meilisearchCourseService).search(requestCaptor.capture());
        assertThat(requestCaptor.getValue().getKeyword()).isEqualTo("Toán");
        assertThat(requestCaptor.getValue().getStatus()).isEqualTo(CourseStatusEnum.ACTIVE);
        assertThat(resources).singleElement().satisfies(resource -> {
            assertThat(resource.type()).isEqualTo("COURSE");
            assertThat(resource.id()).isEqualTo("10");
        });
    }
}
