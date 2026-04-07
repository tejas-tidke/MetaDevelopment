package com.htc.backend.service;

import com.htc.backend.entity.UploadedFile;
import com.htc.backend.entity.UserDetails;
import com.htc.backend.repository.UploadedFileRepository;
import com.htc.backend.repository.UserDetailsRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
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
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class FileStorageService {

    private static final String[] CSV_HEADERS = {"name", "email", "phone_no", "company_name"};
    private static final int MAX_SKIPPED_DETAILS = 12;
    private static final int MAX_ERROR_MESSAGE_LENGTH = 500;

    @Autowired
    private UploadedFileRepository uploadedFileRepository;

    @Autowired
    private UserDetailsRepository userDetailsRepository;

    private static final class ParsedUserRow {
        private final UserDetails userDetails;
        private final long rowNumber;

        private ParsedUserRow(UserDetails userDetails, long rowNumber) {
            this.userDetails = userDetails;
            this.rowNumber = rowNumber;
        }
    }

    private static final class ProcessingSummary {
        private int processedCount = 0;
        private int errorCount = 0;
        private int duplicateCount = 0;
        private int skippedDetailOverflowCount = 0;
        private final List<String> skippedDetails = new ArrayList<>();

        void incrementProcessed() {
            processedCount++;
        }

        void addValidationError(long rowNumber, String reason) {
            errorCount++;
            addSkippedDetail("Row " + rowNumber + ": " + reason);
        }

        void addDuplicate(long rowNumber, String email, String reason) {
            errorCount++;
            duplicateCount++;
            addSkippedDetail("Row " + rowNumber + " (" + email + "): " + reason);
        }

        private void addSkippedDetail(String detail) {
            if (skippedDetails.size() < MAX_SKIPPED_DETAILS) {
                skippedDetails.add(detail);
            } else {
                skippedDetailOverflowCount++;
            }
        }
    }

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
            uploadedFile = uploadedFileRepository.save(uploadedFile);

            ProcessingSummary summary;
            if (file.getOriginalFilename() != null && file.getOriginalFilename().toLowerCase().endsWith(".csv")) {
                summary = processCSVFile(file, uploadedFile);
            } else if (file.getOriginalFilename() != null &&
                    file.getOriginalFilename().toLowerCase().matches(".*\\.(xls|xlsx)$")) {
                summary = processExcelFile(file, uploadedFile);
            } else {
                throw new IllegalArgumentException("Unsupported file type");
            }

            applyProcessingSummary(uploadedFile, summary);
            uploadedFile.setStatus("PROCESSED");
        } catch (Exception e) {
            uploadedFile.setStatus("FAILED");
            String errorMsg = e.getMessage() != null ? e.getMessage() : "Unknown error occurred";
            uploadedFile.setErrorMessage(truncateMessage(errorMsg));
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

    private ProcessingSummary processCSVFile(MultipartFile file, UploadedFile uploadedFile) throws IOException {
        List<ParsedUserRow> parsedRows = new ArrayList<>();
        Set<String> seenEmailsInFile = new HashSet<>();
        ProcessingSummary summary = new ProcessingSummary();

        try (BufferedReader fileReader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
             CSVParser csvParser = new CSVParser(fileReader,
                     CSVFormat.DEFAULT
                             .withFirstRecordAsHeader()
                             .withIgnoreHeaderCase()
                             .withTrim()
                             .withHeader(CSV_HEADERS))) {

            validateCSVHeaders(csvParser.getHeaderMap().keySet());

            for (CSVRecord csvRecord : csvParser) {
                long rowNumber = csvRecord.getRecordNumber() + 1; // account for header row

                try {
                    String name = safeTrim(csvRecord.get("name"));
                    String email = normalizeEmail(csvRecord.get("email"));
                    String phoneNo = safeTrim(csvRecord.get("phone_no"));
                    String companyName = safeTrim(csvRecord.get("company_name"));

                    if (name.isEmpty()) {
                        summary.addValidationError(rowNumber, "Name is required");
                        continue;
                    }

                    if (email.isEmpty() || !email.contains("@")) {
                        summary.addValidationError(rowNumber, "Valid email is required");
                        continue;
                    }

                    if (!seenEmailsInFile.add(email)) {
                        summary.addDuplicate(rowNumber, email, "Duplicate email in uploaded file");
                        continue;
                    }

                    UserDetails userDetails = new UserDetails();
                    userDetails.setName(name);
                    userDetails.setEmail(email);
                    userDetails.setPhoneNo(phoneNo);
                    userDetails.setCompanyName(companyName);
                    userDetails.setUploadedFileId(uploadedFile.getId());
                    parsedRows.add(new ParsedUserRow(userDetails, rowNumber));
                } catch (Exception e) {
                    summary.addValidationError(rowNumber, "Invalid row data: " + safeErrorMessage(e.getMessage()));
                }
            }
        }

        persistParsedRows(parsedRows, summary);
        return summary;
    }

    private void validateCSVHeaders(Set<String> headers) {
        for (String requiredHeader : CSV_HEADERS) {
            if (!headers.contains(requiredHeader)) {
                throw new IllegalArgumentException("Missing required column: " + requiredHeader);
            }
        }
    }

    private ProcessingSummary processExcelFile(MultipartFile file, UploadedFile uploadedFile) throws IOException {
        List<ParsedUserRow> parsedRows = new ArrayList<>();
        Set<String> seenEmailsInFile = new HashSet<>();
        ProcessingSummary summary = new ProcessingSummary();

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(file.getBytes()))) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            if (!rows.hasNext()) {
                throw new IllegalArgumentException("Excel file is empty");
            }

            Row headerRow = rows.next();
            validateExcelHeaders(headerRow);

            while (rows.hasNext()) {
                Row currentRow = rows.next();
                long rowNumber = currentRow.getRowNum() + 1;

                try {
                    String name = safeTrim(getCellValue(currentRow.getCell(0)));
                    String email = normalizeEmail(getCellValue(currentRow.getCell(1)));
                    String phoneNo = safeTrim(getCellValue(currentRow.getCell(2)));
                    String companyName = safeTrim(getCellValue(currentRow.getCell(3)));

                    if (name.isEmpty()) {
                        summary.addValidationError(rowNumber, "Name is required");
                        continue;
                    }

                    if (email.isEmpty() || !email.contains("@")) {
                        summary.addValidationError(rowNumber, "Valid email is required");
                        continue;
                    }

                    if (!seenEmailsInFile.add(email)) {
                        summary.addDuplicate(rowNumber, email, "Duplicate email in uploaded file");
                        continue;
                    }

                    UserDetails userDetails = new UserDetails();
                    userDetails.setName(name);
                    userDetails.setEmail(email);
                    userDetails.setPhoneNo(phoneNo);
                    userDetails.setCompanyName(companyName);
                    userDetails.setUploadedFileId(uploadedFile.getId());
                    parsedRows.add(new ParsedUserRow(userDetails, rowNumber));
                } catch (Exception e) {
                    summary.addValidationError(rowNumber, "Invalid row data: " + safeErrorMessage(e.getMessage()));
                }
            }
        }

        persistParsedRows(parsedRows, summary);
        return summary;
    }

    private void persistParsedRows(List<ParsedUserRow> parsedRows, ProcessingSummary summary) {
        if (parsedRows.isEmpty()) {
            return;
        }

        Set<String> candidateEmails = parsedRows.stream()
                .map(parsedRow -> parsedRow.userDetails.getEmail())
                .collect(Collectors.toSet());

        Set<String> existingEmails = userDetailsRepository.findAllByEmailIn(candidateEmails).stream()
                .map(existingUser -> normalizeEmail(existingUser.getEmail()))
                .collect(Collectors.toSet());

        for (ParsedUserRow parsedRow : parsedRows) {
            String email = parsedRow.userDetails.getEmail();

            if (existingEmails.contains(email)) {
                summary.addDuplicate(parsedRow.rowNumber, email, "Email already exists");
                continue;
            }

            try {
                userDetailsRepository.saveAndFlush(parsedRow.userDetails);
                summary.incrementProcessed();
            } catch (DataIntegrityViolationException e) {
                summary.addDuplicate(parsedRow.rowNumber, email, "Email already exists");
            }
        }
    }

    private void applyProcessingSummary(UploadedFile uploadedFile, ProcessingSummary summary) {
        uploadedFile.setProcessedRecords(summary.processedCount);
        uploadedFile.setErrorRecords(summary.errorCount);

        if (summary.errorCount > 0) {
            uploadedFile.setErrorMessage(buildWarningMessage(summary));
        } else {
            uploadedFile.setErrorMessage(null);
        }
    }

    private String buildWarningMessage(ProcessingSummary summary) {
        int invalidCount = Math.max(summary.errorCount - summary.duplicateCount, 0);

        StringBuilder warning = new StringBuilder();
        warning.append(summary.errorCount).append(" row(s) skipped.");

        if (summary.duplicateCount > 0) {
            warning.append(" ").append(summary.duplicateCount).append(" duplicate email(s).");
        }

        if (invalidCount > 0) {
            warning.append(" ").append(invalidCount).append(" invalid row(s).");
        }

        if (!summary.skippedDetails.isEmpty()) {
            warning.append(" Details: ").append(String.join(" | ", summary.skippedDetails));
        }

        if (summary.skippedDetailOverflowCount > 0) {
            warning.append(" | +").append(summary.skippedDetailOverflowCount).append(" more skipped row(s).");
        }

        return truncateMessage(warning.toString());
    }

    private String truncateMessage(String message) {
        if (message == null) {
            return null;
        }
        if (message.length() <= MAX_ERROR_MESSAGE_LENGTH) {
            return message;
        }
        return message.substring(0, MAX_ERROR_MESSAGE_LENGTH);
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

    private String normalizeEmail(String email) {
        return safeTrim(email).toLowerCase();
    }

    private String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private String safeErrorMessage(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "Unknown error";
        }
        return value.trim();
    }

    public List<UploadedFile> getAllUploadedFiles() {
        return uploadedFileRepository.findAllByOrderByUploadedAtDesc();
    }

    public List<UserDetails> getUserDetailsByUploadedFileId(Long uploadedFileId) {
        System.out.println("Querying user details for uploadedFileId: " + uploadedFileId);
        List<UserDetails> result = userDetailsRepository.findByUploadedFileId(uploadedFileId);
        System.out.println("Found " + result.size() + " user details for uploadedFileId: " + uploadedFileId);
        return result;
    }

    public UploadedFile saveUploadedFile(UploadedFile uploadedFile) {
        return uploadedFileRepository.save(uploadedFile);
    }
}
