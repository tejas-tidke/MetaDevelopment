package com.htc.backend.whatsapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "whatsapp_flow_token_refs",
    indexes = {
        @Index(name = "idx_wa_flow_token", columnList = "flow_token"),
        @Index(name = "idx_wa_flow_token_phone", columnList = "phone_number"),
        @Index(name = "idx_wa_flow_token_flow", columnList = "flow_id")
    }
)
public class WhatsAppFlowTokenReference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "flow_token", nullable = false, length = 255)
    private String flowToken;

    @Column(name = "flow_id", length = 120)
    private String flowId;

    @Column(name = "flow_name", length = 255)
    private String flowName;

    @Column(name = "phone_number", length = 30)
    private String phoneNumber;

    @Column(name = "source_type", length = 80)
    private String sourceType;

    @Column(name = "wa_message_id", length = 120)
    private String waMessageId;

    @Lob
    @Column(name = "metadata_json", columnDefinition = "LONGTEXT")
    private String metadataJson;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFlowToken() {
        return flowToken;
    }

    public void setFlowToken(String flowToken) {
        this.flowToken = flowToken;
    }

    public String getFlowId() {
        return flowId;
    }

    public void setFlowId(String flowId) {
        this.flowId = flowId;
    }

    public String getFlowName() {
        return flowName;
    }

    public void setFlowName(String flowName) {
        this.flowName = flowName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getSourceType() {
        return sourceType;
    }

    public void setSourceType(String sourceType) {
        this.sourceType = sourceType;
    }

    public String getWaMessageId() {
        return waMessageId;
    }

    public void setWaMessageId(String waMessageId) {
        this.waMessageId = waMessageId;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
