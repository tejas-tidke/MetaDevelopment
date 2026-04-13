package com.htc.backend.whatsapp.service.engine;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.htc.backend.whatsapp.entity.WhatsAppFlowAnswer;
import com.htc.backend.whatsapp.entity.WhatsAppFlowSession;
import com.htc.backend.whatsapp.repository.WhatsAppFlowAnswerRepository;
import com.htc.backend.whatsapp.repository.WhatsAppFlowSessionRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class FlowSessionService {

    private final WhatsAppFlowSessionRepository sessionRepository;
    private final WhatsAppFlowAnswerRepository answerRepository;
    private final ObjectMapper objectMapper;

    public FlowSessionService(
        WhatsAppFlowSessionRepository sessionRepository,
        WhatsAppFlowAnswerRepository answerRepository,
        ObjectMapper objectMapper
    ) {
        this.sessionRepository = sessionRepository;
        this.answerRepository = answerRepository;
        this.objectMapper = objectMapper;
    }

    public Optional<WhatsAppFlowSession> findActiveSession(String phoneNumber) {
        String normalizedPhone = WhatsAppPhoneNumberUtil.normalize(phoneNumber);
        if (normalizedPhone.isBlank()) {
            return Optional.empty();
        }
        return sessionRepository.findFirstByPhoneNumberAndStatusOrderByUpdatedAtDesc(normalizedPhone, "ACTIVE");
    }

    public WhatsAppFlowSession startSession(String flowId, String phoneNumber, String profileName) {
        String normalizedPhone = WhatsAppPhoneNumberUtil.normalize(phoneNumber);
        findActiveSession(normalizedPhone).ifPresent(existing -> {
            existing.setStatus("ABANDONED");
            existing.setCompletedAt(LocalDateTime.now());
            sessionRepository.save(existing);
        });

        WhatsAppFlowSession session = new WhatsAppFlowSession();
        session.setFlowId(flowId);
        session.setPhoneNumber(normalizedPhone);
        session.setProfileName(profileName);
        session.setStatus("ACTIVE");
        session.setAnswersJson("{}");
        session.setContextJson("{}");
        session.setStartedAt(LocalDateTime.now());
        session.setLastInteractionAt(LocalDateTime.now());
        return sessionRepository.save(session);
    }

    public WhatsAppFlowSession restartSession(WhatsAppFlowSession session) {
        session.setStatus("ACTIVE");
        session.setCurrentStepId(null);
        session.setCompletedAt(null);
        session.setAnswersJson("{}");
        session.setContextJson("{}");
        session.setLastInteractionAt(LocalDateTime.now());
        return sessionRepository.save(session);
    }

    public WhatsAppFlowSession updateCurrentStep(WhatsAppFlowSession session, String stepId) {
        session.setCurrentStepId(stepId);
        session.setLastInteractionAt(LocalDateTime.now());
        return sessionRepository.save(session);
    }

    public WhatsAppFlowSession completeSession(WhatsAppFlowSession session) {
        session.setStatus("COMPLETED");
        session.setCompletedAt(LocalDateTime.now());
        session.setLastInteractionAt(LocalDateTime.now());
        session.setCurrentStepId(null);
        return sessionRepository.save(session);
    }

    public WhatsAppFlowSession markSessionError(WhatsAppFlowSession session) {
        session.setStatus("ERROR");
        session.setCompletedAt(LocalDateTime.now());
        session.setLastInteractionAt(LocalDateTime.now());
        return sessionRepository.save(session);
    }

    public Map<String, Object> readAnswers(WhatsAppFlowSession session) {
        if (session == null || session.getAnswersJson() == null || session.getAnswersJson().isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(session.getAnswersJson(), new TypeReference<>() {});
        } catch (Exception ex) {
            return new LinkedHashMap<>();
        }
    }

    public WhatsAppFlowSession mergeAnswerUpdates(WhatsAppFlowSession session, Map<String, Object> updates) {
        if (updates == null || updates.isEmpty()) {
            return session;
        }
        Map<String, Object> current = readAnswers(session);
        current.putAll(updates);
        session.setAnswersJson(writeJson(current));
        session.setLastInteractionAt(LocalDateTime.now());
        return sessionRepository.save(session);
    }

    public WhatsAppFlowSession saveAnswer(
        WhatsAppFlowSession session,
        String stepId,
        String answerKey,
        Object answerValue,
        String answerLabel,
        Double scoreContribution,
        Map<String, Object> metadata
    ) {
        Map<String, Object> current = readAnswers(session);
        current.put(answerKey, answerValue);
        if (answerLabel != null && !answerLabel.isBlank()) {
            current.put(answerKey + "_label", answerLabel);
        }
        if (scoreContribution != null) {
            current.put(answerKey + "_score", scoreContribution);
        }
        if (metadata != null && !metadata.isEmpty()) {
            current.put(answerKey + "_metadata", metadata);
        }

        session.setAnswersJson(writeJson(current));
        session.setLastInteractionAt(LocalDateTime.now());
        WhatsAppFlowSession savedSession = sessionRepository.save(session);

        WhatsAppFlowAnswer answer = answerRepository.findBySessionIdAndAnswerKey(savedSession.getId(), answerKey)
            .orElseGet(WhatsAppFlowAnswer::new);
        answer.setSessionId(savedSession.getId());
        answer.setFlowId(savedSession.getFlowId());
        answer.setPhoneNumber(savedSession.getPhoneNumber());
        answer.setStepId(stepId);
        answer.setAnswerKey(answerKey);
        answer.setAnswerValue(writeJson(answerValue));
        answer.setAnswerLabel(answerLabel);
        answer.setScoreContribution(scoreContribution);
        answer.setMetadataJson(writeJson(metadata));
        answerRepository.save(answer);

        return savedSession;
    }

    private String writeJson(Object value) {
        try {
            return value == null ? null : objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return value == null ? null : String.valueOf(value);
        }
    }
}
