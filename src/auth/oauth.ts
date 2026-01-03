import { google } from 'googleapis';
import { createServer } from 'http';
import open from 'open';
import type { AccountConfig } from '../gmail/types.js';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/userinfo.email',
];

const REDIRECT_PORT = 8089;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

export class OAuthManager {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      throw new Error('GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set');
    }
  }

  private createOAuth2Client() {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      REDIRECT_URI
    );
  }

  async startAuthFlow(): Promise<AccountConfig> {
    const oauth2Client = this.createOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force consent to get refresh token
    });

    return new Promise((resolve, reject) => {
      const server = createServer(async (req, res) => {
        try {
          const url = new URL(req.url || '', `http://localhost:${REDIRECT_PORT}`);

          if (url.pathname === '/callback') {
            const code = url.searchParams.get('code');

            if (!code) {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end('<h1>Error: No authorization code received</h1>');
              reject(new Error('No authorization code'));
              return;
            }

            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            // Get user email
            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
            const userInfo = await oauth2.userinfo.get();
            const email = userInfo.data.email;

            if (!email) {
              throw new Error('Could not retrieve email from Google');
            }

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <h1>Authentication Successful!</h1>
              <p>Account ${email} has been added to your unified inbox.</p>
              <p>You can close this window.</p>
            `);

            server.close();

            resolve({
              email,
              accessToken: tokens.access_token!,
              refreshToken: tokens.refresh_token!,
              tokenExpiry: tokens.expiry_date || Date.now() + 3600000,
            });
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`<h1>Error during authentication</h1><p>${err}</p>`);
          server.close();
          reject(err);
        }
      });

      server.listen(REDIRECT_PORT, () => {
        console.log(`OAuth callback server listening on port ${REDIRECT_PORT}`);
        open(authUrl);
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('Authentication timed out'));
      }, 300000);
    });
  }

  async refreshTokens(account: AccountConfig): Promise<{ accessToken: string; tokenExpiry: number }> {
    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: account.refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token!,
      tokenExpiry: credentials.expiry_date || Date.now() + 3600000,
    };
  }

  getAuthenticatedClient(account: AccountConfig) {
    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.tokenExpiry,
    });
    return oauth2Client;
  }
}
