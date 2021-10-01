import {QueryBuilderFactory, IEngine} from "../types";

const isEngineForUrl = (databaseUrl: string): boolean => {
	return /^postgres(?:ql)?:\/\//i.test(databaseUrl)
}

const getDatabaseName = (databaseUrl: string): string => {
	const dbName =  databaseUrl.match(/postgres(?:ql)?:\/\/.+(?::.+)?@.+:[0-9]+\/([^?]+)\??/i)?.pop()
	if (!dbName) {
		throw new Error(`EngineError:postgresql - databaseUrl did not match expected pattern: ${databaseUrl}`)
	}
	return dbName
}

const makeUrlForDatabase = (databaseUrl: string, dbName: string): string => {
	const url = databaseUrl.replace(/(postgres(?:ql)?:\/\/.+(?::.+)?@.+:[0-9]+\/)([^?]+)(\?.+)?/i, `$1${dbName}$3`)
	if (!url.includes(dbName)) {
		throw new Error(`EngineError:postgresql - databaseUrl did not match expected pattern: ${databaseUrl}`)
	}
	return url
}

const queryBuilderFactory: QueryBuilderFactory =  (databaseUrl: string) => {

	const matches = /postgres(?:ql)?:\/\/.+(?::.+)?@.+:[0-9]+\/[^?]+(?:\?schema=(.+))?/i.exec(databaseUrl)
	if (!matches) {
		throw new Error(`EngineError:postgresql - databaseUrl did not match expected pattern: ${databaseUrl}`)
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
		dropAllTables: () => `DO $$ DECLARE
  								r RECORD;
						    BEGIN
    							FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
    							EXECUTE 'DROP TABLE ' || quote_ident(r.tablename) || ' CASCADE';
  							END LOOP;
							END $$;`
	}
}

const engine: IEngine = {
	isEngineForUrl,
	getDatabaseName,
	makeUrlForDatabase,
	queryBuilderFactory,
}

module.exports = engine
