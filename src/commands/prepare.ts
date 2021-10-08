import { prismaSync, ask } from '../cmd'
import makeMigration from './makeMigration'
import migrate from './migrate'
import { getMigrationFolders } from '../migrationFileUtils'
import { clearMigrationsTable } from '../dbcommands'
import type {PrepareCommand} from "../types";
import { logger } from '../config'

/**
 *
 * @return {Promise<void>}
 */
const command: PrepareCommand = async (approveReset): Promise<void> => {
    // make sure we dont have existing migrations
    if ((await getMigrationFolders()).length > 0) {
        throw new Error('Project already initialized (migrations folder is not empty)')
    }

    if (!approveReset && await ask('Initializing the database will require dropping all the data from it. Continue? (y/n): ') !== 'y') {
        logger.log('aborting')
        return
    }

    await clearMigrationsTable()

    // sync schema with existing database state
    prismaSync(`db pull`)
    prismaSync(`migrate reset --force --skip-generate --skip-seed`)

    const initialMigrationFile = await makeMigration('init', false, false)

    await migrate({name: initialMigrationFile!})
}

export default command
module.exports = command
