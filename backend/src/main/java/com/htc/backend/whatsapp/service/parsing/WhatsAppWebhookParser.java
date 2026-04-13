package com.htc.backend.whatsapp.service.parsing;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.htc.backend.whatsapp.model.inbound.IncomingMessage;
import com.htc.backend.whatsapp.model.inbound.IncomingMessageType;
import com.htc.backend.whatsapp.service.engine.WhatsAppPhoneNumberUtil;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class WhatsAppWebhookParser {

    private final ObjectMapper objectMapper;

    public WhatsAppWebhookParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<IncomingMessage> parseIncomingMessages(Map<String, Object> webhookPayload) {
        List<IncomingMessage> messages = new ArrayList<>();
        for (Map<String, Object> value : extractValueNodes(webhookPayload)) {
            Map<String, String> profileNameByWaId = extractProfileNames(value);
            List<Map<String, Object>> messageNodes = list(value.get("messages"));
            for (Map<String, Object> messageNode : messageNodes) {
                IncomingMessage message = toIncomingMessage(messageNode, profileNameByWaId);
                if (message != null) {
                    messages.add(message);
                }
            }
        }
        return messages;
    }

    public List<Map<String, Object>> parseStatusEvents(Map<String, Object> webhookPayload) {
        List<Map<String, Object>> statuses = new ArrayList<>();
        for (Map<String, Object> value : extractValueNodes(webhookPayload)) {
            for (Map<String, Object> statusNode : list(value.get("statuses"))) {
                Map<String, Object> status = new LinkedHashMap<>();
                status.put("id", statusNode.get("id"));
                status.put("status", statusNode.get("status"));
                status.put("recipient_id", statusNode.get("recipient_id"));
                status.put("timestamp", statusNode.get("timestamp"));
                status.put("conversation", statusNode.get("conversation"));
                status.put("pricing", statusNode.get("pricing"));
                status.put("errors", statusNode.get("errors"));
                statuses.add(status);
            }
        }
        return statuses;
    }

    private IncomingMessage toIncomingMessage(Map<String, Object> node, Map<String, String> profileNameByWaId) {
        if (node == null || node.isEmpty()) {
            return null;
        }

        String from = string(node.get("from"));
        if (from.isBlank()) {
            return null;
        }

        IncomingMessage message = new IncomingMessage();
        message.setPhoneNumber(WhatsAppPhoneNumberUtil.normalize(from));
        message.setProfileName(profileNameByWaId.getOrDefault(from, profileNameByWaId.get(message.getPhoneNumber())));
        message.setMessageId(string(node.get("id")));
        message.setTimestamp(string(node.get("timestamp")));
        message.setRawMessage(node);
        message.setMessageType(IncomingMessageType.UNKNOWN);

        String type = string(node.get("type")).toLowerCase(Locale.ROOT);
        if ("text".equals(type)) {
            Map<String, Object> textNode = map(node.get("text"));
            message.setTextBody(string(textNode.get("body")));
            message.setMessageType(IncomingMessageType.TEXT);
            return message;
        }

        if ("interactive".equals(type)) {
            Map<String, Object> interactive = map(node.get("interactive"));
            String interactiveType = string(interactive.get("type")).toLowerCase(Locale.ROOT);
            if ("button_reply".equals(interactiveType)) {
                Map<String, Object> reply = map(interactive.get("button_reply"));
                message.setReplyId(string(reply.get("id")));
                message.setReplyTitle(string(reply.get("title")));
                message.setMessageType(IncomingMessageType.BUTTON_REPLY);
                return message;
            }
            if ("list_reply".equals(interactiveType)) {
                Map<String, Object> reply = map(interactive.get("list_reply"));
                message.setReplyId(string(reply.get("id")));
                message.setReplyTitle(string(reply.get("title")));
                message.setMessageType(IncomingMessageType.LIST_REPLY);
                return message;
            }
            if ("nfm_reply".equals(interactiveType)) {
                Map<String, Object> nfmReply = map(interactive.get("nfm_reply"));
                message.setReplyId(string(nfmReply.get("name")));
                message.setReplyTitle(string(nfmReply.get("body")));
                message.setMessageType(IncomingMessageType.NFM_REPLY);

                String responseJsonRaw = string(nfmReply.get("response_json"));
                message.setFlowResponseJson(responseJsonRaw);
                Map<String, Object> responseData = parseResponseJson(responseJsonRaw);
                message.setFlowResponseData(responseData);

                Object flowToken = responseData.get("flow_token");
                if (flowToken != null) {
                    message.setFlowToken(String.valueOf(flowToken));
                }
                return message;
            }
        }

        if ("button".equals(type)) {
            Map<String, Object> button = map(node.get("button"));
            message.setReplyId(string(button.get("payload")));
            message.setReplyTitle(string(button.get("text")));
            message.setMessageType(IncomingMessageType.BUTTON_REPLY);
            return message;
        }

        return message;
    }

    private List<Map<String, Object>> extractValueNodes(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> values = new ArrayList<>();
        for (Map<String, Object> entry : list(payload.get("entry"))) {
            for (Map<String, Object> change : list(entry.get("changes"))) {
                Map<String, Object> value = map(change.get("value"));
                if (!value.isEmpty()) {
                    values.add(value);
                }
            }
        }
        return values;
    }

    private Map<String, String> extractProfileNames(Map<String, Object> valueNode) {
        Map<String, String> result = new HashMap<>();
        for (Map<String, Object> contact : list(valueNode.get("contacts"))) {
            String waId = string(contact.get("wa_id"));
            Map<String, Object> profile = map(contact.get("profile"));
            String name = string(profile.get("name"));
            if (!waId.isBlank() && !name.isBlank()) {
                result.put(waId, name);
                result.put(WhatsAppPhoneNumberUtil.normalize(waId), name);
            }
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> list(Object value) {
        if (!(value instanceof List<?> rawList)) {
            return Collections.emptyList();
        }
        List<Map<String, Object>> mapped = new ArrayList<>();
        for (Object item : rawList) {
            if (item instanceof Map<?, ?> mapItem) {
                mapped.add((Map<String, Object>) mapItem);
            }
        }
        return mapped;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> map(Object value) {
        if (value instanceof Map<?, ?> rawMap) {
            return (Map<String, Object>) rawMap;
        }
        return Collections.emptyMap();
    }

    private String string(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private Map<String, Object> parseResponseJson(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(rawJson, new TypeReference<>() {});
        } catch (Exception ex) {
            return new LinkedHashMap<>();
        }
    }
}
