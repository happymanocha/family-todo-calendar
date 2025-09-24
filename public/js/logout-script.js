class LogoutManager {
    constructor() {
        this.initializeLogout();
        this.displayUserInfo();
        this.setupEventListeners();
    }

    initializeLogout() {
        // Check if user is actually logged in
        const sessionData = localStorage.getItem('familySession');
        const sessionExpires = localStorage.getItem('familySessionExpires');

        if (!sessionData || !sessionExpires) {
            // No valid session, redirect to login
            window.location.href = '/login.html';
            return;
        }

        // Check if session is expired
        const expirationTime = parseInt(sessionExpires);
        if (Date.now() >= expirationTime) {
            // Session expired, clear and redirect
            this.clearSession();
            window.location.href = '/login.html';
            return;
        }
    }

    setupEventListeners() {
        // Cancel logout button
        const cancelBtn = document.getElementById('cancel-logout-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelLogout());
        }

        // Confirm logout button
        const confirmBtn = document.getElementById('confirm-logout-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirmLogout());
        }

        // Handle escape key to cancel logout
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelLogout();
            }
        });
    }

    displayUserInfo() {
        const currentUser = localStorage.getItem('currentFamilyMember');
        const userEmail = localStorage.getItem('currentUserEmail');
        const sessionData = JSON.parse(localStorage.getItem('familySession'));

        if (currentUser) {
            // Update user name
            const userName = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);
            document.getElementById('current-user-name').textContent = userName;

            // Update user initial
            document.getElementById('user-initial').textContent = userName.charAt(0).toUpperCase();
        }

        if (userEmail) {
            document.getElementById('current-user-email').textContent = userEmail;
        }

        if (sessionData && sessionData.loginTime) {
            // Calculate session duration
            const loginTime = new Date(sessionData.loginTime);
            const now = new Date();
            const duration = this.formatDuration(now - loginTime);
            document.getElementById('session-duration').textContent = `Logged in for ${duration}`;
        }
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''}`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''}`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        } else {
            return 'less than a minute';
        }
    }

    clearSession() {
        // Clear API client auth
        window.apiClient.clearAuth();

        // Clear legacy session data
        localStorage.removeItem('familySession');
        localStorage.removeItem('familySessionExpires');
        localStorage.removeItem('currentFamilyMember');
        localStorage.removeItem('currentUserEmail');
        localStorage.removeItem('familyCode');
    }

    async confirmLogout() {
        // Add loading state to logout button
        const logoutBtn = document.querySelector('.logout-btn');
        const originalContent = logoutBtn.innerHTML;

        logoutBtn.innerHTML = `
            <div class="loading-spinner"></div>
            <span>Logging out...</span>
        `;
        logoutBtn.disabled = true;

        try {
            // Call API logout endpoint
            await window.apiClient.logout();
        } catch (error) {
            console.error('Logout API error:', error);
            // Continue with logout even if API call fails
        }

        // Clear session
        this.clearSession();

        // Success animation
        logoutBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        logoutBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Logged out!</span>
        `;

        // Add success animation to card
        const logoutCard = document.querySelector('.logout-card');
        logoutCard.style.transform = 'scale(1.02)';
        logoutCard.style.boxShadow = '0 25px 50px -12px rgba(16, 185, 129, 0.25)';

        await this.delay(800);

        // Redirect to login
        this.redirectToLogin();
    }

    redirectToLogin() {
        // Smooth transition out
        const logoutContainer = document.querySelector('.logout-container');
        logoutContainer.style.transition = 'all 0.5s ease';
        logoutContainer.style.opacity = '0';
        logoutContainer.style.transform = 'translateY(-20px)';

        setTimeout(() => {
            window.location.href = '/login.html';
        }, 500);
    }

    cancelLogout() {
        // Smooth transition back to app
        const logoutContainer = document.querySelector('.logout-container');
        logoutContainer.style.transition = 'all 0.5s ease';
        logoutContainer.style.opacity = '0';
        logoutContainer.style.transform = 'translateY(-20px)';

        setTimeout(() => {
            window.location.href = '/index.html';
        }, 500);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize logout when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.logoutManager = new LogoutManager();
});