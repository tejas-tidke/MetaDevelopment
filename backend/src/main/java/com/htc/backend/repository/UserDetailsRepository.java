package com.htc.backend.repository;

import com.htc.backend.entity.UserDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserDetailsRepository extends JpaRepository<UserDetails, Long> {
    List<UserDetails> findAllByOwnerUserIdOrderByUpdatedAtDesc(String ownerUserId);
    List<UserDetails> findByUploadedFileId(Long uploadedFileId);
    List<UserDetails> findByUploadedFileIdAndOwnerUserId(Long uploadedFileId, String ownerUserId);
    Optional<UserDetails> findByPhoneNo(String phoneNo);
    Optional<UserDetails> findFirstByPhoneNoAndOwnerUserId(String phoneNo, String ownerUserId);
    List<UserDetails> findAllByPhoneNo(String phoneNo); // New method to handle multiple users with same phone number
    List<UserDetails> findAllByPhoneNoAndOwnerUserId(String phoneNo, String ownerUserId);
    List<UserDetails> findAllByEmailIn(Collection<String> emails);
    List<UserDetails> findAllByEmailInAndOwnerUserId(Collection<String> emails, String ownerUserId);
    List<UserDetails> findAllByIdInAndOwnerUserId(Collection<Long> ids, String ownerUserId);
}
