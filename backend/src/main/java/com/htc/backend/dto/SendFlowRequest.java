package com.htc.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class SendFlowRequest {

    @JsonProperty(value = "to", required = true)
    public List<String> to;

    @JsonProperty(value = "flowId", required = false)
    public String flowId;

    @JsonProperty(value = "flowName", required = false)
    public String flowName;

    @JsonProperty(value = "flowToken", required = false)
    public String flowToken;

    @JsonProperty(value = "flowMessageVersion", required = false)
    public String flowMessageVersion;

    @JsonProperty(value = "flowAction", required = false)
    public String flowAction;

    @JsonProperty(value = "flowCta", required = false)
    public String flowCta;

    @JsonProperty(value = "mode", required = false)
    public String mode; // e.g., draft

    @JsonProperty(value = "headerText", required = false)
    public String headerText;

    @JsonProperty(value = "bodyText", required = false)
    public String bodyText;

    @JsonProperty(value = "footerText", required = false)
    public String footerText;

    @JsonProperty(value = "screen", required = false)
    public String screen;

    @JsonProperty(value = "data", required = false)
    public Map<String, Object> data;

    public SendFlowRequest() {
    }
}
