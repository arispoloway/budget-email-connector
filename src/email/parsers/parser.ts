import { Email } from "../clients/types";

export interface Transaction {
    accountId: string
    importId: string;
    date: Date;
    amount: number;
    payee: string;
    description?: string;
    notes?: string;
  }

export enum ParseResult {
    SUCCESS = "SUCCESS",
    ERROR = "ERROR",
}

export type TransactionParseResult = {
    transactions: Transaction[];
    result: ParseResult;
    error?: string;
}

export function parseError(err: string): TransactionParseResult {
    return {
        transactions: [],
        result: ParseResult.ERROR,
        error: err
    }
}

export function parseSuccess(transactions: Transaction[]): TransactionParseResult {
    return {
        transactions: transactions,
        result: ParseResult.SUCCESS,
    }
}

export interface TransactionParser {
    parseTransactionEmail(email: Email): TransactionParseResult
}
