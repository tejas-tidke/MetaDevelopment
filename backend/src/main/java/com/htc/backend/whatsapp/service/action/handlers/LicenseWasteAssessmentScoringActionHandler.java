package com.htc.backend.whatsapp.service.action.handlers;

import com.htc.backend.whatsapp.service.action.ActionExecutionContext;
import com.htc.backend.whatsapp.service.action.ActionExecutionResult;
import com.htc.backend.whatsapp.service.action.FlowActionHandler;
import org.springframework.stereotype.Component;

import java.text.NumberFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Component
public class LicenseWasteAssessmentScoringActionHandler implements FlowActionHandler {

    @Override
    public String getName() {
        return "license_waste_assessment_score";
    }

    @Override
    public ActionExecutionResult execute(ActionExecutionContext context) {
        Map<String, Object> answers = context.getAnswers();
        double totalScore = answers.entrySet().stream()
            .filter(entry -> entry.getKey() != null && entry.getKey().endsWith("_score"))
            .mapToDouble(entry -> parseDouble(entry.getValue()))
            .sum();

        double annualSpend = parseDouble(answers.get("annual_spend"));
        String riskLevel;
        double wastePercent;

        if (totalScore >= 55) {
            riskLevel = "HIGH";
            wastePercent = 30;
        } else if (totalScore >= 35) {
            riskLevel = "MEDIUM";
            wastePercent = 20;
        } else {
            riskLevel = "LOW";
            wastePercent = 12;
        }

        double estimatedWasteAmount = annualSpend > 0
            ? annualSpend * (wastePercent / 100.0)
            : Math.max(totalScore * 1200, 0);
        double potentialSavings = estimatedWasteAmount * 0.65;

        NumberFormat currency = NumberFormat.getCurrencyInstance(Locale.US);
        String summary = String.format(
            "Risk level %s (score %.0f). Estimated license waste: %s/year. Potential recoverable savings: %s/year.",
            riskLevel,
            totalScore,
            currency.format(estimatedWasteAmount),
            currency.format(potentialSavings)
        );

        Map<String, Object> updates = new LinkedHashMap<>();
        updates.put("assessment_total_score", totalScore);
        updates.put("assessment_risk_level", riskLevel);
        updates.put("assessment_waste_percent", wastePercent);
        updates.put("assessment_estimated_waste_amount", estimatedWasteAmount);
        updates.put("assessment_potential_savings", potentialSavings);
        updates.put("assessment_result_text", summary);

        ActionExecutionResult result = ActionExecutionResult.empty();
        result.setAnswerUpdates(updates);
        return result;
    }

    private double parseDouble(Object value) {
        if (value == null) {
            return 0d;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value).replaceAll(",", "").trim());
        } catch (Exception ex) {
            return 0d;
        }
    }
}
