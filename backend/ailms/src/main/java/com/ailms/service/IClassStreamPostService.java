package com.ailms.service;

import com.ailms.request.CreateClassStreamPostRequest;
import com.ailms.response.ClassStreamPostResponse;
import com.ailms.response.PageResponse;

public interface IClassStreamPostService {
    ClassStreamPostResponse createPost(Long classId, CreateClassStreamPostRequest request);
    PageResponse<ClassStreamPostResponse> getPostsPage(Long classId, int page, int size);
    void deletePost(Long postId);
}
