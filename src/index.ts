import "dotenv/config";
import { authorize } from "./email/clients/gmail/auth";
import { listUnprocessedMessages } from "./email/clients/gmail/client";
import { ActualClient } from "./destinations/actual";
import { EmailStore } from "./email/store";
import { DiscordNotifier } from "./notifiers/discord";
import { RoutingTransactionParser } from "./email/parsers/routing_transaction_parser";
import { PaylahTransactionParser } from "./email/parsers/dbs";
import { createParserFromConfig, ParserConfig } from "./email/parsers/config";
import { ParseResult } from "./email/parsers/parser";


// TODO: better config management
const LABEL = 'budget';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const PARSER_CONFIG: ParserConfig = {
  type: "email_router",
  routes: [
    { emails: ["paylah.alert@dbs.com"], 
      parser: {
        type: "paylah",
        accountId: process.env.PAYLAH_ACCOUNT_ID!
      }}
  ]
};

async function main() {
  if (!process.env.DISCORD_WEBHOOK) {
    throw new Error("No discord webhook provided!")
  }
  const notifier = new DiscordNotifier(DISCORD_WEBHOOK_URL!);

  try {
    const auth = await authorize();
    const store = new EmailStore("./emails.sqlite");
    const emails = await listUnprocessedMessages(auth, store, LABEL);

    const parser = createParserFromConfig(PARSER_CONFIG);
    const destination = new ActualClient()

    for (const email of emails) {
      // TODO: catch errors here and do stuff with them
      const ts = parser.parseTransactionEmail(email)
      if (ts.result == ParseResult.SUCCESS) {
        await destination.importTransactions(ts.transactions);
        // TODO: store in db
      } else {
        // TODO: something smarter
        console.log("Errors while parsing, ...");
      }
    }
  } catch (e: any) {
    notifier.err("Could not process emails: " + e.toString())
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
