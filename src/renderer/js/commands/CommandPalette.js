export class CommandPalette {
    constructor({ eventBus }) {
        this.eventBus = eventBus;
        this.commands = new Map();
        this.element = null;
        this.searchInput = null;
        this.commandList = null;
        this.selectedIndex = 0;
        this.isVisible = false;
        this.initialize();
    }

    initialize() {
        this.createPaletteElement();
        this.setupEventListeners();
        this.registerDefaultCommands();
    }

    createPaletteElement() {
        // Create main container
        this.element = document.createElement('div');
        this.element.className = 'command-palette hidden';
        
        // Create search input
        const searchContainer = document.createElement('div');
        searchContainer.className = 'command-palette-search';
        
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Type a command or search...';
        searchContainer.appendChild(this.searchInput);

        // Create command list
        this.commandList = document.createElement('div');
        this.commandList.className = 'command-palette-list';

        // Assemble palette
        this.element.appendChild(searchContainer);
        this.element.appendChild(this.commandList);

        // Add to document
        document.body.appendChild(this.element);

        // Add styles if not already present
        this.addStyles();
    }

    addStyles() {
        const styleId = 'command-palette-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .command-palette {
                    position: fixed;
                    top: 20%;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 600px;
                    max-width: 90vw;
                    background-color: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    z-index: 9999;
                }

                .command-palette.hidden {
                    display: none;
                }

                .command-palette-search {
                    padding: 8px;
                    border-bottom: 1px solid var(--border-color);
                }

                .command-palette-search input {
                    width: 100%;
                    padding: 8px;
                    background-color: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    color: var(--text-primary);
                    font-size: 14px;
                    outline: none;
                }

                .command-palette-search input:focus {
                    border-color: var(--accent-primary);
                }

                .command-palette-list {
                    max-height: 400px;
                    overflow-y: auto;
                }

                .command-palette-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    color: var(--text-primary);
                }

                .command-palette-item:hover {
                    background-color: var(--bg-tertiary);
                }

                .command-palette-item.selected {
                    background-color: var(--accent-primary);
                    color: #ffffff;
                }

                .command-palette-item .title {
                    flex-grow: 1;
                }

                .command-palette-item .keybinding {
                    margin-left: 16px;
                    opacity: 0.7;
                    font-size: 12px;
                }

                .command-palette-category {
                    padding: 4px 12px;
                    font-size: 11px;
                    text-transform: uppercase;
                    color: var(--text-secondary);
                    background-color: var(--bg-tertiary);
                }
            `;
            document.head.appendChild(style);
        }
    }

    setupEventListeners() {
        // Search input events
        this.searchInput.addEventListener('input', () => {
            this.updateCommandList();
        });

        this.searchInput.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectNextCommand();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.selectPreviousCommand();
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.executeSelectedCommand();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.hide();
                    break;
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.element.contains(e.target)) {
                this.hide();
            }
        });

        // Listen for theme changes
        this.eventBus.on('theme.change', () => {
            if (this.isVisible) {
                this.updateCommandList();
            }
        });
    }

    registerDefaultCommands() {
        // Register some default IDE commands
        const defaultCommands = [
            {
                id: 'palette.show',
                title: 'Show Command Palette',
                category: 'Command Palette',
                keybinding: 'Ctrl+P',
                handler: () => this.show()
            },
            {
                id: 'palette.help',
                title: 'Show Help',
                category: 'Help',
                handler: () => this.showHelp()
            }
        ];

        defaultCommands.forEach(command => this.registerCommand(command));
    }

    registerCommand(command) {
        if (!command.id || !command.title || !command.handler) {
            throw new Error('Invalid command configuration');
        }

        this.commands.set(command.id, {
            ...command,
            category: command.category || 'General'
        });
    }

    unregisterCommand(commandId) {
        this.commands.delete(commandId);
    }

    show() {
        this.isVisible = true;
        this.element.classList.remove('hidden');
        this.searchInput.value = '';
        this.selectedIndex = 0;
        this.updateCommandList();
        this.searchInput.focus();
    }

    hide() {
        this.isVisible = false;
        this.element.classList.add('hidden');
    }

    updateCommandList() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const filteredCommands = Array.from(this.commands.values())
            .filter(command => {
                const searchString = `${command.category} ${command.title}`.toLowerCase();
                return searchString.includes(searchTerm);
            })
            .sort((a, b) => {
                // Sort by category first, then by title
                if (a.category !== b.category) {
                    return a.category.localeCompare(b.category);
                }
                return a.title.localeCompare(b.title);
            });

        this.renderCommandList(filteredCommands);
    }

    renderCommandList(commands) {
        this.commandList.innerHTML = '';
        let currentCategory = null;

        commands.forEach((command, index) => {
            // Add category header if needed
            if (command.category !== currentCategory) {
                currentCategory = command.category;
                const categoryEl = document.createElement('div');
                categoryEl.className = 'command-palette-category';
                categoryEl.textContent = currentCategory;
                this.commandList.appendChild(categoryEl);
            }

            // Add command item
            const item = document.createElement('div');
            item.className = 'command-palette-item';
            if (index === this.selectedIndex) {
                item.classList.add('selected');
            }

            const title = document.createElement('span');
            title.className = 'title';
            title.textContent = command.title;
            item.appendChild(title);

            if (command.keybinding) {
                const keybinding = document.createElement('span');
                keybinding.className = 'keybinding';
                keybinding.textContent = command.keybinding;
                item.appendChild(keybinding);
            }

            item.addEventListener('click', () => {
                this.executeCommand(command.id);
            });

            item.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.updateSelection();
            });

            this.commandList.appendChild(item);
        });

        // Ensure selected item is visible
        const selectedItem = this.commandList.children[this.selectedIndex];
        if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest' });
        }
    }

    selectNextCommand() {
        const items = this.commandList.querySelectorAll('.command-palette-item');
        if (items.length > 0) {
            this.selectedIndex = (this.selectedIndex + 1) % items.length;
            this.updateSelection();
        }
    }

    selectPreviousCommand() {
        const items = this.commandList.querySelectorAll('.command-palette-item');
        if (items.length > 0) {
            this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
            this.updateSelection();
        }
    }

    updateSelection() {
        const items = this.commandList.querySelectorAll('.command-palette-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });

        // Ensure selected item is visible
        const selectedItem = items[this.selectedIndex];
        if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest' });
        }
    }

    executeSelectedCommand() {
        const items = this.commandList.querySelectorAll('.command-palette-item');
        const selectedItem = items[this.selectedIndex];
        if (selectedItem) {
            selectedItem.click();
        }
    }

    executeCommand(commandId) {
        const command = this.commands.get(commandId);
        if (command) {
            this.hide();
            command.handler();
        }
    }

    showHelp() {
        // Implement help documentation
        console.log('Showing help...');
    }
}
