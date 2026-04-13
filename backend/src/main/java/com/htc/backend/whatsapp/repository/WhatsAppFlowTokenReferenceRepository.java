package com.htc.backend.whatsapp.repository;

import com.htc.backend.whatsapp.entity.WhatsAppFlowTokenReference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WhatsAppFlowTokenReferenceRepository extends JpaRepository<WhatsAppFlowTokenReference, Long> {
    Optional<WhatsAppFlowTokenReference> findFirstByFlowTokenOrderByUpdatedAtDesc(String flowToken);
}
