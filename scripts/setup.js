#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

/**
 * Execute a command and return its output
 */
function exec(command, options = {}) {
  try {
    return execSync(command, {
      stdio: 'inherit',
      ...options
    });
  } catch (error) {
    console.error(`${colors.red}Failed to execute command: ${command}${colors.reset}`);
    throw error;
  }
}

/**
 * Check if a command exists in the system
 */
function commandExists(command) {
  try {
    execSync(command + ' --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Main setup function
 */
async function setup() {
  console.log(`\n${colors.bright}${colors.cyan}Setting up Quantum IDE development environment...${colors.reset}\n`);

  // Check Node.js version
  const nodeVersion = process.version;
  const requiredVersion = 'v16.0.0';
  if (nodeVersion.localeCompare(requiredVersion, undefined, { numeric: true, sensitivity: 'base' }) < 0) {
    console.error(`${colors.red}Error: Node.js version ${requiredVersion} or higher is required. Current version: ${nodeVersion}${colors.reset}`);
    process.exit(1);
  }

  // Check for required build tools
  console.log(`${colors.yellow}Checking build requirements...${colors.reset}`);
  
  if (process.platform === 'win32') {
    if (!commandExists('npm')) {
      console.error(`${colors.red}Error: npm is required but not found${colors.reset}`);
      process.exit(1);
    }
  } else {
    if (!commandExists('gcc')) {
      console.error(`${colors.red}Error: gcc is required for native module compilation${colors.reset}`);
      if (process.platform === 'darwin') {
        console.log('Please install Xcode Command Line Tools:');
        console.log('xcode-select --install');
      } else {
        console.log('Please install build-essential package:');
        console.log('sudo apt-get install build-essential');
      }
      process.exit(1);
    }
  }

  // Create necessary directories
  console.log(`${colors.yellow}Creating project directories...${colors.reset}`);
  const dirs = [
    'src/main',
    'src/renderer',
    'src/renderer/js',
    'src/renderer/styles',
    'tests',
    'dist'
  ];

  dirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });

  // Install dependencies
  console.log(`\n${colors.yellow}Installing dependencies...${colors.reset}`);
  exec('npm install');

  // Install native module dependencies
  console.log(`\n${colors.yellow}Installing native module dependencies...${colors.reset}`);
  if (process.platform === 'win32') {
    exec('npm install --global windows-build-tools');
  }
  exec('npm run postinstall');

  // Setup git hooks
  console.log(`\n${colors.yellow}Setting up git hooks...${colors.reset}`);
  if (fs.existsSync(path.join(process.cwd(), '.git'))) {
    const hookContent = `#!/bin/sh
npm run lint
npm test`;

    const preCommitPath = path.join(process.cwd(), '.git', 'hooks', 'pre-commit');
    fs.writeFileSync(preCommitPath, hookContent);
    fs.chmodSync(preCommitPath, '755');
    console.log('Git pre-commit hook installed');
  } else {
    console.log('Git repository not initialized, skipping hooks setup');
  }

  // Create VSCode settings
  console.log(`\n${colors.yellow}Creating VSCode settings...${colors.reset}`);
  const vscodeDir = path.join(process.cwd(), '.vscode');
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir);
  }

  const settings = {
    'editor.formatOnSave': true,
    'editor.defaultFormatter': 'esbenp.prettier-vscode',
    'editor.codeActionsOnSave': {
      'source.fixAll.eslint': true
    },
    'eslint.validate': [
      'javascript',
      'javascriptreact',
      'typescript',
      'typescriptreact'
    ],
    'files.associations': {
      '*.js': 'javascript'
    }
  };

  fs.writeFileSync(
    path.join(vscodeDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );

  // Final instructions
  console.log(`\n${colors.green}Setup completed successfully!${colors.reset}\n`);
  console.log(`${colors.bright}Next steps:${colors.reset}`);
  console.log('1. Start the development server:');
  console.log('   npm run dev');
  console.log('\n2. Run tests:');
  console.log('   npm test');
  console.log('\n3. Build the application:');
  console.log('   npm run build');
  console.log(`\n${colors.cyan}Happy coding!${colors.reset}\n`);
}

// Run setup
setup().catch(error => {
  console.error(`\n${colors.red}Setup failed:${colors.reset}`, error);
  process.exit(1);
});
