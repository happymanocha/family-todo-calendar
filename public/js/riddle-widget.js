/**
 * Riddle Widget
 * Displays daily AI-generated riddles for family engagement
 */

/* eslint-env browser */
/* eslint-disable no-console */

class RiddleWidget {
  constructor() {
    this.riddleData = null;
    this.hintsRevealed = 0;
    this.answerRevealed = false;
    this.isCollapsed = this.loadCollapsedState();
    this.maxHints = 1; // Only 1 hint available
    this.init();
  }

  async init() {
    try {
      await this.fetchRiddle();
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error('[RiddleWidget] Initialization failed:', error);
      this.handleError(error);
    }
  }

  async fetchRiddle() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const API_BASE_URL =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:3000/api/v1'
          : 'https://4yqv4blrvj.execute-api.us-east-1.amazonaws.com/dev/api/v1';

      const response = await fetch(`${API_BASE_URL}/riddles/today`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch riddle: ${response.status}`);
      }

      const result = await response.json();

      // Handle production environment where widget hides silently
      if (result.success && result.data === null) {
        this.hideWidget();
        return;
      }

      if (!result.success || !result.data) {
        throw new Error(result.message || 'No riddle available');
      }

      this.riddleData = result.data;
    } catch (error) {
      console.error('[RiddleWidget] Fetch failed:', error);
      throw error;
    }
  }

  hideWidget() {
    const widget = document.getElementById('riddle-widget');
    if (widget) {
      widget.classList.add('hidden');
    }
  }

  render() {
    const widget = document.getElementById('riddle-widget');
    if (!widget) {
      console.error('[RiddleWidget] Widget container not found');
      return;
    }

    if (!this.riddleData) {
      this.renderError('No riddle available today');
      return;
    }

    const collapsed = this.isCollapsed ? 'collapsed' : '';

    widget.innerHTML = `
      <div class="riddle-header" id="riddle-header-toggle">
        <div class="riddle-title">
          <span>🧩</span>
          <span class="riddle-title-text">Daily Riddle</span>
        </div>
        <button class="riddle-toggle ${this.isCollapsed ? '' : 'expanded'}" id="riddle-collapse-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
      <div class="riddle-body">
        <div class="riddle-card">
          <span class="riddle-category">${this.riddleData.category}</span>
          <div class="riddle-question">${this.riddleData.riddle}</div>
          <div class="riddle-answer-section">
            <div class="riddle-answer" id="riddle-answer">
              💡 Answer: ${this.riddleData.answer}
            </div>
          </div>
        </div>

        <div class="riddle-hints">
          <div class="riddle-hint" id="hint-1" data-hint="1">
            <strong>Hint:</strong> ${this.riddleData.hint1}
          </div>
        </div>

        <div class="hint-counter" id="hint-counter">
          Hints revealed: ${this.hintsRevealed}/${this.maxHints}
        </div>

        <div class="riddle-actions">
          <button class="riddle-btn riddle-btn-secondary" id="get-hint-btn">
            🔍 Get Hint
          </button>
          <button class="riddle-btn riddle-btn-primary" id="reveal-answer-btn">
            💡 Reveal Answer
          </button>
          <button class="riddle-btn riddle-btn-success" id="mark-solved-btn">
            ✓ Mark as Solved
          </button>
        </div>
      </div>
    `;

    widget.className = 'riddle-widget' + (collapsed ? ' collapsed' : '');

    // Restore state if widget was previously interacted with
    this.restoreState();
  }

  renderLoading() {
    const widget = document.getElementById('riddle-widget');
    if (widget) {
      widget.innerHTML = `
        <div class="riddle-header">
          <div class="riddle-title">
            <span>🧩</span>
            <span class="riddle-title-text">Daily Riddle</span>
          </div>
        </div>
        <div class="riddle-body">
          <div class="riddle-loading">
            <div class="riddle-spinner"></div>
            <div>Loading today's riddle...</div>
          </div>
        </div>
      `;
    }
  }

  renderError(message) {
    const widget = document.getElementById('riddle-widget');
    if (!widget) return;

    // In production, hide widget silently
    const env = window.location.hostname === 'localhost' ? 'development' : 'production';

    if (env === 'production') {
      this.hideWidget();
      return;
    }

    // In dev/staging, show error
    widget.innerHTML = `
      <div class="riddle-header">
        <div class="riddle-title">
          <span>🧩</span>
          <span class="riddle-title-text">Daily Riddle</span>
        </div>
      </div>
      <div class="riddle-body">
        <div class="riddle-error">
          <div>⚠️</div>
          <div>${message}</div>
          <div style="margin-top: 12px;">
            <button class="riddle-btn riddle-btn-secondary" onclick="location.reload()">
              Retry
            </button>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const getHintBtn = document.getElementById('get-hint-btn');
    const revealAnswerBtn = document.getElementById('reveal-answer-btn');
    const markSolvedBtn = document.getElementById('mark-solved-btn');
    const collapseBtn = document.getElementById('riddle-collapse-btn');
    const headerToggle = document.getElementById('riddle-header-toggle');

    if (getHintBtn) {
      getHintBtn.addEventListener('click', () => this.showNextHint());
    }

    if (revealAnswerBtn) {
      revealAnswerBtn.addEventListener('click', () => this.revealAnswer());
    }

    if (markSolvedBtn) {
      markSolvedBtn.addEventListener('click', () => this.markSolved());
    }

    if (collapseBtn) {
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCollapse();
      });
    }

    if (headerToggle) {
      headerToggle.addEventListener('click', () => {
        if (this.isCollapsed) {
          this.toggleCollapse();
        }
      });
    }
  }

  showNextHint() {
    if (this.hintsRevealed >= this.maxHints) {
      return;
    }

    this.hintsRevealed++;
    const hintEl = document.getElementById(`hint-${this.hintsRevealed}`);
    if (hintEl) {
      hintEl.classList.add('revealed');
    }

    this.updateHintCounter();
    this.saveState();

    // Disable button if all hints revealed
    if (this.hintsRevealed >= this.maxHints) {
      const btn = document.getElementById('get-hint-btn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '✓ Hint Revealed';
      }
    }

    // Track hint viewed
    this.trackHintViewed(this.hintsRevealed);
  }

  revealAnswer() {
    const answerEl = document.getElementById('riddle-answer');
    if (answerEl) {
      answerEl.classList.add('revealed');
      this.answerRevealed = true;
    }

    const btn = document.getElementById('reveal-answer-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '✓ Answer Revealed';
    }

    this.saveState();
  }

  async markSolved() {
    try {
      const token = localStorage.getItem('authToken');
      const API_BASE_URL =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:3000/api/v1'
          : 'https://4yqv4blrvj.execute-api.us-east-1.amazonaws.com/dev/api/v1';

      const response = await fetch(`${API_BASE_URL}/riddles/solve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark as solved');
      }

      const btn = document.getElementById('mark-solved-btn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '✓ Solved!';
        btn.style.background = '#059669';
      }

      this.saveState();

      // Show success feedback
      this.showToast('Great job! Riddle marked as solved! 🎉');
    } catch (error) {
      console.error('[RiddleWidget] Failed to mark solved:', error);
      this.showToast('Failed to mark as solved', 'error');
    }
  }

  async trackHintViewed(hintNumber) {
    // Only track hints that exist (we only have 1 hint now)
    if (hintNumber > this.maxHints) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const API_BASE_URL =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:3000/api/v1'
          : 'https://4yqv4blrvj.execute-api.us-east-1.amazonaws.com/dev/api/v1';

      await fetch(`${API_BASE_URL}/riddles/hint/${hintNumber}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      // Silently fail - hint tracking is not critical
      console.debug('[RiddleWidget] Hint tracking skipped:', error.message);
    }
  }

  updateHintCounter() {
    const counter = document.getElementById('hint-counter');
    if (counter) {
      counter.textContent = `Hints revealed: ${this.hintsRevealed}/${this.maxHints}`;
    }
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    const widget = document.getElementById('riddle-widget');

    if (this.isCollapsed) {
      widget.classList.add('collapsed');
    } else {
      widget.classList.remove('collapsed');
    }

    this.saveCollapsedState();
  }

  saveState() {
    const state = {
      hintsRevealed: this.hintsRevealed,
      answerRevealed: this.answerRevealed,
      date: new Date().toDateString(),
    };
    localStorage.setItem('riddleWidgetState', JSON.stringify(state));
  }

  restoreState() {
    try {
      const saved = localStorage.getItem('riddleWidgetState');
      if (!saved) return;

      const state = JSON.parse(saved);

      // Only restore if it's the same day
      if (state.date !== new Date().toDateString()) {
        localStorage.removeItem('riddleWidgetState');
        return;
      }

      // Restore hints
      for (let i = 1; i <= state.hintsRevealed; i++) {
        const hintEl = document.getElementById(`hint-${i}`);
        if (hintEl) {
          hintEl.classList.add('revealed');
        }
      }
      this.hintsRevealed = state.hintsRevealed;

      if (this.hintsRevealed >= this.maxHints) {
        const btn = document.getElementById('get-hint-btn');
        if (btn) {
          btn.disabled = true;
          btn.textContent = '✓ Hint Revealed';
        }
      }

      // Restore answer
      if (state.answerRevealed) {
        const answerEl = document.getElementById('riddle-answer');
        if (answerEl) {
          answerEl.classList.add('revealed');
        }
        const btn = document.getElementById('reveal-answer-btn');
        if (btn) {
          btn.disabled = true;
          btn.textContent = '✓ Answer Revealed';
        }
        this.answerRevealed = true;
      }

      this.updateHintCounter();
    } catch (error) {
      console.error('[RiddleWidget] Failed to restore state:', error);
    }
  }

  saveCollapsedState() {
    localStorage.setItem('riddleWidgetCollapsed', this.isCollapsed.toString());
  }

  loadCollapsedState() {
    const saved = localStorage.getItem('riddleWidgetCollapsed');
    return saved === 'true';
  }

  showToast(message, type = 'success') {
    // Simple toast notification - you can integrate with existing toast system
    const toast = document.createElement('div');
    toast.className = `riddle-toast riddle-toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
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
}

// Initialize widget when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[RiddleWidget] DOM loaded, checking authentication...');
  // Check if user is authenticated
  const token = localStorage.getItem('authToken');
  console.log('[RiddleWidget] Auth token present:', !!token);
  if (token) {
    console.log('[RiddleWidget] Initializing widget...');
    new RiddleWidget();
  } else {
    console.log('[RiddleWidget] No auth token found, widget will not initialize');
  }
});
