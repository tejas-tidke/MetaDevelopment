package com.htc.backend.whatsapp.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.htc.backend.whatsapp.dto.StartFlowRequest;
import com.htc.backend.whatsapp.entity.WhatsAppEventLog;
import com.htc.backend.whatsapp.entity.WhatsAppFlowResult;
import com.htc.backend.whatsapp.entity.WhatsAppFlowSession;
import com.htc.backend.whatsapp.repository.WhatsAppEventLogRepository;
import com.htc.backend.whatsapp.repository.WhatsAppFlowResultRepository;
import com.htc.backend.whatsapp.repository.WhatsAppFlowSessionRepository;
import com.htc.backend.whatsapp.service.engine.FlowDefinitionRegistry;
import com.htc.backend.whatsapp.service.engine.WhatsAppPhoneNumberUtil;
import com.htc.backend.whatsapp.service.engine.WhatsAppFlowEngineService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/waba/conversations")
@CrossOrigin(origins = "http://localhost:5173")
public class WhatsAppConversationController {

    private final FlowDefinitionRegistry flowDefinitionRegistry;
    private final WhatsAppFlowEngineService whatsAppFlowEngineService;
    private final WhatsAppFlowSessionRepository flowSessionRepository;
    private final WhatsAppFlowResultRepository flowResultRepository;
    private final WhatsAppEventLogRepository eventLogRepository;
    private final ObjectMapper objectMapper;

    public WhatsAppConversationController(
        FlowDefinitionRegistry flowDefinitionRegistry,
        WhatsAppFlowEngineService whatsAppFlowEngineService,
        WhatsAppFlowSessionRepository flowSessionRepository,
        WhatsAppFlowResultRepository flowResultRepository,
        WhatsAppEventLogRepository eventLogRepository,
        ObjectMapper objectMapper
    ) {
        this.flowDefinitionRegistry = flowDefinitionRegistry;
        this.whatsAppFlowEngineService = whatsAppFlowEngineService;
        this.flowSessionRepository = flowSessionRepository;
        this.flowResultRepository = flowResultRepository;
        this.eventLogRepository = eventLogRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/flows")
    public Map<String, Object> getConfiguredFlows() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "success");
        response.put("data", flowDefinitionRegistry.getFlowSummaries());
        response.put("count", flowDefinitionRegistry.getFlowSummaries().size());
        return response;
    }

    @PostMapping("/flows/reload")
    public Map<String, Object> reloadFlows() {
        flowDefinitionRegistry.reload();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "success");
        response.put("message", "Flow definitions reloaded.");
        response.put("count", flowDefinitionRegistry.getFlowSummaries().size());
        return response;
    }

    @GetMapping("/sessions")
    public Map<String, Object> getSessions(
        @RequestParam(name = "phoneNumber", required = false) String phoneNumber,
        @RequestParam(name = "flowId", required = false) String flowId,
        @RequestParam(name = "status", required = false) String status,
        @RequestParam(name = "limit", defaultValue = "30") int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 200));
        Pageable pageable = PageRequest.of(0, safeLimit);

        String normalizedPhone = phoneNumber == null ? "" : WhatsAppPhoneNumberUtil.normalize(phoneNumber);
        String normalizedFlowId = normalize(flowId);
        String normalizedStatus = normalize(status).toUpperCase();

        Page<WhatsAppFlowSession> page = fetchSessions(normalizedPhone, normalizedFlowId, normalizedStatus, pageable);

        List<Map<String, Object>> sessions = new ArrayList<>();
        for (WhatsAppFlowSession session : page.getContent()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", session.getId());
            item.put("phoneNumber", session.getPhoneNumber());
            item.put("profileName", session.getProfileName());
            item.put("flowId", session.getFlowId());
            item.put("currentStepId", session.getCurrentStepId());
            item.put("status", session.getStatus());
            item.put("answers", tryParseJson(session.getAnswersJson()));
            item.put("context", tryParseJson(session.getContextJson()));
            item.put("startedAt", session.getStartedAt());
            item.put("lastInteractionAt", session.getLastInteractionAt());
            item.put("completedAt", session.getCompletedAt());
            item.put("updatedAt", session.getUpdatedAt());
            sessions.add(item);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "success");
        response.put("data", sessions);
        response.put("count", sessions.size());
        response.put("total", page.getTotalElements());
        return response;
    }

    @GetMapping("/results")
    public Map<String, Object> getResults(
        @RequestParam(name = "phoneNumber", required = false) String phoneNumber,
        @RequestParam(name = "flowId", required = false) String flowId,
        @RequestParam(name = "limit", defaultValue = "30") int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 200));
        Pageable pageable = PageRequest.of(0, safeLimit);

        String normalizedPhone = phoneNumber == null ? "" : WhatsAppPhoneNumberUtil.normalize(phoneNumber);
        String normalizedFlowId = normalize(flowId);
        Page<WhatsAppFlowResult> page = fetchResults(normalizedPhone, normalizedFlowId, pageable);

        List<Map<String, Object>> results = new ArrayList<>();
        for (WhatsAppFlowResult result : page.getContent()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", result.getId());
            item.put("sessionId", result.getSessionId());
            item.put("flowId", result.getFlowId());
            item.put("phoneNumber", result.getPhoneNumber());
            item.put("resultType", result.getResultType());
            item.put("score", result.getScore());
            item.put("resultCode", result.getResultCode());
            item.put("resultSummary", result.getResultSummary());
            item.put("resultJson", tryParseJson(result.getResultJson()));
            item.put("createdAt", result.getCreatedAt());
            item.put("updatedAt", result.getUpdatedAt());
            results.add(item);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "success");
        response.put("data", results);
        response.put("count", results.size());
        response.put("total", page.getTotalElements());
        return response;
    }

    @GetMapping("/events")
    public Map<String, Object> getEvents(
        @RequestParam(name = "phoneNumber", required = false) String phoneNumber,
        @RequestParam(name = "flowId", required = false) String flowId,
        @RequestParam(name = "direction", required = false) String direction,
        @RequestParam(name = "limit", defaultValue = "30") int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 200));
        Pageable pageable = PageRequest.of(0, safeLimit);
        String normalizedPhone = phoneNumber == null ? "" : WhatsAppPhoneNumberUtil.normalize(phoneNumber);
        String normalizedFlowId = normalize(flowId);
        String normalizedDirection = normalize(direction).toUpperCase();

        Page<WhatsAppEventLog> page = fetchEvents(normalizedPhone, normalizedFlowId, normalizedDirection, pageable);
        List<Map<String, Object>> events = new ArrayList<>();
        for (WhatsAppEventLog event : page.getContent()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", event.getId());
            item.put("direction", event.getDirection());
            item.put("eventType", event.getEventType());
            item.put("phoneNumber", event.getPhoneNumber());
            item.put("flowId", event.getFlowId());
            item.put("sessionId", event.getSessionId());
            item.put("waMessageId", event.getWaMessageId());
            item.put("status", event.getStatus());
            item.put("payload", tryParseJson(event.getPayloadJson()));
            item.put("response", tryParseJson(event.getResponseJson()));
            item.put("createdAt", event.getCreatedAt());
            events.add(item);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "success");
        response.put("data", events);
        response.put("count", events.size());
        response.put("total", page.getTotalElements());
        return response;
    }

    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startFlow(@RequestBody StartFlowRequest request) {
        Map<String, Object> response = new LinkedHashMap<>();
        if (request == null || request.getFlowId() == null || request.getFlowId().isBlank()
            || request.getPhoneNumber() == null || request.getPhoneNumber().isBlank()) {
            response.put("status", "error");
            response.put("message", "flowId and phoneNumber are required.");
            return ResponseEntity.badRequest().body(response);
        }

        boolean started = whatsAppFlowEngineService.startFlowById(
            request.getFlowId().trim(),
            request.getPhoneNumber().trim(),
            request.getProfileName()
        );
        if (!started) {
            response.put("status", "error");
            response.put("message", "Flow not found: " + request.getFlowId());
            return ResponseEntity.badRequest().body(response);
        }

        String normalizedPhone = WhatsAppPhoneNumberUtil.normalize(request.getPhoneNumber());
        String flowId = request.getFlowId().trim();
        response.put("status", "success");
        response.put("message", "Flow started.");

        eventLogRepository
            .findFirstByDirectionAndPhoneNumberAndFlowIdOrderByIdDesc("OUTBOUND", normalizedPhone, flowId)
            .ifPresent(event -> {
                response.put("outboundStatus", event.getStatus());
                response.put("outboundEventType", event.getEventType());
                response.put("outboundResponse", tryParseJson(event.getResponseJson()));
            });

        return ResponseEntity.ok(response);
    }

    private Page<WhatsAppFlowSession> fetchSessions(
        String phoneNumber,
        String flowId,
        String status,
        Pageable pageable
    ) {
        if (!phoneNumber.isBlank() && !flowId.isBlank() && !status.isBlank()) {
            return flowSessionRepository.findByPhoneNumberAndFlowIdAndStatusOrderByUpdatedAtDesc(phoneNumber, flowId, status, pageable);
        }
        if (!phoneNumber.isBlank() && !flowId.isBlank()) {
            return flowSessionRepository.findByPhoneNumberAndFlowIdOrderByUpdatedAtDesc(phoneNumber, flowId, pageable);
        }
        if (!phoneNumber.isBlank() && !status.isBlank()) {
            return flowSessionRepository.findByPhoneNumberAndStatusOrderByUpdatedAtDesc(phoneNumber, status, pageable);
        }
        if (!flowId.isBlank() && !status.isBlank()) {
            return flowSessionRepository.findByFlowIdAndStatusOrderByUpdatedAtDesc(flowId, status, pageable);
        }
        if (!phoneNumber.isBlank()) {
            return flowSessionRepository.findByPhoneNumberOrderByUpdatedAtDesc(phoneNumber, pageable);
        }
        if (!flowId.isBlank()) {
            return flowSessionRepository.findByFlowIdOrderByUpdatedAtDesc(flowId, pageable);
        }
        if (!status.isBlank()) {
            return flowSessionRepository.findByStatusOrderByUpdatedAtDesc(status, pageable);
        }
        return flowSessionRepository.findAllByOrderByUpdatedAtDesc(pageable);
    }

    private Page<WhatsAppFlowResult> fetchResults(
        String phoneNumber,
        String flowId,
        Pageable pageable
    ) {
        if (!phoneNumber.isBlank() && !flowId.isBlank()) {
            return flowResultRepository.findByPhoneNumberAndFlowIdOrderByCreatedAtDesc(phoneNumber, flowId, pageable);
        }
        if (!phoneNumber.isBlank()) {
            return flowResultRepository.findByPhoneNumberOrderByCreatedAtDesc(phoneNumber, pageable);
        }
        if (!flowId.isBlank()) {
            return flowResultRepository.findByFlowIdOrderByCreatedAtDesc(flowId, pageable);
        }
        return flowResultRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    private Page<WhatsAppEventLog> fetchEvents(
        String phoneNumber,
        String flowId,
        String direction,
        Pageable pageable
    ) {
        if (!phoneNumber.isBlank() && !flowId.isBlank()) {
            return eventLogRepository.findByPhoneNumberAndFlowIdOrderByCreatedAtDesc(phoneNumber, flowId, pageable);
        }
        if (!phoneNumber.isBlank()) {
            return eventLogRepository.findByPhoneNumberOrderByCreatedAtDesc(phoneNumber, pageable);
        }
        if (!flowId.isBlank()) {
            return eventLogRepository.findByFlowIdOrderByCreatedAtDesc(flowId, pageable);
        }
        if (!direction.isBlank()) {
            return eventLogRepository.findByDirectionOrderByCreatedAtDesc(direction, pageable);
        }
        return eventLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    private Object tryParseJson(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, Object.class);
        } catch (Exception ex) {
            return json;
        }
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value == null ? "" : value.trim();
    }
}
