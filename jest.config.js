module.exports = {
    // Use jsdom environment for DOM testing
    testEnvironment: 'jsdom',

    // Collect coverage information
    collectCoverage: true,
    collectCoverageFrom: [
        'src/renderer/js/**/*.js',
        '!src/renderer/js/monaco/**',
        '!src/renderer/js/workers/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'clover'],

    // Setup files
    setupFiles: ['./tests/setup.js'],

    // Module name mapper for ES modules
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },

    // Transform ES modules
    transform: {
        '^.+\\.js$': 'babel-jest'
    },

    // Handle static assets
    moduleNameMapper: {
        '\\.(css|less|sass|scss)$': '<rootDir>/tests/mocks/styleMock.js',
        '\\.(gif|ttf|eot|svg)$': '<rootDir>/tests/mocks/fileMock.js'
    },

    // Test match patterns
    testMatch: [
        '**/tests/**/*.test.js',
        '**/src/test/**/*.test.js'
    ],

    // Test environment options
    testEnvironmentOptions: {
        url: 'http://localhost'
    },

    // Verbose output
    verbose: true
};
