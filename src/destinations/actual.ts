import { InitConfig } from "@actual-app/api/@types/loot-core/src/server/main";
import type { Transaction } from "../email/parsers/parser";
import * as Actual from "@actual-app/api";
import { ImportTransactionEntity } from "@actual-app/api/@types/loot-core/src/types/models";
import { ReconcileTransactionsResult } from "@actual-app/api/@types/loot-core/src/server/accounts/sync";
import { ImportTransactionResult } from "./destination";

function mapTransaction(transaction: Transaction):  ImportTransactionEntity {
    return {
        account: transaction.accountId,
        date: transaction.date.toISOString(),
        amount: transaction.amount,
        payee_name: transaction.payee,
        notes: transaction.notes,
        imported_id: transaction.importId,
        cleared: true,
    }
}

export class ActualClient {
    constructor(){//config: InitConfig) {
        //Actual.init(config)
    }

    async importTransactions(transactions: Transaction[]): Promise<ImportTransactionResult> {
        const transactionsByAccount: { [key: string]: Transaction[] } = {};
        transactions.forEach((t) => {
            if (!transactionsByAccount[t.accountId]) {
                transactionsByAccount[t.accountId] = []
            }
            transactionsByAccount[t.accountId].push(t)
        })
        console.log(transactions.map(mapTransaction))

        return {};

        return Promise.all(
            Object.entries(transactionsByAccount).map(([accountId, ts], _) => Actual.importTransactions(accountId, ts.map(mapTransaction)))
        );
    }
}
