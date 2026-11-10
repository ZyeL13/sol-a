import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

/**
 * Minimal migration runner: applies *.sql files in db/migrations/ in
 * filename order, once each (tracked in schema_migrations).
 * Usage: npm run db:migrate   (requires DATABASE_URL)
 */
export async function migrate(connectionString: string, dir = join(__dirname, '..', '..', 'db', 'migrations')): Promise<string[]> {
  const pool = new Pool({ connectionString });
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    const applied = new Set<string>(
      (await pool.query('SELECT name FROM schema_migrations')).rows.map((r: { name: string }) => r.name),
    );
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    const newly: string[] = [];
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(join(dir, file), 'utf8');
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await pool.query('COMMIT');
      } catch (err) {
        await pool.query('ROLLBACK');
        throw err;
      }
      newly.push(file);
    }
    return newly;
  } finally {
    await pool.end();
  }
}
