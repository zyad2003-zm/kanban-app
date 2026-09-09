// Task Management
let currentUserId = null;
class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentTaskId = null;
    }

    loadFromStorage(userId) {
        this.tasks = JSON.parse(localStorage.getItem(`tasks_${userId}`)) || [];
    }

    addTask(task) {
        task.id = Date.now().toString();
        this.tasks.push(task);
        this.saveTasks();
        return task;
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
    }

    updateTask(taskId, updates) {
        this.tasks = this.tasks.map(task => 
            task.id === taskId ? { ...task, ...updates } : task
        );
        this.saveTasks();
    }

    getTaskById(taskId) {
        return this.tasks.find(task => task.id === taskId);
    }

    getTasksByStatus(status) {
        return this.tasks.filter(task => 
            task.status === status && task.boardId === boardManager.currentBoardId
        );
    }

    saveTasks() {
        localStorage.setItem(`tasks_${currentUserId}`, JSON.stringify(this.tasks));
        updateTaskCounts();
    }
}

// Board Management
class BoardManager {
    constructor() {
        this.boards = [];
        this.currentBoardId = null;
    }

    loadFromStorage(userId) {
        this.boards = JSON.parse(localStorage.getItem(`boards_${userId}`)) || [
            { id: '1', name: 'Platform Launch', columns: ['todo', 'doing', 'done'] },
            { id: '2', name: 'Marketing Plan', columns: ['todo', 'doing', 'done'] },
            { id: '3', name: 'Roadmap', columns: ['todo', 'doing', 'done'] }
        ];
        this.currentBoardId = localStorage.getItem(`currentBoardId_${userId}`) || '1';
    }

    addBoard(board) {
        board.id = Date.now().toString();
        this.boards.push(board);
        this.currentBoardId = board.id; // Switch to the new board
        this.saveBoards();
        return board;
    }

    updateBoard(boardId, updates) {
        this.boards = this.boards.map(board => 
            board.id === boardId ? { ...board, ...updates } : board
        );
        this.saveBoards();
    }

    deleteBoard(boardId) {
        this.boards = this.boards.filter(board => board.id !== boardId);
        // If the deleted board was the current board, switch to the first remaining board
        if (this.currentBoardId === boardId) {
            this.currentBoardId = this.boards.length > 0 ? this.boards[0].id : null;
        }
        this.saveBoards();
    }

    saveBoards() {
        localStorage.setItem(`boards_${currentUserId}`, JSON.stringify(this.boards));
        localStorage.setItem(`currentBoardId_${currentUserId}`, this.currentBoardId);
        loadBoards();
        if (this.currentBoardId) {
            loadTasks();
        } else {
            // If no boards remain, clear the board area
            document.querySelector('.board').innerHTML = '<p>No boards available. Create a new board to get started.</p>';
            document.querySelector('.header h1').textContent = 'No Board Selected';
        }
    }

    getBoardById(boardId) {
        return this.boards.find(board => board.id === boardId);
    }

    setCurrentBoard(boardId) {
        this.currentBoardId = boardId;
        this.saveBoards();
    }
}

// UI Management
const taskManager = new TaskManager();
const boardManager = new BoardManager();
const taskModal = document.getElementById('taskModal');
const viewTaskModal = document.getElementById('viewTaskModal');
const createBoardModal = document.getElementById('createBoardModal');
const editBoardModal = document.getElementById('editBoardModal');
const taskForm = document.getElementById('taskForm');
const boardForm = document.getElementById('boardForm');
const editBoardForm = document.getElementById('editBoardForm');
const addTaskBtn = document.getElementById('addTaskBtn');
const createBoardBtn = document.getElementById('createBoardBtn');
const editBoardBtn = document.getElementById('editBoardBtn');
const deleteBoardBtn = document.getElementById('deleteBoardBtn');
const menuBtn = document.getElementById('menuBtn');
const dropdownMenu = document.getElementById('dropdownMenu');
const sidebar = document.querySelector('.sidebar');
const hideSidebarBtn = document.getElementById('hideSidebarBtn');
const showSidebarBtn = document.getElementById('showSidebarBtn');
const mainContent = document.querySelector('.main-content');
const themeToggle = document.getElementById('themeToggle');

// Initialize the board
function initializeBoard() {
    loadBoards();
    loadTasks();
    setupEventListeners();
}

// Load boards from BoardManager
function loadBoards() {
    const boardNav = document.querySelector('.board-nav');
    boardNav.innerHTML = boardManager.boards.map(board => `
        <a href="#" class="board-link ${board.id === boardManager.currentBoardId ? 'active' : ''}" data-board-id="${board.id}">
            <img src="icon-board.svg" alt="Board Icon" class="board-icon">
            ${board.name}
        </a>
    `).join('') + `
        <button class="board-link create-board-btn" id="createBoardBtn">
            <img src="icon-board.svg" alt="Board Icon" class="board-icon">
            Create New Board
        </button>
    `;
    document.querySelector('.boards-title').textContent = `ALL BOARDS (${boardManager.boards.length})`;
    if (boardManager.currentBoardId) {
        document.querySelector('.header h1').textContent = boardManager.getBoardById(boardManager.currentBoardId).name;
    }

    // Add event listeners to board links
    document.querySelectorAll('.board-link[data-board-id]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const boardId = link.dataset.boardId;
            boardManager.setCurrentBoard(boardId);
        });
    });

    // Reattach event listener to the create board button
    document.getElementById('createBoardBtn').addEventListener('click', openCreateBoardModal);
}

// Load tasks from TaskManager (merged version)
function loadTasks() {
    const currentBoard = boardManager.getBoardById(boardManager.currentBoardId);
    if (!currentBoard) return;
    
    const columnColors = ['#49C4E5', '#8471F2', '#67E2AE', '#F4A261', '#E76F51', '#2A9D8F', '#E9C46A', '#A8DADC'];

    const boardElement = document.querySelector('.board');
    boardElement.innerHTML = currentBoard.columns.map((status, index) => {
        const color = columnColors[index % columnColors.length];
        return `
        <div class="column" data-status="${status}">
            <h2 class="column-header">
                <span class="status-circle" style="background-color:${color}"></span> ${status.toUpperCase()} (<span class="task-count">0</span>)
            </h2>
            <div class="tasks-container"></div>
        </div>
    `}).join('');
    
    document.querySelectorAll('.tasks-container').forEach(container => {
        const status = container.parentElement.dataset.status;
        const tasks = taskManager.getTasksByStatus(status);
        container.innerHTML = tasks.map(task => createTaskCard(task)).join('');
        
        // Reattach click event listeners for task cards
        container.addEventListener('click', (e) => {
            const taskCard = e.target.closest('.task-card');
            if (taskCard) {
                openViewModal(taskCard.dataset.taskId);
            }
        });
    });
    
    updateTaskCounts();
    setupDragAndDrop();
}

// Create task card HTML
function createTaskCard(task) {
    const subtaskCount = task.subtasks ? task.subtasks.length : 0;
    return `
        <div class="task-card" draggable="true" data-task-id="${task.id}">
            <h3>${task.title}</h3>
            <p>Due: ${new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })}</p>
            ${subtaskCount > 0 ? `<p>Subtasks: ${subtaskCount}</p>` : ''}
        </div>
    `;
}

// Update task counts in column headers
function updateTaskCounts() {
    document.querySelectorAll('.column').forEach(column => {
        const status = column.dataset.status;
        const count = taskManager.getTasksByStatus(status).length;
        column.querySelector('.task-count').textContent = count;
    });
}

// Modal Management
function openModal() {
    // Fill status dropdown with current board's columns
    const currentBoard = boardManager.getBoardById(boardManager.currentBoardId);
    const taskStatus = document.getElementById('taskStatus');
    taskStatus.innerHTML = currentBoard.columns.map(col => 
        `<option value="${col}">${col.charAt(0).toUpperCase() + col.slice(1)}</option>`
    ).join('');
    taskModal.style.display = 'block';
}

function closeModal() {
    taskModal.style.display = 'none';
    taskForm.reset();
    document.getElementById('subtasksContainer').innerHTML = '';
}

function openCreateBoardModal() {
    createBoardModal.style.display = 'block';
}

function closeCreateBoardModal() {
    createBoardModal.style.display = 'none';
    boardForm.reset();
    document.getElementById('columnsContainer').innerHTML = `
        <div class="column-input">
            <input type="text" value="Todo" name="columns[]" required>
            <button type="button" class="remove-column-btn">✕</button>
        </div>
        <div class="column-input">
            <input type="text" value="Doing" name="columns[]" required>
            <button type="button" class="remove-column-btn">✕</button>
        </div>
        <div class="column-input">
            <input type="text" value="Done" name="columns[]" required>
            <button type="button" class="remove-column-btn">✕</button>
        </div>
    `;
    setupColumnListeners();
}

function openEditBoardModal() {
    const currentBoard = boardManager.getBoardById(boardManager.currentBoardId);
    if (!currentBoard) return;

    document.getElementById('editBoardName').value = currentBoard.name;
    const editColumnsContainer = document.getElementById('editColumnsContainer');
    editColumnsContainer.innerHTML = currentBoard.columns.map(column => `
        <div class="column-input">
            <input type="text" value="${column}" name="columns[]" required>
            <button type="button" class="remove-column-btn">✕</button>
        </div>
    `).join('');
    setupEditColumnListeners();
    editBoardModal.style.display = 'block';
}

function closeEditBoardModal() {
    editBoardModal.style.display = 'none';
    editBoardForm.reset();
    document.getElementById('editColumnsContainer').innerHTML = '';
}

function openViewModal(taskId) {
    const task = taskManager.getTaskById(taskId);
    if (!task) return;

    taskManager.currentTaskId = taskId;
    document.getElementById('viewTaskTitle').textContent = task.title;
    document.getElementById('viewTaskDescription').textContent = task.description || 'No description provided';
    document.getElementById('viewTaskDueDate').textContent = new Date(task.dueDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
    });
    document.getElementById('viewTaskStatus').textContent = task.status.charAt(0).toUpperCase() + task.status.slice(1);
    
    const subtaskContainer = document.createElement('div');
    subtaskContainer.id = 'viewSubtasksContainer';
    if (task.subtasks && task.subtasks.length > 0) {
        subtaskContainer.innerHTML = '<h4>Subtasks</h4>';
        task.subtasks.forEach(subtask => {
            const subtaskItem = document.createElement('p');
            subtaskItem.textContent = subtask;
            subtaskContainer.appendChild(subtaskItem);
        });
    }
    const existingSubtaskContainer = document.getElementById('viewSubtasksContainer');
    if (existingSubtaskContainer) {
        existingSubtaskContainer.remove();
    }
    document.querySelector('.task-metadata').appendChild(subtaskContainer);
    
    viewTaskModal.style.display = 'block';
}

function closeViewModal() {
    viewTaskModal.style.display = 'none';
    taskManager.currentTaskId = null;
}

// Delete Task function (updated to clear currentTaskId)
function deleteTask() {
    if (taskManager.currentTaskId) {
        taskManager.deleteTask(taskManager.currentTaskId);
        taskManager.currentTaskId = null;
        closeViewModal();
        loadTasks();
    }
}

// Sidebar Management
function toggleSidebar() {
    const isHidden = sidebar.classList.toggle('hidden');
    showSidebarBtn.style.display = isHidden ? 'flex' : 'none';
    mainContent.classList.toggle('full-width', isHidden);
}

// Theme Management
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

// Dropdown Menu Management
function toggleDropdownMenu() {
    dropdownMenu.classList.toggle('show');
}

// Subtask Management
function setupSubtaskListeners() {
    document.getElementById('addSubtaskBtn').addEventListener('click', function () {
        const subtasksContainer = document.getElementById('subtasksContainer');
        
        const subtaskDiv = document.createElement('div');
        subtaskDiv.classList.add('subtask-input');
        
        const subtaskInput = document.createElement('input');
        subtaskInput.type = 'text';
        subtaskInput.placeholder = 'e.g. Take coffee break';
        subtaskInput.name = 'subtasks[]';
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.innerHTML = '✕';
        removeBtn.addEventListener('click', function () {
            subtaskDiv.remove();
        });
        
        subtaskDiv.appendChild(subtaskInput);
        subtaskDiv.appendChild(removeBtn);
        subtasksContainer.appendChild(subtaskDiv);
    });
}

// Column Management (for Create New Board Modal)
function setupColumnListeners() {
    const addColumnBtn = document.getElementById('addColumnBtn');
    const newBtn = addColumnBtn.cloneNode(true);
    addColumnBtn.parentNode.replaceChild(newBtn, addColumnBtn);

    newBtn.addEventListener('click', function () {
        const columnsContainer = document.getElementById('columnsContainer');
        
        const columnDiv = document.createElement('div');
        columnDiv.classList.add('column-input');
        
        const columnInput = document.createElement('input');
        columnInput.type = 'text';
        columnInput.name = 'columns[]';
        columnInput.required = true;
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.innerHTML = '✕';
        removeBtn.addEventListener('click', function () {
            columnDiv.remove();
        });
        
        columnDiv.appendChild(columnInput);
        columnDiv.appendChild(removeBtn);
        columnsContainer.appendChild(columnDiv);
    });

    // Add remove button listeners for existing columns
    document.querySelectorAll('.remove-column-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            btn.parentElement.remove();
        });
    });
}

// Column Management (for Edit Board Modal)
function setupEditColumnListeners() {
    const editAddColumnBtn = document.getElementById('editAddColumnBtn');
    const newBtn = editAddColumnBtn.cloneNode(true);
    editAddColumnBtn.parentNode.replaceChild(newBtn, editAddColumnBtn);

    newBtn.addEventListener('click', function () {
        const columnsContainer = document.getElementById('editColumnsContainer');
        
        const columnDiv = document.createElement('div');
        columnDiv.classList.add('column-input');
        
        const columnInput = document.createElement('input');
        columnInput.type = 'text';
        columnInput.name = 'columns[]';
        columnInput.required = true;
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.innerHTML = '✕';
        removeBtn.addEventListener('click', function () {
            columnDiv.remove();
        });
        
        columnDiv.appendChild(columnInput);
        columnDiv.appendChild(removeBtn);
        columnsContainer.appendChild(columnDiv);
    });

    // Add remove button listeners for existing columns
    document.querySelectorAll('#editColumnsContainer .remove-column-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            btn.parentElement.remove();
        });
    });
}

// Event Listeners
function setupEventListeners() {
    // Add Task Button
    addTaskBtn.addEventListener('click', openModal);

    // Create Board Button
    createBoardBtn.addEventListener('click', openCreateBoardModal);

    // Edit Board Button
    editBoardBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleDropdownMenu();
        openEditBoardModal();
    });

    // Delete Board Button
    deleteBoardBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleDropdownMenu();
        if (confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
            boardManager.deleteBoard(boardManager.currentBoardId);
        }
    });

    // Form Submit (Task)
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const task = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            dueDate: document.getElementById('taskDueDate').value,
            status: document.getElementById('taskStatus').value,
            boardId: boardManager.currentBoardId,
            subtasks: Array.from(document.querySelectorAll('#subtasksContainer input'))
                .map(input => input.value)
                .filter(value => value.trim() !== '')
        };
        taskManager.addTask(task);
        closeModal();
        loadTasks();
    });

    // Form Submit (Create Board)
    boardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const board = {
            name: document.getElementById('boardName').value,
            columns: Array.from(document.querySelectorAll('#columnsContainer input'))
                .map(input => input.value.toLowerCase())
                .filter(value => value.trim() !== '')
        };
        boardManager.addBoard(board);
        closeCreateBoardModal();
    });

    // Form Submit (Edit Board)
    editBoardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const updates = {
            name: document.getElementById('editBoardName').value,
            columns: Array.from(document.querySelectorAll('#editColumnsContainer input'))
                .map(input => input.value.toLowerCase())
                .filter(value => value.trim() !== '')
        };
        boardManager.updateBoard(boardManager.currentBoardId, updates);
        closeEditBoardModal();
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === taskModal) closeModal();
        if (e.target === viewTaskModal) closeViewModal();
        if (e.target === createBoardModal) closeCreateBoardModal();
        if (e.target === editBoardModal) closeEditBoardModal();
        if (!e.target.matches('.menu-button') && !e.target.matches('.dropdown-content *')) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Menu Button
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdownMenu();
    });

    // Hide Sidebar Button
    hideSidebarBtn.addEventListener('click', toggleSidebar);

    // Show Sidebar Button
    showSidebarBtn.addEventListener('click', toggleSidebar);

    // Theme Toggle
    themeToggle.addEventListener('change', toggleTheme);

    // Drag and Drop
    setupDragAndDrop();

    // Subtask Listeners
    setupSubtaskListeners();

    // Column Listeners
    setupColumnListeners();
    setupEditColumnListeners();
}

function setupDragAndDrop() {
    document.querySelectorAll('.task-card').forEach(taskCard => {
        taskCard.setAttribute("draggable", "true");

        taskCard.addEventListener('dragstart', (e) => {
            taskCard.classList.add('dragging');
            e.dataTransfer.setData('text/plain', taskCard.dataset.taskId);
            console.log("Dragging task:", taskCard.dataset.taskId);
        });

        taskCard.addEventListener('dragend', () => {
            taskCard.classList.remove('dragging');
            console.log("Drag End");
        });
    });

    document.querySelectorAll('.tasks-container').forEach(container => {
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            container.classList.add('drag-over');
        });

        container.addEventListener('dragleave', () => {
            container.classList.remove('drag-over');
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('drag-over');

            const taskId = e.dataTransfer.getData('text/plain');
            const newStatus = container.parentElement.dataset.status;

            console.log("Dropped Task:", taskId, "New Status:", newStatus);

            if (taskId && newStatus) {
                taskManager.updateTask(taskId, { status: newStatus });
                loadTasks(); // Re-load tasks after updating
                setupDragAndDrop(); // Rebind drag-and-drop after refresh
            } else {
                console.error("Drop failed: Task ID or New Status is missing");
            }
        });
    });
}
setupDragAndDrop(); // Reinitialize drag-and-drop events after tasks are loaded

// Initialize theme from localStorage
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.checked = true;
    }
}

// Initialize the board when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
});

const hamburgerMenuBtn = document.getElementById('hamburgerMenuBtn');

hamburgerMenuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('visible');
});

// Close sidebar when clicking outside of it
document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !hamburgerMenuBtn.contains(e.target)) {
        sidebar.classList.remove('visible');
    }
});
