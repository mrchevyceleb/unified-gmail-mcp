# Contributing to Unified Gmail MCP

Thank you for your interest in contributing to the Unified Gmail MCP Server! This document provides guidelines and information for contributors.

## Code of Conduct

This project follows a simple code of conduct:
- Be respectful and constructive
- Focus on what's best for the community
- Show empathy towards other contributors

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Environment details** (OS, Node version, Claude version, etc.)
- **Error messages** and relevant logs

### Suggesting Enhancements

Enhancement suggestions are welcome! Please include:

- **Use case** - Why is this enhancement useful?
- **Proposed solution** - How should it work?
- **Alternatives considered** - What other approaches did you think about?

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes**
4. **Build and test**: `npm run build`
5. **Follow the coding style** (see below)
6. **Commit with clear messages**
7. **Push to your fork** and submit a pull request

## Development Setup

### Prerequisites

- Node.js 18+
- TypeScript 5.6+
- A Google Cloud project with OAuth credentials (for testing)

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/unified-gmail-mcp.git
cd unified-gmail-mcp

# Install dependencies
npm install

# Build
npm run build

# Watch mode for development
npm run dev
```

### Project Structure

```
src/
├── index.ts              # MCP server entry point and tool registration
├── auth/
│   ├── oauth.ts          # OAuth 2.0 flow with local callback server
│   └── token-store.ts    # SQLite token storage
├── gmail/
│   ├── client.ts         # Gmail API wrapper
│   └── types.ts          # TypeScript interfaces
├── unified/
│   ├── aggregator.ts     # Parallel fetch and merge logic
│   └── summary.ts        # Account summary generation
└── tools/
    ├── accounts.ts       # Account management tools
    ├── messages.ts       # Unified message tools
    └── send.ts           # Send and reply tools
```

## Coding Style

### TypeScript

- Use TypeScript for all code
- Define interfaces for data structures
- Avoid `any` types where possible
- Use async/await over callbacks

### Naming Conventions

- **Classes**: PascalCase (e.g., `OAuthManager`)
- **Functions/Methods**: camelCase (e.g., `getMessages`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_PORT`)
- **Interfaces**: PascalCase with descriptive names (e.g., `UnifiedMessage`)

### Code Organization

- Keep functions small and focused
- Use meaningful variable names
- Add comments for complex logic
- Group related functionality

### Error Handling

- Always handle errors gracefully
- Return structured error objects from tools
- Log errors to stderr for debugging
- Never expose sensitive information in error messages

## Testing

Currently, testing is manual. Automated testing contributions are welcome!

Manual testing checklist:
- [ ] OAuth flow works correctly
- [ ] Multiple accounts can be added
- [ ] Messages aggregate properly across accounts
- [ ] Search works across all accounts
- [ ] Send and reply maintain correct threading
- [ ] Archive operations work
- [ ] Token refresh happens automatically

## Commit Messages

Use clear, descriptive commit messages:

```
Add archive support for batch message operations

- Implement archive_message tool
- Implement archive_messages tool for bulk archiving
- Update MCP tool registration with new tools
- Add error handling for missing message IDs
```

Format:
- First line: Brief summary (50 chars or less)
- Blank line
- Detailed explanation if needed (wrap at 72 chars)

## Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Ensure the build succeeds**: `npm run build`
3. **Update the README** if adding new features
4. **Describe your changes** in the pull request description
5. **Link related issues** using keywords like "Fixes #123"

### Review Process

- Maintainers will review your PR
- Address any requested changes
- Once approved, your PR will be merged

## Feature Requests

When suggesting new features, consider:

### Good Feature Ideas

- Support for additional Gmail operations (labels, filters, etc.)
- Improved error messages and debugging
- Performance optimizations
- Better OAuth flow UX
- Automated testing
- Support for Gmail drafts
- HTML email support

### Out of Scope

- Non-Gmail email providers (consider a separate MCP)
- Features requiring server-side storage
- Features that violate Gmail API terms

## Security

### Reporting Security Issues

**Do not** open public issues for security vulnerabilities. Instead:

1. Email the maintainer directly (see GitHub profile)
2. Provide detailed information about the vulnerability
3. Allow time for a fix before public disclosure

### Security Best Practices

- Never commit credentials or tokens
- Keep dependencies up to date
- Use environment variables for sensitive data
- Validate all user input
- Use HTTPS for all external communication

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to:
- Open an issue for questions
- Join discussions in existing issues
- Reach out to maintainers

---

**Thank you for contributing to the MCP community!**
