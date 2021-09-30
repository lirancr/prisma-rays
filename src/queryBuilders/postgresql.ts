import {QueryBuilderFactory} from "../types";

const factory: QueryBuilderFactory = (databaseUrl: string) => {
	const matches = /postgresql:\/\/.+:.+@.+:[0-9]+\/[^?]+(?:\?schema=(.+))?/g.exec(databaseUrl)
	if (!matches) {
		throw new Error(`Invalid database url for postgres: ${databaseUrl}`)
	}
	const schema = matches![1] || 'public'

	return {
		deleteAllFrom: (table) => `DELETE FROM ${schema}."${table}";`,
			deleteFromBy: (table, column, value) => `DELETE FROM ${schema}."${table}" where ${column}='${value}';`,
		selectAllFrom: (table) => `SELECT * FROM ${schema}."${table}";`,
		insertInto: (table, values) => {
			const entries = Object.entries(values)
			return `INSERT INTO ${schema}."${table}" (${entries.map(e => e[0]).join(',')}) VALUES ('${entries.map(e => e[1]).join("','")}')`
		},
		dropDatabaseIfExists: (db) => `DROP DATABASE IF EXISTS ${db};`,
		createDatabase: (db) => `CREATE DATABASE ${db};`,
		transactionBegin: () => `BEGIN;`,
		transactionCommit: () => `COMMIT;`,
		transactionRollback: () => `ROLLBACK;`,
	}
}

module.exports = factory
