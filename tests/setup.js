// Mock DOM environment setup
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

// Set up global objects to mimic browser environment
global.window = dom.window;
global.document = dom.window.document;
global.navigator = {
    userAgent: 'node.js'
};

// Mock requestAnimationFrame
global.requestAnimationFrame = function(callback) {
    return setTimeout(callback, 0);
};

global.cancelAnimationFrame = function(id) {
    clearTimeout(id);
};

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn()
};
global.localStorage = localStorageMock;

// Mock matchMedia
global.matchMedia = query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor(callback) {
        this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor(callback) {
        this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mock window.electron
global.window.electron = {
    invoke: jest.fn(),
    send: jest.fn(),
    receive: jest.fn(),
    removeListener: jest.fn()
};

// Mock window.api
global.window.api = {
    platform: 'darwin',
    env: {
        isDev: true,
        platform: 'darwin',
        arch: 'x64',
        cwd: '/test/path'
    },
    path: {
        sep: '/',
        join: (...args) => args.join('/'),
        dirname: (p) => p.split('/').slice(0, -1).join('/'),
        basename: (p) => p.split('/').pop(),
        extname: (p) => {
            const parts = p.split('.');
            return parts.length > 1 ? '.' + parts.pop() : '';
        }
    }
};

// Mock console methods
const originalConsole = { ...console };
global.console = {
    ...console,
    log: jest.fn(originalConsole.log),
    error: jest.fn(originalConsole.error),
    warn: jest.fn(originalConsole.warn),
    info: jest.fn(originalConsole.info)
};

// Clean up function to reset mocks between tests
afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    document.body.innerHTML = '';
});
