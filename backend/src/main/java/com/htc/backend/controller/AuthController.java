package com.htc.backend.controller;

import com.htc.backend.entity.User;
import com.htc.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
public class AuthController {
    
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    
    @Autowired
    private UserRepository userRepository;
    
    // Email validation pattern
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[a-zA-Z0-9_+&*-]+(?:\\.[a-zA-Z0-9_+&*-]+)*@" +
        "(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,7}$"
    );

    @PostConstruct
    public void init() {
        log.info("AuthController initialized with endpoint: POST /api/login");
    }
    
    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> credentials) {
        log.info("Login endpoint called with username: {}", credentials != null ? credentials.get("username") : "null");
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            String username = credentials.get("username");
            String password = credentials.get("password");
            
            // Validate input
            if (username == null || username.trim().isEmpty()) {
                response.put("status", "error");
                response.put("message", "Username is required");
                return response;
            }
            
            if (password == null || password.trim().isEmpty()) {
                response.put("status", "error");
                response.put("message", "Password is required");
                return response;
            }
            
            // Find user in database
            User user = userRepository.findByUsername(username);
            
            // Check if user exists and password matches
            if (user != null && password.equals(user.getPassword())) {
                response.put("status", "success");
                response.put("message", "Login successful!");
                Map<String, Object> userData = new HashMap<>();
                userData.put("id", user.getId());
                userData.put("username", user.getUsername());
                userData.put("email", user.getEmail());
                userData.put("role", user.getRole());
                response.put("user", userData);
            } else {
                response.put("status", "error");
                response.put("message", "Invalid username or password");
            }
        } catch (Exception e) {
            log.error("Error during login: {}", e.getMessage(), e);
            response.put("status", "error");
            response.put("message", "An error occurred during login. Please try again.");
        }
        
        return response;
    }
    
    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody Map<String, String> userData) {
        log.info("Registration endpoint called with username: {}", userData != null ? userData.get("username") : "null");
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            String username = userData.get("username");
            String email = userData.get("email");
            String password = userData.get("password");
            String confirmPassword = userData.get("confirmPassword");
            
            // Validate input
            if (username == null || username.trim().isEmpty()) {
                response.put("status", "error");
                response.put("message", "Username is required");
                return response;
            }
            
            if (email == null || email.trim().isEmpty()) {
                response.put("status", "error");
                response.put("message", "Email is required");
                return response;
            }
            
            if (!EMAIL_PATTERN.matcher(email).matches()) {
                response.put("status", "error");
                response.put("message", "Invalid email format");
                return response;
            }
            
            if (password == null || password.trim().isEmpty()) {
                response.put("status", "error");
                response.put("message", "Password is required");
                return response;
            }
            
            if (password.length() < 6) {
                response.put("status", "error");
                response.put("message", "Password must be at least 6 characters long");
                return response;
            }
            
            if (confirmPassword == null || !password.equals(confirmPassword)) {
                response.put("status", "error");
                response.put("message", "Passwords do not match");
                return response;
            }
            
            // Check if username already exists
            User existingUser = userRepository.findByUsername(username);
            if (existingUser != null) {
                response.put("status", "error");
                response.put("message", "Username already exists");
                return response;
            }
            
            // Check if email already exists
            if (!userRepository.findByEmail(email).isEmpty()) {
                response.put("status", "error");
                response.put("message", "Email already registered");
                return response;
            }
            
            // Create new user
            User newUser = new User();
            newUser.setUsername(username);
            newUser.setEmail(email);
            newUser.setPassword(password); // In a real application, this should be hashed
            newUser.setRole("USER"); // Default role
            
            // Save user to database
            User savedUser = userRepository.save(newUser);
            
            response.put("status", "success");
            response.put("message", "Registration successful!");
            Map<String, Object> userDataResponse = new HashMap<>();
            userDataResponse.put("id", savedUser.getId());
            userDataResponse.put("username", savedUser.getUsername());
            userDataResponse.put("email", savedUser.getEmail());
            userDataResponse.put("role", savedUser.getRole());
            response.put("user", userDataResponse);
            
        } catch (Exception e) {
            log.error("Error during registration: {}", e.getMessage(), e);
            response.put("status", "error");
            response.put("message", "An error occurred during registration. Please try again.");
        }
        
        return response;
    }
    
    @GetMapping("/test")
    public String test() {
        log.info("Test endpoint called");
        return "Test endpoint working";
    }
}