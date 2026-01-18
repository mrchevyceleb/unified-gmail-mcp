import { google, gmail_v1 } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { marked } from 'marked';
import type { UnifiedMessage, AccountConfig } from './types.js';

// Email format type
export type EmailFormat = 'plain' | 'html' | 'markdown';

// Attachment interface
export interface Attachment {
  filename: string;
  content: string; // base64 encoded
  mimeType: string;
}

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
        metadataHeaders: ['From', 'To', 'Subject', 'Date', 'Message-ID'],
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
        rfc2822MessageId: getHeader('Message-ID') || undefined,
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

  /**
   * Convert markdown to styled HTML suitable for email clients
   */
  private convertMarkdownToHtml(markdown: string): string {
    const htmlBody = marked.parse(markdown, { async: false }) as string;
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #1a1a1a;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    h1 { font-size: 24px; }
    h2 { font-size: 20px; }
    h3 { font-size: 18px; }
    p {
      margin: 1em 0;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    ul, ol {
      padding-left: 1.5em;
      margin: 1em 0;
    }
    li {
      margin: 0.5em 0;
    }
    blockquote {
      border-left: 4px solid #e0e0e0;
      margin: 1em 0;
      padding: 0.5em 1em;
      color: #666666;
      background-color: #f9f9f9;
    }
    code {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 14px;
      background-color: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
    }
    pre {
      background-color: #f4f4f4;
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
    }
    hr {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 2em 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #e0e0e0;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: #f4f4f4;
      font-weight: 600;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
${htmlBody}
</body>
</html>`;
  }

  /**
   * Build a MIME multipart message with support for HTML and attachments
   */
  private buildMimeMessage(params: {
    to: string[];
    subject: string;
    textBody: string;
    htmlBody?: string;
    cc?: string[];
    bcc?: string[];
    inReplyTo?: string;
    attachments?: Attachment[];
  }): string {
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mixedBoundary = `mixed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const hasAttachments = params.attachments && params.attachments.length > 0;
    const hasHtml = !!params.htmlBody;

    const headers: string[] = [
      `To: ${params.to.join(', ')}`,
      `Subject: ${params.subject}`,
      'MIME-Version: 1.0',
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

    let messageParts: string[] = [];

    if (hasAttachments) {
      // Use multipart/mixed as the outer type when we have attachments
      headers.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
      
      messageParts.push(...headers, '');
      
      // Start mixed boundary for the body part
      messageParts.push(`--${mixedBoundary}`);
      
      if (hasHtml) {
        // Add multipart/alternative for text and HTML
        messageParts.push(`Content-Type: multipart/alternative; boundary="${boundary}"`, '');
        messageParts.push(`--${boundary}`);
        messageParts.push('Content-Type: text/plain; charset=utf-8', '');
        messageParts.push(params.textBody, '');
        messageParts.push(`--${boundary}`);
        messageParts.push('Content-Type: text/html; charset=utf-8', '');
        messageParts.push(params.htmlBody!, '');
        messageParts.push(`--${boundary}--`, '');
      } else {
        // Plain text only
        messageParts.push('Content-Type: text/plain; charset=utf-8', '');
        messageParts.push(params.textBody, '');
      }

      // Add attachments
      for (const attachment of params.attachments!) {
        messageParts.push(`--${mixedBoundary}`);
        messageParts.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`);
        messageParts.push('Content-Transfer-Encoding: base64');
        messageParts.push(`Content-Disposition: attachment; filename="${attachment.filename}"`, '');
        
        // Split base64 content into lines of 76 characters for proper MIME formatting
        const base64Lines = attachment.content.match(/.{1,76}/g) || [];
        messageParts.push(base64Lines.join('\r\n'), '');
      }

      messageParts.push(`--${mixedBoundary}--`);
    } else if (hasHtml) {
      // No attachments, but has HTML - use multipart/alternative
      headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
      
      messageParts.push(...headers, '');
      messageParts.push(`--${boundary}`);
      messageParts.push('Content-Type: text/plain; charset=utf-8', '');
      messageParts.push(params.textBody, '');
      messageParts.push(`--${boundary}`);
      messageParts.push('Content-Type: text/html; charset=utf-8', '');
      messageParts.push(params.htmlBody!, '');
      messageParts.push(`--${boundary}--`);
    } else {
      // Plain text only, no attachments
      headers.push('Content-Type: text/plain; charset=utf-8');
      messageParts.push(...headers, '', params.textBody);
    }

    return messageParts.join('\r\n');
  }

  async sendEmail(params: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
    threadId?: string;
    inReplyTo?: string;
    format?: EmailFormat;
    attachments?: Attachment[];
  }): Promise<string> {
    const format = params.format || 'plain';
    
    let textBody = params.body;
    let htmlBody: string | undefined;

    if (format === 'html') {
      // Body is already HTML
      htmlBody = params.body;
      // Create a plain text version by stripping tags (basic)
      textBody = params.body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    } else if (format === 'markdown') {
      // Convert markdown to HTML
      htmlBody = this.convertMarkdownToHtml(params.body);
      textBody = params.body; // Keep original markdown as plain text fallback
    }

    const email = this.buildMimeMessage({
      to: params.to,
      subject: params.subject,
      textBody,
      htmlBody,
      cc: params.cc,
      bcc: params.bcc,
      inReplyTo: params.inReplyTo,
      attachments: params.attachments,
    });

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
