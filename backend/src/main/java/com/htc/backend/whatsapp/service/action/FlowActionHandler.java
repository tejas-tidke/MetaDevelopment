package com.htc.backend.whatsapp.service.action;

public interface FlowActionHandler {
    String getName();
    ActionExecutionResult execute(ActionExecutionContext context);
}
