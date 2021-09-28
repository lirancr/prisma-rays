import * as path from 'path'
import * as fs from 'fs'
import execa from 'execa'
import {UTF8} from "../../src/constants";
import { PrismaClient } from '@prisma/client'

const testProjectPath = path.join(__dirname, '..', 'test-project')

type TestFunction = (testkit: {
    exec: (cmd: string, options?: execa.Options) => execa.ExecaChildProcess<string>,
    plens: (cmd: string) => execa.ExecaChildProcess<string>,
    setSchema: (modelsSchema: string) => string,
    testProjectPath: string,
    prismaClientProvider: () => PrismaClient,
}) => Promise<unknown>

const exec = (cmd: string, options: execa.Options = {}) => execa.command(cmd, {
    cwd: testProjectPath,
    stderr: 'inherit',
    stdout: 'inherit',
    stdin: 'inherit',
    ...options
})

export const plens = (cmd: string) => exec(`npx plens ${cmd}`)

export const setSchema = (modelsSchema: string): string => {

    const schemaPath = path.join(testProjectPath, 'prisma', 'schema.prisma')

    const schema = `
    generator client {
      provider = "prisma-client-js"
    }
    
    datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL")
    }
    
    ${modelsSchema}
    `
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
    env: { [k: string]: string},
}

const defaultTestkitOptions: TestKitOptions = {
    init: true,
    prepare: true,
    env: {
        DATABASE_URL: "postgresql://postgres:root@localhost:5432/plenstest?schema=public"
    },
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
        const configFilePath = path.join(testProjectPath, 'lensconfig.js')
        if (fs.existsSync(configFilePath)) {
            fs.rmSync(configFilePath)
        }

        if (testOptions.init) {
            await plens('init')

            // set database url for test
            fs.writeFileSync(configFilePath, fs.readFileSync(configFilePath, UTF8)
                .replace(
                `databaseUrl: 'postgresql://postgres:username@dbhost:port/dbname?schema=public',`,
                `databaseUrl: '${testOptions.env.DATABASE_URL}',`))

            if (testOptions.prepare) {
                const migrationsDirPath = path.join(testProjectPath, 'prisma', 'migrations')
                if (fs.existsSync(migrationsDirPath)) {
                    fs.rmdirSync(migrationsDirPath, {recursive: true})
                }

                await exec(`npx prisma db push`)
                await plens('prepare --y')
            }
        }

        const prismaClientProvider = () => new PrismaClient({
            log: ['warn', 'error'],
            datasources: {
                db: {
                    url: testOptions.env.DATABASE_URL
                }
            }
        })

        return testFn({plens, setSchema, testProjectPath, prismaClientProvider, exec})
    }
}

