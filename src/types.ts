import type { PrismaClient } from "@prisma/client"

export interface LensConfig {
    migrationsDir: string
    schemaPath: string
    databaseUrl: string
    shadowDatabaseName: string | null
    verboseLogging: boolean
}

export interface IEngine {
    /** matches the give url with the url pattern associated with the target database */
    isEngineForUrl: (databaseUrl: string) => boolean
    /** build a valid database url based on the given databaseUrl but with different database name */
    makeUrlForDatabase: (databaseUrl: string, dbName: string) => string
    /** extracts database name from it's url */
    getDatabaseName: (databaseUrl: string) => string
    queryBuilderFactory: QueryBuilderFactory
}

export type QueryBuilderFactory = (databaseUrl: string) => IQueryBuilder

export interface IQueryBuilder {
    deleteAllFrom: (table: string) => string
    deleteFromBy: (table: string, column: string, value: string) => string
    selectAllFrom: (table: string) =>  string
    insertInto: (table: string, values: { [column: string]: string }) => string
    dropDatabaseIfExists: (db: string) => string
    createDatabase: (db: string) => string
    transactionBegin: () => string
    transactionCommit: () => string
    transactionRollback: () => string
    dropAllTables: () => string
}

export interface IMigrationScript {
    up: (arg: { prisma: PrismaClient }) => Promise<unknown>
    down: (arg: { prisma: PrismaClient }) => Promise<unknown>
}

export type InitCommand = () => Promise<void>
export type MakeMigrationCommand = (name: string, blank?: boolean) => Promise<string|null>
export type MigrateCommand = (arg?: { name?: string, fake?: boolean }) => Promise<void>
export type PrepareCommand = (approveReset: boolean) => Promise<void>
export type StatusCommand = () => Promise<void>
