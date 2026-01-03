import { google, gmail_v1 } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { UnifiedMessage, AccountConfig } from './types.js';

export class GmailClient {
  private gmail: gmail_v1.Gmail;
  private email: string;

  constructor(auth: OAuth2Client, email: string) {
    this.gmail = google.gmail({ version: 'v1', auth });
    this.email = email;
  }

  async listMessages(options: {
    maxResults?: number;
    pageToken?: string;
    labelIds?: string[];
    query?: string;
  } = {}): Promise<{ messages: UnifiedMessage[]; nextPageToken?: string }> {
    const response = await this.gmail.users.messages.list({
      userId: 'me',
      maxResults: options.maxResults || 20,
      pageToken: options.pageToken,
      labelIds: options.labelIds,
      q: options.query,
    });

    if (!response.data.messages) {
      return { messages: [] };
    }

    // Fetch full message details in parallel
    const messages = await Promise.all(
      response.data.messages.map(msg => this.getMessage(msg.id!))
    );

    return {
      messages: messages.filter((m): m is UnifiedMessage => m !== null),
      nextPageToken: response.data.nextPageToken || undefined,
    };
  }

  async getMessage(messageId: string): Promise<UnifiedMessage | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = response.data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      const toHeader = getHeader('To');
      const toAddresses = toHeader ? toHeader.split(',').map(s => s.trim()) : [];

      return {
        id: response.data.id!,
        account: this.email,
        threadId: response.data.threadId!,
        subject: getHeader('Subject') || '(No subject)',
        from: getHeader('From'),
        to: toAddresses,
        date: new Date(parseInt(response.data.internalDate || '0')),
        snippet: response.data.snippet || '',
        labels: response.data.labelIds || [],
        isUnread: response.data.labelIds?.includes('UNREAD') || false,
      };
    } catch (err) {
      console.error(`Failed to fetch message ${messageId}:`, err);
      return null;
    }
  }

  async getFullMessage(messageId: string): Promise<{ body: string; html?: string } | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const parts = response.data.payload?.parts || [];
      const body = response.data.payload?.body;

      let textContent = '';
      let htmlContent = '';

      const extractContent = (part: gmail_v1.Schema$MessagePart) => {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          textContent += Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        if (part.mimeType === 'text/html' && part.body?.data) {
          htmlContent += Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        if (part.parts) {
          part.parts.forEach(extractContent);
        }
      };

      if (body?.data) {
        textContent = Buffer.from(body.data, 'base64').toString('utf-8');
      }
      parts.forEach(extractContent);

      return {
        body: textContent || htmlContent,
        html: htmlContent || undefined,
      };
    } catch (err) {
      console.error(`Failed to fetch full message ${messageId}:`, err);
      return null;
    }
  }

  async searchMessages(query: string, maxResults: number = 20): Promise<UnifiedMessage[]> {
    const { messages } = await this.listMessages({ query, maxResults });
    return messages;
  }

  async getUnreadCount(): Promise<number> {
    const response = await this.gmail.users.labels.get({
      userId: 'me',
      id: 'INBOX',
    });
    return response.data.messagesUnread || 0;
  }

  async getTotalCount(): Promise<number> {
    const response = await this.gmail.users.labels.get({
      userId: 'me',
      id: 'INBOX',
    });
    return response.data.messagesTotal || 0;
  }

  async sendEmail(params: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
    threadId?: string;
    inReplyTo?: string;
  }): Promise<string> {
    const headers = [
      `To: ${params.to.join(', ')}`,
      `Subject: ${params.subject}`,
      'Content-Type: text/plain; charset=utf-8',
    ];

    if (params.cc?.length) {
      headers.push(`Cc: ${params.cc.join(', ')}`);
    }
    if (params.bcc?.length) {
      headers.push(`Bcc: ${params.bcc.join(', ')}`);
    }
    if (params.inReplyTo) {
      headers.push(`In-Reply-To: ${params.inReplyTo}`);
      headers.push(`References: ${params.inReplyTo}`);
    }

    const email = [...headers, '', params.body].join('\r\n');
    const encodedEmail = Buffer.from(email).toString('base64url');

    const response = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
        threadId: params.threadId,
      },
    });

    return response.data.id!;
  }

  async getLabels(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.gmail.users.labels.list({ userId: 'me' });
    return (response.data.labels || []).map(label => ({
      id: label.id!,
      name: label.name!,
    }));
  }

  async archiveMessage(messageId: string): Promise<void> {
    await this.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['INBOX'],
      },
    });
  }

  async archiveMessages(messageIds: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    await Promise.all(
      messageIds.map(async (id) => {
        try {
          await this.archiveMessage(id);
          success++;
        } catch (err) {
          console.error(`Failed to archive message ${id}:`, err);
          failed++;
        }
      })
    );

    return { success, failed };
  }
}
