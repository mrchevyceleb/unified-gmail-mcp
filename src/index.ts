#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { OAuthManager } from './auth/oauth.js';
import { TokenStore } from './auth/token-store.js';
import { MessageAggregator } from './unified/aggregator.js';
import { SummaryGenerator } from './unified/summary.js';
import { AccountTools } from './tools/accounts.js';
import { MessageTools } from './tools/messages.js';
import { SendTools } from './tools/send.js';

// Initialize components
const tokenStore = new TokenStore();
const oauthManager = new OAuthManager();
const aggregator = new MessageAggregator(oauthManager, tokenStore);
const summaryGenerator = new SummaryGenerator(oauthManager, tokenStore);

// Initialize tools
const accountTools = new AccountTools(oauthManager, tokenStore);
const messageTools = new MessageTools(aggregator, summaryGenerator);
const sendTools = new SendTools(oauthManager, tokenStore, aggregator);

// Create MCP server
const server = new Server(
  {
    name: 'unified-gmail-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Account management
      {
        name: 'add_account',
        description: 'Add a new Gmail account to the unified inbox. Opens a browser window for OAuth authentication.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'list_accounts',
        description: 'List all connected Gmail accounts with their unread counts and connection status.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'remove_account',
        description: 'Remove a Gmail account from the unified inbox.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'The email address of the account to remove',
            },
          },
          required: ['email'],
        },
      },

      // Unified message operations
      {
        name: 'get_messages',
        description: 'Get a unified stream of messages from all connected accounts, sorted by date (newest first).',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: {
              type: 'number',
              description: 'Maximum number of messages to return (default: 50)',
            },
            accounts: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific accounts (email addresses). If empty, returns from all accounts.',
            },
            labelIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by Gmail label IDs (e.g., INBOX, UNREAD)',
            },
          },
          required: [],
        },
      },
      {
        name: 'search',
        description: 'Search for messages across all connected accounts using Gmail search syntax.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Gmail search query (e.g., "from:john@example.com", "subject:invoice", "is:unread")',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of messages to return (default: 20)',
            },
            accounts: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific accounts. If empty, searches all accounts.',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_message',
        description: 'Get details of a specific message, optionally including the full body content.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'The Gmail message ID',
            },
            account: {
              type: 'string',
              description: 'The email address of the account this message belongs to',
            },
            full: {
              type: 'boolean',
              description: 'Whether to include the full message body (default: false)',
            },
          },
          required: ['messageId', 'account'],
        },
      },
      {
        name: 'summary',
        description: 'Get a summary of all connected accounts including unread counts and recent message subjects.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },

      // Archive operations
      {
        name: 'archive_message',
        description: 'Archive a single message (removes it from inbox but keeps it in the account).',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'The Gmail message ID to archive',
            },
            account: {
              type: 'string',
              description: 'The email address of the account this message belongs to',
            },
          },
          required: ['messageId', 'account'],
        },
      },
      {
        name: 'archive_messages',
        description: 'Archive multiple messages at once (removes them from inbox but keeps them in the account).',
        inputSchema: {
          type: 'object',
          properties: {
            messageIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of Gmail message IDs to archive',
            },
            account: {
              type: 'string',
              description: 'The email address of the account these messages belong to',
            },
          },
          required: ['messageIds', 'account'],
        },
      },

      // Send operations
      {
        name: 'send',
        description: 'Send an email from a specific account.',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'The email address of the account to send from',
            },
            to: {
              type: 'array',
              items: { type: 'string' },
              description: 'Recipient email addresses',
            },
            subject: {
              type: 'string',
              description: 'Email subject',
            },
            body: {
              type: 'string',
              description: 'Email body (plain text)',
            },
            cc: {
              type: 'array',
              items: { type: 'string' },
              description: 'CC recipients',
            },
            bcc: {
              type: 'array',
              items: { type: 'string' },
              description: 'BCC recipients',
            },
          },
          required: ['account', 'to', 'subject', 'body'],
        },
      },
      {
        name: 'reply',
        description: 'Reply to a specific message. The account is auto-detected from the original message.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'The Gmail message ID to reply to',
            },
            account: {
              type: 'string',
              description: 'The email address of the account (the one that received the original message)',
            },
            body: {
              type: 'string',
              description: 'Reply body (plain text)',
            },
          },
          required: ['messageId', 'account', 'body'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Account management
      case 'add_account': {
        const result = await accountTools.addAccount();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'list_accounts': {
        const accounts = await accountTools.listAccounts();
        return {
          content: [{ type: 'text', text: JSON.stringify(accounts, null, 2) }],
        };
      }

      case 'remove_account': {
        const result = accountTools.removeAccount(args?.email as string);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // Unified message operations
      case 'get_messages': {
        const result = await messageTools.getMessages({
          maxResults: args?.maxResults as number | undefined,
          accounts: args?.accounts as string[] | undefined,
          labelIds: args?.labelIds as string[] | undefined,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'search': {
        const result = await messageTools.search({
          query: args?.query as string,
          maxResults: args?.maxResults as number | undefined,
          accounts: args?.accounts as string[] | undefined,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_message': {
        const result = await messageTools.getMessage({
          messageId: args?.messageId as string,
          account: args?.account as string,
          full: args?.full as boolean | undefined,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'summary': {
        const result = await messageTools.getSummary();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // Archive operations
      case 'archive_message': {
        const result = await messageTools.archiveMessage({
          messageId: args?.messageId as string,
          account: args?.account as string,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'archive_messages': {
        const result = await messageTools.archiveMessages({
          messageIds: args?.messageIds as string[],
          account: args?.account as string,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // Send operations
      case 'send': {
        const result = await sendTools.send({
          account: args?.account as string,
          to: args?.to as string[],
          subject: args?.subject as string,
          body: args?.body as string,
          cc: args?.cc as string[] | undefined,
          bcc: args?.bcc as string[] | undefined,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'reply': {
        const result = await sendTools.reply({
          messageId: args?.messageId as string,
          account: args?.account as string,
          body: args?.body as string,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Unified Gmail MCP server running on stdio');
}

main().catch(console.error);

// Cleanup on exit
process.on('SIGINT', () => {
  tokenStore.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  tokenStore.close();
  process.exit(0);
});
