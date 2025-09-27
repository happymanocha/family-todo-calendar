class FamilyTodoApp {
    constructor() {
        // Prevent multiple instances
        if (window.familyTodoApp) {
            console.log('FamilyTodoApp already exists, skipping');
            return window.familyTodoApp;
        }

        this.todos = [];
        this.currentView = 'todo';
        this.selectedMember = 'all';
        this.currentDate = new Date();
        this.editingTodoId = null;
        this.stylesMenuOpen = false;
        this.calendarView = 'monthly'; // monthly, weekly, daily
        this.loading = false;
        this.authCheckInProgress = false;

        console.log(`Page loaded: ${window.location.pathname}`);

        // Longer delay to ensure login token is properly saved and accessible
        setTimeout(() => {
            this.checkAndInitialize();
        }, 500);

        // Add debug functions to window for manual testing
        window.debugDeleteTodo = (id) => this.deleteTodo(id);
        window.debugUpdateStatus = (id, status) => this.updateTodoStatus(id, status);
        window.debugOpenEdit = (id) => this.openEditModal(id);

        // Debug info
        console.log('FamilyTodoApp constructor - Version with event listeners (no onclick handlers)');
    }

    async checkAndInitialize() {
        // Check if apiClient is available
        if (!window.apiClient) {
            console.error('❌ apiClient not available, waiting...');
            // Wait a bit more and try again
            setTimeout(() => {
                this.checkAndInitialize();
            }, 200);
            return;
        }

        // Prevent multiple authentication checks
        if (this.authCheckInProgress) {
            console.log('Authentication check already in progress');
            return;
        }

        // Skip auth check on login and logout pages
        const currentPath = window.location.pathname;
        console.log('🌐 Current page path:', currentPath);

        if (currentPath.includes('login.html') || currentPath.includes('logout.html') || currentPath.includes('onboarding.html')) {
            console.log('✅ On auth page, skipping auth check');
            return;
        }

        console.log('🔄 Not on auth page, proceeding with auth check...');

        this.authCheckInProgress = true;

        try {
            const isAuthenticated = await this.checkAuthentication();
            if (isAuthenticated) {
                console.log('✅ Authentication successful, initializing app');
                await this.init();
            }
        } catch (error) {
            console.error('Authentication/initialization error:', error);
        } finally {
            this.authCheckInProgress = false;
        }
    }

    async checkAuthentication() {
        console.log('🔐 Checking authentication...');

        // Debug: Show current token state
        const token = localStorage.getItem('authToken');
        console.log('🔍 Main app checking token:', token ? `${token.substring(0, 20)}...` : 'NONE');

        if (!token) {
            console.log('🔍 No authToken in localStorage');
            console.log('🔍 All localStorage keys:', Object.keys(localStorage));
            console.log('🔍 All localStorage data:');
            for (let key of Object.keys(localStorage)) {
                console.log(`  - ${key}:`, localStorage.getItem(key));
            }
        }

        // First check if we have a token
        if (!window.apiClient.isAuthenticated()) {
            console.log('❌ No token found in apiClient, redirecting to login');
            this.redirectToLogin();
            return false;
        }

        try {
            console.log('🔍 Validating token with server...');
            // Validate token with server
            const isValid = await window.apiClient.validateToken();
            console.log('🔍 Token validation result:', isValid);

            if (!isValid) {
                console.log('❌ Token invalid, redirecting to login');
                // Clear invalid token
                window.apiClient.clearAuth();
                this.redirectToLogin();
                return false;
            }

            console.log('✅ Token valid - user authenticated');
            return true;
        } catch (error) {
            console.error('❌ Authentication check failed:', error);

            // Clear potentially invalid token
            window.apiClient.clearAuth();
            this.redirectToLogin();
            return false;
        }
    }

    redirectToLogin() {
        // Only redirect if not already on login or onboarding page
        const currentPath = window.location.pathname;
        console.log('🔄 REDIRECT TO ONBOARDING TRIGGERED!');
        console.log('🔄 Current path:', currentPath);

        if (!currentPath.includes('login.html') && !currentPath.includes('onboarding.html')) {
            console.log('🔄 Redirecting to onboarding page...');
            console.log('🔄 Will redirect in 100ms...');

            // Small delay to prevent rapid redirects and allow logging
            setTimeout(() => {
                console.log('🔄 Executing redirect to onboarding now...');
                window.location.href = '/onboarding.html';
            }, 100);
        } else {
            console.log('✅ Already on login or onboarding page, skipping redirect');
        }
    }

    showDebugInfo(message) {
        console.log(message);

        // Minimal debug for this issue
        if (message.includes('redirect')) {
            document.title = `DEBUG: ${message}`;
        }
    }

    async init() {
        this.setupEventListeners();
        this.loadTheme();
        await this.loadFamilyMembers();
        await this.loadTodos();
        this.renderTodos();

        // Update user display after initialization with a small delay to ensure API data is loaded
        setTimeout(() => {
            this.updateUserDisplay();
        }, 500);
        this.renderCalendar();
        this.checkReminders();

        setInterval(() => this.checkReminders(), 60000);
    }

    async loadTodos() {
        try {
            this.setLoading(true);
            console.log('API TESTING: Loading todos from API...');

            const response = await window.apiClient.getTodos();

            if (response === null) {
                console.log('API TESTING: No response received (auth error)');
                this.todos = [];
                return;
            }

            if (response && response.success) {
                const apiTodos = response.data.items || response.data || [];

                // Convert API format to frontend format
                this.todos = apiTodos.map(apiTodo => ({
                    id: apiTodo.id,
                    text: apiTodo.title,           // API: title -> Frontend: text
                    member: apiTodo.assignedTo,    // API: assignedTo -> Frontend: member
                    type: apiTodo.category === 'meeting' ? 'meeting' : 'task',
                    status: apiTodo.status,
                    dueDate: apiTodo.dueDate,
                    createdAt: apiTodo.createdAt,
                    description: apiTodo.description || '',
                    reminderSet: apiTodo.reminderSet || false
                }));

                console.log(`API TESTING: Loaded ${this.todos.length} todos from API, converted format`);
            } else {
                console.error('API TESTING: API returned error:', response);
                this.todos = [];
            }
        } catch (error) {
            console.error('API TESTING: Error loading todos:', error);
            this.todos = [];
        } finally {
            this.setLoading(false);
        }
    }

    async loadFamilyMembers() {
        try {
            console.log('Loading family members from API...');

            const response = await window.apiClient.get('/auth/family-members');

            if (response && response.success) {
                const members = response.data || [];
                console.log('Loaded family members:', members);

                // Check if user has no family (empty members array)
                if (members.length === 0) {
                    console.log('User has no family - showing onboarding');
                    this.showOnboarding();
                    return;
                }

                // Update the family member buttons
                this.updateFamilyMemberButtons(members);
            } else {
                console.error('Failed to load family members:', response);
                // If API call fails, also check if it's because user has no family
                if (response && response.message && response.message.includes('not associated with any family')) {
                    console.log('User has no family - showing onboarding');
                    this.showOnboarding();
                    return;
                }
            }
        } catch (error) {
            console.error('Error loading family members:', error);
            // Check if error indicates user has no family
            if (error.message && error.message.includes('not associated with any family')) {
                console.log('User has no family - showing onboarding');
                this.showOnboarding();
                return;
            }
        }
    }

    updateFamilyMemberButtons(members) {
        const familySelector = document.querySelector('.family-selector .btn-group');
        if (!familySelector) {
            console.error('Family selector not found');
            return;
        }

        // Clear existing buttons except "All Family"
        familySelector.innerHTML = '<button class="btn btn--secondary family-btn active" data-member="all">All Family</button>';

        // Add buttons for each family member
        members.forEach(member => {
            const button = document.createElement('button');
            button.className = 'btn btn--secondary family-btn';
            button.setAttribute('data-member', member.id);
            button.textContent = member.name;

            // Add click event listener
            button.addEventListener('click', (e) => this.selectMember(e.target.dataset.member));

            familySelector.appendChild(button);
        });

        // Also update select dropdowns in modals
        this.updateFamilyMemberSelects(members);
    }

    updateFamilyMemberSelects(members) {
        // Update assign-to selects in the forms - be more specific about which selects to target
        const memberSelects = [
            'todo-member',
            'edit-todo-member',
            'assign-to',
            'member-select'
        ];

        memberSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                console.log(`Updating select: ${selectId} with ${members.length} members`);

                // Clear existing options
                select.innerHTML = '';

                // Add default option
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Select member';
                select.appendChild(defaultOption);

                // Add options for each family member
                members.forEach(member => {
                    const option = document.createElement('option');
                    option.value = member.id;
                    option.textContent = member.name;
                    select.appendChild(option);
                    console.log(`Added option to ${selectId}: ${member.name} (${member.id})`);
                });
            } else {
                console.log(`Select element not found: ${selectId}`);
            }
        });

        // Also try the original selector as fallback
        const assignSelects = document.querySelectorAll('select[id*="assign"], select[id*="member"]');
        console.log('Fallback selector found:', assignSelects.length, 'elements');

        assignSelects.forEach(select => {
            if (!memberSelects.includes(select.id)) {
                console.log(`Updating additional select: ${select.id}`);
                // Clear existing options
                select.innerHTML = '';

                // Add default option
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Select member';
                select.appendChild(defaultOption);

                // Add options for each family member
                members.forEach(member => {
                    const option = document.createElement('option');
                    option.value = member.id;
                    option.textContent = member.name;
                    select.appendChild(option);
                });
            }
        });
    }

    setLoading(loading) {
        this.loading = loading;
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = loading ? 'block' : 'none';
        }
    }

    showError(message) {
        console.error(message);

        // Create a more user-friendly error display instead of alert
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-toast';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f87171;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            max-width: 300px;
            font-size: 14px;
        `;

        document.body.appendChild(errorDiv);

        // Remove the error after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    showSuccess(message) {
        console.log('✅', message);

        // Create success toast
        const successDiv = document.createElement('div');
        successDiv.className = 'success-toast';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            max-width: 300px;
            font-size: 14px;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(successDiv);

        // Remove the success message after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    showInfo(message) {
        console.log('ℹ️', message);

        // Create info toast
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info-toast';
        infoDiv.textContent = message;
        infoDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #3b82f6;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            max-width: 300px;
            font-size: 14px;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(infoDiv);

        // Remove the info message after 4 seconds
        setTimeout(() => {
            if (infoDiv.parentNode) {
                infoDiv.parentNode.removeChild(infoDiv);
            }
        }, 4000);
    }

    setupEventListeners() {
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.addEventListener('click', (e) => this.changeTheme(e.currentTarget.dataset.theme));
        });

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.changeView(e.target.dataset.view));
        });

        document.querySelectorAll('.family-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectMember(e.target.dataset.member));
        });

        // Enhanced Add Todo button with loading states
        ButtonLoading.enhance('#add-todo-btn', async () => {
            return await this.addTodo();
        }, {
            loadingText: 'Adding...',
            successText: 'Added!',
            errorText: 'Failed to Add',
            successDuration: 1500
        });

        document.getElementById('todo-text').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        document.getElementById('prev-period').addEventListener('click', () => this.changePeriod(-1));
        document.getElementById('next-period').addEventListener('click', () => this.changePeriod(1));

        // Calendar view buttons
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.changeCalendarView(e.target.dataset.view));
        });

        // Logout button event listener
        const logoutBtn = document.getElementById('logout-button');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // User menu event listeners
        this.setupUserMenuListeners();

        // Modal event listeners
        const modalCloseBtn = document.getElementById('modal-close-btn');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => this.closeEditModal());
        }

        const modalCancelBtn = document.getElementById('modal-cancel-btn');
        if (modalCancelBtn) {
            modalCancelBtn.addEventListener('click', () => this.closeEditModal());
        }

        const modalDeleteBtn = document.getElementById('modal-delete-btn');
        if (modalDeleteBtn) {
            ButtonLoading.enhanceDelete(modalDeleteBtn, async () => {
                return await this.deleteCurrentTask();
            }, {
                confirmMessage: 'Are you sure you want to delete this item permanently?',
                loadingText: 'Deleting...',
                successText: 'Deleted!',
                errorText: 'Delete Failed',
                successDuration: 1000
            });
        }

        const modalSaveBtn = document.getElementById('modal-save-btn');
        if (modalSaveBtn) {
            ButtonLoading.enhance(modalSaveBtn, async () => {
                return await this.saveTaskEdit();
            }, {
                loadingText: 'Saving...',
                successText: 'Saved!',
                errorText: 'Save Failed',
                successDuration: 1500
            });
        }

        // Dark mode toggle event listener (now a button, not checkbox)
        const darkModeBtn = document.getElementById('dark-mode-toggle');
        if (darkModeBtn) {
            darkModeBtn.addEventListener('click', () => this.toggleDarkMode());
        }

        // Item type select event listeners
        const itemTypeSelect = document.getElementById('item-type');
        if (itemTypeSelect) {
            itemTypeSelect.addEventListener('change', () => this.toggleItemType());
        }

        const editItemTypeSelect = document.getElementById('edit-item-type');
        if (editItemTypeSelect) {
            editItemTypeSelect.addEventListener('change', () => this.toggleEditItemType());
        }

        document.getElementById('todo-date').valueAsDate = new Date();

        // Close styles menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.styles-menu')) {
                this.closeStylesMenu();
            }
        });

        // Family Settings event listeners
        this.setupFamilySettingsListeners();

        // Onboarding event listeners
        this.setupOnboardingListeners();
    }

    changeTheme(theme) {
        const isDarkMode = document.body.classList.contains('dark-mode');
        document.body.className = isDarkMode ? `${theme} dark-mode` : theme;
        localStorage.setItem('familyTheme', theme);

        document.querySelectorAll('.theme-option').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('familyTheme') || 'modern-blue';
        const isDarkMode = localStorage.getItem('darkMode') === 'true';

        this.changeTheme(savedTheme);

        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        }
    }

    setupUserMenuListeners() {
        // User menu toggle
        const userMenuBtn = document.getElementById('user-menu-button');
        const userDropdown = document.getElementById('user-dropdown');

        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserMenu();
            });
        }

        // Styles submenu toggle
        const stylesMenuItem = document.getElementById('styles-menu-item');
        const stylesSubmenu = document.getElementById('styles-submenu');

        if (stylesMenuItem && stylesSubmenu) {
            stylesMenuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleStylesSubmenu();
            });
        }

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                this.closeUserMenu();
            }
        });

        // Update current user display
        this.updateUserDisplay();
    }

    toggleUserMenu() {
        const dropdown = document.getElementById('user-dropdown');
        const userMenuBtn = document.getElementById('user-menu-button');

        if (dropdown.classList.contains('show')) {
            this.closeUserMenu();
        } else {
            dropdown.classList.add('show');
            userMenuBtn.setAttribute('aria-expanded', 'true');
            // Update user display when menu is opened
            this.updateUserDisplay();
        }
    }

    closeUserMenu() {
        const dropdown = document.getElementById('user-dropdown');
        const userMenuBtn = document.getElementById('user-menu-button');
        const stylesSubmenu = document.getElementById('styles-submenu');
        const stylesChevron = document.getElementById('styles-chevron');

        if (dropdown) dropdown.classList.remove('show');
        if (userMenuBtn) userMenuBtn.setAttribute('aria-expanded', 'false');
        if (stylesSubmenu) stylesSubmenu.classList.remove('show');
        if (stylesChevron) stylesChevron.style.transform = 'rotate(0deg)';
    }

    toggleStylesSubmenu() {
        const stylesSubmenu = document.getElementById('styles-submenu');
        const stylesChevron = document.getElementById('styles-chevron');

        if (stylesSubmenu) {
            const isExpanded = stylesSubmenu.classList.contains('show');

            if (isExpanded) {
                stylesSubmenu.classList.remove('show');
                if (stylesChevron) stylesChevron.style.transform = 'rotate(0deg)';
            } else {
                stylesSubmenu.classList.add('show');
                if (stylesChevron) stylesChevron.style.transform = 'rotate(180deg)';
            }
        }
    }

    getCurrentUserInfo() {
        // Get user info from localStorage or decode from token
        try {
            const userInfo = localStorage.getItem('userInfo');
            if (userInfo) {
                return JSON.parse(userInfo);
            }

            // Fallback: try to get from token
            const token = localStorage.getItem('authToken');
            if (token) {
                // Basic token decode (assumes JWT structure)
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    return {
                        email: payload.email,
                        name: payload.displayName || payload.name,
                        id: payload.userId || payload.id
                    };
                } catch (e) {
                    console.warn('Could not decode token:', e);
                }
            }

            // Final fallback
            return {
                email: 'user@example.com',
                name: 'User',
                id: null
            };
        } catch (error) {
            console.error('Error getting user info:', error);
            return {
                email: 'user@example.com',
                name: 'User',
                id: null
            };
        }
    }

    getCurrentUser() {
        return this.getCurrentUserInfo();
    }

    updateUserDisplay() {
        // Get current user info from stored session or API
        const currentUser = this.getCurrentUserInfo();
        console.log('🔄 Updating user display with:', currentUser);

        // Force update even if no name - use email as fallback for name
        const displayName = currentUser.name || currentUser.email?.split('@')[0] || 'User';
        const displayEmail = currentUser.email || 'user@example.com';

        // Update avatar text
        const avatarText = document.getElementById('user-avatar-text');
        const avatarLargeText = document.getElementById('user-avatar-large-text');
        if (avatarText) {
            const initial = displayName.charAt(0).toUpperCase();
            console.log('🔄 Setting avatar initial to:', initial, 'from name:', displayName);
            avatarText.textContent = initial;
            if (avatarLargeText) avatarLargeText.textContent = initial;
        }

        // Update display name in dropdown
        const dropdownDisplayName = document.getElementById('user-display-name');
        if (dropdownDisplayName) {
            console.log('🔄 Setting dropdown name to:', displayName);
            dropdownDisplayName.textContent = displayName;
        }

        // Update name in header button
        const currentUserSpan = document.getElementById('current-user');
        if (currentUserSpan) {
            console.log('🔄 Setting header name to:', displayName);
            currentUserSpan.textContent = displayName;
        }

        // Update email
        const userEmail = document.getElementById('user-email');
        if (userEmail) {
            console.log('🔄 Setting email to:', displayEmail);
            userEmail.textContent = displayEmail;
        }
    }

    getCurrentUserInfo() {
        // Try to get from API client first (serverless auth)
        if (window.apiClient) {
            const apiUser = window.apiClient.getCurrentUser();
            console.log('🔍 API User data:', apiUser);
            if (apiUser && apiUser.email) {
                // Use the name directly from API as it should already be properly formatted
                const userName = apiUser.name || 'User';
                console.log('🔍 Using API name directly:', userName);
                return {
                    name: userName,
                    email: apiUser.email
                };
            }
        }

        // Fallback to local session data (for local fallback auth)
        const familySession = JSON.parse(localStorage.getItem('familySession') || '{}');
        const currentUserEmail = localStorage.getItem('currentUserEmail');
        const currentFamilyMember = localStorage.getItem('currentFamilyMember');

        if (familySession.email) {
            return {
                name: this.capitalizeName(familySession.memberName) || 'User',
                email: familySession.email
            };
        }

        if (currentUserEmail && currentFamilyMember) {
            return {
                name: this.capitalizeName(currentFamilyMember) || 'User',
                email: currentUserEmail
            };
        }

        // Final fallback
        return {
            name: 'User',
            email: 'user@example.com'
        };
    }

    closeStylesMenu() {
        const dropdown = document.getElementById('styles-submenu');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
        this.stylesMenuOpen = false;
    }

    // Family Settings Methods
    setupFamilySettingsListeners() {
        // Family Settings toggle button
        const familySettingsToggle = document.getElementById('family-settings-toggle');
        if (familySettingsToggle) {
            familySettingsToggle.addEventListener('click', () => this.openFamilySettings());
        }

        // Family Settings modal close buttons
        const familySettingsCloseBtn = document.getElementById('family-settings-close-btn');
        if (familySettingsCloseBtn) {
            familySettingsCloseBtn.addEventListener('click', () => this.closeFamilySettings());
        }

        // Copy family code button
        const copyCodeBtn = document.getElementById('copy-family-code');
        if (copyCodeBtn) {
            copyCodeBtn.addEventListener('click', () => this.copyFamilyCode());
        }

        // Share buttons
        const shareEmailBtn = document.getElementById('share-email');
        if (shareEmailBtn) {
            shareEmailBtn.addEventListener('click', () => this.shareViaEmail());
        }

        const shareSmsBtn = document.getElementById('share-sms');
        if (shareSmsBtn) {
            shareSmsBtn.addEventListener('click', () => this.shareViaSms());
        }

        const shareWhatsappBtn = document.getElementById('share-whatsapp');
        if (shareWhatsappBtn) {
            shareWhatsappBtn.addEventListener('click', () => this.shareViaWhatsapp());
        }

        const shareCopyLinkBtn = document.getElementById('share-copy-link');
        if (shareCopyLinkBtn) {
            shareCopyLinkBtn.addEventListener('click', () => this.shareCopyLink());
        }

        // Admin actions
        const regenerateCodeBtn = document.getElementById('regenerate-code-btn');
        if (regenerateCodeBtn) {
            regenerateCodeBtn.addEventListener('click', () => this.regenerateFamilyCode());
        }

        const managePermissionsBtn = document.getElementById('manage-permissions-btn');
        if (managePermissionsBtn) {
            managePermissionsBtn.addEventListener('click', () => this.managePermissions());
        }

        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('family-settings-modal');
            if (modal && e.target === modal) {
                this.closeFamilySettings();
            }
        });
    }

    async openFamilySettings() {
        const modal = document.getElementById('family-settings-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            await this.loadFamilyInfo();
        }
    }

    closeFamilySettings() {
        const modal = document.getElementById('family-settings-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    async loadFamilyInfo() {
        try {
            // Load family information
            const response = await window.apiClient.get('/families/current');

            if (response && response.success) {
                const familyInfo = response.data;

                // Update family info display
                const familyNameEl = document.getElementById('family-name');
                const familyMemberCountEl = document.getElementById('family-member-count');
                const familyCodeEl = document.getElementById('family-code-text');

                if (familyNameEl && familyInfo.familyName) {
                    familyNameEl.textContent = familyInfo.familyName;
                }

                if (familyCodeEl && familyInfo.familyCode) {
                    familyCodeEl.textContent = familyInfo.familyCode;
                    this.generateQRCode(familyInfo.familyCode);
                }

                // Load family members
                await this.loadFamilyMembersForSettings();

                // Show admin actions if user is admin
                const currentUser = this.getCurrentUser();
                if (familyInfo.isCurrentUserAdmin || familyInfo.adminUserId === currentUser?.id) {
                    const adminActions = document.getElementById('admin-actions');
                    if (adminActions) {
                        adminActions.style.display = 'block';
                    }
                }

            } else {
                throw new Error(response?.message || 'Failed to load family information');
            }

        } catch (error) {
            console.error('Failed to load family info:', error);
            this.showError('Failed to load family information');
        }
    }

    async loadFamilyMembersForSettings() {
        try {
            const membersListEl = document.getElementById('family-members-list');
            const membersCountEl = document.getElementById('members-count-badge');

            if (!membersListEl) return;

            // Show loading state
            membersListEl.innerHTML = `
                <div class="loading-members">
                    <div class="loader-spinner"></div>
                    <span>Loading family members...</span>
                </div>
            `;

            const response = await window.apiClient.get('/auth/family-members');
            const members = response.members || [];

            // Update member count
            if (membersCountEl) {
                membersCountEl.textContent = members.length.toString();
            }

            const familyMemberCountEl = document.getElementById('family-member-count');
            if (familyMemberCountEl) {
                familyMemberCountEl.textContent = `${members.length} member${members.length !== 1 ? 's' : ''}`;
            }

            // Generate member list HTML
            if (members.length === 0) {
                membersListEl.innerHTML = `
                    <div class="no-members">
                        <span>No family members found</span>
                    </div>
                `;
                return;
            }

            const membersHTML = members.map(member => {
                const initials = member.displayName ?
                    member.displayName.split(' ').map(n => n[0]).join('').toUpperCase() :
                    member.email[0].toUpperCase();

                const isAdmin = member.isAdmin || false;

                return `
                    <div class="family-member-item">
                        <div class="member-avatar">${initials}</div>
                        <div class="member-info">
                            <div class="member-name">${member.displayName || member.email}</div>
                            <div class="member-email">${member.email}</div>
                        </div>
                        <div class="member-role ${isAdmin ? 'admin' : ''}">
                            ${isAdmin ? '👑 Admin' : '👤 Member'}
                        </div>
                    </div>
                `;
            }).join('');

            membersListEl.innerHTML = membersHTML;

        } catch (error) {
            console.error('Failed to load family members:', error);
            const membersListEl = document.getElementById('family-members-list');
            if (membersListEl) {
                membersListEl.innerHTML = `
                    <div class="error-members">
                        <span>Failed to load family members</span>
                    </div>
                `;
            }
        }
    }

    generateQRCode(familyCode) {
        const qrContainer = document.getElementById('family-qr-code');
        if (!qrContainer) return;

        // Clear previous content
        qrContainer.innerHTML = '';

        try {
            // Create QR code content - invitation URL with family code
            const inviteUrl = `${window.location.origin}/register.html?familyCode=${familyCode}`;

            // Generate QR code using a simple canvas-based approach
            const canvas = document.createElement('canvas');
            const size = 100;
            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext('2d');

            // For now, create a simple pattern representing the QR code
            // In a real implementation, you'd use a proper QR code library
            this.drawSimpleQRPattern(ctx, familyCode, size);

            // Add to container
            const qrWrapper = document.createElement('div');
            qrWrapper.className = 'qr-code-container';
            qrWrapper.appendChild(canvas);

            const label = document.createElement('div');
            label.className = 'qr-code-label';
            label.textContent = 'Scan to Join';
            qrWrapper.appendChild(label);

            qrContainer.appendChild(qrWrapper);

        } catch (error) {
            console.error('Error generating QR code:', error);
            qrContainer.innerHTML = `
                <div class="qr-code-container">
                    <div style="font-size: 0.75rem; color: var(--text-secondary); text-align: center;">
                        QR Code<br>Error
                    </div>
                </div>
            `;
        }
    }

    drawSimpleQRPattern(ctx, familyCode, size) {
        // Fill background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        // Create a simple grid pattern based on the family code
        ctx.fillStyle = '#000000';
        const gridSize = 10;
        const cellSize = size / gridSize;

        // Use family code to create a pseudo-random pattern
        let hash = 0;
        for (let i = 0; i < familyCode.length; i++) {
            hash = ((hash << 5) - hash + familyCode.charCodeAt(i)) & 0xffffffff;
        }

        // Draw corner markers (typical QR code markers)
        this.drawCornerMarker(ctx, 0, 0, cellSize);
        this.drawCornerMarker(ctx, size - 3 * cellSize, 0, cellSize);
        this.drawCornerMarker(ctx, 0, size - 3 * cellSize, cellSize);

        // Draw pattern based on hash
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                // Skip corner marker areas
                if ((x < 3 && y < 3) || (x > gridSize - 4 && y < 3) || (x < 3 && y > gridSize - 4)) {
                    continue;
                }

                // Create pseudo-random pattern
                const shouldFill = (hash + x * 7 + y * 11) % 3 === 0;

                if (shouldFill) {
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }

        // Add border
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, size, size);
    }

    drawCornerMarker(ctx, x, y, cellSize) {
        // Draw 3x3 corner marker
        ctx.fillStyle = '#000000';

        // Outer square
        ctx.fillRect(x, y, cellSize * 3, cellSize * 3);

        // Inner white square
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + cellSize * 0.5, y + cellSize * 0.5, cellSize * 2, cellSize * 2);

        // Inner black square
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + cellSize * 1, y + cellSize * 1, cellSize, cellSize);
    }

    async copyFamilyCode() {
        const familyCodeEl = document.getElementById('family-code-text');
        const copyBtn = document.getElementById('copy-family-code');

        if (!familyCodeEl || !copyBtn) return;

        const familyCode = familyCodeEl.textContent;

        try {
            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(familyCode);
            } else {
                // Fallback for older browsers or non-HTTPS contexts
                this.fallbackCopyToClipboard(familyCode);
            }

            // Show success feedback
            copyBtn.classList.add('copy-success');
            setTimeout(() => {
                copyBtn.classList.remove('copy-success');
            }, 1000);

            this.showSuccess('Family code copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy family code:', error);

            // Try fallback method
            try {
                this.fallbackCopyToClipboard(familyCode);

                // Show success feedback
                copyBtn.classList.add('copy-success');
                setTimeout(() => {
                    copyBtn.classList.remove('copy-success');
                }, 1000);

                this.showSuccess('Family code copied to clipboard!');
            } catch (fallbackError) {
                console.error('Fallback copy also failed:', fallbackError);
                this.showError(`Family code: ${familyCode} (copy failed - please copy manually)`);
            }
        }
    }

    fallbackCopyToClipboard(text) {
        // Create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);

        // Select and copy the text
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (!successful) {
            throw new Error('Fallback copy method failed');
        }
    }

    shareViaEmail() {
        const familyCode = document.getElementById('family-code-text')?.textContent;
        if (!familyCode) return;

        const subject = encodeURIComponent('Join our family organizer');
        const body = encodeURIComponent(
            `Hi!\n\nYou've been invited to join our family organizer. Use the family code below to join:\n\n${familyCode}\n\nVisit: ${window.location.origin}\n\nBest regards!`
        );

        window.open(`mailto:?subject=${subject}&body=${body}`);
    }

    shareViaSms() {
        const familyCode = document.getElementById('family-code-text')?.textContent;
        if (!familyCode) return;

        const message = encodeURIComponent(
            `Join our family organizer! Use code: ${familyCode} at ${window.location.origin}`
        );

        window.open(`sms:?body=${message}`);
    }

    shareViaWhatsapp() {
        const familyCode = document.getElementById('family-code-text')?.textContent;
        if (!familyCode) return;

        const message = encodeURIComponent(
            `Join our family organizer! Use family code: ${familyCode} at ${window.location.origin}`
        );

        window.open(`https://wa.me/?text=${message}`);
    }

    shareCopyLink() {
        const familyCode = document.getElementById('family-code-text')?.textContent;
        if (!familyCode) return;

        const link = `${window.location.origin}/register.html?familyCode=${familyCode}`;

        try {
            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(link).then(() => {
                    this.showSuccess('Invitation link copied to clipboard!');
                }).catch((error) => {
                    console.error('Failed to copy link:', error);
                    this.tryFallbackCopyLink(link);
                });
            } else {
                // Use fallback method
                this.tryFallbackCopyLink(link);
            }
        } catch (error) {
            console.error('Failed to copy link:', error);
            this.tryFallbackCopyLink(link);
        }
    }

    tryFallbackCopyLink(link) {
        try {
            this.fallbackCopyToClipboard(link);
            this.showSuccess('Invitation link copied to clipboard!');
        } catch (fallbackError) {
            console.error('Fallback copy also failed:', fallbackError);
            this.showError(`Invitation link: ${link} (copy failed - please copy manually)`);
        }
    }

    async regenerateFamilyCode() {
        if (!confirm('Are you sure you want to regenerate the family code? The old code will no longer work.')) {
            return;
        }

        try {
            const response = await window.apiClient.post('/families/regenerate-code', {});

            if (response && response.success && response.data.familyCode) {
                const familyCodeEl = document.getElementById('family-code-text');
                if (familyCodeEl) {
                    familyCodeEl.textContent = response.data.familyCode;
                    this.generateQRCode(response.data.familyCode);
                }
                this.showSuccess('Family code regenerated successfully!');
            } else {
                throw new Error(response?.message || 'Failed to regenerate family code');
            }
        } catch (error) {
            console.error('Failed to regenerate family code:', error);
            this.showError('Failed to regenerate family code');
        }
    }

    managePermissions() {
        this.showInfo('Permission management coming soon!');
    }

    // Onboarding Methods
    setupOnboardingListeners() {
        // Option selection
        const createFamilyOption = document.getElementById('onboarding-create-family');
        const joinFamilyOption = document.getElementById('onboarding-join-family');

        if (createFamilyOption) {
            createFamilyOption.addEventListener('click', () => this.selectOnboardingOption('create'));
        }

        if (joinFamilyOption) {
            joinFamilyOption.addEventListener('click', () => this.selectOnboardingOption('join'));
        }

        // Action buttons
        const skipBtn = document.getElementById('onboarding-skip-btn');
        const createBtn = document.getElementById('onboarding-create-btn');
        const joinBtn = document.getElementById('onboarding-join-btn');
        const verifyCodeBtn = document.getElementById('verify-family-code-btn');

        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.skipOnboarding());
        }

        if (createBtn) {
            createBtn.addEventListener('click', () => this.createFamilyFromOnboarding());
        }

        if (joinBtn) {
            joinBtn.addEventListener('click', () => this.joinFamilyFromOnboarding());
        }

        if (verifyCodeBtn) {
            verifyCodeBtn.addEventListener('click', () => this.verifyFamilyCode());
        }

        // Family code input
        const familyCodeInput = document.getElementById('onboarding-family-code');
        if (familyCodeInput) {
            familyCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });

            familyCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.verifyFamilyCode();
                }
            });
        }
    }

    showOnboarding() {
        const modal = document.getElementById('welcome-onboarding-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    hideOnboarding() {
        const modal = document.getElementById('welcome-onboarding-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    selectOnboardingOption(option) {
        // Clear previous selections
        document.querySelectorAll('.onboarding-option').forEach(el => {
            el.classList.remove('selected');
        });

        // Hide all input sections
        const familyCodeSection = document.querySelector('.family-code-input-section');
        const primaryActions = document.querySelector('.primary-actions');
        const createBtn = document.getElementById('onboarding-create-btn');
        const joinBtn = document.getElementById('onboarding-join-btn');

        if (option === 'create') {
            document.getElementById('onboarding-create-family').classList.add('selected');

            if (familyCodeSection) familyCodeSection.style.display = 'none';
            if (primaryActions) primaryActions.style.display = 'flex';
            if (createBtn) createBtn.style.display = 'block';
            if (joinBtn) joinBtn.style.display = 'none';

        } else if (option === 'join') {
            document.getElementById('onboarding-join-family').classList.add('selected');

            if (familyCodeSection) familyCodeSection.style.display = 'block';
            if (primaryActions) primaryActions.style.display = 'flex';
            if (createBtn) createBtn.style.display = 'none';
            if (joinBtn) joinBtn.style.display = 'none'; // Will show after code verification
        }
    }

    async verifyFamilyCode() {
        const familyCodeInput = document.getElementById('onboarding-family-code');
        const familyPreview = document.getElementById('family-preview');
        const joinBtn = document.getElementById('onboarding-join-btn');

        if (!familyCodeInput || !familyPreview) return;

        const familyCode = familyCodeInput.value.trim().toUpperCase();
        if (!familyCode || familyCode.length !== 6) {
            this.showError('Please enter a valid 6-character family code');
            return;
        }

        try {
            familyPreview.style.display = 'block';
            document.getElementById('preview-family-name').textContent = 'Verifying...';
            document.getElementById('preview-family-info').textContent = 'Checking family code...';
            document.getElementById('preview-members').innerHTML = '';

            const response = await window.apiClient.get(`/families/code/${familyCode}`);

            if (response && response.success) {
                const { family, members } = response.data;

                // Update preview
                document.getElementById('preview-family-name').textContent = family.familyName;
                document.getElementById('preview-family-info').textContent =
                    `${members.length} member${members.length !== 1 ? 's' : ''} • Created ${new Date(family.createdAt).toLocaleDateString()}`;

                // Show members
                const membersContainer = document.getElementById('preview-members');
                if (members && members.length > 0) {
                    const membersHTML = members.slice(0, 5).map(member => {
                        const initials = member.name ?
                            member.name.split(' ').map(n => n[0]).join('').toUpperCase() :
                            'U';

                        return `
                            <div class="family-preview-member">
                                <div class="family-preview-avatar">${initials}</div>
                                <div class="family-preview-name">${member.name || 'Member'}</div>
                            </div>
                        `;
                    }).join('');

                    if (members.length > 5) {
                        membersHTML += `
                            <div class="family-preview-member">
                                <div class="family-preview-avatar">+${members.length - 5}</div>
                                <div class="family-preview-name">more</div>
                            </div>
                        `;
                    }

                    membersContainer.innerHTML = membersHTML;
                }

                // Show join button
                if (joinBtn) {
                    joinBtn.style.display = 'block';
                    joinBtn.dataset.familyCode = familyCode;
                }

                this.showSuccess(`Found family "${family.familyName}"!`);

            } else {
                throw new Error(response?.message || 'Family not found');
            }

        } catch (error) {
            console.error('Error verifying family code:', error);

            // Hide preview and join button
            familyPreview.style.display = 'none';
            if (joinBtn) {
                joinBtn.style.display = 'none';
            }

            if (error.message && error.message.includes('not found')) {
                this.showError('Family code not found. Please check the code and try again.');
            } else {
                this.showError('Failed to verify family code. Please try again.');
            }
        }
    }

    async createFamilyFromOnboarding() {
        try {
            // Get current user info
            const currentUser = this.getCurrentUser();
            if (!currentUser) {
                this.showError('Unable to get user information');
                return;
            }

            // Create family with user's name
            const familyName = `${currentUser.displayName || currentUser.email.split('@')[0]}'s Family`;

            const response = await window.apiClient.post('/families', {
                familyName: familyName
            });

            if (response && response.success) {
                this.showSuccess(`Family "${familyName}" created successfully!`);

                // Close onboarding and refresh the app
                this.hideOnboarding();
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } else {
                throw new Error(response?.message || 'Failed to create family');
            }

        } catch (error) {
            console.error('Error creating family:', error);
            this.showError('Failed to create family. Please try again.');
        }
    }

    async joinFamilyFromOnboarding() {
        const joinBtn = document.getElementById('onboarding-join-btn');
        const familyCode = joinBtn?.dataset.familyCode;

        if (!familyCode) {
            this.showError('No family code selected');
            return;
        }

        try {
            this.showSuccess(`Joining family with code ${familyCode}...`);

            // Call the join family API
            const response = await window.apiClient.post('/families/join', {
                familyCode: familyCode
            });

            if (response && response.success) {
                this.showSuccess(`Successfully joined family "${response.data.family.familyName}"!`);

                // Close onboarding and refresh the app
                this.hideOnboarding();
                setTimeout(() => {
                    window.location.reload();
                }, 2000);

            } else {
                throw new Error(response?.message || 'Failed to join family');
            }

        } catch (error) {
            console.error('Error joining family:', error);

            if (error.message && error.message.includes('already a member')) {
                this.showError('You are already a member of a family. Please contact your admin to switch families.');
            } else if (error.message && error.message.includes('not found')) {
                this.showError('Family code not found. Please verify the code is correct.');
            } else if (error.message && error.message.includes('not accepting')) {
                this.showError('This family is not currently accepting new members.');
            } else {
                this.showError('Failed to join family. Please try again.');
            }
        }
    }

    skipOnboarding() {
        this.hideOnboarding();
        this.showInfo('You can set up your family later from Family Settings');
    }

    toggleDarkMode() {
        const currentlyDark = document.body.classList.contains('dark-mode');

        if (currentlyDark) {
            document.body.classList.remove('dark-mode');
        } else {
            document.body.classList.add('dark-mode');
        }

        localStorage.setItem('darkMode', !currentlyDark);
    }

    changeView(view) {
        this.currentView = view;

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelector(`.${view}-view`).classList.add('active');

        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        if (view === 'calendar') {
            this.renderCalendar();
        }
    }

    selectMember(member) {
        this.selectedMember = member;

        document.querySelectorAll('.family-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-member="${member}"]`).classList.add('active');

        this.renderTodos();
        if (this.currentView === 'calendar') {
            this.renderCalendar();
        }
    }

    // Helper function to capitalize names properly
    capitalizeName(name) {
        if (!name) return '';
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }

    // Helper function to format dates properly for display
    formatDateForDisplay(dateString) {
        if (!dateString) return 'No date';

        // Handle date strings like "2025-09-26" or "2025-09-26T10:00"
        const dateParts = dateString.split('T')[0].split('-');
        if (dateParts.length !== 3) return dateString;

        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
        const day = parseInt(dateParts[2]);

        // Create date in local timezone to avoid UTC conversion issues
        const date = new Date(year, month, day);
        return date.toLocaleDateString();
    }

    // Helper function to format date input values properly
    formatDateForInput(dateString) {
        if (!dateString) return '';

        // Handle date strings like "2025-09-26" or "2025-09-26T10:00"
        const dateParts = dateString.split('T')[0].split('-');
        if (dateParts.length !== 3) return dateString;

        return dateParts.join('-'); // Return YYYY-MM-DD format for input
    }

    async addTodo() {
        const itemType = document.getElementById('item-type').value;
        const text = document.getElementById('todo-text').value.trim();
        const member = document.getElementById('todo-member').value;

        if (!text) {
            throw new Error('Please enter a task description');
        }

        try {
            // Remove old setLoading - now handled by ButtonLoading

            let todoData = {
                title: text,
                assignedTo: member,
                category: itemType === 'task' ? 'general' : 'meeting',
                priority: 'medium'
            };

            if (itemType === 'task') {
                todoData.status = 'pending';
                const dueDate = document.getElementById('todo-date').value;
                const dueTime = document.getElementById('todo-time').value;
                if (dueDate) {
                    todoData.dueDate = dueTime ? `${dueDate}T${dueTime}` : dueDate;
                }
            } else {
                todoData.status = 'pending';
                const meetingDate = document.getElementById('meeting-date').value;
                const startTime = document.getElementById('meeting-start-time').value;
                const endTime = document.getElementById('meeting-end-time').value;
                const description = document.getElementById('meeting-description').value;
                const link = document.getElementById('meeting-link').value;

                if (meetingDate && startTime) {
                    todoData.dueDate = `${meetingDate}T${startTime}`;
                }

                let descriptionParts = [];
                if (description) descriptionParts.push(description);
                if (startTime && endTime) descriptionParts.push(`Time: ${startTime} - ${endTime}`);
                if (link) descriptionParts.push(`Link: ${link}`);

                todoData.description = descriptionParts.join('\n');
            }

            console.log('API TESTING: Creating todo via API...', todoData);

            const response = await window.apiClient.createTodo(todoData);

            if (response && response.success) {
                console.log('API TESTING: Todo created successfully', response.data);
                await this.loadTodos(); // Reload todos from server
                this.renderTodos();
                this.clearForm();
            } else {
                console.error('API TESTING: Failed to create todo:', response);
                this.showError(response?.message || 'Failed to create todo');
            }
        } catch (error) {
            console.error('Error creating todo:', error);
            this.showError('Failed to create todo');
            throw error; // Re-throw for ButtonLoading to handle
        }
        // Remove finally block - ButtonLoading handles loading state
    }

    clearForm() {
        document.getElementById('todo-text').value = '';
        document.getElementById('todo-date').value = '';
        document.getElementById('todo-time').value = '';
        document.getElementById('meeting-date').value = '';
        document.getElementById('meeting-start-time').value = '';
        document.getElementById('meeting-end-time').value = '';
        document.getElementById('meeting-description').value = '';
        document.getElementById('meeting-link').value = '';
    }

    toggleItemType() {
        const itemType = document.getElementById('item-type').value;
        const taskFields = document.querySelectorAll('.task-fields');
        const meetingFields = document.querySelectorAll('.meeting-fields');
        const placeholder = document.getElementById('todo-text');
        const btnText = document.getElementById('add-btn-text');

        if (itemType === 'task') {
            taskFields.forEach(field => field.style.display = 'flex');
            meetingFields.forEach(field => field.style.display = 'none');
            placeholder.placeholder = 'Add a new task...';
            btnText.textContent = 'Task';
        } else {
            taskFields.forEach(field => field.style.display = 'none');
            meetingFields.forEach(field => field.style.display = 'flex');
            placeholder.placeholder = 'Add a new meeting...';
            btnText.textContent = 'Meeting';
        }
    }

    toggleEditItemType() {
        const itemType = document.getElementById('edit-item-type').value;
        const taskFields = document.querySelectorAll('.edit-task-fields');
        const meetingFields = document.querySelectorAll('.edit-meeting-fields');
        const textLabel = document.getElementById('edit-text-label');
        const modalTitle = document.getElementById('edit-modal-title');
        const deleteText = document.getElementById('delete-btn-text');
        const statusGroup = document.getElementById('edit-todo-status').closest('.form-group');

        if (itemType === 'task') {
            taskFields.forEach(field => field.style.display = 'block');
            meetingFields.forEach(field => field.style.display = 'none');
            statusGroup.style.display = 'block';
            textLabel.textContent = 'Task Description';
            modalTitle.textContent = 'Edit Task';
            deleteText.textContent = 'Task';
        } else {
            taskFields.forEach(field => field.style.display = 'none');
            meetingFields.forEach(field => field.style.display = 'block');
            statusGroup.style.display = 'none';
            textLabel.textContent = 'Meeting Title';
            modalTitle.textContent = 'Edit Meeting';
            deleteText.textContent = 'Meeting';
        }
    }

    async deleteTodo(id) {
        try {
            console.log('API TESTING: Deleting todo via API...', id);

            const response = await window.apiClient.deleteTodo(id);

            if (response && response.success) {
                console.log('API TESTING: Todo deleted successfully');
                await this.loadTodos(); // Reload todos from server
                this.renderTodos();
                return response; // Return success for ButtonLoading
            } else {
                console.error('API TESTING: Failed to delete todo:', response);
                const errorMsg = response?.message || 'Failed to delete todo';
                this.showError(errorMsg);
                throw new Error(errorMsg);
            }

        } catch (error) {
            console.error('API TESTING: Error deleting todo:', error);
            console.error('API TESTING: Error details:', error.message, error.stack);
            this.showError('Failed to delete todo: ' + error.message);
            throw error; // Re-throw for ButtonLoading to handle
        }
        // Remove finally block - ButtonLoading handles loading state
    }

    async updateTodoStatus(id, status) {
        try {
            console.log('API TESTING: Updating todo status via API...', id, status);

            const response = await window.apiClient.updateTodoStatus(id, status);

            if (response && response.success) {
                console.log('API TESTING: Todo status updated successfully');
                await this.loadTodos(); // Reload todos from server
                this.renderTodos();
                return response; // Return success for ButtonLoading
            } else {
                console.error('API TESTING: Failed to update todo status:', response);
                const errorMsg = response?.message || 'Failed to update todo status';
                this.showError(errorMsg);
                throw new Error(errorMsg);
            }

        } catch (error) {
            console.error('API TESTING: Error updating todo status:', error);
            console.error('API TESTING: Error details:', error.message, error.stack);
            this.showError('Failed to update todo status: ' + error.message);
            throw error; // Re-throw for ButtonLoading to handle
        }
        // Remove finally block - ButtonLoading handles loading state
    }

    updateTodoMember(id, member) {
        const todo = this.todos.find(t => t.id == id);
        if (todo) {
            todo.member = member;
            this.saveTodos();
            this.renderTodos();
            if (this.currentView === 'calendar') {
                this.renderCalendar();
            }
        }
    }

    getFilteredTodos() {
        return this.todos.filter(todo =>
            this.selectedMember === 'all' || todo.member === this.selectedMember
        );
    }

    renderTodos() {
        const filteredTodos = this.getFilteredTodos();

        const pendingContainer = document.getElementById('pending-todos');
        const progressContainer = document.getElementById('progress-todos');
        const completedContainer = document.getElementById('completed-todos');

        pendingContainer.innerHTML = '';
        progressContainer.innerHTML = '';
        completedContainer.innerHTML = '';

        filteredTodos.forEach(todo => {
            const todoElement = this.createTodoElement(todo);

            if (todo.type === 'meeting') {
                // Meetings go in the first column regardless of status
                pendingContainer.appendChild(todoElement);
            } else {
                // Tasks follow the workflow
                switch (todo.status) {
                    case 'pending':
                        pendingContainer.appendChild(todoElement);
                        break;
                    case 'in-progress':
                        progressContainer.appendChild(todoElement);
                        break;
                    case 'completed':
                        completedContainer.appendChild(todoElement);
                        break;
                }
            }
        });
    }

    createTodoElement(todo) {
        const div = document.createElement('div');
        div.className = `todo-item ${todo.status} ${todo.type || 'task'}`;

        const isOverdue = this.isOverdue(todo);
        if (isOverdue && todo.status !== 'completed') {
            div.classList.add('overdue');
        }

        let timeInfo = '';
        let typeIcon = '';

        if (todo.type === 'meeting') {
            typeIcon = `<span class="item-type-icon meeting-icon" title="Meeting">📅</span>`;
            if (todo.dueDate) {
                const dateStr = this.formatDateForDisplay(todo.dueDate);
                const timeRange = todo.startTime && todo.endTime ?
                    `${todo.startTime} - ${todo.endTime}` :
                    (todo.startTime || 'No time set');
                timeInfo = `${dateStr} ${timeRange}`;
            } else {
                timeInfo = 'No date set';
            }
        } else {
            typeIcon = `<span class="item-type-icon task-icon" title="Task">✓</span>`;
            const dueDateStr = todo.dueDate ? this.formatDateForDisplay(todo.dueDate) : 'No due date';
            const dueTimeStr = todo.dueTime || '';
            timeInfo = `${dueDateStr} ${dueTimeStr}`;
        }

        div.innerHTML = `
            <div class="todo-header">
                <div class="todo-title-area">
                    ${typeIcon}
                    <div class="todo-text">${todo.text}</div>
                </div>
                <button class="edit-btn" title="Edit ${todo.type || 'task'}" data-todo-id="${todo.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                </button>
            </div>
            ${todo.type === 'meeting' && todo.description ? `<div class="meeting-description">${todo.description}</div>` : ''}
            <div class="todo-meta">
                <span class="todo-member">${this.capitalizeName(todo.member)}</span>
                <span class="time-info">${timeInfo}</span>
            </div>
            ${todo.type === 'meeting' && todo.link ? `<div class="meeting-link"><a href="${todo.link}" target="_blank" rel="noopener">Join Meeting</a></div>` : ''}
            <div class="todo-actions">
                ${todo.type === 'meeting' ? this.getMeetingActions(todo) : this.getTaskActions(todo)}
                <button class="todo-action-btn delete-btn" data-todo-id="${todo.id}">Delete</button>
            </div>
        `;

        // Add event listeners
        const editBtn = div.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.openEditModal(todo.id);
            });
        }

        const deleteBtn = div.querySelector('.delete-btn');
        if (deleteBtn) {
            ButtonLoading.enhanceDelete(deleteBtn, async () => {
                return await this.deleteTodo(todo.id);
            }, {
                confirmMessage: 'Are you sure you want to delete this item?',
                loadingText: 'Deleting...',
                successText: 'Deleted!',
                errorText: 'Delete Failed',
                successDuration: 1000
            });
        }

        // Enhanced action buttons with loading states
        const actionBtns = div.querySelectorAll('.todo-action-btn[data-new-status]');
        actionBtns.forEach(btn => {
            const todoId = btn.getAttribute('data-todo-id');
            const newStatus = btn.getAttribute('data-new-status');
            const buttonText = btn.textContent.trim();

            ButtonLoading.enhance(btn, async () => {
                return await this.updateTodoStatus(todoId, newStatus);
            }, {
                loadingText: buttonText === 'Start' ? 'Starting...' :
                           buttonText === 'Complete' ? 'Completing...' :
                           buttonText === 'Reopen' ? 'Reopening...' : 'Updating...',
                successText: buttonText === 'Start' ? 'Started!' :
                           buttonText === 'Complete' ? 'Completed!' :
                           buttonText === 'Reopen' ? 'Reopened!' : 'Updated!',
                errorText: 'Failed',
                successDuration: 1200
            });
        });

        return div;
    }

    getMeetingActions(meeting) {
        if (meeting.status === 'cancelled') {
            return `<button class="todo-action-btn move-btn" data-todo-id="${meeting.id}" data-new-status="active">Reactivate</button>`;
        } else {
            return `<button class="todo-action-btn cancel-btn" data-todo-id="${meeting.id}" data-new-status="cancelled">Cancel</button>`;
        }
    }

    getTaskActions(task) {
        let actions = '';
        if (task.status === 'pending') {
            actions += `<button class="todo-action-btn move-btn" data-todo-id="${task.id}" data-new-status="in-progress">Start</button>`;
        } else if (task.status === 'in-progress') {
            actions += `<button class="todo-action-btn complete-btn" data-todo-id="${task.id}" data-new-status="completed">Complete</button>`;
        } else if (task.status === 'completed') {
            actions += `<button class="todo-action-btn move-btn" data-todo-id="${task.id}" data-new-status="pending">Reopen</button>`;
        }
        return actions;
    }

    isOverdue(todo) {
        if (!todo.dueDate) return false;

        const now = new Date();
        const dueDate = new Date(todo.dueDate);

        if (todo.dueTime) {
            const [hours, minutes] = todo.dueTime.split(':');
            dueDate.setHours(parseInt(hours), parseInt(minutes));
        }

        return now > dueDate;
    }

    changePeriod(direction) {
        if (this.calendarView === 'monthly') {
            this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        } else if (this.calendarView === 'weekly') {
            this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
        } else if (this.calendarView === 'daily') {
            this.currentDate.setDate(this.currentDate.getDate() + direction);
        }
        this.renderCalendar();
    }

    changeCalendarView(view) {
        this.calendarView = view;

        // Update button active states
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        // Update calendar container class
        const container = document.querySelector('.calendar-container');
        container.className = `calendar-container calendar-${view}-view`;

        this.renderCalendar();
    }

    renderCalendar() {
        if (this.calendarView === 'monthly') {
            this.renderMonthlyView();
        } else if (this.calendarView === 'weekly') {
            this.renderWeeklyView();
        } else if (this.calendarView === 'daily') {
            this.renderDailyView();
        }
    }

    renderMonthlyView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        document.getElementById('calendar-title').textContent =
            new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const calendarDays = document.getElementById('calendar-days');
        calendarDays.innerHTML = '';

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 42; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);

            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';

            if (currentDate.getMonth() !== month) {
                dayElement.classList.add('other-month');
            }

            if (currentDate.getTime() === today.getTime()) {
                dayElement.classList.add('today');
            }

            const dayTodos = this.getTodosForDate(currentDate);
            const filteredDayTodos = dayTodos.filter(todo =>
                this.selectedMember === 'all' || todo.member === this.selectedMember
            );

            dayElement.innerHTML = `
                <div class="calendar-day-number">${currentDate.getDate()}</div>
                <div class="calendar-tasks">
                    ${filteredDayTodos.map(todo => `
                        <div class="calendar-task calendar-task-${todo.member} ${todo.status === 'completed' ? 'completed' : ''}"
                             title="${this.escapeHtml(todo.text)} - ${this.capitalizeName(todo.member)} (${todo.status})">
                            <div class="task-text">${todo.text.substring(0, 12)}${todo.text.length > 12 ? '...' : ''}</div>
                            <div class="task-member">${this.capitalizeName(todo.member)}</div>
                        </div>
                    `).join('')}
                </div>
            `;

            calendarDays.appendChild(dayElement);
        }
    }

    renderWeeklyView() {
        const startOfWeek = new Date(this.currentDate);
        startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        document.getElementById('calendar-title').textContent =
            `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

        const calendarDays = document.getElementById('calendar-days');
        calendarDays.innerHTML = '';

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startOfWeek);
            currentDate.setDate(startOfWeek.getDate() + i);

            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';

            if (currentDate.getTime() === today.getTime()) {
                dayElement.classList.add('today');
            }

            const dayTodos = this.getTodosForDate(currentDate);
            const filteredDayTodos = dayTodos.filter(todo =>
                this.selectedMember === 'all' || todo.member === this.selectedMember
            );

            dayElement.innerHTML = `
                <div class="calendar-day-number">
                    ${currentDate.toLocaleDateString('en-US', { weekday: 'short' })} ${currentDate.getDate()}
                </div>
                <div class="calendar-tasks">
                    ${filteredDayTodos.map(todo => `
                        <div class="calendar-task calendar-task-${todo.member} ${todo.status === 'completed' ? 'completed' : ''}"
                             title="${this.escapeHtml(todo.text)} - ${this.capitalizeName(todo.member)} (${todo.status})">
                            <div class="task-text">${todo.text}</div>
                            <div class="task-member">${this.capitalizeName(todo.member)}</div>
                            ${todo.dueTime ? `<div class="task-time">${todo.dueTime}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;

            calendarDays.appendChild(dayElement);
        }
    }

    renderDailyView() {
        document.getElementById('calendar-title').textContent =
            this.currentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

        const calendarDays = document.getElementById('calendar-days');
        calendarDays.innerHTML = '';

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';

        if (this.currentDate.getTime() === today.getTime()) {
            dayElement.classList.add('today');
        }

        const dayTodos = this.getTodosForDate(this.currentDate);
        const filteredDayTodos = dayTodos.filter(todo =>
            this.selectedMember === 'all' || todo.member === this.selectedMember
        );

        // Sort todos by time
        filteredDayTodos.sort((a, b) => {
            const timeA = a.dueTime || a.startTime || '00:00';
            const timeB = b.dueTime || b.startTime || '00:00';
            return timeA.localeCompare(timeB);
        });

        dayElement.innerHTML = `
            <div class="calendar-day-number">${this.currentDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric' })}</div>
            <div class="calendar-tasks">
                ${filteredDayTodos.length === 0 ? '<div class="no-tasks">No tasks or meetings for this day</div>' : ''}
                ${filteredDayTodos.map(todo => `
                    <div class="calendar-task calendar-task-${todo.member} ${todo.status === 'completed' ? 'completed' : ''}"
                         title="${this.escapeHtml(todo.text)} - ${this.capitalizeName(todo.member)} (${todo.status})">
                        <div class="task-header">
                            <div class="task-text">${todo.text}</div>
                            <div class="task-time">${todo.dueTime || todo.startTime || 'No time'}</div>
                        </div>
                        <div class="task-details">
                            <span class="task-member">${this.capitalizeName(todo.member)}</span>
                            <span class="task-type">${todo.type === 'meeting' ? '📅 Meeting' : '✓ Task'}</span>
                        </div>
                        ${todo.description ? `<div class="task-description">${todo.description}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        `;

        calendarDays.appendChild(dayElement);
    }

    getTodosForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.todos.filter(todo => todo.dueDate === dateStr);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    checkReminders() {
        const now = new Date();

        this.todos.forEach(todo => {
            if (!todo.dueDate || !todo.dueTime || todo.reminderSent || todo.status === 'completed') {
                return;
            }

            const dueDateTime = new Date(`${todo.dueDate}T${todo.dueTime}`);
            const reminderTime = new Date(dueDateTime.getTime() - 30 * 60 * 1000); // 30 minutes before

            if (now >= reminderTime && now < dueDateTime) {
                this.showReminder(todo);
                todo.reminderSent = true;
                this.saveTodos();
            }
        });
    }

    showReminder(todo) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Reminder: ${todo.text}`, {
                body: `Due in 30 minutes - Assigned to ${this.capitalizeName(todo.member)}`,
                icon: '/favicon.ico'
            });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(`Reminder: ${todo.text}`, {
                        body: `Due in 30 minutes - Assigned to ${this.capitalizeName(todo.member)}`,
                        icon: '/favicon.ico'
                    });
                }
            });
        }

        alert(`Reminder: "${todo.text}" is due in 30 minutes! (Assigned to ${todo.member})`);
    }

    // Remove localStorage save method - now using API
    async saveTodos() {
        // This method is now handled by individual API calls
        // Keep for backward compatibility but don't save to localStorage
        console.log('saveTodos called - using API instead of localStorage');
    }

    openEditModal(todoId) {
        console.log('API TESTING: Opening edit modal for todo ID:', todoId);
        const todo = this.todos.find(t => t.id == todoId); // Use == for flexible comparison
        if (!todo) {
            console.error('API TESTING: Todo not found for ID:', todoId, 'Available todos:', this.todos);
            return;
        }
        console.log('API TESTING: Found todo for editing:', todo);

        this.editingTodoId = todoId;

        // Set basic fields
        document.getElementById('edit-item-type').value = todo.type || 'task';
        document.getElementById('edit-todo-text').value = todo.text;
        document.getElementById('edit-todo-member').value = todo.member;
        document.getElementById('edit-todo-status').value = todo.status;

        // Set type-specific fields
        if (todo.type === 'meeting') {
            document.getElementById('edit-meeting-date').value = this.formatDateForInput(todo.dueDate) || '';
            document.getElementById('edit-meeting-start-time').value = todo.startTime || '';
            document.getElementById('edit-meeting-end-time').value = todo.endTime || '';
            document.getElementById('edit-meeting-description').value = todo.description || '';
            document.getElementById('edit-meeting-link').value = todo.link || '';
        } else {
            document.getElementById('edit-todo-date').value = this.formatDateForInput(todo.dueDate) || '';
            document.getElementById('edit-todo-time').value = todo.dueTime || '';
        }

        // Toggle field visibility
        this.toggleEditItemType();

        document.getElementById('edit-modal').style.display = 'flex';
    }

    closeEditModal() {
        document.getElementById('edit-modal').style.display = 'none';
        this.editingTodoId = null;
    }

    async saveTaskEdit() {
        if (!this.editingTodoId) {
            throw new Error('No task selected for editing');
        }

        const todo = this.todos.find(t => t.id == this.editingTodoId);
        if (!todo) {
            throw new Error('Task not found');
        }

        const text = document.getElementById('edit-todo-text').value.trim();
        if (!text) {
            throw new Error('Description is required!');
        }

        const itemType = document.getElementById('edit-item-type').value;

        // Update basic fields
        todo.text = text;
        todo.member = document.getElementById('edit-todo-member').value;
        todo.status = document.getElementById('edit-todo-status').value;
        todo.type = itemType;
        todo.reminderSent = false; // Reset reminder if date/time changed

        // Clear old type-specific fields
        delete todo.dueTime;
        delete todo.startTime;
        delete todo.endTime;
        delete todo.description;
        delete todo.link;

        // Update type-specific fields
        if (itemType === 'meeting') {
            todo.dueDate = document.getElementById('edit-meeting-date').value;
            todo.startTime = document.getElementById('edit-meeting-start-time').value;
            todo.endTime = document.getElementById('edit-meeting-end-time').value;
            todo.description = document.getElementById('edit-meeting-description').value;
            todo.link = document.getElementById('edit-meeting-link').value;
        } else {
            todo.dueDate = document.getElementById('edit-todo-date').value;
            todo.dueTime = document.getElementById('edit-todo-time').value;
        }

        // Save locally for now (can be enhanced to use API later)
        this.saveTodos();
        this.renderTodos();
        if (this.currentView === 'calendar') {
            this.renderCalendar();
        }
        this.closeEditModal();

        // Return success for ButtonLoading
        return { success: true, todo: todo };
    }

    async deleteCurrentTask() {
        if (!this.editingTodoId) {
            throw new Error('No task selected for deletion');
        }

        // Confirmation is handled by ButtonLoading.enhanceDelete, so we can proceed directly
        const result = await this.deleteTodo(this.editingTodoId);
        this.closeEditModal();
        return result;
    }

    // Session Management
    checkSession() {
        const sessionData = localStorage.getItem('familySession');
        const sessionExpires = localStorage.getItem('familySessionExpires');

        if (sessionData && sessionExpires) {
            const expirationTime = parseInt(sessionExpires);

            if (Date.now() < expirationTime) {
                // Valid session exists, update UI
                this.updateUserInfo();
                return true;
            } else {
                // Session expired, clear storage
                this.clearSession();
            }
        }
        return false;
    }

    updateUserInfo() {
        const currentUser = localStorage.getItem('currentFamilyMember');
        const familyCode = localStorage.getItem('familyCode');

        if (currentUser) {
            document.getElementById('current-user').textContent = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);
        }

        if (familyCode) {
            document.getElementById('current-family').textContent = familyCode;
        }
    }

    logout() {
        console.log('🚪 Logout button clicked');
        // Clear authentication data
        if (window.apiClient) {
            window.apiClient.clearAuth();
        }
        // Redirect to logout confirmation page
        window.location.href = '/logout.html';
    }

    clearSession() {
        localStorage.removeItem('familySession');
        localStorage.removeItem('familySessionExpires');
        localStorage.removeItem('currentFamilyMember');
        localStorage.removeItem('currentUserEmail');
        localStorage.removeItem('familyCode');
    }

    createTempSession() {
        // Create temporary session for testing
        const sessionData = {
            email: 'happymanocha@gmail.com',
            memberName: 'happy',
            loginTime: new Date().toISOString(),
            expiresIn: 24 * 60 * 60 * 1000 // 24 hours
        };

        const expirationTime = Date.now() + sessionData.expiresIn;

        localStorage.setItem('familySession', JSON.stringify(sessionData));
        localStorage.setItem('familySessionExpires', expirationTime.toString());
        localStorage.setItem('currentFamilyMember', 'happy');
        localStorage.setItem('currentUserEmail', 'happymanocha@gmail.com');
        localStorage.setItem('familyCode', 'FAMILY');

        // Add sample todos for testing
        const sampleTodos = [
            {
                id: 1,
                text: 'Test Start Action',
                member: 'happy',
                status: 'pending',
                type: 'task',
                dueDate: '2025-09-25',
                dueTime: '18:00',
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                text: 'Test Edit Action',
                member: 'happy',
                status: 'in-progress',
                type: 'task',
                dueDate: '2025-09-26',
                dueTime: '14:00',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('familyTodos', JSON.stringify(sampleTodos));
        this.todos = sampleTodos;

        this.updateUserInfo();
    }
}

// Initialize app when DOM and all scripts are ready
function initializeApp() {
    // Don't initialize on login/logout pages
    const currentPath = window.location.pathname;
    if (currentPath.includes('login.html') || currentPath.includes('logout.html') || currentPath.includes('onboarding.html')) {
        console.log('🚫 Main script detected on auth page, skipping app initialization');
        return;
    }

    // Make sure apiClient is available
    if (!window.apiClient) {
        console.log('apiClient not ready, retrying in 100ms...');
        setTimeout(initializeApp, 100);
        return;
    }

    // Only create if it doesn't exist
    if (!window.app && !window.familyTodoApp) {
        console.log('Initializing FamilyTodoApp...');
        window.app = new FamilyTodoApp();
        window.familyTodoApp = window.app;
    }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already ready
    initializeApp();
}

// Global logout function as fallback
window.logout = function() {
    console.log('Global logout function called');
    window.location.href = '/logout.html';
};

if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}