export class ThemeManager {
    constructor() {
        this.currentTheme = 'dark';
        this.themes = {
            dark: {
                type: 'dark',
                colors: {
                    background: '#1e1e1e',
                    foreground: '#d4d4d4',
                    sidebarBackground: '#252526',
                    sidebarForeground: '#cccccc',
                    editorBackground: '#1e1e1e',
                    editorForeground: '#d4d4d4',
                    terminalBackground: '#1e1e1e',
                    terminalForeground: '#d4d4d4'
                },
                editor: {
                    base: 'vs-dark',
                    rules: [
                        { token: 'comment', foreground: '6A9955' },
                        { token: 'string', foreground: 'CE9178' },
                        { token: 'keyword', foreground: '569CD6' },
                        { token: 'number', foreground: 'B5CEA8' },
                        { token: 'operator', foreground: 'D4D4D4' }
                    ],
                    colors: {
                        'editor.background': '#1e1e1e',
                        'editor.foreground': '#d4d4d4',
                        'editorLineNumber.foreground': '#858585',
                        'editor.selectionBackground': '#264f78',
                        'editor.inactiveSelectionBackground': '#3a3d41'
                    }
                }
            },
            light: {
                type: 'light',
                colors: {
                    background: '#ffffff',
                    foreground: '#000000',
                    sidebarBackground: '#f3f3f3',
                    sidebarForeground: '#333333',
                    editorBackground: '#ffffff',
                    editorForeground: '#000000',
                    terminalBackground: '#ffffff',
                    terminalForeground: '#000000'
                },
                editor: {
                    base: 'vs',
                    rules: [
                        { token: 'comment', foreground: '008000' },
                        { token: 'string', foreground: 'A31515' },
                        { token: 'keyword', foreground: '0000FF' },
                        { token: 'number', foreground: '098658' },
                        { token: 'operator', foreground: '000000' }
                    ],
                    colors: {
                        'editor.background': '#ffffff',
                        'editor.foreground': '#000000',
                        'editorLineNumber.foreground': '#237893',
                        'editor.selectionBackground': '#add6ff',
                        'editor.inactiveSelectionBackground': '#e5ebf1'
                    }
                }
            }
        };
    }

    async initialize() {
        try {
            // Wait for Monaco to be ready
            await this.waitForMonaco();

            // Apply initial theme
            await this.setTheme(this.currentTheme);

            // Load saved theme preference
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme && this.themes[savedTheme]) {
                await this.setTheme(savedTheme);
            }

            console.log('Theme Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Theme Manager:', error);
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

    async setTheme(themeName) {
        if (!this.themes[themeName]) {
            console.error(`Theme '${themeName}' not found`);
            return;
        }

        const theme = this.themes[themeName];
        this.currentTheme = themeName;

        // Apply CSS variables
        document.documentElement.style.setProperty('--background-color', theme.colors.background);
        document.documentElement.style.setProperty('--foreground-color', theme.colors.foreground);
        document.documentElement.style.setProperty('--sidebar-background', theme.colors.sidebarBackground);
        document.documentElement.style.setProperty('--sidebar-foreground', theme.colors.sidebarForeground);
        document.documentElement.style.setProperty('--editor-background', theme.colors.editorBackground);
        document.documentElement.style.setProperty('--editor-foreground', theme.colors.editorForeground);
        document.documentElement.style.setProperty('--terminal-background', theme.colors.terminalBackground);
        document.documentElement.style.setProperty('--terminal-foreground', theme.colors.terminalForeground);

        // Apply editor theme
        await this.applyEditorTheme(theme.editor);

        // Save theme preference
        localStorage.setItem('theme', themeName);

        console.log(`Theme '${themeName}' applied successfully`);
    }

    async applyEditorTheme(editorTheme) {
        try {
            // Wait for Monaco to be ready
            await this.waitForMonaco();

            // Define the theme
            monaco.editor.defineTheme('custom-theme', {
                base: editorTheme.base,
                inherit: true,
                rules: editorTheme.rules,
                colors: editorTheme.colors
            });

            // Set as active theme
            monaco.editor.setTheme('custom-theme');
        } catch (error) {
            console.error('Failed to apply editor theme:', error);
        }
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    getThemeData(themeName) {
        return this.themes[themeName];
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
}
