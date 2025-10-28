/**
 * User Model
 * Handles user data operations and validation
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const authConfig = require('../config/auth');

class User {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.uniqueId = data.uniqueId || this.generateUniqueId();
    this.email = data.email || '';
    this.name = data.name || '';
    this.firstName = data.firstName || '';
    this.lastName = data.lastName || '';
    this.dateOfBirth = data.dateOfBirth || null;
    this.sex = data.sex || null;
    this.role = data.role || 'member';
    this.avatar = data.avatar || '';
    this.phone = data.phone || '';
    this.password = data.password || '';
    this.familyId = data.familyId || null;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.loginAttempts = data.loginAttempts || 0;
    this.lockedUntil = data.lockedUntil || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Generate short user ID
   * @returns {string} User ID
   */
  generateId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique UUID
   * @returns {string} Unique ID
   */
  generateUniqueId() {
    return uuidv4();
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
      errors.push(
        `Password must be at least ${authConfig.security.passwordMinLength} characters long`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
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
      uniqueId: this.uniqueId,
      email: this.email,
      name: this.name,
      firstName: this.firstName,
      lastName: this.lastName,
      dateOfBirth: this.dateOfBirth,
      sex: this.sex,
      role: this.role,
      avatar: this.avatar,
      phone: this.phone,
      familyId: this.familyId,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Get all family members
   * @returns {Array} Array of User instances
   */
  static async getFamilyMembers() {
    const members = [];
    for (const [email, data] of Object.entries(authConfig.familyMembers)) {
      const user = new User({
        id: data.id,
        uniqueId: data.uniqueId,
        email: email,
        name: data.name,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        sex: data.sex,
        role: data.role,
        avatar: data.avatar,
        phone: data.phone,
        password: data.password, // Use password from config
        familyId: data.familyId,
        createdAt: data.createdAt,
      });
      members.push(user);
    }
    return members;
  }

  /**
   * Find user by email
   * @param {string} email User email
   * @returns {User|null} User instance or null
   */
  static async findByEmail(email) {
    const memberData = authConfig.familyMembers[email.toLowerCase()];
    if (!memberData) return null;

    const user = new User({
      id: memberData.id,
      uniqueId: memberData.uniqueId,
      email: email.toLowerCase(),
      name: memberData.name,
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      dateOfBirth: memberData.dateOfBirth,
      sex: memberData.sex,
      role: memberData.role,
      avatar: memberData.avatar,
      phone: memberData.phone,
      password: memberData.password, // Use password from config
      familyId: memberData.familyId,
      createdAt: memberData.createdAt,
    });
    return user;
  }

  /**
   * Find user by ID
   * @param {string} id User ID
   * @returns {User|null} User instance or null
   */
  static async findById(id) {
    const entry = Object.entries(authConfig.familyMembers).find(([email, data]) => data.id === id);

    if (!entry) return null;

    const [email, data] = entry;
    const user = new User({
      id: data.id,
      uniqueId: data.uniqueId,
      email: email,
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      sex: data.sex,
      role: data.role,
      avatar: data.avatar,
      phone: data.phone,
      password: data.password, // Use password from config
      familyId: data.familyId,
      createdAt: data.createdAt,
    });
    return user;
  }

  /**
   * Update user profile
   * @param {string} userId User ID
   * @param {Object} updates Profile updates
   * @returns {User|null} Updated user instance or null
   */
  static async updateProfile(userId, updates) {
    const entry = Object.entries(authConfig.familyMembers).find(
      ([email, data]) => data.id === userId
    );

    if (!entry) return null;

    const [email, data] = entry;

    // Update only allowed profile fields
    const allowedFields = ['firstName', 'lastName', 'dateOfBirth', 'sex', 'phone', 'avatar'];
    const updatedData = { ...data };

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updatedData[field] = updates[field];
      }
    }

    updatedData.updatedAt = new Date().toISOString();

    // Update in memory
    authConfig.familyMembers[email] = updatedData;

    // Return updated user
    return await User.findById(userId);
  }
}

module.exports = User;
