// Mock Electron
const mockIpcRenderer = {
  on: jest.fn(),
  send: jest.fn(),
  invoke: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn()
};

const mockIpcMain = {
  on: jest.fn(),
  handle: jest.fn(),
  removeHandler: jest.fn(),
  removeAllHandlers: jest.fn()
};

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(),
    on: jest.fn(),
    whenReady: jest.fn().mockResolvedValue(true)
  },
  ipcMain: mockIpcMain,
  ipcRenderer: mockIpcRenderer,
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    webContents: {
      openDevTools: jest.fn(),
      send: jest.fn()
    },
    on: jest.fn(),
    show: jest.fn(),
    close: jest.fn()
  }))
}));

// Mock node-pty
jest.mock('node-pty', () => ({
  spawn: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    write: jest.fn(),
    resize: jest.fn(),
    kill: jest.fn()
  }))
}));

// Mock Monaco Editor
global.monaco = {
  editor: {
    create: jest.fn(),
    defineTheme: jest.fn(),
    setTheme: jest.fn()
  }
};

// Mock DOM methods and properties not available in JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
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

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
