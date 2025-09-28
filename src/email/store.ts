import Database from "better-sqlite3";

export class EmailStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);

    // bootstrap schema
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS seen_emails (
          id TEXT PRIMARY KEY
        )`,
      )
      .run();
  }

  async seenEmail(id: string): Promise<boolean> {
    const row = this.db
      .prepare("SELECT 1 FROM seen_emails WHERE id = ?")
      .get(id);
    return row !== undefined;
  }

  async markEmailSeen(id: string): Promise<void> {
    this.db
      .prepare("INSERT OR IGNORE INTO seen_emails (id) VALUES (?)")
      .run(id);
  }
}
