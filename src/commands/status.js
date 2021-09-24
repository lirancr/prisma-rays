const {prismaSync} = require('../cmd')

/**
 * Prints the database migration status
 *
 * @return {Promise<void>}
 */
module.exports = async () => {
    prismaSync(`migrate status`)
}
