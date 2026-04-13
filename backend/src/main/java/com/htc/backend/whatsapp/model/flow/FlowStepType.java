package com.htc.backend.whatsapp.model.flow;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Locale;

public enum FlowStepType {
    TEXT,
    BUTTONS,
    LIST,
    INPUT,
    ACTION,
    END;

    @JsonCreator
    public static FlowStepType fromValue(String value) {
        if (value == null || value.isBlank()) {
            return TEXT;
        }
        return FlowStepType.valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
