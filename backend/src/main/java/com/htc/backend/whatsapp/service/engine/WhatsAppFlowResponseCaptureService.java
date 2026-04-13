package com.htc.backend.whatsapp.service.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.htc.backend.whatsapp.entity.WhatsAppFlowResult;
import com.htc.backend.whatsapp.entity.WhatsAppFlowSession;
import com.htc.backend.whatsapp.entity.WhatsAppFlowTokenReference;
import com.htc.backend.whatsapp.model.inbound.IncomingMessage;
import com.htc.backend.whatsapp.repository.WhatsAppFlowResultRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class WhatsAppFlowResponseCaptureService {

    private final FlowSessionService flowSessionService;
    private final FlowTokenReferenceService flowTokenReferenceService;
    private final WhatsAppFlowResultRepository flowResultRepository;
    private final ObjectMapper objectMapper;

    public WhatsAppFlowResponseCaptureService(
        FlowSessionService flowSessionService,
        FlowTokenReferenceService flowTokenReferenceService,
        WhatsAppFlowResultRepository flowResultRepository,
        ObjectMapper objectMapper
    ) {
        this.flowSessionService = flowSessionService;
        this.flowTokenReferenceService = flowTokenReferenceService;
        this.flowResultRepository = flowResultRepository;
        this.objectMapper = objectMapper;
    }

    public void captureNativeFlowResponse(IncomingMessage incomingMessage) {
        if (incomingMessage == null || incomingMessage.getPhoneNumber() == null || incomingMessage.getPhoneNumber().isBlank()) {
            return;
        }

        Map<String, Object> flowResponse = new LinkedHashMap<>(incomingMessage.getSafeFlowResponseData());
        String flowToken = firstNonBlank(
            incomingMessage.getFlowToken(),
            flowResponse.get("flow_token") != null ? String.valueOf(flowResponse.get("flow_token")) : null
        );

        Optional<WhatsAppFlowTokenReference> tokenRef = flowTokenReferenceService.findByFlowToken(flowToken);
        String resolvedFlowId = firstNonBlank(
            tokenRef.map(WhatsAppFlowTokenReference::getFlowId).orElse(null),
            tokenRef.map(WhatsAppFlowTokenReference::getFlowName).orElse(null),
            "meta_native_flow"
        );

        flowResponse.putIfAbsent("flow_token", flowToken);
        tokenRef.ifPresent(ref -> {
            if (ref.getFlowId() != null && !ref.getFlowId().isBlank()) {
                flowResponse.putIfAbsent("flow_id", ref.getFlowId());
            }
            if (ref.getFlowName() != null && !ref.getFlowName().isBlank()) {
                flowResponse.putIfAbsent("flow_name", ref.getFlowName());
            }
        });

        WhatsAppFlowSession session = flowSessionService.findActiveSession(incomingMessage.getPhoneNumber())
            .orElseGet(() -> flowSessionService.startSession(
                resolvedFlowId,
                incomingMessage.getPhoneNumber(),
                incomingMessage.getProfileName()
            ));

        if (!resolvedFlowId.equalsIgnoreCase(session.getFlowId())) {
            session = flowSessionService.startSession(
                resolvedFlowId,
                incomingMessage.getPhoneNumber(),
                incomingMessage.getProfileName()
            );
        }

        for (Map.Entry<String, Object> entry : flowResponse.entrySet()) {
            String key = sanitizeAnswerKey(entry.getKey());
            if (key.isBlank()) {
                continue;
            }
            session = flowSessionService.saveAnswer(
                session,
                "nfm_reply",
                key,
                entry.getValue(),
                entry.getValue() != null ? String.valueOf(entry.getValue()) : null,
                null,
                null
            );
        }

        flowSessionService.completeSession(session);

        WhatsAppFlowResult result = new WhatsAppFlowResult();
        result.setSessionId(session.getId());
        result.setFlowId(session.getFlowId());
        result.setPhoneNumber(session.getPhoneNumber());
        result.setResultType("nfm_reply");
        result.setResultCode("COMPLETED");
        result.setResultSummary("Captured native flow response.");
        result.setResultJson(toJson(flowResponse));
        flowResultRepository.save(result);
    }

    private String sanitizeAnswerKey(String key) {
        if (key == null) {
            return "";
        }
        return key.trim().toLowerCase().replaceAll("[^a-z0-9_]", "_");
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
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
