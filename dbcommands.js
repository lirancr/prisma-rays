const {PrismaClient} = require("@prisma/client")
const {verbose, databaseUrl, databaseEngine} = require("./config")
const { prismaSync } = require('./cmd')
const prisma = new PrismaClient({
    log: verbose ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    datasources: {
        db: {
            url: databaseUrl
        }
    }
})

const executeRawOne = (command) => {
    const rawCommand = [command]
    rawCommand.raw = [command]
    return prisma.$executeRaw(rawCommand)
}

const queryRawOne = (command) => {
    const rawCommand = [command]
    rawCommand.raw = [command]
    return prisma.$queryRaw(rawCommand)
}

/**
 * Drops the migrations table if exists
 *
 * @return {Promise<void>}
 */
const clearMigrationsTable = async () => {
    try {
        await executeRawOne(databaseEngine.deleteMigrations())
    } catch (e) {}
}

/**
 * Insert a new migration record to the migrations table
 * @param name full migration folder name to insert
 *
 * @return {Promise<void>}
 */
const insertMigration = (name) => {
    prismaSync(`migrate resolve --applied ${name}`)
}

/**
 * Delete a migration record from the migrations table
 * @param name full migration folder name to delete
 *
 * @return {Promise<void>}
 */
const deleteMigration = (name) => {
    return executeRawOne(databaseEngine.deleteMigration(name))
}

/**
 * Retrieve the list of applied migrations
 *
 * @return {Promise<Array<string>>}
 */
const getAppliedMigrations = async () => {
    const migrations = await queryRawOne(databaseEngine.selectMigrations())
    return migrations.map(migration => migration.migration_name).sort()
}

/**
 * convert a single multi-command string into separate commands which can be run using prisma.$executeRaw
 *
 * @param query string
 * @return {Array<string>}
 */
const splitMultilineQuery = (query) => {
    return query.split('\n')
        // remove comments
        .filter((cmd) => !cmd.startsWith('-- '))
        .join('\n')
        .split(';')
        .map(cmd => cmd.trim())
        .filter((cmd) => cmd)
        .map((cmd) => cmd + ';')
}

const executeRaw = async (query) => {
    const commands = splitMultilineQuery(query)

    return prisma.$transaction(
        commands.map(executeRawOne)
    )
}

module.exports = {
    clearMigrationsTable,
    insertMigration,
    deleteMigration,
    getAppliedMigrations,
    executeRaw,
    executeRawOne,
    splitMultilineQuery,
    prisma,
}
