export class EditorManager {
    constructor({ container, eventBus }) {
        this.container = container;
        this.eventBus = eventBus;
        this.editors = new Map();
        this.editorContainers = new Map();
        this.activeEditor = null;
        this.initialize();
    }

    async initialize() {
        try {
            // Create tab bar
            this.tabBar = document.createElement('div');
            this.tabBar.className = 'tab-bar';
            this.container.appendChild(this.tabBar);

            // Create editor area
            this.editorArea = document.createElement('div');
            this.editorArea.className = 'editor-area';
            this.container.appendChild(this.editorArea);

            // Show empty state
            this.showEmptyState();

            // Wait for Monaco to be ready
            await this.waitForMonaco();

            // Set up event listeners
            this.setupEventListeners();

            console.log('Editor Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Editor Manager:', error);
        }
    }

    waitForMonaco() {
        return new Promise((resolve) => {
            if (window.monaco) {
                resolve();
            } else {
                window.addEventListener('monaco-ready', resolve);
            }
        });
    }

    setupEventListeners() {
        // Listen for file open requests
        this.eventBus.on('file.open', ({ path, content }) => {
            this.openFile(path, content);
        });

        // Listen for file save requests
        this.eventBus.on('file.save', () => {
            this.saveCurrentFile();
        });

        // Handle tab clicks
        this.tabBar.addEventListener('click', (e) => {
            const tab = e.target.closest('.tab');
            if (!tab) return;

            // Handle close button click
            if (e.target.closest('.close')) {
                this.closeFile(tab.dataset.path);
                return;
            }

            // Handle tab selection
            this.setActiveFile(tab.dataset.path);
        });
    }

    createEditorContainer() {
        const container = document.createElement('div');
        container.className = 'monaco-editor-container';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.display = 'none';
        this.editorArea.appendChild(container);
        return container;
    }

    createEditor(path, content) {
        // Create container for this editor
        const container = this.createEditorContainer();
        this.editorContainers.set(path, container);

        const editor = monaco.editor.create(container, {
            value: content,
            language: this.getLanguageFromPath(path),
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: {
                enabled: true
            },
            scrollBeyondLastLine: false,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            tabSize: 4,
            insertSpaces: true
        });

        // Set up editor event listeners
        editor.onDidChangeModelContent(() => {
            this.eventBus.emit('editor.contentChanged', {
                path,
                content: editor.getValue()
            });
        });

        return editor;
    }

    getLanguageFromPath(path) {
        const extension = path.split('.').pop().toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'json': 'json',
            'md': 'markdown',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'go': 'go',
            'rs': 'rust',
            'php': 'php',
            'rb': 'ruby',
            'sql': 'sql',
            'sh': 'shell',
            'yml': 'yaml',
            'yaml': 'yaml',
            'xml': 'xml'
        };
        return languageMap[extension] || 'plaintext';
    }

    getFileIcon(path) {
        const extension = path.split('.').pop().toLowerCase();
        const iconMap = {
            'js': '📄',
            'jsx': '⚛️',
            'ts': '📘',
            'tsx': '⚛️',
            'html': '🌐',
            'css': '🎨',
            'scss': '🎨',
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

    createTab(path) {
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.path = path;
        tab.dataset.ext = path.split('.').pop().toLowerCase();

        const icon = document.createElement('span');
        icon.className = 'icon';
        icon.textContent = this.getFileIcon(path);
        tab.appendChild(icon);

        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = path.split('/').pop();
        tab.appendChild(name);

        const close = document.createElement('span');
        close.className = 'close';
        close.innerHTML = '✕';
        tab.appendChild(close);

        return tab;
    }

    async openFile(path, content) {
        try {
            // Check if file is already open
            if (this.editors.has(path)) {
                this.setActiveFile(path);
                return;
            }

            // Hide empty state if shown
            this.hideEmptyState();

            // Create new editor
            const editor = this.createEditor(path, content);
            this.editors.set(path, editor);

            // Create and add tab
            const tab = this.createTab(path);
            this.tabBar.appendChild(tab);

            // Set as active editor
            this.setActiveFile(path);

            // Emit event
            this.eventBus.emit('editor.fileOpened', { path });
        } catch (error) {
            console.error('Failed to open file:', error);
        }
    }

    setActiveFile(path) {
        // Update tabs
        const tabs = this.tabBar.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.path === path);
        });

        // Hide current active editor container
        if (this.activeEditor) {
            const currentContainer = this.editorContainers.get(this.activeEditor);
            if (currentContainer) {
                currentContainer.style.display = 'none';
            }
        }

        // Show and focus new active editor
        const editor = this.editors.get(path);
        const container = this.editorContainers.get(path);
        if (editor && container) {
            container.style.display = 'block';
            editor.focus();
            this.activeEditor = path;
            this.eventBus.emit('editor.activeFileChanged', { path });
        }
    }

    async saveCurrentFile() {
        if (!this.activeEditor) return;

        try {
            const content = this.editors.get(this.activeEditor).getValue();
            await window.electron.invoke('fs.writeFile', {
                path: this.activeEditor,
                content
            });
            this.eventBus.emit('editor.fileSaved', { path: this.activeEditor });
        } catch (error) {
            console.error('Failed to save file:', error);
        }
    }

    closeFile(path) {
        const editor = this.editors.get(path);
        const container = this.editorContainers.get(path);
        if (editor && container) {
            editor.dispose();
            container.remove();
            this.editors.delete(path);
            this.editorContainers.delete(path);

            // Remove tab
            const tab = this.tabBar.querySelector(`[data-path="${path}"]`);
            if (tab) {
                tab.remove();
            }

            // If closing active editor, activate another one if available
            if (path === this.activeEditor) {
                const nextPath = Array.from(this.editors.keys())[0];
                if (nextPath) {
                    this.setActiveFile(nextPath);
                } else {
                    this.activeEditor = null;
                    this.showEmptyState();
                }
            }

            this.eventBus.emit('editor.fileClosed', { path });
        }
    }

    showEmptyState() {
        this.editorArea.innerHTML = `
            <div class="empty-editor">
                <div class="icon">📝</div>
                <div class="message">
                    Open a file from the explorer to start editing
                </div>
            </div>
        `;
    }

    hideEmptyState() {
        // Only clear if showing empty state
        const emptyEditor = this.editorArea.querySelector('.empty-editor');
        if (emptyEditor) {
            this.editorArea.innerHTML = '';
        }
    }

    getOpenFiles() {
        return Array.from(this.editors.keys());
    }

    getActiveFile() {
        return this.activeEditor;
    }

    formatDocument() {
        if (this.activeEditor) {
            const editor = this.editors.get(this.activeEditor);
            editor.getAction('editor.action.formatDocument').run();
        }
    }

    dispose() {
        this.editors.forEach(editor => editor.dispose());
        this.editors.clear();
        this.editorContainers.clear();
        this.activeEditor = null;
    }
}
