const processArguments = require('./processArguments')
const verifyConfig = require('./verifyConfig')

const logHelp = (func, description, options = []) => {
    const argsData = options.map((pair) => pair.join('   ')).join('\n           ')
    console.log('        ', func, '   ', description, options.length > 0 ? '\n          ' : '', argsData)
}

const apiHelp = {
    init: () => {
        logHelp('init', 'Setup prisma lens for your project.')
    },
    prepare: () => {
        logHelp('prepare', 'Initialize the migration system against the current existing database. Warning this will empty the database in the process.')
    },
    makemigration: () => {
        logHelp('makemigration', 'Create a migration file based on your recent schema changes.', [
            ['name', 'suffix to give to the created migration.'],
            ['blank', 'optional. allow the creation of a blank migration if no changes detected']
        ])
    },
    migrate: () => {
        logHelp('migrate', 'Migrate the database up and down.', [
            ['name', 'optional migration name. If provided database will migrate to the state declared in the migration.'],
            ['fake', 'optional flag. If set, change the migration state without applying database changes.'],
        ])
    },
    status: () => {
        logHelp('status', 'log the migration and schema status against the database structure')
    }
}

const commands = {
    init: async () => {
        return require('./commands/init')()
    },
    prepare: async () => {
        return require('./commands/prepare')()
    },
    makemigration: async () => {
        const args = processArguments('name')
        const blank = 'blank' in args
        return require('./commands/makeMigration')(args.name, blank)
    },
    migrate: async () => {
        const args = processArguments()
        const fake = 'fake' in args
        return require('./commands/migrate')({ name: args.name, fake })
    },
    status: async () => {
        return require('./commands/status')()
    },
    help: async () => {
        console.log('Commands\n')
        Object.values(apiHelp).forEach(api => api())
        const globalArgsData = [
            ['log', 'run command with verbose logging'],
            ['conf', 'path to your config file'],
        ].map((pair) => pair.join('   '))
            .join('\n           ')
        console.log('\n          ', globalArgsData, '\n')
    }
}

const command = process.argv[2]
if (!command) {
    throw new Error(`Command is missing. Must be one of [${Object.keys(commands).join(',')}]`)
}

if (!commands[command]) {
    throw new Error(`Unknown command "${command}". Must be one of [${Object.keys(commands).join(',')}]`)
}

if (command !== 'help' && 'help' in processArguments()) {
    apiHelp[command]()
    return
}

const configVerification = command === 'init' ? Promise.resolve() : verifyConfig()
configVerification.then(() =>
    commands[command]().then(() => console.log(command, 'finished successfully'))
)
