package com.htc.backend.whatsapp.repository;

import com.htc.backend.whatsapp.entity.WhatsAppEventLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface WhatsAppEventLogRepository extends JpaRepository<WhatsAppEventLog, Long> {
    Optional<WhatsAppEventLog> findFirstByDirectionAndPhoneNumberAndFlowIdOrderByIdDesc(
        String direction,
        String phoneNumber,
        String flowId
    );

    Page<WhatsAppEventLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<WhatsAppEventLog> findByPhoneNumberOrderByCreatedAtDesc(String phoneNumber, Pageable pageable);
    Page<WhatsAppEventLog> findByDirectionOrderByCreatedAtDesc(String direction, Pageable pageable);
    Page<WhatsAppEventLog> findByFlowIdOrderByCreatedAtDesc(String flowId, Pageable pageable);
    Page<WhatsAppEventLog> findByPhoneNumberAndFlowIdOrderByCreatedAtDesc(String phoneNumber, String flowId, Pageable pageable);

    List<WhatsAppEventLog> findByEventTypeAndWaMessageIdInOrderByCreatedAtDesc(String eventType, Collection<String> waMessageIds);
    List<WhatsAppEventLog> findByEventTypeAndPhoneNumberInOrderByCreatedAtDesc(String eventType, Collection<String> phoneNumbers);
}
