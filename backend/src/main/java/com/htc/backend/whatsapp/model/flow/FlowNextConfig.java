package com.htc.backend.whatsapp.model.flow;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class FlowNextConfig {

    private String defaultStepId;
    private List<FlowConditionRule> conditions;

    public String getDefaultStepId() {
        return defaultStepId;
    }

    public void setDefaultStepId(String defaultStepId) {
        this.defaultStepId = defaultStepId;
    }

    public List<FlowConditionRule> getConditions() {
        return conditions;
    }

    public void setConditions(List<FlowConditionRule> conditions) {
        this.conditions = conditions;
    }
}
