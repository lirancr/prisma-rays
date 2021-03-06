import * as path from 'path'
import * as fs from 'fs'
import execa from 'execa'
import * as engineProvider from '../../src/engineProvider'
import {UTF8} from "../../src/constants"
import type {IQueryBuilder} from "../../src/types";
import _ from 'lodash'

const testProjectPath = path.join(__dirname, '..', 'test-project')

const topology = {
    root: testProjectPath,
    migrationsDir: path.join(testProjectPath, 'prisma', 'migrations'),
    schema: path.join(testProjectPath, 'prisma', 'schema.prisma'),
    raysconfig: path.join(testProjectPath, 'raysconfig.js'),
}

export type TestFunction = (testkit: {
    exec: (cmd: string, options?: execa.Options) => Promise<unknown>,
    rays: (cmd: string) => Promise<unknown>,
    setSchema: (modelsSchema: string) => string,
    shadowDatabaseName?: string
    topology: {
        root: string,
        migrationsDir: string,
        schema: string,
        raysconfig: string,
    },
    queryBuilder: IQueryBuilder
    raw: {
        query: (query: string, databaseName?: string) => Promise<any>,
        execute: (query: string, databaseName?: string) => Promise<any>
    }
}) => Promise<unknown>

const exec = async (cmd: string, options: execa.Options = {}) => {
    await execa.command(cmd, {
        cwd: testProjectPath,
        stdio: 'inherit',
        extendEnv: false,
        ...options
    })
    await new Promise((resolve) => setTimeout(resolve, 1000))
}

const rays = (cmd: string) => exec(`npx rays ${cmd}`)

const setSchema = (modelsSchema: string): string => {

    const schemaPath = path.join(testProjectPath, 'prisma', 'schema.prisma')

    const schema = `
    generator client {
      provider = "prisma-client-js"
    }
    
    datasource db {
      provider = "${ process.env.TEST_PROVIDER || 'postgresql' }"
      url      = env("DATABASE_URL")
      ${ process.env.TEST_SHADOW_DATABASE_URL ? 'shadowDatabaseUrl = env("SHADOW_DATABASE_URL")' : '' }
    }
    
    ${modelsSchema}
    `
    if (!fs.existsSync(path.join(testProjectPath, 'prisma'))) {
        fs.mkdirSync(path.join(testProjectPath, 'prisma'))
    }

    fs.writeFileSync(schemaPath, schema)

    return schema
}

const setEnv = (env: { [k: string]: string} ): string => {
    const envPath = path.join(testProjectPath, '.env')
    const envData = Object.entries(env).map(([k, v]) => `${k}="${v}"`).join('\n')
    fs.writeFileSync(envPath, envData)
    return envData
}

type TestKitOptions = {
    init: boolean
    prepare: boolean,
    env: { [k: string]: string },
}

const defaultTestkitOptions: TestKitOptions = {
    init: true,
    prepare: true,
    env: {
        PROVIDER: process.env.TEST_PROVIDER || "postgresql",
        DATABASE_URL: process.env.TEST_DATABASE_URL || "postgresql://postgres:root@localhost:5432/raystest?schema=public",
    },
}

if (process.env.TEST_SHADOW_DATABASE_URL) {
    defaultTestkitOptions.env.SHADOW_DATABASE_URL = process.env.TEST_SHADOW_DATABASE_URL
}

export const withSchema = (
    _options: { schema: string} & Partial<TestKitOptions>,
    testFn: TestFunction
) => {
    return async (): Promise<unknown> => {

        const testOptions: TestKitOptions = {
            ...defaultTestkitOptions,
            ..._options
        }

        setEnv(testOptions.env)
        setSchema(_options.schema)

        // delete previously created config file
        if (fs.existsSync(topology.raysconfig)) {
            fs.rmSync(topology.raysconfig)
        }

        const engine = engineProvider.engineFor(testOptions.env.DATABASE_URL)

        const dbTopology = {
            schemaPath: topology.schema,
        }

        if (engine.isDatabaseOnFile) {
            fs.copyFileSync(
                path.resolve('test','test-project','database.template.db'),
                engine.getDatabaseFilesPath(testOptions.env.DATABASE_URL, dbTopology).db
            )
        }

        if (testOptions.init) {
            await rays('init')

            // set database url for test
            fs.writeFileSync(topology.raysconfig, fs.readFileSync(topology.raysconfig, UTF8)
                .replace(
                /databaseUrl: '.+',/g,
                `databaseUrl: '${testOptions.env.DATABASE_URL}',`))

            // set verbose logging for test
            fs.writeFileSync(topology.raysconfig, fs.readFileSync(topology.raysconfig, UTF8)
                .replace(
                    /verboseLogging: .+,/g,
                    `verboseLogging: ${process.env.VERBOSE_LOGGING || 'false'},`))

            if (process.env.TEST_SHADOW_DATABASE_NAME) {
                // set shadow database name for test
                fs.writeFileSync(topology.raysconfig, fs.readFileSync(topology.raysconfig, UTF8)
                    .replace(
                        /shadowDatabaseName: .+,/g,
                        `shadowDatabaseName: '${process.env.TEST_SHADOW_DATABASE_NAME}',`))
            }

            if (testOptions.prepare) {
                if (fs.existsSync(topology.migrationsDir)) {
                    fs.rmdirSync(topology.migrationsDir, {recursive: true})
                }

                await exec(`npx prisma db push --force-reset --accept-data-loss`)
                await rays('prepare --y')
            }
        }

        const databaseName = engine.getDatabaseName(testOptions.env.DATABASE_URL)
        const queryBuilder = engine.queryBuilderFactory(testOptions.env.DATABASE_URL)

        const databaseConnectionProvider = (_databaseName: string) =>
            engine.createConnection(_databaseName === databaseName ? testOptions.env.DATABASE_URL : engine.makeUrlForDatabase(testOptions.env.DATABASE_URL, _databaseName), {
                log: () => {},
                warn: console.warn,
                error: console.error,
                info: () => {},
                query: () => {},
            }, dbTopology)

        return testFn({
            rays,
            setSchema,
            topology,
            exec,
            queryBuilder,
            shadowDatabaseName: process.env.TEST_SHADOW_DATABASE_NAME,
            raw: {
                query: async (command: string, _databaseName: string = databaseName): Promise<any> => {
                    const client = await databaseConnectionProvider(_databaseName)
                    try {
                        const res = await client.query(command)
                        await client.disconnect()
                        return res
                    } catch (e) {
                        await client.disconnect()
                        throw e
                    }
                },
                execute: async (command: string, _databaseName: string = databaseName): Promise<any> => {
                    const client = await databaseConnectionProvider(_databaseName)
                    try {
                        const res = await client.execute(command)
                        await client.disconnect()
                        return res
                    } catch (e) {
                        await client.disconnect()
                        throw e
                    }
                }
            }
        })
    }
}

export const verifyMigrationFiles = (name: string) => {
    expect(fs.existsSync(path.join(topology.migrationsDir, name, 'migration.js'))).toEqual(true)
    expect(fs.existsSync(path.join(topology.migrationsDir, name, 'migration.schema.prisma'))).toEqual(true)
    expect(fs.existsSync(path.join(topology.migrationsDir, name, 'migration.sql'))).toEqual(true)

    const migrationScript = require(path.join(topology.migrationsDir, name, 'migration.js'))
    expect(Array.isArray(migrationScript)).toEqual(true)
    if (migrationScript.length > 0) {
        expect(Array.isArray(migrationScript[0])).toEqual(true)
        expect(migrationScript[0].find((fn: any) => !_.isFunction(fn))).not.toBeDefined()
    }
}

export const getMigrationsDirs = (): string[] => {
    return fs.readdirSync(topology.migrationsDir)
        .filter((migration) => fs.statSync(path.join(topology.migrationsDir, migration)).isDirectory())
        .sort()
}
