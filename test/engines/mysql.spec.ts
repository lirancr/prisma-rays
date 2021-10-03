import type {IEngine} from "../../src/types";

const engine: IEngine = require('../../src/engines/mysql')

const urlVariants = [
    'mysql://johndoe:pass@mysql–instance1.123456789012.us-east-1.rds.amazonaws.com:3306/raystest',
    'mysql://johndoe:pass@host:3306/raystest',
    'mysql://johndoe@host:3306/raystest',
]

describe('MySQL engine', () => {
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
