package com.htc.backend.repository;

import com.htc.backend.entity.UserDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserDetailsRepository extends JpaRepository<UserDetails, Long> {
    List<UserDetails> findAll();
    List<UserDetails> findByUploadedFileId(Long uploadedFileId);
    Optional<UserDetails> findByPhoneNo(String phoneNo);
    List<UserDetails> findAllByPhoneNo(String phoneNo); // New method to handle multiple users with same phone number
    List<UserDetails> findAllByEmailIn(Collection<String> emails);
}
