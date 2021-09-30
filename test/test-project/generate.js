const fs = require('fs')
const path = require('path')

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma')

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
