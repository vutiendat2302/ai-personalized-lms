package com.ailms.security;

import com.ailms.entity.*;
import com.ailms.exception.UsernameNotFoundException;
import com.ailms.repository.RolePermissionRepository;
import com.ailms.repository.UserRepository;
import com.ailms.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionEntityRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        UserEntity userEntity = userRepository.findByUsernameOrEmail(usernameOrEmail)
                .orElseThrow(() -> UsernameNotFoundException.of("Username or email", usernameOrEmail));

        // Fetch roles and permissions
        List<UserRoleEntity> userRoleEntities = userRoleRepository.findByUserEntity_Id(userEntity.getId());
        Set<GrantedAuthority> authorities = new HashSet<>();

        for (UserRoleEntity userRoleEntity : userRoleEntities) {
            RoleEntity roleEntity = userRoleEntity.getRoleEntity();
            authorities.add(new SimpleGrantedAuthority("ROLE_" + roleEntity.getCode().toUpperCase()));

            // Add Permissions as GrantedAuthority (e.g., course:create)
            List<RolePermissionEntity> rolePermissionEntities = rolePermissionEntityRepository.findByRoleEntity_Id(roleEntity.getId());

            for (RolePermissionEntity rolePermissionEntity : rolePermissionEntities) {
                PermissionEntity p = rolePermissionEntity.getPermissionEntity();
                authorities.add(new SimpleGrantedAuthority(p.getEntity() + "_" + p.getAction()));
            }
        }

        return new CustomUserDetails(userEntity, authorities);
    }
}
