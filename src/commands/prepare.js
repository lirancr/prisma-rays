const { prismaSync, ask } = require('../cmd')
const makeMigration = require('./makeMigration')
const migrate = require('./migrate')
const { getMigrationFolders } = require('../migrationFileUtils')
const { clearMigrationsTable } = require('../dbcommands')

/**
 *
 * @return {Promise<void>}
 */
module.exports = async () => {
    // make sure we dont have existing migrations
    if (getMigrationFolders().length > 0) {
        throw new Error('Project already initialized (migrations folder is not empty)')
    }

    if (await ask('Initializing the database will require dropping all the data from it. Continue? (y/n): ') !== 'y') {
        console.log('aborting')
        return
    }

    await clearMigrationsTable()

    // sync schema with existing database state
    prismaSync(`db pull`)
    prismaSync(`migrate reset --force --skip-generate --skip-seed`)

    const initialMigrationFile = await makeMigration('init')

    await migrate({name: initialMigrationFile})
}
