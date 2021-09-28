import type { PrismaClient } from "@prisma/client"

export interface LensConfig {
    migrationsDir: string
    schemaPath: string
    databaseUrl: string
    verboseLogging: boolean
}

export interface IDatabaseEngine {
    deleteMigrations: () => string
    deleteMigrationsByName: (name: string) => string
    selectMigrations: () =>  string
    dropDatabaseIfExists: (db: string) => string
    createDatabase: (db: string) => string
    transactionBegin: () => string
    transactionCommit: () => string
    transactionRollback: () => string
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
