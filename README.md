# Unified Gmail MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that provides a **truly unified inbox** across multiple Gmail accounts. Unlike traditional multi-account email tools that simply switch between accounts, this MCP aggregates messages from all your Gmail accounts into a single, chronologically-sorted stream.

Perfect for managing personal, work, and client email addresses through Claude or other MCP-compatible AI assistants.

## Features

- 📬 **Unified Inbox** - View messages from all accounts in a single, date-sorted stream
- 🔍 **Cross-Account Search** - Search across all connected Gmail accounts simultaneously
- 📤 **Send & Reply** - Send emails from any connected account with proper threading
- 🗄️ **Archive Support** - Archive messages across all accounts
- 🔐 **OAuth 2.0** - Secure authentication with automatic token refresh
- 💾 **Local Storage** - Tokens stored locally in SQLite (not sent to external servers)
- ⚡ **Parallel Fetching** - Fast performance with concurrent API calls

## Installation

### Prerequisites

- Node.js 18 or higher
- A Google Cloud Project with OAuth 2.0 credentials
- Gmail API enabled
- Claude Desktop or another MCP-compatible client

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mrchevyceleb/unified-gmail-mcp.git
   cd unified-gmail-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Set up Google OAuth credentials** (see [Setup Guide](#google-oauth-setup) below)

5. **Configure your MCP client** (see [Configuration](#configuration) below)

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

### Claude Desktop

Add this to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "unified_gmail": {
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

Replace:
- `/absolute/path/to/` with the actual path to your installation
- `your-client-id` with your Google OAuth Client ID
- `your-client-secret` with your Google OAuth Client Secret

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

Repeat for each Gmail account you want to add.

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

```
"Send an email from my work account to john@example.com"
```

### Replying

```
"Reply to that message from Sarah saying I'll be there at 3pm"
```

Automatically uses the account that received the original message.

### Archiving

```
"Archive those DMARC report emails"
```

Removes messages from inbox while keeping them in the account.

## Available Tools

The MCP provides these tools to AI assistants:

### Account Management
- `add_account` - Add a Gmail account via OAuth
- `list_accounts` - List all connected accounts with status
- `remove_account` - Remove a Gmail account

### Unified Operations
- `get_messages` - Get unified message stream from all accounts
- `search` - Cross-account search with Gmail query syntax
- `get_message` - Get details of a specific message
- `summary` - Get overview of all accounts (unread counts, recent subjects)

### Email Operations
- `send` - Send email from a specific account
- `reply` - Reply to a message (auto-detects correct account)
- `archive_message` - Archive a single message
- `archive_messages` - Archive multiple messages

See [API Documentation](./docs/API.md) for detailed tool specifications.

## Architecture

### Project Structure

```
unified-gmail-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── auth/
│   │   ├── oauth.ts          # OAuth 2.0 flow with callback server
│   │   └── token-store.ts    # SQLite token storage
│   ├── gmail/
│   │   ├── client.ts         # Gmail API wrapper
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

**Location:** `~/.unified-gmail-mcp/accounts.db`
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

## Support

- 🐛 [Report a Bug](https://github.com/mrchevyceleb/unified-gmail-mcp/issues)
- 💡 [Request a Feature](https://github.com/mrchevyceleb/unified-gmail-mcp/issues)
- 📖 [MCP Documentation](https://modelcontextprotocol.io)

---

**Made with ❤️ for the MCP community**
