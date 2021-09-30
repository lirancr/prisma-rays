import type { IQueryBuilder } from "../types";

const engine: IQueryBuilder = {
	deleteAllFrom: (table) => `DELETE FROM public."${table}";`,
	deleteFromBy: (table, column, value) => `DELETE FROM public."${table}" where ${column}='${value}';`,
	selectAllFrom: (table) => `SELECT * FROM public."${table}";`,
	insertInto: (table, values) => {
		const entries = Object.entries(values)
		return `INSERT INTO public."${table}" (${entries.map(e => e[0]).join(',')}) VALUES ('${entries.map(e => e[1]).join("','")}')`
	},
	dropDatabaseIfExists: (db) => `DROP DATABASE IF EXISTS ${db};`,
	createDatabase: (db) => `CREATE DATABASE ${db};`,
	transactionBegin: () => `BEGIN;`,
	transactionCommit: () => `COMMIT;`,
	transactionRollback: () => `ROLLBACK;`,
}

module.exports = engine
