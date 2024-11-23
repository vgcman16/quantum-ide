export class GitManager {
    constructor({ eventBus }) {
        this.eventBus = eventBus;
        this.isGitRepo = false;
        this.currentBranch = '';
        this.changes = new Map();
        this.initialize();
    }

    async initialize() {
        try {
            // Check if current directory is a git repo
            const isGit = await window.electron.invoke('git.isRepo');
            this.isGitRepo = isGit;

            if (this.isGitRepo) {
                // Get current branch
                this.currentBranch = await window.electron.invoke('git.getCurrentBranch');
                
                // Get initial status
                await this.refreshStatus();

                // Set up event listeners
                this.setupEventListeners();

                // Start watching for changes
                this.startWatching();
            }

            console.log('Git Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Git Manager:', error);
        }
    }

    setupEventListeners() {
        // Listen for file changes
        this.eventBus.on('editor.contentChanged', ({ path }) => {
            this.markFileChanged(path);
        });

        // Listen for file saves
        this.eventBus.on('editor.fileSaved', ({ path }) => {
            this.refreshStatus();
        });

        // Listen for git commands
        this.eventBus.on('git.commit', async ({ message }) => {
            await this.commit(message);
        });

        this.eventBus.on('git.push', async () => {
            await this.push();
        });

        this.eventBus.on('git.pull', async () => {
            await this.pull();
        });

        this.eventBus.on('git.checkout', async ({ branch }) => {
            await this.checkout(branch);
        });
    }

    async refreshStatus() {
        try {
            const status = await window.electron.invoke('git.status');
            this.changes.clear();

            // Process status
            status.files.forEach(file => {
                this.changes.set(file.path, {
                    status: file.status,
                    staged: file.staged,
                    type: file.type
                });
            });

            // Update branch
            this.currentBranch = status.branch;

            // Emit status update
            this.eventBus.emit('git.statusChanged', {
                branch: this.currentBranch,
                changes: Array.from(this.changes.entries()).map(([path, info]) => ({
                    path,
                    ...info
                }))
            });
        } catch (error) {
            console.error('Failed to refresh git status:', error);
        }
    }

    startWatching() {
        // Set up file watcher for git status
        window.electron.receive('git.fileChanged', () => {
            this.refreshStatus();
        });
    }

    markFileChanged(path) {
        if (!this.changes.has(path) || this.changes.get(path).status !== 'modified') {
            this.changes.set(path, {
                status: 'modified',
                staged: false,
                type: 'working'
            });

            this.eventBus.emit('git.statusChanged', {
                branch: this.currentBranch,
                changes: Array.from(this.changes.entries()).map(([path, info]) => ({
                    path,
                    ...info
                }))
            });
        }
    }

    async stage(path) {
        try {
            await window.electron.invoke('git.stage', { path });
            await this.refreshStatus();
        } catch (error) {
            console.error('Failed to stage file:', error);
            throw error;
        }
    }

    async unstage(path) {
        try {
            await window.electron.invoke('git.unstage', { path });
            await this.refreshStatus();
        } catch (error) {
            console.error('Failed to unstage file:', error);
            throw error;
        }
    }

    async commit(message) {
        try {
            await window.electron.invoke('git.commit', { message });
            await this.refreshStatus();
        } catch (error) {
            console.error('Failed to commit changes:', error);
            throw error;
        }
    }

    async push() {
        try {
            await window.electron.invoke('git.push');
            await this.refreshStatus();
        } catch (error) {
            console.error('Failed to push changes:', error);
            throw error;
        }
    }

    async pull() {
        try {
            await window.electron.invoke('git.pull');
            await this.refreshStatus();
        } catch (error) {
            console.error('Failed to pull changes:', error);
            throw error;
        }
    }

    async checkout(branch) {
        try {
            await window.electron.invoke('git.checkout', { branch });
            this.currentBranch = branch;
            await this.refreshStatus();
        } catch (error) {
            console.error('Failed to checkout branch:', error);
            throw error;
        }
    }

    async createBranch(name) {
        try {
            await window.electron.invoke('git.createBranch', { name });
            await this.checkout(name);
        } catch (error) {
            console.error('Failed to create branch:', error);
            throw error;
        }
    }

    async getBranches() {
        try {
            return await window.electron.invoke('git.getBranches');
        } catch (error) {
            console.error('Failed to get branches:', error);
            throw error;
        }
    }

    async getCommitHistory(limit = 50) {
        try {
            return await window.electron.invoke('git.log', { limit });
        } catch (error) {
            console.error('Failed to get commit history:', error);
            throw error;
        }
    }

    async getDiff(path) {
        try {
            return await window.electron.invoke('git.diff', { path });
        } catch (error) {
            console.error('Failed to get diff:', error);
            throw error;
        }
    }

    getFileStatus(path) {
        return this.changes.get(path);
    }

    isFileChanged(path) {
        return this.changes.has(path);
    }

    getCurrentBranch() {
        return this.currentBranch;
    }
}
