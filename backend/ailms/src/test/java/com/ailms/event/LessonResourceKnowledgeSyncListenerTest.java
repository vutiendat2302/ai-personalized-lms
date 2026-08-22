package com.ailms.event;

import com.ailms.client.AiServiceClient;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.CourseSectionEntity;
import com.ailms.entity.FileMetadataEntity;
import com.ailms.entity.LessonEntity;
import com.ailms.entity.LessonResourceEntity;
import com.ailms.repository.LessonResourceRepository;
import com.ailms.request.ai.AiIngestRequest;
import com.ailms.service.IFileStorageService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.ByteArrayInputStream;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Kiểm tra LessonResource được ingest với đầy đủ khóa filter cho LESSON_ONLY. */
class LessonResourceKnowledgeSyncListenerTest {

    /** Event tạo phải gửi source ổn định cùng course/section/lesson metadata. */
    @Test
    void ingestLessonResourceWithLearningScope() {
        LessonResourceRepository repository = mock(LessonResourceRepository.class);
        IFileStorageService storage = mock(IFileStorageService.class);
        AiServiceClient client = mock(AiServiceClient.class);
        when(repository.findById(50L)).thenReturn(Optional.of(resource()));
        when(storage.download("lessons/chapter.pdf"))
                .thenReturn(new ByteArrayInputStream("pdf".getBytes()));
        when(client.ingest(any())).thenReturn(new com.ailms.response.ai.AiIngestResponse());
        LessonResourceKnowledgeSyncListener listener =
                new LessonResourceKnowledgeSyncListener(repository, storage, client);

        listener.onResourceChanged(new LessonResourceKnowledgeChangedEvent(50L, false));

        ArgumentCaptor<AiIngestRequest> captor = ArgumentCaptor.forClass(AiIngestRequest.class);
        verify(client).ingest(captor.capture());
        assertThat(captor.getValue().getSourceId()).isEqualTo("lesson-resource-50");
        assertThat(captor.getValue().getCourseId()).isEqualTo("10");
        assertThat(captor.getValue().getSectionId()).isEqualTo("20");
        assertThat(captor.getValue().getLessonId()).isEqualTo("30");
        assertThat(captor.getValue().getMetadata()).containsEntry("lessonId", "30");
    }

    /** Event xóa chỉ xóa source vector và không cần đọc file cũ. */
    @Test
    void deleteLessonResourceRemovesVectorSource() {
        AiServiceClient client = mock(AiServiceClient.class);
        LessonResourceKnowledgeSyncListener listener = new LessonResourceKnowledgeSyncListener(
                mock(LessonResourceRepository.class), mock(IFileStorageService.class),
                client);

        listener.onResourceChanged(new LessonResourceKnowledgeChangedEvent(50L, true));

        verify(client).deleteSource("lesson-resource-50");
    }

    /** Tạo cây course/section/lesson/file tối thiểu cho ingestion test. */
    private LessonResourceEntity resource() {
        CourseEntity course = CourseEntity.builder().id(10L).build();
        CourseSectionEntity section = CourseSectionEntity.builder().id(20L).courseEntity(course).build();
        LessonEntity lesson = LessonEntity.builder().id(30L).courseSectionEntity(section).build();
        FileMetadataEntity file = FileMetadataEntity.builder().id(40L)
                .fileKey("lessons/chapter.pdf").originalName("chapter.pdf")
                .contentType("application/pdf").build();
        return LessonResourceEntity.builder().id(50L).lessonEntity(lesson)
                .name("Chương 1").fileMetadata(file).build();
    }

}
