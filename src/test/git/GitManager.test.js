import { GitManager } from '../../renderer/js/git/GitManager.js';
import { EventBus } from '../../renderer/js/common/EventBus.js';

describe('GitManager', () => {
    let gitManager;
    let eventBus;
    let mockElectron;

    beforeEach(() => {
        // Mock EventBus
        eventBus = new EventBus();

        // Mock electron API
        mockElectron = {
            invoke: jest.fn(),
            send: jest.fn(),
            receive: jest.fn()
        };
        global.window = {
            electron: mockElectron
        };

        // Create GitManager instance
        gitManager = new GitManager({ eventBus });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        it('should check if directory is a git repo on init', async () => {
            mockElectron.invoke.mockResolvedValueOnce(true);
            await gitManager.initialize();
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.isRepo');
        });

        it('should get current branch if repo exists', async () => {
            mockElectron.invoke
                .mockResolvedValueOnce(true) // isRepo
                .mockResolvedValueOnce('main'); // getCurrentBranch
            await gitManager.initialize();
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.getCurrentBranch');
        });

        it('should not get branch if not a repo', async () => {
            mockElectron.invoke.mockResolvedValueOnce(false);
            await gitManager.initialize();
            expect(mockElectron.invoke).toHaveBeenCalledTimes(1);
        });
    });

    describe('Git operations', () => {
        beforeEach(async () => {
            mockElectron.invoke
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce('main');
            await gitManager.initialize();
            mockElectron.invoke.mockClear();
        });

        it('should stage a file', async () => {
            const path = 'test.js';
            await gitManager.stage(path);
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.stage', { path });
        });

        it('should unstage a file', async () => {
            const path = 'test.js';
            await gitManager.unstage(path);
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.unstage', { path });
        });

        it('should commit changes', async () => {
            const message = 'test commit';
            await gitManager.commit(message);
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.commit', { message });
        });

        it('should push changes', async () => {
            await gitManager.push();
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.push');
        });

        it('should pull changes', async () => {
            await gitManager.pull();
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.pull');
        });

        it('should checkout branch', async () => {
            const branch = 'feature';
            await gitManager.checkout(branch);
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.checkout', { branch });
        });

        it('should create branch', async () => {
            const name = 'feature';
            await gitManager.createBranch(name);
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.createBranch', { name });
        });

        it('should get branches', async () => {
            const mockBranches = [
                { name: 'main', current: true },
                { name: 'develop', current: false }
            ];
            mockElectron.invoke.mockResolvedValueOnce(mockBranches);
            const branches = await gitManager.getBranches();
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.getBranches');
            expect(branches).toEqual(mockBranches);
        });

        it('should get commit history', async () => {
            const limit = 10;
            const mockHistory = [
                { hash: '123', message: 'test commit' }
            ];
            mockElectron.invoke.mockResolvedValueOnce(mockHistory);
            const history = await gitManager.getCommitHistory(limit);
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.log', { limit });
            expect(history).toEqual(mockHistory);
        });
    });

    describe('Event handling', () => {
        beforeEach(async () => {
            mockElectron.invoke
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce('main');
            await gitManager.initialize();
            mockElectron.invoke.mockClear();
        });

        it('should emit status change events', async () => {
            const mockStatus = {
                branch: 'main',
                files: [
                    { path: 'test.js', status: 'modified', staged: false }
                ]
            };
            mockElectron.invoke.mockResolvedValueOnce(mockStatus);

            const statusChangedHandler = jest.fn();
            eventBus.on('git.statusChanged', statusChangedHandler);

            await gitManager.refreshStatus();

            expect(statusChangedHandler).toHaveBeenCalledWith({
                branch: 'main',
                changes: mockStatus.files
            });
        });

        it('should handle file change events', async () => {
            const mockStatus = {
                branch: 'main',
                files: []
            };
            mockElectron.invoke.mockResolvedValueOnce(mockStatus);

            const path = 'test.js';
            eventBus.emit('editor.contentChanged', { path });

            expect(mockElectron.invoke).toHaveBeenCalledWith('git.status');
        });
    });

    describe('Error handling', () => {
        beforeEach(async () => {
            mockElectron.invoke
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce('main');
            await gitManager.initialize();
            mockElectron.invoke.mockClear();
        });

        it('should handle stage errors', async () => {
            const error = new Error('Stage failed');
            mockElectron.invoke.mockRejectedValueOnce(error);

            await expect(gitManager.stage('test.js')).rejects.toThrow('Stage failed');
        });

        it('should handle commit errors', async () => {
            const error = new Error('Commit failed');
            mockElectron.invoke.mockRejectedValueOnce(error);

            await expect(gitManager.commit('test')).rejects.toThrow('Commit failed');
        });

        it('should handle push errors', async () => {
            const error = new Error('Push failed');
            mockElectron.invoke.mockRejectedValueOnce(error);

            await expect(gitManager.push()).rejects.toThrow('Push failed');
        });
    });
});
