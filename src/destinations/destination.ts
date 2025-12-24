import { init } from "@actual-app/api";
import { Transaction } from "../email/parsers/parser";

export type ImportTransactionResult = {};

export interface Destination {
  init(): Promise<void>;
  close(): Promise<void>;
  importTransactions(
    transactions: Transaction[],
  ): Promise<ImportTransactionResult>;
}
