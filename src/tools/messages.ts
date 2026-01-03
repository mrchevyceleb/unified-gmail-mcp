import type { UnifiedMessage, UnifiedSummary } from '../gmail/types.js';
import { MessageAggregator } from '../unified/aggregator.js';
import { SummaryGenerator } from '../unified/summary.js';

export class MessageTools {
  private aggregator: MessageAggregator;
  private summaryGenerator: SummaryGenerator;

  constructor(aggregator: MessageAggregator, summaryGenerator: SummaryGenerator) {
    this.aggregator = aggregator;
    this.summaryGenerator = summaryGenerator;
  }

  async getMessages(params: {
    maxResults?: number;
    accounts?: string[];
    labelIds?: string[];
  } = {}): Promise<{
    messages: UnifiedMessage[];
    count: number;
  }> {
    const messages = await this.aggregator.getMessages({
      maxResults: params.maxResults || 50,
      accounts: params.accounts,
      labelIds: params.labelIds,
    });

    return {
      messages,
      count: messages.length,
    };
  }

  async search(params: {
    query: string;
    maxResults?: number;
    accounts?: string[];
  }): Promise<{
    messages: UnifiedMessage[];
    count: number;
    query: string;
  }> {
    const messages = await this.aggregator.search(params.query, {
      maxResults: params.maxResults || 20,
      accounts: params.accounts,
    });

    return {
      messages,
      count: messages.length,
      query: params.query,
    };
  }

  async getMessage(params: {
    messageId: string;
    account: string;
    full?: boolean;
  }): Promise<{
    message?: UnifiedMessage;
    body?: string;
    html?: string;
    error?: string;
  }> {
    try {
      const message = await this.aggregator.getMessage(params.messageId, params.account);

      if (!message) {
        return { error: 'Message not found' };
      }

      if (params.full) {
        const fullContent = await this.aggregator.getFullMessage(params.messageId, params.account);
        return {
          message,
          body: fullContent?.body,
          html: fullContent?.html,
        };
      }

      return { message };
    } catch (err) {
      return { error: String(err) };
    }
  }

  async getSummary(): Promise<UnifiedSummary> {
    return this.summaryGenerator.getSummary();
  }

  async archiveMessage(params: {
    messageId: string;
    account: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.aggregator.archiveMessage(params.messageId, params.account);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  async archiveMessages(params: {
    messageIds: string[];
    account: string;
  }): Promise<{
    success: boolean;
    archived: number;
    failed: number;
    error?: string;
  }> {
    try {
      const result = await this.aggregator.archiveMessages(params.messageIds, params.account);
      return {
        success: result.failed === 0,
        archived: result.success,
        failed: result.failed,
      };
    } catch (err) {
      return { success: false, archived: 0, failed: params.messageIds.length, error: String(err) };
    }
  }
}
