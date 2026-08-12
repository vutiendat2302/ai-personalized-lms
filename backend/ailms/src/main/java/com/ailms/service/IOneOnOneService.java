package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.OneOnOneRequestResponse;

import java.util.List;

/** Điều phối state machine matching, lớp thử và kết quả học thử 1-1. */
public interface IOneOnOneService {
    /** Lấy các yêu cầu của học viên hiện tại. */
    List<OneOnOneRequestResponse> getStudentRequests(Long studentId);

    /** Lấy các gợi ý phù hợp chuyên môn cho giáo viên/trợ giảng. */
    List<OneOnOneRequestResponse> getSuggestions(Long instructorId);

    /** Người dạy nhận độc quyền một yêu cầu đang mở. */
    OneOnOneRequestResponse accept(Long instructorId, Long requestId);

    /** Tạo lớp và đúng một buổi thử sau khi hai bên đã được HR kết nối. */
    OneOnOneRequestResponse createTrialClass(Long instructorId, Long requestId, OneOnOneTrialClassRequest request);

    /** Trả buổi thử đã tạo, không tạo thêm buổi thứ hai. */
    OneOnOneRequestResponse getOrCreateTrialSession(Long instructorId, Long requestId);

    /** Hoàn thành buổi thử và lưu nhận xét của đúng người được gán. */
    OneOnOneRequestResponse reviewTrial(Long instructorId, Long requestId, OneOnOneTrialReviewRequest request);

    /** Học viên xác nhận tiếp tục hoặc tự mở lại matching. */
    OneOnOneRequestResponse submitTrialResult(Long studentId, Long requestId, OneOnOneTrialResultRequest request);

    /** HR xem toàn bộ yêu cầu cần theo dõi. */
    List<OneOnOneRequestResponse> getHrRequests();

    /** HR đánh dấu đã kết nối thông tin liên hệ giữa hai bên. */
    OneOnOneRequestResponse markContacted(Long requestId);

    /** HR hủy yêu cầu trong trường hợp cần can thiệp. */
    OneOnOneRequestResponse cancel(Long requestId, String reason);

    /** HR hoàn tiền gói và hủy matching request. */
    OneOnOneRequestResponse refund(Long requestId, String reason);
}
