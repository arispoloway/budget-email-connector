import { DBSTransactionParser } from "./dbs/dbs";
import { TransactionParser } from "./parser";
import { RoutingTransactionParser } from "./routing_transaction_parser";

// config.ts
export type ParserConfig = DBSParserConfig | RoutingParserConfig;

export interface DBSParserConfig {
  type: "dbs";
  accountId: string;
  /**
   * Optional mapping from card number last 4 digits to account IDs.
   * For card transactions, if the last 4 digits (as they appear in the email's "From" field,
   * e.g., "DBS/POSB card ending 1234") match a key in this mapping, the transaction will
   * be assigned to the mapped account ID instead of the default accountId.
   * Example: { "1234": "card-account-id", "5678": "another-card-account-id" }
   */
  cardNumberMapping?: Record<string, string>;
}

export interface RoutingParserConfig {
  type: "email_router";
  routes: {
    emails: string[];
    parser: ParserConfig;
  }[];
}

export function createParserFromConfig(
  config: ParserConfig,
): TransactionParser {
  switch (config.type) {
    case "dbs": {
      const dbsConfig = config as DBSParserConfig;
      return new DBSTransactionParser(
        dbsConfig.accountId,
        dbsConfig.cardNumberMapping,
      );
    }

    case "email_router": {
      const routingConfig = config as RoutingParserConfig;
      const routes: Record<string, TransactionParser> = {};
      for (const route of routingConfig.routes) {
        const parser = createParserFromConfig(route.parser);
        for (const email of route.emails) {
          routes[email] = parser;
        }
      }
      return new RoutingTransactionParser(routes);
    }

    default:
      throw new Error(`Unknown parser type: ${(config as any).type}`);
  }
}
