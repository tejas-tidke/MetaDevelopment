package com.htc.backend.whatsapp.controller;

import com.htc.backend.whatsapp.model.inbound.IncomingMessage;
import com.htc.backend.whatsapp.model.inbound.IncomingMessageType;
import com.htc.backend.whatsapp.service.engine.WhatsAppFlowEngineService;
import com.htc.backend.whatsapp.service.engine.WhatsAppFlowResponseCaptureService;
import com.htc.backend.whatsapp.service.logging.WhatsAppEventLogService;
import com.htc.backend.whatsapp.service.parsing.WhatsAppWebhookParser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/waba/webhook")
public class WhatsAppWebhookController {

    private final WhatsAppWebhookParser whatsAppWebhookParser;
    private final WhatsAppFlowEngineService whatsAppFlowEngineService;
    private final WhatsAppFlowResponseCaptureService whatsAppFlowResponseCaptureService;
    private final WhatsAppEventLogService eventLogService;

    @Value("${waba.webhook-verify-token:}")
    private String webhookVerifyToken;

    public WhatsAppWebhookController(
        WhatsAppWebhookParser whatsAppWebhookParser,
        WhatsAppFlowEngineService whatsAppFlowEngineService,
        WhatsAppFlowResponseCaptureService whatsAppFlowResponseCaptureService,
        WhatsAppEventLogService eventLogService
    ) {
        this.whatsAppWebhookParser = whatsAppWebhookParser;
        this.whatsAppFlowEngineService = whatsAppFlowEngineService;
        this.whatsAppFlowResponseCaptureService = whatsAppFlowResponseCaptureService;
        this.eventLogService = eventLogService;
    }

    @GetMapping
    public ResponseEntity<String> verifyWebhook(
        @RequestParam(name = "hub.mode", required = false) String mode,
        @RequestParam(name = "hub.verify_token", required = false) String verifyToken,
        @RequestParam(name = "hub.challenge", required = false) String challenge
    ) {
        boolean isValidMode = mode != null && mode.equals("subscribe");
        boolean isValidToken = webhookVerifyToken != null
            && !webhookVerifyToken.isBlank()
            && webhookVerifyToken.equals(verifyToken);

        if (isValidMode && isValidToken && challenge != null) {
            return ResponseEntity.ok(challenge);
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Verification failed");
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> receiveWebhook(@RequestBody Map<String, Object> payload) {
        eventLogService.logIncomingEvent("webhook_payload", null, null, null, null, payload);

        List<IncomingMessage> incomingMessages = whatsAppWebhookParser.parseIncomingMessages(payload);
        for (IncomingMessage incomingMessage : incomingMessages) {
            eventLogService.logIncomingEvent(
                "incoming_message",
                incomingMessage.getPhoneNumber(),
                null,
                null,
                incomingMessage.getMessageId(),
                incomingMessage.getRawMessage()
            );
            if (incomingMessage.getMessageType() == IncomingMessageType.NFM_REPLY) {
                whatsAppFlowResponseCaptureService.captureNativeFlowResponse(incomingMessage);
            } else {
                whatsAppFlowEngineService.handleIncomingMessage(incomingMessage);
            }
        }

        List<Map<String, Object>> statusEvents = whatsAppWebhookParser.parseStatusEvents(payload);
        for (Map<String, Object> statusEvent : statusEvents) {
            String recipient = statusEvent.get("recipient_id") != null
                ? String.valueOf(statusEvent.get("recipient_id"))
                : null;
            String messageId = statusEvent.get("id") != null
                ? String.valueOf(statusEvent.get("id"))
                : null;
            eventLogService.logIncomingEvent("message_status", recipient, null, null, messageId, statusEvent);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "received");
        response.put("messagesProcessed", incomingMessages.size());
        response.put("statusesProcessed", statusEvents.size());
        return ResponseEntity.ok(response);
    }
}
