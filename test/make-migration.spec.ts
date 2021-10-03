import * as path from 'path'
import * as fs from 'fs'
import {getMigrationsDirs, verifyMigrationFiles, withSchema} from "./testkit/testkit"
import {PRISMA_MIGRATIONS_TABLE, UTF8} from "../src/constants";

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

describe('MakeMigration', () => {
    test('Create single migration file', withSchema({schema},
        async ({rays, topology: {migrationsDir, schema}, setSchema, raw, queryBuilder, shadowDatabaseName}) => {

            await raw.execute(queryBuilder.insertInto('User', { firstname: 'John' }))

            expect((await raw.query(queryBuilder.selectAllFrom('User')) as any[])[0]).toEqual({
                id: expect.any(Number),
                firstname: 'John',
            })

            setSchema(updatedSchema)

            await rays(`makemigration --name second`)

            // ensure migration creation
            const migrationDirectories = getMigrationsDirs()

            expect(migrationDirectories.length).toEqual(2)
            expect(migrationDirectories[1]).toMatch(/[0-9]+_second/)

            const newMigration = migrationDirectories[1]
            verifyMigrationFiles(newMigration)

            const currentSchema = fs.readFileSync(schema, UTF8)
            const schemaBackup = fs.readFileSync(path.join(migrationsDir, newMigration, 'migration.schema.prisma'), UTF8)
            expect(currentSchema).toEqual(schemaBackup)

            // ensure it's not applied
            expect((await raw.query(queryBuilder.selectAllFrom('User')) as any[])[0]).toEqual({
                id: expect.any(Number),
                firstname: 'John',
            })

            if (shadowDatabaseName) {
                // ensure shadow database is reset after creating migration files
                const tables = await raw.query(queryBuilder.selectAllTables(shadowDatabaseName), shadowDatabaseName) as { tablename: string }[]
                expect(tables).toEqual([])
            }

            const migrations: any[] = (await raw.query(queryBuilder.selectAllFrom(PRISMA_MIGRATIONS_TABLE)) as any[])
                .map(m => m.migration_name)
                .sort()
            expect(migrations.length).toEqual(1)
            expect(migrations[0]).not.toMatch(/[0-9]+_second/)
        }))

    test('Create non-blank migration file when changes detected and blank option given', withSchema({schema},
        async ({rays, topology: {migrationsDir}, setSchema}) => {
            setSchema(updatedSchema)

            await rays(`makemigration --name second --blank`)

            // ensure migration creation
            const migrationDirectories = getMigrationsDirs()

            const newMigration = migrationDirectories[1]

            const migrationSQL = fs.readFileSync(path.join(migrationsDir, newMigration, 'migration.sql'), UTF8)
            expect(migrationSQL).not.toEqual('-- This is an empty migration.')
        }))

    test('Create multiple migration files without applying', withSchema({schema},
        async ({rays, topology: {migrationsDir, schema}, setSchema, raw, queryBuilder}) => {

            await raw.execute(queryBuilder.insertInto('User', { firstname: 'John' }))

            expect((await raw.query(queryBuilder.selectAllFrom('User')) as any[])[0]).toEqual({
                id: expect.any(Number),
                firstname: 'John',
            })

            setSchema(updatedSchema)

            await rays(`makemigration --name second`)

            setSchema(updatedSchema2)

            await rays(`makemigration --name third`)

            // ensure migration creation
            const migrationDirectories = getMigrationsDirs()

            expect(migrationDirectories.length).toEqual(3)
            expect(migrationDirectories[1]).toMatch(/[0-9]+_second/)
            expect(migrationDirectories[2]).toMatch(/[0-9]+_third/)

            verifyMigrationFiles(migrationDirectories[1])

            const newMigration = migrationDirectories[2]
            verifyMigrationFiles(newMigration)

            const currentSchema = fs.readFileSync(schema, UTF8)
            const schemaBackup = fs.readFileSync(path.join(migrationsDir, newMigration, 'migration.schema.prisma'), UTF8)
            expect(currentSchema).toEqual(schemaBackup)

            // ensure it's not applied
            expect((await raw.query(queryBuilder.selectAllFrom('User')) as any[])[0]).toEqual({
                id: expect.any(Number),
                firstname: 'John',
            })

            const migrations: any[] = (await raw.query(queryBuilder.selectAllFrom(PRISMA_MIGRATIONS_TABLE)) as any[])
                .map(m => m.migration_name)
                .sort()
            expect(migrations.length).toEqual(1)
            expect(migrations[0]).not.toMatch(/[0-9]+_second/)
            expect(migrations[0]).not.toMatch(/[0-9]+_third/)
        }))

    test('Create blank migration file when no changes detected with blank option', withSchema({schema},
        async ({rays, topology: {migrationsDir, schema}, raw, queryBuilder}) => {
            await rays(`makemigration --name second --blank`)

            // ensure migration creation
            const migrationDirectories = getMigrationsDirs()

            expect(migrationDirectories.length).toEqual(2)
            expect(migrationDirectories[1]).toMatch(/[0-9]+_second/)

            const newMigration = migrationDirectories[1]
            verifyMigrationFiles(newMigration)

            const currentSchema = fs.readFileSync(schema, UTF8)
            const schemaBackup = fs.readFileSync(path.join(migrationsDir, newMigration, 'migration.schema.prisma'), UTF8)
            expect(currentSchema).toEqual(schemaBackup)

            const blankSQL = fs.readFileSync(path.join(migrationsDir, newMigration, 'migration.sql'), UTF8)
            expect(blankSQL).toEqual('-- This is an empty migration.')

            // ensure it's not applied
            const migrations: any[] = (await raw.query(queryBuilder.selectAllFrom(PRISMA_MIGRATIONS_TABLE)) as any[])
                .map(m => m.migration_name)
                .sort()
            expect(migrations.length).toEqual(1)
            expect(migrations[0]).not.toMatch(/[0-9]+_second/)
        }))

    test('Do nothing when no changes detected without blank option', withSchema({schema},
        async ({rays}) => {
            await rays(`makemigration --name second`)

            // ensure migration not created
            const migrationDirectories = getMigrationsDirs()

            expect(migrationDirectories.length).toEqual(1)
            expect(migrationDirectories[0]).not.toMatch(/[0-9]+_second/)
        }))
})
