import { expect, test, describe } from "vitest";
import {
  createEmailClientFromConfig,
  EmailClientConfig,
  GmailConfig,
  ImapConfig,
} from "./config";
import { GmailClient } from "./gmail/client";
import { ImapClient } from "./imap/client";

describe("createEmailClientFromConfig", () => {
  test("creates Gmail client from config", () => {
    const config: GmailConfig = {
      type: "gmail",
      credentialsJsonPath: "/path/to/credentials.json",
      tokenJsonPath: "/path/to/token.json",
      label: "INBOX",
    };

    const client = createEmailClientFromConfig(config);
    expect(client).toBeInstanceOf(GmailClient);
  });

  test("creates Gmail client with optional fields", () => {
    const config: GmailConfig = {
      type: "gmail",
      credentialsJsonPath: "/path/to/credentials.json",
      tokenJsonPath: "/path/to/token.json",
      label: "INBOX",
      headless: true,
      authCode: "test-auth-code",
    };

    const client = createEmailClientFromConfig(config);
    expect(client).toBeInstanceOf(GmailClient);
  });

  test("creates IMAP client from config", () => {
    const config: ImapConfig = {
      type: "imap",
      host: "imap.example.com",
      port: 993,
      secure: true,
      auth: {
        user: "user@example.com",
        pass: "password123",
      },
    };

    const client = createEmailClientFromConfig(config);
    expect(client).toBeInstanceOf(ImapClient);
  });

  test("creates IMAP client with optional fields", () => {
    const config: ImapConfig = {
      type: "imap",
      host: "imap.example.com",
      port: 993,
      secure: true,
      auth: {
        user: "user@example.com",
        pass: "password123",
      },
      mailbox: "Transactions",
      logger: false,
    };

    const client = createEmailClientFromConfig(config);
    expect(client).toBeInstanceOf(ImapClient);
  });

  test("throws error for unknown email client type", () => {
    const config = {
      type: "unknown_client_type",
    } as unknown as EmailClientConfig;

    expect(() => createEmailClientFromConfig(config)).toThrow(
      "Unknown email client type: unknown_client_type",
    );
  });
});
