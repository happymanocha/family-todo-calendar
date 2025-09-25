/**
 * Advanced Button Loading State Management
 * Handles async operations with proper loading states, accessibility, and error handling
 */

class AsyncButton {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            loadingText: options.loadingText || null,
            successText: options.successText || null,
            errorText: options.errorText || null,
            loadingStyle: options.loadingStyle || 'spinner', // spinner, pulse, dots, progress
            successDuration: options.successDuration || 2000,
            errorDuration: options.errorDuration || 3000,
            preventDoubleClick: options.preventDoubleClick !== false,
            announceToScreenReader: options.announceToScreenReader !== false,
            retryable: options.retryable || false,
            onSuccess: options.onSuccess || null,
            onError: options.onError || null,
            onStart: options.onStart || null,
            onFinish: options.onFinish || null,
            ...options
        };

        this.isLoading = false;
        this.originalText = this.element.textContent.trim();
        this.originalHTML = this.element.innerHTML;
        this.originalDisabled = this.element.disabled;

        this.init();
    }

    init() {
        // Store original attributes for restoration
        this.element._asyncButton = this;

        // Set up accessibility attributes
        if (!this.element.hasAttribute('aria-live')) {
            this.element.setAttribute('aria-live', 'polite');
        }

        // Add click handler if not already present
        if (!this.element._hasAsyncHandler) {
            this.element.addEventListener('click', this.handleClick.bind(this));
            this.element._hasAsyncHandler = true;
        }
    }

    async handleClick(event) {
        // Prevent default form submission if applicable
        if (this.element.type === 'submit') {
            event.preventDefault();
        }

        // Prevent double clicks if enabled
        if (this.options.preventDoubleClick && this.isLoading) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        // Check if button has async handler function
        const asyncHandler = this.element.onclick || this.element._asyncHandler;
        if (!asyncHandler) {
            console.warn('AsyncButton: No async handler function found');
            return;
        }

        // Execute the async operation
        await this.executeAsync(asyncHandler, event);
    }

    async executeAsync(handler, event) {
        try {
            this.startLoading();

            // Call onStart callback
            if (this.options.onStart) {
                await this.options.onStart(this.element);
            }

            // Execute the handler and wait for completion
            const result = await Promise.resolve(handler.call(this.element, event));

            // Show success state
            this.showSuccess();

            // Call onSuccess callback
            if (this.options.onSuccess) {
                await this.options.onSuccess(result, this.element);
            }

            return result;

        } catch (error) {
            console.error('AsyncButton error:', error);

            // Show error state
            this.showError(error);

            // Call onError callback
            if (this.options.onError) {
                await this.options.onError(error, this.element);
            }

            throw error;

        } finally {
            // Call onFinish callback
            if (this.options.onFinish) {
                await this.options.onFinish(this.element);
            }
        }
    }

    startLoading() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.element.disabled = true;
        this.element.setAttribute('data-loading', 'true');

        // Set loading style
        if (this.options.loadingStyle !== 'spinner') {
            this.element.setAttribute('data-loading-style', this.options.loadingStyle);
        }

        // Update text if provided
        if (this.options.loadingText) {
            this.updateText(this.options.loadingText);
        }

        // Update ARIA attributes
        this.element.setAttribute('aria-busy', 'true');
        if (this.options.announceToScreenReader) {
            this.announceToScreenReader('Loading...');
        }

        // Add loading class for additional styling
        this.element.classList.add('btn--loading');
    }

    stopLoading() {
        this.isLoading = false;
        this.element.disabled = this.originalDisabled;
        this.element.removeAttribute('data-loading');
        this.element.removeAttribute('data-loading-style');
        this.element.removeAttribute('aria-busy');
        this.element.classList.remove('btn--loading');
    }

    showSuccess() {
        this.stopLoading();

        // Set success state
        this.element.setAttribute('data-state', 'success');

        // Update text if provided
        if (this.options.successText) {
            this.updateText(this.options.successText);
        }

        // Announce to screen reader
        if (this.options.announceToScreenReader) {
            this.announceToScreenReader('Success!');
        }

        // Reset after duration
        setTimeout(() => {
            this.reset();
        }, this.options.successDuration);
    }

    showError(error) {
        this.stopLoading();

        // Set error state
        this.element.setAttribute('data-state', 'error');

        // Update text if provided
        const errorText = this.options.errorText || 'Error - Try Again';
        this.updateText(errorText);

        // Announce to screen reader
        if (this.options.announceToScreenReader) {
            const message = error.message || 'An error occurred';
            this.announceToScreenReader(`Error: ${message}`);
        }

        // Reset after duration
        setTimeout(() => {
            this.reset();
        }, this.options.errorDuration);
    }

    reset() {
        this.stopLoading();
        this.element.removeAttribute('data-state');
        this.element.innerHTML = this.originalHTML;

        // Remove any temporary text
        if (this.element.textContent.trim() !== this.originalText) {
            this.updateText(this.originalText);
        }
    }

    updateText(text) {
        // Preserve any existing HTML structure while updating text
        const textNodes = this.getTextNodes(this.element);
        if (textNodes.length > 0) {
            textNodes[0].textContent = text;
        } else {
            this.element.textContent = text;
        }
    }

    getTextNodes(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.trim()) {
                textNodes.push(node);
            }
        }

        return textNodes;
    }

    announceToScreenReader(message) {
        // Create or update screen reader announcement area
        let announcer = document.getElementById('btn-sr-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'btn-sr-announcer';
            announcer.setAttribute('aria-live', 'assertive');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
            document.body.appendChild(announcer);
        }

        // Clear and set new message
        announcer.textContent = '';
        setTimeout(() => {
            announcer.textContent = message;
        }, 100);
    }

    // Public API methods
    setLoading(loading = true) {
        if (loading) {
            this.startLoading();
        } else {
            this.stopLoading();
        }
    }

    destroy() {
        this.reset();
        this.element.removeEventListener('click', this.handleClick);
        delete this.element._asyncButton;
        delete this.element._hasAsyncHandler;
    }
}

/**
 * Utility functions for easy button enhancement
 */
const ButtonLoading = {
    // Initialize single button
    enhance(selector, asyncHandler, options = {}) {
        const element = typeof selector === 'string'
            ? document.querySelector(selector)
            : selector;

        if (!element) {
            console.warn('ButtonLoading.enhance: Element not found');
            return null;
        }

        // Store the async handler
        element._asyncHandler = asyncHandler;

        // Create AsyncButton instance
        return new AsyncButton(element, options);
    },

    // Initialize multiple buttons
    enhanceAll(selector, asyncHandler, options = {}) {
        const elements = typeof selector === 'string'
            ? document.querySelectorAll(selector)
            : selector;

        return Array.from(elements).map(element => {
            element._asyncHandler = asyncHandler;
            return new AsyncButton(element, options);
        });
    },

    // Form submission helper
    enhanceForm(formSelector, options = {}) {
        const form = typeof formSelector === 'string'
            ? document.querySelector(formSelector)
            : formSelector;

        if (!form) {
            console.warn('ButtonLoading.enhanceForm: Form not found');
            return null;
        }

        const submitButton = form.querySelector('[type="submit"], button:not([type])');
        if (!submitButton) {
            console.warn('ButtonLoading.enhanceForm: Submit button not found');
            return null;
        }

        const asyncHandler = async (event) => {
            event.preventDefault();

            // Validate form if HTML5 validation is enabled
            if (!form.checkValidity()) {
                form.reportValidity();
                throw new Error('Form validation failed');
            }

            // Get form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Call custom handler if provided
            if (options.onSubmit) {
                return await options.onSubmit(data, form, event);
            }

            // Default: submit to form action
            const response = await fetch(form.action || window.location.href, {
                method: form.method || 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;
        };

        submitButton._asyncHandler = asyncHandler;
        return new AsyncButton(submitButton, {
            loadingText: 'Submitting...',
            successText: 'Submitted!',
            errorText: 'Submit Failed',
            ...options
        });
    },

    // Login form helper
    enhanceLogin(formSelector, loginHandler, options = {}) {
        return this.enhanceForm(formSelector, {
            loadingText: 'Signing In...',
            successText: 'Welcome!',
            errorText: 'Login Failed',
            onSubmit: loginHandler,
            ...options
        });
    },

    // Delete confirmation helper
    enhanceDelete(buttonSelector, deleteHandler, options = {}) {
        const confirmMessage = options.confirmMessage || 'Are you sure you want to delete this item?';

        const asyncHandler = async (event) => {
            if (!confirm(confirmMessage)) {
                throw new Error('Delete cancelled');
            }

            return await deleteHandler(event);
        };

        return this.enhance(buttonSelector, asyncHandler, {
            loadingText: 'Deleting...',
            successText: 'Deleted!',
            errorText: 'Delete Failed',
            ...options
        });
    },

    // Utility to simulate async operations for testing
    simulateAsync(duration = 2000, shouldSucceed = true) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (shouldSucceed) {
                    resolve({ success: true, timestamp: Date.now() });
                } else {
                    reject(new Error('Simulated operation failed'));
                }
            }, duration);
        });
    }
};

// Auto-initialize buttons with data attributes
document.addEventListener('DOMContentLoaded', () => {
    // Find buttons with data-async attribute
    document.querySelectorAll('[data-async]').forEach(button => {
        const asyncType = button.getAttribute('data-async');
        const options = {};

        // Parse options from data attributes
        if (button.hasAttribute('data-loading-text')) {
            options.loadingText = button.getAttribute('data-loading-text');
        }
        if (button.hasAttribute('data-success-text')) {
            options.successText = button.getAttribute('data-success-text');
        }
        if (button.hasAttribute('data-error-text')) {
            options.errorText = button.getAttribute('data-error-text');
        }
        if (button.hasAttribute('data-loading-style')) {
            options.loadingStyle = button.getAttribute('data-loading-style');
        }

        // Initialize based on type
        if (asyncType === 'form') {
            const form = button.closest('form');
            if (form) {
                ButtonLoading.enhanceForm(form, options);
            }
        } else if (asyncType === 'delete') {
            ButtonLoading.enhanceDelete(button, async () => {
                return ButtonLoading.simulateAsync(1500, Math.random() > 0.3);
            }, options);
        } else {
            // Generic async button
            button._asyncHandler = async () => {
                return ButtonLoading.simulateAsync(2000, Math.random() > 0.2);
            };
            new AsyncButton(button, options);
        }
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AsyncButton, ButtonLoading };
}

// Make available globally
window.AsyncButton = AsyncButton;
window.ButtonLoading = ButtonLoading;