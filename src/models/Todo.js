/**
 * Todo Model
 * Handles todo/task data operations and validation
 */

const { v4: uuidv4 } = require('uuid');

class Todo {
    constructor(data = {}) {
        this.id = data.id || uuidv4();
        this.type = data.type || 'task'; // 'task' or 'meeting'
        this.title = data.title || '';
        this.description = data.description || '';
        this.status = data.status || 'pending'; // 'pending', 'in-progress', 'completed', 'cancelled'
        this.priority = data.priority || 'medium'; // 'low', 'medium', 'high', 'urgent'
        this.assignedTo = data.assignedTo || '';
        this.createdBy = data.createdBy || '';
        this.dueDate = data.dueDate || null;
        this.dueTime = data.dueTime || null;
        this.completedAt = data.completedAt || null;
        this.tags = data.tags || [];
        this.attachments = data.attachments || [];
        this.comments = data.comments || [];

        // Meeting specific fields
        this.startTime = data.startTime || null;
        this.endTime = data.endTime || null;
        this.meetingLink = data.meetingLink || '';
        this.agenda = data.agenda || '';
        this.attendees = data.attendees || [];

        // Metadata
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.version = data.version || 1;
    }

    /**
     * Validate todo data
     * @returns {Object} Validation result
     */
    validate() {
        const errors = [];

        // Required fields
        if (!this.title || this.title.trim().length === 0) {
            errors.push('Title is required');
        }

        if (this.title && this.title.length > 200) {
            errors.push('Title must be less than 200 characters');
        }

        if (!this.assignedTo || this.assignedTo.trim().length === 0) {
            errors.push('Assigned user is required');
        }

        // Type validation
        if (!['task', 'meeting'].includes(this.type)) {
            errors.push('Type must be either "task" or "meeting"');
        }

        // Status validation
        const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(this.status)) {
            errors.push('Status must be one of: ' + validStatuses.join(', '));
        }

        // Priority validation
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(this.priority)) {
            errors.push('Priority must be one of: ' + validPriorities.join(', '));
        }

        // Date validation
        if (this.dueDate && !this.isValidDate(this.dueDate)) {
            errors.push('Due date must be a valid date');
        }

        // Meeting specific validation
        if (this.type === 'meeting') {
            if (this.startTime && this.endTime) {
                const start = new Date(this.startTime);
                const end = new Date(this.endTime);
                if (start >= end) {
                    errors.push('End time must be after start time');
                }
            }

            if (this.meetingLink && !this.isValidUrl(this.meetingLink)) {
                errors.push('Meeting link must be a valid URL');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if date string is valid
     * @param {string} dateString Date string
     * @returns {boolean} Validation result
     */
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    /**
     * Check if URL is valid
     * @param {string} url URL string
     * @returns {boolean} Validation result
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Update status
     * @param {string} newStatus New status
     * @param {string} userId User making the change
     */
    updateStatus(newStatus, userId) {
        const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(newStatus)) {
            throw new Error('Invalid status');
        }

        this.status = newStatus;
        this.updatedAt = new Date().toISOString();
        this.version += 1;

        if (newStatus === 'completed') {
            this.completedAt = new Date().toISOString();
        } else if (this.completedAt) {
            this.completedAt = null;
        }

        // Add to comments
        this.addComment({
            text: `Status changed to ${newStatus}`,
            userId: userId,
            type: 'system'
        });
    }

    /**
     * Add comment
     * @param {Object} comment Comment data
     */
    addComment(comment) {
        const newComment = {
            id: uuidv4(),
            text: comment.text,
            userId: comment.userId,
            type: comment.type || 'user',
            createdAt: new Date().toISOString()
        };

        this.comments.push(newComment);
        this.updatedAt = new Date().toISOString();
        this.version += 1;
    }

    /**
     * Add tag
     * @param {string} tag Tag name
     */
    addTag(tag) {
        if (tag && !this.tags.includes(tag)) {
            this.tags.push(tag);
            this.updatedAt = new Date().toISOString();
            this.version += 1;
        }
    }

    /**
     * Remove tag
     * @param {string} tag Tag name
     */
    removeTag(tag) {
        const index = this.tags.indexOf(tag);
        if (index > -1) {
            this.tags.splice(index, 1);
            this.updatedAt = new Date().toISOString();
            this.version += 1;
        }
    }

    /**
     * Check if todo is overdue
     * @returns {boolean} Overdue status
     */
    isOverdue() {
        if (!this.dueDate || this.status === 'completed') {
            return false;
        }

        const dueDateTime = this.dueTime
            ? new Date(`${this.dueDate}T${this.dueTime}`)
            : new Date(this.dueDate);

        return new Date() > dueDateTime;
    }

    /**
     * Get days until due
     * @returns {number|null} Days until due (negative if overdue)
     */
    getDaysUntilDue() {
        if (!this.dueDate) return null;

        const dueDateTime = this.dueTime
            ? new Date(`${this.dueDate}T${this.dueTime}`)
            : new Date(this.dueDate);

        const today = new Date();
        const diffTime = dueDateTime - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    }

    /**
     * Convert to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            title: this.title,
            description: this.description,
            status: this.status,
            priority: this.priority,
            assignedTo: this.assignedTo,
            createdBy: this.createdBy,
            dueDate: this.dueDate,
            dueTime: this.dueTime,
            completedAt: this.completedAt,
            tags: this.tags,
            attachments: this.attachments,
            comments: this.comments,
            startTime: this.startTime,
            endTime: this.endTime,
            meetingLink: this.meetingLink,
            agenda: this.agenda,
            attendees: this.attendees,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            version: this.version,
            isOverdue: this.isOverdue(),
            daysUntilDue: this.getDaysUntilDue()
        };
    }

    /**
     * Create from JSON
     * @param {Object} json JSON data
     * @returns {Todo} Todo instance
     */
    static fromJSON(json) {
        return new Todo(json);
    }
}

module.exports = Todo;