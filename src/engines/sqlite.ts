import {QueryBuilderFactory, IEngine, IQueryBuilder, IDatabaseConnection, ILogger, IDatabaseTopology} from "../types";
import * as connectionPool from "../databaseConnectionPool"
import * as sqlite3 from "sqlite3"
import * as path from 'path'
import {ENGINE_PARAM_PLACEHOLDER} from "../constants";

const SQLITE3_PARAM_PLACEHOLDER = '?'

const isEngineForUrl = (databaseUrl: string): boolean => {
	return /^file:/i.test(databaseUrl)
}

const getDatabaseName = (databaseUrl: string): string => {
	const dbName =  databaseUrl.match(/file:.+\/(.+)/i)?.pop()
	if (!dbName) {
		throw new Error(`EngineError:sqlite - databaseUrl did not match expected pattern: ${databaseUrl}`)
	}
	return dbName
}

const makeUrlForDatabase = (databaseUrl: string, dbName: string): string => {
	const url = databaseUrl.replace(/(file:.+\/)(.+)/i, `$1${dbName}`)
	if (!url.includes(dbName)) {
		throw new Error(`EngineError:sqlite - databaseUrl did not match expected pattern: ${databaseUrl}`)
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
		dropDatabaseIfExists: () => ``,
		createDatabase: () => ``,
		transactionBegin: () => `BEGIN;`,
		transactionCommit: () => `COMMIT;`,
		transactionRollback: () => `ROLLBACK;`,
		setForeignKeyCheckOn: () => `PRAGMA ignore_check_constraints = false;`,
		setForeignKeyCheckOff: () => `PRAGMA ignore_check_constraints = true;`,
		dropTableIfExistsCascade: (table) => `DROP TABLE IF EXISTS ${table};`,
		selectAllTables: () => `SELECT name AS tablename FROM sqlite_master WHERE type='table';`,
	}

	return queryBuilder
}

/**
 * convert prisma rays param placeholder characters to the engine's one
 */
const normalizeQuery = (query: string): string => {
	return query.replace(ENGINE_PARAM_PLACEHOLDER, SQLITE3_PARAM_PLACEHOLDER)
}

const createConnection = async (databaseUrl: string, logger: ILogger, topology: IDatabaseTopology): Promise<IDatabaseConnection> => {
	const dbname = getDatabaseName(databaseUrl)

	const fileUrl = getDatabaseFilePath(databaseUrl, topology)
	const client = new sqlite3.Database(fileUrl)

	const connection: IDatabaseConnection = {
		query: async (q, params) => {
			logger.query(dbname, q, params)
			return new Promise<unknown[]>((resolve, reject) => {
				const cb = (err: any, rows: unknown[]) => err ? reject(err) : resolve(rows)
				params ? client.all(normalizeQuery(q), params, cb) : client.all(q, cb)
			})
		},
		execute: async (q, params) => {
			logger.query(dbname, q, params)
			await new Promise<void>((resolve, reject) => {
				const cb = (err: any) => err ? reject(err) : resolve()
				params ? client.run(normalizeQuery(q), params, cb) : client.run(q, cb)
			})
		},
		disconnect: async () => {
			connectionPool.removeConnection(connection)
			return client.close()
		}
	}

	connectionPool.addConnection(connection)

	return connection
}

const getDatabaseFilePath = (databaseUrl: string, { schemaPath }: IDatabaseTopology): string => {
	const pathRelativeToPrismaSchema = databaseUrl.split(/^file:/i).pop()!
	return path.join(path.dirname(schemaPath), pathRelativeToPrismaSchema)
}

const engine: IEngine = {
	isEngineForUrl,
	getDatabaseName,
	makeUrlForDatabase,
	queryBuilderFactory,
	createConnection,
	isDatabaseOnFile: true,
	getDatabaseFilePath,
}

module.exports = engine
