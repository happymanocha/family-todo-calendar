/**
 * API Configuration for Family Todo App
 * Handles all communication with AWS Lambda backend
 */

class APIClient {
    constructor() {
        this.baseURL = 'https://4yqv4blrvj.execute-api.us-east-1.amazonaws.com/dev/api';
        this.token = localStorage.getItem('authToken');
    }

    // Get authorization headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        // Always get the latest token from localStorage
        this.token = localStorage.getItem('authToken');
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);

            // Try to parse JSON response
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
                data = { message: 'Invalid response format' };
            }

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    console.log('Authentication error, redirecting to login');
                    this.handleAuthError();
                    return null; // Don't throw, just return null to prevent error alerts
                }
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);

            // If it's a network error or auth redirect, don't throw
            if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
                console.log('Network error occurred');
                return null;
            }

            throw error;
        }
    }

    // Handle authentication errors
    handleAuthError() {
        this.clearAuth();
        if (window.location.pathname !== '/login.html') {
            window.location.href = '/login.html';
        }
    }

    // Authentication methods
    async login(email, password) {
        console.log('🔐 API: Making login request...');
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        console.log('🔐 API: Login response received:', response);

        if (response && response.success && response.data && response.data.tokens && response.data.tokens.accessToken) {
            this.token = response.data.tokens.accessToken;
            console.log('🔐 API: Saving token to localStorage:', this.token);
            localStorage.setItem('authToken', this.token);
            localStorage.setItem('currentUser', JSON.stringify(response.data.user));
            console.log('🔐 API: Token saved. Verifying:', localStorage.getItem('authToken'));
        } else {
            console.log('🔐 API: No token in response or login failed:', response);
        }

        return response;
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.warn('Logout API call failed:', error);
        } finally {
            this.clearAuth();
        }
    }

    async validateToken() {
        if (!this.token) {
            console.log('No token to validate');
            return false;
        }

        try {
            const response = await this.request('/auth/validate', {
                method: 'POST',
                body: JSON.stringify({ token: this.token })
            });

            console.log('Token validation response:', response);

            // Handle null response (auth error handled by request method)
            if (response === null) {
                return false;
            }

            return response && response.success;
        } catch (error) {
            console.error('Token validation error:', error);
            this.clearAuth();
            return false;
        }
    }

    async getProfile() {
        return await this.request('/auth/profile');
    }

    clearAuth() {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('familySession');
        localStorage.removeItem('familySessionExpires');
        localStorage.removeItem('currentFamilyMember');
        localStorage.removeItem('currentUserEmail');
    }

    // Todo methods
    async getTodos(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/todos?${queryString}` : '/todos';
        return await this.request(endpoint);
    }

    async createTodo(todoData) {
        return await this.request('/todos', {
            method: 'POST',
            body: JSON.stringify(todoData)
        });
    }

    async getTodo(id) {
        return await this.request(`/todos/${id}`);
    }

    async updateTodo(id, todoData) {
        return await this.request(`/todos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(todoData)
        });
    }

    async deleteTodo(id) {
        return await this.request(`/todos/${id}`, {
            method: 'DELETE'
        });
    }

    async updateTodoStatus(id, status) {
        return await this.request(`/todos/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    async addComment(id, comment) {
        return await this.request(`/todos/${id}/comments`, {
            method: 'POST',
            body: JSON.stringify({ comment })
        });
    }

    async searchTodos(params) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/todos/search?${queryString}`);
    }

    async getStatistics(period = 30) {
        return await this.request(`/todos/statistics?period=${period}`);
    }

    async getUpcoming(days = 7) {
        return await this.request(`/todos/upcoming?days=${days}`);
    }

    async bulkUpdate(todoIds, updates) {
        return await this.request('/todos/bulk', {
            method: 'PATCH',
            body: JSON.stringify({ todoIds, updates })
        });
    }

    // Family methods
    async createFamily(familyData) {
        return await this.request('/families', {
            method: 'POST',
            body: JSON.stringify(familyData)
        });
    }

    async getFamilyByCode(familyCode) {
        return await this.request(`/families/code/${familyCode}`);
    }

    async getFamily(familyId) {
        return await this.request(`/families/${familyId}`);
    }

    async getFamilyMembers(familyId) {
        return await this.request(`/families/${familyId}/members`);
    }

    async register(userData) {
        return await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // Generic HTTP methods
    async get(endpoint) {
        return await this.request(endpoint, {
            method: 'GET'
        });
    }

    async post(endpoint, data) {
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return await this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return await this.request(endpoint, {
            method: 'DELETE'
        });
    }

    async patch(endpoint, data) {
        return await this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    // Utility methods
    isAuthenticated() {
        // Always check localStorage for the latest token
        this.token = localStorage.getItem('authToken');
        return !!this.token;
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    }
}

// Create global API client instance
window.apiClient = new APIClient();