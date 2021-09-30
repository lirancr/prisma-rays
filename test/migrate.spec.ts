import * as fs from 'fs'
import * as path from 'path'
import {getMigrationsDirs, TestFunction, withSchema} from "./testkit/testkit"
import type {PrismaClient} from "@prisma/client";
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

const prepareTestEnvironment: TestFunction = async ({ prismaClientProvider, setSchema, plens }) => {
    const prismaClient = prismaClientProvider()
    await prismaClient.$executeRaw`INSERT INTO public."User" (firstname) VALUES ('John')`

    setSchema(updatedSchema)
    await plens('makemigration --name second')

    setSchema(updatedSchema2)
    await plens('makemigration --name third')
}

const getUserRecord = async (prismaClientProvider: () => PrismaClient) => {
    const prismaClient = prismaClientProvider()
    return (await prismaClient.$queryRaw`SELECT * FROM public."User"` as any[])[0]
}

describe('Migrate', () => {
    test('Migrate to top', withSchema({ schema },
        async (args) => {
            await prepareTestEnvironment(args)
            const { plens, prismaClientProvider, topology: { migrationsDir, schema } } = args

            await plens('migrate')

            const migrations = getMigrationsDirs()

            // ensure schema's are aligned
            const currentSchema = fs.readFileSync(schema, UTF8)
            const migrationSchema = fs.readFileSync(path.join(migrationsDir, migrations[migrations.length - 1], 'migration.schema.prisma'), UTF8)
            expect(currentSchema).toEqual(migrationSchema)

            const appliedMigrations: string[] = (await prismaClientProvider().$queryRaw`SELECT * FROM public._prisma_migrations` as any[])
                .map(m => m.migration_name)

            expect(appliedMigrations).toEqual(migrations)

            expect(await getUserRecord(prismaClientProvider)).toEqual({
                id: expect.any(Number),
                firstname: 'John',
                lastname: 'Doe',
                initials: 'JD',
            })
        }))

    test('Migrate up to name', withSchema({ schema },
        async (args) => {
            await prepareTestEnvironment(args)
            const { plens, prismaClientProvider, topology: { migrationsDir, schema } } = args

            const migrations = getMigrationsDirs()

            await plens(`migrate --name ${ migrations[1] }`)

            // ensure schema's are aligned
            const currentSchema = fs.readFileSync(schema, UTF8)
            const migrationSchema = fs.readFileSync(path.join(migrationsDir, migrations[1], 'migration.schema.prisma'), UTF8)
            expect(currentSchema).toEqual(migrationSchema)

            const appliedMigrations: string[] = (await prismaClientProvider().$queryRaw`SELECT * FROM public._prisma_migrations` as any[])
                .map(m => m.migration_name)

            expect(appliedMigrations).toEqual(migrations.slice(0, 2))

            expect(await getUserRecord(prismaClientProvider)).toEqual({
                id: expect.any(Number),
                firstname: 'John',
                lastname: 'Doe',
            })
        }))

    test('Migrate down to name', withSchema({ schema },
        async (args) => {
            await prepareTestEnvironment(args)
            const { plens, prismaClientProvider, topology: { migrationsDir, schema } } = args

            await plens(`migrate`)

            expect(await getUserRecord(prismaClientProvider)).toEqual({
                id: expect.any(Number),
                firstname: 'John',
                lastname: 'Doe',
                initials: 'JD',
            })

            const migrations = getMigrationsDirs()

            await plens(`migrate --name ${ migrations[1] }`)

            // ensure schema's are aligned
            const currentSchema = fs.readFileSync(schema, UTF8)
            const migrationSchema = fs.readFileSync(path.join(migrationsDir, migrations[1], 'migration.schema.prisma'), UTF8)
            expect(currentSchema).toEqual(migrationSchema)

            const appliedMigrations: string[] = (await prismaClientProvider().$queryRaw`SELECT * FROM public._prisma_migrations` as any[])
                .map(m => m.migration_name)

            expect(appliedMigrations).toEqual(migrations.slice(0, 2))

            expect(await getUserRecord(prismaClientProvider)).toEqual({
                id: expect.any(Number),
                firstname: 'John',
                lastname: 'Doe',
            })
        }))

    test('Fake migration', withSchema({ schema },
        async (args) => {
            await prepareTestEnvironment(args)
            const { plens, prismaClientProvider, topology: { migrationsDir, schema } } = args

            await plens('migrate --fake')

            const migrations = getMigrationsDirs()

            // ensure schema's are aligned
            const currentSchema = fs.readFileSync(schema, UTF8)
            const migrationSchema = fs.readFileSync(path.join(migrationsDir, migrations[migrations.length - 1], 'migration.schema.prisma'), UTF8)
            expect(currentSchema).toEqual(migrationSchema)

            const appliedMigrations: string[] = (await prismaClientProvider().$queryRaw`SELECT * FROM public._prisma_migrations` as any[])
                .map(m => m.migration_name)

            expect(appliedMigrations).toEqual(migrations)

            expect(await getUserRecord(prismaClientProvider)).toEqual({
                id: expect.any(Number),
                firstname: 'John',
            })
        }))
})
