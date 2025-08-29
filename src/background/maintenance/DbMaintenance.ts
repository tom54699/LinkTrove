import { DatabaseManager } from '../db/DatabaseManager';

export class DbMaintenance {
  constructor(private db: DatabaseManager) {}
  async vacuum(): Promise<void> {
    // Only effective on sqlite backend
    (this.db as any).run?.('VACUUM;');
  }
  async analyze(): Promise<void> {
    (this.db as any).run?.('ANALYZE;');
  }
  async reindex(): Promise<void> {
    (this.db as any).run?.('REINDEX;');
  }
}

