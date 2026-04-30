declare module "@actual-app/api" {
  export interface InitConfig {
    dataDir?: string;
    [key: string]: unknown;
  }

  export interface ImportTransactionEntity {
    account: string;
    date: string;
    amount: number;
    payee_name?: string;
    notes?: string;
    imported_id?: string;
    cleared?: boolean;
  }

  export function init(config?: InitConfig): Promise<any>;
  export function downloadBudget(
    syncId: string,
    opts?: { password?: string },
  ): Promise<any>;
  export function shutdown(): Promise<any>;
  export function importTransactions(
    accountId: string,
    transactions: ImportTransactionEntity[],
    opts?: Record<string, unknown>,
  ): Promise<any>;
}
