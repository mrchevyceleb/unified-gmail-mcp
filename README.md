# Unified Gmail MCP Server

[![npm version](https://badge.fury.io/js/unified-gmail-mcp.svg)](https://www.npmjs.com/package/unified-gmail-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that provides a **truly unified inbox** across multiple Gmail accounts. Unlike traditional multi-account email tools that simply switch between accounts, this MCP aggregates messages from all your Gmail accounts into a single, chronologically-sorted stream.

Perfect for managing personal, work, and client email addresses through Claude or other MCP-compatible AI assistants.

## Quick Start

```bash
npx -y unified-gmail-mcp
```

No installation required! Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "unified-gmail": {
      "command": "npx",
      "args": ["-y", "unified-gmail-mcp"],
      "env": {
        "GOOGLE_OAUTH_CLIENT_ID": "your-client-id",
        "GOOGLE_OAUTH_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

Then [set up Google OAuth credentials](#google-oauth-setup) and restart Claude.

## Features

- 📬 **Unified Inbox** - View messages from all accounts in a single, date-sorted stream
- 🔍 **Cross-Account Search** - Search across all connected Gmail accounts simultaneously
- 📤 **Send & Reply** - Send emails from any connected account with proper threading
- ✨ **Rich Text Emails** - Send plain text, HTML, or Markdown emails (auto-converted to styled HTML)
- 📎 **Attachments** - Send files with any email (base64 encoded)
- 🗄️ **Archive Support** - Archive messages across all accounts
- 🔐 **OAuth 2.0** - Secure authentication with automatic token refresh
- 💾 **Local Storage** - Tokens stored locally in SQLite (not sent to external servers)
- ⚡ **Parallel Fetching** - Fast performance with concurrent API calls
- 🔢 **Multi-Account** - Support for up to 10 Gmail accounts

## Installation

The easiest way to use this MCP is with **npx** (no installation required):

### Prerequisites

1. Node.js 18 or higher
2. Google Cloud OAuth credentials ([setup guide](#google-oauth-setup))
3. Claude Desktop or another MCP-compatible client

### Using npx (Recommended)

Add to your MCP client config:

```json
{
  "mcpServers": {
    "unified-gmail": {
      "command": "npx",
      "args": ["-y", "unified-gmail-mcp"],
      "env": {
        "GOOGLE_OAUTH_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_OAUTH_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

**Benefits:**
- ✅ No manual installation required
- ✅ Always uses the latest version
- ✅ Works on any machine with Node.js
- ✅ Automatic updates on restart

### Global Installation (Alternative)

If you prefer to install globally:

```bash
npm install -g unified-gmail-mcp
```

Then use `unified-gmail-mcp` as the command instead of `npx`.

### From Source (Development)

For development or contributing:

```bash
git clone https://github.com/mrchevyceleb/unified-gmail-mcp.git
cd unified-gmail-mcp
npm install
npm run build
```

Then point your config to `dist/index.js`.

## Google OAuth Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Library**
4. Search for "Gmail API" and click **Enable**

### Step 2: Create OAuth 2.0 Credentials

**IMPORTANT:** You must use a **Web application** OAuth client type, NOT Desktop.

1. In Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Select **Web application** as the application type
4. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:8089/callback
   ```
5. Click **Create** and save your **Client ID** and **Client Secret**

> **Common Mistake:** Make sure you add the redirect URI under "Authorized redirect URIs" in the OAuth client settings, NOT under "Authorized Domains" in the Branding section.

### Required OAuth Scopes

The server requests these scopes during authentication:
- `gmail.readonly` - Read email messages
- `gmail.send` - Send emails
- `gmail.modify` - Archive messages (modify labels)
- `gmail.labels` - Access label information
- `userinfo.email` - Get user's email address

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_OAUTH_CLIENT_ID` | Yes | Your Google OAuth Client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Yes | Your Google OAuth Client Secret |
| `GMAIL_MCP_DATA_DIR` | No | Custom path for token storage (default: `~/.unified-gmail-mcp`) |

### Claude Desktop

Add this to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

#### Using npx (Recommended)

```json
{
  "mcpServers": {
    "unified-gmail": {
      "command": "npx",
      "args": ["-y", "unified-gmail-mcp"],
      "env": {
        "GOOGLE_OAUTH_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_OAUTH_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

#### Using Local Installation

```json
{
  "mcpServers": {
    "unified-gmail": {
      "command": "node",
      "args": ["/absolute/path/to/unified-gmail-mcp/dist/index.js"],
      "env": {
        "GOOGLE_OAUTH_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_OAUTH_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### Other MCP Clients

The server uses stdio transport and requires these environment variables:
- `GOOGLE_OAUTH_CLIENT_ID` - Your Google OAuth Client ID
- `GOOGLE_OAUTH_CLIENT_SECRET` - Your Google OAuth Client Secret

## Usage

### Adding Accounts

When you first use the MCP, you'll need to authenticate your Gmail accounts:

```
"Add my Gmail account"
```

This will:
1. Open a browser window for OAuth authentication
2. Ask you to sign in to your Google account
3. Request permission to access Gmail
4. Save the tokens locally for future use

Repeat for each Gmail account you want to add (up to 10 accounts).

### Checking Email

```
"Show me a summary of all my email accounts"
```

Returns unread counts and recent subjects for each connected account.

```
"Get my latest 20 emails across all accounts"
```

Returns a unified, chronologically-sorted stream of messages.

### Searching

```
"Search all my accounts for invoices from last month"
```

Uses Gmail search syntax across all connected accounts.

### Sending Email

#### Plain Text

```
"Send an email from my work account to john@example.com"
```

#### Markdown (Rich Text)

```
"Send an email with format markdown to john@example.com with body:

# Meeting Summary

Here are the key points:
- Item 1
- Item 2

**Action items** are due Friday."
```

The markdown is automatically converted to beautifully styled HTML.

#### HTML

```
"Send an HTML email to john@example.com with this body: <h1>Hello</h1><p>Welcome!</p>"
```

### Replying

```
"Reply to that message from Sarah saying I'll be there at 3pm"
```

Automatically uses the account that received the original message.

### Sending with Attachments

```
"Send an email to john@example.com with subject 'Report' and attach the PDF"
```

Attachments are provided as base64-encoded content with filename and MIME type.

### Archiving

```
"Archive those DMARC report emails"
```

Removes messages from inbox while keeping them in the account.

## Available Tools

The MCP provides these tools to AI assistants:

### Account Management
- `add_account` - Add a Gmail account via OAuth (max 10 accounts)
- `list_accounts` - List all connected accounts with status
- `remove_account` - Remove a Gmail account

### Unified Operations
- `get_messages` - Get unified message stream from all accounts
- `search` - Cross-account search with Gmail query syntax
- `get_message` - Get details of a specific message
- `summary` - Get overview of all accounts (unread counts, recent subjects)

### Email Operations
- `send` - Send email from a specific account
  - Supports `format`: `plain` (default), `html`, or `markdown`
  - Supports `attachments`: Array of `{filename, content, mimeType}`
- `reply` - Reply to a message (auto-detects correct account)
  - Supports `format` and `attachments` same as send
- `archive_message` - Archive a single message
- `archive_messages` - Archive multiple messages

### Send Tool Parameters

```typescript
{
  account: string;        // Email address to send from
  to: string[];          // Recipient email addresses
  subject: string;       // Email subject
  body: string;          // Email body content
  cc?: string[];         // CC recipients
  bcc?: string[];        // BCC recipients
  format?: 'plain' | 'html' | 'markdown';  // Email format (default: plain)
  attachments?: Array<{
    filename: string;    // Name of the file
    content: string;     // Base64 encoded content
    mimeType: string;    // MIME type (e.g., "application/pdf")
  }>;
}
```

## Architecture

### Project Structure

```
unified-gmail-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── auth/
│   │   ├── oauth.ts          # OAuth 2.0 flow with callback server
│   │   └── token-store.ts    # SQLite token storage (10 account limit)
│   ├── gmail/
│   │   ├── client.ts         # Gmail API wrapper with MIME support
│   │   └── types.ts          # TypeScript interfaces
│   ├── unified/
│   │   ├── aggregator.ts     # Parallel fetch and merge logic
│   │   └── summary.ts        # Account summaries
│   └── tools/
│       ├── accounts.ts       # Account management tools
│       ├── messages.ts       # Unified message tools
│       └── send.ts           # Send and reply tools
├── dist/                     # Compiled JavaScript
└── package.json
```

### Data Storage

OAuth tokens are stored locally in SQLite:

**Default Location:** `~/.unified-gmail-mcp/accounts.db`
**Custom Location:** Set `GMAIL_MCP_DATA_DIR` environment variable

**Schema:**
```sql
CREATE TABLE accounts (
  email TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry INTEGER NOT NULL
)
```

### Key Design Decisions

1. **Parallel API Calls** - Uses `Promise.all()` to fetch from multiple accounts simultaneously
2. **Automatic Token Refresh** - Tokens refreshed automatically when expired (or within 60 seconds of expiry)
3. **Chronological Sorting** - Messages sorted by date after aggregation for unified timeline
4. **Minimal Caching** - Fresh API calls ensure data accuracy
5. **Per-Account Limits** - Request limits divided among accounts for balanced representation
6. **MIME Multipart** - Proper email structure for HTML + attachments
7. **Markdown Rendering** - Uses `marked` for beautiful HTML conversion with inline styles

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Project Requirements

- TypeScript 5.6+
- Node.js 18+
- See [package.json](./package.json) for all dependencies

## Troubleshooting

### "redirect_uri_mismatch" Error

**Cause:** OAuth client misconfiguration

**Solution:**
1. Verify you're using **Web application** OAuth client (NOT Desktop)
2. Confirm `http://localhost:8089/callback` is in **Authorized redirect URIs**
3. Make sure it's in the OAuth client settings, not the Branding section

### "Gmail API has not been used" Error

**Cause:** Gmail API not enabled in Google Cloud project

**Solution:**
1. Go to Google Cloud Console > APIs & Services > Library
2. Search for "Gmail API"
3. Click Enable

### "Maximum of 10 accounts reached" Error

**Cause:** You've already added 10 Gmail accounts

**Solution:**
Remove an existing account before adding a new one:
```
"Remove my old@email.com account"
```

### Accounts Showing Disconnected

**Cause:** Token refresh failure

**Solution:**
1. Remove the account: `"Remove my work@email.com account"`
2. Re-add the account: `"Add my Gmail account"`
3. Ensure you grant all permissions during OAuth

### Port Already in Use (8089)

**Cause:** Previous OAuth session still active

**Solution:**
- Wait 5 minutes for timeout, or
- Manually kill process using port 8089

### Reset All Accounts

Delete the token database and restart:

**macOS/Linux:**
```bash
rm -rf ~/.unified-gmail-mcp/
```

**Windows:**
```powershell
Remove-Item -Recurse -Force $env:USERPROFILE\.unified-gmail-mcp\
```

## Security Considerations

- OAuth tokens stored locally in SQLite (not encrypted at rest)
- Refresh tokens are long-lived - protect the `accounts.db` file
- OAuth callback server runs temporarily on `localhost:8089` during auth
- No data sent to external servers except Google's APIs
- All communication with Gmail API uses HTTPS

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Credits

Built with:
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Google APIs Node.js Client](https://github.com/googleapis/google-api-nodejs-client)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [marked](https://github.com/markedjs/marked) - Markdown parsing

## Changelog

### v1.1.0
- **New:** HTML email support (`format: 'html'`)
- **New:** Markdown email support (`format: 'markdown'`) with auto-conversion to styled HTML
- **New:** Attachment support for send and reply
- **New:** 10 account limit with clear error messages
- **New:** Configurable data directory via `GMAIL_MCP_DATA_DIR` environment variable
- **New:** npm package support - install via `npm install -g unified-gmail-mcp` or use with npx

### v1.0.0
- Initial release
- Unified inbox across multiple Gmail accounts
- Send, reply, and archive functionality
- OAuth 2.0 authentication

## Support

- 🐛 [Report a Bug](https://github.com/mrchevyceleb/unified-gmail-mcp/issues)
- 💡 [Request a Feature](https://github.com/mrchevyceleb/unified-gmail-mcp/issues)
- 📖 [MCP Documentation](https://modelcontextprotocol.io)

---

**Made with ❤️ for the MCP community**
