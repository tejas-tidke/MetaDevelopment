package com.htc.backend.whatsapp.service.api;

import com.htc.backend.whatsapp.model.flow.FlowOptionDefinition;
import com.htc.backend.whatsapp.model.outbound.WhatsAppSendResult;
import com.htc.backend.whatsapp.service.logging.WhatsAppEventLogService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class WhatsAppCloudApiClient {

    private final RestTemplate restTemplate;
    private final WhatsAppEventLogService eventLogService;

    @Value("${waba.phone-number-id:}")
    private String phoneNumberId;

    @Value("${waba.access-token:}")
    private String accessToken;

    @Value("${waba.api-version:v19.0}")
    private String apiVersion;

    public WhatsAppCloudApiClient(
        RestTemplate restTemplate,
        WhatsAppEventLogService eventLogService
    ) {
        this.restTemplate = restTemplate;
        this.eventLogService = eventLogService;
    }

    public boolean isConfigured() {
        return phoneNumberId != null && !phoneNumberId.isBlank()
            && accessToken != null && !accessToken.isBlank();
    }

    public WhatsAppSendResult sendText(
        String to,
        String message,
        String flowId,
        Long sessionId
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("messaging_product", "whatsapp");
        payload.put("recipient_type", "individual");
        payload.put("to", to);
        payload.put("type", "text");

        Map<String, Object> text = new LinkedHashMap<>();
        text.put("preview_url", false);
        text.put("body", message);
        payload.put("text", text);

        return sendPayload("send_text", to, flowId, sessionId, payload);
    }

    public WhatsAppSendResult sendButtons(
        String to,
        String header,
        String body,
        String footer,
        List<FlowOptionDefinition> options,
        String flowId,
        Long sessionId
    ) {
        List<FlowOptionDefinition> safeOptions = options == null ? List.of() : options;
        if (safeOptions.isEmpty()) {
            return sendText(to, body, flowId, sessionId);
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("messaging_product", "whatsapp");
        payload.put("recipient_type", "individual");
        payload.put("to", to);
        payload.put("type", "interactive");

        Map<String, Object> interactive = new LinkedHashMap<>();
        interactive.put("type", "button");

        if (header != null && !header.isBlank()) {
            Map<String, Object> headerNode = new LinkedHashMap<>();
            headerNode.put("type", "text");
            headerNode.put("text", header);
            interactive.put("header", headerNode);
        }

        Map<String, Object> bodyNode = new LinkedHashMap<>();
        bodyNode.put("text", body);
        interactive.put("body", bodyNode);

        if (footer != null && !footer.isBlank()) {
            Map<String, Object> footerNode = new LinkedHashMap<>();
            footerNode.put("text", footer);
            interactive.put("footer", footerNode);
        }

        Map<String, Object> action = new LinkedHashMap<>();
        List<Map<String, Object>> buttons = new ArrayList<>();
        for (FlowOptionDefinition option : safeOptions) {
            if (option == null) {
                continue;
            }
            Map<String, Object> button = new LinkedHashMap<>();
            button.put("type", "reply");
            Map<String, Object> reply = new LinkedHashMap<>();
            reply.put("id", option.getId());
            reply.put("title", option.getTitle());
            button.put("reply", reply);
            buttons.add(button);
        }
        action.put("buttons", buttons);
        interactive.put("action", action);
        payload.put("interactive", interactive);

        return sendPayload("send_buttons", to, flowId, sessionId, payload);
    }

    public WhatsAppSendResult sendList(
        String to,
        String header,
        String body,
        String footer,
        String buttonText,
        List<FlowOptionDefinition> options,
        String flowId,
        Long sessionId
    ) {
        List<FlowOptionDefinition> safeOptions = options == null ? List.of() : options;
        if (safeOptions.isEmpty()) {
            return sendText(to, body, flowId, sessionId);
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("messaging_product", "whatsapp");
        payload.put("recipient_type", "individual");
        payload.put("to", to);
        payload.put("type", "interactive");

        Map<String, Object> interactive = new LinkedHashMap<>();
        interactive.put("type", "list");

        if (header != null && !header.isBlank()) {
            Map<String, Object> headerNode = new LinkedHashMap<>();
            headerNode.put("type", "text");
            headerNode.put("text", header);
            interactive.put("header", headerNode);
        }

        Map<String, Object> bodyNode = new LinkedHashMap<>();
        bodyNode.put("text", body);
        interactive.put("body", bodyNode);

        if (footer != null && !footer.isBlank()) {
            Map<String, Object> footerNode = new LinkedHashMap<>();
            footerNode.put("text", footer);
            interactive.put("footer", footerNode);
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (FlowOptionDefinition option : safeOptions) {
            if (option == null) {
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", option.getId());
            row.put("title", option.getTitle());
            if (option.getDescription() != null && !option.getDescription().isBlank()) {
                row.put("description", option.getDescription());
            }
            rows.add(row);
        }

        Map<String, Object> section = new LinkedHashMap<>();
        section.put("title", "Options");
        section.put("rows", rows);

        Map<String, Object> action = new LinkedHashMap<>();
        action.put("button", (buttonText == null || buttonText.isBlank()) ? "Select" : buttonText);
        action.put("sections", List.of(section));
        interactive.put("action", action);
        payload.put("interactive", interactive);

        return sendPayload("send_list", to, flowId, sessionId, payload);
    }

    private WhatsAppSendResult sendPayload(
        String eventType,
        String to,
        String flowId,
        Long sessionId,
        Map<String, Object> payload
    ) {
        if (!isConfigured()) {
            String message = "WABA configuration missing. Set waba.phone-number-id and waba.access-token.";
            eventLogService.logOutgoingEvent(eventType, to, flowId, sessionId, null, "CONFIG_ERROR", payload, message);
            return new WhatsAppSendResult(false, message, null, Map.of("error", message));
        }

        String url = String.format("https://graph.facebook.com/%s/%s/messages", apiVersion, phoneNumberId);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                requestEntity,
                new ParameterizedTypeReference<>() {}
            );
            Map<String, Object> body = response.getBody() != null ? response.getBody() : Map.of();
            String messageId = extractMessageId(body);
            eventLogService.logOutgoingEvent(
                eventType,
                to,
                flowId,
                sessionId,
                messageId,
                "SUCCESS",
                payload,
                body
            );
            return new WhatsAppSendResult(true, null, messageId, body);
        } catch (HttpClientErrorException ex) {
            String responseBody = ex.getResponseBodyAsString();
            eventLogService.logOutgoingEvent(
                eventType,
                to,
                flowId,
                sessionId,
                null,
                "HTTP_" + ex.getStatusCode().value(),
                payload,
                responseBody
            );
            return new WhatsAppSendResult(false, responseBody, null, Map.of("error", responseBody));
        } catch (Exception ex) {
            eventLogService.logOutgoingEvent(
                eventType,
                to,
                flowId,
                sessionId,
                null,
                "ERROR",
                payload,
                ex.getMessage()
            );
            return new WhatsAppSendResult(false, ex.getMessage(), null, Map.of("error", ex.getMessage()));
        }
    }

    @SuppressWarnings("unchecked")
    private String extractMessageId(Map<String, Object> responseBody) {
        Object messages = responseBody.get("messages");
        if (!(messages instanceof List<?> list) || list.isEmpty()) {
            return null;
        }
        Object first = list.get(0);
        if (!(first instanceof Map<?, ?> map)) {
            return null;
        }
        Object id = ((Map<String, Object>) map).get("id");
        return id == null ? null : String.valueOf(id);
    }
}
