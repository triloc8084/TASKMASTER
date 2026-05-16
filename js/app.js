// Constants
const API_URL = 'api';
const PRIORITY_COLORS = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444'
};
const REMINDER_CHECK_INTERVAL = 60000; // Check every minute

// DOM Elements
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');
const filterButtons = document.querySelectorAll('.filter-btn');
const sortSelect = document.getElementById('sortSelect');
const controls = document.querySelector('.controls');
const authButtons = document.querySelector('.auth-buttons');
const navLinks = document.querySelectorAll('.nav-links a[data-view]');
const viewPanels = document.querySelectorAll('[data-view-panel]');

// State
let tasks = [];
let currentFilter = 'all';
let currentSort = 'date-desc';
let currentView = 'dashboard';
let searchTerm = '';
let editingTaskId = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupReminderSystem();
    const initialView = window.location.hash.replace('#', '');
    if (['dashboard', 'analytics', 'categories'].includes(initialView)) {
        showView(initialView);
    }
    if (checkAuth()) {
        loadTasks();
    }
});

function setupEventListeners() {
    taskForm.addEventListener('submit', handleTaskSubmit);
    filterButtons.forEach(btn => btn.addEventListener('click', handleFilterClick));
    sortSelect.addEventListener('change', handleSortChange);
    navLinks.forEach(link => link.addEventListener('click', handleNavigation));
    document.querySelectorAll('[data-open-modal]').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            openModal(link.dataset.openModal);
        });
    });
    document.querySelectorAll('[data-close-modal]').forEach(button => {
        button.addEventListener('click', () => closeModal(button.dataset.closeModal));
    });
    document.getElementById('notificationBtn')?.addEventListener('click', () => {
        renderNotifications();
        openModal('notificationModal');
    });
    document.querySelector('[data-open-modal="calendarModal"]')?.addEventListener('click', () => renderCalendar());
    document.getElementById('topLogoutBtn')?.addEventListener('click', () => logout());
    document.getElementById('hamburgerBtn')?.addEventListener('click', toggleSidebar);
    document.getElementById('inviteBtn')?.addEventListener('click', () => openModal('inviteModal'));
    document.getElementById('profileForm')?.addEventListener('submit', handleProfileSubmit);
    document.getElementById('inviteForm')?.addEventListener('submit', handleInviteSubmit);
    
    // Theme Toggle
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        const icon = document.querySelector('#themeToggleBtn i');
        if (icon) icon.className = 'fas fa-sun';
    }
    
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        const icon = document.querySelector('#themeToggleBtn i');
        if (icon) {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
    });

    const searchInputEl = document.getElementById('taskSearchInput');
    searchInputEl?.addEventListener('input', (event) => {
        searchTerm = event.target.value.trim().toLowerCase();
        renderTasks();
    });
    document.getElementById('taskSearchBtn')?.addEventListener('click', () => {
        searchTerm = searchInputEl ? searchInputEl.value.trim().toLowerCase() : '';
        renderTasks();
    });
    setTodayLabel();
    
    // Add input animation
    taskInput.addEventListener('focus', () => {
        taskForm.classList.add('form-focused');
    });
    
    taskInput.addEventListener('blur', () => {
        taskForm.classList.remove('form-focused');
    });

    // Drag and Drop
    const taskListEl = document.getElementById('taskList');
    if (taskListEl) {
        taskListEl.addEventListener('dragstart', handleDragStart);
        taskListEl.addEventListener('dragover', handleDragOver);
        taskListEl.addEventListener('drop', handleDrop);
        taskListEl.addEventListener('dragend', handleDragEnd);
    }
}

// API Functions
async function loadTasks() {
    try {
        const taskList = document.getElementById('taskList');
        if (taskList) {
            taskList.innerHTML = `
                <div class="skeleton-loader"></div>
                <div class="skeleton-loader"></div>
                <div class="skeleton-loader"></div>
            `;
        }
        const response = await fetch(`${API_URL}/tasks.php`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch tasks');
        }
        
        const data = await response.json();
        if (Array.isArray(data)) {
            tasks = data;
            renderTasks();
            updateDashboardPanels();
        } else {
            console.error('Invalid response format:', data);
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        showError('Error loading tasks. Please try again.');
    }
}

async function addTask(taskData) {
    try {
        const response = await fetch(`${API_URL}/tasks.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to add task');
        }
        
        const result = await response.json();
        if (result.status === 'success') {
            // Reload all tasks instead of just adding the new one
            await loadTasks();
            showSuccess('Task added successfully!');
            return true;
        }
        throw new Error(result.message || 'Failed to add task');
    } catch (error) {
        console.error('Error adding task:', error);
        showError(error.message || 'Error adding task. Please try again.');
        return false;
    }
}

async function toggleTaskCompletion(taskId) {
    try {
        const existingTask = tasks.find(task => Number(task.id) === Number(taskId));
        const response = await fetch(`${API_URL}/tasks.php`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: taskId, completed: existingTask ? !existingTask.completed : true })
        });

        if (!response.ok) throw new Error('Failed to update task');
        
        const result = await response.json();
        if (result.status === 'success') {
            const taskIndex = tasks.findIndex(t => Number(t.id) === Number(taskId));
            if (taskIndex !== -1) {
                tasks[taskIndex] = result.task;
                renderTasks();
                updateDashboardPanels();
            }
            return true;
        }
        throw new Error(result.message || 'Failed to update task');
    } catch (error) {
        showError('Error updating task. Please try again.');
        console.error('Error:', error);
        return false;
    }
}

async function updateTask(taskId, taskData) {
    try {
        const response = await fetch(`${API_URL}/tasks.php`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: taskId, ...taskData })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update task');
        }

        const result = await response.json();
        if (result.status === 'success') {
            const taskIndex = tasks.findIndex(t => Number(t.id) === Number(taskId));
            if (taskIndex !== -1) {
                tasks[taskIndex] = result.task;
                editingTaskId = null;
                renderTasks();
                updateDashboardPanels();
            }
            showSuccess('Task updated successfully');
            return true;
        }
        throw new Error(result.message || 'Failed to update task');
    } catch (error) {
        showError(error.message || 'Error updating task. Please try again.');
        console.error('Error:', error);
        return false;
    }
}

async function deleteTask(taskId) {
    try {
        const response = await fetch(`${API_URL}/tasks.php?id=${encodeURIComponent(taskId)}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete task');
        }
        
        const result = await response.json();
        if (result.status === 'success') {
            tasks = tasks.filter(task => Number(task.id) !== Number(taskId));
            renderTasks();
            updateDashboardPanels();
            showSuccess('Task deleted successfully');
            return true;
        }
        throw new Error(result.message || 'Failed to delete task');
    } catch (error) {
        showError(error.message || 'Error deleting task. Please try again.');
        console.error('Error:', error);
        return false;
    }
}

// UI Functions
function renderTasks() {
    const taskList = document.getElementById('taskList');
    if (!taskList) return;

    // Update Progress Bar
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    const progressBar = document.getElementById('taskProgressBar');
    if (progressBar) progressBar.style.width = `${percent}%`;

    // Update Filter Badges
    const allCountEl = document.getElementById('allCount');
    const activeCountEl = document.getElementById('activeCount');
    const completedCountEl = document.getElementById('completedCount');
    
    if (allCountEl) allCountEl.textContent = total;
    if (activeCountEl) activeCountEl.textContent = tasks.filter(t => !t.completed).length;
    if (completedCountEl) completedCountEl.textContent = completed;

    const filteredTasks = filterTasks(tasks).filter(task => {
        if (!searchTerm) return true;
        return task.task.toLowerCase().includes(searchTerm) ||
            task.priority.toLowerCase().includes(searchTerm) ||
            (task.due_date || '').includes(searchTerm);
    });
    const sortedTasks = sortTasks(filteredTasks);
    
    if (sortedTasks.length === 0) {
        taskList.innerHTML = `
            <div class="no-tasks">
                <i class="fas fa-clipboard-list"></i>
                <p>No tasks found. Add a new task to get started!</p>
            </div>
        `;
        return;
    }
    
    taskList.innerHTML = sortedTasks.map((task, index) => editingTaskId === Number(task.id)
        ? renderEditableTask(task, index)
        : `
        <div class="task-item ${task.completed ? 'completed' : ''}"
             data-id="${task.id}"
             draggable="true"
             style="animation: slideIn 0.3s ease-out ${index * 0.1}s forwards">
            <div class="task-content">
                <button class="complete-btn" onclick="handleTaskComplete(${task.id})">
                    ${task.completed ? '<i class="fas fa-check"></i>' : ''}
                </button>
                <span class="task-text">${escapeHtml(task.task)}</span>
                <span class="category-badge">${escapeHtml(task.category || 'General')}</span>
                <span class="priority-badge ${task.priority.toLowerCase()}" 
                      style="background-color: ${PRIORITY_COLORS[task.priority.toLowerCase()]}">
                    ${getPriorityIcon(task.priority)} ${task.priority}
                </span>
                ${task.due_date ? `
                    <span class="due-date ${getDueDateClass(task.due_date)}">
                        <i class="far fa-calendar-alt"></i>
                        ${formatDate(task.due_date)}
                    </span>
                ` : ''}
            </div>
            <div class="task-actions">
                <button class="icon-btn edit-btn" onclick="handleTaskEdit(${task.id})" title="Edit task">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="icon-btn delete-btn" onclick="handleTaskDelete(${task.id})" title="Delete task">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderEditableTask(task, index) {
    return `
        <form class="task-item edit-task-card" data-id="${task.id}" onsubmit="handleInlineTaskSave(event, ${task.id})"
              style="animation: slideIn 0.3s ease-out ${index * 0.1}s forwards">
            <input type="text" name="task" value="${escapeHtml(task.task)}" required>
            <select name="priority">
                <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low Priority</option>
                <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium Priority</option>
                <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High Priority</option>
            </select>
            <input type="date" name="due_date" value="${task.due_date || ''}">
            <div class="task-actions">
                <button class="icon-btn save-btn" type="submit" title="Save task"><i class="fas fa-check"></i></button>
                <button class="icon-btn delete-btn" type="button" onclick="cancelInlineEdit()" title="Cancel edit"><i class="fas fa-times"></i></button>
            </div>
        </form>
    `;
}

function getPriorityIcon(priority) {
    const icons = {
        high: '<i class="fas fa-arrow-up"></i>',
        medium: '<i class="fas fa-minus"></i>',
        low: '<i class="fas fa-arrow-down"></i>'
    };
    return icons[priority.toLowerCase()] || '';
}

function getDueDateClass(dateString) {
    const dueDate = new Date(dateString);
    const now = new Date();
    now.setHours(0,0,0,0);
    dueDate.setHours(0,0,0,0);
    
    if (dueDate < now) return 'overdue';
    if (dueDate.getTime() === now.getTime()) return 'due-today';
    return 'upcoming';
}

function filterTasks(tasks) {
    switch (currentFilter) {
        case 'active':
            return tasks.filter(task => !task.completed);
        case 'completed':
            return tasks.filter(task => task.completed);
        default:
            return tasks;
    }
}

function sortTasks(tasks) {
    const sortedTasks = [...tasks];
    switch (currentSort) {
        case 'date-asc':
            return sortedTasks.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        case 'date-desc':
            return sortedTasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        case 'priority':
            return sortedTasks.sort((a, b) => {
                const priorityOrder = { high: 1, medium: 2, low: 3 };
                return priorityOrder[a.priority.toLowerCase()] - priorityOrder[b.priority.toLowerCase()];
            });
        case 'dueDate':
            return sortedTasks.sort((a, b) => {
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date) - new Date(b.due_date);
            });
        default: // created
            return sortedTasks;
    }
}

function updateActiveFilterButton(activeBtn) {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
}

// Event Handlers
async function handleTaskSubmit(e) {
    e.preventDefault();
    
    const taskInput = document.getElementById('taskInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const dueDateInput = document.getElementById('dueDateInput');
    const categorySelect = document.getElementById('categorySelect');
    
    if (!taskInput.value.trim()) {
        showError('Please enter a task description');
        return;
    }

    const task = {
        task: taskInput.value.trim(),
        priority: prioritySelect.value,
        due_date: dueDateInput.value,
        category: categorySelect ? categorySelect.value : 'General',
        completed: false
    };
    
    const success = await addTask(task);
    if (success) {
        taskInput.value = '';
        prioritySelect.value = 'low';
        dueDateInput.value = '';
        if (categorySelect) categorySelect.value = 'General';
    }
}

async function handleTaskComplete(taskId) {
    const existingTask = tasks.find(task => Number(task.id) === Number(taskId));
    const wasCompleted = existingTask ? existingTask.completed : false;
    
    const success = await toggleTaskCompletion(taskId);
    if (success && !wasCompleted) {
        // Trigger confetti!
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    } else if (!success) {
        showError('Error updating task. Please try again.');
    }
}

async function handleTaskDelete(taskId) {
    const taskEl = document.querySelector(`.task-item[data-id="${taskId}"]`);
    if (taskEl) {
        taskEl.classList.add('deleting');
        // Wait for animation to finish (300ms)
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    const success = await deleteTask(taskId);
    if (!success) {
        showError('Error deleting task. Please try again.');
        if (taskEl) taskEl.classList.remove('deleting');
    }
}

async function handleTaskEdit(taskId) {
    editingTaskId = Number(taskId);
    renderTasks();
}

let draggedItemId = null;

function handleDragStart(e) {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;
    draggedItemId = taskItem.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    taskItem.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    const taskItem = e.target.closest('.task-item');
    if (!taskItem || taskItem.dataset.id === draggedItemId) return;
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    const taskItem = e.target.closest('.task-item');
    if (!taskItem || taskItem.dataset.id === draggedItemId) return;
    
    const targetId = taskItem.dataset.id;
    // Reorder tasks array!
    const draggedIndex = tasks.findIndex(t => String(t.id) === String(draggedItemId));
    const targetIndex = tasks.findIndex(t => String(t.id) === String(targetId));
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
        const [draggedItem] = tasks.splice(draggedIndex, 1);
        tasks.splice(targetIndex, 0, draggedItem);
        renderTasks();
    }
}

function handleDragEnd(e) {
    const taskItem = e.target.closest('.task-item');
    if (taskItem) taskItem.classList.remove('dragging');
    draggedItemId = null;
}

async function handleInlineTaskSave(event, taskId) {
    event.preventDefault();
    const formData = new FormData(event.target);
    await updateTask(taskId, {
        task: formData.get('task').trim(),
        priority: formData.get('priority'),
        due_date: formData.get('due_date')
    });
}

function cancelInlineEdit() {
    editingTaskId = null;
    renderTasks();
}

function handleFilterClick(e) {
    currentFilter = e.target.dataset.filter;
    updateActiveFilterButton(e.target);
    renderTasks();
}

function handleNavigation(event) {
    event.preventDefault();
    const view = event.currentTarget.dataset.view;
    if (view === 'my-task') {
        currentFilter = 'active';
        updateActiveFilterButton(document.querySelector('.filter-btn[data-filter="active"]'));
        showView('dashboard');
        renderTasks();
        return;
    }
    showView(view);
}

function showView(view) {
    currentView = view;
    viewPanels.forEach(panel => panel.classList.toggle('active', panel.dataset.viewPanel === view));
    navLinks.forEach(link => {
        link.closest('li').classList.toggle('active', link.dataset.view === view);
    });
    updateDashboardPanels();
}

function handleSortChange(e) {
    currentSort = e.target.value;
    renderTasks();
}

// Utility Functions
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.classList.add('fade-out');
        setTimeout(() => successDiv.remove(), 300);
    }, 3000);
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function setTodayLabel() {
    const label = document.getElementById('todayLabel');
    if (!label) return;
    const now = new Date();
    label.innerHTML = `${now.toLocaleDateString(undefined, { weekday: 'long' })}<br><strong>${now.toLocaleDateString('en-GB')}</strong>`;
}

function updateDashboardPanels() {
    updateAnalytics();
    renderCategories();
}

function updateAnalytics() {
    const now = new Date();
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const overdue = tasks.filter(task => !task.completed && task.due_date && new Date(task.due_date) < now).length;
    const counts = getPriorityCounts();

    setText('totalTasks', total);
    setText('completedTasks', completed);
    setText('pendingTasks', pending);
    setText('overdueTasks', overdue);
    setText('highCount', counts.high);
    setText('mediumCount', counts.medium);
    setText('lowCount', counts.low);

    const donePercent = total ? Math.round((completed / total) * 100) : 0;
    document.getElementById('statusDonut')?.style.setProperty('--done', `${donePercent}%`);
    const max = Math.max(counts.high, counts.medium, counts.low, 1);
    setBar('highBar', counts.high, max);
    setBar('mediumBar', counts.medium, max);
    setBar('lowBar', counts.low, max);
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function setBar(id, value, max) {
    const element = document.getElementById(id);
    if (element) element.style.width = `${Math.max(8, (value / max) * 100)}%`;
}

function getPriorityCounts() {
    return tasks.reduce((counts, task) => {
        counts[task.priority] = (counts[task.priority] || 0) + 1;
        return counts;
    }, { high: 0, medium: 0, low: 0 });
}

function renderCategories() {
    const categoryGrid = document.getElementById('categoryGrid');
    if (!categoryGrid) return;
    const labels = {
        high: 'High Priority',
        medium: 'Medium Priority',
        low: 'Low Priority'
    };
    categoryGrid.innerHTML = ['high', 'medium', 'low'].map(priority => {
        const categoryTasks = tasks.filter(task => task.priority === priority);
        return `
            <div class="category-card ${priority}">
                <h3>${labels[priority]} <span>${categoryTasks.length}</span></h3>
                ${categoryTasks.length ? categoryTasks.slice(0, 5).map(task => `
                    <p><i class="fas fa-circle"></i> ${escapeHtml(task.task)}</p>
                `).join('') : '<p>No tasks in this category.</p>'}
            </div>
        `;
    }).join('');
}

function renderNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    const now = new Date();
    const items = tasks.filter(task => !task.completed && task.due_date).map(task => {
        const dueDate = new Date(task.due_date);
        const type = dueDate < now ? 'Overdue' : isSameDay(dueDate, now) ? 'Due today' : 'Upcoming';
        return `<div class="panel-item"><strong>${type}</strong><span>${escapeHtml(task.task)} - ${formatDate(task.due_date)}</span></div>`;
    });
    list.innerHTML = items.length ? items.join('') : '<div class="panel-item"><strong>All clear</strong><span>No pending task notifications.</span></div>';
}

function renderCalendar() {
    const list = document.getElementById('calendarList');
    if (!list) return;
    const items = tasks
        .filter(task => task.due_date)
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .map(task => `<div class="panel-item"><strong>${formatDate(task.due_date)}</strong><span>${escapeHtml(task.task)}</span></div>`);
    list.innerHTML = items.length ? items.join('') : '<div class="panel-item"><strong>No dates</strong><span>Add due dates to see tasks here.</span></div>';
}

function openModal(id) {
    if (id === 'profileModal') populateProfileForm();
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

function populateProfileForm() {
    const user = getStoredUser();
    if (!user) return;
    document.getElementById('profileName').value = user.full_name || '';
    document.getElementById('profileEmail').value = user.email || '';
    document.getElementById('profilePassword').value = '';
    document.getElementById('profileConfirmPassword').value = '';
}

async function handleProfileSubmit(event) {
    event.preventDefault();
    const payload = {
        fullName: document.getElementById('profileName').value.trim(),
        email: document.getElementById('profileEmail').value.trim(),
        password: document.getElementById('profilePassword').value,
        confirmPassword: document.getElementById('profileConfirmPassword').value
    };

    try {
        const response = await fetch(`${API_URL}/update_profile.php`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') {
            throw new Error(result.message || 'Failed to update profile');
        }
        localStorage.setItem('user', JSON.stringify(result.user));
        checkAuth();
        closeModal('profileModal');
        showSuccess('Profile updated successfully');
    } catch (error) {
        showError(error.message);
    }
}

function handleInviteSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('inviteEmail').value.trim();
    closeModal('inviteModal');
    showSuccess(`Invite created for ${email}`);
    event.target.reset();
}

function toggleSidebar() {
    document.querySelector('.sidebar')?.classList.toggle('collapsed');
    document.querySelector('.dashboard-main')?.classList.toggle('expanded');
}

// Reminder System
function setupReminderSystem() {
    checkReminders(); // Check immediately on load
    setInterval(checkReminders, REMINDER_CHECK_INTERVAL); // Check periodically
}

function checkReminders() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    tasks.forEach(task => {
        if (task.completed || !task.due_date) return; // Skip completed tasks and tasks without a due date
        
        const dueDate = new Date(task.due_date);
        
        // Check for overdue tasks
        if (dueDate < now) {
            showReminder(`Task "${task.task}" is overdue!`, 'error');
            return;
        }
        
        // Check for tasks due today
        if (isSameDay(dueDate, now)) {
            showReminder(`Task "${task.task}" is due today!`, 'warning');
            return;
        }
        
        // Check for tasks due tomorrow
        if (isSameDay(dueDate, tomorrow)) {
            showReminder(`Task "${task.task}" is due tomorrow!`, 'info');
        }
    });
}

function showReminder(message, type = 'info') {
    const icons = {
        error: '<i class="fas fa-exclamation-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };
    
    const colors = {
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    
    const reminder = document.createElement('div');
    reminder.className = 'reminder-message';
    reminder.innerHTML = `${icons[type]} ${message}`;
    reminder.style.backgroundColor = colors[type];
    
    document.body.appendChild(reminder);
    
    setTimeout(() => {
        reminder.classList.add('fade-out');
        setTimeout(() => reminder.remove(), 300);
    }, 5000);
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// Features Modal
function showFeatures() {
    const modal = document.getElementById('featuresModal');
    modal.classList.add('active');
    
    // Add stagger animation to list items
    const items = modal.querySelectorAll('li');
    items.forEach((item, index) => {
        item.style.animation = `slideIn 0.3s ease-out ${index * 0.1}s forwards`;
    });
}

function closeFeatures() {
    const modal = document.getElementById('featuresModal');
    modal.classList.remove('active');
}

// Authentication
function checkAuth() {
    const user = getStoredUser();
    
    if (user) {
        // User is logged in
        if (taskForm) taskForm.style.display = 'grid';
        if (controls) controls.style.display = 'flex';
        if (taskList) taskList.style.display = 'grid';
        
        // Update dropdown with user info
        const dropdownUsername = document.getElementById('dropdownUsername');
        const dropdownEmail = document.getElementById('dropdownEmail');
        if (dropdownUsername) dropdownUsername.textContent = user.full_name;
        if (dropdownEmail) dropdownEmail.textContent = user.email || 'user@example.com';
        const topLogoutBtn = document.getElementById('topLogoutBtn');
        if (topLogoutBtn) topLogoutBtn.style.display = 'grid';
        return true;
    } else {
        // User is not logged in
        if (taskForm) taskForm.style.display = 'none';
        if (controls) controls.style.display = 'none';
        if (taskList) {
            taskList.innerHTML = `
                <div class="login-prompt">
                    <i class="fas fa-lock"></i>
                    <h2>Please Login to View Tasks</h2>
                    <p>Create an account or login to start managing your tasks.</p>
                    <div class="auth-actions">
                        <a href="login.html" class="auth-btn login-btn">
                            <i class="fas fa-sign-in-alt"></i> Login
                        </a>
                        <a href="register.html" class="auth-btn register-btn">
                            <i class="fas fa-user-plus"></i> Register
                        </a>
                    </div>
                </div>
            `;
            taskList.style.display = 'block';
        }
        const topLogoutBtn = document.getElementById('topLogoutBtn');
        if (topLogoutBtn) topLogoutBtn.style.display = 'none';
        updateDashboardPanels();
        return false;
    }
}

function getStoredUser() {
    try {
        const rawUser = localStorage.getItem('user');
        return rawUser ? JSON.parse(rawUser) : null;
    } catch (error) {
        localStorage.removeItem('user');
        return null;
    }
}

// Handle logout
window.logout = function() {
    fetch(`${API_URL}/logout.php`, { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        })
        .catch(error => {
            console.error('Error:', error);
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
}; 
