import * as fs from 'fs'
import {withSchema} from "./testkit/testkit";
import type {LensConfig} from "../src/types";

const schema = ``

describe('Init', () => {
    test('Create lensconfig', withSchema({ schema, init: false },
        async ({ plens, topology: { lensconfig } }) =>{
            // delete previously created config file
            if (fs.existsSync(lensconfig)) {
                fs.rmSync(lensconfig)
            }

            expect(fs.existsSync(lensconfig)).toBe(false)
            await plens('init')
            expect(fs.existsSync(lensconfig)).toBe(true)
    }))

    test('lensconfig module exports', withSchema({ schema, init: false },
        async ({ plens, topology: { lensconfig } }) =>{
            // delete previously created config file
            if (fs.existsSync(lensconfig)) {
                fs.rmSync(lensconfig)
            }

            await plens('init')
            const lensConfig: LensConfig = require(lensconfig)

            expect(lensConfig).toEqual({
                migrationsDir: expect.any(String),
                schemaPath: expect.any(String),
                databaseUrl: expect.any(String),
                verboseLogging: expect.any(Boolean),
            })
        }))
})
