import { expect, test, describe, beforeEach, vi } from "vitest";
import { parseConfig, parseConfigFromFile, Config } from "./config";
import { promises as fs } from "fs";
import { EmailStore } from "./email/store";
import { GmailClient } from "./email/clients/gmail/client";
import { ActualClient } from "./destinations/actual";
import { DBSTransactionParser } from "./email/parsers/dbs/dbs";
import { DiscordNotifier } from "./notifiers/discord";

describe("parseConfig", () => {
  test("parses valid config successfully", () => {
    const config: Config = {
      emailStorePath: ":memory:",
      email: {
        type: "gmail",
        credentialsJsonPath: "/path/to/credentials.json",
        tokenJsonPath: "/path/to/token.json",
        label: "INBOX",
      },
      destination: {
        type: "actual_budget",
        password: "test-password",
        url: "http://localhost:5006",
        syncId: "test-sync-id",
      },
      parser: {
        type: "dbs",
        accountId: "test-account-id",
      },
      notifier: {
        type: "discord",
        webhookUrl: "https://discord.com/api/webhooks/test",
      },
    };

    const result = parseConfig(config);
    expect(result).toBeDefined();
    expect(result.emailStore).toBeInstanceOf(EmailStore);
    expect(result.email).toBeInstanceOf(GmailClient);
    expect(result.destination).toBeInstanceOf(ActualClient);
    expect(result.parser).toBeInstanceOf(DBSTransactionParser);
    expect(result.notifier).toBeInstanceOf(DiscordNotifier);
  });
});

describe("parseConfigFromFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("reads and parses config from file", async () => {
    const configContent: Config = {
      emailStorePath: ":memory:",
      email: {
        type: "gmail",
        credentialsJsonPath: "/path/to/credentials.json",
        tokenJsonPath: "/path/to/token.json",
        label: "INBOX",
      },
      destination: {
        type: "actual_budget",
        password: "test-password",
        url: "http://localhost:5006",
        syncId: "test-sync-id",
      },
      parser: {
        type: "dbs",
        accountId: "test-account-id",
      },
      notifier: {
        type: "discord",
        webhookUrl: "https://discord.com/api/webhooks/test",
      },
    };

    vi.spyOn(fs, "readFile").mockResolvedValue(JSON.stringify(configContent));

    const result = await parseConfigFromFile("/path/to/config.json");
    expect(result).toBeDefined();
    expect(result.emailStore).toBeInstanceOf(EmailStore);
    expect(result.email).toBeInstanceOf(GmailClient);
    expect(result.destination).toBeInstanceOf(ActualClient);
    expect(result.parser).toBeInstanceOf(DBSTransactionParser);
    expect(result.notifier).toBeInstanceOf(DiscordNotifier);
    expect(fs.readFile).toHaveBeenCalledWith("/path/to/config.json", "utf8");
  });

  test("throws error when file cannot be read", async () => {
    vi.spyOn(fs, "readFile").mockRejectedValue(new Error("File not found"));

    await expect(
      parseConfigFromFile("/nonexistent/config.json"),
    ).rejects.toThrow("File not found");
  });

  test("throws error when file contains invalid JSON", async () => {
    vi.spyOn(fs, "readFile").mockResolvedValue("invalid json content");

    await expect(
      parseConfigFromFile("/path/to/invalid.json"),
    ).rejects.toThrow();
  });
});
