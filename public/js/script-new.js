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

        // TESTING MODE - Set a hardcoded token for API testing
        console.log(`Page loaded: ${window.location.pathname}`);
        console.log('API TESTING MODE - Using hardcoded token');

        // Set a valid token for API testing (fresh token)
        window.apiClient.token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJoYXBweSIsImVtYWlsIjoiaGFwcHltYW5vY2hhQGdtYWlsLmNvbSIsIm5hbWUiOiJIYXBweSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1ODY1NjMzMywiZXhwIjoxNzU4NzQyNzMzfQ.4MA6PMhZI2nPDUTbeZ3jSPTlWzabZ0n0RnUnaydPukg';
        localStorage.setItem('authToken', window.apiClient.token);

        // Initialize the app
        this.init();

        // Add debug functions to window for manual testing
        window.debugDeleteTodo = (id) => this.deleteTodo(id);
        window.debugUpdateStatus = (id, status) => this.updateTodoStatusV2(id, status);
        window.debugOpenEdit = (id) => this.openEditModal(id);

        // Debug onclick generation
        console.log('FamilyTodoApp constructor - Version with event listeners (no onclick)');
        console.log('✅ NEW VERSION LOADED - Function renamed to updateTodoStatusV2');

        // Alert to force visibility
        if (typeof this.updateTodoStatus === 'function') {
            console.error('❌ OLD FUNCTION STILL EXISTS! Cache issue!');
        } else {
            console.log('✅ OLD FUNCTION REMOVED - Cache cleared');
        }
    }

    async checkAuthentication() {
        this.showDebugInfo('Checking authentication...');

        // First check if we have a token
        if (!window.apiClient.isAuthenticated()) {
            this.showDebugInfo('No token found, redirecting to login');
            // Add a small delay to prevent rapid redirects
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 500);
            return false;
        }

        this.showDebugInfo('Token found, validating with server...');

        try {
            const isValid = await window.apiClient.validateToken();
            this.showDebugInfo(`Token validation result: ${isValid}`);

            if (!isValid) {
                this.showDebugInfo('Token invalid, redirecting to login');
                // Add a small delay to prevent rapid redirects
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 500);
                return false;
            }

            this.showDebugInfo('Authentication successful');
            return true;
        } catch (error) {
            this.showDebugInfo(`Authentication check failed: ${error.message}`);
            this.showDebugInfo('Network error - allowing access but will handle API errors');
            return true;
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
        await this.loadTodos();
        this.renderTodos();
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

        document.getElementById('add-todo-btn').addEventListener('click', () => this.addTodo());
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

        // Styles button event listener
        const stylesBtn = document.getElementById('styles-button');
        if (stylesBtn) {
            stylesBtn.addEventListener('click', () => this.toggleStylesMenu());
        }

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
            modalDeleteBtn.addEventListener('click', () => this.deleteCurrentTask());
        }

        const modalSaveBtn = document.getElementById('modal-save-btn');
        if (modalSaveBtn) {
            modalSaveBtn.addEventListener('click', () => this.saveTaskEdit());
        }

        // Dark mode toggle event listener
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', () => this.toggleDarkMode());
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
            document.getElementById('dark-mode-toggle').checked = true;
        }
    }

    toggleStylesMenu() {
        const dropdown = document.getElementById('styles-dropdown');
        this.stylesMenuOpen = !this.stylesMenuOpen;

        if (this.stylesMenuOpen) {
            dropdown.classList.add('show');
        } else {
            dropdown.classList.remove('show');
        }
    }

    closeStylesMenu() {
        const dropdown = document.getElementById('styles-dropdown');
        dropdown.classList.remove('show');
        this.stylesMenuOpen = false;
    }

    toggleDarkMode() {
        const isDarkMode = document.getElementById('dark-mode-toggle').checked;

        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        localStorage.setItem('darkMode', isDarkMode);
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

    async addTodo() {
        const itemType = document.getElementById('item-type').value;
        const text = document.getElementById('todo-text').value.trim();
        const member = document.getElementById('todo-member').value;

        if (!text) return;

        try {
            this.setLoading(true);

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
        } finally {
            this.setLoading(false);
        }
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
            this.setLoading(true);

            console.log('API TESTING: Deleting todo via API...', id);

            const response = await window.apiClient.deleteTodo(id);

            if (response && response.success) {
                console.log('API TESTING: Todo deleted successfully');
                await this.loadTodos(); // Reload todos from server
                this.renderTodos();
            } else {
                console.error('API TESTING: Failed to delete todo:', response);
                this.showError(response?.message || 'Failed to delete todo');
            }

        } catch (error) {
            console.error('API TESTING: Error deleting todo:', error);
            console.error('API TESTING: Error details:', error.message, error.stack);
            this.showError('Failed to delete todo: ' + error.message);
        } finally {
            this.setLoading(false);
        }
    }

    async updateTodoStatusV2(id, status) {
        try {
            this.setLoading(true);

            console.log('API TESTING: Updating todo status via API...', id, status);

            const response = await window.apiClient.updateTodoStatus(id, status);

            if (response && response.success) {
                console.log('API TESTING: Todo status updated successfully');
                await this.loadTodos(); // Reload todos from server
                this.renderTodos();
            } else {
                console.error('API TESTING: Failed to update todo status:', response);
                this.showError(response?.message || 'Failed to update todo status');
            }

        } catch (error) {
            console.error('API TESTING: Error updating todo status:', error);
            console.error('API TESTING: Error details:', error.message, error.stack);
            this.showError('Failed to update todo status: ' + error.message);
        } finally {
            this.setLoading(false);
        }
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
                const dateStr = new Date(todo.dueDate).toLocaleDateString();
                const timeRange = todo.startTime && todo.endTime ?
                    `${todo.startTime} - ${todo.endTime}` :
                    (todo.startTime || 'No time set');
                timeInfo = `${dateStr} ${timeRange}`;
            } else {
                timeInfo = 'No date set';
            }
        } else {
            typeIcon = `<span class="item-type-icon task-icon" title="Task">✓</span>`;
            const dueDateStr = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : 'No due date';
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
                <span class="todo-member">${todo.member}</span>
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
            deleteBtn.addEventListener('click', () => {
                this.deleteTodo(todo.id);
            });
        }

        // Add event listeners for action buttons (status updates)
        const actionBtns = div.querySelectorAll('.todo-action-btn[data-new-status]');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const todoId = btn.getAttribute('data-todo-id');
                const newStatus = btn.getAttribute('data-new-status');
                this.updateTodoStatusV2(todoId, newStatus);
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
                             title="${this.escapeHtml(todo.text)} - ${this.escapeHtml(todo.member)} (${todo.status})">
                            <div class="task-text">${todo.text.substring(0, 12)}${todo.text.length > 12 ? '...' : ''}</div>
                            <div class="task-member">${todo.member}</div>
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
                             title="${this.escapeHtml(todo.text)} - ${this.escapeHtml(todo.member)} (${todo.status})">
                            <div class="task-text">${todo.text}</div>
                            <div class="task-member">${todo.member}</div>
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
                         title="${this.escapeHtml(todo.text)} - ${this.escapeHtml(todo.member)} (${todo.status})">
                        <div class="task-header">
                            <div class="task-text">${todo.text}</div>
                            <div class="task-time">${todo.dueTime || todo.startTime || 'No time'}</div>
                        </div>
                        <div class="task-details">
                            <span class="task-member">${todo.member}</span>
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
                body: `Due in 30 minutes - Assigned to ${todo.member}`,
                icon: '/favicon.ico'
            });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(`Reminder: ${todo.text}`, {
                        body: `Due in 30 minutes - Assigned to ${todo.member}`,
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
            document.getElementById('edit-meeting-date').value = todo.dueDate || '';
            document.getElementById('edit-meeting-start-time').value = todo.startTime || '';
            document.getElementById('edit-meeting-end-time').value = todo.endTime || '';
            document.getElementById('edit-meeting-description').value = todo.description || '';
            document.getElementById('edit-meeting-link').value = todo.link || '';
        } else {
            document.getElementById('edit-todo-date').value = todo.dueDate || '';
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

    saveTaskEdit() {
        if (!this.editingTodoId) return;

        const todo = this.todos.find(t => t.id == this.editingTodoId);
        if (!todo) return;

        const text = document.getElementById('edit-todo-text').value.trim();
        if (!text) {
            alert('Description is required!');
            return;
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

        this.saveTodos();
        this.renderTodos();
        if (this.currentView === 'calendar') {
            this.renderCalendar();
        }
        this.closeEditModal();
    }

    deleteCurrentTask() {
        if (!this.editingTodoId) return;

        if (confirm('Are you sure you want to delete this task?')) {
            this.deleteTodo(this.editingTodoId);
            this.closeEditModal();
        }
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
        console.log('Logout button clicked');
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

// Make app globally accessible for onclick handlers
// Only create if it doesn't exist
if (!window.app && !window.familyTodoApp) {
    window.app = new FamilyTodoApp();
    window.familyTodoApp = window.app;
}

// Global logout function as fallback
window.logout = function() {
    console.log('Global logout function called');
    window.location.href = '/logout.html';
};

if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}