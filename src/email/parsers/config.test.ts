import { expect, test, describe } from "vitest";
import {
  createParserFromConfig,
  DBSParserConfig,
  ParserConfig,
  RoutingParserConfig,
} from "./config";
import { DBSTransactionParser } from "./dbs/dbs";
import { RoutingTransactionParser } from "./routing_transaction_parser";

describe("createParserFromConfig", () => {
  test("creates DBS parser from config", () => {
    const config: DBSParserConfig = {
      type: "dbs",
      accountId: "test-account-id",
    };

    const parser = createParserFromConfig(config);
    expect(parser).toBeInstanceOf(DBSTransactionParser);
  });

  test("creates DBS parser with card number mapping", () => {
    const config: DBSParserConfig = {
      type: "dbs",
      accountId: "test-account-id",
      cardNumberMapping: {
        "1234": "card-account-id",
      },
    };

    const parser = createParserFromConfig(config);
    expect(parser).toBeInstanceOf(DBSTransactionParser);
  });

  test("creates routing parser from config", () => {
    const config: RoutingParserConfig = {
      type: "email_router",
      routes: [
        {
          emails: ["test1@example.com", "test2@example.com"],
          parser: {
            type: "dbs",
            accountId: "account-1",
          },
        },
        {
          emails: ["test3@example.com"],
          parser: {
            type: "dbs",
            accountId: "account-2",
          },
        },
      ],
    };

    const parser = createParserFromConfig(config);
    expect(parser).toBeInstanceOf(RoutingTransactionParser);
  });

  test("throws error for unknown parser type", () => {
    const config = {
      type: "unknown_parser_type",
    } as unknown as ParserConfig;

    expect(() => createParserFromConfig(config)).toThrow(
      "Unknown parser type: unknown_parser_type",
    );
  });
});
