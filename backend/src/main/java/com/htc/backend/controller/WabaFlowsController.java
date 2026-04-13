package com.htc.backend.controller;

import com.htc.backend.dto.SendFlowRequest;
import com.htc.backend.whatsapp.service.engine.FlowTokenReferenceService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/waba")
@CrossOrigin(origins = "http://localhost:5173")
public class WabaFlowsController {

    @Value("${waba.id:}")
    private String businessAccountId;

    @Value("${waba.phone-number-id:}")
    private String phoneNumberId;

    @Value("${waba.access-token:}")
    private String accessToken;

    @Value("${waba.api-version:v19.0}")
    private String apiVersion;

    private final RestTemplate restTemplate;
    private final FlowTokenReferenceService flowTokenReferenceService;

    public WabaFlowsController(RestTemplate restTemplate, FlowTokenReferenceService flowTokenReferenceService) {
        this.restTemplate = restTemplate;
        this.flowTokenReferenceService = flowTokenReferenceService;
    }

    @GetMapping("/flows")
    public Map<String, Object> getFlows(
        @RequestParam(name = "limit", defaultValue = "200") int limit,
        @RequestParam(name = "status", required = false) String status
    ) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (businessAccountId == null || businessAccountId.isBlank() ||
                accessToken == null || accessToken.isBlank()) {
                response.put("status", "error");
                response.put("message", "WABA configuration missing. Set 'waba.id' and 'waba.access-token'.");
                return response;
            }

            int safeLimit = Math.max(1, Math.min(limit, 500));
            String fields = "id,name,status,categories,validation_errors,json_version,data_api_version,data_channel_uri,health_status,preview";
            String url = String.format(
                "https://graph.facebook.com/%s/%s/flows?limit=%d&fields=%s",
                apiVersion,
                businessAccountId,
                safeLimit,
                fields
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<Map<String, Object>> apiResponse = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                new ParameterizedTypeReference<>() {}
            );

            Object dataObj = apiResponse.getBody() != null ? apiResponse.getBody().get("data") : null;
            List<Map<String, Object>> flows = new ArrayList<>();
            if (dataObj instanceof List<?> dataList) {
                for (Object item : dataList) {
                    if (!(item instanceof Map<?, ?> flow)) {
                        continue;
                    }

                    String flowStatus = flow.get("status") != null ? String.valueOf(flow.get("status")) : "";
                    if (status != null && !status.isBlank() && !flowStatus.equalsIgnoreCase(status.trim())) {
                        continue;
                    }

                    Map<String, Object> flowItem = new LinkedHashMap<>();
                    flowItem.put("id", flow.get("id"));
                    flowItem.put("name", flow.get("name"));
                    flowItem.put("status", flowStatus);
                    flowItem.put("categories", flow.get("categories"));
                    flowItem.put("validationErrors", flow.get("validation_errors"));
                    flowItem.put("jsonVersion", flow.get("json_version"));
                    flowItem.put("dataApiVersion", flow.get("data_api_version"));
                    flowItem.put("dataChannelUri", flow.get("data_channel_uri"));
                    flowItem.put("healthStatus", flow.get("health_status"));
                    flowItem.put("preview", flow.get("preview"));
                    flows.add(flowItem);
                }
            }

            response.put("status", "success");
            response.put("data", flows);
            response.put("count", flows.size());
        } catch (HttpClientErrorException e) {
            response.put("status", "error");
            response.put("message", "Failed to fetch flows: " + e.getStatusCode().value() + " " + e.getStatusText());
            response.put("details", e.getResponseBodyAsString());
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Failed to fetch flows: " + e.getMessage());
        }
        return response;
    }

    @PostMapping("/send-flow")
    public Map<String, Object> sendFlow(@RequestBody SendFlowRequest req) {
        Map<String, Object> response = new HashMap<>();

        if (phoneNumberId == null || phoneNumberId.isBlank() ||
            accessToken == null || accessToken.isBlank()) {
            response.put("status", "error");
            response.put("message", "WABA configuration missing. Set 'waba.phone-number-id' and 'waba.access-token'.");
            return response;
        }

        if (req == null) {
            response.put("status", "error");
            response.put("message", "Invalid payload.");
            return response;
        }

        List<String> recipients = Optional.ofNullable(req.to).orElseGet(ArrayList::new)
            .stream()
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(s -> !s.isBlank())
            .map(this::normalizePhoneNumber)
            .distinct()
            .collect(Collectors.toList());

        if (recipients.isEmpty()) {
            response.put("status", "error");
            response.put("message", "No recipients provided.");
            return response;
        }

        boolean hasFlowId = req.flowId != null && !req.flowId.isBlank();
        boolean hasFlowName = req.flowName != null && !req.flowName.isBlank();
        if (!hasFlowId && !hasFlowName) {
            response.put("status", "error");
            response.put("message", "Either flowId or flowName is required.");
            return response;
        }

        String flowMessageVersion = (req.flowMessageVersion == null || req.flowMessageVersion.isBlank())
            ? "3"
            : req.flowMessageVersion.trim();
        String flowAction = (req.flowAction == null || req.flowAction.isBlank())
            ? "navigate"
            : req.flowAction.trim();
        String flowCta = (req.flowCta == null || req.flowCta.isBlank())
            ? "Open Flow!"
            : req.flowCta.trim();
        String bodyText = (req.bodyText == null || req.bodyText.isBlank())
            ? "Please continue in the flow."
            : req.bodyText.trim();

        String url = String.format("https://graph.facebook.com/%s/%s/messages", apiVersion, phoneNumberId);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        int sent = 0;
        List<Map<String, Object>> errors = new ArrayList<>();

        for (String recipient : recipients) {
            try {
                String resolvedFlowToken = resolveFlowToken(req.flowToken, recipient);
                Map<String, Object> payload = buildFlowPayload(
                    req,
                    recipient,
                    resolvedFlowToken,
                    flowMessageVersion,
                    flowAction,
                    flowCta,
                    bodyText,
                    hasFlowId,
                    hasFlowName
                );

                HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);
                ResponseEntity<Map<String, Object>> apiResponse = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    requestEntity,
                    new ParameterizedTypeReference<>() {}
                );

                if (apiResponse.getStatusCode().is2xxSuccessful()) {
                    sent++;
                    String messageId = extractMessageId(apiResponse.getBody());
                    flowTokenReferenceService.registerToken(
                        resolvedFlowToken,
                        hasFlowId ? req.flowId : null,
                        hasFlowName ? req.flowName : null,
                        recipient,
                        "interactive_flow_message",
                        messageId,
                        payload
                    );
                } else {
                    Map<String, Object> error = new HashMap<>();
                    error.put("to", recipient);
                    error.put("error", "Unexpected status: " + apiResponse.getStatusCode().value());
                    errors.add(error);
                }
            } catch (HttpClientErrorException e) {
                Map<String, Object> error = new HashMap<>();
                error.put("to", recipient);
                error.put("statusCode", e.getStatusCode().value());
                error.put("error", e.getResponseBodyAsString() != null && !e.getResponseBodyAsString().isBlank()
                    ? e.getResponseBodyAsString()
                    : e.getStatusText());
                errors.add(error);
            } catch (Exception e) {
                Map<String, Object> error = new HashMap<>();
                error.put("to", recipient);
                error.put("error", e.getMessage());
                errors.add(error);
            }
        }

        int failed = recipients.size() - sent;
        response.put("status", failed == 0 ? "success" : (sent > 0 ? "partial_success" : "error"));
        response.put("message", failed == 0
            ? String.format("Flow sent to %d recipient(s).", sent)
            : String.format("Flow send complete: %d successful, %d failed.", sent, failed));
        response.put("sent", sent);
        response.put("failed", failed);
        response.put("total", recipients.size());
        if (!errors.isEmpty()) {
            response.put("errors", errors);
        }
        return response;
    }

    private Map<String, Object> buildFlowPayload(
        SendFlowRequest req,
        String recipient,
        String flowToken,
        String flowMessageVersion,
        String flowAction,
        String flowCta,
        String bodyText,
        boolean hasFlowId,
        boolean hasFlowName
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("messaging_product", "whatsapp");
        payload.put("recipient_type", "individual");
        payload.put("to", recipient);
        payload.put("type", "interactive");

        Map<String, Object> interactive = new LinkedHashMap<>();
        interactive.put("type", "flow");

        if (req.headerText != null && !req.headerText.isBlank()) {
            Map<String, Object> header = new LinkedHashMap<>();
            header.put("type", "text");
            header.put("text", req.headerText.trim());
            interactive.put("header", header);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("text", bodyText);
        interactive.put("body", body);

        if (req.footerText != null && !req.footerText.isBlank()) {
            Map<String, Object> footer = new LinkedHashMap<>();
            footer.put("text", req.footerText.trim());
            interactive.put("footer", footer);
        }

        Map<String, Object> action = new LinkedHashMap<>();
        action.put("name", "flow");

        Map<String, Object> parameters = new LinkedHashMap<>();
        parameters.put("flow_message_version", flowMessageVersion);
        parameters.put("flow_action", flowAction);
        parameters.put("flow_cta", flowCta);
        parameters.put("flow_token", flowToken);

        if (hasFlowId) {
            parameters.put("flow_id", req.flowId.trim());
        } else if (hasFlowName) {
            parameters.put("flow_name", req.flowName.trim());
        }

        if (req.mode != null && !req.mode.isBlank()) {
            parameters.put("mode", req.mode.trim().toLowerCase(Locale.ROOT));
        }

        if ((req.screen != null && !req.screen.isBlank()) || (req.data != null && !req.data.isEmpty())) {
            Map<String, Object> flowActionPayload = new LinkedHashMap<>();
            if (req.screen != null && !req.screen.isBlank()) {
                flowActionPayload.put("screen", req.screen.trim());
            }
            if (req.data != null && !req.data.isEmpty()) {
                flowActionPayload.put("data", req.data);
            }
            parameters.put("flow_action_payload", flowActionPayload);
        }

        action.put("parameters", parameters);
        interactive.put("action", action);
        payload.put("interactive", interactive);

        return payload;
    }

    @SuppressWarnings("unchecked")
    private String extractMessageId(Map<String, Object> responseBody) {
        if (responseBody == null) {
            return null;
        }
        Object messagesObj = responseBody.get("messages");
        if (!(messagesObj instanceof List<?> messages) || messages.isEmpty()) {
            return null;
        }
        Object first = messages.get(0);
        if (!(first instanceof Map<?, ?>)) {
            return null;
        }
        Object id = ((Map<String, Object>) first).get("id");
        return id == null ? null : String.valueOf(id);
    }

    private String resolveFlowToken(String requestFlowToken, String recipient) {
        if (requestFlowToken != null && !requestFlowToken.isBlank()) {
            return requestFlowToken.trim();
        }
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        return "flow_" + recipient.replaceAll("[^0-9]", "") + "_" + suffix;
    }

    private String normalizePhoneNumber(String phone) {
        if (phone == null) {
            return "";
        }
        String cleaned = phone.trim().replaceAll("[^0-9+]", "");
        if (cleaned.startsWith("+")) {
            cleaned = cleaned.substring(1);
        }
        if (cleaned.startsWith("00")) {
            cleaned = cleaned.substring(2);
        }
        return cleaned;
    }
}
