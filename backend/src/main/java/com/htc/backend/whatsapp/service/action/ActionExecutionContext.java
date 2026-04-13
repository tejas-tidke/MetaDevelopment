package com.htc.backend.whatsapp.service.action;

import com.htc.backend.whatsapp.entity.WhatsAppFlowSession;
import com.htc.backend.whatsapp.model.flow.FlowDefinition;
import com.htc.backend.whatsapp.model.flow.FlowStepDefinition;
import com.htc.backend.whatsapp.model.inbound.IncomingMessage;

import java.util.Map;

public class ActionExecutionContext {

    private final WhatsAppFlowSession session;
    private final FlowDefinition flowDefinition;
    private final FlowStepDefinition stepDefinition;
    private final IncomingMessage incomingMessage;
    private final Map<String, Object> answers;

    public ActionExecutionContext(
        WhatsAppFlowSession session,
        FlowDefinition flowDefinition,
        FlowStepDefinition stepDefinition,
        IncomingMessage incomingMessage,
        Map<String, Object> answers
    ) {
        this.session = session;
        this.flowDefinition = flowDefinition;
        this.stepDefinition = stepDefinition;
        this.incomingMessage = incomingMessage;
        this.answers = answers;
    }

    public WhatsAppFlowSession getSession() {
        return session;
    }

    public FlowDefinition getFlowDefinition() {
        return flowDefinition;
    }

    public FlowStepDefinition getStepDefinition() {
        return stepDefinition;
    }

    public IncomingMessage getIncomingMessage() {
        return incomingMessage;
    }

    public Map<String, Object> getAnswers() {
        return answers;
    }
}
