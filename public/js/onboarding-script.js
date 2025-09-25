/**
 * Onboarding Wizard Script
 * Handles multi-step family registration flow
 */

class OnboardingWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 3;
        this.selectedPath = null;
        this.familyData = null;
        this.apiClient = new APIClient();

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateProgressIndicator();
        this.handleURLParameters();
    }

    setupEventListeners() {
        // Path selection
        document.querySelectorAll('.path-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectPath(e.currentTarget.dataset.path);
            });
        });

        // Family code verification
        const verifyBtn = document.getElementById('verify-family-btn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => this.verifyFamilyCode());
        }

        // Form inputs
        this.setupFormValidation();

        // Password toggle
        this.setupPasswordToggle();

        // Family name input for create flow
        const familyNameInput = document.getElementById('family-name');
        if (familyNameInput) {
            familyNameInput.addEventListener('input', () => this.validateFamilyForm());
        }

        // Family code input for join flow
        const familyCodeInput = document.getElementById('family-code');
        if (familyCodeInput) {
            familyCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
                this.validateFamilyForm();
            });
        }

        // User profile form validation
        const profileInputs = document.querySelectorAll('#user-profile-form input');
        profileInputs.forEach(input => {
            input.addEventListener('input', () => this.validateProfileForm());
        });

        // Password strength checking
        const passwordInput = document.getElementById('user-password');
        if (passwordInput) {
            passwordInput.addEventListener('input', () => this.checkPasswordStrength());
        }

        // Confirm password matching
        const confirmPasswordInput = document.getElementById('confirm-password');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => this.checkPasswordMatch());
        }
    }

    handleURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const familyCode = urlParams.get('familyCode') || urlParams.get('code');

        if (familyCode) {
            // Pre-fill family code if provided in URL
            this.selectPath('join');
            this.nextStep();
            setTimeout(() => {
                const codeInput = document.getElementById('family-code');
                if (codeInput) {
                    codeInput.value = familyCode.toUpperCase();
                    this.validateFamilyForm();
                }
            }, 100);
        }
    }

    selectPath(path) {
        this.selectedPath = path;

        // Update UI
        document.querySelectorAll('.path-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.path === path);
        });

        // Show appropriate form in step 2
        const createForm = document.querySelector('.create-family-form');
        const joinForm = document.querySelector('.join-family-form');

        if (path === 'create') {
            if (createForm) createForm.classList.add('active');
            if (joinForm) joinForm.classList.remove('active');
        } else {
            if (joinForm) joinForm.classList.add('active');
            if (createForm) createForm.classList.remove('active');
        }

        // Enable continue button if path is selected
        this.validateStep1();
    }

    async verifyFamilyCode() {
        const codeInput = document.getElementById('family-code');
        const familyCode = codeInput.value.trim().toUpperCase();

        if (!familyCode || familyCode.length !== 6) {
            this.showError('Please enter a valid 6-character family code');
            return;
        }

        const verifyBtn = document.getElementById('verify-family-btn');
        this.setButtonLoading(verifyBtn, true);

        try {
            const response = await this.apiClient.get(`/families/code/${familyCode}`);

            if (response.success) {
                this.familyData = response.data;
                this.showFamilyPreview(response.data);
                this.validateFamilyForm();
                this.showSuccess('Family found! You can now continue.');
            }
        } catch (error) {
            console.error('Family verification error:', error);
            if (error.status === 404) {
                this.showError('Family code not found. Please check with your family admin.');
            } else if (error.status === 403) {
                this.showError('This family is not accepting new members at this time.');
            } else {
                this.showError('Failed to verify family code. Please try again.');
            }
            this.hideFamilyPreview();
        } finally {
            this.setButtonLoading(verifyBtn, false);
        }
    }

    showFamilyPreview(data) {
        const preview = document.getElementById('family-preview');
        const familyName = document.getElementById('preview-family-name');
        const memberCount = document.getElementById('preview-member-count');
        const membersContainer = document.getElementById('preview-members');

        familyName.textContent = data.family.familyName;
        memberCount.textContent = `${data.members.length} member${data.members.length !== 1 ? 's' : ''}`;

        // Clear and populate members
        membersContainer.innerHTML = '';
        data.members.forEach(member => {
            const memberDiv = document.createElement('div');
            memberDiv.className = 'member-preview';
            memberDiv.innerHTML = `
                <div class="member-avatar">${member.avatar}</div>
                <div class="member-info">
                    <div class="member-name">${member.name}</div>
                    <div class="member-role">${member.role}</div>
                </div>
            `;
            membersContainer.appendChild(memberDiv);
        });

        preview.style.display = 'block';
    }

    hideFamilyPreview() {
        const preview = document.getElementById('family-preview');
        preview.style.display = 'none';
        this.familyData = null;
    }

    setupFormValidation() {
        // Real-time validation as user types
        const inputs = document.querySelectorAll('input[required], textarea[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateInput(input));
            input.addEventListener('input', () => this.clearInputError(input));
        });
    }

    setupPasswordToggle() {
        const toggleBtn = document.getElementById('password-toggle-btn');
        const passwordInput = document.getElementById('user-password');
        const eyeOpen = document.getElementById('eye-open');
        const eyeClosed = document.getElementById('eye-closed');

        if (toggleBtn && passwordInput && eyeOpen && eyeClosed) {
            toggleBtn.addEventListener('click', () => {
                const isPassword = passwordInput.type === 'password';
                passwordInput.type = isPassword ? 'text' : 'password';
                eyeOpen.classList.toggle('hidden', isPassword);
                eyeClosed.classList.toggle('hidden', !isPassword);
            });
        }
    }

    validateInput(input) {
        const isValid = input.checkValidity();
        input.classList.toggle('error', !isValid);
        return isValid;
    }

    clearInputError(input) {
        input.classList.remove('error');
    }

    checkPasswordStrength() {
        const password = document.getElementById('user-password').value;
        const strengthFill = document.getElementById('strength-fill');
        const strengthLabel = document.getElementById('strength-label');

        let strength = 0;
        let label = 'Too weak';

        if (password.length >= 8) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;

        // Remove all strength classes
        strengthFill.className = 'strength-fill';

        if (strength <= 1) {
            strengthFill.classList.add('weak');
            label = 'Too weak';
        } else if (strength === 2) {
            strengthFill.classList.add('fair');
            label = 'Fair';
        } else if (strength === 3) {
            strengthFill.classList.add('good');
            label = 'Good';
        } else if (strength >= 4) {
            strengthFill.classList.add('strong');
            label = 'Strong';
        }

        strengthLabel.textContent = label;
        return strength >= 2; // Minimum fair strength required
    }

    checkPasswordMatch() {
        const password = document.getElementById('user-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const matchIndicator = document.getElementById('password-match');

        if (confirmPassword.length === 0) {
            matchIndicator.textContent = '';
            matchIndicator.className = 'input-validation';
            return true;
        }

        const isMatch = password === confirmPassword;
        matchIndicator.textContent = isMatch ? 'Passwords match' : 'Passwords do not match';
        matchIndicator.className = `input-validation ${isMatch ? 'success' : 'error'}`;

        return isMatch;
    }

    validateStep1() {
        const nextBtn = document.getElementById('family-next-btn') ||
                       document.querySelector('.step-navigation .btn--primary');

        if (nextBtn) {
            nextBtn.disabled = !this.selectedPath;
            // Also remove any visual disabled styling
            if (this.selectedPath) {
                nextBtn.classList.remove('disabled');
                nextBtn.style.opacity = '1';
                nextBtn.style.pointerEvents = 'auto';
            }
        }
    }

    validateFamilyForm() {
        const nextBtn = document.getElementById('family-next-btn');
        if (!nextBtn) return;

        let isValid = false;

        if (this.selectedPath === 'create') {
            const familyName = document.getElementById('family-name').value.trim();
            isValid = familyName.length >= 2;
        } else if (this.selectedPath === 'join') {
            const familyCode = document.getElementById('family-code').value.trim();
            isValid = familyCode.length === 6 && this.familyData !== null;
        }

        nextBtn.disabled = !isValid;
    }

    validateProfileForm() {
        const completeBtn = document.getElementById('complete-registration-btn');
        if (!completeBtn) return;

        const name = document.getElementById('user-name').value.trim();
        const email = document.getElementById('user-email').value.trim();
        const password = document.getElementById('user-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const termsAccepted = document.getElementById('terms-agreement').checked;

        const isNameValid = name.length >= 2;
        const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const isPasswordValid = this.checkPasswordStrength();
        const isPasswordMatch = this.checkPasswordMatch();

        const isValid = isNameValid && isEmailValid && isPasswordValid &&
                       isPasswordMatch && termsAccepted;

        completeBtn.disabled = !isValid;
    }

    nextStep() {
        console.log('nextStep called, currentStep:', this.currentStep);
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStep();
            this.updateProgressIndicator();
            console.log('Moved to step:', this.currentStep);
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStep();
            this.updateProgressIndicator();
        }
    }

    updateStep() {
        // Hide all steps
        document.querySelectorAll('.onboarding-step').forEach(step => {
            step.classList.remove('active');
        });

        // Show current step
        const currentStepElement = document.getElementById(`step-${this.currentStep}`);
        if (currentStepElement) {
            currentStepElement.classList.add('active', 'entering');
            setTimeout(() => {
                currentStepElement.classList.remove('entering');
            }, 400);
        }
    }

    updateProgressIndicator() {
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');

            if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('active');
            }
        });
    }

    async completeRegistration() {
        const completeBtn = document.getElementById('complete-registration-btn');
        this.setButtonLoading(completeBtn, true);

        try {
            // Gather form data
            const registrationData = {
                name: document.getElementById('user-name').value.trim(),
                email: document.getElementById('user-email').value.trim(),
                password: document.getElementById('user-password').value,
                isCreatingFamily: this.selectedPath === 'create',
            };

            if (this.selectedPath === 'create') {
                registrationData.familyName = document.getElementById('family-name').value.trim();
                registrationData.description = document.getElementById('family-description').value.trim();
            } else {
                registrationData.familyCode = document.getElementById('family-code').value.trim();
                registrationData.familyId = this.familyData?.family?.familyId;
            }

            // Call registration API
            const response = await this.apiClient.post('/auth/register', registrationData);

            if (response.success) {
                // Store authentication token
                localStorage.setItem('authToken', response.data.accessToken);
                localStorage.setItem('refreshToken', response.data.refreshToken);
                localStorage.setItem('userData', JSON.stringify(response.data.user));

                this.showSuccess('Account created successfully! Welcome to your family organizer.');

                // If creating family, show family code
                if (this.selectedPath === 'create') {
                    // Get family info to show the code
                    setTimeout(async () => {
                        try {
                            const user = response.data.user;
                            const familyResponse = await this.apiClient.get(`/families/${user.familyId}`);
                            if (familyResponse.success && familyResponse.data.familyCode) {
                                this.showFamilyCode(familyResponse.data.familyCode);
                            } else {
                                // Fallback - just continue to app
                                window.location.href = '/index.html';
                            }
                        } catch (error) {
                            console.error('Error getting family info:', error);
                            window.location.href = '/index.html';
                        }
                    }, 1000);
                } else {
                    // Redirect to main app
                    setTimeout(() => {
                        window.location.href = '/index.html';
                    }, 1500);
                }
            }
        } catch (error) {
            console.error('Registration error:', error);
            if (error.status === 409) {
                this.showError('An account with this email already exists. Please use a different email or sign in instead.');
            } else if (error.status === 404 && error.message.includes('family code')) {
                this.showError('Invalid family code. Please check with your family admin.');
            } else {
                this.showError('Registration failed. Please try again.');
            }
        } finally {
            this.setButtonLoading(completeBtn, false);
        }
    }

    showFamilyCode(familyCode) {
        // Create and show family code modal
        const modal = document.createElement('div');
        modal.className = 'family-code-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2>🎉 Your Family is Ready!</h2>
                        <p>Share this code with your family members so they can join:</p>
                    </div>
                    <div class="family-code-display">
                        <div class="family-code">${familyCode}</div>
                        <button class="btn btn--secondary" onclick="copyFamilyCode('${familyCode}', this)">
                            📋 Copy Code
                        </button>
                    </div>
                    <div class="sharing-options">
                        <p>Or share via:</p>
                        <div class="share-buttons">
                            <button class="btn btn--ghost" onclick="shareWhatsApp('${familyCode}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.382"/>
                                </svg>
                                WhatsApp
                            </button>
                            <button class="btn btn--ghost" onclick="shareEmail('${familyCode}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                    <polyline points="22,6 12,13 2,6"/>
                                </svg>
                                Email
                            </button>
                            <button class="btn btn--ghost" onclick="shareCopy('${familyCode}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                                </svg>
                                Copy Link
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn--primary" onclick="continueToApp()">
                            Continue to App
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9,18 15,12 9,6"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    setButtonLoading(button, isLoading) {
        if (!button) return;

        button.disabled = isLoading;
        if (isLoading) {
            button.setAttribute('data-loading', 'true');
            button.classList.add('loading');
        } else {
            button.removeAttribute('data-loading');
            button.classList.remove('loading');
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');

        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.classList.add('show');

            // Hide success message if showing
            const successDiv = document.getElementById('success-message');
            if (successDiv) {
                successDiv.classList.remove('show');
            }

            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorDiv.classList.remove('show');
            }, 5000);
        }
    }

    showSuccess(message) {
        const successDiv = document.getElementById('success-message');
        const successText = document.getElementById('success-text');

        if (successDiv && successText) {
            successText.textContent = message;
            successDiv.classList.add('show');

            // Hide error message if showing
            const errorDiv = document.getElementById('error-message');
            if (errorDiv) {
                errorDiv.classList.remove('show');
            }

            // Auto-hide after 3 seconds
            setTimeout(() => {
                successDiv.classList.remove('show');
            }, 3000);
        }
    }
}

// Global functions
function nextStep() {
    window.onboardingWizard.nextStep();
}

function previousStep() {
    window.onboardingWizard.previousStep();
}

function completeRegistration() {
    window.onboardingWizard.completeRegistration();
}

function goToLogin() {
    window.location.href = '/login.html';
}

function shareWhatsApp(familyCode) {
    const message = encodeURIComponent(`Join our family organizer! Use code: ${familyCode} or visit: ${window.location.origin}/register.html?code=${familyCode}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
}

function shareEmail(familyCode) {
    const subject = encodeURIComponent('Join Our Family Organizer');
    const body = encodeURIComponent(`You've been invited to join our family organizer!\n\nFamily Code: ${familyCode}\n\nJoin here: ${window.location.origin}/register.html?code=${familyCode}\n\nThis app helps families organize tasks, meetings, and stay connected.`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function copyFamilyCode(familyCode, button) {
    navigator.clipboard.writeText(familyCode).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '✅ Copied!';
        button.classList.add('copy-success');

        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copy-success');
        }, 2000);
    }).catch(() => {
        alert('Failed to copy. Please copy manually: ' + familyCode);
    });
}

function shareCopy(familyCode) {
    const shareUrl = `${window.location.origin}/register.html?code=${familyCode}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Link copied to clipboard!');
    });
}

function continueToApp() {
    window.location.href = '/index.html';
}

// Test if script is loading
console.log('Onboarding script loaded!');

// Global variables for simpler approach
let selectedPath = null;
let currentStep = 1;

// Simple path selection function
function selectPath(path) {
    console.log('selectPath called with:', path);
    selectedPath = path;

    // Update UI - highlight selected option
    document.querySelectorAll('.path-option').forEach(option => {
        if (option.dataset.path === path) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });

    // Enable continue button for Step 1
    const step1NextBtn = document.getElementById('step1-continue-btn');
    if (step1NextBtn) {
        step1NextBtn.disabled = false;
        step1NextBtn.style.opacity = '1';
        step1NextBtn.style.pointerEvents = 'auto';
        console.log('Step 1 Continue button enabled');
    }
}

// Simple next step function
function nextStepSimple() {
    console.log('nextStepSimple called, current step:', currentStep);
    if (currentStep === 1 && selectedPath) {
        currentStep = 2;

        // Hide step 1, show step 2
        const step1 = document.getElementById('step-1');
        const step2 = document.getElementById('step-2');

        if (step1 && step2) {
            step1.classList.remove('active');
            step2.classList.add('active');

            // Show appropriate form based on path
            const createForm = document.querySelector('.create-family-form');
            const joinForm = document.querySelector('.join-family-form');

            if (selectedPath === 'create') {
                if (createForm) createForm.style.display = 'block';
                if (joinForm) joinForm.style.display = 'none';
            } else {
                if (joinForm) joinForm.style.display = 'block';
                if (createForm) createForm.style.display = 'none';
            }

            console.log('Advanced to step 2');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    window.onboardingWizard = new OnboardingWizard();

    // Direct event binding with immediate effect
    setTimeout(() => {
        console.log('Setting up direct event handlers...');

        const createOption = document.querySelector('[data-path="create"]');
        const joinOption = document.querySelector('[data-path="join"]');
        const nextBtn = document.getElementById('family-next-btn');

        console.log('Found elements:', {
            createOption: !!createOption,
            joinOption: !!joinOption,
            nextBtn: !!nextBtn
        });

        // Debug: Log what elements we actually found
        console.log('Create option element:', createOption);
        console.log('Join option element:', joinOption);
        console.log('Next button element:', nextBtn);

        // Also try alternative selectors
        const allPathOptions = document.querySelectorAll('.path-option');
        console.log('All path-option elements found:', allPathOptions.length);
        allPathOptions.forEach((option, index) => {
            console.log(`Path option ${index}:`, option.dataset.path, option);
        });

        if (createOption) {
            createOption.addEventListener('click', function() {
                console.log('Create option clicked!');
                selectPath('create');
            });
        }

        if (joinOption) {
            joinOption.addEventListener('click', function() {
                console.log('Join option clicked!');
                selectPath('join');
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                console.log('Next button clicked!');
                nextStepSimple();
            });
        }

        console.log('Event handlers attached');
    }, 100);
});