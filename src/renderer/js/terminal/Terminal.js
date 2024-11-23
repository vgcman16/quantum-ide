export class Terminal {
    constructor({ container, eventBus }) {
        this.container = container;
        this.eventBus = eventBus;
        this.xterm = null;
        this.pty = null;
        this.fitAddon = null;
        this.isVisible = true;
        this.history = [];
        this.historyIndex = -1;
        this.initialize();
    }

    async initialize() {
        try {
            // Initialize xterm.js using global objects
            this.xterm = new window.Terminal({
                cursorBlink: true,
                cursorStyle: 'block',
                fontSize: 14,
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                theme: {
                    background: '#1E1E1E',
                    foreground: '#D4D4D4',
                    cursor: '#FFFFFF',
                    selection: '#264F78',
                    black: '#000000',
                    red: '#CD3131',
                    green: '#0DBC79',
                    yellow: '#E5E510',
                    blue: '#2472C8',
                    magenta: '#BC3FBC',
                    cyan: '#11A8CD',
                    white: '#E5E5E5',
                    brightBlack: '#666666',
                    brightRed: '#F14C4C',
                    brightGreen: '#23D18B',
                    brightYellow: '#F5F543',
                    brightBlue: '#3B8EEA',
                    brightMagenta: '#D670D6',
                    brightCyan: '#29B8DB',
                    brightWhite: '#E5E5E5'
                }
            });

            // Initialize addons using global objects
            this.fitAddon = new window.FitAddon.FitAddon();
            this.searchAddon = new window.SearchAddon.SearchAddon();
            this.webLinksAddon = new window.WebLinksAddon.WebLinksAddon();

            // Load addons
            this.xterm.loadAddon(this.fitAddon);
            this.xterm.loadAddon(this.searchAddon);
            this.xterm.loadAddon(this.webLinksAddon);

            // Open terminal in container
            this.xterm.open(this.container);
            this.fitAddon.fit();

            // Initialize PTY process
            await this.initializePTY();

            // Set up event listeners
            this.setupEventListeners();

            // Set up resize observer
            this.setupResizeObserver();

            console.log('Terminal initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Terminal:', error);
        }
    }

    async initializePTY() {
        try {
            // Create PTY process
            const { cols, rows } = this.xterm;
            const ptyProcess = await window.electron.invoke('terminal.create', { cols, rows });

            // Set up data handling
            window.electron.receive('terminal.data', (data) => {
                this.xterm.write(data);
            });

            // Handle terminal input
            this.xterm.onData(data => {
                window.electron.invoke('terminal.write', data);
            });

            // Store PTY process ID
            this.pty = ptyProcess;
        } catch (error) {
            console.error('Failed to initialize PTY:', error);
        }
    }

    setupEventListeners() {
        // Handle terminal resize
        this.xterm.onResize(({ cols, rows }) => {
            if (this.pty) {
                window.electron.invoke('terminal.resize', { cols, rows });
            }
        });

        // Handle key combinations
        this.xterm.attachCustomKeyEventHandler((event) => {
            // Ctrl+C: Copy selected text
            if (event.ctrlKey && event.code === 'KeyC' && this.xterm.hasSelection()) {
                const selection = this.xterm.getSelection();
                navigator.clipboard.writeText(selection);
                return false;
            }

            // Ctrl+V: Paste
            if (event.ctrlKey && event.code === 'KeyV') {
                navigator.clipboard.readText().then(text => {
                    window.electron.invoke('terminal.write', text);
                });
                return false;
            }

            // Ctrl+K: Clear terminal
            if (event.ctrlKey && event.code === 'KeyK') {
                this.clear();
                return false;
            }

            return true;
        });

        // Handle terminal focus
        this.container.addEventListener('focus', () => {
            this.container.classList.add('focused');
            this.xterm.focus();
        });

        this.container.addEventListener('blur', () => {
            this.container.classList.remove('focused');
        });

        // Listen for theme changes
        this.eventBus.on('theme.change', (theme) => {
            this.updateTheme(theme);
        });
    }

    setupResizeObserver() {
        const resizeObserver = new ResizeObserver(() => {
            this.fitAddon.fit();
        });

        resizeObserver.observe(this.container);
    }

    updateTheme(theme) {
        const themes = {
            'dark': {
                background: '#1E1E1E',
                foreground: '#D4D4D4'
            },
            'light': {
                background: '#FFFFFF',
                foreground: '#000000'
            }
        };

        if (themes[theme]) {
            this.xterm.setOption('theme', {
                ...this.xterm.getOption('theme'),
                ...themes[theme]
            });
        }
    }

    clear() {
        this.xterm.clear();
        this.xterm.write('\x1b[2J\x1b[H');
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'block' : 'none';
        if (this.isVisible) {
            this.fitAddon.fit();
            this.xterm.focus();
        }
    }

    write(data) {
        this.xterm.write(data);
    }

    writeLine(data) {
        this.write(data + '\r\n');
    }

    focus() {
        this.xterm.focus();
    }

    getState() {
        return {
            history: this.history,
            isVisible: this.isVisible
        };
    }

    restoreState(state) {
        if (state.history) {
            this.history = state.history;
        }

        if (typeof state.isVisible === 'boolean') {
            this.isVisible = state.isVisible;
            this.container.style.display = this.isVisible ? 'block' : 'none';
        }
    }

    dispose() {
        if (this.pty) {
            window.electron.invoke('terminal.destroy', this.pty);
        }
        
        if (this.xterm) {
            this.xterm.dispose();
        }
    }
}
