import { expect, test, describe } from "vitest";
import { Email } from "../clients/types";
import { parseError, parseSuccess, TransactionParser } from "./parser";
import { RoutingTransactionParser } from "./routing_transaction_parser";
import Decimal from "decimal.js";

describe("RoutingTransactionParser", () => {
  test("routes email to correct parser when email address matches", () => {
    const mockParser: TransactionParser = {
      parseTransactionEmail: (email: Email) => {
        return parseSuccess([
          {
            accountId: "account-1",
            importId: email.id,
            date: new Date("2024-01-01"),
            amount: new Decimal(100),
            payee: "Test Payee",
          },
        ]);
      },
    };

    const parser = new RoutingTransactionParser({
      "test@example.com": mockParser,
    });

    const email: Email = {
      id: "email-1",
      from: "test@example.com",
      subject: "Test",
      body: "Test body",
    };

    const result = parser.parseTransactionEmail(email);
    expect(result.result).toBe("SUCCESS");
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].payee).toBe("Test Payee");
  });

  test("returns error when email address is not in mapping", () => {
    const parser = new RoutingTransactionParser({
      "known@example.com": {
        parseTransactionEmail: () => parseSuccess([]),
      },
    });

    const email: Email = {
      id: "email-1",
      from: "unknown@example.com",
      subject: "Test",
      body: "Test body",
    };

    const result = parser.parseTransactionEmail(email);
    expect(result.result).toBe("ERROR");
    expect(result.error).toContain("unknown email unknown@example.com");
  });
});
