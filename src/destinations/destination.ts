import { Transaction } from "../email/parsers/parser";

export type ImportTransactionResult = {

};

export interface Destination {
    importTransactions(transactions: Transaction[]): Promise<ImportTransactionResult>;
}