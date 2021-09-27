import {prismaSync} from '../cmd'
import type {StatusCommand} from "../types";

/**
 * Prints the database migration status
 *
 * @return {Promise<void>}
 */
const command: StatusCommand = async (): Promise<void> => {
    prismaSync(`migrate status`)
}

export default command
