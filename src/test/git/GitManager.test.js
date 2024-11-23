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
        window.electron = mockElectron;

        // Create GitManager instance
        gitManager = new GitManager({ eventBus });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        it('should check if directory is a git repo on init', async () => {
            mockElectron.invoke.mockResolvedValueOnce(true);
            mockElectron.invoke.mockResolvedValueOnce('main');
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
            // Create a new instance to avoid constructor initialization
            const newGitManager = new GitManager({ eventBus });
            mockElectron.invoke.mockResolvedValueOnce(false);
            await newGitManager.initialize();
            expect(mockElectron.invoke).toHaveBeenCalledTimes(1);
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.isRepo');
        });

        it('should emit initialization error', async () => {
            const error = new Error('Git not found');
            mockElectron.invoke.mockRejectedValueOnce(error);

            const errorHandler = jest.fn();
            eventBus.on('git.error', errorHandler);

            await expect(gitManager.initialize()).rejects.toThrow('Git not found');
            expect(errorHandler).toHaveBeenCalledWith(error);
        });
    });

    describe('Git operations', () => {
        beforeEach(async () => {
            mockElectron.invoke
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce('main')
                .mockResolvedValueOnce({ branch: 'main', files: [] }); // status
            await gitManager.initialize();
            mockElectron.invoke.mockClear();
        });

        it('should stage a file', async () => {
            const path = 'test.js';
            mockElectron.invoke
                .mockResolvedValueOnce(undefined) // stage
                .mockResolvedValueOnce({ branch: 'main', files: [] }); // status
            await gitManager.stage(path);
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.stage', { path });
        });

        it('should unstage a file', async () => {
            const path = 'test.js';
            mockElectron.invoke
                .mockResolvedValueOnce(undefined) // unstage
                .mockResolvedValueOnce({ branch: 'main', files: [] }); // status
            await gitManager.unstage(path);
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.unstage', { path });
        });

        it('should commit changes', async () => {
            const message = 'test commit';
            mockElectron.invoke
                .mockResolvedValueOnce(undefined) // commit
                .mockResolvedValueOnce({ branch: 'main', files: [] }); // status
            await gitManager.commit(message);
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.commit', { message });
        });

        it('should push changes', async () => {
            mockElectron.invoke
                .mockResolvedValueOnce(undefined) // push
                .mockResolvedValueOnce({ branch: 'main', files: [] }); // status
            await gitManager.push();
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.push');
        });

        it('should pull changes', async () => {
            mockElectron.invoke
                .mockResolvedValueOnce(undefined) // pull
                .mockResolvedValueOnce({ branch: 'main', files: [] }); // status
            await gitManager.pull();
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.pull');
        });

        it('should checkout branch', async () => {
            const branch = 'feature';
            mockElectron.invoke
                .mockResolvedValueOnce(undefined) // checkout
                .mockResolvedValueOnce({ branch: 'feature', files: [] }); // status
            await gitManager.checkout(branch);
            expect(mockElectron.invoke).toHaveBeenCalledWith('git.checkout', { branch });
        });

        it('should create branch', async () => {
            const name = 'feature';
            mockElectron.invoke
                .mockResolvedValueOnce(undefined) // createBranch
                .mockResolvedValueOnce({ branch: 'feature', files: [] }); // status
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
                .mockResolvedValueOnce('main')
                .mockResolvedValueOnce({ branch: 'main', files: [] }); // status
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
            mockElectron.invoke.mockResolvedValueOnce({ branch: 'main', files: [] });
            gitManager.setupEventHandlers();

            const path = 'test.js';
            eventBus.emit('editor.contentChanged', { path });

            // Wait for async operation to complete
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockElectron.invoke).toHaveBeenCalledWith('git.status');
        });

        it('should emit error events', async () => {
            const error = new Error('Git error');
            mockElectron.invoke.mockRejectedValueOnce(error);

            const errorHandler = jest.fn();
            eventBus.on('git.error', errorHandler);

            await expect(gitManager.refreshStatus()).rejects.toThrow('Git error');
            expect(errorHandler).toHaveBeenCalledWith(error);
        });
    });

    describe('Error handling', () => {
        beforeEach(async () => {
            mockElectron.invoke
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce('main')
                .mockResolvedValueOnce({ branch: 'main', files: [] }); // status
            await gitManager.initialize();
            mockElectron.invoke.mockClear();
        });

        it('should handle stage errors', async () => {
            const error = new Error('Stage failed');
            mockElectron.invoke.mockRejectedValueOnce(error);

            const errorHandler = jest.fn();
            eventBus.on('git.error', errorHandler);

            await expect(gitManager.stage('test.js')).rejects.toThrow('Stage failed');
            expect(errorHandler).toHaveBeenCalledWith(error);
        });

        it('should handle commit errors', async () => {
            const error = new Error('Commit failed');
            mockElectron.invoke.mockRejectedValueOnce(error);

            const errorHandler = jest.fn();
            eventBus.on('git.error', errorHandler);

            await expect(gitManager.commit('test')).rejects.toThrow('Commit failed');
            expect(errorHandler).toHaveBeenCalledWith(error);
        });

        it('should handle push errors', async () => {
            const error = new Error('Push failed');
            mockElectron.invoke.mockRejectedValueOnce(error);

            const errorHandler = jest.fn();
            eventBus.on('git.error', errorHandler);

            await expect(gitManager.push()).rejects.toThrow('Push failed');
            expect(errorHandler).toHaveBeenCalledWith(error);
        });

        it('should handle branch checkout errors', async () => {
            const error = new Error('Checkout failed');
            mockElectron.invoke.mockRejectedValueOnce(error);

            const errorHandler = jest.fn();
            eventBus.on('git.error', errorHandler);

            await expect(gitManager.checkout('feature')).rejects.toThrow('Checkout failed');
            expect(errorHandler).toHaveBeenCalledWith(error);
        });
    });
});
