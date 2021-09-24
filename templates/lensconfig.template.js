// this is your Prisma Lens config

module.exports = {
	/* A path to your prisma migrations directory */
	migrationsDir: 'prisma/migrations',
	/* A path to your prisma schema file */
	schemaPath: 'prisma/schema.prisma',
	/* A connection url to your database  */
	databaseUrl: 'postgresql://postgres:username@dbhost:port/dbname?schema=public',
	/* Whether to enable verbose logging by default */
	verboseLogging: false,
}
