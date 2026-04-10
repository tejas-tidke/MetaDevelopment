package com.htc.backend.controller;

import com.htc.backend.entity.UploadedFile;
import com.htc.backend.entity.UserDetails;
import com.htc.backend.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
public class FileUploadController {

    private static final Logger log = LoggerFactory.getLogger(FileUploadController.class);
    
    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private RestTemplate restTemplate;
    
    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @Value("${waba.phone-number-id:}")
    private String wabaPhoneNumberId;

    @Value("${waba.access-token:}")
    private String wabaAccessToken;
    
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
    @PostMapping("/upload/check-duplicates")
    public ResponseEntity<?> checkDuplicates(@RequestParam("file") MultipartFile file) {
        log.info("checkDuplicates endpoint called with file: {}", file != null ? file.getOriginalFilename() : "null");
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "status", "error",
                        "message", "File is empty"
                ));
            }

            FileStorageService.DuplicateCheckResult result = fileStorageService.checkDuplicates(file);

            Map<String, Object> response = new HashMap<>();
            response.put("status", result.getTotalDuplicates() > 0 ? "duplicates_found" : "success");
            response.put("message",
                    result.getTotalDuplicates() > 0
                            ? "Duplicate contacts found in file."
                            : "No duplicates found.");
            response.put("duplicateInFileCount", result.getDuplicateInFileCount());
            response.put("duplicateInDatabaseCount", result.getDuplicateInDatabaseCount());
            response.put("totalDuplicates", result.getTotalDuplicates());
            response.put("duplicateDetails", result.getDuplicateDetails());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error checking duplicates:", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "error");
            errorResponse.put("message", "Error checking duplicates: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // For user data files (CSV/Excel)
    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(name = "keepDuplicates", defaultValue = "false") boolean keepDuplicates
    ) {
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
            UploadedFile uploadedFile = fileStorageService.processFile(file, keepDuplicates);
            log.info("File processed successfully. Uploaded file ID: {}", uploadedFile.getId());
            
            // Prepare response
            Map<String, Object> response = new HashMap<>();
            int processedRecords = uploadedFile.getProcessedRecords() != null ? uploadedFile.getProcessedRecords() : 0;
            int skippedRecords = uploadedFile.getErrorRecords() != null ? uploadedFile.getErrorRecords() : 0;

            if (skippedRecords > 0) {
                response.put("status", "partial_success");
                response.put(
                        "message",
                        String.format(
                                "File processed with warnings: %d record(s) imported and %d row(s) skipped.",
                                processedRecords,
                                skippedRecords
                        )
                );
                response.put("warnings", uploadedFile.getErrorMessage());
            } else {
                response.put("status", "success");
                response.put("message", "File uploaded and processed successfully");
            }

            response.put("processedRecords", processedRecords);
            response.put("skippedRecords", skippedRecords);
            response.put("keepDuplicates", keepDuplicates);
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

            // Upload to WhatsApp Cloud API to get a media ID (preferred over local URL links)
            String whatsappMediaId = uploadMediaToWhatsApp(file);
            
            // Prepare response
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Media file uploaded successfully");
            response.put("mediaId", whatsappMediaId);
            response.put("file", uploadedFile);
            
            return ResponseEntity.ok(response);
        } catch (HttpClientErrorException e) {
            log.error("WhatsApp media API error:", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "error");
            errorResponse.put("message", "WhatsApp media upload failed: " + e.getStatusCode().value());
            errorResponse.put("details", e.getResponseBodyAsString());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(errorResponse);
        } catch (Exception e) {
            log.error("Error uploading media file:", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "error");
            errorResponse.put("message", "Error uploading media file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    private String uploadMediaToWhatsApp(MultipartFile file) throws IOException {
        if (wabaPhoneNumberId == null || wabaPhoneNumberId.isBlank() || wabaAccessToken == null || wabaAccessToken.isBlank()) {
            throw new IllegalStateException("WABA configuration missing. Set 'waba.phone-number-id' and 'waba.access-token'.");
        }

        String uploadUrl = String.format("https://graph.facebook.com/v19.0/%s/media", wabaPhoneNumberId);
        String detectedType = file.getContentType() != null ? file.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(wabaAccessToken);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return Objects.requireNonNullElse(file.getOriginalFilename(), "media.bin");
            }
        };

        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(MediaType.parseMediaType(detectedType));
        HttpEntity<ByteArrayResource> filePart = new HttpEntity<>(fileResource, partHeaders);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("messaging_product", "whatsapp");
        body.add("type", detectedType);
        body.add("file", filePart);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(uploadUrl, requestEntity, Map.class);

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null || response.getBody().get("id") == null) {
            throw new IllegalStateException("No media ID returned from WhatsApp");
        }

        return String.valueOf(response.getBody().get("id"));
    }
    
    @GetMapping("/files")
    public ResponseEntity<?> getAllFiles() {
        log.info("getAllFiles endpoint called");
        try {
            List<UploadedFile> files = fileStorageService.getAllUploadedFiles();
            log.info("Retrieved {} uploaded files", files.size());
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
            log.info("Found {} user details for file ID: {}", userDetails.size(), fileId);
            log.debug("User details: {}", userDetails);
            
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
