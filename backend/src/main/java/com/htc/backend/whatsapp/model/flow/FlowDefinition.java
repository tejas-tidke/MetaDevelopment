package com.htc.backend.whatsapp.model.flow;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class FlowDefinition {

    private String id;
    private String name;
    private String description;
    private Integer version;
    private String entryStepId;
    private List<String> triggers;
    private List<String> restartKeywords;
    private String fallbackMessage;
    private String unknownInputMessage;
    private List<FlowStepDefinition> steps;
    private Map<String, Object> metadata;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public String getEntryStepId() {
        return entryStepId;
    }

    public void setEntryStepId(String entryStepId) {
        this.entryStepId = entryStepId;
    }

    public List<String> getTriggers() {
        return triggers;
    }

    public void setTriggers(List<String> triggers) {
        this.triggers = triggers;
    }

    public List<String> getRestartKeywords() {
        return restartKeywords;
    }

    public void setRestartKeywords(List<String> restartKeywords) {
        this.restartKeywords = restartKeywords;
    }

    public String getFallbackMessage() {
        return fallbackMessage;
    }

    public void setFallbackMessage(String fallbackMessage) {
        this.fallbackMessage = fallbackMessage;
    }

    public String getUnknownInputMessage() {
        return unknownInputMessage;
    }

    public void setUnknownInputMessage(String unknownInputMessage) {
        this.unknownInputMessage = unknownInputMessage;
    }

    public List<FlowStepDefinition> getSteps() {
        return steps;
    }

    public void setSteps(List<FlowStepDefinition> steps) {
        this.steps = steps;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }
}
