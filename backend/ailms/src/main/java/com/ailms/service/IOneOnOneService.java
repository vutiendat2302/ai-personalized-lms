package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.OneOnOneRequestResponse;
import com.ailms.response.OneOnOneInstructorCandidateResponse;

import java.util.List;

/** Điều phối state machine matching, lớp thử và kết quả học thử 1-1. */
public interface IOneOnOneService {
    /** Lấy các yêu cầu của học viên hiện tại. */
    List<OneOnOneRequestResponse> getStudentRequests(Long studentId);

    /** Lấy các gợi ý phù hợp chuyên môn cho giáo viên/trợ giảng. */
    List<OneOnOneRequestResponse> getSuggestions(Long instructorId);

    /** Lấy các yêu cầu đã được người dạy hiện tại nhận. */
    List<OneOnOneRequestResponse> getAssignedRequests(Long instructorId);

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

    /** HR kết nối hai bên và tạo lớp cùng lịch học thử. */
    OneOnOneRequestResponse markContacted(Long requestId, OneOnOneTrialClassRequest request);

    /** HR đổi lịch buổi học thử đã tạo. */
    OneOnOneRequestResponse rescheduleTrialClass(Long requestId, OneOnOneTrialClassRequest request);

    /** Đóng trial quá hạn nhận xét và mở lại matching giáo viên. */
    int expireUnreviewedTrials();

    /** Học viên cập nhật nhu cầu và mở lại matching, kể cả đổi giáo viên sau khi ghép. */
    OneOnOneRequestResponse rematch(Long studentId, Long requestId, OneOnOneRematchRequest request);

    /** HR từ chối người đang nhận và mở lại yêu cầu cho người dạy khác. */
    OneOnOneRequestResponse rejectConnection(Long requestId, String reason);

    /** Lấy người dạy ACTIVE đúng danh mục và chưa bị loại khỏi yêu cầu. */
    List<OneOnOneInstructorCandidateResponse> getInstructorCandidates(Long requestId);

    /** Gửi thông báo yêu cầu 1-1 tới các người dạy được HR chọn. */
    void notifyInstructors(Long requestId, List<Long> instructorIds);

    /** HR hủy yêu cầu trong trường hợp cần can thiệp. */
    OneOnOneRequestResponse cancel(Long requestId, String reason);

    /** HR hoàn tiền gói và hủy matching request. */
    OneOnOneRequestResponse refund(Long requestId, String reason);
}
