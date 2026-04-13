package com.htc.backend.whatsapp.repository;

import com.htc.backend.whatsapp.entity.WhatsAppFlowSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WhatsAppFlowSessionRepository extends JpaRepository<WhatsAppFlowSession, Long> {
    Optional<WhatsAppFlowSession> findFirstByPhoneNumberAndStatusOrderByUpdatedAtDesc(String phoneNumber, String status);
    List<WhatsAppFlowSession> findByPhoneNumberOrderByUpdatedAtDesc(String phoneNumber);
    Page<WhatsAppFlowSession> findAllByOrderByUpdatedAtDesc(Pageable pageable);
    Page<WhatsAppFlowSession> findByStatusOrderByUpdatedAtDesc(String status, Pageable pageable);
    Page<WhatsAppFlowSession> findByPhoneNumberOrderByUpdatedAtDesc(String phoneNumber, Pageable pageable);
    Page<WhatsAppFlowSession> findByFlowIdOrderByUpdatedAtDesc(String flowId, Pageable pageable);
    Page<WhatsAppFlowSession> findByPhoneNumberAndFlowIdOrderByUpdatedAtDesc(String phoneNumber, String flowId, Pageable pageable);
    Page<WhatsAppFlowSession> findByPhoneNumberAndStatusOrderByUpdatedAtDesc(String phoneNumber, String status, Pageable pageable);
    Page<WhatsAppFlowSession> findByFlowIdAndStatusOrderByUpdatedAtDesc(String flowId, String status, Pageable pageable);
    Page<WhatsAppFlowSession> findByPhoneNumberAndFlowIdAndStatusOrderByUpdatedAtDesc(
        String phoneNumber,
        String flowId,
        String status,
        Pageable pageable
    );
}
