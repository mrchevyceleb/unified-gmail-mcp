import type { AccountConfig } from '../gmail/types.js';
import { GmailClient, type EmailFormat, type Attachment } from '../gmail/client.js';
import { OAuthManager } from '../auth/oauth.js';
import { TokenStore } from '../auth/token-store.js';
import { MessageAggregator } from '../unified/aggregator.js';

export class SendTools {
  private oauthManager: OAuthManager;
  private tokenStore: TokenStore;
  private aggregator: MessageAggregator;

  constructor(oauthManager: OAuthManager, tokenStore: TokenStore, aggregator: MessageAggregator) {
    this.oauthManager = oauthManager;
    this.tokenStore = tokenStore;
    this.aggregator = aggregator;
  }

  private async getClientForAccount(account: AccountConfig): Promise<GmailClient> {
    if (account.tokenExpiry < Date.now() - 60000) {
      const { accessToken, tokenExpiry } = await this.oauthManager.refreshTokens(account);
      this.tokenStore.updateTokens(account.email, accessToken, tokenExpiry);
      account.accessToken = accessToken;
      account.tokenExpiry = tokenExpiry;
    }

    const auth = this.oauthManager.getAuthenticatedClient(account);
    return new GmailClient(auth, account.email);
  }

  async send(params: {
    account: string;
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
    format?: EmailFormat;
    attachments?: Attachment[];
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const accountConfig = this.tokenStore.getAccount(params.account);
      if (!accountConfig) {
        return { success: false, error: `Account not found: ${params.account}` };
      }

      const client = await this.getClientForAccount(accountConfig);
      const messageId = await client.sendEmail({
        to: params.to,
        subject: params.subject,
        body: params.body,
        cc: params.cc,
        bcc: params.bcc,
        format: params.format,
        attachments: params.attachments,
      });

      return { success: true, messageId };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  async reply(params: {
    messageId: string;
    account: string;
    body: string;
    format?: EmailFormat;
    attachments?: Attachment[];
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const accountConfig = this.tokenStore.getAccount(params.account);
      if (!accountConfig) {
        return { success: false, error: `Account not found: ${params.account}` };
      }

      // Get original message to extract reply details
      const originalMessage = await this.aggregator.getMessage(params.messageId, params.account);
      if (!originalMessage) {
        return { success: false, error: 'Original message not found' };
      }

      const client = await this.getClientForAccount(accountConfig);

      // Extract the sender's email from the From header
      const fromMatch = originalMessage.from.match(/<([^>]+)>/) || [null, originalMessage.from];
      const replyTo = fromMatch[1] || originalMessage.from;

      const subject = originalMessage.subject.startsWith('Re:')
        ? originalMessage.subject
        : `Re: ${originalMessage.subject}`;

      const messageId = await client.sendEmail({
        to: [replyTo],
        subject,
        body: params.body,
        threadId: originalMessage.threadId,
        inReplyTo: originalMessage.rfc2822MessageId,
        format: params.format,
        attachments: params.attachments,
      });

      return { success: true, messageId };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}
