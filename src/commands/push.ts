import { prismaSync, ask } from '../cmd'
import { logger } from '../config'
import type {PushCommand} from "../types"

/**
 * Reset the database to the current state of your schema (without applying migrations)
 * @return {Promise<string|null>} the full name of the newly created migration
 */
const command: PushCommand = async (approveReset: boolean): Promise<void> => {
    if (!approveReset && await ask('Pushing schema to database require database to be reset. Continue? (y/n): ') !== 'y') {
        logger.log('aborting')
        return
    }

    prismaSync(`db push --accept-data-loss --skip-generate --force-reset`)
}

export default command
module.exports = command
