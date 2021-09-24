const extractDataSourceBlock = (schema) =>
	schema.split('datasource db {')[1]?.split('}')[0]


const getDatabaseEngineFromSchema = (schema) =>
	/provider\s*=\s*"(.+)"/.exec(extractDataSourceBlock(schema))?.pop()

const getDatabaseUrlEnvVarNameFromSchema = (schema) =>
	/url\s*=\s*env\("(.+)"\)/.exec(extractDataSourceBlock(schema))?.pop()

module.exports = {
	getDatabaseEngineFromSchema,
	getDatabaseUrlEnvVarNameFromSchema,
}
