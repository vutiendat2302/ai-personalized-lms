package com.ailms.service;

import com.ailms.request.*;
import com.ailms.response.InterestResponse;
import com.ailms.response.PageResponse;

import java.util.List;

public interface IInterestService {

    InterestResponse createInterest(CreateInterestRequest request);

    InterestResponse updateInterest(Long id, UpdateInterestRequest request);

    InterestResponse updateStatus(Long id, InterestStatusRequest request);

    void delete(Long id);

    InterestResponse getInterestById(Long id);

    List<InterestResponse> getInterests();

    PageResponse<InterestResponse> search(InterestSearchRequest request);
}
