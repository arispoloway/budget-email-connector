import type { Transaction } from "../email/parsers/parser";
import { Destination, ImportTransactionResult } from "./destination";

function formatTransaction(transaction: Transaction): string {
  const sign = transaction.amount.isNegative() ? "" : "+";
  const amount = `${sign}${transaction.amount.toFixed(2)}`;
  const date = transaction.date.toISOString().substring(0, 10);
  const notes = transaction.notes ? ` (${transaction.notes})` : "";

  return ` ${transaction.importId}  ${date}  ${amount.padStart(12)}  ${transaction.payee}${notes}`;
}

export class LoggingDestination implements Destination {
  async init(): Promise<void> {
    // No initialization needed for logging
  }

  async close(): Promise<void> {
    // No cleanup needed for logging
  }

  async importTransactions(
    transactions: Transaction[],
  ): Promise<ImportTransactionResult> {
    if (transactions.length === 0) {
      console.log("No transactions to import");
      return {};
    }

    for (const t of transactions) {
      console.log(`  ${formatTransaction(t)}`);
    }
    console.log();

    return {};
  }
}
