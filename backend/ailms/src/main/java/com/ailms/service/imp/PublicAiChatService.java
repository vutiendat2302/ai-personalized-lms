package com.ailms.service.imp;

import com.ailms.client.AiServiceClient;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import com.ailms.repository.CoursePackageRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.request.ai.AiHistoryMessageRequest;
import com.ailms.request.ai.AiServiceChatRequest;
import com.ailms.request.ai.PublicAiChatRequest;
import com.ailms.request.ai.AiSupportQuickAnswerRequest;
import com.ailms.request.ai.AiSupportIntentRequest;
import com.ailms.response.ai.AiSupportQuickAnswerResponse;
import com.ailms.response.ai.AiSupportIntentResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Điều phối chat landing không đăng nhập bằng catalog thật và không lưu thông tin cá nhân. */
@Service
public class PublicAiChatService {
    private final AiServiceClient aiServiceClient;
    private final CourseRepository courseRepository;
    private final CoursePackageRepository coursePackageRepository;
    private final ConcurrentHashMap<String, Window> rateWindows = new ConcurrentHashMap<>();

    public PublicAiChatService(
            @Qualifier("aiServiceStreamingClient") AiServiceClient aiServiceClient,
            CourseRepository courseRepository,
            CoursePackageRepository coursePackageRepository) {
        this.aiServiceClient = aiServiceClient;
        this.courseRepository = courseRepository;
        this.coursePackageRepository = coursePackageRepository;
    }

    /** Gửi câu hỏi kèm catalog công khai hiện tại tới AI Service qua client nội bộ. */
    public Flux<String> stream(PublicAiChatRequest request, String conversationId) {
        String question = request.getQuestion().trim();
        String catalog = catalogContext(question);
        AiServiceChatRequest internal = AiServiceChatRequest.builder()
                .question(question + "\n\nCATALOG HIỆN TẠI TỪ BACKEND:\n" + catalog)
                .conversationId(conversationId)
                .ownerId("public-guest")
                .roles(List.of("PUBLIC"))
                .scope("PUBLIC_CATALOG")
                .module("PUBLIC_LANDING")
                .route("/landing")
                .history(List.of())
                .systemInstruction("Bạn là trợ lý catalog công khai của AI Personalized LMS. "
                        + "Chỉ trả lời về khóa học, danh mục, giáo viên, giá, gói học và việc học. "
                        + "Chỉ dùng CATALOG HIỆN TẠI TỪ BACKEND; không bịa tên, giá, link hoặc trạng thái. "
                        + "Nếu không có dữ liệu phù hợp, nói rõ chưa có dữ liệu. Với câu hỏi ngoài phạm vi, từ chối ngắn gọn.")
                .retrievalMode("NEVER")
                .build();
        return aiServiceClient.chatStream(internal);
    }

    /** Gọi AI đồng bộ cho quick action bằng câu hỏi cố định và catalog thật từ Backend. */
    public String answerSupportQuickAction(String optionId, String policyContext) {
        String question = switch (optionId) {
            case "LEARNING_PATH" -> "Hãy tư vấn cách chọn lộ trình học phù hợp từ catalog hiện có.";
            case "PRICING" -> "Hãy giải thích học phí và các gói học hiện đang mở bán.";
            case "DELIVERY" -> "Hãy giải thích các hình thức học hiện có và điểm khác nhau.";
            case "POLICY" -> "Hãy giải thích chính sách thanh toán và hoàn tiền hiện hành.";
            default -> throw new IllegalArgumentException("Quick action AI không hợp lệ");
        };
        String context = catalogContext(null);
        if (policyContext != null && !policyContext.isBlank()) context += "\nCHÍNH SÁCH:\n" + policyContext;
        AiSupportQuickAnswerResponse response = aiServiceClient.answerSupportQuickAction(
                new AiSupportQuickAnswerRequest(optionId, question, context));
        return response == null || response.answer() == null || response.answer().isBlank()
                ? "Hiện chưa có dữ liệu phù hợp để trả lời." : response.answer();
    }

    /** Sinh hướng dẫn guided từ context nghiệp vụ thật đã được Backend kiểm soát. */
    public String answerSupportGuidance(String optionId, String question, String context) {
        AiSupportQuickAnswerResponse response = aiServiceClient.answerSupportQuickAction(
                new AiSupportQuickAnswerRequest(optionId, question, context));
        return response == null || response.answer() == null || response.answer().isBlank()
                ? "Hiện chưa có đủ dữ liệu hệ thống để tư vấn chính xác." : response.answer();
    }

    /** Xếp hạng intent bằng embedding local ở AI Service, không dùng Gemini generate. */
    public List<AiSupportIntentResponse> suggestSupportIntents(String question) {
        return aiServiceClient.suggestSupportIntents(new AiSupportIntentRequest(question));
    }

    /** Giới hạn khách ẩn danh ở mức 20 request/phút trên mỗi địa chỉ mạng của Backend. */
    public boolean allow(String clientKey) {
        long now = System.currentTimeMillis();
        Window current = rateWindows.compute(clientKey, (key, old) ->
                old == null || now - old.startedAt() >= 60_000 ? new Window(now, 1) : new Window(old.startedAt(), old.count() + 1));
        return current.count() <= 20;
    }

    /** Cửa sổ đếm request tối thiểu cho rate limit public. */
    private record Window(long startedAt, int count) { }

    /** Lấy một tập nhỏ khóa học đang bán làm nguồn sự thật cho câu hỏi public. */
    private String catalogContext(String question) {
        List<CourseEntity> courses = courseRepository.findActiveCoursesForSale(
                question, null, null, PageRequest.of(0, 8)).getContent();
        if (courses.isEmpty()) {
            courses = courseRepository.findActiveCoursesForSale(null, null, null, PageRequest.of(0, 8)).getContent();
        }
        return courses.stream().map(this::formatCourse).reduce((left, right) -> left + "\n" + right)
                .orElse("Không có khóa học công khai khớp dữ liệu hiện tại.");
    }

    /** Định dạng dữ liệu khóa học và giá gói đang bán, không lấy dữ liệu riêng tư. */
    private String formatCourse(CourseEntity course) {
        List<CoursePackageEntity> packages = coursePackageRepository.findByCourseEntity_IdAndStatus(
                course.getId(), CoursePackageStatusEnum.ACTIVE);
        String prices = packages.stream().map(item -> item.getDeliveryMode() + "=" + item.getPrice())
                .reduce((left, right) -> left + ", " + right).orElse("chưa có gói");
        return String.format("id=%s; tên=%s; link=%s; cấp độ=%s; danh mục=%s; rating=%s; học viên=%s; gói/giá=%s",
                course.getId(), course.getName(), course.getLink(), course.getLevel(),
                course.getCategoryEntity() == null ? null : course.getCategoryEntity().getName(),
                course.getAvgRating(), course.getEnrollmentCount(), prices);
    }

    /** Sinh conversation ID opaque cho khách chưa đăng nhập. */
    public String newConversationId() {
        return "guest_" + UUID.randomUUID();
    }
}
