import * as path from 'path'
import * as fs from 'fs'
import {withSchema} from "./testkit/testkit";
import type {LensConfig} from "../src/types";

const schema = ``

describe('Init', () => {
    test('Create lensconfig', withSchema({ schema, init: true },
        async ({ plens, testProjectPath }) =>{
            const lensconfigPath = path.join(testProjectPath, 'lensconfig.js')
            // delete previously created config file
            if (fs.existsSync(lensconfigPath)) {
                fs.rmSync(lensconfigPath)
            }

            expect(fs.existsSync(lensconfigPath)).toBe(false)
            await plens('init')
            expect(fs.existsSync(lensconfigPath)).toBe(true)
    }))

    test('lensconfig module exports', withSchema({ schema, init: true },
        async ({ plens, testProjectPath }) =>{
            const lensconfigPath = path.join(testProjectPath, 'lensconfig.js')
            // delete previously created config file
            if (fs.existsSync(lensconfigPath)) {
                fs.rmSync(lensconfigPath)
            }

            await plens('init')
            const lensConfig: LensConfig = require(lensconfigPath)

            expect(lensConfig).toEqual({
                migrationsDir: expect.any(String),
                schemaPath: expect.any(String),
                databaseUrl: expect.any(String),
                verboseLogging: expect.any(Boolean),
            })
        }))
})
