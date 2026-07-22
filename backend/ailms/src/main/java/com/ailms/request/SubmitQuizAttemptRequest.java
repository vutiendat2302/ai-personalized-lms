package com.ailms.request;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmitQuizAttemptRequest {

    private List<AnswerRequest> answers;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AnswerRequest {
        private Long questionId;
        private Long selectedOptionId;
        private List<Long> selectedOptionIds; // For MULTIPLE_CHOICE
        private String answerText; // For FILL_BLANK
    }
}
