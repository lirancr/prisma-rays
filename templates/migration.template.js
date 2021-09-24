// Migration $migrationName

/*
 * This is your migration script, use the up/down function to apply additional non-structural changes to your database
 * such as data processing. and assigning defaults to non-null fields before their constraints are applied.
 * Do not however perform structure manipulations or modify the generated raw queries.
 */

const up = async ({ prisma }) => {
	$execUp
}

const down = async ({ prisma }) => {
	$execDown
}

module.exports = {
	up,
	down,
}
