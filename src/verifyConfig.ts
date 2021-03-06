import type { RaysConfig } from './types'
import * as path from 'path'
import * as fs from 'fs'
import {PrismaClient} from "@prisma/client"
import processArguments from './processArguments'
import { DEFAULT_CONFIG_FILE_NAME, UTF8 } from './constants'
import { getDatabaseUrlEnvVarNameFromSchema, getDatabaseEngineFromSchema } from './utils'
import * as engineProvider from './engineProvider'

const configError = (msg: string) => {
	throw new Error('RaysConfigError: ' + msg);
}

const verifyMigrationsDir = ({ migrationsDir }: RaysConfig) => {
	if (!migrationsDir) {
		configError('Missing config value for migrationsDir')
	}
}

const verifySchemaPath = ({ schemaPath }: RaysConfig) => {
	if (!schemaPath) {
		configError('Missing config value for schemaPath')
	}

	const resolved = path.resolve(schemaPath)
	if (!fs.existsSync(resolved)) {
		configError(`Bad schemaPath value, file doesn\'t exists: ${resolved}`)
	}

	const schema = fs.readFileSync(resolved, UTF8)
	if (!getDatabaseUrlEnvVarNameFromSchema(schema)) {
		const demoSnippet = [
			'datasource db {',
			'  provider = "provider"',
			'  url      = env("DATABASE_URL")',
			'}'
		]
		configError('Bad prisma schema file, your schema must use an environment variable to acquire the database url. e.g:\n'+demoSnippet.join('\n'))
	}

	const dbProvider = getDatabaseEngineFromSchema(schema)
	if (!engineProvider.ALLOWED_ENGINES.includes(dbProvider!)) {
		configError('Bad prisma schema file, your schema specifies an unsupported database provider: "'+dbProvider +'", must be one of '+engineProvider.ALLOWED_ENGINES.join(', '))
	}
}

const verifyDatabaseUrl = async ({ databaseUrl }: RaysConfig) => {
	if (!databaseUrl) {
		configError('Missing config value for databaseUrl')
	}

	const prisma = new PrismaClient({
		datasources: {
			db: {
				url: databaseUrl
			}
		}
	})
	try {
		await prisma.$connect()
		await prisma.$disconnect()
	} catch (e: any) {
		configError('Bad databaseUrl value, unable to connect to database:\n' + databaseUrl + '\n' + e.message)
	}
}

const verifyShadowDatabaseName = async ({ shadowDatabaseName, databaseUrl }: RaysConfig) => {
	if (!shadowDatabaseName) {
		return
	}

	const url = engineProvider.engineFor(databaseUrl).makeUrlForDatabase(databaseUrl, shadowDatabaseName)

	const prisma = new PrismaClient({
		datasources: {
			db: {
				url,
			}
		}
	})
	try {
		await prisma.$connect()
		await prisma.$disconnect()
	} catch (e: any) {
		configError('Bad shadowDatabaseName value, unable to connect to database:\n' + url + '\n' + e.message)
	}
}

export default async (): Promise<void> => {
	const configFilePath = path.resolve(processArguments().conf || DEFAULT_CONFIG_FILE_NAME)
	if (!fs.existsSync(configFilePath)) {
		throw new Error(`Cannot file config file at: configFilePath\nDid you forget to run "npx rays init" ?`)
	}

	const config: RaysConfig = require(configFilePath)

	await verifyMigrationsDir(config)
	await verifySchemaPath(config)
	await verifyDatabaseUrl(config)
	await verifyShadowDatabaseName(config)
}
