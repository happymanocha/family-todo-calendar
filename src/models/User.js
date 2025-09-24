/**
 * User Model
 * Handles user data operations and validation
 */

const bcrypt = require('bcryptjs');
const authConfig = require('../config/auth');

class User {
    constructor(data = {}) {
        this.id = data.id || null;
        this.email = data.email || '';
        this.name = data.name || '';
        this.role = data.role || 'member';
        this.avatar = data.avatar || '';
        this.password = data.password || '';
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.loginAttempts = data.loginAttempts || 0;
        this.lockedUntil = data.lockedUntil || null;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Validate user data
     * @returns {Object} Validation result
     */
    validate() {
        const errors = [];

        if (!this.email || !this.isValidEmail(this.email)) {
            errors.push('Valid email is required');
        }

        if (!this.name || this.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }

        if (this.password && this.password.length < authConfig.security.passwordMinLength) {
            errors.push(`Password must be at least ${authConfig.security.passwordMinLength} characters long`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Hash password
     * @param {string} password Plain text password
     * @returns {Promise<string>} Hashed password
     */
    async hashPassword(password) {
        return await bcrypt.hash(password, authConfig.security.saltRounds);
    }

    /**
     * Compare password
     * @param {string} password Plain text password
     * @param {string} hashedPassword Hashed password
     * @returns {Promise<boolean>} Password match result
     */
    async comparePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    /**
     * Check if email is valid
     * @param {string} email Email address
     * @returns {boolean} Validation result
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Check if user is locked due to failed login attempts
     * @returns {boolean} Lock status
     */
    isLocked() {
        return !!(this.lockedUntil && this.lockedUntil > Date.now());
    }

    /**
     * Increment login attempts
     */
    incrementLoginAttempts() {
        this.loginAttempts = (this.loginAttempts || 0) + 1;

        if (this.loginAttempts >= authConfig.security.maxLoginAttempts) {
            this.lockedUntil = Date.now() + authConfig.security.lockoutDuration;
        }

        this.updatedAt = new Date().toISOString();
    }

    /**
     * Reset login attempts
     */
    resetLoginAttempts() {
        this.loginAttempts = 0;
        this.lockedUntil = null;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Convert to JSON (exclude sensitive data)
     * @returns {Object} Safe user object
     */
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
            role: this.role,
            avatar: this.avatar,
            isActive: this.isActive,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Get all family members
     * @returns {Array} Array of User instances
     */
    static getFamilyMembers() {
        return Object.entries(authConfig.familyMembers).map(([email, data]) => {
            return new User({
                id: data.id,
                email: email,
                name: data.name,
                role: data.role,
                avatar: data.avatar,
                password: 'family' // Default password for demo
            });
        });
    }

    /**
     * Find user by email
     * @param {string} email User email
     * @returns {User|null} User instance or null
     */
    static findByEmail(email) {
        const memberData = authConfig.familyMembers[email.toLowerCase()];
        if (!memberData) return null;

        return new User({
            id: memberData.id,
            email: email.toLowerCase(),
            name: memberData.name,
            role: memberData.role,
            avatar: memberData.avatar,
            password: 'family' // Default password for demo
        });
    }

    /**
     * Find user by ID
     * @param {string} id User ID
     * @returns {User|null} User instance or null
     */
    static findById(id) {
        const entry = Object.entries(authConfig.familyMembers)
            .find(([email, data]) => data.id === id);

        if (!entry) return null;

        const [email, data] = entry;
        return new User({
            id: data.id,
            email: email,
            name: data.name,
            role: data.role,
            avatar: data.avatar,
            password: 'family' // Default password for demo
        });
    }
}

module.exports = User;