import type {QueryBuilderFactory, IEngine, IDatabaseConnection, ILogger} from "../types";
import * as connectionPool from "../databaseConnectionPool";
import mssql from 'mssql'

// sqlserver://host:1433;database=mydb;user=sa;password=r@ndomP@$$w0rd;trustServerCertificate=true

const isEngineForUrl = (databaseUrl: string): boolean => {
	return /^sqlserver:\/\//i.test(databaseUrl)
}

const getDatabaseName = (databaseUrl: string): string => {
	const dbName =  databaseUrl.match(/sqlserver:\/\/.+(?::.+)?@.+:[0-9]+\/(.+)/i)?.pop()
	if (!dbName) {
		throw new Error(`EngineError:sqlserver - databaseUrl did not match expected pattern: ${databaseUrl}`)
	}
	return dbName
}

const makeUrlForDatabase = (databaseUrl: string, dbName: string): string => {
	const url = databaseUrl.replace(/(sqlserver:\/\/.+(?::.+)?@.+:[0-9]+\/)(.+)/i, `$1${dbName}`)
	if (!url.includes(dbName)) {
		throw new Error(`EngineError:sqlserver - databaseUrl did not match expected pattern: ${databaseUrl}`)
	}
	return url
}

const queryBuilderFactory: QueryBuilderFactory =  (databaseUrl) => {
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
		setForeignKeyCheckOn: () => `EXEC sp_MSforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT all";`,
		setForeignKeyCheckOff: () => `EXEC sp_MSforeachtable @command1="print '?'", @command2="ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all";`,
		dropTableIfExistsCascade: (table) => `DROP TABLE IF EXISTS ${table} CASCADE;`,
		selectAllTables: (db) => `SELECT table_name as tablename FROM ${db}.information_schema.tables WHERE table_type = 'BASE_TABLE';`,
	}
}

const createConnection = async (databaseUrl: string, logger: ILogger): Promise<IDatabaseConnection> => {
	const dbname = getDatabaseName(databaseUrl)
	const client: any = {} //await mssql.connect({
	//
	// })

	const connection: IDatabaseConnection = {
		query: async (q) => {
			logger.query(dbname, q)
			const res = await client.query(q)
			return res.recordset
		},
		execute: async (q) => {
			logger.query(dbname, q)
			const res = await client.query(q)
			return res.rowsAffected
		},
		disconnect: async () => {
			connectionPool.removeConnection(connection)
			await client.close()
		}
	}

	connectionPool.addConnection(connection)

	return connection
}

const engine: IEngine = {
	isEngineForUrl,
	getDatabaseName,
	makeUrlForDatabase,
	queryBuilderFactory,
	createConnection,
}

module.exports = engine
