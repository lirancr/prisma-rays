import * as path from 'path'
import * as fs from 'fs'
import processArguments from './processArguments'
import * as queryBuilderProvider from './queryBuilderProvider'
import { DEFAULT_CONFIG_FILE_NAME, UTF8 } from './constants'
import type {LensConfig} from "./types";

const processArgs = processArguments()

const {
    migrationsDir,
    schemaPath,
    databaseUrl,
    verboseLogging,
} = require(path.resolve(processArgs.conf || DEFAULT_CONFIG_FILE_NAME)) as LensConfig

import { getDatabaseUrlEnvVarNameFromSchema, getDatabaseEngineFromSchema } from './utils'

export const verbose = verboseLogging || 'log' in processArgs
if (verbose) {
    console.log('Verbose logging enabled')
}

export const schema = path.resolve(schemaPath)

const schemaFile = fs.readFileSync(schema, UTF8)

export const databaseUrlEnvVarName = getDatabaseUrlEnvVarNameFromSchema(schemaFile)!
export const queryBuilder = queryBuilderProvider.builderFor(getDatabaseEngineFromSchema(schemaFile)!, databaseUrl)!
export const migrationsPath =  path.resolve(migrationsDir)
export { databaseUrl }
