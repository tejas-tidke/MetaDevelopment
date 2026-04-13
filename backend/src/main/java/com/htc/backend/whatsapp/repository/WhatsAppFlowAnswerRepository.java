package com.htc.backend.whatsapp.repository;

import com.htc.backend.whatsapp.entity.WhatsAppFlowAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WhatsAppFlowAnswerRepository extends JpaRepository<WhatsAppFlowAnswer, Long> {
    Optional<WhatsAppFlowAnswer> findBySessionIdAndAnswerKey(Long sessionId, String answerKey);
    List<WhatsAppFlowAnswer> findBySessionIdOrderByUpdatedAtAsc(Long sessionId);
}
