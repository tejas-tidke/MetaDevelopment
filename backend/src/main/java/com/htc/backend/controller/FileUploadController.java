package com.htc.backend.controller;

import com.htc.backend.entity.UploadedFile;
import com.htc.backend.entity.UserDetails;
import com.htc.backend.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
public class FileUploadController {

    private static final Logger log = LoggerFactory.getLogger(FileUploadController.class);
    
    @Autowired
    private FileStorageService fileStorageService;
    
    @Value("${file.upload-dir:uploads}")
    private String uploadDir;
    
    @PostConstruct
    public void init() {
        try {
            File uploadDirFile = new File(uploadDir);
            if (!uploadDirFile.exists()) {
                boolean created = uploadDirFile.mkdirs();
                log.info("Created upload directory: {}", created);
            }
            log.info("FileUploadController initialized with endpoints: POST /api/upload, POST /api/upload/media, GET /api/files, GET /api/files/{{fileId}}/user-details");
            log.info("Upload directory: {}", uploadDirFile.getAbsolutePath());
        } catch (Exception e) {
            log.error("Could not create upload directory: {}", e.getMessage(), e);
        }
    }

    // For user data files (CSV/Excel)
    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        log.info("uploadFile endpoint called with file: {}", file != null ? file.getOriginalFilename() : "null");
        try {
            log.info("=== USER DATA UPLOAD ENDPOINT HIT ===");
            log.info("File received: {} ({} bytes)", file.getOriginalFilename(), file.getSize());
            
            if (file.isEmpty()) {
                log.warn("Upload failed: File is empty");
                return ResponseEntity.badRequest().body("File is empty");
            }

            // Create upload directory if it doesn't exist
            File uploadDirFile = new File(uploadDir);
            if (!uploadDirFile.exists()) {
                boolean dirCreated = uploadDirFile.mkdirs();
                log.info("Upload directory created: {}", dirCreated);
            }

            // Generate a unique filename
            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
            
            // Save the file
            Path targetLocation = Paths.get(uploadDir).resolve(uniqueFilename).normalize();
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            
            // Process the file and save to database
            UploadedFile uploadedFile = fileStorageService.processFile(file);
            
            // Prepare response
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "File uploaded and processed successfully");
            response.put("file", uploadedFile);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error uploading file:", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "error");
            errorResponse.put("message", "Error uploading file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    // For template media files (images, videos, documents)
    @PostMapping("/upload/media")
    public ResponseEntity<?> uploadMediaFile(@RequestParam("file") MultipartFile file) {
        log.info("uploadMediaFile endpoint called with file: {}", file != null ? file.getOriginalFilename() : "null");
        try {
            log.info("=== MEDIA UPLOAD ENDPOINT HIT ===");
            log.info("File received: {} ({} bytes)", file.getOriginalFilename(), file.getSize());
            
            if (file.isEmpty()) {
                log.warn("Upload failed: File is empty");
                return ResponseEntity.badRequest().body("File is empty");
            }

            // Create upload directory if it doesn't exist
            File uploadDirFile = new File(uploadDir);
            if (!uploadDirFile.exists()) {
                boolean dirCreated = uploadDirFile.mkdirs();
                log.info("Upload directory created: {}", dirCreated);
            }

            // Generate a unique filename
            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
            
            // Save the file
            Path targetLocation = Paths.get(uploadDir).resolve(uniqueFilename).normalize();
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            
            // Create a simple UploadedFile entity for media files (without processing)
            UploadedFile uploadedFile = new UploadedFile();
            uploadedFile.setFileName(uniqueFilename);
            uploadedFile.setFileType(file.getContentType() != null ? file.getContentType() : "unknown");
            uploadedFile.setSize(file.getSize());
            uploadedFile.setStatus("PROCESSED"); // Media files don't need processing
            
            // Save to database
            uploadedFile = fileStorageService.saveUploadedFile(uploadedFile);
            
            // Prepare response
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Media file uploaded successfully");
            response.put("file", uploadedFile);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error uploading media file:", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "error");
            errorResponse.put("message", "Error uploading media file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    @GetMapping("/files")
    public ResponseEntity<?> getAllFiles() {
        log.info("getAllFiles endpoint called");
        try {
            List<UploadedFile> files = fileStorageService.getAllUploadedFiles();
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("data", files);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching files:", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "error");
            errorResponse.put("message", "Error fetching files: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    @GetMapping("/files/{fileId}/user-details")
    public ResponseEntity<?> getUserDetailsByFileId(@PathVariable Long fileId) {
        log.info("getUserDetailsByFileId endpoint called with fileId: {}", fileId);
        try {
            List<UserDetails> userDetails = fileStorageService.getUserDetailsByUploadedFileId(fileId);
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("data", userDetails);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching user details for file ID {}: {}", fileId, e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "error");
            errorResponse.put("message", "Error fetching user details: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}