// Cursor.com Inspired Login Script
class FamilyLogin {
    constructor() {
        this.loginInProgress = false;
        this.initializeLogin();
        this.setupEventListeners();

        // Temporarily disable auto-redirect to break the loop
        // setTimeout(() => {
        //     this.checkExistingSession();
        // }, 100);
        console.log('⚠️ Login: Auto-redirect disabled - manual login required');
    }

    initializeLogin() {
        // Valid user credentials (in production, this would be server-side)
        this.validUsers = {
            'happymanocha@gmail.com': { password: 'family', name: 'happy' },
            'joelminocha@gmail.com': { password: 'family', name: 'joel' },
            'upalmonika@gmail.com': { password: 'family', name: 'monika' },
            'kiaanminocha@gmail.com': { password: 'family', name: 'kiaan' }
        };
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        // Form submission
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        // Real-time validation
        emailInput.addEventListener('input', () => this.validateForm());
        passwordInput.addEventListener('input', () => this.validateForm());

        // Password toggle event listener
        const passwordToggleBtn = document.getElementById('password-toggle-btn');
        if (passwordToggleBtn) {
            passwordToggleBtn.addEventListener('click', () => this.togglePassword());
        }

        // Enter key handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleLogin(e);
            }
        });

        // Add some interactive animations
        this.addInteractiveAnimations();
    }

    addInteractiveAnimations() {
        // Floating shapes mouse interaction
        const shapes = document.querySelectorAll('.shape');

        document.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX / window.innerWidth;
            const mouseY = e.clientY / window.innerHeight;

            shapes.forEach((shape, index) => {
                const speed = (index + 1) * 0.5;
                const x = (mouseX - 0.5) * speed * 10;
                const y = (mouseY - 0.5) * speed * 10;

                shape.style.transform = `translate(${x}px, ${y}px)`;
            });
        });

        // Input focus animations
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.style.transform = 'translateY(-2px)';
            });

            input.addEventListener('blur', () => {
                input.parentElement.style.transform = 'translateY(0)';
            });
        });
    }

    validateForm() {
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        const loginButton = document.querySelector('.login-button');

        const isValid = email.includes('@') && email.includes('.') && password.length >= 3;

        // Update button state
        if (isValid) {
            loginButton.style.opacity = '1';
            loginButton.style.transform = 'translateY(0)';
        } else {
            loginButton.style.opacity = '0.7';
        }

        // Hide error message when user starts typing
        this.hideError();

        return isValid;
    }

    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        // Validate inputs
        if (!this.validateForm()) {
            this.showError('Please fill in all fields correctly');
            return;
        }

        // Show loading state
        this.setLoadingState(true);
        this.loginInProgress = true;

        try {
            // Call AWS API for authentication
            console.log('🔐 Login: Calling API login...');
            const response = await window.apiClient.login(email, password);
            console.log('🔐 Login: API response:', response);

            if (response.success) {
                const user = response.data.user;
                console.log('🔐 Login: User data:', user);

                // Check if authToken was saved by API client
                const savedToken = localStorage.getItem('authToken');
                console.log('🔐 Login: AuthToken after API login:', savedToken);

                // Store session data for compatibility with existing frontend
                this.createSession(email, user.name || user.email.split('@')[0], rememberMe);

                // Verify authToken is still there after createSession
                const tokenAfterSession = localStorage.getItem('authToken');
                console.log('🔐 Login: AuthToken after createSession:', tokenAfterSession);

                // Success animation
                await this.showSuccessAnimation();

                // Redirect to main app
                console.log('Login successful, redirecting to app');
                this.redirectToApp();
            } else {
                this.showError(response.message || 'Invalid email or password');
                this.setLoadingState(false);
                this.loginInProgress = false;
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed. Please try again.');
            this.setLoadingState(false);
            this.loginInProgress = false;
        }
    }

    validateCredentials(email, password) {
        return this.validUsers[email] && this.validUsers[email].password === password;
    }

    createSession(email, memberName, rememberMe) {
        const sessionData = {
            email,
            memberName,
            loginTime: new Date().toISOString(),
            expiresIn: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 30 days or 1 day
        };

        const expirationTime = Date.now() + sessionData.expiresIn;

        // Store in localStorage
        localStorage.setItem('familySession', JSON.stringify(sessionData));
        localStorage.setItem('familySessionExpires', expirationTime.toString());

        // Store current user for the main app
        localStorage.setItem('currentFamilyMember', memberName);
        localStorage.setItem('currentUserEmail', email);
        localStorage.setItem('familyCode', 'FAMILY'); // Default family code
    }

    async checkExistingSession() {
        // Don't check session if login is in progress
        if (this.loginInProgress) {
            console.log('⏳ Login: Login in progress, skipping session check');
            return false;
        }

        console.log('🔍 Login: Checking for existing session...');

        // First check for existing token
        if (window.apiClient.isAuthenticated()) {
            console.log('🔍 Login: Found auth token, validating with server...');
            try {
                const isValid = await window.apiClient.validateToken();
                if (isValid) {
                    console.log('✅ Login: Valid session found, redirecting to app');
                    alert('DEBUG: Valid token found, redirecting to app'); // Visible debug
                    this.redirectToApp();
                    return true;
                } else {
                    console.log('❌ Login: Token invalid, clearing auth data');
                    this.clearSession();
                }
            } catch (error) {
                console.log('❌ Login: Token validation failed, clearing auth data');
                this.clearSession();
            }
        } else {
            console.log('ℹ️ Login: No auth token found');

            // Check if there's stale legacy session data that should be cleaned up
            const sessionData = localStorage.getItem('familySession');
            if (sessionData) {
                console.log('🧹 Login: Clearing stale legacy session data');
                this.clearSession();
            }
        }

        console.log('ℹ️ Login: Staying on login page for user authentication');
        return false;
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

    setLoadingState(loading) {
        const loginButton = document.querySelector('.login-button');
        const inputs = document.querySelectorAll('input, select');

        if (loading) {
            loginButton.classList.add('loading');
            inputs.forEach(input => input.disabled = true);
        } else {
            loginButton.classList.remove('loading');
            inputs.forEach(input => input.disabled = false);
        }
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        const errorText = errorElement.querySelector('span');

        errorText.textContent = message;
        errorElement.classList.add('show');

        // Add shake animation to login card
        const loginCard = document.querySelector('.login-card');
        loginCard.style.animation = 'shake 0.5s ease-in-out';

        setTimeout(() => {
            loginCard.style.animation = '';
        }, 500);
    }

    hideError() {
        const errorElement = document.getElementById('errorMessage');
        errorElement.classList.remove('show');
    }

    async showSuccessAnimation() {
        const loginButton = document.querySelector('.login-button');
        const loginCard = document.querySelector('.login-card');

        // Success state
        loginButton.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        loginButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Welcome!</span>
        `;

        // Card success animation
        loginCard.style.transform = 'scale(1.02)';
        loginCard.style.boxShadow = '0 25px 50px -12px rgba(16, 185, 129, 0.25)';

        await this.delay(800);
    }

    redirectToApp() {
        console.log('🔄 Login: redirectToApp() called - initiating redirect to main app');

        // Smooth transition out
        const loginContainer = document.querySelector('.login-container');
        if (loginContainer) {
            loginContainer.style.transition = 'all 0.5s ease';
            loginContainer.style.opacity = '0';
            loginContainer.style.transform = 'translateY(-20px)';
        }

        setTimeout(() => {
            console.log('🔄 Login: Executing redirect to /index.html now...');
            window.location.href = '/index.html';
        }, 800);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    togglePassword() {
        const passwordInput = document.getElementById('password');
        const eyeOpen = document.getElementById('eye-open');
        const eyeClosed = document.getElementById('eye-closed');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeOpen.classList.add('hidden');
            eyeClosed.classList.remove('hidden');
        } else {
            passwordInput.type = 'password';
            eyeOpen.classList.remove('hidden');
            eyeClosed.classList.add('hidden');
        }
    }
}

// Shake animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Initialize login when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FamilyLogin();
});


// Add some Easter eggs for demo
document.addEventListener('keydown', (e) => {
    // Quick fill easter egg
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        emailInput.value = 'happymanocha@gmail.com';
        passwordInput.value = 'family';

        // Trigger validation
        emailInput.dispatchEvent(new Event('input'));
        passwordInput.dispatchEvent(new Event('input'));

        // Add sparkle effect
        const loginCard = document.querySelector('.login-card');
        loginCard.style.animation = 'sparkle 1s ease-in-out';

        setTimeout(() => {
            loginCard.style.animation = '';
        }, 1000);
    }
});

// Sparkle animation
const sparkleStyle = document.createElement('style');
sparkleStyle.textContent = `
    @keyframes sparkle {
        0%, 100% {
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        50% {
            box-shadow:
                0 20px 25px -5px rgba(139, 92, 246, 0.3),
                0 0 30px rgba(139, 92, 246, 0.3);
        }
    }
`;
document.head.appendChild(sparkleStyle);