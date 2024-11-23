export class FileExplorer {
    constructor({ container, eventBus }) {
        this.container = container;
        this.eventBus = eventBus;
        this.currentPath = null;
        this.fileTree = null;
        this.gitStatus = new Map();
        this.initialize();
    }

    async initialize() {
        try {
            // Create header with actions
            this.createHeader();

            // Create file tree container
            this.fileTree = document.createElement('div');
            this.fileTree.className = 'file-tree';
            this.container.appendChild(this.fileTree);

            // Create branch indicator
            this.createBranchIndicator();

            // Set up event listeners
            this.setupEventListeners();

            // Load initial directory
            await this.loadDirectory(window.api.env.cwd);

            console.log('File Explorer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize File Explorer:', error);
        }
    }

    createHeader() {
        const header = document.createElement('div');
        header.className = 'section-header';
        header.innerHTML = `
            <span>EXPLORER</span>
            <div class="actions">
                <button class="action-button" title="New File">
                    <svg width="16" height="16" viewBox="0 0 16 16">
                        <path fill="currentColor" d="M9.5 1.1l3.4 3.4.1.6v2h-1V6H8V2H3v11h4v1H2.5l-.5-.5v-12l.5-.5h6.7l.3.1zM9 2v3h2.9L9 2zm4 14h-1v-3H9v-1h3V9h1v3h3v1h-3v3z"/>
                    </svg>
                </button>
                <button class="action-button" title="New Folder">
                    <svg width="16" height="16" viewBox="0 0 16 16">
                        <path fill="currentColor" d="M14 4H9L7.7 2.7c-.2-.2-.5-.3-.7-.3H2c-.6 0-1 .4-1 1v10c0 .6.4 1 1 1h12c.6 0 1-.4 1-1V5c0-.6-.4-1-1-1zm0 1v3H8.5l-.5.5V12H2V4h4.7l1.3 1.3c.2.2.5.3.7.3H14zm0 8H9v-3h5v3z"/>
                    </svg>
                </button>
                <button class="action-button" title="Refresh">
                    <svg width="16" height="16" viewBox="0 0 16 16">
                        <path fill="currentColor" d="M13.5 2.5l-.7.7c1.5 1.5 2.2 3.5 2.2 5.5 0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8c1.2 0 2.3.3 3.4.8L9.7 2.2C8.6 1.8 7.3 1.5 6 1.5c-3.9 0-7 3.1-7 7s3.1 7 7 7 7-3.1 7-7c0-1.7-.6-3.2-1.5-4.5z"/>
                    </svg>
                </button>
                <button class="action-button" title="Collapse All">
                    <svg width="16" height="16" viewBox="0 0 16 16">
                        <path fill="currentColor" d="M9 9H4v1h5V9zM9 4H4v1h5V4zM9 7H4v1h5V7zM7 12H4v1h3v-1z"/>
                        <path fill="currentColor" d="M15 3.5l-1.5-1.5L12 3.5l-.5-.5-1 1 2 2 3-3-1-.5z"/>
                    </svg>
                </button>
            </div>
        `;
        this.container.insertBefore(header, this.container.firstChild);

        // Add action handlers
        const [newFile, newFolder, refresh, collapseAll] = header.querySelectorAll('.action-button');
        newFile.addEventListener('click', () => this.createNewFile());
        newFolder.addEventListener('click', () => this.createNewFolder());
        refresh.addEventListener('click', () => this.refreshDirectory(this.currentPath));
        collapseAll.addEventListener('click', () => this.collapseAllDirectories());
    }

    createBranchIndicator() {
        this.branchIndicator = document.createElement('div');
        this.branchIndicator.className = 'branch-indicator';
        this.branchIndicator.innerHTML = `
            <span class="branch-icon">⎇</span>
            <span class="branch-name">master</span>
            <span class="sync-status">↑0 ↓0</span>
        `;
        this.container.appendChild(this.branchIndicator);
    }

    setupEventListeners() {
        // Handle file tree clicks
        this.fileTree.addEventListener('click', (e) => {
            const item = e.target.closest('.file-tree-item');
            if (!item) return;

            // Handle chevron click for directories
            if (e.target.closest('.chevron')) {
                if (item.dataset.type === 'directory') {
                    this.toggleDirectory(item);
                }
                return;
            }

            this.handleItemClick(item);
        });

        // Handle context menu
        this.fileTree.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const item = e.target.closest('.file-tree-item');
            if (item) {
                this.showContextMenu(e, item);
            } else {
                this.showContextMenu(e, null); // Show root context menu
            }
        });

        // Listen for Git status changes
        this.eventBus.on('git.statusChanged', ({ branch, changes }) => {
            this.updateGitStatus(changes);
            this.updateBranchIndicator(branch);
        });

        // Listen for file system changes
        window.electron.receive('fs.watch', ({ path }) => {
            this.refreshDirectory(path);
        });
    }

    async loadDirectory(path) {
        try {
            const files = await window.electron.invoke('fs.readdir', path);
            this.currentPath = path;
            this.renderFileTree(files);
        } catch (error) {
            console.error('Failed to load directory:', error);
            this.eventBus.emit('explorer.error', {
                type: 'load',
                message: 'Failed to load directory',
                error
            });
        }
    }

    renderFileTree(files) {
        // Sort files: directories first, then files, both alphabetically
        const sortedFiles = files.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) {
                return a.name.localeCompare(b.name);
            }
            return b.isDirectory - a.isDirectory;
        });

        // Create file tree items
        const fragment = document.createDocumentFragment();
        sortedFiles.forEach(file => {
            const item = this.createFileTreeItem(file);
            fragment.appendChild(item);
        });

        // Update DOM
        this.fileTree.innerHTML = '';
        this.fileTree.appendChild(fragment);
    }

    createFileTreeItem(file) {
        const item = document.createElement('div');
        item.className = 'file-tree-item';
        item.dataset.path = file.path;
        item.dataset.type = file.isDirectory ? 'directory' : 'file';
        if (!file.isDirectory) {
            item.dataset.ext = file.name.split('.').pop().toLowerCase();
        }

        // Add Git status if available
        const gitStatus = this.gitStatus.get(file.path);
        if (gitStatus) {
            item.dataset.gitStatus = gitStatus.status;
            item.dataset.gitStaged = gitStatus.staged.toString();
            
            const statusIcon = document.createElement('span');
            statusIcon.className = 'git-status';
            statusIcon.dataset.status = gitStatus.status;
            item.appendChild(statusIcon);
        }

        // Add chevron for directories
        if (file.isDirectory) {
            const chevron = document.createElement('span');
            chevron.className = 'chevron';
            chevron.innerHTML = '▶';
            item.appendChild(chevron);
        }

        const icon = document.createElement('span');
        icon.className = 'icon';
        icon.innerHTML = this.getFileIcon(file);
        item.appendChild(icon);

        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = file.name;
        item.appendChild(name);

        return item;
    }

    getFileIcon(file) {
        if (file.isDirectory) {
            return '📁';
        }

        // File icons based on extension
        const extension = file.name.split('.').pop().toLowerCase();
        const iconMap = {
            'js': '📄',
            'jsx': '⚛️',
            'ts': '📘',
            'tsx': '⚛️',
            'html': '🌐',
            'css': '🎨',
            'json': '📋',
            'md': '📝',
            'py': '🐍',
            'java': '☕',
            'cpp': '⚙️',
            'go': '🔵',
            'rs': '🦀',
            'php': '🐘',
            'rb': '💎',
            'sql': '🗄️',
            'sh': '⌨️',
            'yml': '⚙️',
            'yaml': '⚙️',
            'xml': '📰'
        };

        return iconMap[extension] || '📄';
    }

    async handleItemClick(item) {
        const path = item.dataset.path;
        const type = item.dataset.type;

        if (type === 'directory') {
            this.toggleDirectory(item);
        } else {
            await this.openFile(path);
        }
    }

    async toggleDirectory(item) {
        const isExpanded = item.classList.contains('expanded');
        if (isExpanded) {
            this.collapseDirectory(item);
        } else {
            await this.expandDirectory(item);
        }
    }

    async expandDirectory(item) {
        try {
            const path = item.dataset.path;
            const files = await window.electron.invoke('fs.readdir', path);
            
            // Create and append child items
            const childContainer = document.createElement('div');
            childContainer.className = 'directory-children';
            
            files.forEach(file => {
                const childItem = this.createFileTreeItem(file);
                childContainer.appendChild(childItem);
            });

            item.appendChild(childContainer);
            item.classList.add('expanded');
        } catch (error) {
            console.error('Failed to expand directory:', error);
        }
    }

    collapseDirectory(item) {
        const childContainer = item.querySelector('.directory-children');
        if (childContainer) {
            item.removeChild(childContainer);
        }
        item.classList.remove('expanded');
    }

    collapseAllDirectories() {
        const expandedDirs = this.fileTree.querySelectorAll('.file-tree-item.expanded');
        expandedDirs.forEach(dir => this.collapseDirectory(dir));
    }

    async openFile(path) {
        try {
            const content = await window.electron.invoke('fs.readFile', path);
            this.eventBus.emit('file.open', { path, content });
        } catch (error) {
            console.error('Failed to open file:', error);
            this.eventBus.emit('explorer.error', {
                type: 'open',
                message: 'Failed to open file',
                error
            });
        }
    }

    showContextMenu(event, item) {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        
        const actions = this.getContextMenuActions(item);
        actions.forEach(action => {
            if (action.separator) {
                const separator = document.createElement('div');
                separator.className = 'context-menu-separator';
                menu.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = `context-menu-item ${action.className || ''}`;
                menuItem.innerHTML = `
                    ${action.label}
                    ${action.shortcut ? `<span class="shortcut">${action.shortcut}</span>` : ''}
                `;
                menuItem.onclick = () => {
                    action.handler();
                    document.body.removeChild(menu);
                };
                menu.appendChild(menuItem);
            }
        });

        // Position menu at cursor
        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;

        // Add to body and handle click outside
        document.body.appendChild(menu);
        setTimeout(() => {
            window.addEventListener('click', function cleanup(e) {
                if (!menu.contains(e.target)) {
                    document.body.removeChild(menu);
                    window.removeEventListener('click', cleanup);
                }
            });
        }, 0);
    }

    getContextMenuActions(item) {
        const actions = [];

        if (!item) {
            // Root context menu
            actions.push(
                { label: 'New File', shortcut: 'Ctrl+N', handler: () => this.createNewFile() },
                { label: 'New Folder', handler: () => this.createNewFolder() },
                { separator: true },
                { label: 'Refresh Explorer', handler: () => this.refreshDirectory(this.currentPath) }
            );
        } else {
            const path = item.dataset.path;
            const type = item.dataset.type;
            const gitStatus = this.gitStatus.get(path);

            if (type === 'directory') {
                actions.push(
                    { label: 'New File', handler: () => this.createNewFile(path) },
                    { label: 'New Folder', handler: () => this.createNewFolder(path) },
                    { separator: true }
                );
            }

            actions.push(
                { label: 'Copy', shortcut: 'Ctrl+C', handler: () => this.copyItem(path) },
                { label: 'Cut', shortcut: 'Ctrl+X', handler: () => this.cutItem(path) },
                { label: 'Paste', shortcut: 'Ctrl+V', handler: () => this.pasteItem(path) },
                { separator: true }
            );

            if (gitStatus) {
                if (!gitStatus.staged) {
                    actions.push({
                        label: 'Stage Changes',
                        className: 'git-item git-stage',
                        handler: () => this.eventBus.emit('git.stage', { path })
                    });
                } else {
                    actions.push({
                        label: 'Unstage Changes',
                        className: 'git-item git-unstage',
                        handler: () => this.eventBus.emit('git.unstage', { path })
                    });
                }

                actions.push({
                    label: 'Revert Changes',
                    className: 'git-item git-revert',
                    handler: () => this.eventBus.emit('git.revert', { path })
                });

                actions.push({ separator: true });
            }

            actions.push(
                { label: 'Delete', shortcut: 'Del', handler: () => this.deleteItem(path) },
                { label: 'Rename', shortcut: 'F2', handler: () => this.renameItem(path) }
            );
        }

        return actions;
    }

    async createNewFile(parentPath = this.currentPath) {
        try {
            const name = await this.promptForName('Enter file name:');
            if (!name) return;

            const path = window.api.path.join(parentPath, name);
            await window.electron.invoke('fs.createFile', path);
            await this.refreshDirectory(parentPath);
            this.eventBus.emit('file.open', { path, content: '' });
        } catch (error) {
            console.error('Failed to create file:', error);
        }
    }

    async createNewFolder(parentPath = this.currentPath) {
        try {
            const name = await this.promptForName('Enter folder name:');
            if (!name) return;

            const path = window.api.path.join(parentPath, name);
            await window.electron.invoke('fs.createDirectory', path);
            await this.refreshDirectory(parentPath);
        } catch (error) {
            console.error('Failed to create folder:', error);
        }
    }

    async renameItem(path) {
        try {
            const name = await this.promptForName('Enter new name:', window.api.path.basename(path));
            if (!name) return;

            const newPath = window.api.path.join(window.api.path.dirname(path), name);
            await window.electron.invoke('fs.rename', { oldPath: path, newPath });
            await this.refreshDirectory(window.api.path.dirname(path));
        } catch (error) {
            console.error('Failed to rename item:', error);
        }
    }

    async deleteItem(path) {
        try {
            if (confirm('Are you sure you want to delete this item?')) {
                await window.electron.invoke('fs.delete', path);
                await this.refreshDirectory(window.api.path.dirname(path));
            }
        } catch (error) {
            console.error('Failed to delete item:', error);
        }
    }

    copyItem(path) {
        // TODO: Implement copy functionality
    }

    cutItem(path) {
        // TODO: Implement cut functionality
    }

    pasteItem(path) {
        // TODO: Implement paste functionality
    }

    promptForName(message, defaultValue = '') {
        return new Promise(resolve => {
            const name = prompt(message, defaultValue);
            resolve(name ? name.trim() : null);
        });
    }

    async refreshDirectory(path) {
        const dirPath = window.api.path.dirname(path);
        await this.loadDirectory(dirPath || this.currentPath);
    }

    updateGitStatus(changes) {
        this.gitStatus.clear();
        changes.forEach(change => {
            this.gitStatus.set(change.path, {
                status: change.status,
                staged: change.staged,
                type: change.type
            });
        });

        // Update file tree items
        const items = this.fileTree.querySelectorAll('.file-tree-item');
        items.forEach(item => {
            const path = item.dataset.path;
            const status = this.gitStatus.get(path);
            
            if (status) {
                item.dataset.gitStatus = status.status;
                item.dataset.gitStaged = status.staged.toString();
                
                // Add or update status icon
                let statusIcon = item.querySelector('.git-status');
                if (!statusIcon) {
                    statusIcon = document.createElement('span');
                    statusIcon.className = 'git-status';
                    item.insertBefore(statusIcon, item.firstChild);
                }
                statusIcon.dataset.status = status.status;
            } else {
                delete item.dataset.gitStatus;
                delete item.dataset.gitStaged;
                const statusIcon = item.querySelector('.git-status');
                if (statusIcon) {
                    item.removeChild(statusIcon);
                }
            }
        });
    }

    updateBranchIndicator(branch) {
        const branchName = this.branchIndicator.querySelector('.branch-name');
        branchName.textContent = branch;
    }
}
