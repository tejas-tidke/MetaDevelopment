package com.htc.backend.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.htc.backend.whatsapp.entity.WhatsAppEventLog;
import com.htc.backend.whatsapp.repository.WhatsAppEventLogRepository;
import com.htc.backend.whatsapp.service.engine.WhatsAppPhoneNumberUtil;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/waba")
@CrossOrigin(origins = "http://localhost:5173")
public class WabaMessageStatusController {

    private final WhatsAppEventLogRepository eventLogRepository;
    private final ObjectMapper objectMapper;

    public WabaMessageStatusController(
        WhatsAppEventLogRepository eventLogRepository,
        ObjectMapper objectMapper
    ) {
        this.eventLogRepository = eventLogRepository;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/message-statuses")
    public Map<String, Object> getMessageStatuses(@RequestBody(required = false) Map<String, Object> request) {
        Map<String, Object> safeRequest = request == null ? Map.of() : request;
        Set<String> messageIds = toStringSet(safeRequest.get("messageIds"));
        Set<String> recipients = toStringSet(safeRequest.get("recipients"))
            .stream()
            .map(WhatsAppPhoneNumberUtil::normalize)
            .filter(value -> !value.isBlank())
            .collect(Collectors.toCollection(LinkedHashSet::new));

        int requestedLimit = parseInt(safeRequest.get("limit"), 5000);
        int safeLimit = Math.max(100, Math.min(requestedLimit, 20000));

        List<WhatsAppEventLog> logs = new ArrayList<>();
        if (!messageIds.isEmpty()) {
            logs.addAll(eventLogRepository.findByEventTypeAndWaMessageIdInOrderByCreatedAtDesc("message_status", messageIds));
        }
        if (!recipients.isEmpty()) {
            logs.addAll(eventLogRepository.findByEventTypeAndPhoneNumberInOrderByCreatedAtDesc("message_status", recipients));
        }

        Map<Long, WhatsAppEventLog> uniqueById = new LinkedHashMap<>();
        for (WhatsAppEventLog log : logs) {
            if (log.getId() != null) {
                uniqueById.put(log.getId(), log);
            }
        }

        List<WhatsAppEventLog> uniqueLogs = new ArrayList<>(uniqueById.values());
        uniqueLogs.sort(Comparator.comparing(WhatsAppEventLog::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed());
        if (uniqueLogs.size() > safeLimit) {
            uniqueLogs = uniqueLogs.subList(0, safeLimit);
        }

        Map<String, Map<String, Object>> byMessageId = new LinkedHashMap<>();
        Map<String, Map<String, Object>> byRecipient = new LinkedHashMap<>();
        for (WhatsAppEventLog log : uniqueLogs) {
            Map<String, Object> payload = parsePayload(log.getPayloadJson());
            String messageId = firstNonBlank(payload.get("id"), log.getWaMessageId());
            String recipientId = WhatsAppPhoneNumberUtil.normalize(firstNonBlank(payload.get("recipient_id"), log.getPhoneNumber()));
            String status = normalizeStatus(firstNonBlank(payload.get("status"), log.getStatus()));

            Map<String, Object> statusRecord = new LinkedHashMap<>();
            statusRecord.put("waMessageId", messageId);
            statusRecord.put("recipientId", recipientId);
            statusRecord.put("status", status);
            statusRecord.put("timestamp", firstNonBlank(payload.get("timestamp")));
            statusRecord.put("errors", payload.get("errors"));
            statusRecord.put("errorMessage", extractErrorMessage(payload.get("errors")));
            statusRecord.put("createdAt", log.getCreatedAt());
            statusRecord.put("eventId", log.getId());

            if (messageId != null && !messageId.isBlank() && !byMessageId.containsKey(messageId)) {
                byMessageId.put(messageId, statusRecord);
            }
            if (recipientId != null && !recipientId.isBlank() && !byRecipient.containsKey(recipientId)) {
                byRecipient.put(recipientId, statusRecord);
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "success");
        response.put("requestedMessageIds", messageIds.size());
        response.put("requestedRecipients", recipients.size());
        response.put("matchedByMessageId", byMessageId.size());
        response.put("matchedByRecipient", byRecipient.size());
        response.put("byMessageId", byMessageId);
        response.put("byRecipient", byRecipient);
        return response;
    }

    private Set<String> toStringSet(Object value) {
        Set<String> items = new LinkedHashSet<>();
        if (value instanceof Collection<?> collection) {
            for (Object item : collection) {
                String normalized = firstNonBlank(item);
                if (normalized != null && !normalized.isBlank()) {
                    items.add(normalized);
                }
            }
        } else if (value instanceof String raw) {
            for (String part : raw.split(",")) {
                String normalized = firstNonBlank(part);
                if (normalized != null && !normalized.isBlank()) {
                    items.add(normalized);
                }
            }
        }
        return items;
    }

    private String extractErrorMessage(Object errorsObj) {
        if (!(errorsObj instanceof List<?> errors) || errors.isEmpty()) {
            return null;
        }
        Object firstError = errors.get(0);
        if (!(firstError instanceof Map<?, ?> errorMap)) {
            return String.valueOf(firstError);
        }

        String code = firstNonBlank(errorMap.get("code"));
        String title = firstNonBlank(errorMap.get("title"));
        String message = firstNonBlank(errorMap.get("message"));

        StringBuilder builder = new StringBuilder();
        if (code != null && !code.isBlank()) {
            builder.append(code);
        }
        if (title != null && !title.isBlank()) {
            if (builder.length() > 0) builder.append(" - ");
            builder.append(title);
        }
        if (message != null && !message.isBlank()) {
            if (builder.length() > 0) builder.append(": ");
            builder.append(message);
        }
        return builder.length() == 0 ? null : builder.toString();
    }

    private Map<String, Object> parsePayload(String payloadJson) {
        if (payloadJson == null || payloadJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(payloadJson, new TypeReference<>() {});
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private int parseInt(Object value, int fallback) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text) {
            try {
                return Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "unknown";
        }
        return status.trim().toLowerCase(Locale.ROOT);
    }

    private String firstNonBlank(Object... values) {
        if (values == null) {
            return null;
        }
        for (Object value : values) {
            if (value == null) {
                continue;
            }
            String text = String.valueOf(value).trim();
            if (!text.isBlank()) {
                return text;
            }
        }
        return null;
    }
}
