package com.htc.backend.whatsapp.service.action;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class FlowActionHandlerRegistry {

    private final Map<String, FlowActionHandler> handlers = new HashMap<>();

    public FlowActionHandlerRegistry(List<FlowActionHandler> availableHandlers) {
        for (FlowActionHandler handler : availableHandlers) {
            handlers.put(normalize(handler.getName()), handler);
        }
    }

    public Optional<FlowActionHandler> find(String handlerName) {
        if (handlerName == null || handlerName.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(handlers.get(normalize(handlerName)));
    }

    private String normalize(String name) {
        return name.trim().toLowerCase(Locale.ROOT);
    }
}
