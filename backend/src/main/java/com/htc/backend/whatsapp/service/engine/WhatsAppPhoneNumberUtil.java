package com.htc.backend.whatsapp.service.engine;

public final class WhatsAppPhoneNumberUtil {

    private WhatsAppPhoneNumberUtil() {
    }

    public static String normalize(String phoneNumber) {
        if (phoneNumber == null) {
            return "";
        }
        String cleaned = phoneNumber.trim().replaceAll("[^0-9+]", "");
        if (cleaned.startsWith("+")) {
            cleaned = cleaned.substring(1);
        }
        if (cleaned.startsWith("00")) {
            cleaned = cleaned.substring(2);
        }
        return cleaned;
    }
}
