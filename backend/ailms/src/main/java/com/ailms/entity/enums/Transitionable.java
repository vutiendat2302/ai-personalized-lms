package com.ailms.entity.enums;

public interface Transitionable<T extends Enum<T>> {
    boolean canTransitionTo(T target);
}
