/**
 * A database engine in PrismaLens terms is an abstraction layer between prisma lens and the specific database implementations.
 * This way PrismaLens function, using execRaw/queryRaw without taking into account which database type it is.
 *
 * all engines should be placed in ./engines and be named according to their prisma name (i.e the provider set in
 * the prisma schema file).
 *
 * When changing one engine you must change them all!
 */

import type {IEngine} from './types'
import * as fs from 'fs'
import * as path from 'path'

const enginesDir: string = path.join(__dirname, 'engines')

export const ALLOWED_ENGINES = fs.readdirSync(enginesDir)
	.map((file: string) => file.split('.')[0])

const engines: IEngine[] = ALLOWED_ENGINES.map((engine: string) => require(path.join(enginesDir, engine)))

export const engineFor = (databaseUrl: string): IEngine => {
	const engine = engines.find(engine => engine.isEngineForUrl(databaseUrl))
	if (!engine) {
		throw new Error('Unknown engine for url :'+databaseUrl)
	}
	return engine
}
