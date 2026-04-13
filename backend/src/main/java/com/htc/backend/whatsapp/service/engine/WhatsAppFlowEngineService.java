package com.htc.backend.whatsapp.service.engine;

import com.htc.backend.whatsapp.entity.WhatsAppFlowSession;
import com.htc.backend.whatsapp.model.flow.FlowConditionRule;
import com.htc.backend.whatsapp.model.flow.FlowDefinition;
import com.htc.backend.whatsapp.model.flow.FlowNextConfig;
import com.htc.backend.whatsapp.model.flow.FlowOptionDefinition;
import com.htc.backend.whatsapp.model.flow.FlowStepDefinition;
import com.htc.backend.whatsapp.model.flow.FlowStepType;
import com.htc.backend.whatsapp.model.flow.FlowValidationRule;
import com.htc.backend.whatsapp.model.inbound.IncomingMessage;
import com.htc.backend.whatsapp.model.outbound.WhatsAppSendResult;
import com.htc.backend.whatsapp.service.action.ActionExecutionContext;
import com.htc.backend.whatsapp.service.action.ActionExecutionResult;
import com.htc.backend.whatsapp.service.action.FlowActionHandler;
import com.htc.backend.whatsapp.service.action.FlowActionHandlerRegistry;
import com.htc.backend.whatsapp.service.api.WhatsAppCloudApiClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class WhatsAppFlowEngineService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppFlowEngineService.class);
    private static final Pattern TEMPLATE_PATTERN = Pattern.compile("\\{\\{\\s*([^{}]+)\\s*}}");
    private static final List<String> GLOBAL_RESTART_KEYWORDS = List.of("restart", "start over", "reset");
    private static final int AUTO_ADVANCE_GUARD = 20;

    private final FlowDefinitionRegistry flowDefinitionRegistry;
    private final FlowSessionService flowSessionService;
    private final FlowActionHandlerRegistry flowActionHandlerRegistry;
    private final WhatsAppCloudApiClient whatsAppCloudApiClient;

    public WhatsAppFlowEngineService(
        FlowDefinitionRegistry flowDefinitionRegistry,
        FlowSessionService flowSessionService,
        FlowActionHandlerRegistry flowActionHandlerRegistry,
        WhatsAppCloudApiClient whatsAppCloudApiClient
    ) {
        this.flowDefinitionRegistry = flowDefinitionRegistry;
        this.flowSessionService = flowSessionService;
        this.flowActionHandlerRegistry = flowActionHandlerRegistry;
        this.whatsAppCloudApiClient = whatsAppCloudApiClient;
    }

    public boolean startFlowById(String flowId, String phoneNumber, String profileName) {
        Optional<FlowDefinition> flowOpt = flowDefinitionRegistry.findById(flowId);
        if (flowOpt.isEmpty()) {
            return false;
        }
        FlowDefinition flow = flowOpt.get();
        WhatsAppFlowSession session = flowSessionService.startSession(flow.getId(), phoneNumber, profileName);
        dispatchFromStep(flow, session, flow.getEntryStepId(), null);
        return true;
    }

    public void handleIncomingMessage(IncomingMessage incomingMessage) {
        if (incomingMessage == null || incomingMessage.getPhoneNumber() == null || incomingMessage.getPhoneNumber().isBlank()) {
            return;
        }

        Optional<WhatsAppFlowSession> activeSessionOpt = flowSessionService.findActiveSession(incomingMessage.getPhoneNumber());
        if (activeSessionOpt.isEmpty()) {
            handleNoActiveSession(incomingMessage);
            return;
        }

        WhatsAppFlowSession session = activeSessionOpt.get();
        Optional<FlowDefinition> flowDefinitionOpt = flowDefinitionRegistry.findById(session.getFlowId());
        if (flowDefinitionOpt.isEmpty()) {
            whatsAppCloudApiClient.sendText(
                session.getPhoneNumber(),
                "This conversation is unavailable right now. Please try again later.",
                session.getFlowId(),
                session.getId()
            );
            flowSessionService.markSessionError(session);
            return;
        }

        FlowDefinition flow = flowDefinitionOpt.get();
        String userInput = normalize(incomingMessage.getUserInput());

        if (isRestartRequested(flow, userInput)) {
            session = flowSessionService.restartSession(session);
            whatsAppCloudApiClient.sendText(
                session.getPhoneNumber(),
                "Restarted. Let's begin again.",
                flow.getId(),
                session.getId()
            );
            dispatchFromStep(flow, session, flow.getEntryStepId(), incomingMessage);
            return;
        }

        Optional<FlowDefinition> triggerFlow = flowDefinitionRegistry.resolveByTrigger(incomingMessage.getUserInput());
        if (triggerFlow.isPresent() && !Objects.equals(triggerFlow.get().getId(), flow.getId())) {
            whatsAppCloudApiClient.sendText(
                session.getPhoneNumber(),
                "Switching to " + triggerFlow.get().getName() + ".",
                triggerFlow.get().getId(),
                session.getId()
            );
            startFlowById(triggerFlow.get().getId(), session.getPhoneNumber(), incomingMessage.getProfileName());
            return;
        }

        String currentStepId = session.getCurrentStepId();
        if (currentStepId == null || currentStepId.isBlank()) {
            dispatchFromStep(flow, session, flow.getEntryStepId(), incomingMessage);
            return;
        }

        Optional<FlowStepDefinition> currentStepOpt = flowDefinitionRegistry.findStep(flow.getId(), currentStepId);
        if (currentStepOpt.isEmpty()) {
            flowSessionService.markSessionError(session);
            whatsAppCloudApiClient.sendText(
                session.getPhoneNumber(),
                "I couldn't continue this conversation. Please reply with a flow trigger to restart.",
                flow.getId(),
                session.getId()
            );
            return;
        }

        FlowStepDefinition currentStep = currentStepOpt.get();
        if (currentStep.getType() == FlowStepType.BUTTONS || currentStep.getType() == FlowStepType.LIST) {
            handleSelectionStep(flow, session, currentStep, incomingMessage);
            return;
        }

        if (currentStep.getType() == FlowStepType.INPUT) {
            handleInputStep(flow, session, currentStep, incomingMessage);
            return;
        }

        dispatchFromStep(flow, session, currentStep.getId(), incomingMessage);
    }

    private void handleNoActiveSession(IncomingMessage incomingMessage) {
        Optional<FlowDefinition> flowFromTrigger = flowDefinitionRegistry.resolveByTrigger(incomingMessage.getUserInput());
        if (flowFromTrigger.isPresent()) {
            FlowDefinition flow = flowFromTrigger.get();
            WhatsAppFlowSession session = flowSessionService.startSession(
                flow.getId(),
                incomingMessage.getPhoneNumber(),
                incomingMessage.getProfileName()
            );
            dispatchFromStep(flow, session, flow.getEntryStepId(), incomingMessage);
            return;
        }

        String helpText = flowDefinitionRegistry.buildFlowHelpText();
        whatsAppCloudApiClient.sendText(incomingMessage.getPhoneNumber(), helpText, null, null);
    }

    private void handleSelectionStep(
        FlowDefinition flow,
        WhatsAppFlowSession session,
        FlowStepDefinition step,
        IncomingMessage incomingMessage
    ) {
        String replyId = normalize(incomingMessage.getReplyId());
        String replyText = normalize(!replyId.isBlank() ? incomingMessage.getReplyTitle() : incomingMessage.getUserInput());

        Optional<FlowOptionDefinition> selectedOption = matchOption(step.getOptions(), replyId, replyText);
        if (selectedOption.isEmpty()) {
            sendUnknownInput(flow, session);
            promptStep(flow, session, step);
            return;
        }

        FlowOptionDefinition option = selectedOption.get();
        String answerKey = resolveAnswerKey(step);
        Object answerValue = option.getValue() != null && !option.getValue().isBlank() ? option.getValue() : option.getId();
        session = flowSessionService.saveAnswer(
            session,
            step.getId(),
            answerKey,
            answerValue,
            option.getTitle(),
            option.getScore(),
            option.getMetadata()
        );

        String nextStepId = option.getNextStepId();
        if (nextStepId == null || nextStepId.isBlank()) {
            nextStepId = resolveNextStep(step.getNext(), flowSessionService.readAnswers(session));
        }
        dispatchFromStep(flow, session, nextStepId, incomingMessage);
    }

    private void handleInputStep(
        FlowDefinition flow,
        WhatsAppFlowSession session,
        FlowStepDefinition step,
        IncomingMessage incomingMessage
    ) {
        String userInput = normalize(incomingMessage.getTextBody());
        if (userInput.isBlank()) {
            userInput = normalize(incomingMessage.getUserInput());
        }

        String validationError = validateInput(step.getValidation(), userInput);
        if (validationError != null) {
            whatsAppCloudApiClient.sendText(session.getPhoneNumber(), validationError, flow.getId(), session.getId());
            promptStep(flow, session, step);
            return;
        }

        String answerKey = resolveAnswerKey(step);
        session = flowSessionService.saveAnswer(
            session,
            step.getId(),
            answerKey,
            userInput,
            userInput,
            null,
            null
        );

        String nextStepId = resolveNextStep(step.getNext(), flowSessionService.readAnswers(session));
        dispatchFromStep(flow, session, nextStepId, incomingMessage);
    }

    private void dispatchFromStep(
        FlowDefinition flow,
        WhatsAppFlowSession session,
        String stepId,
        IncomingMessage incomingMessage
    ) {
        String currentStepId = stepId;
        int guard = 0;

        while (currentStepId != null && !currentStepId.isBlank() && guard < AUTO_ADVANCE_GUARD) {
            guard++;

            Optional<FlowStepDefinition> stepOpt = flowDefinitionRegistry.findStep(flow.getId(), currentStepId);
            if (stepOpt.isEmpty()) {
                whatsAppCloudApiClient.sendText(
                    session.getPhoneNumber(),
                    "Conversation step is unavailable. Please restart.",
                    flow.getId(),
                    session.getId()
                );
                flowSessionService.markSessionError(session);
                return;
            }

            FlowStepDefinition step = stepOpt.get();
            session = flowSessionService.updateCurrentStep(session, step.getId());
            Map<String, Object> answers = flowSessionService.readAnswers(session);

            if (step.getType() == FlowStepType.TEXT) {
                sendStepText(flow, session, step, answers);
                currentStepId = resolveNextStep(step.getNext(), answers);
                continue;
            }

            if (step.getType() == FlowStepType.ACTION) {
                ActionExecutionResult actionResult = executeAction(flow, session, step, incomingMessage, answers);
                session = flowSessionService.mergeAnswerUpdates(session, actionResult.getAnswerUpdates());
                Map<String, Object> updatedAnswers = flowSessionService.readAnswers(session);
                if (actionResult.getMessageToUser() != null && !actionResult.getMessageToUser().isBlank()) {
                    String rendered = renderTemplate(actionResult.getMessageToUser(), updatedAnswers);
                    whatsAppCloudApiClient.sendText(session.getPhoneNumber(), rendered, flow.getId(), session.getId());
                }
                currentStepId = actionResult.getNextStepId();
                if (currentStepId == null || currentStepId.isBlank()) {
                    currentStepId = resolveNextStep(step.getNext(), updatedAnswers);
                }
                continue;
            }

            if (step.getType() == FlowStepType.END) {
                sendStepText(flow, session, step, answers);
                flowSessionService.completeSession(session);
                return;
            }

            if (step.getType() == FlowStepType.BUTTONS || step.getType() == FlowStepType.LIST || step.getType() == FlowStepType.INPUT) {
                promptStep(flow, session, step);
                return;
            }

            currentStepId = resolveNextStep(step.getNext(), answers);
        }

        if (guard >= AUTO_ADVANCE_GUARD) {
            whatsAppCloudApiClient.sendText(
                session.getPhoneNumber(),
                "I hit a loop while processing this flow. Please reply with restart.",
                flow.getId(),
                session.getId()
            );
            flowSessionService.markSessionError(session);
        }
    }

    private ActionExecutionResult executeAction(
        FlowDefinition flow,
        WhatsAppFlowSession session,
        FlowStepDefinition step,
        IncomingMessage incomingMessage,
        Map<String, Object> answers
    ) {
        if (step.getActionHandler() == null || step.getActionHandler().isBlank()) {
            return ActionExecutionResult.empty();
        }

        Optional<FlowActionHandler> actionHandler = flowActionHandlerRegistry.find(step.getActionHandler());
        if (actionHandler.isEmpty()) {
            log.warn("Action handler {} is not configured for flow {}", step.getActionHandler(), flow.getId());
            return ActionExecutionResult.empty();
        }

        ActionExecutionContext context = new ActionExecutionContext(session, flow, step, incomingMessage, answers);
        try {
            ActionExecutionResult result = actionHandler.get().execute(context);
            return result == null ? ActionExecutionResult.empty() : result;
        } catch (Exception ex) {
            log.warn("Action handler {} failed for flow {} session {}: {}", step.getActionHandler(), flow.getId(), session.getId(), ex.getMessage());
            ActionExecutionResult failureResult = ActionExecutionResult.empty();
            failureResult.setMessageToUser("I could not complete one processing step, but we can continue.");
            return failureResult;
        }
    }

    private void promptStep(FlowDefinition flow, WhatsAppFlowSession session, FlowStepDefinition step) {
        Map<String, Object> answers = flowSessionService.readAnswers(session);
        String message = renderTemplate(step.getMessage(), answers);
        String header = renderTemplate(step.getHeader(), answers);
        String footer = renderTemplate(step.getFooter(), answers);

        if (step.getType() == FlowStepType.INPUT) {
            whatsAppCloudApiClient.sendText(session.getPhoneNumber(), message, flow.getId(), session.getId());
            return;
        }

        List<FlowOptionDefinition> options = sanitizeOptions(step.getOptions());
        if (options.isEmpty()) {
            whatsAppCloudApiClient.sendText(session.getPhoneNumber(), message, flow.getId(), session.getId());
            return;
        }

        if (step.getType() == FlowStepType.BUTTONS && options.size() <= 3) {
            whatsAppCloudApiClient.sendButtons(
                session.getPhoneNumber(),
                header,
                message,
                footer,
                options,
                flow.getId(),
                session.getId()
            );
            return;
        }

        String buttonText = step.getButtonText() == null || step.getButtonText().isBlank() ? "Select" : step.getButtonText();
        whatsAppCloudApiClient.sendList(
            session.getPhoneNumber(),
            header,
            message,
            footer,
            buttonText,
            options,
            flow.getId(),
            session.getId()
        );
    }

    private void sendStepText(
        FlowDefinition flow,
        WhatsAppFlowSession session,
        FlowStepDefinition step,
        Map<String, Object> answers
    ) {
        String message = renderTemplate(step.getMessage(), answers);
        WhatsAppSendResult sendResult = whatsAppCloudApiClient.sendText(
            session.getPhoneNumber(),
            message,
            flow.getId(),
            session.getId()
        );
        if (!sendResult.isSuccess()) {
            log.warn("Failed sending text step {} for flow {}: {}", step.getId(), flow.getId(), sendResult.getErrorMessage());
        }
    }

    private void sendUnknownInput(FlowDefinition flow, WhatsAppFlowSession session) {
        String text = flow.getUnknownInputMessage();
        if (text == null || text.isBlank()) {
            text = "I didn't understand that response. Please use one of the available options.";
        }
        whatsAppCloudApiClient.sendText(session.getPhoneNumber(), text, flow.getId(), session.getId());
    }

    private Optional<FlowOptionDefinition> matchOption(List<FlowOptionDefinition> options, String replyId, String replyText) {
        if (options == null || options.isEmpty()) {
            return Optional.empty();
        }

        if (replyId != null && !replyId.isBlank()) {
            for (FlowOptionDefinition option : options) {
                if (option != null && option.getId() != null && normalize(option.getId()).equals(replyId)) {
                    return Optional.of(option);
                }
            }
        }

        if (replyText != null && !replyText.isBlank()) {
            for (FlowOptionDefinition option : options) {
                if (option == null || option.getTitle() == null) {
                    continue;
                }
                if (normalize(option.getTitle()).equals(replyText)) {
                    return Optional.of(option);
                }
            }
        }

        return Optional.empty();
    }

    private String resolveAnswerKey(FlowStepDefinition step) {
        if (step.getAnswerKey() != null && !step.getAnswerKey().isBlank()) {
            return step.getAnswerKey();
        }
        return step.getId();
    }

    private String resolveNextStep(FlowNextConfig nextConfig, Map<String, Object> answers) {
        if (nextConfig == null) {
            return null;
        }

        List<FlowConditionRule> conditions = nextConfig.getConditions();
        if (conditions != null) {
            for (FlowConditionRule condition : conditions) {
                if (condition == null || condition.getAnswerKey() == null || condition.getAnswerKey().isBlank()) {
                    continue;
                }
                Object actual = answers.get(condition.getAnswerKey());
                if (evaluateCondition(actual, condition.getOperator(), condition.getValue())) {
                    return condition.getNextStepId();
                }
            }
        }
        return nextConfig.getDefaultStepId();
    }

    private boolean evaluateCondition(Object actual, String operator, Object expected) {
        String op = operator == null || operator.isBlank() ? "equals" : operator.trim().toLowerCase(Locale.ROOT);
        String actualString = actual == null ? "" : String.valueOf(actual);
        String expectedString = expected == null ? "" : String.valueOf(expected);

        return switch (op) {
            case "not_equals" -> !actualString.equalsIgnoreCase(expectedString);
            case "contains" -> actualString.toLowerCase(Locale.ROOT).contains(expectedString.toLowerCase(Locale.ROOT));
            case "in" -> {
                List<String> candidates = Arrays.stream(expectedString.split(","))
                    .map(this::normalize)
                    .filter(s -> !s.isBlank())
                    .toList();
                yield candidates.contains(normalize(actualString));
            }
            case "gt" -> parseDouble(actual) > parseDouble(expected);
            case "gte" -> parseDouble(actual) >= parseDouble(expected);
            case "lt" -> parseDouble(actual) < parseDouble(expected);
            case "lte" -> parseDouble(actual) <= parseDouble(expected);
            default -> actualString.equalsIgnoreCase(expectedString);
        };
    }

    private String validateInput(FlowValidationRule validation, String input) {
        if (validation == null) {
            return null;
        }

        boolean required = validation.getRequired() != null && validation.getRequired();
        if (required && (input == null || input.isBlank())) {
            return defaultError(validation, "This response is required.");
        }

        if ((input == null || input.isBlank()) && !required) {
            return null;
        }

        if (validation.getMinLength() != null && input.length() < validation.getMinLength()) {
            return defaultError(validation, "Response is too short.");
        }
        if (validation.getMaxLength() != null && input.length() > validation.getMaxLength()) {
            return defaultError(validation, "Response is too long.");
        }

        String type = validation.getType() == null ? "" : validation.getType().trim().toLowerCase(Locale.ROOT);
        if ("email".equals(type)) {
            boolean validEmail = input.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
            if (!validEmail) {
                return defaultError(validation, "Please share a valid work email address.");
            }
        }

        if (validation.getPattern() != null && !validation.getPattern().isBlank()) {
            if (!input.matches(validation.getPattern())) {
                return defaultError(validation, "Response format is invalid.");
            }
        }

        return null;
    }

    private String defaultError(FlowValidationRule rule, String fallback) {
        return rule.getErrorMessage() == null || rule.getErrorMessage().isBlank()
            ? fallback
            : rule.getErrorMessage();
    }

    private String renderTemplate(String template, Map<String, Object> answers) {
        if (template == null || template.isBlank()) {
            return "";
        }
        if (answers == null || answers.isEmpty()) {
            return template;
        }

        Matcher matcher = TEMPLATE_PATTERN.matcher(template);
        StringBuffer rendered = new StringBuffer();
        while (matcher.find()) {
            String key = matcher.group(1).trim();
            Object value = answers.get(key);
            String replacement = value == null ? "" : String.valueOf(value);
            matcher.appendReplacement(rendered, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(rendered);
        return rendered.toString();
    }

    private boolean isRestartRequested(FlowDefinition flow, String userInput) {
        if (userInput == null || userInput.isBlank()) {
            return false;
        }

        List<String> keywords = new ArrayList<>(GLOBAL_RESTART_KEYWORDS);
        if (flow.getRestartKeywords() != null) {
            keywords.addAll(flow.getRestartKeywords());
        }
        for (String keyword : keywords) {
            if (keyword != null && !keyword.isBlank() && normalize(keyword).equals(userInput)) {
                return true;
            }
        }
        return false;
    }

    private List<FlowOptionDefinition> sanitizeOptions(List<FlowOptionDefinition> options) {
        if (options == null || options.isEmpty()) {
            return List.of();
        }
        List<FlowOptionDefinition> sanitized = new ArrayList<>();
        for (FlowOptionDefinition option : options) {
            if (option == null || option.getId() == null || option.getTitle() == null) {
                continue;
            }
            sanitized.add(option);
        }
        return sanitized;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
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
