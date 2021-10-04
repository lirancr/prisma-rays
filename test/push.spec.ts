import {withSchema} from "./testkit/testkit"

const schema = `
model User {
  id        Int      @id @default(autoincrement())
  firstname      String
  lastname      String? @default("Doe")
  initials      String? @default("JD")
}`

const updatedSchema = `
model User {
  id        Int      @id @default(autoincrement())
  firstname      String
}`

describe('Push', () => {
    test('Overwrite database structure', withSchema({schema},
        async ({rays, setSchema, raw, queryBuilder}) => {

            await raw.execute(queryBuilder.insertInto('User', { firstname: 'John' }))

            expect((await raw.query(queryBuilder.selectAllFrom('User')) as any[])[0]).toEqual({
                id: expect.any(Number),
                firstname: 'John',
                lastname: 'Doe',
                initials: 'JD'
            })

            setSchema(updatedSchema)

            await rays(`push --y`)

            await raw.execute(queryBuilder.insertInto('User', { firstname: 'John' }))

            expect((await raw.query(queryBuilder.selectAllFrom('User')) as any[])[0]).toEqual({
                id: expect.any(Number),
                firstname: 'John',
            })
        }))
})
