/**
 * Token Blacklist Service
 * Manages blacklisted JWT tokens for logout functionality
 *
 * NOTE: This is an in-memory implementation suitable for single-server deployments.
 * For production with multiple servers, use Redis or a database-backed solution.
 */

class TokenBlacklist {
    constructor() {
        // Map of token => expiration timestamp
        this.blacklistedTokens = new Map();

        // Cleanup interval (every 1 hour)
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60 * 60 * 1000);
    }

    /**
     * Add a token to the blacklist
     * @param {string} token JWT token to blacklist
     * @param {number} expiresAt Token expiration timestamp (in seconds)
     */
    addToken(token, expiresAt) {
        if (!token) return;

        // Store token with its expiration time
        const expirationMs = expiresAt * 1000; // Convert to milliseconds
        this.blacklistedTokens.set(token, expirationMs);

        console.log(`Token blacklisted. Total blacklisted: ${this.blacklistedTokens.size}`);
    }

    /**
     * Check if a token is blacklisted
     * @param {string} token JWT token to check
     * @returns {boolean} True if token is blacklisted
     */
    isBlacklisted(token) {
        if (!token) return false;

        const expirationMs = this.blacklistedTokens.get(token);

        if (!expirationMs) {
            return false;
        }

        // Check if token has expired naturally
        if (Date.now() > expirationMs) {
            // Token has expired, remove from blacklist
            this.blacklistedTokens.delete(token);
            return false;
        }

        return true;
    }

    /**
     * Remove expired tokens from the blacklist
     * This is called periodically to prevent memory leaks
     */
    cleanup() {
        const now = Date.now();
        let removedCount = 0;

        for (const [token, expirationMs] of this.blacklistedTokens.entries()) {
            if (now > expirationMs) {
                this.blacklistedTokens.delete(token);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            console.log(`Cleaned up ${removedCount} expired tokens from blacklist. Remaining: ${this.blacklistedTokens.size}`);
        }
    }

    /**
     * Get blacklist statistics
     * @returns {Object} Blacklist stats
     */
    getStats() {
        return {
            totalBlacklisted: this.blacklistedTokens.size,
            implementation: 'in-memory',
            note: 'For production with multiple servers, use Redis or database-backed solution'
        };
    }

    /**
     * Clear all blacklisted tokens (for testing purposes)
     */
    clear() {
        this.blacklistedTokens.clear();
        console.log('Token blacklist cleared');
    }

    /**
     * Cleanup on shutdown
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.blacklistedTokens.clear();
    }
}

// Export singleton instance
module.exports = new TokenBlacklist();
