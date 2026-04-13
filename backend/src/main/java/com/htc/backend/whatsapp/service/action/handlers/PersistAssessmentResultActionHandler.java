package com.htc.backend.whatsapp.service.action.handlers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.htc.backend.whatsapp.entity.WhatsAppFlowResult;
import com.htc.backend.whatsapp.repository.WhatsAppFlowResultRepository;
import com.htc.backend.whatsapp.service.action.ActionExecutionContext;
import com.htc.backend.whatsapp.service.action.ActionExecutionResult;
import com.htc.backend.whatsapp.service.action.FlowActionHandler;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class PersistAssessmentResultActionHandler implements FlowActionHandler {

    private final WhatsAppFlowResultRepository flowResultRepository;
    private final ObjectMapper objectMapper;

    public PersistAssessmentResultActionHandler(
        WhatsAppFlowResultRepository flowResultRepository,
        ObjectMapper objectMapper
    ) {
        this.flowResultRepository = flowResultRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getName() {
        return "persist_assessment_result";
    }

    @Override
    public ActionExecutionResult execute(ActionExecutionContext context) {
        try {
            WhatsAppFlowResult result = new WhatsAppFlowResult();
            result.setSessionId(context.getSession().getId());
            result.setFlowId(context.getSession().getFlowId());
            result.setPhoneNumber(context.getSession().getPhoneNumber());
            result.setResultType("assessment");
            result.setScore(parseDouble(context.getAnswers().get("assessment_total_score")));
            result.setResultCode(string(context.getAnswers().get("assessment_risk_level")));
            result.setResultSummary(string(context.getAnswers().get("assessment_result_text")));
            result.setResultJson(objectMapper.writeValueAsString(context.getAnswers()));
            result = flowResultRepository.save(result);

            Map<String, Object> updates = new LinkedHashMap<>();
            updates.put("result_record_id", result.getId());
            updates.put("result_saved_at", result.getCreatedAt() != null ? result.getCreatedAt().toString() : null);

            ActionExecutionResult actionResult = ActionExecutionResult.empty();
            actionResult.setAnswerUpdates(updates);
            return actionResult;
        } catch (Exception ex) {
            ActionExecutionResult actionResult = ActionExecutionResult.empty();
            actionResult.setMessageToUser("I ran into an issue saving the result, but your assessment is complete.");
            return actionResult;
        }
    }

    private String string(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private Double parseDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value).trim());
        } catch (Exception ex) {
            return null;
        }
    }
}
