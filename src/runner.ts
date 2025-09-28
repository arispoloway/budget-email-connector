import { ParsedConfig } from "./config";
import { Destination } from "./destinations/destination";
import { EmailClient } from "./email/clients/types";
import { ParseResult, TransactionParser } from "./email/parsers/parser";
import { EmailStore } from "./email/store";
import { Notifier } from "./notifiers/notifier";

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Runner {
  private parser: TransactionParser;
  private destination: Destination;
  private notifier: Notifier;
  private email: EmailClient;

  private store: EmailStore;

  constructor(config: ParsedConfig) {
    this.parser = config.parser;
    this.destination = config.destination;
    this.notifier = config.notifier;
    this.email = config.email;
    this.store = new EmailStore("./emails.sqlite"); // TODO: configurable
  }

  async init() {
    await Promise.all([this.destination.init(), this.email.init()]);
  }

  async run() {
    const emails = await this.email.listUnprocessedMessages(this.store);
    for (const email of emails) {
      const ts = this.parser.parseTransactionEmail(email);
      switch (ts.result) {
        case ParseResult.SUCCESS:
          await this.destination.importTransactions(ts.transactions);
          const transactionStr = ts.transactions
            .map((t) => `- ${t.payee}: (${t.amount.toFixed(2)})`)
            .join("\n");
          await this.notifier.info(
            `Successfully imported transactions from [email](${email.link}):\n${transactionStr}`,
          );
          await this.store.markEmailSeen(email.id);
          break;
        case ParseResult.SKIPPED:
          await this.notifier.info(
            `Skipped [email](${email.link}) from '${email.from}' with subject '${email.subject}'\n'${ts.error}'`,
          );
          await this.store.markEmailSeen(email.id);
          break;
        case ParseResult.ERROR:
          await this.notifier.err(
            `Error while parsing transaction [email](${email.link}):\n${ts.error}`,
          );
          break;
      }
    }
  }

  async runRepeatedly(interval: number) {
    while (true) {
      try {
        await this.run();
      } catch (e: any) {
        await this.notifier.err(
          `Uncaught error running transaction sync: ${e.toString()}`,
        );
      }

      await timeout(interval);
    }
  }
}
