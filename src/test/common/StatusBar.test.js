import { StatusBar } from '../../renderer/js/common/StatusBar.js';
import { EventBus } from '../../renderer/js/common/EventBus.js';

describe('StatusBar', () => {
    let statusBar;
    let container;
    let eventBus;

    beforeEach(() => {
        // Set up DOM
        container = document.createElement('div');
        document.body.appendChild(container);

        // Mock window.api
        global.window = {
            api: {
                platform: 'darwin'
            }
        };

        // Create EventBus
        eventBus = new EventBus();

        // Create StatusBar instance
        statusBar = new StatusBar({ container, eventBus });
    });

    afterEach(() => {
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        it('should create status bar elements', () => {
            expect(container.querySelector('.status-bar')).toBeTruthy();
            expect(container.querySelector('.git-info')).toBeTruthy();
            expect(container.querySelector('.cursor-position')).toBeTruthy();
            expect(container.querySelector('.file-info')).toBeTruthy();
        });

        it('should initialize with default values', () => {
            expect(container.querySelector('.branch-name').textContent).toBe('main');
            expect(container.querySelector('.cursor-position').textContent).toBe('Ln 1, Col 1');
            expect(container.querySelector('.encoding').textContent).toBe('UTF-8');
        });
    });

    describe('Git info updates', () => {
        it('should update branch name', () => {
            const branch = 'feature';
            eventBus.emit('git.statusChanged', { branch, changes: [] });
            expect(container.querySelector('.branch-name').textContent).toBe('feature');
        });

        it('should show unpushed changes count', () => {
            const changes = [
                { status: 'modified', staged: false },
                { status: 'added', staged: true }
            ];
            eventBus.emit('git.statusChanged', { branch: 'main', changes });
            expect(container.querySelector('.up-arrow').textContent).toBe('↑2');
            expect(container.querySelector('.up-arrow').classList.contains('has-changes')).toBe(true);
        });

        it('should handle empty changes array', () => {
            eventBus.emit('git.statusChanged', { branch: 'main', changes: [] });
            expect(container.querySelector('.up-arrow').textContent).toBe('↑0');
            expect(container.querySelector('.up-arrow').classList.contains('has-changes')).toBe(false);
        });

        it('should emit branch selection event on click', () => {
            const emitSpy = jest.spyOn(eventBus, 'emit');
            container.querySelector('.branch-name').click();
            expect(emitSpy).toHaveBeenCalledWith('git.showBranches');
        });

        it('should emit sync event on sync status click', () => {
            const emitSpy = jest.spyOn(eventBus, 'emit');
            container.querySelector('.sync-status').click();
            expect(emitSpy).toHaveBeenCalledWith('git.showSync');
        });
    });

    describe('Cursor position updates', () => {
        it('should update cursor position', () => {
            eventBus.emit('editor.cursorChanged', { line: 10, column: 5 });
            expect(container.querySelector('.cursor-position').textContent).toBe('Ln 10, Col 5');
        });

        it('should handle zero-based positions', () => {
            eventBus.emit('editor.cursorChanged', { line: 0, column: 0 });
            expect(container.querySelector('.cursor-position').textContent).toBe('Ln 0, Col 0');
        });
    });

    describe('File info updates', () => {
        it('should update file info for Python files', () => {
            eventBus.emit('editor.activeFileChanged', { path: 'test.py' });
            expect(container.querySelector('.indent-type').textContent).toBe('Spaces: 4');
        });

        it('should update file info for JavaScript files', () => {
            eventBus.emit('editor.activeFileChanged', { path: 'test.js' });
            expect(container.querySelector('.indent-type').textContent).toBe('Spaces: 2');
        });

        it('should update line ending based on platform', () => {
            eventBus.emit('editor.activeFileChanged', { path: 'test.js' });
            expect(container.querySelector('.line-ending').textContent).toBe('LF');

            // Test Windows platform
            window.api.platform = 'win32';
            eventBus.emit('editor.activeFileChanged', { path: 'test.js' });
            expect(container.querySelector('.line-ending').textContent).toBe('CRLF');
        });

        it('should hide file info when no file is active', () => {
            eventBus.emit('editor.activeFileChanged', { path: null });
            expect(container.querySelector('.file-info').style.display).toBe('none');
        });

        it('should show file info when file is active', () => {
            eventBus.emit('editor.activeFileChanged', { path: 'test.js' });
            expect(container.querySelector('.file-info').style.display).toBe('flex');
        });
    });

    describe('Message display', () => {
        it('should show and auto-hide messages', (done) => {
            statusBar.showMessage('Test message', 'info');
            const message = container.querySelector('.status-message');
            expect(message).toBeTruthy();
            expect(message.textContent).toBe('Test message');
            expect(message.classList.contains('info')).toBe(true);

            // Check message is removed after timeout
            setTimeout(() => {
                expect(container.querySelector('.status-message')).toBeFalsy();
                done();
            }, 3100);
        });

        it('should handle different message types', () => {
            statusBar.showMessage('Warning message', 'warning');
            const message = container.querySelector('.status-message');
            expect(message.classList.contains('warning')).toBe(true);
        });

        it('should handle multiple messages', () => {
            statusBar.showMessage('First message', 'info');
            statusBar.showMessage('Second message', 'warning');
            const messages = container.querySelectorAll('.status-message');
            expect(messages.length).toBe(2);
        });
    });

    describe('Event handling', () => {
        it('should handle multiple events simultaneously', () => {
            eventBus.emit('git.statusChanged', { branch: 'feature', changes: [] });
            eventBus.emit('editor.cursorChanged', { line: 5, column: 10 });
            eventBus.emit('editor.activeFileChanged', { path: 'test.py' });

            expect(container.querySelector('.branch-name').textContent).toBe('feature');
            expect(container.querySelector('.cursor-position').textContent).toBe('Ln 5, Col 10');
            expect(container.querySelector('.indent-type').textContent).toBe('Spaces: 4');
        });

        it('should handle rapid event updates', () => {
            for (let i = 0; i < 100; i++) {
                eventBus.emit('editor.cursorChanged', { line: i, column: i });
            }
            expect(container.querySelector('.cursor-position').textContent).toBe('Ln 99, Col 99');
        });
    });
});
