/**
 * Profile Page JavaScript
 * Handles profile loading and updates
 */

/* eslint-env browser */
/* eslint-disable no-console */

class ProfileManager {
  constructor() {
    this.profileData = null;
    this.init();
  }

  async init() {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = '/login.html';
      return;
    }

    // Load profile data
    await this.loadProfile();

    // Attach event listeners
    this.attachEventListeners();
  }

  async loadProfile() {
    try {
      const result = await window.apiClient.getProfile();

      if (!result || !result.success) {
        throw new Error(result?.message || 'Failed to load profile');
      }

      this.profileData = result.data;
      this.populateForm();
    } catch (error) {
      console.error('[ProfileManager] Failed to load profile:', error);
      this.showError('Failed to load profile data. Please refresh the page.');
    }
  }

  populateForm() {
    if (!this.profileData) return;

    // Update header
    document.getElementById('profile-name').textContent =
      `${this.profileData.firstName || this.profileData.name || 'User'} ${this.profileData.lastName || ''}`.trim();
    document.getElementById('profile-email').textContent = this.profileData.email || '';

    // Update avatar
    const avatarLarge = document.getElementById('profile-avatar-large');
    const initials = this.getInitials(this.profileData.firstName, this.profileData.lastName);
    avatarLarge.textContent = initials;

    // Populate form fields
    document.getElementById('firstName').value = this.profileData.firstName || '';
    document.getElementById('lastName').value = this.profileData.lastName || '';
    document.getElementById('dateOfBirth').value = this.profileData.dateOfBirth || '';
    document.getElementById('sex').value = this.profileData.sex || '';
    document.getElementById('phone').value = this.profileData.phone || '';
    document.getElementById('email').value = this.profileData.email || '';
  }

  getInitials(firstName, lastName) {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    return this.profileData?.avatar || 'U';
  }

  attachEventListeners() {
    const form = document.getElementById('profile-form');
    const cancelButton = document.getElementById('cancel-button');

    form.addEventListener('submit', (e) => this.handleSubmit(e));
    cancelButton.addEventListener('click', () => this.handleCancel());
  }

  async handleSubmit(e) {
    e.preventDefault();

    const submitButton = e.target.querySelector('button[type="submit"]');
    const buttonLoading = window.buttonLoading;

    try {
      // Show loading state
      if (buttonLoading) {
        buttonLoading.show(submitButton);
      } else {
        submitButton.disabled = true;
      }

      // Hide previous messages
      this.hideMessages();

      // Get form data
      const formData = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        dateOfBirth: document.getElementById('dateOfBirth').value || null,
        sex: document.getElementById('sex').value || null,
        phone: document.getElementById('phone').value.trim() || null,
      };

      // Validate required fields
      if (!formData.firstName || !formData.lastName) {
        throw new Error('First name and last name are required');
      }

      // Update profile via API
      const result = await window.apiClient.updateProfile(formData);

      if (!result || !result.success) {
        throw new Error(result?.message || 'Failed to update profile');
      }

      // Update stored profile data
      this.profileData = result.data;

      // Show success message
      this.showSuccess('Profile updated successfully!');

      // Update header with new data
      this.populateForm();

      // Scroll to top to show message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('[ProfileManager] Failed to update profile:', error);
      this.showError(error.message || 'Failed to update profile');
    } finally {
      // Hide loading state
      if (buttonLoading) {
        buttonLoading.hide(submitButton);
      } else {
        submitButton.disabled = false;
      }
    }
  }

  handleCancel() {
    // Restore original values
    this.populateForm();

    // Hide any messages
    this.hideMessages();

    // Show confirmation toast
    this.showInfo('Changes discarded');
  }

  showSuccess(message) {
    const successMessage = document.getElementById('success-message');
    successMessage.classList.add('show');

    // Auto-hide after 5 seconds
    setTimeout(() => {
      successMessage.classList.remove('show');
    }, 5000);
  }

  showError(message) {
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-message-text');
    errorText.textContent = message;
    errorMessage.classList.add('show');

    // Auto-hide after 8 seconds
    setTimeout(() => {
      errorMessage.classList.remove('show');
    }, 8000);
  }

  showInfo(message) {
    // Simple toast for info messages
    const toast = document.createElement('div');
    toast.className = 'info-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--info-color);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  hideMessages() {
    document.getElementById('success-message').classList.remove('show');
    document.getElementById('error-message').classList.remove('show');
  }
}

// Initialize profile manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ProfileManager();
});
