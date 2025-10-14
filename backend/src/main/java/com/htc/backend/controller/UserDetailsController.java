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

    @Autowired
    private UserDetailsRepository userDetailsRepository;

    @PostConstruct
    public void init() {
        log.info("UserDetailsController initialized with endpoint: GET /api/user-details");
    }

    @GetMapping("/user-details")
    public Map<String, Object> getAllUserDetails() {
        log.info("getAllUserDetails endpoint called");
        Map<String, Object> response = new HashMap<>();
        try {
            List<UserDetails> userDetailsList = userDetailsRepository.findAll();
            response.put("status", "success");
            response.put("data", userDetailsList);
        } catch (Exception e) {
            log.error("Error fetching user details: {}", e.getMessage(), e);
            response.put("status", "error");
            response.put("message", "Error fetching user details: " + e.getMessage());
        }
        return response;
    }

    @PostMapping("/user-details/delete")
    public Map<String, Object> deleteUserDetails(@RequestBody List<Long> ids) {
        log.info("deleteUserDetails endpoint called with {} IDs", ids != null ? ids.size() : 0);
        Map<String, Object> response = new HashMap<>();
        try {
            if (ids == null || ids.isEmpty()) {
                response.put("status", "error");
                response.put("message", "No IDs provided");
                return response;
            }
            userDetailsRepository.deleteAllById(ids);
            response.put("status", "success");
            response.put("deletedCount", ids.size());
        } catch (Exception e) {
            log.error("Error deleting user details: {}", e.getMessage(), e);
            response.put("status", "error");
            response.put("message", "Error deleting user details: " + e.getMessage());
        }
        return response;
    }
}