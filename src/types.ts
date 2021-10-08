export interface RaysConfig {
    migrationsDir: string
    schemaPath: string
    databaseUrl: string
    shadowDatabaseName: string | null
    verboseLogging: boolean
}

export interface IDatabaseClientApi {
    query: (query: string, params?: any[]) => Promise<unknown[]>
    execute: (query: string, params?: any[]) => Promise<void>
}

export interface IDatabaseConnection extends IDatabaseClientApi{
    disconnect: () => Promise<void>
}

export interface IDatabaseTopology {
    schemaPath: string,
}

export interface IEngine {
    /** matches the give url with the url pattern associated with the target database */
    isEngineForUrl: (databaseUrl: string) => boolean
    /** build a valid database url based on the given databaseUrl but with different database name */
    makeUrlForDatabase: (databaseUrl: string, dbName: string) => string
    /** extracts database name from it's url */
    getDatabaseName: (databaseUrl: string) => string
    queryBuilderFactory: QueryBuilderFactory
    createConnection: (databaseUrl: string, logger: ILogger, topology: IDatabaseTopology) => Promise<IDatabaseConnection>
    isDatabaseOnFile: boolean
    getDatabaseFilesPath: (databaseUrl: string, topology: IDatabaseTopology) => { db: string, metafiles: string[] }
}

export type QueryBuilderFactory = (databaseUrl: string) => IQueryBuilder

export interface IQueryBuilder {
    deleteAllFrom: (table: string) => string
    deleteFromBy: (table: string, column: string, value: string) => string
    selectAllFrom: (table: string) =>  string
    insertInto: (table: string, values: { [column: string]: string }) => string
    updateAll: (table: string, values: { [column: string]: string }) => string
    dropDatabaseIfExists: (db: string) => string
    createDatabase: (db: string) => string
    transactionBegin: () => string
    transactionCommit: () => string
    transactionRollback: () => string
    setForeignKeyCheckOn: () => string
    setForeignKeyCheckOff: () => string
    dropTableIfExistsCascade: (table: string) => string
    selectAllTables: (db: string) => string
}

type MigrationOperation = (arg: { client: IDatabaseClientApi }) => Promise<never>

export type IMigrationScript = Array<[MigrationOperation, MigrationOperation]>

export interface ILogger {
    log: (...args: any) => void
    error: (...args: any) => void
    warn: (...args: any) => void
    query: (...args: any) => void
    info: (databaseName: string, ...args: any) => void
}

export type InitCommand = () => Promise<void>
export type MakeMigrationCommand = (name: string, blank?: boolean) => Promise<string|null>
export type MigrateCommand = (arg?: { name?: string, fake?: boolean }) => Promise<void>
export type PrepareCommand = (approveReset: boolean) => Promise<void>
export type StatusCommand = () => Promise<void>
export type PushCommand = (approveReset: boolean) => Promise<void>
