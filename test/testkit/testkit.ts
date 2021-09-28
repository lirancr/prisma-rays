import * as path from 'path'
import * as fs from 'fs'
import execa from 'execa'
import {ChildProcess} from "child_process";

const testProjectPath = path.join(__dirname, '..', 'test-project')

type TestFunction = (testkit: {
    plens: (cmd: string) => ChildProcess,
    setSchema: (modelsSchema: string) => string,
    testProjectPath: string,
}) => Promise<unknown>

export const plens = (cmd: string) => execa(`npx plens ${cmd}`)

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

const defaultEnv = {
    DATABASE_URL: "postgresql://postgres:root@localhost:5432/plenstest?schema=public"
}

export const withSchema = (
    options: {
        schema: string,
        env?: { [k: string]: string },
        dontInit?: boolean
    },
    testFn: TestFunction
): () => ReturnType<TestFunction> => {
    setEnv(options.env || defaultEnv)
    setSchema(options.schema)

    // delete previously created config file
    const configFilePath = path.join(testProjectPath, 'lensconfig.js')
    if (fs.existsSync(configFilePath)) {
        fs.rmSync(configFilePath)
    }

    if (!options.dontInit) {
        plens('init')
    }

    return () => testFn({ plens, setSchema, testProjectPath })
}

