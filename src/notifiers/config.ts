import { DiscordNotifier } from "./discord";
import { Notifier } from "./notifier";

export type NotifierConfig = DiscordNotifierConfig;

export interface DiscordNotifierConfig {
  type: "discord";
  webhookUrl: string;
}

export function createNotifierFromConfig(config: NotifierConfig): Notifier {
  switch (config.type) {
    case "discord":
      return new DiscordNotifier(config.webhookUrl);
    default:
      throw new Error(`Unknown destination type: ${(config as any).type}`);
  }
}
