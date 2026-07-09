package com.ailms.service;

import com.ailms.entity.AuditLogEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.UserStatusEntity;
import com.ailms.exception.*;
import com.ailms.repository.AuditLogRepository;
import com.ailms.repository.UserRepository;
import com.ailms.request.*;
import com.ailms.response.JwtAuthenticationResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.security.CustomUserDetailsService;
import com.ailms.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
/**
 * Service xử lý các chức năng xác thực người dùng.
 *
 * <p>Cung cấp các nghiệp vụ:
 * <ul>
 *     <li>Đăng ký tài khoản.</li>
 *     <li>Đăng nhập và cấp JWT.</li>
 *     <li>Cấp mới Access Token bằng Refresh Token.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class AuthService implements IAuthService{ // login - register

    /**
     * Quản lý quá trình xác thực người dùng.
     */
    private final AuthenticationManager authenticationManager;
    /**
     * Tiện ích tạo và xác thực JWT.
     */
    private final JwtUtils jwtUtils;
    /**
     * Repository thao tác với bảng người dùng.
     */
    private final UserRepository userRepository;

    /**
     * Mã hóa mật khẩu trước khi lưu vào cơ sở dữ liệu.
     */
    private final PasswordEncoder passwordEncoder;
    /**
     * Service tải thông tin người dùng phục vụ Authentication.
     */
    private final CustomUserDetailsService customUserDetailsService;

    private final IOtpService otpService;
    private final IEmailService emailService;
    private final AuditLogRepository auditLogRepository;
    private final RedisTemplate<String, String> redisTemplate;

    private static final String OTP_PURPOSE_REGISTER = "register";
    private static final String OTP_PURPOSE_FORGOT_PASSWORD = "forgot-password";

    private static final Duration REGISTER_OTP_TTL = Duration.ofMinutes(5);
    private static final Duration FORGOT_PASSWORD_OTP_TTL = Duration.ofMinutes(3);

    private static final String INVALIDATE_TOKEN_PREFIX = "invalidate:token:user:";
    private final IAuditLogService auditLogService;
    private final UserService userService;

    /**
     * Đăng ký tài khoản mới.
     *
     * <p>Tài khoản được tạo với trạng thái {@code PENDING_VERIFICATION}
     * (chưa thể đăng nhập). Hệ thống sinh mã OTP, lưu vào Redis (TTL 5 phút)
     * và gửi qua email. Người dùng cần gọi {@link #verifyRegistrationOtp}
     * để kích hoạt tài khoản.
     *
     * @param request Thông tin đăng ký.
     */
    public void register(RegisterRequest request) {
        // Kiểm tra username hoặc email đã tồn tại
        if (userRepository.findByUsernameOrEmail(request.getUsername()).isPresent() ||
            userRepository.findByUsernameOrEmail(request.getEmail()).isPresent()) {
            throw DuplicateResourceException.of("User", "username/email", request.getUsername() + "/" + request.getEmail());
        }

        UserEntity userEntity = new UserEntity();
        userEntity.setUsername(request.getUsername());
        userEntity.setEmail(request.getEmail());
        userEntity.setFullName(request.getFullName());
        userEntity.setStatus(UserStatusEntity.ACTIVE);
        userEntity.setGender(request.getGender());
        // atStartOfDay: format LocalDate -> LocalDatetime
        if (request.getDateOfBirth() != null) {
            userEntity.setDateOfBirth(request.getDateOfBirth().atStartOfDay());
        } else {
            userEntity.setDateOfBirth(null);
        }
        // Chưa xác thực email -> chưa cho login
        userEntity.setStatus(UserStatusEntity.PENDING_VERIFICATION);
        userEntity.setPhone(request.getPhone());
        // Mã hóa mật khẩu trước khi lưu
        userEntity.setPasswordHash(passwordEncoder.encode(request.getPassword()));

        userRepository.save(userEntity);

        // Sinh OTP + gửi email xác thực
        String otp = otpService.generateAndStoreOtp(request.getEmail(), OTP_PURPOSE_REGISTER, REGISTER_OTP_TTL);
        emailService.sendOtpEmail(request.getEmail(), otp);
    }

    /**
     * Xác thực OTP đăng ký, kích hoạt tài khoản nếu mã hợp lệ.
     */
    @Override
    public void verifyRegistrationOtp(String email, String otp) {
        boolean valid = otpService.verifyOtp(email,OTP_PURPOSE_REGISTER, otp);
        if (!valid) {
            throw new BadRequestException("Mã OTP không đúng hoặc đã hết hạn.");
        }

        UserEntity userEntity = userRepository.findByUsernameOrEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản với email: " + email));

        userEntity.setStatus(UserStatusEntity.ACTIVE);
        userRepository.save(userEntity);

        // Xoá OTP sau khi dùng, tránh verify lại nhiều lần bằng mã cũ
        otpService.invalidateOtp(email, OTP_PURPOSE_REGISTER);
    }

    /**
     * Gửi lại OTP mới, ghi đè OTP cũ trong Redis.
     */
    @Override
    public void resendOtp(String email) {
        UserEntity userEntity = userRepository.findByUsernameOrEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản với email: " + email));

        if (userEntity.getStatus() == UserStatusEntity.ACTIVE) {
            throw new BusinessException("Tài khoản đã được xác thực trước đó.");
        }

        String otp = otpService.generateAndStoreOtp(email, OTP_PURPOSE_REGISTER, REGISTER_OTP_TTL);
        emailService.sendOtpEmail(email, otp);
    }

    /**
     * Xác thực người dùng và cấp JWT.
     *
     * <p>Sau khi xác thực thành công, phương thức sẽ sinh
     * Access Token, Refresh Token và trả về thông tin người dùng.
     *
     * @param loginRequest Thông tin đăng nhập.
     * @return Thông tin xác thực và JWT.
     */
    public JwtAuthenticationResponse login(LoginRequest loginRequest) {
        // Xác thực username/email và mật khẩu
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsernameOrEmail(),
                        loginRequest.getPassword()
                )
        );

        // Lưu Authentication vào SecurityContext
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Sinh Access Token và Refresh Token
        String jwt = jwtUtils.generateJwtToken(authentication);
        String refreshToken = jwtUtils.generateRefreshToken(authentication.getName());

        // Lấy thông tin người dùng đã xác thực
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        userDetails.getUser().setLastLoginAt(LocalDateTime.now());
        auditLogService.log("Login", "user", userDetails, null, null);
        return buildAuthResponse(userDetails, jwt, refreshToken);
    }

    /**
     * Cấp mới Access Token bằng Refresh Token.
     *
     * <p>Refresh Token hợp lệ sẽ được sử dụng để tạo
     * Access Token mới và Refresh Token mới.
     *
     * @param refreshToken Refresh Token hiện tại.
     * @return JWT mới cùng thông tin người dùng.
     */
    public JwtAuthenticationResponse refreshToken(String refreshToken) {
        // Kiểm tra Refresh Token có hợp lệ hay không
        if (!jwtUtils.validateJwtToken(refreshToken)) {
            throw new InvalidTokenException("Invalid refresh token"); // chua bat loi global
        }

        // Lấy username từ Refresh Token
        String username = jwtUtils.getUserNameFromJwtToken(refreshToken);

        // Tải thông tin người dùng
        CustomUserDetails userDetails = (CustomUserDetails) customUserDetailsService.loadUserByUsername(username);

        // Tạo Authentication để sinh Access Token mới
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

        // Sinh Access Token và Refresh Token mới
        String newAccessToken = jwtUtils.generateJwtToken(authentication); // cấp access token new
        String newRefreshToken = jwtUtils.generateRefreshToken(username);   // sinh token refresh ms -> tránh token cũ bị lộ

        return buildAuthResponse(userDetails, newAccessToken, newRefreshToken);
    }

    /**
     * Xây dựng {@link JwtAuthenticationResponse} từ thông tin user đã xác thực.
     *
     * @param userDetails  Thông tin người dùng đã xác thực.
     * @param accessToken  Access Token vừa sinh.
     * @param refreshToken Refresh Token vừa sinh.
     * @return Response chứa token và thông tin người dùng.
     */
    private JwtAuthenticationResponse buildAuthResponse(CustomUserDetails userDetails,
                                                        String accessToken,
                                                        String refreshToken) {
        List<String> roles = extractRoles(userDetails);
        List<String> permissions = extractPermissions(userDetails);

        return JwtAuthenticationResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .id(userDetails.getUser().getId())
                .username(userDetails.getUsername())
                .email(userDetails.getUser().getEmail())
                .fullName(userDetails.getUser().getFullName())
                .roles(roles)
                .permissions(permissions)
                .build();
    }

    /**
     * Trích danh sách role (dạng "ROLE_XXX") từ authorities của user.
     */
    private List<String> extractRoles(CustomUserDetails userDetails) {
        return userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(Objects::nonNull)
                .filter(auth -> auth.startsWith("ROLE_"))
                .toList();
    }

    /**
     * Trích danh sách permission (không có tiền tố ROLE_) từ authorities của user.
     */
    private List<String> extractPermissions(CustomUserDetails userDetails) {
        return userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(Objects::nonNull)
                .filter(auth -> !auth.startsWith("ROLE_"))
                .toList();
    }

    /**
     * Thay đổi mật khẩu của người dùng đang đăng nhập. Sau khi đăng nhập vào hệ thống
     * Quy trình:
     * 1. Kiểm tra mật khẩu mới và mật khẩu xác nhận có khớp nhau không.
     * 2. Lấy thông tin người dùng từ cơ sở dữ liệu.
     * 3. Xác thực mật khẩu hiện tại.
     * 4. Mã hóa (BCrypt) và cập nhật mật khẩu mới.
     * 5. Ghi nhận lịch sử thao tác vào bảng audit_log.
     * 6. Vô hiệu hóa toàn bộ JWT cũ bằng Redis để buộc đăng nhập lại.
     */
    @Override
    public void changePassword(Long userId, ChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Mật khẩu xác nhận không khớp.");
        }

        UserEntity userEntity = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng."));

        if (!passwordEncoder.matches(request.getOldPassword(), userEntity.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu cũ không chính xác.");
        }

        userEntity.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(userEntity);

        auditLogService.log("Change Password", "User", userId, null, null);
        invalidateAllTokens(userEntity.getEmail());

        // Gửi email thông báo đổi mật khẩu thành công
        emailService.sendPasswordChangedNotification(userEntity.getEmail(), LocalDateTime.now());
    }

    /**
     * Khởi tạo quy trình quên mật khẩu.
     * Quy trình:
     * 1. Tìm người dùng theo user or email.
     * 2. Sinh mã OTP ngẫu nhiên gồm 6 chữ số.
     * 3. Lưu OTP vào Redis với thời gian sống 3 phút.
     * 4. Gửi OTP đến email đã đăng ký của người dùng.
     */
    @Override
    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByUsernameOrEmail(request.getUsernameOrEmail())
                .ifPresent(user -> {
                    String otp = otpService.generateAndStoreOtp(
                            user.getEmail(),
                            OTP_PURPOSE_FORGOT_PASSWORD,
                            FORGOT_PASSWORD_OTP_TTL
                    );
                    emailService.sendResetPasswordOtpEmail(user.getEmail(), otp);
                    auditLogService.log("Forgot Password", "User", user, null, null);
                });
    }

    /**
     * Đặt lại mật khẩu sau khi người dùng xác thực OTP thành công.
     * Quy trình:
     * 1. Kiểm tra mật khẩu mới và mật khẩu xác nhận.
     * 2. Tìm người dùng theo username hoặc email.
     * 3. Xác thực mã OTP trong Redis.
     * 4. Mã hóa (BCrypt) và cập nhật mật khẩu mới.
     * 5. Xóa OTP đã sử dụng khỏi Redis.
     * 6. Ghi nhận lịch sử thao tác vào audit_log.
     * 7. Vô hiệu hóa toàn bộ JWT hiện có, yêu cầu người dùng đăng nhập lại.
     */
    @Override
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Mật khẩu xác nhận không khớp.");
        }

        UserEntity user = userRepository.findByUsernameOrEmail(request.getUsernameOrEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với thông tin cung cấp."));

        boolean valid = otpService.verifyOtp(user.getEmail(), OTP_PURPOSE_FORGOT_PASSWORD, request.getOtp());

        if (!valid) {
            throw new BadRequestException("Mã OTP không đúng hoặc đã hết hạn.");
        }

        // Hash và update password
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Xóa/vô hiệu hóa OTP đã dùng
        otpService.invalidateOtp(user.getEmail(), OTP_PURPOSE_FORGOT_PASSWORD);

        // Ghi nhận lịch sử thao tác
        auditLogService.log("Reset Password", "User", user, null, null);

        invalidateAllTokens(user.getEmail());

        emailService.sendPasswordChangedNotification(user.getEmail(), LocalDateTime.now());
    }

    private void invalidateAllTokens(String email) {
        String invalidateKey = INVALIDATE_TOKEN_PREFIX + email;
        redisTemplate.opsForValue().set(invalidateKey, String.valueOf(System.currentTimeMillis()));
    }

    @Override
    public void resendForgotPasswordOtp(String usernameOrEmail) {
        userRepository.findByUsernameOrEmail(usernameOrEmail)
                .ifPresent(user -> {
                    String otp = otpService.generateAndStoreOtp(
                            user.getEmail(),
                            OTP_PURPOSE_FORGOT_PASSWORD,
                            FORGOT_PASSWORD_OTP_TTL
                    );
                    emailService.sendResetPasswordOtpEmail(user.getEmail(), otp);
                });
    }

    @Override
    public void setPassword(SetPasswordRequest request) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Mật khẩu xác nhận không khớp.");
        }

        // Kiểm tra token
        if (!jwtUtils.validateJwtToken(request.getToken())) {
            throw new InvalidTokenException("Liên kết thiết lập mật khẩu không hợp lệ hoặc đã hết hạn.");
        }

        Long userId = jwtUtils.getUserIdFromJwtToken(request.getToken());

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng."));

        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setStatus(UserStatusEntity.ACTIVE);
        userRepository.save(user);
        auditLogService.log("Set Password", "User", user, null, null);
    }
}
