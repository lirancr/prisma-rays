import type {IEngine} from "../../src/types";

const engine: IEngine = require('../../src/engines/sqlite')

const urlVariants = [
    'file://./my/dir/raystest.db',
    'file://./my/dir/raystest',
    'file://./my/dir/raystest.sqlite',
    'file://./../dir/raystest.db',
    'file://./../dir/raystest',
    'file://./../dir/raystest.sqlite',
]

describe('SQLite engine', () => {
    test('should match database urls', () => {
        expect(urlVariants.map(engine.isEngineForUrl)).not.toContain(false)
    })

    test('should create query builder', () => {
        expect(urlVariants.map((url) => {
            try {
                return engine.queryBuilderFactory(url)
            } catch (e) {
                return null
            }
        })).not.toContain(null)
    })

    test('should create database urls', () => {
        const testdb = 'testdb'

        expect(urlVariants.map((url) => {
            try {
                return engine.makeUrlForDatabase(url, testdb)
            } catch (e) {
                return null
            }
        })).toEqual(urlVariants.map((url) =>
            url.replace('raystest', testdb)))
    })

    test('should get database name', () => {
        expect(urlVariants.map((url) => {
            try {
                return engine.getDatabaseName(url)
            } catch (e) {
                return null
            }
        })).toEqual(urlVariants.map(() => 'raystest'))
    })
})
