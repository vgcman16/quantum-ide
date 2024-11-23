const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// Expose protected methods that allow the renderer process to use
// specific electron APIs without exposing the entire API
contextBridge.exposeInMainWorld(
    'electron',
    {
        // IPC communication
        invoke: async (channel, data) => {
            // Whitelist channels that can be used
            const validChannels = [
                'fs.readdir',
                'fs.readFile',
                'fs.writeFile',
                'fs.createFile',
                'fs.createDirectory',
                'fs.delete',
                'fs.rename',
                'terminal.create',
                'terminal.write',
                'terminal.resize',
                'terminal.destroy',
                'search.inFiles',
                'search.replaceAll',
                'git.isRepo',
                'git.getCurrentBranch',
                'git.status',
                'git.stage',
                'git.unstage',
                'git.commit',
                'git.push',
                'git.pull',
                'git.checkout',
                'git.createBranch',
                'git.getBranches',
                'git.log',
                'git.diff',
                'git.stash',
                'git.stashPop',
                'git.getRemotes',
                'file.save',
                'file.open',
                'file.close',
                'error'
            ];
            if (validChannels.includes(channel)) {
                try {
                    return await ipcRenderer.invoke(channel, data);
                } catch (error) {
                    console.error(`Error invoking ${channel}:`, error);
                    throw error;
                }
            }
            throw new Error(`Invalid IPC channel: ${channel}`);
        },
        send: (channel, data) => {
            // Whitelist channels that can be sent
            const validChannels = [
                'terminal.input',
                'editor.save',
                'editor.close',
                'search.cancel',
                'git.refresh'
            ];
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, data);
            }
        },
        receive: (channel, func) => {
            // Whitelist channels that can be received
            const validChannels = [
                'terminal.data',
                'fs.watch',
                'search.progress',
                'git.fileChanged',
                'app-event'
            ];
            if (validChannels.includes(channel)) {
                // Strip event as it includes sender
                ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
        },
        removeListener: (channel, func) => {
            const validChannels = [
                'terminal.data',
                'fs.watch',
                'search.progress',
                'git.fileChanged',
                'app-event'
            ];
            if (validChannels.includes(channel)) {
                ipcRenderer.removeListener(channel, func);
            }
        }
    }
);

// Expose some useful APIs to the renderer process
contextBridge.exposeInMainWorld(
    'api',
    {
        platform: process.platform,
        env: {
            isDev: process.env.NODE_ENV === 'development',
            platform: process.platform,
            arch: process.arch,
            cwd: process.cwd()
        },
        path: {
            sep: path.sep,
            join: (...args) => path.join(...args),
            dirname: (p) => path.dirname(p),
            basename: (p) => path.basename(p),
            extname: (p) => path.extname(p)
        },
        require: (modulePath) => {
            try {
                // Get the absolute path to node_modules
                const nodeModulesPath = path.join(process.cwd(), 'node_modules');
                // Resolve the module path
                const resolvedPath = require.resolve(modulePath, { paths: [nodeModulesPath] });
                // Load and return the module
                return require(resolvedPath);
            } catch (error) {
                console.error(`Failed to require module: ${modulePath}`, error);
                throw error;
            }
        }
    }
);

// Initialize some required polyfills or globals
window.Buffer = Buffer;
window.process = {
    type: 'renderer',
    versions: process.versions,
    platform: process.platform,
    env: {
        NODE_ENV: process.env.NODE_ENV
    },
    cwd: () => process.cwd()
};

// Log when preload script has completed
console.log('Preload script initialized');
