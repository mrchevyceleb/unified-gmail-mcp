export interface AccountConfig {
  email: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number; // Unix timestamp
}

export interface UnifiedMessage {
  id: string;
  account: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  date: Date;
  snippet: string;
  labels: string[];
  isUnread: boolean;
  rfc2822MessageId?: string; // RFC 2822 Message-ID header for threading
}

export interface AccountSummary {
  email: string;
  unreadCount: number;
  totalMessages: number;
  recentSubjects: string[];
}

export interface UnifiedSummary {
  totalUnread: number;
  accounts: AccountSummary[];
}

export interface SendEmailParams {
  account: string;
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
}

export interface SearchParams {
  query: string;
  maxResults?: number;
  accounts?: string[]; // Filter to specific accounts, or all if empty
}

export interface GetMessagesParams {
  maxResults?: number;
  pageToken?: string;
  accounts?: string[]; // Filter to specific accounts, or all if empty
  labelIds?: string[];
}
