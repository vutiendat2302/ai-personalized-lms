package com.ailms.service.base;

import com.ailms.repository.base.BaseRepository;
import com.ailms.mapper.base.EntityMapper;
import com.ailms.exception.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Transactional(readOnly = true)
public abstract class BaseService<T, ID, CreateDto, UpdateDto, ResponseDto> {

    protected abstract BaseRepository<T, ID> getRepository();
    protected abstract EntityMapper<T, CreateDto, UpdateDto, ResponseDto> getMapper();
    protected abstract String getResourceName();

    @Transactional
    public ResponseDto create(CreateDto dto) {
        T entity = getMapper().toEntity(dto);
        return getMapper().toResponse(getRepository().save(entity));
    }

    public ResponseDto getById(ID id) {
        T entity = getRepository().findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(getResourceName(), id));
        return getMapper().toResponse(entity);
    }

    public List<ResponseDto> getAllList() {
        return getRepository().findAll().stream().map(getMapper()::toResponse).toList();
    }

    public Page<ResponseDto> getAll(Pageable pageable) {
        return getRepository().findAll(pageable).map(getMapper()::toResponse);
    }

    @Transactional
    public ResponseDto update(ID id, UpdateDto dto) {
        T entity = getRepository().findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(getResourceName(), id));
        getMapper().updateEntity(dto, entity);
        return getMapper().toResponse(getRepository().save(entity));
    }

    @Transactional
    public void delete(ID id) {
        if (!getRepository().existsById(id)) {
            throw ResourceNotFoundException.of(getResourceName(), id);
        }
        getRepository().deleteById(id);
    }
}
