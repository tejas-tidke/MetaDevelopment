package com.htc.backend.whatsapp.service.engine;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.htc.backend.whatsapp.entity.WhatsAppFlowTokenReference;
import com.htc.backend.whatsapp.repository.WhatsAppFlowTokenReferenceRepository;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Service
public class FlowTokenReferenceService {

    private final WhatsAppFlowTokenReferenceRepository tokenReferenceRepository;
    private final ObjectMapper objectMapper;

    public FlowTokenReferenceService(
        WhatsAppFlowTokenReferenceRepository tokenReferenceRepository,
        ObjectMapper objectMapper
    ) {
        this.tokenReferenceRepository = tokenReferenceRepository;
        this.objectMapper = objectMapper;
    }

    public void registerToken(
        String flowToken,
        String flowId,
        String flowName,
        String phoneNumber,
        String sourceType,
        String waMessageId,
        Map<String, Object> metadata
    ) {
        if (flowToken == null || flowToken.isBlank()) {
            return;
        }

        WhatsAppFlowTokenReference reference = tokenReferenceRepository
            .findFirstByFlowTokenOrderByUpdatedAtDesc(flowToken.trim())
            .orElseGet(WhatsAppFlowTokenReference::new);

        reference.setFlowToken(flowToken.trim());
        reference.setFlowId(blankToNull(flowId));
        reference.setFlowName(blankToNull(flowName));
        reference.setPhoneNumber(blankToNull(WhatsAppPhoneNumberUtil.normalize(phoneNumber)));
        reference.setSourceType(blankToNull(sourceType));
        reference.setWaMessageId(blankToNull(waMessageId));
        reference.setMetadataJson(toJson(metadata));
        tokenReferenceRepository.save(reference);
    }

    public Optional<WhatsAppFlowTokenReference> findByFlowToken(String flowToken) {
        if (flowToken == null || flowToken.isBlank()) {
            return Optional.empty();
        }
        return tokenReferenceRepository.findFirstByFlowTokenOrderByUpdatedAtDesc(flowToken.trim());
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

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
