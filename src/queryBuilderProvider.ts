/**
 * A database query builder in PrismaLens terms is an object with functions which generate a valid SQL syntax
 * so PrismaLens can use it in execRaw/queryRaw without taking into account which database type it is.
 *
 * all query builders should be placed in ./engines and be named according to their prisma name (i.e the provider set in
 * the prisma schema file).
 *
 * When changing one engine you must change them all!
 */

import type { IQueryBuilder } from './types'
import { ALLOWED_ENGINES } from './constants'
import * as fs from 'fs'
import * as path from 'path'
import {QueryBuilderFactory} from "./types";

type BuildersMap = { [provider: string]: QueryBuilderFactory}

const enginesDir: string = path.join(__dirname, 'queryBuilders')

const builders: BuildersMap = fs.readdirSync(enginesDir).reduce((agg: BuildersMap, file: string) => {
	const provider = file.split('.')[0]
	if (ALLOWED_ENGINES.includes(provider)) {
		agg[provider] = require(path.join(enginesDir, provider))
	} else {
		console.warn(`Detected unsupported database query builder ${provider}, ignoring it.`)
	}
	return agg
}, {})

export const builderFor = (provider: string, databaseUrl: string): IQueryBuilder => {
	const builderFactory: QueryBuilderFactory | undefined = builders[provider]
	if (!builderFactory) {
		throw new Error('Unknown query builder provider '+provider)
	}
	return builderFactory(databaseUrl)
}
