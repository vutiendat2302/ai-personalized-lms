package com.ailms.service;

import com.ailms.request.PublishClassQuizRequest;
import com.ailms.response.QuizResponse;
import com.ailms.security.CustomUserDetails;

import java.util.List;

/** Nghiệp vụ phát hành và quản lý Quiz riêng theo lớp học. */
public interface IClassQuizService {
    QuizResponse publish(Long classId, Long sourceQuizId, PublishClassQuizRequest request, CustomUserDetails currentUser);
    List<QuizResponse> getByClass(Long classId, CustomUserDetails currentUser);
    QuizResponse updateSchedule(Long classId, Long classQuizId, PublishClassQuizRequest request, CustomUserDetails currentUser);
    QuizResponse close(Long classId, Long classQuizId, CustomUserDetails currentUser);
}
