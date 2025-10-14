package com.htc.backend.controller;

import com.htc.backend.dto.SendTemplateRequest;
import com.htc.backend.entity.UserDetails;
import com.htc.backend.repository.UserDetailsRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.core.ParameterizedTypeReference;

import java.util.*;
import java.util.stream.Collectors;
import java.util.Locale;

@RestController
@RequestMapping("/waba")
@CrossOrigin(origins = "http://localhost:5173")
public class WabaMessagesController {

    @Value("${waba.phone-number-id:}")
    private String phoneNumberId;

    @Value("${waba.access-token:}")
    private String accessToken;
    
    @Value("${waba.id:}")
    private String businessAccountId;

    private final RestTemplate restTemplate;
    private final UserDetailsRepository userDetailsRepository;

    // Constructor injection for both RestTemplate and UserDetailsRepository
    public WabaMessagesController(UserDetailsRepository userDetailsRepository, RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
        this.userDetailsRepository = userDetailsRepository;
    }

    @PostMapping("/send-template")
    public Map<String, Object> sendTemplate(@RequestBody SendTemplateRequest req) {
        Map<String, Object> resp = new HashMap<>();
        System.out.println("Received send template request: " + req.templateName); // Log the template name
        System.out.println("Request details: " + req); // Log the full request
        System.out.println("Parameters: " + req.parameters); // Log parameters specifically
        System.out.println("Personalize with user data: " + req.personalizeWithUserData); // Log personalization flag
        
        // Log the number of recipients
        int totalRecipients = req.to != null ? req.to.size() : 0;
        System.out.println("Total recipients: " + totalRecipients);
        
        if (totalRecipients > 500) {
            System.out.println("WARNING: Large batch detected (" + totalRecipients + " recipients). This may take a while.");
        }
        
        if (phoneNumberId == null || phoneNumberId.isBlank() || accessToken == null || accessToken.isBlank()) {
            resp.put("status", "error");
            resp.put("message", "WABA configuration missing. Set 'waba.phone-number-id' and 'waba.access-token'.");
            return resp;
        }

        if (req == null || req.templateName == null || req.templateName.isBlank() || req.language == null || req.language.isBlank()) {
            resp.put("status", "error");
            resp.put("message", "Invalid payload: templateName and language are required.");
            return resp;
        }
        
        // Verify template exists (optional check)
        if (!verifyTemplateExists(req.templateName, req.language)) {
            System.out.println("Warning: Template " + req.templateName + " may not exist or is not approved");
        }

        List<String> recipients = Optional.ofNullable(req.to).orElseGet(ArrayList::new)
                .stream().filter(Objects::nonNull)
                .map(String::trim).filter(s -> !s.isBlank())
                .map(this::normalizePhoneNumber) // Normalize phone numbers
                .collect(Collectors.toList());
        if (recipients.isEmpty()) {
            resp.put("status", "error");
            resp.put("message", "No recipients provided.");
            return resp;
        }
        
        System.out.println("Normalized recipients (including duplicates): " + recipients);

        // For very large batches (over 1000), process in smaller chunks to avoid memory issues
        if (recipients.size() > 1000) {
            System.out.println("Processing large batch in chunks to manage memory usage...");
            return processLargeBatchInChunks(req, recipients);
        }

        String url = String.format("https://graph.facebook.com/v19.0/%s/messages", phoneNumberId);
        System.out.println("WhatsApp API URL: " + url); // Log the URL for debugging
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        System.out.println("Using Access Token: " + (accessToken != null ? accessToken.substring(0, Math.min(20, accessToken.length())) + "..." : "NO")); // Log token status (truncated for security)
        System.out.println("Using Phone Number ID: " + phoneNumberId); // Log phone number ID
        System.out.println("Using Business Account ID: " + businessAccountId); // Log business account ID

        int sent = 0;
        List<Map<String, Object>> errors = new ArrayList<>();
        
        // For large batches, log progress at regular intervals
        int progressInterval = Math.max(10, recipients.size() / 10); // Log every 10% or every 10 recipients
        
        // Keep track of the last recipient to implement longer delays for consecutive messages to same number
        String lastRecipient = null;
        
        for (int i = 0; i < recipients.size(); i++) {
            String to = recipients.get(i);
            
            // Log progress for large batches
            if (recipients.size() > 100 && (i + 1) % progressInterval == 0) {
                System.out.println("Progress: " + (i + 1) + "/" + recipients.size() + " recipients processed (" + 
                    String.format("%.1f", (double)(i + 1) / recipients.size() * 100) + "%)");
            }
            
            System.out.println("Processing recipient " + (i+1) + "/" + recipients.size() + ": " + to);
            
            // Add a delay between messages to avoid rate limiting
            // Using minimum safe delays to optimize sending speed while avoiding rate limits
            if (i > 0) {
                try {
                    long delayMs = 1000; // Minimum safe delay: 1 second for different recipients
                    
                    // If sending to the same number as the last message, use a longer delay
                    // This is specifically for consecutive messages to the same phone number
                    // WhatsApp rate limits are per "Business Account, Consumer Account" pair
                    if (to.equals(lastRecipient)) {
                        delayMs = 2000; // 2 seconds for consecutive messages to same number (as requested)
                        System.out.println("Consecutive message to same recipient (" + to + "). Using 2-second delay to avoid rate limiting...");
                    } else {
                        System.out.println("Different recipient. Waiting 1 second before sending next message...");
                    }
                    
                    Thread.sleep(delayMs);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    System.err.println("Interrupted while waiting: " + e.getMessage());
                    Map<String, Object> error = new HashMap<>();
                    error.put("to", to);
                    error.put("error", "Process interrupted: " + e.getMessage());
                    errors.add(error);
                    break;
                }
            }
            
            lastRecipient = to; // Update the last recipient
            
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("messaging_product", "whatsapp");
            payload.put("to", to);
            payload.put("type", "template");

            Map<String, Object> template = new LinkedHashMap<>();
            template.put("name", req.templateName);
            Map<String, Object> language = new HashMap<>();
            language.put("code", req.language);  // Set the language code from request
            template.put("language", language);

            // Build components list dynamically (header + body)
            List<Map<String, Object>> components = new ArrayList<>();

            // Optional header support: TEXT or media (IMAGE/VIDEO/DOCUMENT)
            // Only add header if headerFormat is provided and we have either headerText or parameters
            if (req.headerFormat != null && !req.headerFormat.isBlank()) {
                String fmt = req.headerFormat.trim().toUpperCase(Locale.ROOT);
                Map<String, Object> headerComp = new HashMap<>();
                headerComp.put("type", "header");

                // Header support: TEXT or media (IMAGE/VIDEO/DOCUMENT)
                if ("TEXT".equals(fmt)) {
                    // Only add header text if it's provided and not empty
                    if (req.headerText != null && !req.headerText.isBlank()) {
                        Map<String, Object> headerComponent = new HashMap<>();
                        headerComponent.put("type", "header");
                        
                        List<Map<String, Object>> headerParams = new ArrayList<>();
                        Map<String, Object> textParam = new HashMap<>();
                        textParam.put("type", "text");
                        textParam.put("text", req.headerText.trim());
                        headerParams.add(textParam);
                        
                        headerComponent.put("parameters", headerParams);
                        components.add(headerComponent);
                    } else if (req.parameters != null && !req.parameters.isEmpty()) {
                        // Check if the first parameter is meant for the header
                        String text = req.getParameterAsString(0);
                        if (text != null && !text.isBlank()) {
                            Map<String, Object> headerComponent = new HashMap<>();
                            headerComponent.put("type", "header");
                            
                            List<Map<String, Object>> headerParams = new ArrayList<>();
                            Map<String, Object> textParam = new HashMap<>();
                            textParam.put("type", "text");
                            textParam.put("text", text);
                            headerParams.add(textParam);
                            
                            headerComponent.put("parameters", headerParams);
                            components.add(headerComponent);
                            // Don't remove from original list, we'll handle this differently
                        }
                    }
                } 
                // Handle media headers from parameters
                else if (Arrays.asList("IMAGE", "VIDEO", "DOCUMENT").contains(fmt) && 
                        req.parameters != null && !req.parameters.isEmpty()) {
                    Object firstParam = req.parameters.get(0);
                    if (firstParam instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> mediaParam = (Map<String, Object>) firstParam;
                        
                        // Log the received media parameter for debugging
                        System.out.println("Processing media parameter: " + mediaParam);
                        
                        // Create the header component
                        Map<String, Object> headerComponent = new HashMap<>();
                        headerComponent.put("type", "header");
                        
                        // Create parameters array for the header
                        List<Map<String, Object>> headerParams = new ArrayList<>();
                        
                        // The media parameter should already have the correct structure
                        // {type: 'image', image: {link: '...'}} or {type: 'image', image: {id: '...'}}
                        Map<String, Object> mediaComponent = new HashMap<>();
                        mediaComponent.put("type", fmt.toLowerCase());
                        
                        // Copy all properties from the media parameter except 'type'
                        for (Map.Entry<String, Object> entry : mediaParam.entrySet()) {
                            if (!"type".equals(entry.getKey())) {
                                mediaComponent.put(entry.getKey(), entry.getValue());
                            }
                        }
                        
                        headerParams.add(mediaComponent);
                        headerComponent.put("parameters", headerParams);
                        
                        components.add(headerComponent);
                        // Don't remove from original list, we'll handle this differently
                        System.out.println("Created header component: " + headerComponent);
                    }
                }
                // Handle media ID directly (when provided in the request)
                else if (Arrays.asList("IMAGE", "VIDEO", "DOCUMENT").contains(fmt)) {
                    // Check if media ID is provided directly in the request
                    if (req.mediaId != null && !req.mediaId.isBlank()) {
                        // Create the header component
                        Map<String, Object> headerComponent = new HashMap<>();
                        headerComponent.put("type", "header");
                        
                        // Create parameters array for the header
                        List<Map<String, Object>> headerParams = new ArrayList<>();
                        
                        // Create media component with ID
                        Map<String, Object> mediaComponent = new HashMap<>();
                        mediaComponent.put("type", fmt.toLowerCase());
                        
                        // Add the media object with ID
                        Map<String, Object> mediaObject = new HashMap<>();
                        mediaObject.put("id", req.mediaId.trim());
                        mediaComponent.put(fmt.toLowerCase(), mediaObject);
                        
                        headerParams.add(mediaComponent);
                        headerComponent.put("parameters", headerParams);
                        
                        components.add(headerComponent);
                        
                        System.out.println("Created header component with media ID: " + headerComponent);
                    }
                }
            }

            // Body parameters mapping (text variables)
            Map<String, Object> bodyComp = new HashMap<>();
            bodyComp.put("type", "body");
            List<Map<String, Object>> bodyParams = new ArrayList<>();
            
            // Add any provided parameters
            if (req.parameters != null && !req.parameters.isEmpty()) {
                // Create a copy of parameters to avoid modifying the original
                List<Object> paramsCopy = new ArrayList<>(req.parameters);
                
                // If we have a header and it needs the first parameter, remove it from the copy
                if (req.headerFormat != null && !req.headerFormat.isBlank()) {
                    String fmt = req.headerFormat.trim().toUpperCase(Locale.ROOT);
                    if (("TEXT".equals(fmt) && (req.headerText == null || req.headerText.isBlank())) || 
                        Arrays.asList("IMAGE", "VIDEO", "DOCUMENT").contains(fmt)) {
                        if (!paramsCopy.isEmpty()) {
                            paramsCopy.remove(0); // Remove the first parameter used for header
                        }
                    }
                }
                
                System.out.println("Processing body parameters: " + paramsCopy);
                
                for (Object param : paramsCopy) {
                    Map<String, Object> paramMap = new HashMap<>();
                    paramMap.put("type", "text");
                    
                    if (param instanceof String) {
                        paramMap.put("text", param);
                    } else if (param instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> p = (Map<String, Object>) param;
                        paramMap.put("text", p.getOrDefault("text", ""));
                    } else {
                        paramMap.put("text", String.valueOf(param));
                    }
                    
                    bodyParams.add(paramMap);
                }
            }
            
            // Personalize template with user data if requested - NEW APPROACH
            if (req.personalizeWithUserData != null && req.personalizeWithUserData) {
                System.out.println("=== NEW PERSONALIZATION APPROACH ===");
                System.out.println("Phone number for lookup: " + to);
                
                // Try to find user by phone number
                Optional<UserDetails> userDetailsOpt = findUserByPhoneNumberWithNormalization(to);
                if (userDetailsOpt.isPresent()) {
                    UserDetails userDetails = userDetailsOpt.get();
                    System.out.println("Found user for personalization: " + userDetails.getName());
                    
                    // Look for {{1}} or "1" in ALL parameters and replace
                    System.out.println("Checking ALL parameters for personalization:");
                    replacePlaceholdersInAllParameters(components, bodyParams, userDetails.getName());
                } else {
                    System.out.println("No user found for phone number: " + to);
                    // List all users for debugging
                    List<UserDetails> allUsers = userDetailsRepository.findAll();
                    System.out.println("Total users in database: " + allUsers.size());
                    for (UserDetails user : allUsers) {
                        System.out.println("  User: " + user.getName() + " - " + user.getPhoneNo());
                    }
                }
                System.out.println("=== END NEW PERSONALIZATION APPROACH ===");
            }
            
            // Add body component if we have parameters or if it's required by the template
            if (!bodyParams.isEmpty()) {
                System.out.println("Adding body component with parameters: " + bodyParams);
                bodyComp.put("parameters", bodyParams);
                components.add(bodyComp);
                System.out.println("Added body component to components list");
            } else {
                System.out.println("No body parameters to add");
            }
            
            // Add components to template if we have any
            if (!components.isEmpty()) {
                System.out.println("Processing components before adding to template: " + components);
                // Ensure we don't have duplicate components of the same type
                Map<String, Map<String, Object>> uniqueComponents = new LinkedHashMap<>();
                
                for (Map<String, Object> comp : components) {
                    String type = (String) comp.get("type");
                    if (type != null) {
                        System.out.println("Adding component of type: " + type);
                        uniqueComponents.put(type, comp);
                    } else {
                        System.out.println("Component without type found: " + comp);
                    }
                }
                
                List<Map<String, Object>> finalComponents = new ArrayList<>(uniqueComponents.values());
                template.put("components", finalComponents);
                System.out.println("Final template components: " + finalComponents);
            } else {
                System.out.println("No components to add to template");
            }
            payload.put("template", template);
            
            try {
                // Log the payload for debugging
                System.out.println("=== WHATSAPP API REQUEST DEBUG ===");
                System.out.println("Sending payload to WhatsApp API: " + payload);
                System.out.println("Final template structure: " + template);
                System.out.println("Template components: " + template.get("components"));
                System.out.println("URL: " + url);
                System.out.println("Headers: " + headers);
                System.out.println("=== END WHATSAPP API REQUEST DEBUG ===");
                
                HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
                ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, 
                    HttpMethod.POST, 
                    request, 
                    new ParameterizedTypeReference<>() {});
                
                // Log the full response for debugging
                System.out.println("=== WHATSAPP API RESPONSE DEBUG ===");
                System.out.println("WhatsApp API Response Status: " + response.getStatusCode());
                System.out.println("WhatsApp API Response Body: " + response.getBody());
                System.out.println("=== END WHATSAPP API RESPONSE DEBUG ===");
                
                if (response.getStatusCode().is2xxSuccessful()) {
                    sent++;
                    System.out.println("Message sent successfully to " + to);
                    
                    // Log success response details
                    if (response.getBody() != null) {
                        System.out.println("Success response: " + response.getBody());
                        Object messageId = response.getBody().get("messages");
                        if (messageId instanceof List) {
                            List<?> messages = (List<?>) messageId;
                            if (!messages.isEmpty() && messages.get(0) instanceof Map) {
                                Map<?, ?> firstMessage = (Map<?, ?>) messages.get(0);
                                System.out.println("Message ID: " + firstMessage.get("id"));
                            }
                        }
                    }
                } else {
                    Map<String, Object> error = new HashMap<>();
                    String errorMsg = "Status: " + response.getStatusCode().value();
                    if (response.getBody() != null) {
                        errorMsg += " - " + response.getBody().toString();
                        // Log the error response body for debugging
                        System.err.println("Error response body: " + response.getBody());
                        
                        // Try to parse error details
                        Object body = response.getBody();
                        if (body instanceof Map) {
                            Map<?, ?> errorBody = (Map<?, ?>) body;
                            Object errorObj = errorBody.get("error");
                            if (errorObj instanceof Map) {
                                Map<?, ?> errorDetails = (Map<?, ?>) errorObj;
                                System.err.println("Error code: " + errorDetails.get("code"));
                                System.err.println("Error message: " + errorDetails.get("message"));
                                System.err.println("Error type: " + errorDetails.get("type"));
                                System.err.println("Error fbtrace_id: " + errorDetails.get("fbtrace_id"));
                            }
                        }
                    }
                    error.put("to", to);
                    error.put("error", errorMsg);
                    errors.add(error);
                    System.err.println("Error sending to " + to + ": " + errorMsg);
                }
            } catch (HttpClientErrorException.Unauthorized e) {
                Map<String, Object> error = new HashMap<>();
                error.put("to", to);
                error.put("error", "Authentication failed (401 Unauthorized). Please check your WhatsApp access token and phone number ID configuration.");
                error.put("errorCode", "AUTH_FAILED");
                errors.add(error);
                System.err.println("Authentication failed sending to " + to + ": " + e.getMessage());
                System.err.println("Please verify your waba.access-token and waba.phone-number-id in application.properties");
            } catch (HttpClientErrorException e) {
                Map<String, Object> error = new HashMap<>();
                error.put("to", to);
                error.put("error", "HTTP error sending message: " + e.getMessage() + " (Status: " + e.getStatusCode() + ")");
                error.put("errorCode", "HTTP_ERROR");
                error.put("statusCode", e.getStatusCode().value());
                errors.add(error);
                System.err.println("HTTP error sending to " + to + ": " + e.getMessage());
                
                // Log response body if available
                if (e.getResponseBodyAsString() != null && !e.getResponseBodyAsString().isEmpty()) {
                    System.err.println("Response body: " + e.getResponseBodyAsString());
                }
            } catch (Exception e) {
                Map<String, Object> error = new HashMap<>();
                error.put("to", to);
                error.put("error", "Error sending message: " + e.getMessage());
                error.put("errorCode", "GENERAL_ERROR");
                errors.add(error);
                System.err.println("Exception sending to " + to + ": " + e.getMessage());
                e.printStackTrace(); // Print full stack trace for debugging
            }
        }

        // Prepare response with enhanced information for large batches
        Map<String, Object> result = new HashMap<>();
        result.put("status", errors.isEmpty() ? "success" : (sent > 0 ? "partial_success" : "error"));
        
        if (errors.isEmpty()) {
            result.put("message", String.format("Successfully sent message to %d recipient(s)", sent));
        } else if (sent > 0) {
            result.put("message", String.format("Partially sent: %d successful, %d failed", sent, recipients.size() - sent));
        } else {
            result.put("message", String.format("Failed to send message to %d recipient(s)", recipients.size() - sent));
        }
        
        result.put("sent", sent);
        result.put("failed", recipients.size() - sent);
        result.put("total", recipients.size());
        
        // For large batches, include additional statistics
        if (recipients.size() > 100) {
            result.put("batchSize", recipients.size());
            result.put("successRate", String.format("%.2f%%", (double) sent / recipients.size() * 100));
        }
        
        if (!errors.isEmpty()) {
            // For large batches, limit the number of detailed errors to prevent response bloat
            if (recipients.size() > 100 && errors.size() > 50) {
                List<Map<String, Object>> limitedErrors = errors.subList(0, 50);
                result.put("errors", limitedErrors);
                result.put("errorCount", errors.size());
                result.put("additionalErrors", errors.size() - 50);
                System.out.println("Total errors: " + errors.size() + " (only first 50 shown in response)");
            } else {
                result.put("errors", errors);
            }
        }
        
        // Log final summary
        System.out.println("=== BATCH SEND SUMMARY ===");
        System.out.println("Total recipients: " + recipients.size());
        System.out.println("Successfully sent: " + sent);
        System.out.println("Failed: " + (recipients.size() - sent));
        if (!errors.isEmpty()) {
            System.out.println("Error details: " + errors.size() + " errors encountered");
        }
        System.out.println("=== END BATCH SEND SUMMARY ===");
        
        return result;
    }

    // Add a method to test WhatsApp API authentication
    @GetMapping("/debug/auth")
    public Map<String, Object> debugAuth() {
        Map<String, Object> response = new HashMap<>();
        try {
            // Test if we can access the phone number
            String url = String.format("https://graph.facebook.com/v19.0/%s", phoneNumberId);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<Map> apiResponse = restTemplate.exchange(
                url, HttpMethod.GET, entity, Map.class);
            
            response.put("status", "success");
            response.put("authCheck", "Authentication successful");
            response.put("response", apiResponse.getBody());
        } catch (HttpClientErrorException.Unauthorized e) {
            response.put("status", "error");
            response.put("authCheck", "Authentication failed (401 Unauthorized)");
            response.put("message", "Please check your WhatsApp access token and phone number ID configuration.");
            System.err.println("Auth test failed: " + e.getMessage());
        } catch (Exception e) {
            response.put("status", "error");
            response.put("authCheck", "Authentication test failed");
            response.put("message", e.getMessage());
            e.printStackTrace();
        }
        return response;
    }

    // Add a method to check database status
    @GetMapping("/debug/users")
    public Map<String, Object> debugUsers() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<UserDetails> allUsers = userDetailsRepository.findAll();
            response.put("status", "success");
            response.put("userCount", allUsers.size());
            response.put("sampleUsers", allUsers.stream().limit(5).map(u -> Map.of(
                "id", u.getId(),
                "name", u.getName(),
                "phone", u.getPhoneNo(),
                "email", u.getEmail()
            )).collect(Collectors.toList()));
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
        }
        return response;
    }

    // Add a method to test user lookup
    @GetMapping("/debug/find-user/{phoneNumber}")
    public Map<String, Object> findUser(@PathVariable String phoneNumber) {
        Map<String, Object> response = new HashMap<>();
        try {
            System.out.println("Looking for user with phone: " + phoneNumber);
            
            // Try exact match first
            Optional<UserDetails> user = findUserByPhoneNumberWithNormalization(phoneNumber);
            if (user.isPresent()) {
                response.put("status", "success");
                response.put("user", user.get());
                System.out.println("Found user with exact match: " + user.get().getName());
                return response;
            }
            
            // List all users for debugging
            System.out.println("User not found. Listing all users:");
            List<UserDetails> allUsers = userDetailsRepository.findAll();
            for (UserDetails u : allUsers) {
                System.out.println("  - " + u.getName() + " (" + u.getPhoneNo() + ")");
            }
            
            response.put("status", "not_found");
            response.put("message", "User not found for phone: " + phoneNumber);
            response.put("allUsers", allUsers.size());
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
            e.printStackTrace();
        }
        return response;
    }

    // Add a method to test phone number lookup
    @GetMapping("/debug/user-by-phone/{phoneNumber}")
    public Map<String, Object> debugUserByPhone(@PathVariable String phoneNumber) {
        Map<String, Object> response = new HashMap<>();
        try {
            System.out.println("Looking up user by phone: '" + phoneNumber + "'");
            Optional<UserDetails> user = findUserByPhoneNumberWithNormalization(phoneNumber);
            if (user.isPresent()) {
                response.put("status", "success");
                response.put("user", Map.of(
                    "id", user.get().getId(),
                    "name", user.get().getName(),
                    "phone", user.get().getPhoneNo(),
                    "email", user.get().getEmail()
                ));
            } else {
                response.put("status", "not_found");
                response.put("message", "No user found with phone: " + phoneNumber);
            }
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
            e.printStackTrace();
        }
        return response;
    }

    // Add a method to test phone number matching
    @GetMapping("/debug/test-phone-match")
    public Map<String, Object> debugPhoneMatch() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<UserDetails> allUsers = userDetailsRepository.findAll();
            response.put("status", "success");
            response.put("userCount", allUsers.size());
            
            List<Map<String, Object>> userList = new ArrayList<>();
            for (UserDetails user : allUsers) {
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("id", user.getId());
                userMap.put("name", user.getName());
                userMap.put("phone", user.getPhoneNo());
                userMap.put("phoneLength", user.getPhoneNo() != null ? user.getPhoneNo().length() : 0);
                userMap.put("phoneChars", user.getPhoneNo() != null ? user.getPhoneNo().chars().mapToObj(c -> (char) c).toArray() : new char[0]);
                userList.add(userMap);
            }
            response.put("users", userList);
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
            e.printStackTrace();
        }
        return response;
    }

    // Add a method to test personalization directly
    @PostMapping("/debug/test-personalization")
    public Map<String, Object> testPersonalization(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String phoneNumber = (String) request.get("phoneNumber");
            String templateBody = (String) request.get("templateBody");
            
            System.out.println("Testing personalization for phone: " + phoneNumber);
            System.out.println("Template body: " + templateBody);
            
            // Try to find user by phone number
            Optional<UserDetails> userDetailsOpt = findUserByPhoneNumberWithNormalization(phoneNumber);
            if (userDetailsOpt.isPresent()) {
                UserDetails userDetails = userDetailsOpt.get();
                System.out.println("Found user: " + userDetails.getName());
                
                // Simulate personalization
                String personalizedBody = templateBody.replace("{{1}}", userDetails.getName())
                                                     .replace("1", userDetails.getName());
                
                response.put("status", "success");
                response.put("originalBody", templateBody);
                response.put("personalizedBody", personalizedBody);
                response.put("userName", userDetails.getName());
            } else {
                response.put("status", "error");
                response.put("message", "No user found for phone: " + phoneNumber);
            }
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
            e.printStackTrace();
        }
        return response;
    }

    // Add a method to test direct personalization
    @PostMapping("/debug/direct-personalize")
    public Map<String, Object> directPersonalize(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String phoneNumber = (String) request.get("phoneNumber");
            List<Map<String, Object>> parameters = (List<Map<String, Object>>) request.get("parameters");
            
            System.out.println("Direct personalization test:");
            System.out.println("Phone number: " + phoneNumber);
            System.out.println("Parameters: " + parameters);
            
            // Try to find user by phone number
            Optional<UserDetails> userDetailsOpt = findUserByPhoneNumberWithNormalization(phoneNumber);
            if (userDetailsOpt.isPresent()) {
                UserDetails userDetails = userDetailsOpt.get();
                System.out.println("Found user: " + userDetails.getName());
                
                // Apply personalization directly
                if (parameters != null) {
                    for (Map<String, Object> param : parameters) {
                        String text = (String) param.get("text");
                        System.out.println("Checking parameter text: " + text);
                        if ("{{1}}".equals(text) || "1".equals(text)) {
                            param.put("text", userDetails.getName());
                            System.out.println("Replaced with: " + userDetails.getName());
                        }
                    }
                }
                
                response.put("status", "success");
                response.put("personalizedParameters", parameters);
                response.put("userName", userDetails.getName());
            } else {
                response.put("status", "error");
                response.put("message", "User not found for phone: " + phoneNumber);
            }
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
            e.printStackTrace();
        }
        return response;
    }

    // Add a method for standalone personalization test
    @PostMapping("/debug/standalone-test")
    public Map<String, Object> standaloneTest(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        try {
            // Create test data that mimics what we expect
            List<Map<String, Object>> testBodyParams = new ArrayList<>();
            Map<String, Object> placeholderParam = new HashMap<>();
            placeholderParam.put("type", "text");
            placeholderParam.put("text", "{{1}}"); // This is what we want to replace
            testBodyParams.add(placeholderParam);
            
            Map<String, Object> orderParam = new HashMap<>();
            orderParam.put("type", "text");
            orderParam.put("text", "#12345");
            testBodyParams.add(orderParam);
            
            System.out.println("Before personalization: " + testBodyParams);
            
            // Simulate personalization
            String userName = "John Doe"; // Test user name
            for (Map<String, Object> param : testBodyParams) {
                String text = (String) param.get("text");
                if ("{{1}}".equals(text)) {
                    param.put("text", userName);
                    System.out.println("Successfully replaced {{1}} with " + userName);
                    break;
                }
            }
            
            System.out.println("After personalization: " + testBodyParams);
            
            response.put("status", "success");
            response.put("result", testBodyParams);
            response.put("message", "Personalization test completed");
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
            e.printStackTrace();
        }
        return response;
    }

    // Add a method to get template details for debugging
    @GetMapping("/debug/template/{templateName}")
    public Map<String, Object> debugTemplate(@PathVariable String templateName) {
        Map<String, Object> response = new HashMap<>();
        try {
            String url = String.format("https://graph.facebook.com/v19.0/%s/message_templates?name=%s", 
                businessAccountId, templateName);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<Map> apiResponse = restTemplate.exchange(
                url, HttpMethod.GET, entity, Map.class);
            
            response.put("status", "success");
            response.put("apiResponse", apiResponse.getBody());
            
            // Also log the template structure for debugging
            if (apiResponse.getBody() != null && apiResponse.getBody().containsKey("data")) {
                Object data = apiResponse.getBody().get("data");
                System.out.println("Template data: " + data);
            }
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
            e.printStackTrace();
        }
        return response;
    }

    // Add a method to check template status and details
    @GetMapping("/debug/template-status/{templateName}")
    public Map<String, Object> checkTemplateStatus(@PathVariable String templateName) {
        Map<String, Object> response = new HashMap<>();
        try {
            String url = String.format("https://graph.facebook.com/v19.0/%s/message_templates?name=%s", 
                businessAccountId, templateName);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<Map> apiResponse = restTemplate.exchange(
                url, HttpMethod.GET, entity, Map.class);
            
            if (apiResponse.getStatusCode().is2xxSuccessful() && apiResponse.getBody() != null) {
                response.put("status", "success");
                response.put("templateData", apiResponse.getBody());
                
                // Analyze template data
                Object dataObj = apiResponse.getBody().get("data");
                if (dataObj instanceof List) {
                    List<?> dataList = (List<?>) dataObj;
                    if (!dataList.isEmpty()) {
                        response.put("templateFound", true);
                        Object firstTemplate = dataList.get(0);
                        if (firstTemplate instanceof Map) {
                            Map<?, ?> template = (Map<?, ?>) firstTemplate;
                            response.put("templateName", template.get("name"));
                            response.put("templateStatus", template.get("status"));
                            response.put("templateCategory", template.get("category"));
                            response.put("templateLanguage", template.get("language"));
                            
                            System.out.println("Template Analysis for: " + templateName);
                            System.out.println("  Name: " + template.get("name"));
                            System.out.println("  Status: " + template.get("status"));
                            System.out.println("  Category: " + template.get("category"));
                            System.out.println("  Language: " + template.get("language"));
                            
                            // Check if template is approved
                            String status = (String) template.get("status");
                            if (!"APPROVED".equals(status)) {
                                response.put("issue", "Template not approved. Current status: " + status);
                                System.out.println("  ISSUE: Template not approved. Current status: " + status);
                            }
                            
                            // Check components
                            Object componentsObj = template.get("components");
                            if (componentsObj instanceof List) {
                                List<?> components = (List<?>) componentsObj;
                                System.out.println("  Components count: " + components.size());
                                for (int i = 0; i < components.size(); i++) {
                                    Object comp = components.get(i);
                                    if (comp instanceof Map) {
                                        Map<?, ?> component = (Map<?, ?>) comp;
                                        System.out.println("    Component " + i + ": " + component.get("type"));
                                        if (component.containsKey("format")) {
                                            System.out.println("      Format: " + component.get("format"));
                                        }
                                        if (component.containsKey("text")) {
                                            System.out.println("      Text: " + component.get("text"));
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        response.put("templateFound", false);
                        response.put("issue", "Template not found in WhatsApp Business API");
                        System.out.println("Template not found: " + templateName);
                    }
                }
            } else {
                response.put("status", "error");
                response.put("message", "API request failed: " + apiResponse.getStatusCode());
                System.out.println("API request failed for template: " + templateName + " - " + apiResponse.getStatusCode());
            }
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
            System.out.println("Exception checking template status: " + e.getMessage());
            e.printStackTrace();
        }
        return response;
    }

    // Add a method to get the exact template structure from WhatsApp
    @GetMapping("/debug/exact-template/{templateName}")
    public Map<String, Object> getExactTemplate(@PathVariable String templateName) {
        Map<String, Object> response = new HashMap<>();
        try {
            String url = String.format("https://graph.facebook.com/v19.0/%s/message_templates?name=%s", 
                businessAccountId, templateName);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<Map> apiResponse = restTemplate.exchange(
                url, HttpMethod.GET, entity, Map.class);
            
            if (apiResponse.getStatusCode().is2xxSuccessful() && apiResponse.getBody() != null) {
                response.put("status", "success");
                response.put("templateData", apiResponse.getBody());
                
                // Log the template structure
                System.out.println("Exact template data: " + apiResponse.getBody());
                
                // Check if data array exists and has templates
                Object dataObj = apiResponse.getBody().get("data");
                if (dataObj instanceof List) {
                    List<?> dataList = (List<?>) dataObj;
                    if (!dataList.isEmpty() && dataList.get(0) instanceof Map) {
                        Map<?, ?> template = (Map<?, ?>) dataList.get(0);
                        System.out.println("Template name: " + template.get("name"));
                        System.out.println("Template components: " + template.get("components"));
                        
                        // Look for body component
                        Object componentsObj = template.get("components");
                        if (componentsObj instanceof List) {
                            List<?> components = (List<?>) componentsObj;
                            for (Object comp : components) {
                                if (comp instanceof Map) {
                                    Map<?, ?> component = (Map<?, ?>) comp;
                                    String type = (String) component.get("type");
                                    System.out.println("Component type: " + type);
                                    if ("BODY".equals(type)) {
                                        System.out.println("Body component: " + component);
                                        System.out.println("Body text: " + component.get("text"));
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                response.put("status", "error");
                response.put("message", "Failed to fetch template: " + apiResponse.getStatusCode());
            }
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
            e.printStackTrace();
        }
        return response;
    }

    // Add a method to list all templates with detailed information
    @GetMapping("/debug/all-templates")
    public Map<String, Object> listAllTemplates() {
        Map<String, Object> response = new HashMap<>();
        try {
            String url = String.format("https://graph.facebook.com/v19.0/%s/message_templates?limit=100", businessAccountId);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<Map> apiResponse = restTemplate.exchange(
                url, HttpMethod.GET, entity, Map.class);
            
            if (apiResponse.getStatusCode().is2xxSuccessful() && apiResponse.getBody() != null) {
                response.put("status", "success");
                response.put("rawData", apiResponse.getBody());
                
                // Analyze templates
                Object dataObj = apiResponse.getBody().get("data");
                if (dataObj instanceof List) {
                    List<?> dataList = (List<?>) dataObj;
                    List<Map<String, Object>> templateList = new ArrayList<>();
                    
                    System.out.println("=== ALL TEMPLATES ANALYSIS ===");
                    System.out.println("Total templates found: " + dataList.size());
                    
                    for (Object item : dataList) {
                        if (item instanceof Map) {
                            Map<?, ?> template = (Map<?, ?>) item;
                            Map<String, Object> templateInfo = new HashMap<>();
                            
                            String name = (String) template.get("name");
                            String status = (String) template.get("status");
                            String category = (String) template.get("category");
                            String language = (String) template.get("language");
                            
                            templateInfo.put("name", name);
                            templateInfo.put("status", status);
                            templateInfo.put("category", category);
                            templateInfo.put("language", language);
                            
                            System.out.println("Template: " + name);
                            System.out.println("  Status: " + status);
                            System.out.println("  Category: " + category);
                            System.out.println("  Language: " + language);
                            
                            // Check for specific templates
                            if ("my_m_one".equals(name)) {
                                System.out.println("  >>> TARGET TEMPLATE (my_m_one) <<<");
                                if (!"APPROVED".equals(status)) {
                                    System.out.println("  >>> ISSUE: Not approved! <<<");
                                }
                            } else if ("auto_pay_reminder_2".equals(name)) {
                                System.out.println("  >>> WORKING TEMPLATE (auto_pay_reminder_2) <<<");
                            }
                            
                            templateList.add(templateInfo);
                        }
                    }
                    
                    response.put("templates", templateList);
                    System.out.println("=== END TEMPLATES ANALYSIS ===");
                }
            } else {
                response.put("status", "error");
                response.put("message", "API request failed: " + apiResponse.getStatusCode());
            }
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
            e.printStackTrace();
        }
        return response;
    }

    // Helper method to verify if template exists (optional)
    private boolean verifyTemplateExists(String templateName, String language) {
        try {
            String url = String.format("https://graph.facebook.com/v19.0/%s/message_templates?name=%s", 
                businessAccountId, templateName);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object data = response.getBody().get("data");
                if (data instanceof List) {
                    List<?> templates = (List<?>) data;
                    // Filter by language if provided
                    if (language != null && !language.isBlank()) {
                        return templates.stream().anyMatch(template -> {
                            if (template instanceof Map) {
                                Map<?, ?> templateMap = (Map<?, ?>) template;
                                Object templateLang = templateMap.get("language");
                                return language.equals(templateLang);
                            }
                            return false;
                        });
                    }
                    return !templates.isEmpty();
                }
            }
        } catch (Exception e) {
            System.out.println("Could not verify template existence: " + e.getMessage());
            e.printStackTrace();
        }
        return true; // Assume template exists if we can't verify
    }

    // Helper method to normalize phone numbers
    private String normalizePhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return phoneNumber;
        }
        // Remove all spaces, dashes, and other non-digit characters except the plus sign at the beginning
        String normalized = phoneNumber.trim();
        if (normalized.startsWith("+")) {
            normalized = "+" + normalized.substring(1).replaceAll("[^0-9]", "");
        } else {
            normalized = normalized.replaceAll("[^0-9]", "");
        }
        System.out.println("Normalized phone number: " + phoneNumber + " -> " + normalized);
        return normalized;
    }

    // Helper method to replace placeholders in all parameters
    private void replacePlaceholdersInAllParameters(List<Map<String, Object>> components, List<Map<String, Object>> bodyParams, String userName) {
        System.out.println("Replacing placeholders with user name: " + userName);
        
        // Check body parameters
        System.out.println("Body parameters before replacement: " + bodyParams);
        for (Map<String, Object> param : bodyParams) {
            String text = (String) param.get("text");
            if (text != null) {
                System.out.println("Checking body param text: " + text);
                if ("{{1}}".equals(text)) {
                    param.put("text", userName);
                    System.out.println("Replaced {{1}} with: " + userName);
                } else if ("1".equals(text)) {
                    param.put("text", userName);
                    System.out.println("Replaced 1 with: " + userName);
                }
            }
        }
        System.out.println("Body parameters after replacement: " + bodyParams);
        
        // Check component parameters
        System.out.println("Components before replacement: " + components);
        for (Map<String, Object> component : components) {
            Object parametersObj = component.get("parameters");
            if (parametersObj instanceof List) {
                List<Map<String, Object>> params = (List<Map<String, Object>>) parametersObj;
                for (Map<String, Object> param : params) {
                    String text = (String) param.get("text");
                    if (text != null) {
                        System.out.println("Checking component param text: " + text);
                        if ("{{1}}".equals(text)) {
                            param.put("text", userName);
                            System.out.println("Replaced {{1}} with: " + userName);
                        } else if ("1".equals(text)) {
                            param.put("text", userName);
                            System.out.println("Replaced 1 with: " + userName);
                        }
                    }
                }
            }
        }
        System.out.println("Components after replacement: " + components);
    }
    
    // Helper method to process large batches in smaller chunks
    private Map<String, Object> processLargeBatchInChunks(SendTemplateRequest originalRequest, List<String> allRecipients) {
        Map<String, Object> finalResult = new HashMap<>();
        int totalSent = 0;
        int totalFailed = 0;
        List<Map<String, Object>> allErrors = new ArrayList<>();
        
        // Split into chunks of 100 recipients each (hardcoded instead of using BatchProcessingUtil)
        int chunkSize = 100;
        List<List<String>> chunks = new ArrayList<>();
        for (int i = 0; i < allRecipients.size(); i += chunkSize) {
            int end = Math.min(i + chunkSize, allRecipients.size());
            chunks.add(allRecipients.subList(i, end));
        }
        System.out.println("Splitting " + allRecipients.size() + " recipients into " + chunks.size() + " chunks of max " + chunkSize + " each");
        
        for (int i = 0; i < chunks.size(); i++) {
            List<String> chunk = chunks.get(i);
            System.out.println("Processing chunk " + (i+1) + "/" + chunks.size() + " with " + chunk.size() + " recipients");
            
            // Create a new request for this chunk
            SendTemplateRequest chunkRequest = new SendTemplateRequest();
            chunkRequest.templateName = originalRequest.templateName;
            chunkRequest.language = originalRequest.language;
            chunkRequest.to = chunk;
            chunkRequest.parameters = originalRequest.parameters;
            chunkRequest.headerFormat = originalRequest.headerFormat;
            chunkRequest.headerText = originalRequest.headerText;
            chunkRequest.mediaId = originalRequest.mediaId;
            chunkRequest.personalizeWithUserData = originalRequest.personalizeWithUserData;
            // Copy additional fields if they exist
            chunkRequest.headerMediaUrl = originalRequest.headerMediaUrl;
            chunkRequest.headerMediaFilename = originalRequest.headerMediaFilename;
            
            // Process this chunk
            Map<String, Object> chunkResult = sendTemplateChunk(chunkRequest);
            
            // Aggregate results
            Integer chunkSent = (Integer) chunkResult.get("sent");
            Integer chunkFailed = (Integer) chunkResult.get("failed");
            
            if (chunkSent != null) totalSent += chunkSent;
            if (chunkFailed != null) totalFailed += chunkFailed;
            
            // Collect errors
            Object errorsObj = chunkResult.get("errors");
            if (errorsObj instanceof List) {
                allErrors.addAll((List<Map<String, Object>>) errorsObj);
            }
            
            // Add a delay between chunks to avoid rate limiting
            // Using minimum safe delay between chunks
            if (i < chunks.size() - 1) { // Don't delay after the last chunk
                try {
                    System.out.println("Waiting 10 seconds between chunks to avoid rate limiting...");
                    Thread.sleep(10000); // Minimum safe delay: 10 seconds between chunks
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    System.err.println("Interrupted while waiting between chunks: " + e.getMessage());
                    break;
                }
            }

        }
        
        // Prepare final result
        finalResult.put("status", allErrors.isEmpty() ? "success" : (totalSent > 0 ? "partial_success" : "error"));
        finalResult.put("message", String.format("Processed %d recipients in %d chunks: %d successful, %d failed", 
            allRecipients.size(), chunks.size(), totalSent, totalFailed));
        finalResult.put("sent", totalSent);
        finalResult.put("failed", totalFailed);
        finalResult.put("total", allRecipients.size());
        finalResult.put("chunks", chunks.size());

        if (!allErrors.isEmpty()) {
            // Limit errors in response to prevent oversized responses
            if (allErrors.size() > 50) {
                finalResult.put("errors", allErrors.subList(0, 50));
                finalResult.put("errorCount", allErrors.size());
                finalResult.put("additionalErrors", allErrors.size() - 50);
            } else {
                finalResult.put("errors", allErrors);
            }
        }
        
        System.out.println("=== LARGE BATCH PROCESSING COMPLETE ===");
        System.out.println("Total recipients: " + allRecipients.size());
        System.out.println("Chunks processed: " + chunks.size());
        System.out.println("Total sent: " + totalSent);
        System.out.println("Total failed: " + totalFailed);
        System.out.println("=== END LARGE BATCH PROCESSING ===");
        
        return finalResult;
    }
    
    // Helper method to send a chunk of messages
    private Map<String, Object> sendTemplateChunk(SendTemplateRequest req) {
        // This is a simplified version of the main sendTemplate logic for chunks
        // We'll reuse the existing logic but with some modifications for chunked processing
        
        Map<String, Object> result = new HashMap<>();
        int sent = 0;
        List<Map<String, Object>> errors = new ArrayList<>();
        
        String url = String.format("https://graph.facebook.com/v19.0/%s/messages", phoneNumberId);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        // Keep track of the last recipient to implement longer delays for consecutive messages to same number
        String lastRecipient = null;
        
        // Process each recipient in the chunk
        for (int i = 0; i < req.to.size(); i++) {
            String to = req.to.get(i);
            System.out.println("Processing chunk recipient " + (i+1) + "/" + req.to.size() + ": " + to);
            
            // Add a delay between messages to avoid rate limiting
            // Using minimum safe delays to optimize sending speed while avoiding rate limits
            if (i > 0) {
                try {
                    long delayMs = 1000; // Minimum safe delay: 1 second for different recipients
                    
                    // If sending to the same number as the last message, use a longer delay
                    // This is specifically for consecutive messages to the same phone number
                    // WhatsApp rate limits are per "Business Account, Consumer Account" pair
                    if (to.equals(lastRecipient)) {
                        delayMs = 2000; // 2 seconds for consecutive messages to same number (as requested)
                        System.out.println("Consecutive message to same recipient (" + to + "). Using 2-second delay to avoid rate limiting...");
                    } else {
                        System.out.println("Different recipient. Waiting 1 second before sending next message...");
                    }
                    
                    Thread.sleep(delayMs);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    System.err.println("Interrupted while waiting: " + e.getMessage());
                    Map<String, Object> error = new HashMap<>();
                    error.put("to", to);
                    error.put("error", "Process interrupted: " + e.getMessage());
                    errors.add(error);
                    break;
                }
            }
            
            lastRecipient = to; // Update the last recipient
            
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("messaging_product", "whatsapp");
            payload.put("to", to);
            payload.put("type", "template");

            Map<String, Object> template = new LinkedHashMap<>();
            template.put("name", req.templateName);
            Map<String, Object> language = new HashMap<>();
            language.put("code", req.language);
            template.put("language", language);

            // Build components (simplified version)
            List<Map<String, Object>> components = new ArrayList<>();
            
            // Add body component if we have parameters
            if (req.parameters != null && !req.parameters.isEmpty()) {
                Map<String, Object> bodyComp = new HashMap<>();
                bodyComp.put("type", "body");
                List<Map<String, Object>> bodyParams = new ArrayList<>();
                
                for (Object param : req.parameters) {
                    Map<String, Object> paramMap = new HashMap<>();
                    paramMap.put("type", "text");
                    
                    if (param instanceof String) {
                        paramMap.put("text", param);
                    } else if (param instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> p = (Map<String, Object>) param;
                        paramMap.put("text", p.getOrDefault("text", ""));
                    } else {
                        paramMap.put("text", String.valueOf(param));
                    }
                    
                    bodyParams.add(paramMap);
                }
                
                if (!bodyParams.isEmpty()) {
                    bodyComp.put("parameters", bodyParams);
                    components.add(bodyComp);
                }
            }
            
            if (!components.isEmpty()) {
                template.put("components", components);
            }
            
            payload.put("template", template);
            
            try {
                HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
                ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, 
                    HttpMethod.POST, 
                    request, 
                    new ParameterizedTypeReference<>() {});
                
                if (response.getStatusCode().is2xxSuccessful()) {
                    sent++;
                    System.out.println("Message sent successfully to " + to);
                } else {
                    Map<String, Object> error = new HashMap<>();
                    String errorMsg = "Status: " + response.getStatusCode().value();
                    if (response.getBody() != null) {
                        errorMsg += " - " + response.getBody().toString();
                    }
                    error.put("to", to);
                    error.put("error", errorMsg);
                    errors.add(error);
                    System.err.println("Error sending to " + to + ": " + errorMsg);
                }
            } catch (Exception e) {
                Map<String, Object> error = new HashMap<>();
                error.put("to", to);
                error.put("error", "Error sending message: " + e.getMessage());
                errors.add(error);
                System.err.println("Exception sending to " + to + ": " + e.getMessage());
            }
        }
        
        result.put("sent", sent);
        result.put("failed", req.to.size() - sent);
        if (!errors.isEmpty()) {
            result.put("errors", errors);
        }
        
        return result;
    }

    // Helper method to find a user by phone number, handling cases where multiple users have the same phone number
    private Optional<UserDetails> findUserByPhoneNumber(String phoneNumber) {
        try {
            // First try the unique lookup
            return userDetailsRepository.findByPhoneNo(phoneNumber);
        } catch (org.springframework.dao.IncorrectResultSizeDataAccessException e) {
            // Handle case where multiple users have the same phone number
            System.out.println("Multiple users found for phone number: " + phoneNumber + ". Using the first one.");
            List<UserDetails> usersWithSamePhone = userDetailsRepository.findAllByPhoneNo(phoneNumber);
            if (!usersWithSamePhone.isEmpty()) {
                return Optional.of(usersWithSamePhone.get(0)); // Use the first one
            }
            return Optional.empty();
        }
    }

    // Helper method to find a user by phone number with normalization, handling cases where multiple users have the same phone number
    private Optional<UserDetails> findUserByPhoneNumberWithNormalization(String phoneNumber) {
        // Try exact match first
        Optional<UserDetails> user = findUserByPhoneNumber(phoneNumber);
        if (user.isPresent()) {
            return user;
        }
        
        // Try normalized match
        String normalized = normalizePhoneNumber(phoneNumber);
        if (!normalized.equals(phoneNumber)) {
            return findUserByPhoneNumber(normalized);
        }
        
        return Optional.empty();
    }
    
    // Helper method to calculate delay with exponential backoff for rate limiting
    private long calculateDelayWithBackoff(int messageIndex, List<Map<String, Object>> errors) {
        // Base delay of 2 seconds
        long baseDelay = 2000;
        
        // Check if we've had recent rate limit errors
        int recentRateLimitErrors = 0;
        for (Map<String, Object> error : errors) {
            Object errorCodeObj = error.get("errorCode");
            if (errorCodeObj instanceof String && "HTTP_ERROR".equals(errorCodeObj)) {
                Object statusCodeObj = error.get("statusCode");
                if (statusCodeObj instanceof Integer && (Integer) statusCodeObj == 400) {
                    Object errorMsgObj = error.get("error");
                    if (errorMsgObj instanceof String && ((String) errorMsgObj).contains("rate limit")) {
                        recentRateLimitErrors++;
                    }
                }
            }
        }
        
        // Increase delay exponentially based on recent errors
        if (recentRateLimitErrors > 0) {
            // Double the delay for each recent rate limit error, up to a maximum of 30 seconds
            long exponentialDelay = baseDelay * (long) Math.pow(2, Math.min(recentRateLimitErrors, 4));
            return Math.min(exponentialDelay, 30000); // Cap at 30 seconds
        }
        
        return baseDelay;
    }
}