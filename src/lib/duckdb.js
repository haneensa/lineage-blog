// src/lib/duckdb.js
import * as duckdb from '@duckdb/duckdb-wasm';
import { AsyncDuckDB } from '@duckdb/duckdb-wasm';

let conn = null;

export async function runQuery(q) {
  if (!conn) return [];

  let resp = await conn.query(q);
  return resp.toArray().map((row) => row.toJSON());
}

/**
 * Get or initialize the DuckDB connection
 */
export async function getDuckDB() {
  if (!conn) {
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
    const workerURL = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker}");`], {
        type: 'text/javascript'
      })
    );

    const worker = new Worker(workerURL);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    URL.revokeObjectURL(workerURL);
    conn = await db.connect();
  }
  return conn;
}
