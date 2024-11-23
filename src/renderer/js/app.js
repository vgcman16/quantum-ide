import { EditorManager } from './editor/EditorManager.js';
import { FileExplorer } from './explorer/FileExplorer.js';
import { Terminal } from './terminal/Terminal.js';
import { EventBus } from './common/EventBus.js';
import { ThemeManager } from './common/ThemeManager.js';
import { CommandPalette } from './commands/CommandPalette.js';
import { SearchPanel } from './search/SearchPanel.js';
import { GitManager } from './git/GitManager.js';
import { StatusBar } from './common/StatusBar.js';

class QuantumIDEApp {
    constructor() {
        this.eventBus = new EventBus();
        this.initialize();
    }

    async initialize() {
        try {
            // Initialize core services
            this.themeManager = new ThemeManager();

            // Initialize UI components
            this.initializeComponents();

            // Set up IPC communication
            this.setupIPC();

            // Set up global keyboard shortcuts
            this.setupKeyboardShortcuts();

            // Wait for Monaco to be ready
            await this.waitForMonaco();

            // Initialize theme after Monaco is ready
            await this.themeManager.initialize();

            // Load last session state
            await this.loadSessionState();

            console.log('Quantum IDE initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Quantum IDE:', error);
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

    initializeComponents() {
        // Initialize editor
        this.editorManager = new EditorManager({
            container: document.getElementById('editor-container'),
            eventBus: this.eventBus
        });

        // Initialize file explorer
        this.fileExplorer = new FileExplorer({
            container: document.getElementById('file-explorer'),
            eventBus: this.eventBus
        });

        // Initialize terminal
        this.terminal = new Terminal({
            container: document.getElementById('terminal-panel'),
            eventBus: this.eventBus
        });

        // Initialize search panel
        this.searchPanel = new SearchPanel({
            container: document.getElementById('search-panel'),
            eventBus: this.eventBus
        });

        // Initialize Git manager
        this.gitManager = new GitManager({
            eventBus: this.eventBus
        });

        // Initialize status bar
        this.statusBar = new StatusBar({
            container: document.getElementById('status-bar'),
            eventBus: this.eventBus
        });

        // Initialize command palette
        this.commandPalette = new CommandPalette({
            eventBus: this.eventBus
        });

        // Register core commands
        this.registerCommands();
    }

    setupIPC() {
        // Handle IPC messages from main process
        window.electron.receive('app-event', (event, data) => {
            this.eventBus.emit(event, data);
        });

        // Handle search result selection
        this.eventBus.on('search.resultSelected', async ({ file, line, column }) => {
            try {
                const content = await window.electron.invoke('fs.readFile', file);
                await this.editorManager.openFile(file, content);
                const editor = this.editorManager.editors.get(file);
                if (editor) {
                    // Convert line and column to position
                    const position = editor.getModel().getPositionAt(
                        editor.getModel().getOffsetAt({ lineNumber: line, column: column })
                    );
                    // Reveal the line
                    editor.revealLineInCenter(position.lineNumber);
                    // Set cursor and selection
                    editor.setPosition(position);
                    editor.setSelection({
                        startLineNumber: position.lineNumber,
                        startColumn: position.column,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column
                    });
                    editor.focus();
                }
            } catch (error) {
                console.error('Failed to open search result:', error);
            }
        });

        // Handle Git status changes
        this.eventBus.on('git.statusChanged', ({ branch, changes }) => {
            // Update file explorer with Git status
            this.fileExplorer.updateGitStatus(changes);
            // Update status bar with Git info
            this.statusBar.updateGitInfo(branch, changes);
        });

        // Handle editor cursor position changes
        this.eventBus.on('editor.cursorChanged', ({ line, column }) => {
            this.statusBar.updateCursorPosition(line, column);
        });

        // Handle active file changes
        this.eventBus.on('editor.activeFileChanged', ({ path }) => {
            this.statusBar.updateFileInfo(path);
        });

        // Handle Git branch selection
        this.eventBus.on('git.showBranches', async () => {
            try {
                const branches = await window.electron.invoke('git.getBranches');
                // TODO: Show branch selection UI
                this.commandPalette.show('Switch Branch', branches.map(b => ({
                    label: b.name,
                    handler: () => this.gitManager.checkout(b.name)
                })));
            } catch (error) {
                console.error('Failed to get branches:', error);
                this.statusBar.showMessage('Failed to get branches', 'error');
            }
        });

        // Handle Git sync
        this.eventBus.on('git.showSync', async () => {
            try {
                await this.gitManager.pull();
                await this.gitManager.push();
                this.statusBar.showMessage('Successfully synced with remote', 'success');
            } catch (error) {
                console.error('Failed to sync with remote:', error);
                this.statusBar.showMessage('Failed to sync with remote', 'error');
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Command palette: Ctrl/Cmd + P
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                this.commandPalette.show();
            }

            // Save: Ctrl/Cmd + S
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.editorManager.saveCurrentFile();
            }

            // New file: Ctrl/Cmd + N
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.fileExplorer.createNewFile();
            }

            // Toggle terminal: Ctrl/Cmd + `
            if ((e.ctrlKey || e.metaKey) && e.key === '`') {
                e.preventDefault();
                this.terminal.toggle();
            }

            // Find in files: Ctrl/Cmd + Shift + F
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                this.eventBus.emit('view.showSearch');
            }

            // Git commit: Ctrl/Cmd + Shift + G
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
                e.preventDefault();
                this.eventBus.emit('git.showCommit');
            }
        });
    }

    registerCommands() {
        const commands = [
            {
                id: 'file.new',
                title: 'New File',
                keybinding: 'Ctrl+N',
                handler: () => this.fileExplorer.createNewFile()
            },
            {
                id: 'file.save',
                title: 'Save File',
                keybinding: 'Ctrl+S',
                handler: () => this.editorManager.saveCurrentFile()
            },
            {
                id: 'view.toggleTerminal',
                title: 'Toggle Terminal',
                keybinding: 'Ctrl+`',
                handler: () => this.terminal.toggle()
            },
            {
                id: 'view.showSearch',
                title: 'Find in Files',
                keybinding: 'Ctrl+Shift+F',
                handler: () => this.eventBus.emit('view.showSearch')
            },
            {
                id: 'git.commit',
                title: 'Git: Commit',
                keybinding: 'Ctrl+Shift+G',
                handler: () => this.eventBus.emit('git.showCommit')
            },
            {
                id: 'git.push',
                title: 'Git: Push',
                handler: () => this.gitManager.push()
            },
            {
                id: 'git.pull',
                title: 'Git: Pull',
                handler: () => this.gitManager.pull()
            },
            {
                id: 'git.sync',
                title: 'Git: Sync',
                handler: () => this.eventBus.emit('git.showSync')
            },
            {
                id: 'git.checkout',
                title: 'Git: Checkout Branch',
                handler: () => this.eventBus.emit('git.showBranches')
            },
            {
                id: 'edit.format',
                title: 'Format Document',
                keybinding: 'Shift+Alt+F',
                handler: () => this.editorManager.formatDocument()
            }
        ];

        commands.forEach(command => {
            this.commandPalette.registerCommand(command);
        });
    }

    async loadSessionState() {
        try {
            const sessionData = localStorage.getItem('quantum-ide-session');
            if (!sessionData) return;

            const state = JSON.parse(sessionData);
            
            // Wait for editor to be ready
            await this.editorManager.waitForMonaco();

            // Restore open files
            if (state.openFiles && Array.isArray(state.openFiles)) {
                for (const filePath of state.openFiles) {
                    if (typeof filePath === 'string' && filePath.trim()) {
                        try {
                            const content = await window.electron.invoke('fs.readFile', filePath);
                            await this.editorManager.openFile(filePath, content);
                        } catch (error) {
                            console.error(`Failed to restore file: ${filePath}`, error);
                        }
                    }
                }
            }

            // Restore active file
            if (state.activeFile && typeof state.activeFile === 'string' && 
                this.editorManager.editors.has(state.activeFile)) {
                this.editorManager.setActiveFile(state.activeFile);
            }

            // Restore terminal state
            if (state.terminal) {
                this.terminal.restoreState(state.terminal);
            }
        } catch (error) {
            console.error('Failed to load session state:', error);
        }
    }

    saveSessionState() {
        try {
            const state = {
                openFiles: this.editorManager.getOpenFiles(),
                activeFile: this.editorManager.getActiveFile(),
                terminal: this.terminal.getState()
            };
            localStorage.setItem('quantum-ide-session', JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save session state:', error);
        }
    }
}

// Initialize the app when the window loads
window.addEventListener('load', () => {
    window.app = new QuantumIDEApp();
});

// Save session state before unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.saveSessionState();
    }
});
