/**
 * A database engine in PrismaLens terms is an object with functions which generate a valid SQL syntax
 * so PrismaLens can use it in execRaw/queryRaw without taking into account which database type it is.
 *
 * all engines should be placed in ./engines and be named according to their prisma name (i.e the provider set in
 * the prisma schema file).
 *
 * When changing one engine you must change them all!
 */

import type { IDatabaseEngine } from './types'
import { ALLOWED_ENGINES } from './constants'
import * as fs from 'fs'
import * as path from 'path'

type EnginesMap = { [provider: string]: IDatabaseEngine}

const enginesDir: string = path.join(__dirname, 'engines')

const engines: EnginesMap = fs.readdirSync(enginesDir).reduce((agg: EnginesMap, file: string) => {
	const provider = file.split('.js')[0]
	if (ALLOWED_ENGINES.includes(provider)) {
		agg[provider] = require(path.join(enginesDir, provider))
	} else {
		console.warn(`Detected unsupported database engine ${provider}, ignoring it.`)
	}
	return agg
}, {})

let functionsHash: string
// Make sure all supported engines contain all the necessary functions
Object.values(engines)
	.forEach((engine) => {
		const hash = Object.keys(engine).join(',')
		if (!functionsHash) {
			functionsHash = hash
		} else if (hash !== functionsHash) {
			throw new Error('Database Engine verification failed, at least one supported engine is not like the rest (missing/different functions')
		}
	})

export const engineFor = (provider: string): IDatabaseEngine => {
	const engine: IDatabaseEngine | undefined = engines[provider]
	if (!engine) {
		throw new Error('Unknown engine provider '+provider)
	}
	return engine
}
