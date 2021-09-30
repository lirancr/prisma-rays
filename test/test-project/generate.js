const fs = require('fs')
const path = require('path')

const prismaDir = path.join(__dirname, 'prisma')
const schemaPath = path.join(prismaDir, 'schema.prisma')

if (!fs.existsSync(prismaDir)) {
    fs.mkdirSync(prismaDir, { recursive: true })
}


const schema = `
    generator client {
      provider = "prisma-client-js"
    }
    
    datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL")
      shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
    }
    
    model User {
      id        Int      @id @default(autoincrement())
      name      String?
    }
`

fs.writeFileSync(schemaPath, schema)
