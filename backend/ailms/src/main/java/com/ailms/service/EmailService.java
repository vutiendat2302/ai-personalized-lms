package com.ailms.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${app.frontend.set-password}")
    private String frontendUrl;
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

    @Override
    public void sendInviteEmail(String toEmail, String inviteLink) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("Lời mời tham gia hệ thống AILMS");
            log.info("Gui loi moi toi email {}", toEmail);
            helper.setText(buildInviteEmailContent(inviteLink), true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new EmailSendException(toEmail);
        }
    }

    private String buildInviteEmailContent(String inviteLink) {
        return """
                <div style="font-family: Arial, sans-serif;">
                    <h2>Chào mừng bạn đến với AILMS</h2>
                    <p>Bạn đã được mời tham gia hệ thống AILMS. Vui lòng click vào link bên dưới để đặt mật khẩu và kích hoạt tài khoản của bạn:</p>
                    <p><a href="%s" style="display:inline-block; background-color:#4CAF50; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Đặt mật khẩu và kích hoạt</a></p>
                    <p>Link này có hiệu lực trong vòng 24 giờ.</p>
                </div>
                """.formatted(inviteLink);
    }


    /**
     * Gửi email chứa liên kết thiết lập mật khẩu.
     *
     * @param toEmail email của người nhận
     * @param token token dùng để xác thực yêu cầu thiết lập mật khẩu
     */
    public void sendSetPasswordEmail(String toEmail, String token) {
        try {
            String setPasswordLink = frontendUrl + "/set-password?token=" + token;
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("Thiết lập mật khẩu tài khoản AILMS");
            helper.setText(buildSetPasswordEmailContent(setPasswordLink), true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new EmailSendException(toEmail);
        }
    }

    private String buildSetPasswordEmailContent(String setPasswordLink) {
        return """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Chào mừng bạn đến với AILMS!</h2>
            <p>Tài khoản của bạn đã được tạo thành công.</p>
            <p>Vui lòng nhấn vào nút bên dưới để thiết lập mật khẩu và kích hoạt tài khoản:</p>
            <p style="margin: 24px 0;">
                <a href="%s"
                   style="
                       background-color:#2563eb;
                       color:white;
                       padding:12px 24px;
                       text-decoration:none;
                       border-radius:6px;
                       display:inline-block;">
                    Thiết lập mật khẩu
                </a>
            </p>
            <p>Hoặc sao chép liên kết sau vào trình duyệt:</p>
            <p>%s</p>
            <p><strong>Lưu ý:</strong> Liên kết này sẽ hết hạn sau 24 giờ.</p>
            <p>Nếu bạn không mong đợi email này, vui lòng bỏ qua.</p>
            <br>
            <p>Trân trọng,<br>
            AILMS Team</p>
        </body>
        </html>
        """.formatted(setPasswordLink, setPasswordLink);
    }
}

