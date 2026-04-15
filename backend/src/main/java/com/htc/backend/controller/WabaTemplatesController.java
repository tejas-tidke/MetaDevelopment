package com.htc.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import java.util.*;

@RestController
@RequestMapping("/waba")
public class WabaTemplatesController {

    @Value("${waba.id:}")
    private String businessAccountId;

    @Value("${waba.access-token:}")
    private String accessToken;
    
    @Value("${waba.phone-number-id:}")
    private String phoneNumberId;

    @Value("${waba.api-version:v19.0}")
    private String apiVersion;

    private final RestTemplate restTemplate;

    // Constructor injection for RestTemplate
    public WabaTemplatesController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping("/templates")
    public Map<String, Object> getTemplates() {
        Map<String, Object> response = new HashMap<>();
        try {
            if (isConfigMissing()) {
                response.put("status", "error");
                response.put("message", "WABA configuration missing. Please check your application.properties for:\n" +
                    "- waba.id (Business Account ID)\n" +
                    "- waba.phone-number-id\n" +
                    "- waba.access-token");
                return response;
            }

            String url = String.format("https://graph.facebook.com/%s/%s/message_templates?limit=200", apiVersion, businessAccountId);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            // Use the injected RestTemplate with configured timeouts instead of creating a new one
            ResponseEntity<String> result = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(result.getBody());
            JsonNode dataNode = root.get("data");

            List<Map<String, Object>> templates = new ArrayList<>();
            if (dataNode != null && dataNode.isArray()) {
                for (JsonNode t : dataNode) {
                    String name = optText(t, "name");
                    String language = optText(t, "language");
                    String status = optText(t, "status");
                    String category = optText(t, "category");
                    String bodyText = "";
                    int bodyParamCount = 0;
                    String headerFormat = "";
                    String headerText = "";
                    int headerParamCount = 0;
                    String footerText = "";
                    List<Map<String, Object>> buttons = new ArrayList<>();
                    JsonNode components = t.get("components");
                    if (components != null && components.isArray()) {
                        for (JsonNode c : components) {
                            String ctype = optText(c, "type");
                            if ("BODY".equalsIgnoreCase(ctype)) {
                                bodyText = optText(c, "text");
                                bodyParamCount = countPlaceholders(bodyText);
                            } else if ("HEADER".equalsIgnoreCase(ctype)) {
                                headerFormat = optText(c, "format");
                                if ("TEXT".equalsIgnoreCase(headerFormat)) {
                                    headerText = optText(c, "text");
                                    headerParamCount = countPlaceholders(headerText);
                                }
                            } else if ("FOOTER".equalsIgnoreCase(ctype)) {
                                footerText = optText(c, "text");
                            } else if ("BUTTONS".equalsIgnoreCase(ctype)) {
                                JsonNode buttonNodes = c.get("buttons");
                                if (buttonNodes != null && buttonNodes.isArray()) {
                                    for (int bIndex = 0; bIndex < buttonNodes.size(); bIndex++) {
                                        JsonNode buttonNode = buttonNodes.get(bIndex);
                                        String buttonType = optText(buttonNode, "type").toUpperCase(Locale.ROOT);
                                        Map<String, Object> buttonInfo = new HashMap<>();
                                        buttonInfo.put("index", bIndex);
                                        buttonInfo.put("type", buttonType);
                                        buttonInfo.put("text", optText(buttonNode, "text"));

                                        int buttonParamCount = 0;
                                        if ("URL".equals(buttonType)) {
                                            String buttonUrl = optText(buttonNode, "url");
                                            buttonInfo.put("url", buttonUrl);
                                            buttonParamCount = countPlaceholders(buttonUrl);
                                            if (buttonParamCount > 0) {
                                                buttonInfo.put("parameterType", "text");
                                            }
                                        } else if ("PHONE_NUMBER".equals(buttonType)) {
                                            buttonInfo.put("phoneNumber", optText(buttonNode, "phone_number"));
                                        } else if ("FLOW".equals(buttonType)) {
                                            buttonInfo.put("flowId", optText(buttonNode, "flow_id"));
                                            buttonInfo.put("flowName", optText(buttonNode, "flow_name"));
                                            buttonInfo.put("flowAction", optText(buttonNode, "flow_action"));
                                            buttonInfo.put("navigateScreen", optText(buttonNode, "navigate_screen"));
                                        }

                                        buttonInfo.put("paramCount", buttonParamCount);
                                        buttons.add(buttonInfo);
                                    }
                                }
                            }
                        }
                    }
                    Map<String, Object> item = new HashMap<>();
                    item.put("name", name);
                    item.put("language", language);
                    item.put("status", status);
                    item.put("category", category);
                    item.put("body", bodyText);
                    item.put("headerFormat", headerFormat);
                    item.put("bodyParamCount", bodyParamCount);
                    if (!headerText.isEmpty()) item.put("headerText", headerText);
                    item.put("headerParamCount", headerParamCount);
                    item.put("footer", footerText);
                    item.put("buttons", buttons);
                    item.put("buttonCount", buttons.size());

                    Map<String, Object> previewHeader = new HashMap<>();
                    previewHeader.put("format", headerFormat);
                    if (!headerText.isEmpty()) {
                        previewHeader.put("text", headerText);
                    }

                    Map<String, Object> preview = new HashMap<>();
                    preview.put("header", previewHeader);
                    preview.put("body", bodyText);
                    preview.put("footer", footerText);
                    preview.put("buttons", buttons);
                    item.put("preview", preview);

                    templates.add(item);
                }
            }

            response.put("status", "success");
            response.put("data", templates);
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Error fetching templates: " + e.getMessage());
        }
        return response;
    }

    @PostMapping("/templates")
    public Map<String, Object> createTemplate(@RequestBody Map<String, Object> payload) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (isConfigMissing()) {
                response.put("status", "error");
                response.put("message", "WABA configuration missing. Please check your application.properties for:\n" +
                    "- waba.id (Business Account ID)\n" +
                    "- waba.phone-number-id\n" +
                    "- waba.access-token");
                return response;
            }

            String templateName = String.valueOf(payload.getOrDefault("name", "")).trim();
            String language = String.valueOf(payload.getOrDefault("language", "")).trim();
            String category = String.valueOf(payload.getOrDefault("category", "")).trim().toUpperCase(Locale.ROOT);
            Object componentsObj = payload.get("components");

            if (templateName.isEmpty() || language.isEmpty() || category.isEmpty() || !(componentsObj instanceof List<?>)) {
                response.put("status", "error");
                response.put("message", "Invalid payload. Required fields: name, language, category, components.");
                return response;
            }

            Map<String, Object> createPayload = new LinkedHashMap<>();
            createPayload.put("name", templateName);
            createPayload.put("language", language);
            createPayload.put("category", category);
            createPayload.put("components", componentsObj);

            Object allowCategoryChange = payload.get("allow_category_change");
            if (allowCategoryChange instanceof Boolean) {
                createPayload.put("allow_category_change", allowCategoryChange);
            }

            String url = String.format("https://graph.facebook.com/%s/%s/message_templates", apiVersion, businessAccountId);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(createPayload, headers);

            ResponseEntity<String> result = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> metaResponse = mapper.readValue(result.getBody(), Map.class);

            response.put("status", "success");
            response.put("data", metaResponse);
            response.put("message", "Template submitted to Meta successfully.");
            return response;
        } catch (HttpStatusCodeException e) {
            response.put("status", "error");
            response.put("message", "Meta API error while creating template.");
            response.put("metaStatusCode", e.getStatusCode().value());
            response.put("metaError", e.getResponseBodyAsString());
            return response;
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Error creating template: " + e.getMessage());
            return response;
        }
    }

    private String optText(JsonNode node, String field) {
        JsonNode n = node.get(field);
        return n != null && !n.isNull() ? n.asText() : "";
    }

    private boolean isConfigMissing() {
        return businessAccountId == null || businessAccountId.isBlank()
            || accessToken == null || accessToken.isBlank()
            || phoneNumberId == null || phoneNumberId.isBlank();
    }

    private int countPlaceholders(String text) {
        if (text == null || text.isEmpty()) return 0;
        // Count both numbered placeholders ({{1}}) and named placeholders ({{customer_name}}).
        Pattern p = Pattern.compile("\\{\\{\\s*[^{}]+\\s*}}");
        Matcher m = p.matcher(text);
        int count = 0;
        while (m.find()) count++;
        return count;
    }
}
