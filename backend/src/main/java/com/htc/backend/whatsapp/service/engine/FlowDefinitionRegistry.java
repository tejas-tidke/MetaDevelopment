package com.htc.backend.whatsapp.service.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.htc.backend.whatsapp.model.flow.FlowDefinition;
import com.htc.backend.whatsapp.model.flow.FlowStepDefinition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class FlowDefinitionRegistry {

    private static final Logger log = LoggerFactory.getLogger(FlowDefinitionRegistry.class);

    private final ObjectMapper objectMapper;
    private final ResourcePatternResolver resourceResolver = new PathMatchingResourcePatternResolver();

    private final Map<String, FlowDefinition> flowDefinitions = new ConcurrentHashMap<>();
    private final Map<String, Map<String, FlowStepDefinition>> stepIndexes = new ConcurrentHashMap<>();
    private final Map<String, String> triggerToFlowId = new ConcurrentHashMap<>();

    @Value("${whatsapp.flows.location:classpath:/whatsapp/flows/*.json}")
    private String flowLocationPattern;

    public FlowDefinitionRegistry(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void loadFlowDefinitions() {
        reload();
    }

    public synchronized void reload() {
        flowDefinitions.clear();
        stepIndexes.clear();
        triggerToFlowId.clear();

        try {
            Resource[] resources = resourceResolver.getResources(flowLocationPattern);
            for (Resource resource : resources) {
                try (InputStream is = resource.getInputStream()) {
                    FlowDefinition definition = objectMapper.readValue(is, FlowDefinition.class);
                    if (!isValidDefinition(definition)) {
                        log.warn("Skipping invalid flow definition from {}", resource.getFilename());
                        continue;
                    }

                    String flowId = definition.getId().trim();
                    Map<String, FlowStepDefinition> stepIndex = buildStepIndex(definition);
                    flowDefinitions.put(flowId, definition);
                    stepIndexes.put(flowId, stepIndex);

                    if (definition.getTriggers() != null) {
                        for (String trigger : definition.getTriggers()) {
                            if (trigger == null || trigger.isBlank()) {
                                continue;
                            }
                            triggerToFlowId.put(normalizeKey(trigger), flowId);
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Unable to parse flow definition {}: {}", resource.getFilename(), ex.getMessage());
                }
            }

            log.info("Loaded {} WhatsApp flow definitions from {}", flowDefinitions.size(), flowLocationPattern);
        } catch (Exception ex) {
            log.error("Failed loading WhatsApp flow definitions: {}", ex.getMessage(), ex);
        }
    }

    public Optional<FlowDefinition> findById(String flowId) {
        if (flowId == null || flowId.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(flowDefinitions.get(flowId.trim()));
    }

    public Optional<FlowDefinition> resolveByTrigger(String incomingText) {
        if (incomingText == null || incomingText.isBlank()) {
            return Optional.empty();
        }
        String normalized = normalizeKey(incomingText);
        if (triggerToFlowId.containsKey(normalized)) {
            return findById(triggerToFlowId.get(normalized));
        }

        for (Map.Entry<String, String> trigger : triggerToFlowId.entrySet()) {
            if (normalized.contains(trigger.getKey())) {
                return findById(trigger.getValue());
            }
        }
        return Optional.empty();
    }

    public Optional<FlowStepDefinition> findStep(String flowId, String stepId) {
        if (flowId == null || stepId == null) {
            return Optional.empty();
        }
        Map<String, FlowStepDefinition> index = stepIndexes.get(flowId);
        if (index == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(index.get(stepId));
    }

    public Collection<FlowDefinition> getAll() {
        return flowDefinitions.values();
    }

    public List<Map<String, Object>> getFlowSummaries() {
        List<Map<String, Object>> summaries = new ArrayList<>();
        for (FlowDefinition definition : flowDefinitions.values()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", definition.getId());
            item.put("name", definition.getName());
            item.put("description", definition.getDescription());
            item.put("version", definition.getVersion());
            item.put("entryStepId", definition.getEntryStepId());
            item.put("triggers", definition.getTriggers());
            item.put("stepCount", definition.getSteps() != null ? definition.getSteps().size() : 0);
            summaries.add(item);
        }
        return summaries;
    }

    public String buildFlowHelpText() {
        if (flowDefinitions.isEmpty()) {
            return "No WhatsApp flows are configured.";
        }

        String flowSummary = flowDefinitions.values()
            .stream()
            .map(flow -> {
                String trigger = flow.getTriggers() != null && !flow.getTriggers().isEmpty()
                    ? flow.getTriggers().get(0)
                    : flow.getId();
                return String.format("- %s (reply: %s)", flow.getName(), trigger);
            })
            .collect(Collectors.joining("\n"));

        return "I can start any of these conversations:\n" + flowSummary;
    }

    private Map<String, FlowStepDefinition> buildStepIndex(FlowDefinition definition) {
        Map<String, FlowStepDefinition> index = new HashMap<>();
        if (definition.getSteps() == null) {
            return index;
        }
        for (FlowStepDefinition step : definition.getSteps()) {
            if (step == null || step.getId() == null || step.getId().isBlank()) {
                continue;
            }
            index.put(step.getId(), step);
        }
        return index;
    }

    private boolean isValidDefinition(FlowDefinition definition) {
        if (definition == null) {
            return false;
        }
        if (definition.getId() == null || definition.getId().isBlank()) {
            return false;
        }
        if (definition.getEntryStepId() == null || definition.getEntryStepId().isBlank()) {
            return false;
        }
        if (definition.getSteps() == null || definition.getSteps().isEmpty()) {
            return false;
        }
        Map<String, FlowStepDefinition> stepIndex = buildStepIndex(definition);
        return stepIndex.containsKey(definition.getEntryStepId())
            && stepIndex.values().stream().filter(Objects::nonNull).allMatch(step -> step.getType() != null);
    }

    private String normalizeKey(String input) {
        return input.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}
