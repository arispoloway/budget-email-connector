import { InitConfig } from "@actual-app/api/@types/loot-core/src/server/main";
import type { Transaction } from "../email/parsers/parser";
import * as Actual from "@actual-app/api";
import { ImportTransactionEntity } from "@actual-app/api/@types/loot-core/src/types/models";
import { ReconcileTransactionsResult } from "@actual-app/api/@types/loot-core/src/server/accounts/sync";
import { ImportTransactionResult } from "./destination";
import { promises as fs } from "fs";
import Decimal from "decimal.js";

function mapTransaction(
  transaction: Transaction,
  noteSuffix: string,
): ImportTransactionEntity {
  return {
    account: transaction.accountId,
    date: transaction.date.toISOString().substring(0, 10),
    amount: transaction.amount.mul(100).toDecimalPlaces(0).toNumber(), // Expected in cents
    payee_name: transaction.payee,
    notes: transaction.notes + noteSuffix,
    imported_id: transaction.importId,
    cleared: true,
  };
}

export class ActualClient {
  private config: InitConfig;
  private syncId: string;
  private noteSuffix: string | undefined;

  constructor(
    config: InitConfig,
    syncId: string,
    noteSuffix: string | undefined,
  ) {
    this.config = config;
    this.syncId = syncId;
    this.noteSuffix = noteSuffix;
  }

  async init(): Promise<void> {
    // Ok this is a bit jank because it's not like you could really initialize multiple of these clients, but I wanted it to be
    // encapsulated nicely as a class so I could potentially add support for other apps...
    if (this.config.dataDir) {
      await fs.mkdir(this.config.dataDir, { recursive: true });
    }
    await Actual.init(this.config);
    await Actual.downloadBudget(this.syncId);
  }

  async close(): Promise<void> {
    await Actual.shutdown();
  }

  async importTransactions(
    transactions: Transaction[],
  ): Promise<ImportTransactionResult> {
    const transactionsByAccount: { [key: string]: Transaction[] } = {};
    transactions.forEach((t) => {
      if (!transactionsByAccount[t.accountId]) {
        transactionsByAccount[t.accountId] = [];
      }
      transactionsByAccount[t.accountId].push(t);
    });

    return Promise.all(
      Object.entries(transactionsByAccount).map(([accountId, ts], _) =>
        Actual.importTransactions(
          accountId,
          ts.map((t) => mapTransaction(t, this.noteSuffix || "")),
        ),
      ),
    );
  }
}
