import type { IDatabaseEngine } from "../types";

const engine: IDatabaseEngine = {
	deleteMigrations: () => 'DELETE FROM _prisma_migrations;',
	deleteMigrationsByName: (name) => `DELETE FROM _prisma_migrations where migration_name='${name}';`,
	selectMigrations: () => `SELECT * FROM _prisma_migrations;`,
	dropDatabaseIfExists: (db) => `DROP DATABASE IF EXISTS ${db};`,
	createDatabase: (db) => `CREATE DATABASE ${db};`,
	transactionBegin: () => `BEGIN;`,
	transactionCommit: () => `COMMIT;`,
	transactionRollback: () => `ROLLBACK;`,
}

module.exports = engine
