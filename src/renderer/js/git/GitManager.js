export class GitManager {
    constructor({ eventBus }) {
        this.eventBus = eventBus;
        this.initialize();
    }

    async initialize() {
        try {
            const isRepo = await window.electron.invoke('git.isRepo');
            if (isRepo) {
                const branch = await window.electron.invoke('git.getCurrentBranch');
                await this.refreshStatus();
            }
            console.log('Git Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Git Manager:', error);
            this.eventBus.emit('git.error', error);
            throw error;
        }
    }

    async refreshStatus() {
        try {
            const status = await window.electron.invoke('git.status');
            this.eventBus.emit('git.statusChanged', {
                branch: status.branch,
                changes: status.files
            });
        } catch (error) {
            console.error('Failed to refresh git status:', error);
            this.eventBus.emit('git.error', error);
        }
    }

    async stage(path) {
        try {
            await window.electron.invoke('git.stage', { path });
            await this.refreshStatus();
        } catch (error) {
            console.error('Failed to stage file:', error);
            this.eventBus.emit('git.error', error);
            throw error;
        }
    }

    async unstage(path) {
        try {
            await window.electron.invoke('git.unstage', { path });
            await this.refreshStatus();
        } catch (error) {
            console.error('Failed to unstage file:', error);
            this.eventBus.emit('git.error', error);
            throw error;
        }
    }

    async commit(message) {
        try {
            await window.electron.invoke('git.commit', { message });
            await this.refreshStatus();
        } catch (error) {
            console.error('Failed to commit changes:', error);
            this.eventBus.emit('git.error', error);
            throw error;
        }
    }

    async push() {
        try {
            await window.electron.invoke('git.push');
            await this.refreshStatus();
        } catch (error) {
            console.error('Failed to push changes:', error);
            this.eventBus.emit('git.error', error);
            throw error;
        }
    }

    async pull() {
        try {
            await window.electron.invoke('git.pull');
            await this.refreshStatus();
        } catch (error) {
            console.error('Failed to pull changes:', error);
            this.eventBus.emit('git.error', error);
            throw error;
        }
    }

    async checkout(branch) {
        try {
            await window.electron.invoke('git.checkout', { branch });
            await this.refreshStatus();
        } catch (error) {
            console.error('Failed to checkout branch:', error);
            this.eventBus.emit('git.error', error);
            throw error;
        }
    }

    async createBranch(name) {
        try {
            await window.electron.invoke('git.createBranch', { name });
            await this.refreshStatus();
        } catch (error) {
            console.error('Failed to create branch:', error);
            this.eventBus.emit('git.error', error);
            throw error;
        }
    }

    async getBranches() {
        try {
            return await window.electron.invoke('git.getBranches');
        } catch (error) {
            console.error('Failed to get branches:', error);
            this.eventBus.emit('git.error', error);
            throw error;
        }
    }

    async getCommitHistory(limit = 10) {
        try {
            return await window.electron.invoke('git.log', { limit });
        } catch (error) {
            console.error('Failed to get commit history:', error);
            this.eventBus.emit('git.error', error);
            throw error;
        }
    }

    // Event handlers
    setupEventHandlers() {
        this.eventBus.on('editor.contentChanged', async ({ path }) => {
            await this.refreshStatus();
        });
    }
}
