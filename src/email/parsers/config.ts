import { PaylahTransactionParser } from "./dbs";
import { TransactionParser } from "./parser";
import { RoutingTransactionParser } from "./routing_transaction_parser";

// config.ts
export type ParserConfig =
  | PaylahParserConfig
  | RoutingParserConfig;

export interface PaylahParserConfig {
  type: "paylah";
  accountId: string;
}

export interface RoutingParserConfig {
  type: "email_router";
  routes: {
    emails: string[];
    parser: ParserConfig;
  }[];
}

export function createParserFromConfig(config: ParserConfig): TransactionParser {
  switch (config.type) {
    case "paylah":
      return new PaylahTransactionParser((config as PaylahParserConfig).accountId);

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

