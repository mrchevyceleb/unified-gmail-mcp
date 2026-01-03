import type { AccountSummary, UnifiedSummary, AccountConfig } from '../gmail/types.js';
import { GmailClient } from '../gmail/client.js';
import { OAuthManager } from '../auth/oauth.js';
import { TokenStore } from '../auth/token-store.js';

export class SummaryGenerator {
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

  async getSummary(): Promise<UnifiedSummary> {
    const accounts = this.tokenStore.getAccounts();

    if (accounts.length === 0) {
      return {
        totalUnread: 0,
        accounts: [],
      };
    }

    const summaries = await Promise.all(
      accounts.map(async account => {
        try {
          const client = await this.getClientForAccount(account);

          const [unreadCount, totalMessages, recentMessages] = await Promise.all([
            client.getUnreadCount(),
            client.getTotalCount(),
            client.listMessages({ maxResults: 5, labelIds: ['INBOX'] }),
          ]);

          const summary: AccountSummary = {
            email: account.email,
            unreadCount,
            totalMessages,
            recentSubjects: recentMessages.messages.map(m => m.subject).slice(0, 5),
          };

          return summary;
        } catch (err) {
          console.error(`Failed to get summary for ${account.email}:`, err);
          return {
            email: account.email,
            unreadCount: 0,
            totalMessages: 0,
            recentSubjects: [],
          };
        }
      })
    );

    const totalUnread = summaries.reduce((sum, s) => sum + s.unreadCount, 0);

    return {
      totalUnread,
      accounts: summaries,
    };
  }
}
