package com.htc.backend.controller;

import com.htc.backend.entity.UserDetails;
import com.htc.backend.repository.UserDetailsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
public class UserDetailsController {

    private static final Logger log = LoggerFactory.getLogger(UserDetailsController.class);
    private static final String USER_UID_HEADER = "X-User-Uid";

    @Autowired
    private UserDetailsRepository userDetailsRepository;

    @PostConstruct
    public void init() {
        log.info("UserDetailsController initialized with endpoint: GET /api/user-details");
    }

    private String requireOwnerUserId(String ownerUserIdHeader) {
        String ownerUserId = ownerUserIdHeader == null ? "" : ownerUserIdHeader.trim();
        if (ownerUserId.isEmpty()) {
            throw new IllegalArgumentException("Missing authenticated user context.");
        }
        return ownerUserId;
    }

    @GetMapping("/user-details")
    public Map<String, Object> getAllUserDetails(
            @RequestHeader(value = USER_UID_HEADER, required = false) String ownerUserIdHeader
    ) {
        log.info("getAllUserDetails endpoint called");
        Map<String, Object> response = new HashMap<>();
        try {
            String ownerUserId = requireOwnerUserId(ownerUserIdHeader);
            List<UserDetails> userDetailsList = userDetailsRepository.findAllByOwnerUserIdOrderByUpdatedAtDesc(ownerUserId);
            response.put("status", "success");
            response.put("data", userDetailsList);
        } catch (IllegalArgumentException e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
        } catch (Exception e) {
            log.error("Error fetching user details: {}", e.getMessage(), e);
            response.put("status", "error");
            response.put("message", "Error fetching user details: " + e.getMessage());
        }
        return response;
    }

    @PostMapping("/user-details/delete")
    public Map<String, Object> deleteUserDetails(
            @RequestBody List<Long> ids,
            @RequestHeader(value = USER_UID_HEADER, required = false) String ownerUserIdHeader
    ) {
        log.info("deleteUserDetails endpoint called with {} IDs", ids != null ? ids.size() : 0);
        Map<String, Object> response = new HashMap<>();
        try {
            String ownerUserId = requireOwnerUserId(ownerUserIdHeader);
            if (ids == null || ids.isEmpty()) {
                response.put("status", "error");
                response.put("message", "No IDs provided");
                return response;
            }
            List<UserDetails> ownedRecords = userDetailsRepository.findAllByIdInAndOwnerUserId(ids, ownerUserId);
            userDetailsRepository.deleteAll(ownedRecords);
            response.put("status", "success");
            response.put("deletedCount", ownedRecords.size());
            response.put("requestedCount", ids.size());
        } catch (IllegalArgumentException e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
        } catch (Exception e) {
            log.error("Error deleting user details: {}", e.getMessage(), e);
            response.put("status", "error");
            response.put("message", "Error deleting user details: " + e.getMessage());
        }
        return response;
    }
}
