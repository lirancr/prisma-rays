import * as fs from 'fs'
import {withSchema} from "./testkit/testkit";
import type {RaysConfig} from "../src/types";

const schema = ``

describe('Init', () => {
    test('Create raysconfig', withSchema({ schema, init: false },
        async ({ rays, topology: { raysconfig } }) =>{
            // delete previously created config file
            if (fs.existsSync(raysconfig)) {
                fs.rmSync(raysconfig)
            }

            expect(fs.existsSync(raysconfig)).toBe(false)
            await rays('init')
            expect(fs.existsSync(raysconfig)).toBe(true)
    }))

    test('raysconfig module exports', withSchema({ schema, init: false },
        async ({ rays, topology: { raysconfig } }) =>{
            // delete previously created config file
            if (fs.existsSync(raysconfig)) {
                fs.rmSync(raysconfig)
            }

            await rays('init')
            const raysConfig: RaysConfig = require(raysconfig)

            expect(raysConfig).toEqual({
                migrationsDir: expect.any(String),
                schemaPath: expect.any(String),
                databaseUrl: expect.any(String),
                shadowDatabaseName: null,
                verboseLogging: expect.any(Boolean),
            })
        }))
})
