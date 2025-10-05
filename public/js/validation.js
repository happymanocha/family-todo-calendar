/**
 * Lightweight Form Validation Library
 * No external dependencies - Pure JavaScript
 * Size: ~3KB minified
 */

class FormValidator {
    constructor() {
        this.validators = this.initializeValidators();
        this.errorMessages = this.initializeErrorMessages();
    }

    /**
     * Core validation rules
     */
    initializeValidators() {
        return {
            required: (value) => {
                if (typeof value === 'string') {
                    return value.trim().length > 0;
                }
                return value !== null && value !== undefined && value !== '';
            },

            email: (value) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value);
            },

            minLength: (min) => (value) => {
                return value.length >= min;
            },

            maxLength: (max) => (value) => {
                return value.length <= max;
            },

            min: (minValue) => (value) => {
                return parseFloat(value) >= minValue;
            },

            max: (maxValue) => (value) => {
                return parseFloat(value) <= maxValue;
            },

            pattern: (regex) => (value) => {
                return regex.test(value);
            },

            alphanumeric: (value) => {
                return /^[a-zA-Z0-9]+$/.test(value);
            },

            alpha: (value) => {
                return /^[a-zA-Z\s]+$/.test(value);
            },

            numeric: (value) => {
                return /^\d+$/.test(value);
            },

            url: (value) => {
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            },

            futureDate: (value) => {
                const inputDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return inputDate >= today;
            },

            pastDate: (value) => {
                const inputDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return inputDate < today;
            },

            match: (fieldId) => (value) => {
                const matchField = document.getElementById(fieldId);
                return matchField && value === matchField.value;
            },

            familyCode: (value) => {
                return /^[A-Z0-9]{6}$/.test(value);
            },

            password: (value) => {
                // At least 6 characters
                return value.length >= 6;
            },

            strongPassword: (value) => {
                // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
                return value.length >= 8 &&
                    /[A-Z]/.test(value) &&
                    /[a-z]/.test(value) &&
                    /\d/.test(value);
            }
        };
    }

    /**
     * Error message templates
     */
    initializeErrorMessages() {
        return {
            required: 'This field is required',
            email: 'Please enter a valid email address',
            minLength: (min) => `Must be at least ${min} characters`,
            maxLength: (max) => `Must not exceed ${max} characters`,
            min: (min) => `Value must be at least ${min}`,
            max: (max) => `Value must not exceed ${max}`,
            pattern: 'Invalid format',
            alphanumeric: 'Only letters and numbers are allowed',
            alpha: 'Only letters and spaces are allowed',
            numeric: 'Only numbers are allowed',
            url: 'Please enter a valid URL (e.g., https://example.com)',
            futureDate: 'Date must be today or in the future',
            pastDate: 'Date must be in the past',
            match: 'Fields do not match',
            familyCode: 'Family code must be 6 uppercase letters/numbers',
            password: 'Password must be at least 6 characters',
            strongPassword: 'Password must be at least 8 characters with uppercase, lowercase, and number'
        };
    }

    /**
     * Validate a single field
     * @param {HTMLElement} field - Input field to validate
     * @param {Object} rules - Validation rules
     * @returns {Object} - { isValid: boolean, message: string }
     */
    validateField(field, rules) {
        const value = field.value;

        // Check each rule
        for (const [ruleName, ruleValue] of Object.entries(rules)) {
            let validator;
            let errorMessage;

            // Handle rules with parameters
            if (typeof ruleValue === 'object' && ruleValue.value !== undefined) {
                validator = this.validators[ruleName](ruleValue.value);
                errorMessage = ruleValue.message ||
                    (typeof this.errorMessages[ruleName] === 'function'
                        ? this.errorMessages[ruleName](ruleValue.value)
                        : this.errorMessages[ruleName]);
            } else if (typeof this.validators[ruleName] === 'function') {
                // Direct validator function
                if (this.validators[ruleName].length > 0 && ruleValue !== true) {
                    // Parameterized validator
                    validator = this.validators[ruleName](ruleValue);
                    errorMessage = typeof this.errorMessages[ruleName] === 'function'
                        ? this.errorMessages[ruleName](ruleValue)
                        : this.errorMessages[ruleName];
                } else {
                    // Simple validator
                    validator = this.validators[ruleName];
                    errorMessage = this.errorMessages[ruleName];
                }
            }

            // Run validation
            if (validator && !validator(value)) {
                return {
                    isValid: false,
                    message: errorMessage || 'Invalid input'
                };
            }
        }

        return { isValid: true, message: '' };
    }

    /**
     * Validate entire form
     * @param {HTMLFormElement} form - Form element
     * @param {Object} fieldRules - Validation rules for each field
     * @returns {Object} - { isValid: boolean, errors: Object }
     */
    validateForm(form, fieldRules) {
        const errors = {};
        let isValid = true;

        for (const [fieldId, rules] of Object.entries(fieldRules)) {
            const field = form.querySelector(`#${fieldId}`) || form.querySelector(`[name="${fieldId}"]`);

            if (!field) continue;

            const result = this.validateField(field, rules);

            if (!result.isValid) {
                errors[fieldId] = result.message;
                isValid = false;
            }
        }

        return { isValid, errors };
    }

    /**
     * Show error message for a field
     * @param {HTMLElement} field - Input field
     * @param {string} message - Error message
     */
    showError(field, message) {
        // Remove existing error
        this.clearError(field);

        // Add error class
        field.classList.add('validation-error');
        field.setAttribute('aria-invalid', 'true');

        // Create error message element
        const errorElement = document.createElement('div');
        errorElement.className = 'validation-error-message';
        errorElement.textContent = message;
        errorElement.setAttribute('role', 'alert');
        errorElement.id = `${field.id}-error`;

        field.setAttribute('aria-describedby', errorElement.id);

        // Insert after field or its parent wrapper
        const insertTarget = field.closest('.form-group') || field.closest('.password-input') || field.parentElement;
        insertTarget.appendChild(errorElement);
    }

    /**
     * Clear error message for a field
     * @param {HTMLElement} field - Input field
     */
    clearError(field) {
        field.classList.remove('validation-error');
        field.classList.remove('validation-success');
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');

        const errorElement = field.parentElement.querySelector('.validation-error-message') ||
                           field.closest('.form-group')?.querySelector('.validation-error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }

    /**
     * Show success state for a field
     * @param {HTMLElement} field - Input field
     */
    showSuccess(field) {
        this.clearError(field);
        field.classList.add('validation-success');
    }

    /**
     * Clear all errors in a form
     * @param {HTMLFormElement} form - Form element
     */
    clearAllErrors(form) {
        const fields = form.querySelectorAll('input, select, textarea');
        fields.forEach(field => this.clearError(field));
    }

    /**
     * Display all validation errors
     * @param {HTMLFormElement} form - Form element
     * @param {Object} errors - Error messages by field ID
     */
    showErrors(form, errors) {
        this.clearAllErrors(form);

        for (const [fieldId, message] of Object.entries(errors)) {
            const field = form.querySelector(`#${fieldId}`) || form.querySelector(`[name="${fieldId}"]`);
            if (field) {
                this.showError(field, message);
            }
        }

        // Focus first error field
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField) {
            const field = form.querySelector(`#${firstErrorField}`) || form.querySelector(`[name="${firstErrorField}"]`);
            field?.focus();
        }
    }

    /**
     * Attach real-time validation to a field
     * @param {HTMLElement} field - Input field
     * @param {Object} rules - Validation rules
     * @param {Object} options - Options (debounce, validateOn)
     */
    attachRealTimeValidation(field, rules, options = {}) {
        const { debounce = 300, validateOn = ['blur', 'input'] } = options;

        let timeoutId;

        const validateHandler = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const result = this.validateField(field, rules);
                if (!result.isValid) {
                    this.showError(field, result.message);
                } else {
                    this.showSuccess(field);
                }
            }, debounce);
        };

        // Attach listeners
        if (validateOn.includes('blur')) {
            field.addEventListener('blur', validateHandler);
        }

        if (validateOn.includes('input')) {
            field.addEventListener('input', validateHandler);
        }

        if (validateOn.includes('change')) {
            field.addEventListener('change', validateHandler);
        }

        // Clear error on focus (but not for select elements - they clear on change)
        if (field.tagName !== 'SELECT') {
            field.addEventListener('focus', () => {
                this.clearError(field);
            });
        } else {
            // For select elements, clear on change
            field.addEventListener('change', () => {
                // Only clear if there's a valid selection
                if (field.value) {
                    this.clearError(field);
                }
            });
        }
    }

    /**
     * Attach validation to entire form
     * @param {HTMLFormElement} form - Form element
     * @param {Object} fieldRules - Validation rules for each field
     * @param {Object} options - Options
     */
    attachFormValidation(form, fieldRules, options = {}) {
        const { realTime = false, debounce = 300 } = options;

        // Attach real-time validation if enabled
        if (realTime) {
            for (const [fieldId, rules] of Object.entries(fieldRules)) {
                const field = form.querySelector(`#${fieldId}`) || form.querySelector(`[name="${fieldId}"]`);
                if (field) {
                    this.attachRealTimeValidation(field, rules, { debounce });
                }
            }
        }

        // Validate on submit
        form.addEventListener('submit', (e) => {
            const result = this.validateForm(form, fieldRules);

            if (!result.isValid) {
                e.preventDefault();
                this.showErrors(form, result.errors);
                return false;
            }

            return true;
        });
    }
}

// Create global instance
window.formValidator = new FormValidator();
