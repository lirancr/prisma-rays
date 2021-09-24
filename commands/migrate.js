const { getMigrationFolders } = require("../migrationFileUtils");
const { getAppliedMigrations, insertMigration, deleteMigration, executeRawOne, prisma } = require('../dbcommands')
const { prismaSync } = require("../cmd");
const { SCHEMA_FILE_NAME } = require('../constants')
const {schema, migrationsPath, databaseEngine} = require("../config");
const path = require('path');
const fs = require('fs');

/**
 *
 * @param name? optional file name to migrate up/down to
 * @param fake? optional flag to only apply changes to migration state without applying database changes
 * @return {Promise<void>}
 */
module.exports = async ({ name, fake } = {}) => {
    const allMigrations = getMigrationFolders()
    const currentDbState = await getAppliedMigrations()

    console.log('verifying migration/database sync state')
    if (currentDbState.length > allMigrations.length) {
        throw new Error('Unable to migrate database - database is at a later state than there are migrations.')
    }

    currentDbState.forEach((n, i) => {
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
        const migrationScript = require(path.join(migrationsPath, migration, 'migration.js'))
        if (!fake) {
            const migrationCommand = migrateUp ? migrationScript.up : migrationScript.down
            try {
                await executeRawOne(databaseEngine.transactionBegin())
                await migrationCommand({ prisma })
                await executeRawOne(databaseEngine.transactionCommit())

            } catch (e) {
                await executeRawOne(databaseEngine.transactionRollback())
                throw e
            }
        }
        await (migrateUp ? insertMigration(migration) : deleteMigration(migration))

        const currentStateSchema = path.join(migrationsPath,
            migrateUp
                ? migration
                : allMigrations[Math.min(allMigrations.indexOf(migration) - 1, 0)],
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
