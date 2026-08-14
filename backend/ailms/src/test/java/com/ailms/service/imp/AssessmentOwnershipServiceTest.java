package com.ailms.service.imp;

import com.ailms.entity.AssignmentEntity;
import com.ailms.entity.QuizEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.AssignmentMapper;
import com.ailms.mapper.QuizMapper;
import com.ailms.repository.AssignmentRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.QuizRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssessmentOwnershipServiceTest {

    @Mock private QuizRepository quizRepository;
    @Mock private QuizMapper quizMapper;
    @Mock private AssignmentRepository assignmentRepository;
    @Mock private AssignmentMapper assignmentMapper;
    @Mock private ClassRepository classRepository;
    @InjectMocks private QuizService quizService;
    @InjectMocks private AssignmentService assignmentService;

    /** Không cho user xóa quiz được tạo bởi user khác. */
    @Test
    void deleteAuthoredQuizRejectsForeignOwner() {
        QuizEntity foreignQuiz = QuizEntity.builder().id(10L).createdBy(99L).build();
        when(quizRepository.findById(10L)).thenReturn(Optional.of(foreignQuiz));

        assertThrows(ResourceNotFoundException.class, () -> quizService.deleteAuthored(10L, 20L));

        verify(quizRepository, never()).delete(foreignQuiz);
    }

    /** Không cho user xóa bài tập được tạo bởi user khác. */
    @Test
    void deleteAuthoredAssignmentRejectsForeignOwner() {
        AssignmentEntity foreignAssignment = AssignmentEntity.builder().id(11L).createdBy(99L).build();
        when(assignmentRepository.findById(11L)).thenReturn(Optional.of(foreignAssignment));

        assertThrows(ResourceNotFoundException.class,
                () -> assignmentService.deleteAuthored(11L, 20L));

        verify(assignmentRepository, never()).delete(foreignAssignment);
    }
}
