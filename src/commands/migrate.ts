import { getMigrationFolders } from "../migrationFileUtils";
import { getAppliedMigrations, insertMigration, deleteMigration, executeRawOne } from '../dbcommands'
import { prismaSync } from "../cmd";
import { SCHEMA_FILE_NAME } from '../constants'
import {schema, migrationsPath, queryBuilder, databaseEngine, logger, databaseUrl} from "../config";
import * as path from 'path';
import * as  fs from 'fs';
import type {IDatabaseConnection, IMigrationScript, MigrateCommand} from "../types";

/**
 *
 * @param name? optional file name to migrate up/down to
 * @param fake? optional flag to only apply changes to migration state without applying database changes
 * @return {Promise<void>}
 */
const command: MigrateCommand = async ({ name, fake } = {}): Promise<void> => {
    const allMigrations = getMigrationFolders()
    const currentDbState = await getAppliedMigrations()

    console.log('verifying migration/database sync state')
    if (currentDbState.length > allMigrations.length) {
        throw new Error('Unable to migrate database - database is at a later state than there are migrations.'+JSON.stringify(currentDbState))
    }

    currentDbState.forEach((n: string, i: number) => {
        if (n !== allMigrations[i]) {
            throw new Error(`Unable to migrate database - database has an unexpected intermediate migration which is missing from the migrations folder.\nExpected ${n} but found ${allMigrations[i]} at index ${i}`)
        }
    })

    console.log('migration/database sync state check passed')

    const targetIndex = name ? allMigrations.indexOf(name) : allMigrations.length - 1

    if (name && targetIndex === -1) {
        throw new Error(`Unable to migrate database to migration named ${name} - No such migration exists`)
    }

    const migrationsToApply = []
    let migrateUp = true

    if (targetIndex + 1 > currentDbState.length) {
        // migrate up
        migrationsToApply.push(...allMigrations.slice(currentDbState.length, targetIndex + 1))
        console.log('migrating up', migrationsToApply.length, 'migrations')
    } else if (targetIndex + 1 < currentDbState.length) {
        // migrate down
        migrateUp = false
        migrationsToApply.push(...allMigrations.slice(targetIndex + 1, currentDbState.length).reverse())
        console.log('migrating down', migrationsToApply.length, 'migrations')
    } else {
        // dont migrate
        console.log('Nothing to migrate, database is up to date.')
        return
    }

    if (name) {
        console.log('Bringing database', migrateUp ? 'up' : 'down', 'to', name)
    }

    for (let migration of migrationsToApply) {
        console.log(fake ? 'Fake -' : '', migrateUp ? 'Applying' : 'Reverting','migration -', migration)
        const migrationScript: IMigrationScript = require(path.join(migrationsPath, migration, 'migration.js'))
        if (!fake) {
            const migrationCommand = migrateUp ? migrationScript.up : migrationScript.down
            const client: IDatabaseConnection = await databaseEngine.createConnection(databaseUrl, logger)

            try {
                await executeRawOne(queryBuilder.transactionBegin())
                await migrationCommand({ client })
                await executeRawOne(queryBuilder.transactionCommit())

            } catch (e) {
                await executeRawOne(queryBuilder.transactionRollback())
                throw e
            }
        }
        await (migrateUp ? insertMigration(migration) : deleteMigration(migration))

        const currentStateSchema = path.join(migrationsPath,
            migrateUp
                ? migration
                : allMigrations[Math.max(allMigrations.indexOf(migration) - 1, 0)],
            SCHEMA_FILE_NAME)

        console.log('updating schema definition according to migration')
        fs.copyFileSync(
            currentStateSchema,
            schema
        )
    }

    console.log('Migration successful, updating client type definitions')
    prismaSync(`generate`)
}

export default command
module.exports = command
