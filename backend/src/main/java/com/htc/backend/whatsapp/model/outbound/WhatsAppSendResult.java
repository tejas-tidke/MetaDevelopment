package com.htc.backend.whatsapp.model.outbound;

import java.util.Map;

public class WhatsAppSendResult {

    private final boolean success;
    private final String errorMessage;
    private final String messageId;
    private final Map<String, Object> responseBody;

    public WhatsAppSendResult(boolean success, String errorMessage, String messageId, Map<String, Object> responseBody) {
        this.success = success;
        this.errorMessage = errorMessage;
        this.messageId = messageId;
        this.responseBody = responseBody;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public String getMessageId() {
        return messageId;
    }

    public Map<String, Object> getResponseBody() {
        return responseBody;
    }
}
