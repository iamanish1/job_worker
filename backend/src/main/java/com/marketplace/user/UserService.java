package com.marketplace.user;

import com.marketplace.auth.AuthenticatedUser;
import com.marketplace.common.exception.NotFoundException;
import com.marketplace.user.dto.UpdateProfileRequest;
import com.marketplace.user.dto.UserProfileDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserProfileDTO getProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User", userId));
        return toDTO(user);
    }

    @Transactional
    public UserProfileDTO updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User", userId));

        if (request.name() != null)         user.setName(request.name());
        if (request.email() != null) {
            if (userRepository.existsByEmailAndIdNot(request.email(), userId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
            }
            user.setEmail(request.email());
        }
        if (request.profilePhoto() != null) user.setProfilePhoto(request.profilePhoto());
        if (request.fcmToken() != null)     user.setFcmToken(request.fcmToken());

        return toDTO(userRepository.save(user));
    }

    public User getById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User", userId));
    }

    private UserProfileDTO toDTO(User user) {
        return new UserProfileDTO(
            user.getId(), user.getPhone(), user.getName(),
            user.getEmail(), user.getProfilePhoto(), user.getRole()
        );
    }
}
