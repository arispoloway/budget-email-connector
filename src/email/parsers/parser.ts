import Decimal from "decimal.js";
import { Email } from "../clients/types";

export interface Transaction {
  accountId: string;
  importId: string;
  date: Date;
  amount: Decimal;
  payee: string;
  notes?: string;
}

export enum ParseResult {
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
  SKIPPED = "SKIPPED",
}

export type TransactionParseResult = {
  transactions: Transaction[];
  result: ParseResult;
  error?: string;
};

export function parseError(err: string): TransactionParseResult {
  return {
    transactions: [],
    result: ParseResult.ERROR,
    error: err,
  };
}

export function parseSuccess(
  transactions: Transaction[],
): TransactionParseResult {
  return {
    transactions: transactions,
    result: ParseResult.SUCCESS,
  };
}

export function parseSkipped(reason: string): TransactionParseResult {
  return {
    transactions: [],
    result: ParseResult.SKIPPED,
    error: reason,
  };
}

export interface TransactionParser {
  parseTransactionEmail(email: Email): TransactionParseResult;
}
