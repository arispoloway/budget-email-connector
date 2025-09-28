import {
  createDestinationFromConfig,
  DestinationConfig,
} from "./destinations/config";
import { Destination } from "./destinations/destination";
import { createParserFromConfig, ParserConfig } from "./email/parsers/config";
import { TransactionParser } from "./email/parsers/parser";
import { createNotifierFromConfig, NotifierConfig } from "./notifiers/config";
import { Notifier } from "./notifiers/notifier";
import { promises as fs } from "fs";

export type ParsedConfig = {
  destination: Destination;
  parser: TransactionParser;
  notifier: Notifier;
};

// TODO: configurable email client
export type Config = {
  destination: DestinationConfig;
  parser: ParserConfig;
  notifier: NotifierConfig;
};

export function parseConfig(config: Config): ParsedConfig {
  return {
    destination: createDestinationFromConfig(config.destination),
    parser: createParserFromConfig(config.parser),
    notifier: createNotifierFromConfig(config.notifier),
  };
}

export async function parseConfigFromFile(path: string): Promise<ParsedConfig> {
  const config = JSON.parse(await fs.readFile(path, "utf8")) as Config;
  return parseConfig(config);
}
