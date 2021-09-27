import type { LensConfig } from './types'
import * as path from 'path'
import * as fs from 'fs'
import {PrismaClient} from "@prisma/client"
import processArguments from './processArguments'
import { DEFAULT_CONFIG_FILE_NAME, UTF8, ALLOWED_ENGINES } from './constants'
import { getDatabaseUrlEnvVarNameFromSchema, getDatabaseEngineFromSchema } from './utils'

const configError = (msg: string) => {
	throw new Error('LensConfigError: ' + msg);
}

const verifyMigrationsDir = ({ migrationsDir }: LensConfig) => {
	if (!migrationsDir) {
		configError('Missing config value for migrationsDir')
	}

	const resolved = path.resolve(migrationsDir)
	if (!fs.existsSync(resolved)) {
		configError('Bad migrationsDir value, directory doesn\'t exists: '+resolved)
	}
}

const verifySchemaPath = ({ schemaPath }: LensConfig) => {
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
			'  provider = "postgresql"',
			'  url      = env("DATABASE_URL")',
			'}'
		]
		configError('Bad prisma schema file, your schema must use an environment variable to acquire the database url. e.g:\n'+demoSnippet.join('\n'))
	}

	const dbProvider = getDatabaseEngineFromSchema(schema)
	if (!ALLOWED_ENGINES.includes(dbProvider!)) {
		configError('Bad prisma schema file, your schema specifies an unsupported database provider: "'+dbProvider +'", must be one of '+ALLOWED_ENGINES.join(', '))
	}
}

const verifyDatabaseUrl = async ({ databaseUrl }: LensConfig) => {
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
		configError('Bad databaseUrl value, unable to connect to database:\n' + e.message)
	}
}

export default async (): Promise<void> => {
	const configFilePath = path.resolve(processArguments().conf || DEFAULT_CONFIG_FILE_NAME)
	if (!fs.existsSync(configFilePath)) {
		throw new Error(`Cannot file config file at: configFilePath\nDid you forget to run "npx plens init" ?`)
	}

	const config: LensConfig = require(configFilePath)

	await verifyMigrationsDir(config)
	await verifySchemaPath(config)
	await verifyDatabaseUrl(config)
}
