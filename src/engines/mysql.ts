import {QueryBuilderFactory, IEngine, IQueryBuilder} from "../types";

const isEngineForUrl = (databaseUrl: string): boolean => {
	return /^mysql:\/\//i.test(databaseUrl)
}

const getDatabaseName = (databaseUrl: string): string => {
	const dbName =  databaseUrl.match(/mysql:\/\/.+(?::.+)?@.+:[0-9]+\/(.+)/i)?.pop()
	if (!dbName) {
		throw new Error(`EngineError:mysql - databaseUrl did not match expected pattern: ${databaseUrl}`)
	}
	return dbName
}

const makeUrlForDatabase = (databaseUrl: string, dbName: string): string => {
	const url = databaseUrl.replace(/(mysql:\/\/.+(?::.+)?@.+:[0-9]+\/)(.+)/i, `$1${dbName}`)
	if (!url.includes(dbName)) {
		throw new Error(`EngineError:mysql - databaseUrl did not match expected pattern: ${databaseUrl}`)
	}
	return url
}

const queryBuilderFactory: QueryBuilderFactory =  () => {
	const queryBuilder: IQueryBuilder = {
		deleteAllFrom: (table) => `DELETE FROM ${table};`,
		deleteFromBy: (table, column, value) => `DELETE FROM ${table} where ${column}='${value}';`,
		selectAllFrom: (table) => `SELECT * FROM "${table}";`,
		insertInto: (table, values) => {
			const entries = Object.entries(values)
			return `INSERT INTO ${table} (${entries.map(e => e[0]).join(',')}) VALUES ('${entries.map(e => e[1]).join("','")}')`
		},
		dropDatabaseIfExists: (db) => `DROP DATABASE IF EXISTS ${db};`,
		createDatabase: (db) => `CREATE DATABASE ${db};`,
		transactionBegin: () => `BEGIN;`,
		transactionCommit: () => `COMMIT;`,
		transactionRollback: () => `ROLLBACK;`,
		setForeignKeyCheckOn: () => `SET FOREIGN_KEY_CHECKS = 0;`,
		setForeignKeyCheckOff: () => `SET FOREIGN_KEY_CHECKS = 1;`,
		dropTableIfExistsCascade: (table) => `DROP TABLE IF EXISTS ${table};`,
		selectAllTables: (db) => `SELECT table_name FROM information_schema.tables WHERE table_schema = '${db}';`,
	}

	return queryBuilder
}

const engine: IEngine = {
	isEngineForUrl,
	getDatabaseName,
	makeUrlForDatabase,
	queryBuilderFactory,
}

module.exports = engine
