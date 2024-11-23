export class StatusBar {
    constructor({ container, eventBus }) {
        this.container = container;
        this.eventBus = eventBus;
        this.initialize();
    }

    initialize() {
        // Create status bar container
        this.statusBar = document.createElement('div');
        this.statusBar.className = 'status-bar';
        
        // Create sections
        this.leftSection = document.createElement('div');
        this.leftSection.className = 'status-section left';
        
        this.centerSection = document.createElement('div');
        this.centerSection.className = 'status-section center';
        
        this.rightSection = document.createElement('div');
        this.rightSection.className = 'status-section right';

        // Add Git info
        this.gitInfo = document.createElement('div');
        this.gitInfo.className = 'git-info';
        this.gitInfo.innerHTML = `
            <span class="branch-icon">⎇</span>
            <span class="branch-name">main</span>
            <span class="sync-status">
                <span class="up-arrow" title="Changes to push">↑0</span>
                <span class="down-arrow" title="Changes to pull">↓0</span>
            </span>
        `;
        this.leftSection.appendChild(this.gitInfo);

        // Add cursor position
        this.cursorPosition = document.createElement('div');
        this.cursorPosition.className = 'cursor-position';
        this.cursorPosition.innerHTML = 'Ln 1, Col 1';
        this.centerSection.appendChild(this.cursorPosition);

        // Add file info
        this.fileInfo = document.createElement('div');
        this.fileInfo.className = 'file-info';
        this.fileInfo.innerHTML = `
            <span class="encoding">UTF-8</span>
            <span class="line-ending">LF</span>
            <span class="indent-type">Spaces: 4</span>
        `;
        this.rightSection.appendChild(this.fileInfo);

        // Add sections to status bar
        this.statusBar.appendChild(this.leftSection);
        this.statusBar.appendChild(this.centerSection);
        this.statusBar.appendChild(this.rightSection);

        // Add status bar to container
        this.container.appendChild(this.statusBar);

        // Set up event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for Git status changes
        this.eventBus.on('git.statusChanged', ({ branch, changes }) => {
            this.updateGitInfo(branch, changes);
        });

        // Listen for cursor position changes
        this.eventBus.on('editor.cursorChanged', ({ line, column }) => {
            this.updateCursorPosition(line, column);
        });

        // Listen for active file changes
        this.eventBus.on('editor.activeFileChanged', ({ path }) => {
            this.updateFileInfo(path);
        });

        // Add click handlers for Git info
        this.gitInfo.addEventListener('click', (e) => {
            if (e.target.closest('.branch-name')) {
                this.eventBus.emit('git.showBranches');
            } else if (e.target.closest('.sync-status')) {
                this.eventBus.emit('git.showSync');
            }
        });
    }

    updateGitInfo(branch, changes = []) {
        const branchName = this.gitInfo.querySelector('.branch-name');
        branchName.textContent = branch;

        const upArrow = this.gitInfo.querySelector('.up-arrow');
        const downArrow = this.gitInfo.querySelector('.down-arrow');

        // Count changes
        const unpushedCount = changes.filter(c => c.status === 'added' || c.status === 'modified').length;
        const unpulledCount = 0; // TODO: Implement proper tracking of unpulled changes

        upArrow.textContent = `↑${unpushedCount}`;
        downArrow.textContent = `↓${unpulledCount}`;

        // Update status colors
        if (unpushedCount > 0) {
            upArrow.classList.add('has-changes');
        } else {
            upArrow.classList.remove('has-changes');
        }

        if (unpulledCount > 0) {
            downArrow.classList.add('has-changes');
        } else {
            downArrow.classList.remove('has-changes');
        }
    }

    updateCursorPosition(line, column) {
        this.cursorPosition.textContent = `Ln ${line}, Col ${column}`;
    }

    updateFileInfo(path) {
        if (!path) {
            this.fileInfo.style.display = 'none';
            return;
        }

        this.fileInfo.style.display = 'flex';
        const extension = path.split('.').pop().toLowerCase();

        // Update indent type based on file type
        const indentType = this.fileInfo.querySelector('.indent-type');
        if (['py', 'yaml', 'yml'].includes(extension)) {
            indentType.textContent = 'Spaces: 4';
        } else {
            indentType.textContent = 'Spaces: 2';
        }

        // Update encoding (could be made dynamic in the future)
        const encoding = this.fileInfo.querySelector('.encoding');
        encoding.textContent = 'UTF-8';

        // Update line ending based on OS (could be made dynamic)
        const lineEnding = this.fileInfo.querySelector('.line-ending');
        lineEnding.textContent = process.platform === 'win32' ? 'CRLF' : 'LF';
    }

    showMessage(message, type = 'info') {
        const messageElement = document.createElement('div');
        messageElement.className = `status-message ${type}`;
        messageElement.textContent = message;

        this.centerSection.appendChild(messageElement);

        // Remove message after 3 seconds
        setTimeout(() => {
            if (messageElement.parentNode === this.centerSection) {
                this.centerSection.removeChild(messageElement);
            }
        }, 3000);
    }
}
