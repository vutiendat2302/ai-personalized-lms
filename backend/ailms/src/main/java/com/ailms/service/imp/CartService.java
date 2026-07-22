package com.ailms.service.imp;

import com.ailms.entity.CartItemEntity;
import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CartMapper;
import com.ailms.repository.CartItemRepository;
import com.ailms.repository.CoursePackageRepository;
import com.ailms.repository.UserRepository;
import com.ailms.response.CartItemResponse;
import com.ailms.service.ICartService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CartService implements ICartService {

    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final CoursePackageRepository coursePackageRepository;
    private final CartMapper cartMapper;
    private final ApplicationEventPublisher applicationEventPublisher;

    private static final String RESOURCE_NAME = "CartItem";

    @Transactional
    @Override
    public CartItemResponse addToCart(Long userId, Long coursePackageId) {
        log.info("Adding package {} to cart for user {}", coursePackageId, userId);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        CoursePackageEntity pkg = coursePackageRepository.findById(coursePackageId)
                .orElseThrow(() -> ResourceNotFoundException.of("CoursePackage", coursePackageId));

        if (pkg.getStatus() != CoursePackageStatusEnum.ACTIVE) {
            throw new BusinessException("Cannot add inactive course package to cart: " + pkg.getName());
        }

        if (cartItemRepository.existsByUserEntity_IdAndCoursePackageEntity_Id(userId, coursePackageId)) {
            throw new DuplicateResourceException("Item already in cart: " + coursePackageId);
        }

        CartItemEntity cartItem = CartItemEntity.builder()
                .userEntity(user)
                .coursePackageEntity(pkg)
                .build();

        CartItemEntity saved = cartItemRepository.save(cartItem);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "ADD_TO_CART", "CART_ITEM", saved.getId(), null, saved));
        return cartMapper.toResponse(saved);
    }

    @Override
    public List<CartItemResponse> getCart(Long userId) {
        log.info("Getting cart for user {}", userId);
        return cartMapper.toResponseList(cartItemRepository.findByUserEntity_Id(userId));
    }

    @Transactional
    @Override
    public void removeFromCart(Long userId, Long cartItemId) {
        log.info("Removing item {} from cart for user {}", cartItemId, userId);
        CartItemEntity item = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, cartItemId));

        if (!item.getUserEntity().getId().equals(userId)) {
            throw new BusinessException("Cart item does not belong to user");
        }

        cartItemRepository.delete(item);
    }

    @Transactional
    @Override
    public void clearCart(Long userId) {
        log.info("Clearing cart for user {}", userId);
        cartItemRepository.deleteByUserEntity_Id(userId);
    }
}
