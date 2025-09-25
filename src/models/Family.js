/**
 * Family Model
 * Handles family data operations and validation
 */

const { v4: uuidv4 } = require('uuid');

class Family {
    constructor(data = {}) {
        this.familyId = data.familyId || uuidv4();
        this.familyName = data.familyName || '';
        this.familyCode = data.familyCode || this.generateFamilyCode();
        this.adminUserId = data.adminUserId || null;
        this.description = data.description || '';
        this.memberCount = data.memberCount || 0;
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.settings = data.settings || {
            allowMemberInvites: true,
            requireAdminApproval: false,
            maxMembers: 50
        };
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Generate a unique 6-character family code
     * @returns {string} Family code
     */
    generateFamilyCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Validate family data
     * @returns {Object} Validation result
     */
    validate() {
        const errors = [];

        if (!this.familyName || this.familyName.trim().length < 2) {
            errors.push('Family name must be at least 2 characters long');
        }

        if (this.familyName && this.familyName.length > 50) {
            errors.push('Family name must be less than 50 characters');
        }

        if (!this.adminUserId) {
            errors.push('Admin user ID is required');
        }

        if (this.description && this.description.length > 200) {
            errors.push('Description must be less than 200 characters');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Generate shareable family invite data
     * @returns {Object} Invite data
     */
    generateInviteData() {
        return {
            familyCode: this.familyCode,
            familyName: this.familyName,
            memberCount: this.memberCount,
            shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${this.familyCode}`,
            qrCodeData: `minocha-organizer://join/${this.familyCode}`,
            whatsappMessage: `Join our family organizer! Use code: ${this.familyCode} or visit: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${this.familyCode}`,
            emailSubject: `You're invited to join ${this.familyName}`,
            emailBody: `You've been invited to join "${this.familyName}" on Minocha's Organizer!\n\nFamily Code: ${this.familyCode}\n\nJoin here: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${this.familyCode}\n\nThis app helps families organize tasks, meetings, and stay connected.`
        };
    }

    /**
     * Update member count
     * @param {number} count New member count
     */
    updateMemberCount(count) {
        this.memberCount = Math.max(0, count);
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Regenerate family code
     * @returns {string} New family code
     */
    regenerateCode() {
        this.familyCode = this.generateFamilyCode();
        this.updatedAt = new Date().toISOString();
        return this.familyCode;
    }

    /**
     * Check if family can accept new members
     * @returns {boolean} Can accept members
     */
    canAcceptNewMembers() {
        return this.isActive && this.memberCount < this.settings.maxMembers;
    }

    /**
     * Convert to JSON (safe for API responses)
     * @returns {Object} Safe family object
     */
    toJSON() {
        return {
            familyId: this.familyId,
            familyName: this.familyName,
            familyCode: this.familyCode,
            adminUserId: this.adminUserId,
            description: this.description,
            memberCount: this.memberCount,
            isActive: this.isActive,
            settings: this.settings,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Convert to public JSON (safe for non-admin users)
     * @returns {Object} Public family object
     */
    toPublicJSON() {
        return {
            familyId: this.familyId,
            familyName: this.familyName,
            description: this.description,
            memberCount: this.memberCount,
            isActive: this.isActive,
            createdAt: this.createdAt
        };
    }

    /**
     * Create family from form data
     * @param {Object} formData Form data from registration
     * @param {string} adminUserId Admin user ID
     * @returns {Family} Family instance
     */
    static fromFormData(formData, adminUserId) {
        return new Family({
            familyName: formData.familyName?.trim(),
            description: formData.description?.trim() || '',
            adminUserId: adminUserId,
            memberCount: 1, // Admin counts as first member
            settings: {
                allowMemberInvites: formData.allowMemberInvites !== false,
                requireAdminApproval: formData.requireAdminApproval === true,
                maxMembers: formData.maxMembers || 50
            }
        });
    }
}

module.exports = Family;