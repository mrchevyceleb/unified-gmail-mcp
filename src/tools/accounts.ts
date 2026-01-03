import type { AccountConfig } from '../gmail/types.js';
import { OAuthManager } from '../auth/oauth.js';
import { TokenStore } from '../auth/token-store.js';
import { GmailClient } from '../gmail/client.js';

export class AccountTools {
  private oauthManager: OAuthManager;
  private tokenStore: TokenStore;

  constructor(oauthManager: OAuthManager, tokenStore: TokenStore) {
    this.oauthManager = oauthManager;
    this.tokenStore = tokenStore;
  }

  async addAccount(): Promise<{ success: boolean; email?: string; error?: string }> {
    try {
      const account = await this.oauthManager.startAuthFlow();
      this.tokenStore.saveAccount(account);
      return { success: true, email: account.email };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  async listAccounts(): Promise<Array<{
    email: string;
    unreadCount: number;
    isConnected: boolean;
  }>> {
    const accounts = this.tokenStore.getAccounts();

    const results = await Promise.all(
      accounts.map(async account => {
        try {
          // Try to refresh and get unread count to verify connection
          if (account.tokenExpiry < Date.now() - 60000) {
            const { accessToken, tokenExpiry } = await this.oauthManager.refreshTokens(account);
            this.tokenStore.updateTokens(account.email, accessToken, tokenExpiry);
            account.accessToken = accessToken;
            account.tokenExpiry = tokenExpiry;
          }

          const auth = this.oauthManager.getAuthenticatedClient(account);
          const client = new GmailClient(auth, account.email);
          const unreadCount = await client.getUnreadCount();

          return {
            email: account.email,
            unreadCount,
            isConnected: true,
          };
        } catch (err) {
          console.error(`Failed to verify ${account.email}:`, err);
          return {
            email: account.email,
            unreadCount: 0,
            isConnected: false,
          };
        }
      })
    );

    return results;
  }

  removeAccount(email: string): { success: boolean; message: string } {
    const removed = this.tokenStore.removeAccount(email);
    if (removed) {
      return { success: true, message: `Account ${email} removed successfully` };
    }
    return { success: false, message: `Account ${email} not found` };
  }
}
