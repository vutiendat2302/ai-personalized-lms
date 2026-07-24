package com.ailms.response;

public record FileExistenceResponse(boolean existsInMetadata,
                                    boolean existsInStorage,
                                    boolean exists) {
}
