package com.htc.backend.whatsapp.model.inbound;

import java.util.LinkedHashMap;
import java.util.Map;

public class IncomingMessage {

    private String phoneNumber;
    private String profileName;
    private String messageId;
    private IncomingMessageType messageType;
    private String textBody;
    private String replyId;
    private String replyTitle;
    private String flowToken;
    private String flowResponseJson;
    private Map<String, Object> flowResponseData;
    private String timestamp;
    private Map<String, Object> rawMessage;

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getProfileName() {
        return profileName;
    }

    public void setProfileName(String profileName) {
        this.profileName = profileName;
    }

    public String getMessageId() {
        return messageId;
    }

    public void setMessageId(String messageId) {
        this.messageId = messageId;
    }

    public IncomingMessageType getMessageType() {
        return messageType;
    }

    public void setMessageType(IncomingMessageType messageType) {
        this.messageType = messageType;
    }

    public String getTextBody() {
        return textBody;
    }

    public void setTextBody(String textBody) {
        this.textBody = textBody;
    }

    public String getReplyId() {
        return replyId;
    }

    public void setReplyId(String replyId) {
        this.replyId = replyId;
    }

    public String getReplyTitle() {
        return replyTitle;
    }

    public void setReplyTitle(String replyTitle) {
        this.replyTitle = replyTitle;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public String getFlowToken() {
        return flowToken;
    }

    public void setFlowToken(String flowToken) {
        this.flowToken = flowToken;
    }

    public String getFlowResponseJson() {
        return flowResponseJson;
    }

    public void setFlowResponseJson(String flowResponseJson) {
        this.flowResponseJson = flowResponseJson;
    }

    public Map<String, Object> getFlowResponseData() {
        return flowResponseData;
    }

    public void setFlowResponseData(Map<String, Object> flowResponseData) {
        this.flowResponseData = flowResponseData;
    }

    public Map<String, Object> getRawMessage() {
        return rawMessage;
    }

    public void setRawMessage(Map<String, Object> rawMessage) {
        this.rawMessage = rawMessage;
    }

    public String getUserInput() {
        if (replyId != null && !replyId.isBlank()) {
            return replyId.trim();
        }
        if (replyTitle != null && !replyTitle.isBlank()) {
            return replyTitle.trim();
        }
        if (flowResponseData != null && !flowResponseData.isEmpty()) {
            Object token = flowResponseData.get("flow_token");
            if (token != null) {
                return String.valueOf(token);
            }
        }
        if (textBody != null) {
            return textBody.trim();
        }
        return "";
    }

    public Map<String, Object> getSafeFlowResponseData() {
        if (flowResponseData == null) {
            return new LinkedHashMap<>();
        }
        return flowResponseData;
    }
}
