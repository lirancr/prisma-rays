import * as fs from 'fs'
import {withSchema} from "./testkit/testkit"

const schema = `
model Post {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  updatedAt DateTime
  title     String   @db.VarChar(255)
  content   String?
  published Boolean  @default(false)
  authorId  Int
  User      User     @relation(fields: [authorId], references: [id])
}

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
  Post      Post[]
  Profile   Profile?
}
`

describe('Prepare', () => {

    test('Create tables, migration & run migration', withSchema({ schema, prepare: false },
        async ({ plens, topology: { migrationsDir }, prismaClientProvider, exec }) => {
            if (fs.existsSync(migrationsDir)) {
                fs.rmdirSync(migrationsDir, {recursive: true})
            }

            await exec(`npx prisma db push --force-reset --accept-data-loss --skip-generate`)
            await plens('prepare --y')
            const prismaClient = prismaClientProvider()

            // create tables
            expect(await prismaClient.$queryRaw`SELECT * FROM public."Post"`).toEqual([])
            expect(await prismaClient.$queryRaw`SELECT * FROM public."User"`).toEqual([])
            expect(await prismaClient.$queryRaw`SELECT * FROM public."Profile"`).toEqual([])

            const migrations: any[] = await prismaClient.$queryRaw`SELECT * FROM public._prisma_migrations`
            expect(migrations.length).toEqual(1)
            expect(migrations[0].migration_name).toMatch(/[0-9]+_init/)
    }))

    test('Fail if migrations dir not empty', withSchema({ schema, prepare: false },
        async ({ plens, topology: { migrationsDir }, exec }) => {
            expect(fs.existsSync(migrationsDir)).toEqual(true)
            expect(fs.readdirSync(migrationsDir).length).toBeGreaterThanOrEqual(1)

            let failed = false
            await exec(`npx prisma db push`)
            try {
                await plens('prepare --y')
            } catch (e) {
                failed = true
            }

            expect(failed).toEqual(true)
        }))
})
