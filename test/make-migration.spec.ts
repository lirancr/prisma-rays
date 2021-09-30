import * as path from 'path'
import * as fs from 'fs'
import {getMigrationsDirs, verifyMigrationFiles, withSchema} from "./testkit/testkit"
import {UTF8} from "../src/constants";

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
        async ({plens, topology: {migrationsDir, schema}, prismaClientProvider, setSchema}) => {
            const prismaClient = prismaClientProvider()

            await prismaClient.$executeRaw`INSERT INTO public."User" (firstname) VALUES ('John')`

            expect((await prismaClient.$queryRaw`SELECT * FROM public."User"` as any[])[0]).toEqual({
                id: expect.any(Number),
                firstname: 'John',
            })

            setSchema(updatedSchema)

            await plens(`makemigration --name second`)

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
            expect((await prismaClient.$queryRaw`SELECT * FROM public."User"` as any[])[0]).toEqual({
                id: expect.any(Number),
                firstname: 'John',
            })

            const migrations: any[] = (await prismaClient.$queryRaw`SELECT * FROM public._prisma_migrations` as any[])
                .map(m => m.migration_name)
                .sort()
            expect(migrations.length).toEqual(1)
            expect(migrations[0]).not.toMatch(/[0-9]+_second/)
        }))

    test('Create non-blank migration file when changes detected and blank option given', withSchema({schema},
        async ({plens, topology: {migrationsDir}, setSchema}) => {
            setSchema(updatedSchema)

            await plens(`makemigration --name second --blank`)

            // ensure migration creation
            const migrationDirectories = getMigrationsDirs()

            const newMigration = migrationDirectories[1]

            const migrationSQL = fs.readFileSync(path.join(migrationsDir, newMigration, 'migration.sql'), UTF8)
            expect(migrationSQL).not.toEqual('-- This is an empty migration.')
        }))

    test('Create multiple migration files without applying', withSchema({schema},
        async ({plens, topology: {migrationsDir, schema}, prismaClientProvider, setSchema}) => {
            const prismaClient = prismaClientProvider()

            await prismaClient.$executeRaw`INSERT INTO public."User" (firstname) VALUES ('John')`

            expect((await prismaClient.$queryRaw`SELECT * FROM public."User"` as any[])[0]).toEqual({
                id: expect.any(Number),
                firstname: 'John',
            })

            setSchema(updatedSchema)

            await plens(`makemigration --name second`)

            setSchema(updatedSchema2)

            await plens(`makemigration --name third`)

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
            expect((await prismaClient.$queryRaw`SELECT * FROM public."User"` as any[])[0]).toEqual({
                id: expect.any(Number),
                firstname: 'John',
            })

            const migrations: any[] = (await prismaClient.$queryRaw`SELECT * FROM public._prisma_migrations` as any[])
                .map(m => m.migration_name)
                .sort()
            expect(migrations.length).toEqual(1)
            expect(migrations[0]).not.toMatch(/[0-9]+_second/)
            expect(migrations[0]).not.toMatch(/[0-9]+_third/)
        }))

    test('Create blank migration file when no changes detected with blank option', withSchema({schema},
        async ({plens, topology: {migrationsDir, schema}, prismaClientProvider}) => {
            await plens(`makemigration --name second --blank`)

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
            const prismaClient = prismaClientProvider()
            const migrations: any[] = (await prismaClient.$queryRaw`SELECT * FROM public._prisma_migrations` as any[])
                .map(m => m.migration_name)
                .sort()
            expect(migrations.length).toEqual(1)
            expect(migrations[0]).not.toMatch(/[0-9]+_second/)
        }))

    test('Do nothing when no changes detected without blank option', withSchema({schema},
        async ({plens}) => {
            await plens(`makemigration --name second`)

            // ensure migration not created
            const migrationDirectories = getMigrationsDirs()

            expect(migrationDirectories.length).toEqual(1)
            expect(migrationDirectories[0]).not.toMatch(/[0-9]+_second/)
        }))
})
