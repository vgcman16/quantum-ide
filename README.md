# Quantum IDE

A modern, extensible integrated development environment built with Electron, featuring VS Code-like functionality and advanced features.

## Features

- 🎨 **Modern Interface**: Clean, intuitive design with customizable themes
- 📝 **Advanced Editor**: Powered by Monaco Editor with features like:
  - Syntax highlighting
  - Code completion
  - Multi-cursor editing
  - Code folding
  - Minimap
- 🔍 **Smart Search**: Full-text search across files with regex support
- 📁 **File Explorer**: VS Code-style file tree with Git status indicators
- ⚡ **Git Integration**: Built-in Git support with:
  - File status indicators
  - Branch management
  - Commit, push, pull operations
  - Diff viewer
- 🖥️ **Integrated Terminal**: Full-featured terminal emulator
- 🎯 **Command Palette**: Quick access to all IDE features
- 🔄 **Session Management**: Automatic saving of workspace state

## Installation

```bash
# Clone the repository
git clone https://github.com/vgcman16/quantum-ide.git

# Navigate to project directory
cd quantum-ide

# Install dependencies
npm install

# Start the application
npm run dev
```

## Development Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Git

### Development Commands

```bash
# Run in development mode
npm run dev

# Build the application
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
quantum-ide/
├── src/
│   ├── main/           # Main process code
│   │   ├── main.js     # Main application entry
│   │   ├── git.js      # Git service
│   │   └── search.js   # Search service
│   ├── renderer/       # Renderer process code
│   │   ├── js/         # JavaScript modules
│   │   │   ├── app.js  # Main renderer entry
│   │   │   ├── editor/
│   │   │   ├── explorer/
│   │   │   ├── terminal/
│   │   │   ├── search/
│   │   │   ├── git/
│   │   │   ├── commands/
│   │   │   └── common/
│   │   └── styles/     # CSS styles
│   └── preload.js      # Preload script
├── tests/              # Test files
├── scripts/            # Build and utility scripts
└── package.json
```

## Features in Detail

### Editor

The editor is powered by Monaco Editor (the same editor used in VS Code) and includes:

- Syntax highlighting for multiple languages
- IntelliSense code completion
- Multi-cursor editing
- Code folding
- Minimap navigation
- Find and replace with regex support
- Format document support

### Git Integration

Built-in Git support provides:

- File status indicators in file explorer
- Stage/unstage files
- Commit changes
- Push/pull operations
- Branch management
- Diff viewer
- Merge conflict resolution

### Search

Advanced search capabilities include:

- Full-text search across files
- Regular expression support
- Case sensitive/insensitive search
- Whole word matching
- Replace in files
- Search results preview

### Terminal

Integrated terminal features:

- Full PTY support
- Multiple terminal instances
- Command history
- Custom shell configuration
- Split terminal support

### Command Palette

Quick access to all IDE features:

- Keyboard shortcut support
- Fuzzy matching
- Recently used commands
- Custom command registration

## Keyboard Shortcuts

- `Ctrl/Cmd + P`: Open command palette
- `Ctrl/Cmd + S`: Save file
- `Ctrl/Cmd + N`: New file
- `Ctrl/Cmd + Shift + F`: Find in files
- `Ctrl/Cmd + Shift + G`: Git commands
- `Ctrl/Cmd + \``: Toggle terminal
- `Shift + Alt + F`: Format document

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Electron](https://www.electronjs.org/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [xterm.js](https://xtermjs.org/)
- [node-pty](https://github.com/microsoft/node-pty)

## Support

For support, please open an issue in the GitHub repository.
