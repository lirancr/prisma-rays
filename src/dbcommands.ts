import {PrismaClient} from "@prisma/client"
import {verbose, databaseUrl, queryBuilder, databaseEngine, logger, schema } from "./config"
import { prismaSync } from './cmd'
import { PRISMA_MIGRATIONS_TABLE, PRISMA_MIGRATION_NAME_COL } from "./constants";
import {IDatabaseConnection} from "./types";

const createPrismaClient = (url:string): PrismaClient => new PrismaClient({
    log: verbose ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    datasources: {
        db: {
            url,
        }
    }
})

export const prisma = createPrismaClient(databaseUrl)
const dbConnection = databaseEngine.createConnection(databaseUrl, logger, { schemaPath: schema })

export const executeRawOne = async (command: string, connection: Promise<IDatabaseConnection> = dbConnection): Promise<unknown> => {
    const client = await connection
    return client.execute(command)
}

const queryRawOne = async (command: string, connection: Promise<IDatabaseConnection> = dbConnection): Promise<any> => {
    const client = await connection
    return client.query(command)
}

/**
 * Drops the migrations table if exists
 *
 * @return {Promise<void>}
 */
export const clearMigrationsTable = async (): Promise<void> => {
    try {
        await executeRawOne(queryBuilder.deleteAllFrom(PRISMA_MIGRATIONS_TABLE))
    } catch (e) {}
}

/**
 * Insert a new migration record to the migrations table
 * @param name full migration folder name to insert
 *
 * @return {Promise<void>}
 */
export const insertMigration = async (name: string): Promise<void> => {
    prismaSync(`migrate resolve --applied ${name}`)
}

/**
 * Delete a migration record from the migrations table
 * @param name full migration folder name to delete
 *
 * @return {Promise<void>}
 */
export const deleteMigration = async (name: string): Promise<unknown> => {
    return executeRawOne(queryBuilder.deleteFromBy(PRISMA_MIGRATIONS_TABLE, PRISMA_MIGRATION_NAME_COL, name))
}

/**
 * Retrieve the list of applied migrations
 *
 * @return {Promise<Array<string>>}
 */
export const getAppliedMigrations = async (): Promise<string[]> => {
    try {
        const migrations = await queryRawOne(queryBuilder.selectAllFrom(PRISMA_MIGRATIONS_TABLE))
        return migrations.map((migration: any) => migration[PRISMA_MIGRATION_NAME_COL]).sort()
    } catch (e) {
        return []
    }
}

/**
 * convert a single multi-command string into separate commands which can be run using prisma.$executeRaw
 *
 * @param query string
 * @return {Array<string>}
 */
export const splitMultilineQuery = (query: string): string[] => {
    return query.split('\n')
        // remove comments
        .filter((cmd) => !cmd.startsWith('-- '))
        .join('\n')
        .split(';')
        .map(cmd => cmd.trim())
        .filter((cmd) => cmd)
        .map((cmd) => cmd + ';')
}

export const dropAllTables = async (databaseUrl: string): Promise<void> => {
    logger.log('dropping all tables from', databaseUrl)
    const connection = databaseEngine.createConnection(databaseUrl, logger, { schemaPath: schema })
    const client = await connection
    const preQuery = queryBuilder.setForeignKeyCheckOff()
    const postQuery = queryBuilder.setForeignKeyCheckOn()
    const query = queryBuilder.selectAllTables(databaseEngine.getDatabaseName(databaseUrl))

    const tables = await queryRawOne(query, connection) as { tablename: string }[]
    if (tables.length > 0) {
        const command = tables.map(({tablename}) => queryBuilder.dropTableIfExistsCascade(tablename)).join('\n')
        await executeRaw(preQuery + command + postQuery, connection)
    }

    if ((await queryRawOne(query, connection) as { tablename: string }[]).length > 0) {
        throw new Error('failed to remove tables of database '+databaseUrl)
    }

    await client.disconnect()
}

export const executeRaw = async (query: string, connection: Promise<IDatabaseConnection> = dbConnection): Promise<unknown> => {
    const commands = splitMultilineQuery(query)

    const client = await connection
    await client.execute(queryBuilder.transactionBegin())
    try {
        let res
        for (const cmd of commands) {
            res = await client.execute(cmd)
        }
        await client.execute(queryBuilder.transactionCommit())
        return res
    } catch (e) {
        await client.execute(queryBuilder.transactionRollback())
        throw e
    }
}
