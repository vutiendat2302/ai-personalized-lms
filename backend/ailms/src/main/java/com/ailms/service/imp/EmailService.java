package com.ailms.service.imp;
import com.ailms.service.IEmailService;


import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
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
            String setPasswordLink = frontendUrl.endsWith("/set-password")
                    ? frontendUrl + "?token=" + token
                    : frontendUrl + "/set-password?token=" + token;
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

    @Override
    public void sendContractNotificationEmail(String toEmail, String fullName, String contractType, String downloadUrl) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("Thông báo ký kết hợp đồng lao động mới - AILMS");
            helper.setText(buildContractNotificationEmailContent(fullName, contractType, downloadUrl), true);
            mailSender.send(message);
            log.info("Contract email notification sent successfully to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send contract notification email to {}", toEmail, e);
        }
    }

    private String buildContractNotificationEmailContent(String fullName, String contractType, String downloadUrl) {
        return """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Kính chào anh/chị %s,</h2>
            <p>AILMS xin thông báo hợp đồng lao động của anh/chị đã được cập nhật thành công trên hệ thống:</p>
            <ul>
                <li><strong>Loại hợp đồng:</strong> %s</li>
                <li><strong>Trạng thái:</strong> Đang hoạt động (ACTIVE)</li>
            </ul>
            <p>Anh/chị có thể xem chi tiết và tải xuống file hợp đồng qua liên kết bên dưới:</p>
            <p style="margin: 24px 0;">
                <a href="%s"
                   style="
                       background-color:#2563eb;
                       color:white;
                       padding:12px 24px;
                       text-decoration:none;
                       border-radius:6px;
                       display:inline-block;">
                    Xem hợp đồng lao động
                </a>
            </p>
            <p>Hoặc sao chép liên kết sau vào trình duyệt:</p>
            <p>%s</p>
            <br>
            <p>Trân trọng,<br>
            AILMS HR Team</p>
        </body>
        </html>
        """.formatted(fullName, contractType, downloadUrl, downloadUrl);
    }

    @Override
    public void sendContractExpirationAlertEmail(String toEmail, String employeeName, String contractCode, LocalDate endDate) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("Cảnh báo: Hợp đồng lao động sắp hết hạn - AILMS");
            helper.setText(buildContractExpirationAlertEmailContent(employeeName, contractCode, endDate), true);
            mailSender.send(message);
            log.info("Contract expiration alert sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send contract expiration alert email to {}", toEmail, e);
        }
    }

    private String buildContractExpirationAlertEmailContent(String employeeName, String contractCode, LocalDate endDate) {
        String formattedDate = endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        return """
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h3>Thông báo hệ thống: Hợp đồng lao động sắp hết hạn</h3>
            <p>Kính gửi bộ phận nhân sự và quản trị viên,</p>
            <p>Hệ thống AILMS ghi nhận hợp đồng lao động sau đây sẽ hết hiệu lực trong vòng <strong>1 tuần nữa (vào ngày %s)</strong>:</p>
            <ul>
                <li><strong>Nhân viên:</strong> %s</li>
                <li><strong>Mã/Loại hợp đồng:</strong> %s</li>
                <li><strong>Ngày hết hạn:</strong> %s</li>
            </ul>
            <p>Vui lòng xem xét gia hạn hợp đồng mới hoặc thực hiện các nghiệp vụ liên quan.</p>
            <br>
            <p>Trân trọng,<br>
            AILMS System Notification Service</p>
        </body>
        </html>
        """.formatted(formattedDate, employeeName, contractCode, formattedDate);
    }

    @Override
    public void sendContractSigningLinkEmail(String toEmail, String employeeName, String signingLink, String otp,
                                             String setPasswordToken, LocalDateTime expiresAt) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("Hoàn tất tài khoản và ký Hợp đồng Lao động - AILMS");
            String formattedExpiresAt = expiresAt != null ? expiresAt.format(DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")) : "";
            String setPasswordSection = "";
            if (setPasswordToken != null && !setPasswordToken.isBlank()) {
                String setPasswordLink = frontendUrl.endsWith("/set-password")
                        ? frontendUrl + "?token=" + setPasswordToken
                        : frontendUrl + "/set-password?token=" + setPasswordToken;
                setPasswordSection = """
                    <div style="margin:20px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                      <h3 style="margin-top:0;color:#0f172a;">Bước 1 — Thiết lập mật khẩu tài khoản</h3>
                      <p>Thiết lập mật khẩu trước, sau đó quay lại email này để mở hợp đồng và ký.</p>
                      <p style="text-align:center"><a href="%s" style="background:#475569;color:white;padding:10px 22px;font-weight:bold;text-decoration:none;border-radius:6px;display:inline-block;">Thiết lập mật khẩu</a></p>
                    </div>
                    """.formatted(setPasswordLink);
            }
            helper.setText("""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #2563eb; margin-top: 0;">Mời ký điện tử Hợp đồng Lao động</h2>
                    <p>Kính chào anh/chị <strong>%s</strong>,</p>
                    <p>Bộ phận HR Công ty Cổ phần Giáo dục AILMS đã hoàn tất ký và gửi đến anh/chị bản Hợp đồng Lao động điện tử.</p>
                    <p>Vui lòng thực hiện lần lượt các bước bên dưới. Email OTP bảo mật sẽ chỉ được gửi khi anh/chị chủ động bắt đầu bước ký.</p>
                    %s
                    <h3 style="color:#0f172a;">Bước 2 — Xem và ký hợp đồng</h3>
                    <p style="margin: 28px 0; text-align: center;">
                        <a href="%s"
                           style="background-color: #2563eb; color: white; padding: 12px 28px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Truy cập Link Ký Hợp Đồng
                        </a>
                    </p>
                    <p style="font-size:13px;color:#64748b;background:#f8fafc;padding:12px;border-radius:6px;">
                      Mã OTP chỉ được gửi sau khi anh/chị mở hợp đồng và bấm chuyển sang bước <strong>Ký và xác thực OTP</strong>.
                    </p>
                    <p>Hoặc sao chép đường dẫn sau vào trình duyệt:</p>
                    <p style="word-break: break-all; color: #2563eb;"><a href="%s">%s</a></p>
                    <p style="font-size: 13px; color: #64748b;"><strong>Lưu ý:</strong> Liên kết này có thời hạn sử dụng đến <strong>%s</strong>. Vui lòng hoàn tất thao tác ký trước thời hạn nêu trên.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
                    <p style="font-size: 12px; color: #94a3b8;">Đây là email tự động từ Hệ thống Quản trị AILMS. Vui lòng không phản hồi lại email này.</p>
                </div>
            </body>
            </html>
            """.formatted(employeeName, setPasswordSection, signingLink, signingLink, signingLink, formattedExpiresAt), true);
            mailSender.send(message);
            log.info("Contract signing link email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send contract signing link email to {}", toEmail, e);
        }
    }

    @Override
    public void sendContractSigningOtpEmail(String toEmail, String employeeName, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("Mã OTP xác thực ký Hợp đồng Lao động - AILMS");
            helper.setText("""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #2563eb; margin-top: 0;">Mã OTP Xác Thực Ký Điện Tử</h2>
                    <p>Kính chào anh/chị <strong>%s</strong>,</p>
                    <p>Anh/chị đang thực hiện thao tác ký điện tử Hợp đồng Lao động trên Hệ thống AILMS.</p>
                    <p>Mã OTP xác thực của anh/chị là:</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; background: #eff6ff; padding: 10px 24px; border-radius: 8px; border: 1px dashed #2563eb;">%s</span>
                    </div>
                    <p style="font-size: 13px; color: #64748b;">Mã OTP này có hiệu lực trong vòng <strong>5 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai khác.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
                    <p style="font-size: 12px; color: #94a3b8;">Trân trọng,<br/>AILMS E-Sign Verification Service</p>
                </div>
            </body>
            </html>
            """.formatted(employeeName, otp), true);
            mailSender.send(message);
            log.info("Contract signing OTP sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send contract signing OTP email to {}", toEmail, e);
        }
    }

    @Override
    public void sendBulkEmail(java.util.List<String> toEmails, String subject, String content) {
        if (toEmails == null || toEmails.isEmpty()) {
            return;
        }
        for (String toEmail : toEmails) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(content, true);
                mailSender.send(message);
                log.info("Bulk email sent successfully to {}", toEmail);
            } catch (Exception e) {
                log.error("Failed to send bulk email to {}", toEmail, e);
            }
        }
    }
}
