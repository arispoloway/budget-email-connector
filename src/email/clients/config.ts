import { GmailClient } from "./gmail/client";
import { ImapClient } from "./imap/client";
import { EmailClient } from "./types";
import { Logger } from "imapflow";

export type EmailClientConfig = GmailConfig | ImapConfig;

export interface GmailConfig {
  type: "gmail";
  credentialsJsonPath: string;
  tokenJsonPath: string;
  label: string;
  headless?: boolean;
  authCode?: string;
}

export interface ImapConfig {
  type: "imap";
  /** IMAP server hostname */
  host: string;
  /** IMAP server port (typically 993 for secure, 143 for insecure) */
  port: number;
  /** Whether to use TLS (default: true) */
  secure?: boolean;
  /** Authentication credentials */
  auth: {
    user: string;
    pass: string;
  };
  /** Mailbox to fetch from (default: "INBOX") */
  mailbox?: string;
  /** Custom logger instance, or false to disable logging (default: false) */
  logger?: Logger | false;
}

export function createEmailClientFromConfig(
  config: EmailClientConfig,
): EmailClient {
  switch (config.type) {
    case "gmail":
      return new GmailClient(config);
    case "imap":
      return new ImapClient(config);
    default:
      throw new Error(`Unknown email client type: ${(config as any).type}`);
  }
}
