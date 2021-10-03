import type {IEngine} from "../../src/types";

const engine: IEngine = require('../../src/engines/postgresql')

const urlVariants = [
    'postgres://user:pass@localhost:5432/raystest?schema=public',
    'postgresql://user:pass@localhost:8888/raystest?schema=omega',
    'postgresql://user:pass@localhost:2345/raystest',
    'postgres://user:pass@localhost:5432/raystest',
    'postgres://user@localhost:5432/raystest?schema=public',
    'postgresql://user@localhost:8888/raystest?schema=omega',
    'postgresql://user@localhost:2345/raystest',
    'postgres://user:pass@localhost:5432/raystest',
]

describe('PostgreSQL engine', () => {
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
