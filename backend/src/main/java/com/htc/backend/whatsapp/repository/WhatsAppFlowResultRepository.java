package com.htc.backend.whatsapp.repository;

import com.htc.backend.whatsapp.entity.WhatsAppFlowResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WhatsAppFlowResultRepository extends JpaRepository<WhatsAppFlowResult, Long> {
    List<WhatsAppFlowResult> findBySessionId(Long sessionId);
    Page<WhatsAppFlowResult> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<WhatsAppFlowResult> findByPhoneNumberOrderByCreatedAtDesc(String phoneNumber, Pageable pageable);
    Page<WhatsAppFlowResult> findByFlowIdOrderByCreatedAtDesc(String flowId, Pageable pageable);
    Page<WhatsAppFlowResult> findByPhoneNumberAndFlowIdOrderByCreatedAtDesc(String phoneNumber, String flowId, Pageable pageable);
}
