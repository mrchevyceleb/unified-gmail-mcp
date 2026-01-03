import type { UnifiedMessage, AccountConfig } from '../gmail/types.js';
import { GmailClient } from '../gmail/client.js';
import { OAuthManager } from '../auth/oauth.js';
import { TokenStore } from '../auth/token-store.js';

export class MessageAggregator {
  private oauthManager: OAuthManager;
  private tokenStore: TokenStore;

  constructor(oauthManager: OAuthManager, tokenStore: TokenStore) {
    this.oauthManager = oauthManager;
    this.tokenStore = tokenStore;
  }

  private async getClientForAccount(account: AccountConfig): Promise<GmailClient> {
    // Check if token needs refresh
    if (account.tokenExpiry < Date.now() - 60000) {
      const { accessToken, tokenExpiry } = await this.oauthManager.refreshTokens(account);
      this.tokenStore.updateTokens(account.email, accessToken, tokenExpiry);
      account.accessToken = accessToken;
      account.tokenExpiry = tokenExpiry;
    }

    const auth = this.oauthManager.getAuthenticatedClient(account);
    return new GmailClient(auth, account.email);
  }

  async getMessages(options: {
    maxResults?: number;
    accounts?: string[];
    labelIds?: string[];
  } = {}): Promise<UnifiedMessage[]> {
    const allAccounts = this.tokenStore.getAccounts();
    const targetAccounts = options.accounts?.length
      ? allAccounts.filter(a => options.accounts!.includes(a.email))
      : allAccounts;

    if (targetAccounts.length === 0) {
      return [];
    }

    // Calculate per-account limit to get roughly maxResults total
    const perAccountLimit = Math.ceil((options.maxResults || 50) / targetAccounts.length);

    // Fetch from all accounts in parallel
    const results = await Promise.all(
      targetAccounts.map(async account => {
        try {
          const client = await this.getClientForAccount(account);
          const { messages } = await client.listMessages({
            maxResults: perAccountLimit,
            labelIds: options.labelIds,
          });
          return messages;
        } catch (err) {
          console.error(`Failed to fetch messages from ${account.email}:`, err);
          return [];
        }
      })
    );

    // Flatten and sort by date (newest first)
    const allMessages = results.flat();
    allMessages.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Limit to maxResults
    return allMessages.slice(0, options.maxResults || 50);
  }

  async search(query: string, options: {
    maxResults?: number;
    accounts?: string[];
  } = {}): Promise<UnifiedMessage[]> {
    const allAccounts = this.tokenStore.getAccounts();
    const targetAccounts = options.accounts?.length
      ? allAccounts.filter(a => options.accounts!.includes(a.email))
      : allAccounts;

    if (targetAccounts.length === 0) {
      return [];
    }

    const perAccountLimit = Math.ceil((options.maxResults || 20) / targetAccounts.length);

    const results = await Promise.all(
      targetAccounts.map(async account => {
        try {
          const client = await this.getClientForAccount(account);
          return await client.searchMessages(query, perAccountLimit);
        } catch (err) {
          console.error(`Failed to search in ${account.email}:`, err);
          return [];
        }
      })
    );

    const allMessages = results.flat();
    allMessages.sort((a, b) => b.date.getTime() - a.date.getTime());

    return allMessages.slice(0, options.maxResults || 20);
  }

  async getMessage(messageId: string, account: string): Promise<UnifiedMessage | null> {
    const accountConfig = this.tokenStore.getAccount(account);
    if (!accountConfig) {
      throw new Error(`Account not found: ${account}`);
    }

    const client = await this.getClientForAccount(accountConfig);
    return client.getMessage(messageId);
  }

  async getFullMessage(messageId: string, account: string): Promise<{ body: string; html?: string } | null> {
    const accountConfig = this.tokenStore.getAccount(account);
    if (!accountConfig) {
      throw new Error(`Account not found: ${account}`);
    }

    const client = await this.getClientForAccount(accountConfig);
    return client.getFullMessage(messageId);
  }

  async archiveMessage(messageId: string, account: string): Promise<void> {
    const accountConfig = this.tokenStore.getAccount(account);
    if (!accountConfig) {
      throw new Error(`Account not found: ${account}`);
    }

    const client = await this.getClientForAccount(accountConfig);
    await client.archiveMessage(messageId);
  }

  async archiveMessages(messageIds: string[], account: string): Promise<{ success: number; failed: number }> {
    const accountConfig = this.tokenStore.getAccount(account);
    if (!accountConfig) {
      throw new Error(`Account not found: ${account}`);
    }

    const client = await this.getClientForAccount(accountConfig);
    return client.archiveMessages(messageIds);
  }
}
