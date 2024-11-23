export class SearchPanel {
    constructor({ container, eventBus }) {
        this.container = container;
        this.eventBus = eventBus;
        this.searchResults = new Map();
        this.initialize();
    }

    initialize() {
        this.createSearchInterface();
        this.setupEventListeners();
    }

    createSearchInterface() {
        this.container.innerHTML = `
            <div class="search-container">
                <div class="search-input-container">
                    <input type="text" class="search-input" placeholder="Search in files...">
                    <div class="search-options">
                        <label title="Match Case">
                            <input type="checkbox" class="match-case">
                            Aa
                        </label>
                        <label title="Match Whole Word">
                            <input type="checkbox" class="whole-word">
                            \\b
                        </label>
                        <label title="Use Regular Expression">
                            <input type="checkbox" class="use-regex">
                            .*
                        </label>
                    </div>
                </div>
                <div class="search-replace-container">
                    <input type="text" class="replace-input" placeholder="Replace...">
                    <button class="replace-button">Replace</button>
                    <button class="replace-all-button">Replace All</button>
                </div>
                <div class="search-results"></div>
            </div>
        `;

        // Cache DOM elements
        this.searchInput = this.container.querySelector('.search-input');
        this.replaceInput = this.container.querySelector('.replace-input');
        this.matchCase = this.container.querySelector('.match-case');
        this.wholeWord = this.container.querySelector('.whole-word');
        this.useRegex = this.container.querySelector('.use-regex');
        this.resultsContainer = this.container.querySelector('.search-results');
    }

    setupEventListeners() {
        // Search input
        let debounceTimeout;
        this.searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => this.performSearch(), 300);
        });

        // Search options
        this.matchCase.addEventListener('change', () => this.performSearch());
        this.wholeWord.addEventListener('change', () => this.performSearch());
        this.useRegex.addEventListener('change', () => this.performSearch());

        // Replace buttons
        this.container.querySelector('.replace-button').addEventListener('click', () => {
            this.replaceNext();
        });

        this.container.querySelector('.replace-all-button').addEventListener('click', () => {
            this.replaceAll();
        });

        // Result item clicks
        this.resultsContainer.addEventListener('click', (e) => {
            const resultItem = e.target.closest('.search-result-item');
            if (resultItem) {
                const { file, line, column } = resultItem.dataset;
                this.eventBus.emit('search.resultSelected', { file, line: parseInt(line), column: parseInt(column) });
            }
        });
    }

    async performSearch() {
        const searchTerm = this.searchInput.value;
        if (!searchTerm) {
            this.clearResults();
            return;
        }

        try {
            // Build regex pattern based on options
            let flags = 'g';
            if (!this.matchCase.checked) flags += 'i';
            
            let pattern = searchTerm;
            if (!this.useRegex.checked) pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (this.wholeWord.checked) pattern = `\\b${pattern}\\b`;

            const regex = new RegExp(pattern, flags);

            // Perform search using IPC
            const results = await window.electron.invoke('search.inFiles', {
                pattern: regex.source,
                flags: regex.flags
            });

            this.displayResults(results);
        } catch (error) {
            console.error('Search failed:', error);
            this.showError('Search failed: ' + error.message);
        }
    }

    displayResults(results) {
        this.clearResults();
        
        if (results.length === 0) {
            this.resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
            return;
        }

        // Group results by file
        const fileGroups = new Map();
        results.forEach(result => {
            if (!fileGroups.has(result.file)) {
                fileGroups.set(result.file, []);
            }
            fileGroups.get(result.file).push(result);
        });

        // Create result elements
        fileGroups.forEach((matches, file) => {
            const fileGroup = document.createElement('div');
            fileGroup.className = 'search-result-file';
            
            const fileHeader = document.createElement('div');
            fileHeader.className = 'search-result-file-header';
            fileHeader.innerHTML = `
                <span class="file-icon">${this.getFileIcon(file)}</span>
                <span class="file-name">${file.split('/').pop()}</span>
                <span class="match-count">${matches.length} matches</span>
            `;
            fileGroup.appendChild(fileHeader);

            const matchesList = document.createElement('div');
            matchesList.className = 'search-result-matches';

            matches.forEach(match => {
                const matchItem = document.createElement('div');
                matchItem.className = 'search-result-item';
                matchItem.dataset.file = match.file;
                matchItem.dataset.line = match.line;
                matchItem.dataset.column = match.column;

                const lineNumber = document.createElement('span');
                lineNumber.className = 'line-number';
                lineNumber.textContent = match.line;

                const lineContent = document.createElement('span');
                lineContent.className = 'line-content';
                lineContent.innerHTML = this.highlightMatch(match.text, match.column, match.length);

                matchItem.appendChild(lineNumber);
                matchItem.appendChild(lineContent);
                matchesList.appendChild(matchItem);
            });

            fileGroup.appendChild(matchesList);
            this.resultsContainer.appendChild(fileGroup);
        });
    }

    highlightMatch(text, column, length) {
        const before = text.substring(0, column);
        const match = text.substring(column, column + length);
        const after = text.substring(column + length);
        return `${this.escapeHtml(before)}<mark>${this.escapeHtml(match)}</mark>${this.escapeHtml(after)}`;
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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

    async replaceNext() {
        const searchTerm = this.searchInput.value;
        const replaceText = this.replaceInput.value;
        if (!searchTerm) return;

        try {
            await window.electron.invoke('search.replaceNext', {
                search: searchTerm,
                replace: replaceText,
                matchCase: this.matchCase.checked,
                wholeWord: this.wholeWord.checked,
                useRegex: this.useRegex.checked
            });

            // Refresh search results
            this.performSearch();
        } catch (error) {
            console.error('Replace failed:', error);
            this.showError('Replace failed: ' + error.message);
        }
    }

    async replaceAll() {
        const searchTerm = this.searchInput.value;
        const replaceText = this.replaceInput.value;
        if (!searchTerm) return;

        try {
            const count = await window.electron.invoke('search.replaceAll', {
                search: searchTerm,
                replace: replaceText,
                matchCase: this.matchCase.checked,
                wholeWord: this.wholeWord.checked,
                useRegex: this.useRegex.checked
            });

            // Show success message
            this.showMessage(`Replaced ${count} occurrences`);

            // Refresh search results
            this.performSearch();
        } catch (error) {
            console.error('Replace all failed:', error);
            this.showError('Replace all failed: ' + error.message);
        }
    }

    clearResults() {
        this.resultsContainer.innerHTML = '';
    }

    showError(message) {
        this.resultsContainer.innerHTML = `<div class="search-error">${message}</div>`;
    }

    showMessage(message) {
        this.resultsContainer.innerHTML = `<div class="search-message">${message}</div>`;
    }
}
