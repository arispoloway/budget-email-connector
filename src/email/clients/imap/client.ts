import { ImapFlow, FetchMessageObject } from "imapflow";
import { EmailStore } from "../../store";
import { Email, EmailClient } from "../types";
import { ImapConfig } from "../config";
import { simpleParser, ParsedMail } from "mailparser";

function extractEmail(fromHeader: string): string {
  const regex = /<([^>]+)>|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const match = fromHeader.match(regex);
  return match ? match[1] || match[2] : "";
}

export class ImapClient implements EmailClient {
  private config: ImapConfig;
  private client: ImapFlow;
  private connected: boolean;

  constructor(config: ImapConfig) {
    this.config = config;
    this.client = this.newClient();
    this.connected = false;
  }

  private newClient(): ImapFlow {
    let client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure ?? true,
      auth: {
        user: this.config.auth.user,
        pass: this.config.auth.pass,
      },
    });

    client.on("close", () => {
      this.connected = false;
      this.client = this.newClient();
    });

    return client;
  }

  async init(): Promise<void> {
    if (this.connected) {
      return;
    }

    await this.client.connect();
    this.connected = true;
  }

  async close(): Promise<void> {
    if (!this.connected) {
      return;
    }

    await this.client.logout();
    this.client = this.newClient();
    this.connected = false;
  }

  async listUnprocessedMessages(store: EmailStore): Promise<Email[]> {
    await this.init(); // Ensure we're connected

    const mailbox = this.config.mailbox ?? "INBOX";
    const lock = await this.client.getMailboxLock(mailbox);

    const messages: Email[] = [];

    try {
      const now = new Date();
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(now.getMonth() - 1); // TODO: make the lookback configurable
      const searchCriteria = { since: oneMonthAgo };
      const uids = await this.client.search(searchCriteria);

      if (!uids || uids.length === 0) {
        return [];
      }

      for await (const msg of this.client.fetch(uids, {
        uid: true,
        envelope: true,
        source: true,
        internalDate: true,
      })) {
        const emailId = this.buildEmailId(msg);

        if (await store.seenEmail(emailId)) {
          console.log(`Skipped previously seen email with id ${emailId}`);
          continue;
        }

        const email = await this.parseMessage(msg, emailId);
        if (email) {
          messages.push(email);
        }
      }
    } finally {
      lock.release();
    }

    return messages;
  }

  private buildEmailId(msg: FetchMessageObject): string {
    // Use message-id from envelope if available, otherwise construct from UID
    if (msg.envelope?.messageId) {
      return msg.envelope.messageId;
    }
    // Fallback to UID-based ID (unique within this mailbox)
    return `imap-${this.config.host}-${msg.uid}`;
  }

  private async parseMessage(
    msg: FetchMessageObject,
    emailId: string,
  ): Promise<Email | null> {
    const envelope = msg.envelope;

    if (!envelope) {
      console.warn(`Message ${emailId} has no envelope, skipping`);
      return null;
    }

    const subject = envelope.subject ?? "(no subject)";
    let from = "";
    if (envelope.from && envelope.from.length > 0) {
      const fromAddr = envelope.from[0];
      if (fromAddr.address) {
        from = extractEmail(fromAddr.address);
      } else if (fromAddr.name) {
        from = fromAddr.name;
      }
    }

    // Parse the full message source to get body
    let body = "";
    if (msg.source) {
      try {
        const parsed: ParsedMail = await simpleParser(msg.source);
        // Prefer HTML body, fall back to text
        body = parsed.html || parsed.text || "";
      } catch (err) {
        console.warn(`Failed to parse message body for ${emailId}:`, err);
      }
    }

    const date =
      envelope.date ??
      (msg.internalDate ? new Date(msg.internalDate as string) : undefined);

    return {
      id: emailId,
      from,
      subject,
      body,
      date,
      // IMAP doesn't have a web link like Gmail
      link: undefined,
    };
  }
}
