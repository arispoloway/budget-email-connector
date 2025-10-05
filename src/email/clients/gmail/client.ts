import { google } from "googleapis";
import { EmailStore } from "../../store";
import { Email } from "../types";
import { GmailConfig } from "../config";
import { promises as fs } from "fs";
import path from "path";
import readline from "readline";
import { OAuth2Client } from "google-auth-library";

function extractEmail(fromHeader: string): string {
  const regex = /<([^>]+)>|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const match = fromHeader.match(regex);
  return match ? match[1] || match[2] : "";
}

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

export class GmailClient {
  private config: GmailConfig;
  private auth!: OAuth2Client;
  private credentials: any;

  constructor(config: GmailConfig) {
    this.config = config;
  }

  async init() {
    await this.loadCredentials();
    await this.authorize();
  }

  private async loadCredentials(): Promise<void> {
    this.credentials = JSON.parse(
      await fs.readFile(this.config.credentialsJsonPath, "utf8"),
    );
  }

  async authorize(): Promise<void> {
    const { client_secret, client_id, redirect_uris } = this.credentials.web;

    this.auth = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0],
    );

    // Try to load existing token
    try {
      const token = await fs.readFile(this.config.tokenJsonPath, "utf8");
      const tokenData = JSON.parse(token);
      this.auth.setCredentials(tokenData);

      // Check if token is close to expiry and refresh if needed
      await this.ensureValidToken();
    } catch {
      this.auth = await this.getNewToken();
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.auth.credentials.expiry_date) {
      // No expiry date, assume token is invalid
      await this.refreshToken();
      return;
    }

    const now = Date.now();
    const expiryTime = this.auth.credentials.expiry_date;
    const timeUntilExpiry = expiryTime - now;

    // Refresh token if it expires within the next 30 minutes
    if (timeUntilExpiry < 30 * 60 * 1000) {
      console.log("Token is close to expiry, refreshing...");
      await this.refreshToken();
    }
  }

  private async refreshToken(): Promise<void> {
    if (!this.auth.credentials.refresh_token) {
      throw new Error("No refresh token available. Please re-authenticate.");
    }

    try {
      const { credentials } = await this.auth.refreshAccessToken();
      this.auth.setCredentials(credentials);

      // Save the refreshed token
      await fs.writeFile(
        this.config.tokenJsonPath,
        JSON.stringify(credentials),
      );
      console.log("Token refreshed and saved");
    } catch (error) {
      console.error("Failed to refresh token:", error);
      throw new Error("Token refresh failed. Please re-authenticate.");
    }
  }

  private async getNewToken(): Promise<OAuth2Client> {
    const authUrl = this.auth.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });

    if (this.config.headless) {
      if (this.config.authCode) {
        // Use provided auth code for headless authentication
        const { tokens } = await this.auth.getToken(this.config.authCode);
        this.auth.setCredentials(tokens);

        await fs.writeFile(this.config.tokenJsonPath, JSON.stringify(tokens));
        console.log("Token stored to", this.config.tokenJsonPath);

        return this.auth;
      } else {
        throw new Error(
          `Headless mode enabled but no auth code provided. Please visit this URL to get an auth code: ${authUrl}\n` +
            "Then set the 'authCode' property in your GmailConfig.",
        );
      }
    } else {
      // Interactive mode
      console.log("Authorize this app by visiting this URL:", authUrl);

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const code: string = await new Promise((resolve) => {
        rl.question("Enter the code from that page here: ", (input) => {
          rl.close();
          resolve(input);
        });
      });

      const { tokens } = await this.auth.getToken(code);
      this.auth.setCredentials(tokens);

      await fs.writeFile(this.config.tokenJsonPath, JSON.stringify(tokens));
      console.log("Token stored to", this.config.tokenJsonPath);

      return this.auth;
    }
  }

  async listUnprocessedMessages(store: EmailStore): Promise<Email[]> {
    // Ensure token is valid before making API calls
    await this.ensureValidToken();

    const gmail = google.gmail({ version: "v1", auth: this.auth });

    const res = await gmail.users.messages.list({
      userId: "me",
      q: `label:${this.config.label}`,
      maxResults: 50, // TODO: ideally this would be able to iterate through if there are more than this many transactions
    });

    if (!res.data.messages || res.data.messages.length === 0) {
      return [];
    }

    const messages: Email[] = [];

    for (const msg of res.data.messages) {
      if (await store.seenEmail(msg.id!)) {
        console.log(`Skipped previously seen email with id ${msg.id}`);
        continue;
      }
      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });

      const payload = full.data.payload;
      const headers = payload?.headers ?? [];
      const subject =
        headers.find((h) => h.name?.toLowerCase() === "subject")?.value ??
        "(no subject)";
      let from =
        headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
      if (from) {
        from = extractEmail(from);
      }

      let body = "";
      if (payload?.parts) {
        const textPart = payload.parts.find(
          (p) =>
            (p.mimeType === "text/plain" || p.mimeType === "text/html") &&
            p.body?.data,
        );
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, "base64").toString("utf8");
        }
      }

      let date: Date | undefined;
      if (full.data.internalDate) {
        date = new Date(Number(full.data.internalDate));
      }

      let link: string | undefined;
      if (full.data.threadId) {
        link = `https://mail.google.com/mail/u/0/#inbox/${full.data.threadId}`;
      }

      // TODO: somehow get a link from this?
      messages.push({ id: msg.id!, from, subject, body, date, link });
    }

    return messages;
  }
}
