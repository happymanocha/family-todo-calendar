class FamilyTodoApp {
    constructor() {
        this.todos = JSON.parse(localStorage.getItem('familyTodos')) || [];
        this.currentView = 'todo';
        this.selectedMember = 'all';
        this.currentDate = new Date();
        this.editingTodoId = null;
        this.stylesMenuOpen = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTheme();
        this.renderTodos();
        this.renderCalendar();
        this.checkReminders();

        setInterval(() => this.checkReminders(), 60000);
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

        document.getElementById('prev-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => this.changeMonth(1));

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

    addTodo() {
        const itemType = document.getElementById('item-type').value;
        const text = document.getElementById('todo-text').value.trim();
        const member = document.getElementById('todo-member').value;

        if (!text) return;

        let item = {
            id: Date.now(),
            text,
            member,
            type: itemType,
            createdAt: new Date().toISOString(),
            reminderSent: false
        };

        if (itemType === 'task') {
            item.status = 'pending';
            item.dueDate = document.getElementById('todo-date').value;
            item.dueTime = document.getElementById('todo-time').value;
        } else {
            item.status = 'active'; // Meetings are just active/cancelled
            item.dueDate = document.getElementById('meeting-date').value;
            item.startTime = document.getElementById('meeting-start-time').value;
            item.endTime = document.getElementById('meeting-end-time').value;
            item.description = document.getElementById('meeting-description').value;
            item.link = document.getElementById('meeting-link').value;
        }

        this.todos.push(item);
        this.saveTodos();
        this.renderTodos();

        this.clearForm();
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

    deleteTodo(id) {
        this.todos = this.todos.filter(todo => todo.id !== id);
        this.saveTodos();
        this.renderTodos();
    }

    updateTodoStatus(id, status) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.status = status;
            this.saveTodos();
            this.renderTodos();
        }
    }

    updateTodoMember(id, member) {
        const todo = this.todos.find(t => t.id === id);
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
                <button class="edit-btn" onclick="app.openEditModal(${todo.id})" title="Edit ${todo.type || 'task'}">
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
                <button class="todo-action-btn delete-btn" onclick="app.deleteTodo(${todo.id})">Delete</button>
            </div>
        `;

        return div;
    }

    getMeetingActions(meeting) {
        if (meeting.status === 'cancelled') {
            return `<button class="todo-action-btn move-btn" onclick="app.updateTodoStatus(${meeting.id}, 'active')">Reactivate</button>`;
        } else {
            return `<button class="todo-action-btn cancel-btn" onclick="app.updateTodoStatus(${meeting.id}, 'cancelled')">Cancel</button>`;
        }
    }

    getTaskActions(task) {
        let actions = '';
        if (task.status === 'pending') {
            actions += `<button class="todo-action-btn move-btn" onclick="app.updateTodoStatus(${task.id}, 'in-progress')">Start</button>`;
        } else if (task.status === 'in-progress') {
            actions += `<button class="todo-action-btn complete-btn" onclick="app.updateTodoStatus(${task.id}, 'completed')">Complete</button>`;
        } else if (task.status === 'completed') {
            actions += `<button class="todo-action-btn move-btn" onclick="app.updateTodoStatus(${task.id}, 'pending')">Reopen</button>`;
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

    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.renderCalendar();
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        document.getElementById('calendar-title').textContent =
            new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
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
                             title="${todo.text} - ${todo.member} (${todo.status})">
                            <div class="task-text">${todo.text.substring(0, 12)}${todo.text.length > 12 ? '...' : ''}</div>
                            <div class="task-member">${todo.member}</div>
                        </div>
                    `).join('')}
                </div>
            `;

            calendarDays.appendChild(dayElement);
        }
    }

    getTodosForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.todos.filter(todo => todo.dueDate === dateStr);
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

    saveTodos() {
        localStorage.setItem('familyTodos', JSON.stringify(this.todos));
    }

    openEditModal(todoId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo) return;

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

        const todo = this.todos.find(t => t.id === this.editingTodoId);
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
}

const app = new FamilyTodoApp();

if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}