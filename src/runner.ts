import { ParsedConfig } from "./config";
import { Destination } from "./destinations/destination";
import { Email, EmailClient } from "./email/clients/types";
import { ParseResult, TransactionParser } from "./email/parsers/parser";
import { EmailStore } from "./email/store";
import { Notifier } from "./notifiers/notifier";

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatEmailRef(email: Email): string {
  return email.link
    ? `email: ${email.link}`
    : `email from '${email.from}' with subject '${email.subject}'`;
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
    this.store = config.emailStore;
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
          await this.notifier.notifyTransactionsImported(
            email,
            ts.transactions,
          );
          await this.store.markEmailSeen(email.id);
          break;
        case ParseResult.SKIPPED:
          await this.notifier.notifyEmailSkipped(
            email,
            ts.error || "Unknown reason",
          );
          await this.store.markEmailSeen(email.id);
          break;
        case ParseResult.ERROR:
          await this.notifier.notifyError(
            `Error while parsing transaction ${formatEmailRef(email)}\n${ts.error}`,
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
        await this.notifier.notifyError(
          `Uncaught error running transaction sync: ${e.toString()}`,
        );
      }

      await timeout(interval);
    }
  }
}
