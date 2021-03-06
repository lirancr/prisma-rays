import * as path from 'path'
import * as fs from 'fs'
import processArguments from './processArguments'
import * as engineProvider from './engineProvider'
import { DEFAULT_CONFIG_FILE_NAME, UTF8 } from './constants'
import type {ILogger, RaysConfig} from "./types";

const processArgs = processArguments()

const {
    migrationsDir,
    schemaPath,
    databaseUrl,
    shadowDatabaseName,
    verboseLogging,
} = require(path.resolve(processArgs.conf || DEFAULT_CONFIG_FILE_NAME)) as RaysConfig

import { getDatabaseUrlEnvVarNameFromSchema } from './utils'

export const verbose = verboseLogging || 'log' in processArgs
if (verbose) {
    console.log('Verbose logging enabled')
}

export const schema = path.resolve(schemaPath)

const schemaFile = fs.readFileSync(schema, UTF8)

export const logger: ILogger = {
    log: verbose ? console.log : () => {},
    warn: console.warn,
    error: console.error,
    info: verbose ? console.info : () => {},
    query: verbose ? (db: string, ...args: any[]) => { console.log (db, ':', ...args)} : () => {},
}

export const databaseUrlEnvVarName = getDatabaseUrlEnvVarNameFromSchema(schemaFile)!
export const databaseEngine = engineProvider.engineFor(databaseUrl)!
export const queryBuilder = databaseEngine.queryBuilderFactory(databaseUrl)!
export const migrationsPath =  path.resolve(migrationsDir)
export { databaseUrl, shadowDatabaseName }
