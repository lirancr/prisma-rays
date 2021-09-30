import { prismaSync, commandSync } from '../cmd'
import { UTF8, SCHEMA_FILE_NAME } from '../constants'
import { schema, databaseUrl, shadowDatabaseName, databaseUrlEnvVarName, queryBuilder } from '../config'
import * as path from 'path'
import * as fs from 'fs'
import { getMigrationFolders, migrationsPath } from '../migrationFileUtils'
import {dropAllTables, executeRaw, splitMultilineQuery} from '../dbcommands'
import type {MakeMigrationCommand} from "../types";

interface IMigrationScriptParams {
    migrationName: string
    execUp: string[]
    execDown: string[]
}

const generateMigrationScript = ({ migrationName, execUp, execDown}: IMigrationScriptParams): void => {
    const createExecuteCommands = (arr: string[]) => arr
        .map((cmd) => cmd.replace(/`/g, '\\`'))
        .map((cmd) => `await prisma.$executeRaw\`${cmd}\`;`)
        .join('\n')

    const scriptData = fs.readFileSync(path.join(__dirname, '..', 'templates', 'migration.template.js'), UTF8)
        .replace('$migrationName', migrationName)
        .replace('$execUp', createExecuteCommands(execUp))
        .replace('$execDown', createExecuteCommands(execDown))

    const filepath = path.join(migrationsPath, migrationName, 'migration.js')
    fs.writeFileSync(filepath, scriptData)
    commandSync(`npx prettier --write ${filepath}`)
}

/**
 * Create a migration file without applying it
 *
 * @param name suffix to append to the file name
 * @param blank allow creation of a blank migration if no changes are detected
 * @return {Promise<string|null>} the full name of the newly created migration
 */
const command: MakeMigrationCommand = async (name: string, blank = false): Promise<string|null> => {
    // prepare sterile environment for migration generating
    const isShadowDatabaseConfigured = shadowDatabaseName!!

    const dbName = databaseUrl.match(/postgresql:\/\/.+:.+@.+:[0-9]+\/([^?]+)\??.+/)!.pop()!
    const shadowDbName: string = isShadowDatabaseConfigured
        ? shadowDatabaseName!
        : `${dbName}_shadow_${name}_${Date.now()}`
    const shadowDbUrl = databaseUrl
        .replace(/(postgresql:\/\/.+:.+@.+:[0-9]+\/)([^?]+)(\??.+)/, `$1${shadowDbName}$3`)

    const shadowEnv = {
        [databaseUrlEnvVarName]: shadowDbUrl
    }

    if (isShadowDatabaseConfigured) {
        await dropAllTables(shadowDbUrl)
    } else {
        await executeRaw(queryBuilder.dropDatabaseIfExists(shadowDbName))
        await executeRaw(queryBuilder.createDatabase(shadowDbName))
    }

    const cleanup = async () => {
        if (isShadowDatabaseConfigured) {
            await dropAllTables(shadowDbUrl)
        } else {
            await executeRaw(queryBuilder.dropDatabaseIfExists(shadowDbName))
        }
    }

    try {
        // perform migration
        const previousMigration = getMigrationFolders().pop()
        console.log('Creating up migration')
        prismaSync(`migrate dev --create-only --skip-seed --skip-generate --name ${name}`, shadowEnv)

        const newMigration = getMigrationFolders().pop()

        if (!newMigration) {
            console.log('migration creation aborted')
            return null
        }

        const migrationFileParams: IMigrationScriptParams = {
            migrationName: newMigration,
            execUp: [],
            execDown: [],

        }

        migrationFileParams.execUp = splitMultilineQuery(fs.readFileSync(path.join(migrationsPath, newMigration, 'migration.sql'), UTF8))

        // check if new migration contain any changes at all
        if (migrationFileParams.execUp.length === 0) {
            if (blank) {
                console.log('No schema changes detected. Creating blank migration')
            } else {
                console.log('No schema changes detected. Migration not created')
                fs.rmSync(path.join(migrationsPath, newMigration), { recursive: true })
                return null
            }
        }

        // copy current schema for future reverts
        const currentSchemaBackup = path.join(migrationsPath, newMigration, SCHEMA_FILE_NAME)
        fs.copyFileSync(schema, currentSchemaBackup)

        // create a revert migration script based on previous schema
        if (previousMigration) {
            const previousSchema = path.join(migrationsPath, previousMigration, SCHEMA_FILE_NAME)

            fs.copyFileSync(previousSchema, schema)

            console.log('Creating down migration')
            prismaSync(`migrate dev --create-only --skip-seed --skip-generate --name revert`, shadowEnv)

            const revertMigration = getMigrationFolders().pop()!

            migrationFileParams.execDown = splitMultilineQuery(fs.readFileSync(path.join(migrationsPath, revertMigration, 'migration.sql'), UTF8))

            // cleanup
            fs.rmSync(path.join(migrationsPath, revertMigration), { recursive: true })
            fs.copyFileSync(currentSchemaBackup, schema)
        }

        generateMigrationScript(migrationFileParams)

        await cleanup()

        return newMigration
    } catch (e) {
        await cleanup()
        throw e
    }
}

export default command
module.exports = command
