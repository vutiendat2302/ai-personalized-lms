package com.ailms.service.imp;

import com.ailms.service.ITrashable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Runs one trash operation in an isolated transaction so one bad item cannot roll back a batch. */
@Service
public class TrashItemTransactionExecutor {

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void hardDelete(ITrashable service, Long id) {
        service.hardDelete(id);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void restore(ITrashable service, Long id) {
        service.restore(id);
    }
}
