import { expect, test, describe } from "vitest";
import {
  createEmailClientFromConfig,
  EmailClientConfig,
  GmailConfig,
} from "./config";
import { GmailClient } from "./gmail/client";

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

  test("throws error for unknown email client type", () => {
    const config = {
      type: "unknown_client_type",
    } as unknown as EmailClientConfig;

    expect(() => createEmailClientFromConfig(config)).toThrow(
      "Unknown destination type: unknown_client_type",
    );
  });
});
