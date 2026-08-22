package com.ailms.request;

import lombok.Getter;
import lombok.Setter;

/** Các cờ quản trị bài đăng chỉ dành cho staff phụ trách lớp. */
@Getter
@Setter
public class ClassStreamPostModerationRequest {
    private Boolean pinned;
    private Boolean commentLocked;
    private Boolean hidden;
}
