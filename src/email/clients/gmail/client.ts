import { google } from "googleapis";
import { EmailStore } from "../../store";
import { Email } from "../types";
import { GmailConfig } from "../config";
import { promises as fs } from "fs";
import path from "path";
import readline from "readline";

function extractEmail(fromHeader: string): string {
  const regex = /<([^>]+)>|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const match = fromHeader.match(regex);
  return match ? match[1] || match[2] : "";
}

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

export class GmailClient {
  private config: GmailConfig;
  private auth: any;

  constructor(config: GmailConfig) {
    this.config = config;
  }

  async init() {
    await this.authorize();
  }

  async authorize(): Promise<void> {
    const credentials = JSON.parse(
      await fs.readFile(this.config.credentialsJsonPath, "utf8"),
    );
    const { client_secret, client_id, redirect_uris } = credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris,
    );

    // Try to load existing token
    try {
      const token = await fs.readFile(this.config.tokenJsonPath, "utf8");
      oAuth2Client.setCredentials(JSON.parse(token));
      this.auth = oAuth2Client;
    } catch {
      this.auth = await this.getNewToken(oAuth2Client);
    }
  }

  private async getNewToken(oAuth2Client: any): Promise<any> {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
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

    const tokenResponse = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokenResponse.tokens);

    await fs.writeFile(
      this.config.tokenJsonPath,
      JSON.stringify(tokenResponse.tokens),
    );
    console.log("Token stored to", this.config.tokenJsonPath);

    return oAuth2Client;
  }

  async listUnprocessedMessages(store: EmailStore): Promise<Email[]> {
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
