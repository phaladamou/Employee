import type BetterSqlite3 from "better-sqlite3";

export class MemoryManager {
  constructor(private db: BetterSqlite3.Database) {}

  deduplicate(): number {
    const sql = "DELETE FROM episodic_memory WHERE id NOT IN (SELECT MIN(id) FROM episodic_memory GROUP BY summary)";
    const result = this.db.prepare(sql).run();
    return result.changes;
  }

  consolidate(): number {
    const sql = "DELETE FROM episodic_memory WHERE importance < 0.5 AND created_at < datetime('now', '-7 days')";
    const result = this.db.prepare(sql).run();
    return result.changes;
  }

  invalidate(pattern: string): number {
    const sql = "DELETE FROM episodic_memory WHERE summary LIKE ?";
    const result = this.db.prepare(sql).run('%' + pattern + '%');
    return result.changes;
  }

  protectLessons(): void {
    const sql = "UPDATE episodic_memory SET importance = MAX(importance, 0.9) WHERE classification = 'error' OR classification = 'lesson'";
    this.db.prepare(sql).run();
  }
}
