import { Client } from "pg";
import createDebugger from "debug";
import { Agenda } from ".";

const debug = createDebugger("agenda:postgres");

export interface PostgresConfig {
  connectionString: string;
  table?: string;
}

export const postgres = function (
  this: Agenda,
  config: PostgresConfig,
  cb?: (error: Error | null) => void
): Agenda {
  const table = config.table || "agenda_jobs";
  this._pgTable = table;
  this._pg = new Client({ connectionString: config.connectionString });

  this._pg
    .connect()
    .then(async () => {
      debug("connected to postgres, ensuring table %s", table);
      await this._pg!.query(
        `CREATE TABLE IF NOT EXISTS ${table} (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT,
          priority INTEGER,
          data JSONB,
          next_run_at TIMESTAMP,
          locked_at TIMESTAMP,
          disabled BOOLEAN DEFAULT FALSE,
          last_modified_by TEXT
        );`
      );
      await this._pg!.query(
        `CREATE INDEX IF NOT EXISTS agenda_find_lock_idx ON ${table}(name, next_run_at, locked_at, disabled);`
      );
      this.emit("ready");
      if (cb) cb(null);
    })
    .catch((err) => {
      debug("error connecting to postgres", err);
      if (cb) cb(err);
      else throw err;
    });

  return this;
};

