package com.htc.backend.service;

import com.htc.backend.entity.UploadedFile;
import com.htc.backend.entity.UserDetails;
import com.htc.backend.repository.UploadedFileRepository;
import com.htc.backend.repository.UserDetailsRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class FileStorageService {

    private static final String[] CSV_HEADERS = {"name", "email", "phone_no", "company_name"};
    
    @Autowired
    private UploadedFileRepository uploadedFileRepository;

    @Autowired
    private UserDetailsRepository userDetailsRepository;

    @Transactional
    public UploadedFile processFile(MultipartFile file) throws IOException {
        validateFile(file);
        
        UploadedFile uploadedFile = new UploadedFile();
        uploadedFile.setFileName(Objects.requireNonNull(file.getOriginalFilename()));
        uploadedFile.setFileType(Objects.requireNonNull(file.getContentType()));
        uploadedFile.setSize(file.getSize());
        uploadedFile.setUploadedAt(LocalDateTime.now());
        uploadedFile.setStatus("PENDING");

        try {
            // Save the initial file record
            uploadedFile = uploadedFileRepository.save(uploadedFile);
            
            // Process the file based on its type
            if (file.getOriginalFilename() != null && file.getOriginalFilename().toLowerCase().endsWith(".csv")) {
                processCSVFile(file, uploadedFile);
            } else if (file.getOriginalFilename() != null && 
                      file.getOriginalFilename().toLowerCase().matches(".*\\.(xls|xlsx)$")) {
                processExcelFile(file, uploadedFile);
            } else {
                throw new IllegalArgumentException("Unsupported file type");
            }
            
            uploadedFile.setStatus("PROCESSED");
        } catch (Exception e) {
            uploadedFile.setStatus("FAILED");
            String errorMsg = e.getMessage() != null ? e.getMessage() : "Unknown error occurred";
            // Truncate error message if it's too long for the database column
            uploadedFile.setErrorMessage(errorMsg.length() > 500 ? errorMsg.substring(0, 500) : errorMsg);
            uploadedFile = uploadedFileRepository.save(uploadedFile);
            throw new RuntimeException("Failed to process file: " + errorMsg, e);
        }
        
        return uploadedFileRepository.save(uploadedFile);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }
        
        if (file.getOriginalFilename() == null) {
            throw new IllegalArgumentException("File name cannot be null");
        }
        
        String fileName = file.getOriginalFilename().toLowerCase();
        if (!(fileName.endsWith(".csv") || fileName.endsWith(".xls") || fileName.endsWith(".xlsx"))) {
            throw new IllegalArgumentException("Unsupported file type. Only CSV and Excel files are allowed");
        }
    }
    
    private void processCSVFile(MultipartFile file, UploadedFile uploadedFile) throws IOException {
        List<UserDetails> userDetailsList = new ArrayList<>();
        int processedCount = 0;
        int errorCount = 0;
        
        try (BufferedReader fileReader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
             CSVParser csvParser = new CSVParser(fileReader, 
                CSVFormat.DEFAULT
                    .withFirstRecordAsHeader()
                    .withIgnoreHeaderCase()
                    .withTrim()
                    .withHeader(CSV_HEADERS))) {

            // Validate headers
            validateCSVHeaders(csvParser.getHeaderMap().keySet());
            
            // Process records
            for (CSVRecord csvRecord : csvParser) {
                try {
                    UserDetails userDetails = new UserDetails();
                    userDetails.setName(csvRecord.get("name").trim());
                    userDetails.setEmail(csvRecord.get("email").toLowerCase().trim());
                    userDetails.setPhoneNo(csvRecord.get("phone_no").trim());
                    userDetails.setCompanyName(csvRecord.get("company_name").trim());
                    userDetails.setUploadedFileId(uploadedFile.getId()); // Set the reference to the uploaded file
                    
                    // Basic validation
                    if (userDetails.getName() == null || userDetails.getName().isEmpty()) {
                        throw new IllegalArgumentException("Name is required");
                    }
                    
                    if (userDetails.getEmail() == null || userDetails.getEmail().isEmpty() || 
                        !userDetails.getEmail().contains("@")) {
                        throw new IllegalArgumentException("Valid email is required");
                    }
                    
                    userDetailsList.add(userDetails);
                    processedCount++;
                } catch (Exception e) {
                    errorCount++;
                    // Log the error but continue processing other records
                    System.err.println("Error processing CSV record " + csvRecord.getRecordNumber() + 
                                     ": " + e.getMessage());
                }
            }
            
            // Save all valid records in a batch
            if (!userDetailsList.isEmpty()) {
                try {
                    userDetailsRepository.saveAll(userDetailsList);
                    uploadedFile.setProcessedRecords(processedCount);
                    uploadedFile.setErrorRecords(errorCount);
                } catch (DataIntegrityViolationException e) {
                    throw new IllegalArgumentException("Duplicate email found in the file. Please ensure all emails are unique.", e);
                }
            }
        }
    }
    
    private void validateCSVHeaders(java.util.Set<String> headers) {
        for (String requiredHeader : CSV_HEADERS) {
            if (!headers.contains(requiredHeader)) {
                throw new IllegalArgumentException("Missing required column: " + requiredHeader);
            }
        }
    }

    private void processExcelFile(MultipartFile file, UploadedFile uploadedFile) throws IOException {
        List<UserDetails> userDetailsList = new ArrayList<>();
        int processedCount = 0;
        int errorCount = 0;
        
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(file.getBytes()))) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();
            
            // Skip header row
            if (!rows.hasNext()) {
                throw new IllegalArgumentException("Excel file is empty");
            }
            
            // Validate headers
            Row headerRow = rows.next();
            validateExcelHeaders(headerRow);
            
            // Process data rows
            while (rows.hasNext()) {
                Row currentRow = rows.next();
                try {
                    UserDetails userDetails = new UserDetails();
                    
                    userDetails.setName(getCellValue(currentRow.getCell(0)));
                    userDetails.setEmail(getCellValue(currentRow.getCell(1)));
                    userDetails.setPhoneNo(getCellValue(currentRow.getCell(2)));
                    userDetails.setCompanyName(getCellValue(currentRow.getCell(3)));
                    userDetails.setUploadedFileId(uploadedFile.getId()); // Set the reference to the uploaded file
                    
                    // Basic validation
                    if (userDetails.getName() == null || userDetails.getName().trim().isEmpty()) {
                        throw new IllegalArgumentException("Name is required");
                    }
                    
                    if (userDetails.getEmail() == null || userDetails.getEmail().trim().isEmpty() || 
                        !userDetails.getEmail().contains("@")) {
                        throw new IllegalArgumentException("Valid email is required");
                    }
                    
                    userDetailsList.add(userDetails);
                    processedCount++;
                } catch (Exception e) {
                    errorCount++;
                    // Log the error but continue processing other rows
                    System.err.println("Error processing Excel row " + (currentRow.getRowNum() + 1) + 
                                     ": " + e.getMessage());
                }
            }
            
            // Save all valid records in a batch
            if (!userDetailsList.isEmpty()) {
                try {
                    userDetailsRepository.saveAll(userDetailsList);
                    uploadedFile.setProcessedRecords(processedCount);
                    uploadedFile.setErrorRecords(errorCount);
                } catch (DataIntegrityViolationException e) {
                    throw new IllegalArgumentException("Duplicate email found in the file. Please ensure all emails are unique.", e);
                }
            }
        }
    }
    
    private void validateExcelHeaders(Row headerRow) {
        if (headerRow == null || headerRow.getLastCellNum() < 4) {
            throw new IllegalArgumentException("Invalid Excel format. Required columns: name, email, phone_no, company_name");
        }
        
        String[] expectedHeaders = {"name", "email", "phone_no", "company_name"};
        for (int i = 0; i < expectedHeaders.length && i < headerRow.getLastCellNum(); i++) {
            String headerValue = getCellValue(headerRow.getCell(i));
            if (headerValue == null || !headerValue.trim().equalsIgnoreCase(expectedHeaders[i])) {
                throw new IllegalArgumentException("Invalid column header at position " + (i + 1) + ". Expected: " + expectedHeaders[i]);
            }
        }
    }
    
    private String getCellValue(Cell cell) {
        if (cell == null) {
            return "";
        }
        
        try {
            switch (cell.getCellType()) {
                case STRING:
                    return cell.getStringCellValue().trim();
                case NUMERIC:
                    if (DateUtil.isCellDateFormatted(cell)) {
                        return cell.getLocalDateTimeCellValue().toString();
                    } else {
                        // Check if the numeric value is actually an integer
                        double num = cell.getNumericCellValue();
                        if (num == (long) num) {
                            return String.valueOf((long) num);
                        } else {
                            return String.valueOf(num);
                        }
                    }
                case BOOLEAN:
                    return String.valueOf(cell.getBooleanCellValue());
                case FORMULA:
                    switch (cell.getCachedFormulaResultType()) {
                        case STRING:
                            return cell.getStringCellValue().trim();
                        case NUMERIC:
                            return String.valueOf((long) cell.getNumericCellValue());
                        case BOOLEAN:
                            return String.valueOf(cell.getBooleanCellValue());
                        default:
                            return "";
                    }
                default:
                    return "";
            }
        } catch (Exception e) {
            System.err.println("Error reading cell value: " + e.getMessage());
            return "";
        }
    }
    
    public List<UploadedFile> getAllUploadedFiles() {
        return uploadedFileRepository.findAllByOrderByUploadedAtDesc();
    }
    
    // New method to get user details from a specific uploaded file
    public List<UserDetails> getUserDetailsByUploadedFileId(Long uploadedFileId) {
        return userDetailsRepository.findByUploadedFileId(uploadedFileId);
    }
    
    // New method to save an uploaded file without processing
    public UploadedFile saveUploadedFile(UploadedFile uploadedFile) {
        return uploadedFileRepository.save(uploadedFile);
    }
}