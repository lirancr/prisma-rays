import {QueryBuilderFactory} from "../types";

const factory: QueryBuilderFactory = (databaseUrl: string) => {
	const matches = /postgresql:\/\/.+(?::.+)?@.+:[0-9]+\/[^?]+(?:\?schema=(.+))?/g.exec(databaseUrl)
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
		dropAllTables: () => `DO $$ DECLARE
  								r RECORD;
						    BEGIN
    							FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
    							EXECUTE 'DROP TABLE ' || quote_ident(r.tablename) || ' CASCADE';
  							END LOOP;
							END $$;`
	}
}

module.exports = factory
