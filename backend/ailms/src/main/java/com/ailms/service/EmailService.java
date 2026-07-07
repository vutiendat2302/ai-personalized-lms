package com.ailms.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import com.ailms.exception.EmailSendException;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService implements IEmailService {

    /**
     * JavaMailSender là Bean do Spring Boot cung cấp,
     * dùng để tạo và gửi email thông qua SMTP server.
     */
    private final JavaMailSender mailSender;

    /**
     * Gửi email chứa mã OTP đến người dùng.
     * @param toEmail Địa chỉ email người nhận
     * @param otp Mã OTP cần gửi
     */
    @Override
    public void sendOtpEmail(String toEmail, String otp) {
        try {
            // Tạo email mới.
            MimeMessage message = mailSender.createMimeMessage();

            // Hỗ trợ tạo email HTML và sử dụng UTF-8 để hiển thị tiếng Việt.
            MimeMessageHelper helper =
                    new MimeMessageHelper(message, true, "UTF-8");

            // Thiết lập người nhận.
            helper.setTo(toEmail);

            // Tiêu đề email.
            helper.setSubject("Mã xác thực đăng ký tài khoản AILMS");

            // Nội dung email ở dạng HTML.
            // Tham số 'true' cho biết đây là HTML thay vì plain text.
            helper.setText(buildOtpEmailContent(otp), true);

            // Gửi email thông qua SMTP server.
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new EmailSendException(toEmail);
        }
    }

    /**
     * Xây dựng nội dung email HTML chứa mã OTP.
     * Sử dụng Java Text Block (""") để viết HTML nhiều dòng
     * giúp code dễ đọc và dễ bảo trì.
     * @param otp Mã OTP cần hiển thị trong email
     * @return Nội dung email ở định dạng HTML
     */
    private String buildOtpEmailContent(String otp) {
        return """
                <div style="font-family: Arial, sans-serif;">
                    <h2>Xác thực tài khoản AILMS</h2>
                    <p>Mã OTP của bạn là:</p>
                    <h1 style="letter-spacing: 4px;">%s</h1>
                    <p>Mã có hiệu lực trong 3 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
                </div>
                """.formatted(otp);
    }

    @Override
    public void sendResetPasswordOtpEmail(String toEmail, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("Mã OTP đặt lại mật khẩu tài khoản AILMS");
            helper.setText(buildResetPasswordOtpEmailContent(otp), true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new EmailSendException(toEmail);
        }
    }

    private String buildResetPasswordOtpEmailContent(String otp) {
        return """
                <div style="font-family: Arial, sans-serif;">
                    <h2>Đặt lại mật khẩu tài khoản AILMS</h2>
                    <p>Mã OTP để đặt lại mật khẩu của bạn là:</p>
                    <h1 style="letter-spacing: 4px;">%s</h1>
                    <p>Mã có hiệu lực trong 3 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
                </div>
                """.formatted(otp);
    }

    @Override
    public void sendChangeEmailOtp(String toEmail, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("Mã OTP xác thực thay đổi email AILMS");
            helper.setText(buildChangeEmailOtpContent(otp), true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new EmailSendException(toEmail);
        }
    }

    private String buildChangeEmailOtpContent(String otp) {
        return """
                <div style="font-family: Arial, sans-serif;">
                    <h2>Thay đổi địa chỉ email AILMS</h2>
                    <p>Mã OTP để xác thực địa chỉ email mới của bạn là:</p>
                    <h1 style="letter-spacing: 4px;">%s</h1>
                    <p>Mã có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
                </div>
                """.formatted(otp);
    }

    @Override
    public void sendPasswordChangedNotification(String toEmail, LocalDateTime changedAt) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(toEmail);
            helper.setSubject("Mật khẩu tài khoản AILMS của bạn vừa được thay đổi");
            helper.setText(buildPasswordChangedContent(changedAt), true);

            mailSender.send(message);
        } catch (MessagingException e) {
            log.error("Gửi email thông báo đổi mật khẩu thất bại cho: {}", toEmail);
            // Không throw exception ở đây — việc đổi mật khẩu đã thành công rồi,
            // gửi email thất bại không nên làm fail cả request đổi mật khẩu.
        }
    }

    private String buildPasswordChangedContent(LocalDateTime changedAt) {
        String formattedTime = changedAt.format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"));
        return """
            <div style="font-family: Arial, sans-serif;">
                <h2>Mật khẩu của bạn vừa được thay đổi</h2>
                <p>Mật khẩu tài khoản AILMS của bạn đã được thay đổi thành công vào lúc:</p>
                <p><b>%s</b></p>
                <p>Nếu bạn không thực hiện thao tác này, vui lòng liên hệ ngay với bộ phận hỗ trợ
                để bảo vệ tài khoản của bạn.</p>
                <p> Hostline:datxinhtrai7a@gmail.com </p>
            </div>
            """.formatted(formattedTime);
    }
}
