import {QueryBuilderFactory, IEngine} from "../types";

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
	return {
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
		dropAllTables: () => `SET FOREIGN_KEY_CHECKS = 0;
								SET GROUP_CONCAT_MAX_LEN=32768;
								SET @tables = NULL;
								SELECT GROUP_CONCAT('\`', table_name, '\`') INTO @tables
								  FROM information_schema.tables
								  WHERE table_schema = (SELECT DATABASE());
								SELECT IFNULL(@tables,'dummy') INTO @tables;
								SET @tables = CONCAT('DROP TABLE IF EXISTS ', @tables);
								PREPARE stmt FROM @tables;
								EXECUTE stmt;
								DEALLOCATE PREPARE stmt;
								SET FOREIGN_KEY_CHECKS = 1;`
	}
}

const engine: IEngine = {
	isEngineForUrl,
	getDatabaseName,
	makeUrlForDatabase,
	queryBuilderFactory,
}

module.exports = engine
