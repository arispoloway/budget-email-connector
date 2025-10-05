import { GmailClient } from "./gmail/client";
import { EmailClient } from "./types";

export type EmailClientConfig = GmailConfig;

export interface GmailConfig {
  type: "gmail";
  credentialsJsonPath: string;
  tokenJsonPath: string;
  label: string;
  headless?: boolean;
  authCode?: string;
}

export function createEmailClientFromConfig(
  config: EmailClientConfig,
): EmailClient {
  switch (config.type) {
    case "gmail":
      return new GmailClient(config);
    default:
      throw new Error(`Unknown destination type: ${(config as any).type}`);
  }
}
