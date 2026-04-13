package com.htc.backend.whatsapp.service.logging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.htc.backend.whatsapp.entity.WhatsAppEventLog;
import com.htc.backend.whatsapp.repository.WhatsAppEventLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class WhatsAppEventLogService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppEventLogService.class);

    private final WhatsAppEventLogRepository eventLogRepository;
    private final ObjectMapper objectMapper;

    public WhatsAppEventLogService(
        WhatsAppEventLogRepository eventLogRepository,
        ObjectMapper objectMapper
    ) {
        this.eventLogRepository = eventLogRepository;
        this.objectMapper = objectMapper;
    }

    public void logIncomingEvent(
        String eventType,
        String phoneNumber,
        String flowId,
        Long sessionId,
        String waMessageId,
        Object payload
    ) {
        persist("INBOUND", eventType, phoneNumber, flowId, sessionId, waMessageId, "RECEIVED", payload, null);
    }

    public void logOutgoingEvent(
        String eventType,
        String phoneNumber,
        String flowId,
        Long sessionId,
        String waMessageId,
        String status,
        Object payload,
        Object response
    ) {
        persist("OUTBOUND", eventType, phoneNumber, flowId, sessionId, waMessageId, status, payload, response);
    }

    private void persist(
        String direction,
        String eventType,
        String phoneNumber,
        String flowId,
        Long sessionId,
        String waMessageId,
        String status,
        Object payload,
        Object response
    ) {
        try {
            WhatsAppEventLog event = new WhatsAppEventLog();
            event.setDirection(direction);
            event.setEventType(eventType);
            event.setPhoneNumber(phoneNumber);
            event.setFlowId(flowId);
            event.setSessionId(sessionId);
            event.setWaMessageId(waMessageId);
            event.setStatus(status);
            event.setPayloadJson(toJson(payload));
            event.setResponseJson(toJson(response));
            eventLogRepository.save(event);

            log.info(
                "whatsapp_event direction={} type={} phone={} flow={} session={} waMessageId={} status={}",
                direction,
                eventType,
                phoneNumber,
                flowId,
                sessionId,
                waMessageId,
                status
            );
        } catch (Exception ex) {
            log.warn("Unable to persist WhatsApp event log: {}", ex.getMessage());
        }
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return String.valueOf(value);
        }
    }
}
