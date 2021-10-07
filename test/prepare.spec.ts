import * as fs from 'fs'
import * as path from 'path'
import {withSchema} from "./testkit/testkit"
import {PRISMA_MIGRATIONS_TABLE} from "../src/constants";

const schema = `
model Profile {
  id     Int     @id @default(autoincrement())
  bio    String?
  userId Int     @unique
  User   User    @relation(fields: [userId], references: [id])
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  Profile   Profile?
}
`

describe('Prepare', () => {

    test('Create tables, migration & run migration', withSchema({ schema, prepare: false },
        async ({ rays, topology: { migrationsDir }, exec, raw, queryBuilder }) => {
            if (fs.existsSync(migrationsDir)) {
                fs.rmdirSync(migrationsDir, {recursive: true})
            }

            await exec(`npx prisma db push --force-reset --accept-data-loss`)
            await rays('prepare --y')

            // create tables
            expect(await raw.query(queryBuilder.selectAllFrom('User'))).toEqual([])
            expect(await raw.query(queryBuilder.selectAllFrom('Profile'))).toEqual([])

            const migrations: any[] = await raw.query(queryBuilder.selectAllFrom(PRISMA_MIGRATIONS_TABLE))
            expect(migrations.length).toEqual(1)
            expect(migrations[0].migration_name).toMatch(/[0-9]+_init/)
    }))

    test('Fail if migrations dir not empty', withSchema({ schema, prepare: false },
        async ({ rays, topology: { migrationsDir }, exec }) => {
            if (!fs.existsSync(migrationsDir)) {
                fs.mkdirSync(migrationsDir)
            }
            fs.mkdirSync(path.join(migrationsDir, 'dummy_migration'))

            expect(fs.readdirSync(migrationsDir).length).toBeGreaterThanOrEqual(1)

            let failed = false
            await exec(`npx prisma db push`)
            try {
                await rays('prepare --y')
            } catch (e) {
                failed = true
            }

            expect(failed).toEqual(true)
        }))
})
