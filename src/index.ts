import type {InitCommand, MakeMigrationCommand, MigrateCommand, PrepareCommand, StatusCommand, PushCommand} from "./types"
import processArguments from './processArguments'
import verifyConfig from './verifyConfig'
import { releaseConnections } from "./databaseConnectionPool"

const logHelp = (func: string, description: string, options: string[][] = []) => {
    const argsData = options.map((pair) => pair.join('   ')).join('\n           ')
    console.log('        ', func, '   ', description, options.length > 0 ? '\n          ' : '', argsData)
}

const apiHelp: { [name: string]: () => unknown } = {
    init: () => {
        logHelp('init', 'Setup prisma rays for your project.')
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
    push: () => {
        logHelp('push', 'Reset the database to the current schema state.')
    },
    status: () => {
        logHelp('status', 'log the migration and schema status against the database structure')
    }
}

const commands: { [name: string]: () => Promise<unknown> } = {
    init: async () => {
        return (require('./commands/init') as InitCommand)()
    },
    prepare: async () => {
        const args = processArguments()
        return (require('./commands/prepare') as PrepareCommand)('y' in args)
    },
    makemigration: async () => {
        const args = processArguments('name')
        const blank = 'blank' in args
        return (require('./commands/makeMigration') as MakeMigrationCommand)(args.name, blank)
    },
    migrate: async () => {
        const args = processArguments()
        const fake = 'fake' in args
        return (require('./commands/migrate') as MigrateCommand)({ name: args.name, fake })
    },
    push: async () => {
        const args = processArguments()
        const approveReset = 'y' in args
        return (require('./commands/push') as PushCommand)(approveReset)
    },
    status: async () => {
        return (require('./commands/status') as StatusCommand)()
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

const command: string = process.argv[2]
if (!command) {
    throw new Error(`Command is missing. Must be one of [${Object.keys(commands).join(',')}]`)
}

if (!commands[command]) {
    throw new Error(`Unknown command "${command}". Must be one of [${Object.keys(commands).join(',')}]`)
}

if (command !== 'help' && 'help' in processArguments()) {
    apiHelp[command]()
} else {
    const configVerification = command === 'init' ? Promise.resolve() : verifyConfig()

    configVerification.then(() => {
        return commands[command]()
    }).then(() => {
        releaseConnections().then(() => {
            console.log(command, 'finished successfully')
        })
    }).catch((e) => {
        process.on('exit', () => console.error(e))
        process.exit(1)
    })
}
