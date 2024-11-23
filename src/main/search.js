const fs = require('fs').promises;
const path = require('path');

class SearchService {
    constructor() {
        this.excludedDirs = new Set([
            'node_modules',
            '.git',
            'dist',
            'build',
            'coverage'
        ]);

        this.searchableExtensions = new Set([
            '.js', '.jsx', '.ts', '.tsx',
            '.html', '.css', '.scss', '.less',
            '.json', '.md', '.txt', '.py',
            '.java', '.cpp', '.c', '.h',
            '.go', '.rs', '.php', '.rb'
        ]);
    }

    async searchInFiles({ pattern, flags, directory }) {
        const results = [];
        await this.searchDirectory(directory || process.cwd(), pattern, flags, results);
        return results;
    }

    async searchDirectory(directory, pattern, flags, results) {
        try {
            const entries = await fs.readdir(directory, { withFileTypes: true });
            const regex = new RegExp(pattern, flags);

            for (const entry of entries) {
                const fullPath = path.join(directory, entry.name);

                if (entry.isDirectory()) {
                    if (!this.excludedDirs.has(entry.name)) {
                        await this.searchDirectory(fullPath, pattern, flags, results);
                    }
                } else if (entry.isFile() && this.isSearchableFile(entry.name)) {
                    const matches = await this.searchFile(fullPath, regex);
                    results.push(...matches);
                }
            }
        } catch (error) {
            console.error(`Error searching directory ${directory}:`, error);
        }
    }

    async searchFile(filePath, regex) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n');
            const matches = [];

            lines.forEach((line, lineIndex) => {
                let match;
                regex.lastIndex = 0; // Reset regex state for global search

                while ((match = regex.exec(line)) !== null) {
                    matches.push({
                        file: filePath,
                        line: lineIndex + 1,
                        column: match.index,
                        length: match[0].length,
                        text: line.trim()
                    });
                }
            });

            return matches;
        } catch (error) {
            console.error(`Error searching file ${filePath}:`, error);
            return [];
        }
    }

    async replaceInFile(filePath, searchRegex, replaceText) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const newContent = content.replace(searchRegex, replaceText);
            
            if (content !== newContent) {
                await fs.writeFile(filePath, newContent, 'utf8');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`Error replacing in file ${filePath}:`, error);
            return false;
        }
    }

    async replaceAll({ pattern, flags, replace, directory }) {
        const regex = new RegExp(pattern, flags);
        let totalReplacements = 0;

        const replaceInDirectory = async (dir) => {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        if (!this.excludedDirs.has(entry.name)) {
                            await replaceInDirectory(fullPath);
                        }
                    } else if (entry.isFile() && this.isSearchableFile(entry.name)) {
                        const wasReplaced = await this.replaceInFile(fullPath, regex, replace);
                        if (wasReplaced) totalReplacements++;
                    }
                }
            } catch (error) {
                console.error(`Error replacing in directory ${dir}:`, error);
            }
        };

        await replaceInDirectory(directory || process.cwd());
        return totalReplacements;
    }

    isSearchableFile(filename) {
        const ext = path.extname(filename).toLowerCase();
        return this.searchableExtensions.has(ext);
    }
}

module.exports = SearchService;
