import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';
import type { AccountConfig } from '../gmail/types.js';

const DATA_DIR = join(homedir(), '.unified-gmail-mcp');
const DB_PATH = join(DATA_DIR, 'accounts.db');

export class TokenStore {
  private db: Database.Database;

  constructor() {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        email TEXT PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        token_expiry INTEGER NOT NULL
      )
    `);
  }

  getAccounts(): AccountConfig[] {
    const stmt = this.db.prepare('SELECT * FROM accounts');
    const rows = stmt.all() as Array<{
      email: string;
      access_token: string;
      refresh_token: string;
      token_expiry: number;
    }>;

    return rows.map(row => ({
      email: row.email,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      tokenExpiry: row.token_expiry,
    }));
  }

  getAccount(email: string): AccountConfig | null {
    const stmt = this.db.prepare('SELECT * FROM accounts WHERE email = ?');
    const row = stmt.get(email) as {
      email: string;
      access_token: string;
      refresh_token: string;
      token_expiry: number;
    } | undefined;

    if (!row) return null;

    return {
      email: row.email,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      tokenExpiry: row.token_expiry,
    };
  }

  saveAccount(config: AccountConfig): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO accounts (email, access_token, refresh_token, token_expiry)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(config.email, config.accessToken, config.refreshToken, config.tokenExpiry);
  }

  updateTokens(email: string, accessToken: string, tokenExpiry: number): void {
    const stmt = this.db.prepare(`
      UPDATE accounts SET access_token = ?, token_expiry = ? WHERE email = ?
    `);
    stmt.run(accessToken, tokenExpiry, email);
  }

  removeAccount(email: string): boolean {
    const stmt = this.db.prepare('DELETE FROM accounts WHERE email = ?');
    const result = stmt.run(email);
    return result.changes > 0;
  }

  close(): void {
    this.db.close();
  }
}
