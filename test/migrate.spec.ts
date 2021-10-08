import * as fs from 'fs'
import * as path from 'path'
import {getMigrationsDirs, TestFunction, withSchema} from "./testkit/testkit"
import {ENGINE_PARAM_PLACEHOLDER, PRISMA_MIGRATIONS_TABLE, UTF8} from "../src/constants";

const schema = `
model User {
  id        Int      @id @default(autoincrement())
  firstname      String
}`

const updatedSchema = `
model User {
  id        Int      @id @default(autoincrement())
  firstname      String
  lastname      String? @default("Doe")
}`

const updatedSchema2 = `
model User {
  id        Int      @id @default(autoincrement())
  firstname      String
  lastname      String? @default("Doe")
  initials      String? @default("JD")
}`

const prepareTestEnvironment = async ({ setSchema, rays, raw, queryBuilder }: Parameters<TestFunction>[0]) => {
    await raw.execute(queryBuilder.insertInto('User', { firstname: 'John' }))

    setSchema(updatedSchema)
    await rays('makemigration --name second')

    setSchema(updatedSchema2)
    await rays('makemigration --name third')
}

const getUserRecord = async ({ raw, queryBuilder }: Parameters<TestFunction>[0]) => {
    return (await raw.query(queryBuilder.selectAllFrom('User')) as any[])[0]
}

describe('Migrate', () => {
    test('Migrate to top', withSchema({ schema },
        async (args) => {
            await prepareTestEnvironment(args)
            const { rays, topology: { migrationsDir, schema }, raw, queryBuilder } = args

            await rays('migrate')

            const migrations = getMigrationsDirs()

            // ensure schema's are aligned
            const currentSchema = fs.readFileSync(schema, UTF8)
            const migrationSchema = fs.readFileSync(path.join(migrationsDir, migrations[migrations.length - 1], 'migration.schema.prisma'), UTF8)
            expect(currentSchema).toEqual(migrationSchema)

            const appliedMigrations: string[] = (await raw.query(queryBuilder.selectAllFrom(PRISMA_MIGRATIONS_TABLE)) as any[])
                .map(m => m.migration_name)
                .sort()

            expect(appliedMigrations).toEqual(migrations)

            expect(await getUserRecord(args)).toEqual({
                id: expect.any(Number),
                firstname: 'John',
                lastname: 'Doe',
                initials: 'JD',
            })
        }))

    test('Migrate with data changes', withSchema({ schema },
        async (args) => {
            const { rays, topology: { migrationsDir }, raw, queryBuilder } = args

            await raw.execute(queryBuilder.insertInto('User', { firstname: 'John' }))

            await rays('makemigration --name second --blank')

            const migrations = getMigrationsDirs()

            // add data modification script to migration file
            const migrationScriptPath = path.join(migrationsDir, migrations[migrations.length - 1], 'migration.js')

            const updateQuery = queryBuilder.updateAll('User', {
                firstname: ENGINE_PARAM_PLACEHOLDER
            }).replace(`'${ENGINE_PARAM_PLACEHOLDER}'`, ENGINE_PARAM_PLACEHOLDER)

            fs.writeFileSync(migrationScriptPath,
                // language=js
                `module.exports = [
                    [
                        async ({ client }) => { await client.execute('${updateQuery}', ['Jeff']) },
                        async ({ client }) => { await client.execute('${updateQuery}', ['Failed']) }
                    ]
                ]`)

            await rays('migrate')

            // ensure migration was applied

            const appliedMigrations: string[] = (await raw.query(queryBuilder.selectAllFrom(PRISMA_MIGRATIONS_TABLE)) as any[])
                .map(m => m.migration_name)
                .sort()

            expect(appliedMigrations).toEqual(migrations)

            expect(await getUserRecord(args)).toEqual({
                id: expect.any(Number),
                firstname: 'Jeff',
            })
        }))

    test('Migrate up to name', withSchema({ schema },
        async (args) => {
            await prepareTestEnvironment(args)
            const { rays, topology: { migrationsDir, schema }, raw, queryBuilder } = args

            const migrations = getMigrationsDirs()

            await rays(`migrate --name ${ migrations[1] }`)

            // ensure schema's are aligned
            const currentSchema = fs.readFileSync(schema, UTF8)
            const migrationSchema = fs.readFileSync(path.join(migrationsDir, migrations[1], 'migration.schema.prisma'), UTF8)
            expect(currentSchema).toEqual(migrationSchema)

            const appliedMigrations: string[] = (await raw.query(queryBuilder.selectAllFrom(PRISMA_MIGRATIONS_TABLE)) as any[])
                .map(m => m.migration_name)
                .sort()

            expect(appliedMigrations).toEqual(migrations.slice(0, 2))

            expect(await getUserRecord(args)).toEqual({
                id: expect.any(Number),
                firstname: 'John',
                lastname: 'Doe',
            })
        }))

    test('Migrate down to name', withSchema({ schema },
        async (args) => {
            await prepareTestEnvironment(args)
            const { rays, topology: { migrationsDir, schema }, raw, queryBuilder } = args

            await rays(`migrate`)

            expect(await getUserRecord(args)).toEqual({
                id: expect.any(Number),
                firstname: 'John',
                lastname: 'Doe',
                initials: 'JD',
            })

            const migrations = getMigrationsDirs()

            await rays(`migrate --name ${ migrations[1] }`)

            // ensure schema's are aligned
            const currentSchema = fs.readFileSync(schema, UTF8)
            const migrationSchema = fs.readFileSync(path.join(migrationsDir, migrations[1], 'migration.schema.prisma'), UTF8)
            expect(currentSchema).toEqual(migrationSchema)

            const appliedMigrations: string[] = (await raw.query(queryBuilder.selectAllFrom(PRISMA_MIGRATIONS_TABLE)) as any[])
                .map(m => m.migration_name)
                .sort()

            expect(appliedMigrations).toEqual(migrations.slice(0, 2))

            expect(await getUserRecord(args)).toEqual({
                id: expect.any(Number),
                firstname: 'John',
                lastname: 'Doe',
            })
        }))

    test('Fake migration', withSchema({ schema },
        async (args) => {
            await prepareTestEnvironment(args)
            const { rays, topology: { migrationsDir, schema }, raw, queryBuilder } = args

            await rays('migrate --fake')

            const migrations = getMigrationsDirs()

            // ensure schema's are aligned
            const currentSchema = fs.readFileSync(schema, UTF8)
            const migrationSchema = fs.readFileSync(path.join(migrationsDir, migrations[migrations.length - 1], 'migration.schema.prisma'), UTF8)
            expect(currentSchema).toEqual(migrationSchema)

            const appliedMigrations: string[] = (await raw.query(queryBuilder.selectAllFrom(PRISMA_MIGRATIONS_TABLE)) as any[])
                .map(m => m.migration_name)
                .sort()

            expect(appliedMigrations).toEqual(migrations)

            expect(await getUserRecord(args)).toEqual({
                id: expect.any(Number),
                firstname: 'John',
            })
        }))

    test('Rollback failed migration operations', withSchema({ schema },
        async (args) => {

            const { rays, topology: { migrationsDir }, raw, queryBuilder } = args

            await raw.execute(queryBuilder.insertInto('User', { firstname: 'John' }))

            const migrationsBeforeMakeMigration = getMigrationsDirs()

            await rays('makemigration --name second --blank')

            const migrations = getMigrationsDirs()

            // add data modification script to migration file
            const migrationScriptPath = path.join(migrationsDir, migrations[migrations.length - 1], 'migration.js')

            const updateQuery = queryBuilder.updateAll('User', {
                firstname: ENGINE_PARAM_PLACEHOLDER
            }).replace(`'${ENGINE_PARAM_PLACEHOLDER}'`, ENGINE_PARAM_PLACEHOLDER)

            fs.writeFileSync(migrationScriptPath,
                // language=js
                `module.exports = [
                    [
                        async ({ client }) => { await client.execute('${updateQuery}', ['Jeff']) },
                        async ({ client }) => { await client.execute('${updateQuery}', ['Failed']) }
                    ],
                    [
                        async () => { throw new Error('failed')},
                        async () => {}
                    ]
                ]`)

            let failed = false
            try {
                await rays('migrate')
            } catch (e) {
                failed = true
            }

            expect(failed).toEqual(true)

            // ensure migration not applied
            const appliedMigrations: string[] = (await raw.query(queryBuilder.selectAllFrom(PRISMA_MIGRATIONS_TABLE)) as any[])
                .map(m => m.migration_name)
                .sort()

            expect(appliedMigrations).toEqual(migrationsBeforeMakeMigration)

            expect(await getUserRecord(args)).toEqual({
                id: expect.any(Number),
                firstname: 'Failed',
            })
        }))

    test('Rollback failed down migration operations', withSchema({ schema },
        async (args) => {

            const { rays, topology: { migrationsDir }, raw, queryBuilder } = args

            await raw.execute(queryBuilder.insertInto('User', { firstname: 'Jeff' }))

            await rays('makemigration --name second --blank')

            const migrations = getMigrationsDirs()

            // add data modification script to migration file
            const migrationScriptPath = path.join(migrationsDir, migrations[migrations.length - 1], 'migration.js')

            const updateQuery = queryBuilder.updateAll('User', {
                firstname: ENGINE_PARAM_PLACEHOLDER
            }).replace(`'${ENGINE_PARAM_PLACEHOLDER}'`, ENGINE_PARAM_PLACEHOLDER)

            fs.writeFileSync(migrationScriptPath,
                // language=js
                `module.exports = [
                    [
                        async () => {},
                        async () => { throw new Error('failed')}
                    ],
                    [
                        async ({ client }) => { await client.execute('${updateQuery}', ['John']) },
                        async ({ client }) => { await client.execute('${updateQuery}', ['Jeff']) }
                    ]
                ]`)

            await rays('migrate')

            expect(await getUserRecord(args)).toEqual({
                id: expect.any(Number),
                firstname: 'John',
            })

            let failed = false
            try {
                await rays('migrate --name ' + migrations[0])
            } catch (e) {
                failed = true
            }

            expect(failed).toEqual(true)

            // ensure reverse migration not applied
            const appliedMigrations: string[] = (await raw.query(queryBuilder.selectAllFrom(PRISMA_MIGRATIONS_TABLE)) as any[])
                .map(m => m.migration_name)
                .sort()

            expect(appliedMigrations).toEqual(migrations)

            expect(await getUserRecord(args)).toEqual({
                id: expect.any(Number),
                firstname: 'John',
            })
        }))
})
