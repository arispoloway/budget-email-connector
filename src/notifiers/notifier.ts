import { Email } from "../email/clients/types";
import { Transaction } from "../email/parsers/parser";

export interface Notifier {
  notifyTransactionsImported(
    email: Email,
    transactions: Transaction[],
  ): Promise<void>;
  notifyEmailSkipped(email: Email, reason: string): Promise<void>;
  notifyError(message: string): Promise<void>;
}
