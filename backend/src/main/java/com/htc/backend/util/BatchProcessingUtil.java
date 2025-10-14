package com.htc.backend.util;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;

public class BatchProcessingUtil {
    
    /**
     * Splits a large list of recipients into smaller batches
     * @param recipients The list of recipients to split
     * @param batchSize The maximum size of each batch
     * @return A list of batches
     */
    public static <T> List<List<T>> splitIntoBatches(List<T> recipients, int batchSize) {
        List<List<T>> batches = new ArrayList<>();
        for (int i = 0; i < recipients.size(); i += batchSize) {
            int end = Math.min(i + batchSize, recipients.size());
            batches.add(recipients.subList(i, end));
        }
        return batches;
    }
    
    /**
     * Creates a summary statistics map for batch processing
     * @param total Total number of items
     * @param sent Number of successfully processed items
     * @param errors List of errors encountered
     * @return A map containing summary statistics
     */
    public static Map<String, Object> createBatchSummary(int total, int sent, List<Map<String, Object>> errors) {
        Map<String, Object> summary = new java.util.HashMap<>();
        summary.put("total", total);
        summary.put("sent", sent);
        summary.put("failed", total - sent);
        summary.put("successRate", String.format("%.2f%%", (double) sent / total * 100));
        
        if (!errors.isEmpty()) {
            summary.put("errorCount", errors.size());
            // For large error sets, only include a sample
            if (errors.size() > 50) {
                summary.put("sampleErrors", errors.subList(0, Math.min(10, errors.size())));
                summary.put("additionalErrors", errors.size() - 10);
            } else {
                summary.put("errors", errors);
            }
        }
        
        return summary;
    }
    
    /**
     * Calculates an appropriate delay based on batch size to avoid rate limiting
     * @param batchSize The size of the current batch
     * @param isLargeBatch Whether this is part of a large batch processing
     * @return Delay in milliseconds
     */
    public static long calculateAppropriateDelay(int batchSize, boolean isLargeBatch) {
        if (isLargeBatch) {
            // For large batches, be more conservative
            return Math.max(2500, Math.min(5000, batchSize * 20)); // Between 2.5s and 5s
        } else {
            // For regular batches, standard 2-second delay
            return 2000;
        }
    }
    
    /**
     * Calculates an appropriate batch size based on total recipients
     * @param totalRecipients Total number of recipients
     * @return Recommended batch size
     */
    public static int calculateOptimalBatchSize(int totalRecipients) {
        if (totalRecipients <= 100) {
            return totalRecipients; // No batching needed for small batches
        } else if (totalRecipients <= 500) {
            return 50; // Smaller batches for medium sizes
        } else {
            return 100; // Standard batch size for large batches
        }
    }
}