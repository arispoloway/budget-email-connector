import { expect, test, describe } from "vitest";
import {
  createNotifierFromConfig,
  DiscordNotifierConfig,
  NotifierConfig,
} from "./config";
import { DiscordNotifier } from "./discord";

describe("createNotifierFromConfig", () => {
  test("creates Discord notifier from config", () => {
    const config: DiscordNotifierConfig = {
      type: "discord",
      webhookUrl: "https://discord.com/api/webhooks/test",
    };

    const notifier = createNotifierFromConfig(config);
    expect(notifier).toBeInstanceOf(DiscordNotifier);
  });

  test("throws error for unknown notifier type", () => {
    const config = {
      type: "unknown_notifier_type",
    } as unknown as NotifierConfig;

    expect(() => createNotifierFromConfig(config)).toThrow(
      "Unknown destination type: unknown_notifier_type",
    );
  });
});
