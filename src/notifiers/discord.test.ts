import { expect, test, describe, beforeEach, vi } from "vitest";
import { DiscordNotifier } from "./discord";
import { Email } from "../email/clients/types";
import { Transaction } from "../email/parsers/parser";
import Decimal from "decimal.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("DiscordNotifier", () => {
  const webhookUrl = "https://discord.com/api/webhooks/test/webhook";
  let notifier: DiscordNotifier;

  beforeEach(() => {
    notifier = new DiscordNotifier(webhookUrl);
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });
  });

  describe("notifyTransactionsImported", () => {
    test("sends embed for payment transaction (negative amount)", async () => {
      const email: Email = {
        id: "email123",
        from: "bank@example.com",
        subject: "Transaction Alert",
        body: "<html>...</html>",
        date: new Date("2024-01-15T10:30:00Z"),
        link: "https://bank.com/email/123",
      };

      const transaction: Transaction = {
        accountId: "account1",
        importId: "import1",
        date: new Date("2024-01-15T10:30:00+08:00"),
        amount: new Decimal("-150.50"),
        payee: "Coffee Shop",
        notes: "Morning coffee",
      };

      await notifier.notifyTransactionsImported(email, [transaction]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );

      const callArgs = mockFetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      expect(payload.embeds).toHaveLength(1);
      const embed = payload.embeds[0];

      expect(embed.title).toBe("💸 Payment Sent");
      expect(embed.color).toBe(0xed4245); // Red color for payments
      expect(embed.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "Amount",
            value: "-$150.50",
            inline: true,
          }),
          expect.objectContaining({
            name: "Payee",
            value: "`Coffee Shop`",
            inline: false,
          }),
          expect.objectContaining({
            name: "Notes",
            value: "`Morning coffee`",
            inline: false,
          }),
        ]),
      );
      expect(embed.footer.text).toBe(
        "[View Email](https://bank.com/email/123)",
      );
      expect(embed.timestamp).toBeDefined();
    });

    test("sends embed for received transaction (positive amount)", async () => {
      const email: Email = {
        id: "email456",
        from: "bank@example.com",
        subject: "Transfer Received",
        body: "<html>...</html>",
      };

      const transaction: Transaction = {
        accountId: "account1",
        importId: "import2",
        date: new Date("2024-01-16T14:20:00+08:00"),
        amount: new Decimal("500.00"),
        payee: "John Doe",
        notes: "Payment for services",
      };

      await notifier.notifyTransactionsImported(email, [transaction]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      expect(payload.embeds).toHaveLength(1);
      const embed = payload.embeds[0];

      expect(embed.title).toBe("💰 Money Received");
      expect(embed.color).toBe(0x57f287); // Green color for received
      expect(embed.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "Amount",
            value: "+$500.00",
            inline: true,
          }),
          expect.objectContaining({
            name: "Payee",
            value: "`John Doe`",
            inline: false,
          }),
          expect.objectContaining({
            name: "Notes",
            value: "`Payment for services`",
            inline: false,
          }),
        ]),
      );
      expect(embed.footer.text).toContain("From: bank@example.com");
      expect(embed.footer.text).toContain("Subject: Transfer Received");
    });

    test("sends multiple embeds for multiple transactions", async () => {
      const email: Email = {
        id: "email789",
        from: "bank@example.com",
        subject: "Multiple Transactions",
        body: "<html>...</html>",
      };

      const transactions: Transaction[] = [
        {
          accountId: "account1",
          importId: "import3",
          date: new Date("2024-01-17T09:00:00+08:00"),
          amount: new Decimal("-25.00"),
          payee: "Gas Station",
        },
        {
          accountId: "account1",
          importId: "import4",
          date: new Date("2024-01-17T12:00:00+08:00"),
          amount: new Decimal("100.00"),
          payee: "Client Payment",
          notes: "Invoice #123",
        },
      ];

      await notifier.notifyTransactionsImported(email, transactions);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      expect(payload.embeds).toHaveLength(2);
      expect(payload.embeds[0].title).toBe("💸 Payment Sent");
      expect(payload.embeds[1].title).toBe("💰 Money Received");
    });

    test("handles transaction without notes", async () => {
      const email: Email = {
        id: "email_no_notes",
        from: "bank@example.com",
        subject: "Transaction",
        body: "<html>...</html>",
      };

      const transaction: Transaction = {
        accountId: "account1",
        importId: "import5",
        date: new Date("2024-01-18T15:00:00+08:00"),
        amount: new Decimal("-50.00"),
        payee: "Restaurant",
        // No notes field
      };

      await notifier.notifyTransactionsImported(email, [transaction]);

      const callArgs = mockFetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);
      const embed = payload.embeds[0];

      // Should not have a Notes field
      const notesField = embed.fields.find((f: any) => f.name === "Notes");
      expect(notesField).toBeUndefined();
    });

    test("handles email without link", async () => {
      const email: Email = {
        id: "email_no_link",
        from: "test@example.com",
        subject: "Test Subject",
        body: "<html>...</html>",
        // No link field
      };

      const transaction: Transaction = {
        accountId: "account1",
        importId: "import6",
        date: new Date("2024-01-19T10:00:00+08:00"),
        amount: new Decimal("-10.00"),
        payee: "Store",
      };

      await notifier.notifyTransactionsImported(email, [transaction]);

      const callArgs = mockFetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);
      const embed = payload.embeds[0];

      expect(embed.footer.text).toContain("From: test@example.com");
      expect(embed.footer.text).toContain("Subject: Test Subject");
      expect(embed.footer.text).not.toContain("[View Email]");
    });

    test("formats decimal amounts correctly", async () => {
      const email: Email = {
        id: "email_decimal",
        from: "bank@example.com",
        subject: "Transaction",
        body: "<html>...</html>",
      };

      const transaction: Transaction = {
        accountId: "account1",
        importId: "import7",
        date: new Date("2024-01-20T10:00:00+08:00"),
        amount: new Decimal("123.456"), // More than 2 decimal places
        payee: "Vendor",
      };

      await notifier.notifyTransactionsImported(email, [transaction]);

      const callArgs = mockFetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);
      const amountField = payload.embeds[0].fields.find(
        (f: any) => f.name === "Amount",
      );

      expect(amountField.value).toBe("+$123.46"); // Rounded to 2 decimal places
    });

    test("escapes markdown characters in payee and notes", async () => {
      const email: Email = {
        id: "email_markdown",
        from: "bank@example.com",
        subject: "Transaction",
        body: "<html>...</html>",
      };

      const transaction: Transaction = {
        accountId: "account1",
        importId: "import_markdown",
        date: new Date("2024-01-21T10:00:00+08:00"),
        amount: new Decimal("-50.00"),
        payee: "**BOLD** Store *italic* ~strikethrough~",
        notes: "_underscore_ and `backtick` test",
      };

      await notifier.notifyTransactionsImported(email, [transaction]);

      const callArgs = mockFetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);
      const payeeField = payload.embeds[0].fields.find(
        (f: any) => f.name === "Payee",
      );
      const notesField = payload.embeds[0].fields.find(
        (f: any) => f.name === "Notes",
      );

      // Should be wrapped in backticks to prevent markdown interpretation
      expect(payeeField.value).toBe(
        "`**BOLD** Store *italic* ~strikethrough~`",
      );
      expect(notesField.value).toBe("`_underscore_ and `backtick` test`");
    });
  });

  describe("notifyEmailSkipped", () => {
    test("sends embed for skipped email", async () => {
      const email: Email = {
        id: "skipped_email",
        from: "sender@example.com",
        subject: "Not a transaction",
        body: "<html>...</html>",
        link: "https://email.link/123",
      };

      await notifier.notifyEmailSkipped(email, "Email format not recognized");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      expect(payload.embeds).toHaveLength(1);
      const embed = payload.embeds[0];

      expect(embed.title).toBe("⏭️ Email Skipped");
      expect(embed.description).toBe("Email format not recognized");
      expect(embed.color).toBe(0x5865f2); // Blurple
      expect(embed.fields).toHaveLength(1);
      expect(embed.fields[0].name).toBe("Email Details");
      expect(embed.fields[0].value).toBe(
        "[View Email](https://email.link/123)",
      );
      expect(embed.timestamp).toBeDefined();
    });

    test("handles skipped email without link", async () => {
      const email: Email = {
        id: "skipped_no_link",
        from: "sender@example.com",
        subject: "Marketing Email",
        body: "<html>...</html>",
      };

      await notifier.notifyEmailSkipped(email, "Not a bank email");

      const callArgs = mockFetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);
      const embed = payload.embeds[0];

      expect(embed.fields[0].value).toContain("From: sender@example.com");
      expect(embed.fields[0].value).toContain("Subject: Marketing Email");
    });
  });

  describe("notifyError", () => {
    test("sends error embed with message", async () => {
      const errorMessage = "Failed to parse transaction: invalid format";

      await notifier.notifyError(errorMessage);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      expect(payload.embeds).toHaveLength(1);
      const embed = payload.embeds[0];

      expect(embed.title).toBe("❌ Error");
      expect(embed.description).toBe(errorMessage);
      expect(embed.color).toBe(0xed4245); // Red
      expect(embed.timestamp).toBeDefined();
    });

    test("handles multi-line error messages", async () => {
      const errorMessage =
        "Error while parsing transaction email: email123\nInvalid date format";

      await notifier.notifyError(errorMessage);

      const callArgs = mockFetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);
      const embed = payload.embeds[0];

      expect(embed.description).toBe(errorMessage);
    });
  });

  describe("error handling", () => {
    test("throws error when fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });

      const email: Email = {
        id: "error_email",
        from: "bank@example.com",
        subject: "Transaction",
        body: "<html>...</html>",
      };

      const transaction: Transaction = {
        accountId: "account1",
        importId: "import8",
        date: new Date("2024-01-21T10:00:00+08:00"),
        amount: new Decimal("-100.00"),
        payee: "Store",
      };

      await expect(
        notifier.notifyTransactionsImported(email, [transaction]),
      ).rejects.toThrow("Failed to send Discord message: 400 Bad Request");
    });

    test("throws error when fetch rejects", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(notifier.notifyError("Test error")).rejects.toThrow(
        "Network error",
      );
    });
  });
});
