const path = require('path')
const fs = require('fs')
const processArguments = require('./processArguments')
const engineProvider = require('./engineProvider')
const { DEFAULT_CONFIG_FILE_NAME, UTF8 } = require('./constants');

const processArgs = processArguments()

const {
    migrationsDir,
    schemaPath,
    databaseUrl,
    verboseLogging,
} = require(path.resolve(processArgs.conf || DEFAULT_CONFIG_FILE_NAME))
const { getDatabaseUrlEnvVarNameFromSchema, getDatabaseEngineFromSchema } = require('./utils')

const verbose = verboseLogging || 'log' in processArgs
if (verbose) {
    console.log('Verbose logging enabled')
}

const schema = path.resolve(schemaPath)
const schemaFile = fs.readFileSync(schema, UTF8)
const databaseUrlEnvVarName = getDatabaseUrlEnvVarNameFromSchema(schemaFile)
const databaseEngine = engineProvider.engineFor(getDatabaseEngineFromSchema(schemaFile))

module.exports = {
    verbose,
    migrationsPath: path.resolve(migrationsDir),
    schema,
    databaseUrl,
    databaseUrlEnvVarName,
    databaseEngine,
}
