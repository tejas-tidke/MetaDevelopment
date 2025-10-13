package com.htc.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import java.util.*;

@RestController
@RequestMapping("/waba")
@CrossOrigin(origins = "http://localhost:5173")
public class WabaTemplatesController {

    @Value("${waba.id:}")
    private String businessAccountId;

    @Value("${waba.access-token:}")
    private String accessToken;
    
    @Value("${waba.phone-number-id:}")
    private String phoneNumberId;

    @GetMapping("/templates")
    public Map<String, Object> getTemplates() {
        Map<String, Object> response = new HashMap<>();
        try {
            if (businessAccountId == null || businessAccountId.isBlank() || accessToken == null || accessToken.isBlank() || phoneNumberId == null || phoneNumberId.isBlank()) {
                response.put("status", "error");
                response.put("message", "WABA configuration missing. Please check your application.properties for:\n" +
                    "- waba.id (Business Account ID)\n" +
                    "- waba.phone-number-id\n" +
                    "- waba.access-token");
                return response;
            }

            String url = String.format("https://graph.facebook.com/v19.0/%s/message_templates?limit=200", businessAccountId);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            RestTemplate restTemplate = new RestTemplate();
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

    private String optText(JsonNode node, String field) {
        JsonNode n = node.get(field);
        return n != null && !n.isNull() ? n.asText() : "";
    }

    private int countPlaceholders(String text) {
        if (text == null || text.isEmpty()) return 0;
        Pattern p = Pattern.compile("\\{\\{\\d+}}");
        Matcher m = p.matcher(text);
        int count = 0;
        while (m.find()) count++;
        return count;
    }
}
