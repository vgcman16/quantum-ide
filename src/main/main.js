const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const pty = require('node-pty');
const express = require('express');
const http = require('http');
const SearchService = require('./search');
const GitService = require('./git');

class QuantumIDE {
    constructor() {
        this.mainWindow = null;
        this.terminals = new Map();
        this.appRoot = path.join(__dirname, '../..');
        this.server = null;
        this.serverPort = 3033;
        this.searchService = new SearchService();
        this.gitService = new GitService(this.appRoot);
        this.initialize();
    }

    initialize() {
        app.whenReady().then(() => {
            this.setupServer();
            this.createWindow();
            
            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    this.createWindow();
                }
            });
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('before-quit', () => {
            if (this.server) {
                this.server.close();
            }
        });

        this.setupIPCHandlers();
    }

    setupServer() {
        const app = express();

        // Enable CORS
        app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            res.header('Cross-Origin-Embedder-Policy', 'require-corp');
            res.header('Cross-Origin-Opener-Policy', 'same-origin');
            next();
        });

        // Handle OPTIONS requests
        app.options('*', (req, res) => {
            res.sendStatus(200);
        });

        // Set proper MIME types
        app.use((req, res, next) => {
            if (req.path.endsWith('.js')) {
                res.type('application/javascript');
            } else if (req.path.endsWith('.css')) {
                res.type('text/css');
            } else if (req.path.endsWith('.json')) {
                res.type('application/json');
            } else if (req.path.endsWith('.html')) {
                res.type('text/html');
            }
            next();
        });

        // Serve node_modules directory
        app.use('/node_modules', express.static(path.join(this.appRoot, 'node_modules'), {
            setHeaders: (res, filePath) => {
                // Set proper headers for JavaScript files
                if (filePath.endsWith('.js')) {
                    res.setHeader('Content-Type', 'application/javascript');
                }
                // Allow cross-origin requests for Monaco workers
                if (filePath.includes('monaco-editor/min/vs/base/worker')) {
                    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                }
            }
        }));

        // Create HTTP server
        this.server = http.createServer(app);

        // Try to start server on initial port, increment if busy
        const startServer = (port) => {
            try {
                this.server.listen(port, () => {
                    console.log(`Static server running on port ${port}`);
                    this.serverPort = port;
                });
            } catch (error) {
                if (error.code === 'EADDRINUSE') {
                    console.log(`Port ${port} in use, trying ${port + 1}`);
                    startServer(port + 1);
                } else {
                    console.error('Failed to start server:', error);
                }
            }
        };

        this.server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                this.server.close();
                startServer(this.serverPort + 1);
            }
        });

        startServer(this.serverPort);
    }

    createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
                webSecurity: true,
                preload: path.join(__dirname, '../preload.js')
            }
        });

        // Set CSP headers
        this.mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [
                        "default-src 'self' http://localhost:*;",
                        "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* blob:;",
                        "style-src 'self' 'unsafe-inline' http://localhost:*;",
                        "font-src 'self' data: http://localhost:*;",
                        "img-src 'self' data: https: http://localhost:*;",
                        "connect-src 'self' https: http://localhost:* blob:;",
                        "worker-src 'self' blob: http://localhost:*;"
                    ].join(' ')
                }
            });
        });

        // Wait for server to be ready before loading the page
        const waitForServer = () => {
            if (this.server && this.server.listening) {
                // Load the index.html file
                const indexPath = path.join(__dirname, '../renderer/index.html');
                this.mainWindow.loadFile(indexPath);

                // Open DevTools in development mode
                if (process.argv.includes('--dev')) {
                    this.mainWindow.webContents.openDevTools();
                }
            } else {
                setTimeout(waitForServer, 100);
            }
        };

        waitForServer();

        // Handle external links
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            require('electron').shell.openExternal(url);
            return { action: 'deny' };
        });
    }

    setupIPCHandlers() {
        // File system operations
        this.setupFileSystemHandlers();
        
        // Terminal operations
        this.setupTerminalHandlers();
        
        // Search operations
        this.setupSearchHandlers();

        // Git operations
        this.setupGitHandlers();
        
        // Error handling
        this.setupErrorHandlers();
    }

    setupFileSystemHandlers() {
        // Read directory
        ipcMain.handle('fs.readdir', async (event, path) => {
            try {
                const entries = await fs.readdir(path, { withFileTypes: true });
                return entries.map(entry => ({
                    name: entry.name,
                    path: path + '/' + entry.name,
                    isDirectory: entry.isDirectory(),
                    isFile: entry.isFile(),
                    isSymlink: entry.isSymbolicLink()
                }));
            } catch (error) {
                console.error('Error reading directory:', error);
                throw error;
            }
        });

        // Read file
        ipcMain.handle('fs.readFile', async (event, path) => {
            try {
                return await fs.readFile(path, 'utf8');
            } catch (error) {
                console.error('Error reading file:', error);
                throw error;
            }
        });

        // Write file
        ipcMain.handle('fs.writeFile', async (event, { path, content }) => {
            try {
                await fs.writeFile(path, content, 'utf8');
            } catch (error) {
                console.error('Error writing file:', error);
                throw error;
            }
        });

        // Create file
        ipcMain.handle('fs.createFile', async (event, path) => {
            try {
                await fs.writeFile(path, '', 'utf8');
            } catch (error) {
                console.error('Error creating file:', error);
                throw error;
            }
        });

        // Create directory
        ipcMain.handle('fs.createDirectory', async (event, path) => {
            try {
                await fs.mkdir(path, { recursive: true });
            } catch (error) {
                console.error('Error creating directory:', error);
                throw error;
            }
        });

        // Delete file or directory
        ipcMain.handle('fs.delete', async (event, path) => {
            try {
                const stats = await fs.stat(path);
                if (stats.isDirectory()) {
                    await fs.rmdir(path, { recursive: true });
                } else {
                    await fs.unlink(path);
                }
            } catch (error) {
                console.error('Error deleting path:', error);
                throw error;
            }
        });

        // Rename file or directory
        ipcMain.handle('fs.rename', async (event, { oldPath, newPath }) => {
            try {
                await fs.rename(oldPath, newPath);
            } catch (error) {
                console.error('Error renaming path:', error);
                throw error;
            }
        });
    }

    setupTerminalHandlers() {
        // Create terminal
        ipcMain.handle('terminal.create', (event, { cols, rows }) => {
            try {
                const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
                const terminal = pty.spawn(shell, [], {
                    name: 'xterm-color',
                    cols: cols || 80,
                    rows: rows || 24,
                    cwd: process.env.HOME,
                    env: process.env
                });

                const id = terminal.pid.toString();
                this.terminals.set(id, terminal);

                terminal.onData(data => {
                    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                        this.mainWindow.webContents.send('terminal.data', data);
                    }
                });

                return id;
            } catch (error) {
                console.error('Error creating terminal:', error);
                throw error;
            }
        });

        // Write to terminal
        ipcMain.handle('terminal.write', (event, data) => {
            try {
                const terminal = this.terminals.values().next().value;
                if (terminal) {
                    terminal.write(data);
                }
            } catch (error) {
                console.error('Error writing to terminal:', error);
                throw error;
            }
        });

        // Resize terminal
        ipcMain.handle('terminal.resize', (event, { cols, rows }) => {
            try {
                const terminal = this.terminals.values().next().value;
                if (terminal) {
                    terminal.resize(cols, rows);
                }
            } catch (error) {
                console.error('Error resizing terminal:', error);
                throw error;
            }
        });

        // Destroy terminal
        ipcMain.handle('terminal.destroy', (event, id) => {
            try {
                const terminal = this.terminals.get(id);
                if (terminal) {
                    terminal.kill();
                    this.terminals.delete(id);
                }
            } catch (error) {
                console.error('Error destroying terminal:', error);
                throw error;
            }
        });
    }

    setupSearchHandlers() {
        // Search in files
        ipcMain.handle('search.inFiles', async (event, { pattern, flags }) => {
            try {
                return await this.searchService.searchInFiles({
                    pattern,
                    flags,
                    directory: this.appRoot
                });
            } catch (error) {
                console.error('Error searching files:', error);
                throw error;
            }
        });

        // Replace all occurrences
        ipcMain.handle('search.replaceAll', async (event, { pattern, flags, replace }) => {
            try {
                return await this.searchService.replaceAll({
                    pattern,
                    flags,
                    replace,
                    directory: this.appRoot
                });
            } catch (error) {
                console.error('Error replacing in files:', error);
                throw error;
            }
        });
    }

    setupGitHandlers() {
        // Check if directory is a git repository
        ipcMain.handle('git.isRepo', async () => {
            return await this.gitService.isRepo();
        });

        // Get current branch
        ipcMain.handle('git.getCurrentBranch', async () => {
            return await this.gitService.getCurrentBranch();
        });

        // Get status
        ipcMain.handle('git.status', async () => {
            return await this.gitService.status();
        });

        // Stage file
        ipcMain.handle('git.stage', async (event, { path }) => {
            await this.gitService.stage(path);
        });

        // Unstage file
        ipcMain.handle('git.unstage', async (event, { path }) => {
            await this.gitService.unstage(path);
        });

        // Commit changes
        ipcMain.handle('git.commit', async (event, { message }) => {
            await this.gitService.commit(message);
        });

        // Push changes
        ipcMain.handle('git.push', async () => {
            await this.gitService.push();
        });

        // Pull changes
        ipcMain.handle('git.pull', async () => {
            await this.gitService.pull();
        });

        // Checkout branch
        ipcMain.handle('git.checkout', async (event, { branch }) => {
            await this.gitService.checkout(branch);
        });

        // Create branch
        ipcMain.handle('git.createBranch', async (event, { name }) => {
            await this.gitService.createBranch(name);
        });

        // Get branches
        ipcMain.handle('git.getBranches', async () => {
            return await this.gitService.getBranches();
        });

        // Get commit history
        ipcMain.handle('git.log', async (event, { limit }) => {
            return await this.gitService.log(limit);
        });

        // Get file diff
        ipcMain.handle('git.diff', async (event, { path }) => {
            return await this.gitService.diff(path);
        });

        // Stash changes
        ipcMain.handle('git.stash', async () => {
            await this.gitService.stash();
        });

        // Pop stashed changes
        ipcMain.handle('git.stashPop', async () => {
            await this.gitService.stashPop();
        });

        // Get remotes
        ipcMain.handle('git.getRemotes', async () => {
            return await this.gitService.getRemotes();
        });
    }

    setupErrorHandlers() {
        // Handle errors from renderer process
        ipcMain.handle('error', (event, error) => {
            console.error('Renderer Error:', error);
            // You could add error reporting service integration here
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            // You could add error reporting service integration here
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            // You could add error reporting service integration here
        });
    }
}

// Create instance of our app
new QuantumIDE();
