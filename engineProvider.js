/**
 * A database engine in PrismaLens terms is an object with functions which generate a valid SQL syntax
 * so PrismaLens can use it in execRaw/queryRaw without taking into account which database type it is.
 *
 * all engines should be placed in ./engines and be named according to their prisma name (i.e the provider set in
 * the prisma schema file).
 *
 * When changing one engine you must change them all!
 */

const { ALLOWED_ENGINES } = require('./constants')
const fs = require('fs')
const path = require('path')

const enginesDir = path.join(__dirname, 'engines')

const engines = fs.readdirSync(enginesDir).reduce((agg, file) => {
	const provider = file.split('.js')[0]
	if (ALLOWED_ENGINES.includes(provider)) {
		agg[provider] = require(path.join(enginesDir, provider))
	} else {
		console.warn(`Detected unsupported database engine ${provider}, ignoring it.`)
	}
	return agg
}, {})

let functionsHash
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

module.exports = {
	engineFor: (provider) => {
		const engine = engines[provider];
		if (!engine) {
			throw new Error('Unknown engine provider '+provider)
		}
		return engine
	},
}
