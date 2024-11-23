const { spawn } = require('child_process');
const path = require('path');

class GitService {
    constructor(workingDirectory) {
        this.workingDirectory = workingDirectory;
    }

    async execute(command, args = []) {
        return new Promise((resolve, reject) => {
            const process = spawn('git', args, {
                cwd: this.workingDirectory,
                env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout.trim());
                } else {
                    reject(new Error(`Git command failed: ${stderr}`));
                }
            });

            process.on('error', (error) => {
                reject(error);
            });
        });
    }

    async isRepo() {
        try {
            await this.execute('rev-parse', ['--is-inside-work-tree']);
            return true;
        } catch {
            return false;
        }
    }

    async getCurrentBranch() {
        try {
            return await this.execute('rev-parse', ['--abbrev-ref', 'HEAD']);
        } catch (error) {
            console.error('Failed to get current branch:', error);
            throw error;
        }
    }

    async status() {
        try {
            const porcelainStatus = await this.execute('status', ['--porcelain', '-b']);
            const lines = porcelainStatus.split('\n');
            
            // Parse branch info from first line
            const branchLine = lines[0]; // ## master...origin/master
            const branch = branchLine.match(/## (?:(?:\w+\.{3}\w+)|(?:\w+))/)[0].split(' ')[1];

            // Parse file statuses
            const files = lines.slice(1)
                .filter(line => line.trim())
                .map(line => {
                    const [status, ...pathParts] = line.trim().split(' ');
                    const filePath = pathParts.join(' ');
                    return {
                        path: filePath,
                        status: this.parseGitStatus(status),
                        staged: status[0] !== ' ' && status[0] !== '?',
                        type: status[0] === '?' ? 'untracked' : 'working'
                    };
                });

            return { branch, files };
        } catch (error) {
            console.error('Failed to get git status:', error);
            throw error;
        }
    }

    parseGitStatus(status) {
        const statusMap = {
            'M': 'modified',
            'A': 'added',
            'D': 'deleted',
            'R': 'renamed',
            'C': 'copied',
            'U': 'updated',
            '?': 'untracked'
        };

        // Check both index and working tree status
        const indexStatus = status[0] !== ' ' ? status[0] : status[1];
        return statusMap[indexStatus] || 'unknown';
    }

    async stage(filePath) {
        try {
            await this.execute('add', [filePath]);
        } catch (error) {
            console.error('Failed to stage file:', error);
            throw error;
        }
    }

    async unstage(filePath) {
        try {
            await this.execute('reset', ['HEAD', filePath]);
        } catch (error) {
            console.error('Failed to unstage file:', error);
            throw error;
        }
    }

    async commit(message) {
        try {
            await this.execute('commit', ['-m', message]);
        } catch (error) {
            console.error('Failed to commit:', error);
            throw error;
        }
    }

    async push() {
        try {
            const branch = await this.getCurrentBranch();
            await this.execute('push', ['origin', branch]);
        } catch (error) {
            console.error('Failed to push:', error);
            throw error;
        }
    }

    async pull() {
        try {
            const branch = await this.getCurrentBranch();
            await this.execute('pull', ['origin', branch]);
        } catch (error) {
            console.error('Failed to pull:', error);
            throw error;
        }
    }

    async checkout(branch) {
        try {
            await this.execute('checkout', [branch]);
        } catch (error) {
            console.error('Failed to checkout branch:', error);
            throw error;
        }
    }

    async createBranch(name) {
        try {
            await this.execute('branch', [name]);
        } catch (error) {
            console.error('Failed to create branch:', error);
            throw error;
        }
    }

    async getBranches() {
        try {
            const output = await this.execute('branch', ['--list']);
            return output.split('\n')
                .map(branch => branch.trim())
                .filter(branch => branch)
                .map(branch => ({
                    name: branch.replace('* ', ''),
                    current: branch.startsWith('* ')
                }));
        } catch (error) {
            console.error('Failed to get branches:', error);
            throw error;
        }
    }

    async log(limit = 50) {
        try {
            const output = await this.execute('log', [
                `--max-count=${limit}`,
                '--pretty=format:%H%n%an%n%ae%n%ct%n%s%n%b%n==END=='
            ]);

            return output.split('\n==END==\n')
                .filter(entry => entry.trim())
                .map(entry => {
                    const [hash, author, email, timestamp, subject, ...bodyLines] = entry.split('\n');
                    return {
                        hash,
                        author,
                        email,
                        date: new Date(parseInt(timestamp) * 1000),
                        subject,
                        body: bodyLines.join('\n').trim()
                    };
                });
        } catch (error) {
            console.error('Failed to get git log:', error);
            throw error;
        }
    }

    async diff(filePath) {
        try {
            return await this.execute('diff', ['--', filePath]);
        } catch (error) {
            console.error('Failed to get diff:', error);
            throw error;
        }
    }

    async stash() {
        try {
            await this.execute('stash');
        } catch (error) {
            console.error('Failed to stash changes:', error);
            throw error;
        }
    }

    async stashPop() {
        try {
            await this.execute('stash', ['pop']);
        } catch (error) {
            console.error('Failed to pop stash:', error);
            throw error;
        }
    }

    async getRemotes() {
        try {
            const output = await this.execute('remote', ['-v']);
            return output.split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const [name, url] = line.split('\t');
                    return { name, url: url.split(' ')[0] };
                });
        } catch (error) {
            console.error('Failed to get remotes:', error);
            throw error;
        }
    }
}

module.exports = GitService;
