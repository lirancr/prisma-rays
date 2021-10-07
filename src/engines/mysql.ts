import {QueryBuilderFactory, IEngine, IQueryBuilder, IDatabaseConnection, ILogger} from "../types";
import * as connectionPool from "../databaseConnectionPool"
import mySQL from 'mysql2/promise'
import {ENGINE_PARAM_PLACEHOLDER} from "../constants";

const MYSQL2_PARAM_PLACEHOLDER = '?'

let transactionsSupported = true

const isTransactionsSupported = () => transactionsSupported

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
		selectAllFrom: (table) => `SELECT * FROM ${table};`,
		insertInto: (table, values) => {
			const entries = Object.entries(values)
			return `INSERT INTO ${table} (${entries.map(e => e[0]).join(',')}) VALUES ('${entries.map(e => e[1]).join("','")}');`
		},
		updateAll: (table, values) => {
			const entries = Object.entries(values)
			return `UPDATE ${table} SET ${entries.map(([k, v]) => k+"='"+v+"'").join(',')};`
		},
		dropDatabaseIfExists: (db) => `DROP DATABASE IF EXISTS ${db};`,
		createDatabase: (db) => `CREATE DATABASE ${db};`,
		transactionBegin: () => `START TRANSACTION;`,
		transactionCommit: () => `COMMIT;`,
		transactionRollback: () => `ROLLBACK;`,
		setForeignKeyCheckOn: () => `SET FOREIGN_KEY_CHECKS = 1;`,
		setForeignKeyCheckOff: () => `SET FOREIGN_KEY_CHECKS = 0;`,
		dropTableIfExistsCascade: (table) => `DROP TABLE IF EXISTS ${table};`,
		selectAllTables: (db) => `SELECT table_name AS tablename FROM information_schema.tables WHERE table_schema = '${db}';`,
	}

	return queryBuilder
}

/**
 * convert prisma rays param placeholder characters to the engine's one
 */
const normalizeQuery = (query: string): string => {
	return query.replace(ENGINE_PARAM_PLACEHOLDER, MYSQL2_PARAM_PLACEHOLDER)
}

const createConnection = async (databaseUrl: string, logger: ILogger): Promise<IDatabaseConnection> => {
	const dbname = getDatabaseName(databaseUrl)
	const client = await mySQL.createConnection(databaseUrl)

	try {
		await client.query('SET autocommit = 0')
		transactionsSupported = true
	} catch (e) {
		logger.warn('MySQL database version does not support disable autocommit and is unable to rollback failed queries')
		transactionsSupported = false
	}

	const connection: IDatabaseConnection = {
		query: async (q, params) => {
			logger.query(dbname, q, params)
			const [rows] = params ? await client.query(normalizeQuery(q), params) : await client.query(q)
			return rows as unknown[]
		},
		execute: async (q, params) => {
			logger.query(dbname, q, params)
			params ? await client.query(normalizeQuery(q), params) : await client.query(q)
		},
		disconnect: async () => {
			connectionPool.removeConnection(connection)
			await client.end()
		}
	}

	connectionPool.addConnection(connection)

	return connection
}

const getDatabaseFilesPath = () => ({ db: '', metafiles: [] })

const engine: IEngine = {
	isEngineForUrl,
	getDatabaseName,
	makeUrlForDatabase,
	queryBuilderFactory,
	createConnection,
	isDatabaseOnFile: false,
	getDatabaseFilesPath,
	isTransactionsSupported,
}

module.exports = engine
