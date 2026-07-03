package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JwtAuthenticationResponse {
    private String accessToken;
    @Builder.Default
    private String tokenType = "Bearer";
    
    // Additional user info
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private List<String> roles;
    private List<String> permissions;
}
