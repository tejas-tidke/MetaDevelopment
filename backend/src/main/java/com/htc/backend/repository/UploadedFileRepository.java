package com.htc.backend.repository;

import com.htc.backend.entity.UploadedFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UploadedFileRepository extends JpaRepository<UploadedFile, Long> {
    List<UploadedFile> findAllByOrderByUploadedAtDesc();
    List<UploadedFile> findAllByOwnerUserIdOrderByUploadedAtDesc(String ownerUserId);
    Optional<UploadedFile> findByIdAndOwnerUserId(Long id, String ownerUserId);
}
