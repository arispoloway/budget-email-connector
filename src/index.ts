import "dotenv/config";
import { authorize } from "./email/clients/gmail/auth";
import { listUnprocessedMessages } from "./email/clients/gmail/client";
import { ActualClient } from "./destinations/actual";
import { EmailStore } from "./email/store";
import { DiscordNotifier } from "./notifiers/discord";
import { RoutingTransactionParser } from "./email/parsers/routing_transaction_parser";
import { DBSTransactionParser } from "./email/parsers/dbs";
import { createParserFromConfig, ParserConfig } from "./email/parsers/config";
import { ParseResult } from "./email/parsers/parser";
import { InitConfig } from "@actual-app/api/@types/loot-core/src/server/main";
import { Destination } from "./destinations/destination";
import { parseConfig, parseConfigFromFile } from "./config";

async function main() {
  // TODO: specify config location, also better config validation and errors
  const { notifier, parser, destination } =
    await parseConfigFromFile("./config.json");

  try {
    const auth = await authorize();
    const store = new EmailStore("./emails.sqlite"); // TODO: configurable
    await destination.init();

    const emails = await listUnprocessedMessages(auth, store, "budget"); // TODO: configurable
    for (const email of emails) {
      const ts = parser.parseTransactionEmail(email);
      switch (ts.result) {
        case ParseResult.SUCCESS:
          await destination.importTransactions(ts.transactions);
          const transactionStr = ts.transactions
            .map((t) => `- ${t.payee}: (${t.amount.toFixed(2)})`)
            .join("\n");
          await notifier.info(
            `Successfully imported transactions:\n${transactionStr}\n[Source](${email.link})`,
          );
          await store.markEmailSeen(email.id);
          break;
        case ParseResult.SKIPPED:
          await notifier.info(
            `Skipped email from '${email.from}' with subject '${email.subject}'\n'${ts.error}'\n[Source](${email.link})`,
          );
          await store.markEmailSeen(email.id);
          break;
        case ParseResult.ERROR:
          await notifier.err(
            `Error while parsing transaction email: [${email.id}](${email.link}):\n${ts.error}`,
          );
          break;
      }
    }
  } catch (e: any) {
    notifier.err("Error processing transaction emails: " + e.toString());
  } finally {
    // TODO: some nice generic way to handle shutdown. Actual is just a bit of a special snowflake here
    if (destination) await destination.shutdown();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
