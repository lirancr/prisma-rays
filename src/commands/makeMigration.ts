import {prismaSync, commandSync, ask} from '../cmd'
import { UTF8, SCHEMA_FILE_NAME } from '../constants'
import { schema, databaseUrl, shadowDatabaseName, databaseUrlEnvVarName, databaseEngine, queryBuilder, logger } from '../config'
import * as path from 'path'
import * as fs from 'fs'
import { getMigrationFolders, migrationsPath } from '../migrationFileUtils'
import {dropAllTables, executeRaw, splitMultilineQuery} from '../dbcommands'
import type {MakeMigrationCommand} from "../types"
import { copyFile, writeFile, mkdir, rm, rmdir } from '../utils'

interface IMigrationScriptParams {
    migrationName: string
    execUp: string[]
    execDown: string[]
    autoResolveErrors: boolean
}

const generateMigrationScript = async ({ migrationName, execUp, execDown, autoResolveErrors}: IMigrationScriptParams): Promise<void> => {

    const createExecuteFunction = (fnBody: string): string => {
        return `async ({ client }) => { ${fnBody || ''} }`
    }

    const createExecuteCommand = (cmd: string = ''): string => {
        const command = cmd.replace(/`/g, '\\`')
        if (!command) {
            return ''
        }
        return `await client.execute(\`${command}\`)`
    }

    const createExecuteCommands = async (opsUp: string[], opsDown: string[], _autoResolveErrors: boolean): Promise<string> => {
        const operationsCount = Math.max(opsUp.length, opsDown.length)
        if (opsUp.length > 0 && opsDown.length > 0 && opsUp.length !== opsDown.length) {
            logger.warn('Warning: Migration operations for up and down have different amount of operations, please review generated migration script for miss-alignment in up and down operations')
            let autoResolveErrors = _autoResolveErrors
            if (!_autoResolveErrors) {
                autoResolveErrors = await ask('Attempt to auto-resolve this issue? (y/n): ') === 'y'
            }

            if (autoResolveErrors) {
                logger.warn('Warning: migration operation count miss-match auto-resolved, you should review the generated migration script')

                const joinMigrationOperations = (commands: string[]): string => {
                    return commands.map(createExecuteCommand).join('\n')
                }

                return `[${createExecuteFunction(joinMigrationOperations(opsUp))}, ${createExecuteFunction(joinMigrationOperations(opsDown))}],`
            }
        }

        const arr = new Array(operationsCount).fill(null)
        return arr.map((_, i) => {
            const upCommand = createExecuteCommand(opsUp[i])
            const downCommand = createExecuteCommand(opsDown[i])
            return `[${createExecuteFunction(upCommand)}, ${createExecuteFunction(downCommand)}],`
        }).join('\n')
    }

    const scriptData = fs.readFileSync(path.join(__dirname, '..', 'templates', 'migration.template.js'), UTF8)
        .replace('$migrationName', migrationName)
        .replace('$operations', await createExecuteCommands(execUp, execDown, autoResolveErrors))

    const migrationDir = path.join(migrationsPath, migrationName)
    if (!fs.existsSync(migrationDir)) {
        await mkdir(migrationDir, { recursive: true })
    }
    const filepath = path.join(migrationsPath, migrationName, 'migration.js')
    await writeFile(filepath, scriptData)
    commandSync(`npx prettier --write ${filepath}`)
}

/**
 * Create a migration file without applying it
 *
 * @param name suffix to append to the file name
 * @param blank allow creation of a blank migration if no changes are detected
 * @param autoResolveErrors toggle automatic handling of up/down operation count miss-match
 * @return {Promise<string|null>} the full name of the newly created migration
 */
const command: MakeMigrationCommand = async (name: string, blank: boolean, autoResolveErrors: boolean): Promise<string|null> => {
    // prepare sterile environment for migration generating
    const isShadowDatabaseConfigured = shadowDatabaseName!!

    const dbName = databaseEngine.getDatabaseName(databaseUrl)
    const shadowDbName: string = isShadowDatabaseConfigured
        ? shadowDatabaseName!
        : `${dbName}_shadow_${name}_${Date.now()}`
    const shadowDbUrl = databaseEngine.makeUrlForDatabase(databaseUrl, shadowDbName)

    const shadowEnv = {
        [databaseUrlEnvVarName]: shadowDbUrl
    }

    if (isShadowDatabaseConfigured) {
        await dropAllTables(shadowDbUrl)
    } else if (databaseEngine.isDatabaseOnFile) {
        const dbFilePath = databaseEngine.getDatabaseFilesPath(databaseUrl, { schemaPath: schema }).db
        const shadowDbFilePath = databaseEngine.getDatabaseFilesPath(shadowDbUrl, { schemaPath: schema }).db
        await copyFile(dbFilePath, shadowDbFilePath)
        await dropAllTables(shadowDbUrl)
    } else {
        await executeRaw(queryBuilder.dropDatabaseIfExists(shadowDbName), false)
        await executeRaw(queryBuilder.createDatabase(shadowDbName), false)
    }

    const cleanup = async () => {
        await Promise.all(
            databaseEngine.getDatabaseFilesPath(shadowDbUrl, { schemaPath: schema }).metafiles
            .map((f) => {
                logger.log('removing metafile', f)
                return rm(f)
            }))

        if (isShadowDatabaseConfigured) {
            await dropAllTables(shadowDbUrl)
        } else if (databaseEngine.isDatabaseOnFile) {
            logger.log('removing database file', shadowDbUrl)
            await rm(databaseEngine.getDatabaseFilesPath(shadowDbUrl, { schemaPath: schema }).db)
        } else {
            await executeRaw(queryBuilder.dropDatabaseIfExists(shadowDbName), false)
        }
    }

    try {
        // create migration
        const previousMigration = (await getMigrationFolders()).pop()
        logger.log('Creating up migration')
        prismaSync(`migrate dev --create-only --skip-seed --skip-generate --name ${name}`, shadowEnv)

        const newMigration = (await getMigrationFolders()).pop()

        if (!newMigration) {
            logger.log('migration creation aborted')
            return null
        }

        const migrationFileParams: IMigrationScriptParams = {
            migrationName: newMigration,
            execUp: [],
            execDown: [],
            autoResolveErrors,
        }

        migrationFileParams.execUp = splitMultilineQuery(fs.readFileSync(path.join(migrationsPath, newMigration, 'migration.sql'), UTF8))

        // check if new migration contain any changes at all
        if (migrationFileParams.execUp.length === 0) {
            if (blank) {
                logger.log('No schema changes detected. Creating blank migration')
            } else {
                logger.log('No schema changes detected. Migration not created')
                await rm(path.join(migrationsPath, newMigration), { recursive: true })
                return null
            }
        }

        // copy current schema for future reverts
        const currentSchemaBackup = path.join(migrationsPath, newMigration, SCHEMA_FILE_NAME)
        await copyFile(schema, currentSchemaBackup)

        // create a revert migration script based on previous schema
        if (previousMigration) {
            const previousSchema = path.join(migrationsPath, previousMigration, SCHEMA_FILE_NAME)

            await copyFile(previousSchema, schema)

            logger.log('Creating down migration')
            prismaSync(`migrate dev --create-only --skip-seed --skip-generate --name revert`, shadowEnv)

            const revertMigration = (await getMigrationFolders()).pop()!

            migrationFileParams.execDown = splitMultilineQuery(fs.readFileSync(path.join(migrationsPath, revertMigration, 'migration.sql'), UTF8))

            // cleanup
            await rmdir(path.join(migrationsPath, revertMigration), { recursive: true })
            await copyFile(currentSchemaBackup, schema)
        }

        await generateMigrationScript(migrationFileParams)

        await cleanup()

        return newMigration
    } catch (e) {
        await cleanup()
        throw e
    }
}

export default command
module.exports = command
