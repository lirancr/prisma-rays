import {PrismaClient} from "@prisma/client"
import {verbose, databaseUrl, queryBuilder} from "./config"
import { prismaSync } from './cmd'
import { PRISMA_MIGRATIONS_TABLE, PRISMA_MIGRATION_NAME_COL } from "./constants";

export const prisma = new PrismaClient({
    log: verbose ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    datasources: {
        db: {
            url: databaseUrl
        }
    }
})

export const executeRawOne = (command: string): Promise<unknown> => {
    const rawCommand: any = [command]
    rawCommand.raw = [command]
    return prisma.$executeRaw(rawCommand)
}

const queryRawOne = (command: string): Promise<any> => {
    const rawCommand: any = [command]
    rawCommand.raw = [command]
    return prisma.$queryRaw(rawCommand)
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
    const migrations = await queryRawOne(queryBuilder.selectAllFrom(PRISMA_MIGRATIONS_TABLE))
    return migrations.map((migration: any) => migration[PRISMA_MIGRATION_NAME_COL]).sort()
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

export const executeRaw = async (query: string): Promise<unknown> => {
    const commands = splitMultilineQuery(query)

    return prisma.$transaction(
        commands.map(executeRawOne) as any
    )
}
