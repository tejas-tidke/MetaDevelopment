package com.htc.backend.whatsapp.service.action;

import java.util.LinkedHashMap;
import java.util.Map;

public class ActionExecutionResult {

    private String nextStepId;
    private String messageToUser;
    private Map<String, Object> answerUpdates = new LinkedHashMap<>();

    public static ActionExecutionResult empty() {
        return new ActionExecutionResult();
    }

    public String getNextStepId() {
        return nextStepId;
    }

    public void setNextStepId(String nextStepId) {
        this.nextStepId = nextStepId;
    }

    public String getMessageToUser() {
        return messageToUser;
    }

    public void setMessageToUser(String messageToUser) {
        this.messageToUser = messageToUser;
    }

    public Map<String, Object> getAnswerUpdates() {
        return answerUpdates;
    }

    public void setAnswerUpdates(Map<String, Object> answerUpdates) {
        this.answerUpdates = answerUpdates == null ? new LinkedHashMap<>() : answerUpdates;
    }
}
