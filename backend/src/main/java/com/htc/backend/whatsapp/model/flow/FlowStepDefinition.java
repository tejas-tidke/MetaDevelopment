package com.htc.backend.whatsapp.model.flow;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class FlowStepDefinition {

    private String id;
    private FlowStepType type;
    private String message;
    private String header;
    private String footer;
    private String buttonText;
    private String answerKey;
    private List<FlowOptionDefinition> options;
    private FlowValidationRule validation;
    private FlowNextConfig next;
    private String actionHandler;
    private Map<String, Object> metadata;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public FlowStepType getType() {
        return type;
    }

    public void setType(FlowStepType type) {
        this.type = type;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getHeader() {
        return header;
    }

    public void setHeader(String header) {
        this.header = header;
    }

    public String getFooter() {
        return footer;
    }

    public void setFooter(String footer) {
        this.footer = footer;
    }

    public String getButtonText() {
        return buttonText;
    }

    public void setButtonText(String buttonText) {
        this.buttonText = buttonText;
    }

    public String getAnswerKey() {
        return answerKey;
    }

    public void setAnswerKey(String answerKey) {
        this.answerKey = answerKey;
    }

    public List<FlowOptionDefinition> getOptions() {
        return options;
    }

    public void setOptions(List<FlowOptionDefinition> options) {
        this.options = options;
    }

    public FlowValidationRule getValidation() {
        return validation;
    }

    public void setValidation(FlowValidationRule validation) {
        this.validation = validation;
    }

    public FlowNextConfig getNext() {
        return next;
    }

    public void setNext(FlowNextConfig next) {
        this.next = next;
    }

    public String getActionHandler() {
        return actionHandler;
    }

    public void setActionHandler(String actionHandler) {
        this.actionHandler = actionHandler;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }
}
