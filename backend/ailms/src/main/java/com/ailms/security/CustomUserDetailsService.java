package com.ailms.security;

import com.ailms.entity.*;
import com.ailms.exception.UsernameNotFoundException;
import com.ailms.repository.RolePermissionRepository;
import com.ailms.repository.UserRepository;
import com.ailms.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Triển khai {@link UserDetailsService} của Spring Security.
 *
 * <p>Chịu trách nhiệm tải thông tin người dùng từ cơ sở dữ liệu
 * dựa trên username hoặc email, đồng thời ánh xạ các vai trò
 * (Role) và quyền (Permission) thành {@link GrantedAuthority}
 * để phục vụ quá trình xác thực và phân quyền.
 *
 * <p>Toàn bộ Role và Permission được tải bằng 2 query duy nhất
 * (thay vì query permission theo từng role trong vòng lặp) để
 * tránh vấn đề N+1 Query khi user có nhiều role.
 */

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    /**
     * Repository truy xuất thông tin người dùng.
     */
    private final UserRepository userRepository;

    /**
     * Repository truy xuất các vai trò của người dùng.
     */
    private final UserRoleRepository userRoleRepository;

    /**
     * Repository truy xuất các quyền của từng vai trò.
     */
    private final RolePermissionRepository rolePermissionRepository;

    /**
     * Tải thông tin người dùng theo username hoặc email.
     *
     * <p>Sau khi tìm thấy người dùng, phương thức sẽ tải toàn bộ
     * vai trò (Role) và quyền (Permission) tương ứng, sau đó chuyển
     * đổi thành {@link GrantedAuthority} để Spring Security sử dụng
     * trong quá trình xác thực và phân quyền.
     *
     * @param usernameOrEmail Username hoặc email của người dùng.
     * @return Đối tượng {@link UserDetails} chứa thông tin người dùng.
     * @throws UsernameNotFoundException Nếu không tìm thấy người dùng.
     */
    @Override
    @NonNull
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(@NonNull String usernameOrEmail) throws UsernameNotFoundException {
        // Tìm người dùng theo username hoặc email
        UserEntity userEntity = userRepository.findByUsernameOrEmail(usernameOrEmail)
                .orElseThrow(() -> UsernameNotFoundException.of("Username or email", usernameOrEmail));

        // lấy toàn bộ role của user, JOIN FETCH role
        List<UserRoleEntity> userRoleEntities =
                userRoleRepository.findByUserEntity_IdWithRole(userEntity.getId());

        // Trích xuất danh sách Role từ UserRole
        List<RoleEntity> roleEntities = userRoleEntities.stream()
                .map(UserRoleEntity::getRoleEntity)
                .toList();

        // Lấy tập hợp ID của các Role để truy vấn Permission
        Set<Long> roleIds = roleEntities.stream()
                .map(RoleEntity::getId)
                .collect(Collectors.toSet());

        // Lấy toàn bộ Permission của các Role trong một lần truy vấn
        List<RolePermissionEntity> rolePermissionEntities = roleIds.isEmpty()
                ? List.of()
                : rolePermissionRepository.findByRoleEntity_IdIn(roleIds);

        // Chuyển Role và Permission thành GrantedAuthority
        Set<GrantedAuthority> authorities = new HashSet<>();

        // Thêm Role với tiền tố ROLE_ theo chuẩn Spring Security
        for (RoleEntity roleEntity : roleEntities) {
            String roleCode = roleEntity.getCode().trim().toUpperCase();
            // Dữ liệu cũ có thể đã lưu sẵn tiền tố ROLE_. Không tạo ROLE_ROLE_ADMIN.
            authorities.add(new SimpleGrantedAuthority(
                    roleCode.startsWith("ROLE_") ? roleCode : "ROLE_" + roleCode));
        }

        // Thêm Permission (ví dụ: course_create, user_delete, ...)
        for (RolePermissionEntity rolePermissionEntity : rolePermissionEntities) {
            PermissionEntity permission = rolePermissionEntity.getPermissionEntity();
            authorities.add(new SimpleGrantedAuthority(permission.getEntity() + "_" + permission.getAction()));
        }

        // Trả về đối tượng UserDetails cho Spring Security
        return new CustomUserDetails(userEntity, authorities);
    }
}
