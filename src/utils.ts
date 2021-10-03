import * as fs from 'fs'

const extractDataSourceBlock = (schema: string): string | undefined =>
	schema.split('datasource db {')[1]?.split('}')[0]


export const getDatabaseEngineFromSchema = (schema: string): string | undefined => {
	const dataSourceBlock = extractDataSourceBlock(schema)
	return dataSourceBlock ? /provider\s*=\s*"(.+)"/.exec(dataSourceBlock)?.pop() : undefined
}

export const getDatabaseUrlEnvVarNameFromSchema = (schema: string): string | undefined => {
	const dataSourceBlock = extractDataSourceBlock(schema)
	return dataSourceBlock ? /url\s*=\s*env\("(.+)"\)/.exec(dataSourceBlock)?.pop() : undefined
}

export const copyFile = async (source: string, dest: string) => {
	if (fs.existsSync(dest)) {
		await rm(dest)
	}
	await new Promise<void>((resolve, reject) => fs.copyFile(source, dest, (err) => { err ? reject() : resolve() }))
}

export const writeFile = async (path: string, data: string) => {
	await new Promise<void>((resolve, reject) => fs.writeFile(path, data, (err) => { err ? reject() : resolve() }))
}

export const mkdir = async (path: string, options: fs.MakeDirectoryOptions = {}) => {
	await new Promise<void>((resolve, reject) => fs.mkdir(path, options, (err) => { err ? reject() : resolve() }))
}

export const rm = async (path: string, options: fs.RmOptions = {}) => {
	await new Promise<void>((resolve, reject) => fs.rm(path, options, (err) => { err ? reject() : resolve() }))
}

export const rmdir = async (path: string, options: fs.RmDirOptions = {}) => {
	await new Promise<void>((resolve, reject) => fs.rmdir(path, options, (err) => { err ? reject() : resolve() }))
}
