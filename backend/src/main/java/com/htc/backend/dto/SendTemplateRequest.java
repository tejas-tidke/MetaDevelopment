package com.htc.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class SendTemplateRequest {
    @JsonProperty(value = "templateName", required = true)
    public String templateName;
    
    @JsonProperty(value = "language", required = true)
    public String language;
    
    @JsonProperty(value = "to", required = true)
    public List<String> to;
    
    @JsonProperty(value = "parameters", required = false)
    public List<Object> parameters; // Can be String or Map for complex objects

    @JsonProperty(value = "headerFormat", required = false)
    public String headerFormat; // one of TEXT, IMAGE, VIDEO, DOCUMENT
    
    @JsonProperty(value = "headerText", required = false)
    public String headerText; // for TEXT header
    
    @JsonProperty(value = "mediaId", required = false)
    public String mediaId; // for pre-existing media ID
    
    @JsonProperty(value = "personalizeWithUserData", required = false)
    public Boolean personalizeWithUserData; // whether to personalize with user data from database
    
    @JsonIgnore
    public String headerMediaUrl;
    
    @JsonIgnore
    public String headerMediaFilename;
    
    // Default constructor required for JSON deserialization
    public SendTemplateRequest() {
    }
    
    public String getParameterAsString(int index) {
        if (parameters == null || index >= parameters.size()) {
            return "";
        }
        Object param = parameters.get(index);
        if (param instanceof String) {
            return (String) param;
        } else if (param instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> paramMap = (Map<String, Object>) param;
            return paramMap.getOrDefault("text", "").toString();
        }
        return String.valueOf(param);
    }
}