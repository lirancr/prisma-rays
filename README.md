# Prisma Lens 🔍
### Prisma ORM migration tool for developers who want control.

prisma lens is a schema migration management tool built for [prisma ORM](https://www.prisma.io/).
It is meant to be used as a drop in replacement to the builtin `prisma migrate` cli.
Providing many management improvements and a more intuitive api.

## Why to use Prisma Lens

Fair question, the wonderful devs on [prisma migrate](https://www.prisma.io/migrate) have made a great job on the builtin migration tool.
In fact, Prisma Lens uses prisma migrate under the hood to generate its own migrations, so you don't have to worry about differences between schema parsers.

However, prisma migrate is littered with all kind of counterintuitive behaviours and lack support for some flows which can be useful.

See a feel list of differences between the two in the [Prisma Lens vs Prisma Migrate](#prisma-lens-vs-prisma-migrate) section

Prisma Lens is heavily inspired by the UX given by the [Django](https://www.djangoproject.com/) framework builtin migration tool.

## Getting started

#### prerequisites
- [prisma cli](https://www.npmjs.com/package/prisma) installed on your project
- [prisma client](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases/install-prisma-client-typescript-postgres) installed on your project
- existing postgres database (other [relational databases](https://www.prisma.io/docs/reference/database-reference/supported-databases) might also be supported but were not tested against at the moment)
- `prisma.schema` file with database connection url provided from `.env` file
- user credentials to the database with the [appropriate permissions](https://www.prisma.io/docs/concepts/components/prisma-migrate/shadow-database#shadow-database-user-permissions) for shadow database creation

#### Installation

1. Install package `npm i  prisma-lens`

   You may also install as global package instead of using `npx`
2. in your project's root directory run `npx plens init`
3. Open the generated `lensconfig.js` file and update it according to your project's setup.

If your project does not have existing migrations created from `prisma migrate` you can opt in to `prisma lens`
by running `npx plens prepare`. Otherwise, see [Adding to existing projects](#adding-to-existing-projects)

#### Adding to existing projects

1. make sure your database is currently at the starting state that fits your project.
2. remove all folders in your migrations directory, only keep the `migration_lock.toml` file.
3. run `npx plens prepare`

## Usage

Optional global cli options with any command:

Option | Values | description
--- | --- | ---
log | None | Run command with verbose logging.
conf | File path | path to your plensconfig file.
help | None | prints the help chapter on the specific command.

### Commands

#### init

`npx plens init`

Setup prisma lens for your project, creating an initial `lensconfig.js` file

init is only ever required once in the entire lifespan of a project

#### prepare

`npx plens prepare <options>`

Options:

Option | Values | Required | description
--- | --- | --- | ---
y | None | No | approve database reset

Initialize the migration system against the current existing database.
Using this function require to clear the database during the process.

This function works by looking at the current database and update the prisma schema accordingly.
if you have an existing prisma schema you wish to end up with run `npx prisma db push` before running this command

Prepare is only ever required once in the entire lifespan of a project

**example usage:**

`npx plens prepare --y`

#### makemigration

`npx plens makemigration --name <name> <options>`

Options:

Option | Values | Required | description
--- | --- | --- | ---
name | String | yes | suffix to give to the created migration.
blank | None | no | allow the creation of a blank migration if no changes detected in the schema.


Create a migration based on your recent schema changes without applying it to your database.
You can use this function at any time as you like and any database state.

This function works by:
1. creating a shadow database and applying all the available migrations to it.
2. compare the shadow database schema against your current prisma schema and generate the necessary migration
3. create the revert migration and create a `migration.js` file with both up and down migrations 
4. drop the shadow database

**example usage:**

create a migration suffixed by `myFirstMigration`:

`npx plens makemigration --name myFirstMigration`

create a migration or blank if no changes, suffixed by `myFirstMigration`:

`npx plens makemigration --name myFirstMigration --blank`


#### migrate

`npx plens migrate <options>`

Options:

Option | Values | Required | description
--- | --- | --- | ---
name | String | no | Target migration to reach (if not given all up migrations are applied).
fake | None | no | Change the migration state without applying the schema changes to the database.


Apply migrations to your database. If migration name option is given, the database will be migrated to this migration
regardless of the direction (i.e up/down) it's found at. Otherwise the topmost migration is used as end target.

You may use the fake migration option to only mark the migration as applied/reverted without actually effecting the database structure.
This is useful for solving sync issues or error recovery.

Each migration step is being wrapped in transaction which is either committed or rolled back when the migration step is done. 

This function works by:
1. finding the migration end target (uses the last migration if non given)
2. get applied migrations list from database (piggybacking on `prisma migrate`'s migration listing table)
3. determine required migration direction and steps
4. if fake migration option not given - load each migration step `migration.js` script and run the up/down functions, wrapped in transaction sql syntax.
5. update each migration step in `prisma migrate`'s migration listing table (either insert or remove from it)
6. replaces your prisma schema file with schema file associated with the last successful migration step.

**example usage:**

apply all migrations:

`npx plens migrate`

mark all un-applied migrations as applied without running them:

`npx plens migrate --fake`

apply migrations up/down to `myFirstMigration_20211109182020`:

`npx plens migrate --name myFirstMigration_20211109182020`

mark un-applied migrations up/down to `myFirstMigration_20211109182020` as applied/reverted without running them:

`npx plens migrate --name myFirstMigration_20211109182020 --fake`


#### status

`npx plens status`

log the migration and schema status against the database structure

## migration.js

Prisma Lens work with javascript files to manage migrations. Each migration file (a.k.a step)
exposes too functions:

- up - run during forward migration
- down - run during backward migration

these functions can be modified to perform different actions over your database with one exception:
- do not change the database structure or modify the generated sql calls in the migration script.
  why ? because those bits of code must be aligned with the generated `migration.sql` which `prisma migrate` depends on.

You can of course step in between commands to perform your own logic such as changing the data of your models and so on.

Because of this `migration.js` files doesn't even need to run any structure changes sql at all. you can use a blank migration
to apply database wide data manipulation.

in addition to the migration script, prisma lens also create a copy of each migration step schema so it can be reverted to at any time.

## Prisma Lens vs Prisma Migrate

#### Creating migrations

In `prisma migrate`, attempting to create multiple migrations without applying any of them is not supported. if you attempt
to create another migration while you have an un-applied migration pending it will by applied first.

In `prisma lens`, creating migrations is completely separated from applying the migration, so you can create as many of those as you
want.


#### Migration format

`prisma migrate` only supports an SQL file as your migration. This might impose some limits on what you can do with migrations.

`prisma lens` on the other hand uses a plain js file as your migration, so you can use it to perform complex data manipulations
and easily resolve data related issues during schema changes.

For example assume you're adding a new non-null column to an existing table and need to provide a default value, 
with `prisma lens` you can just populate a value in your migration file before the sql which create the non-null constraint.
`prisma migrate` overcome this issue (in development) by offering you to reset the database

Because `prisma lens` uses `prisma migrate` under the hood, you will still see `migration.sql` file created. This file is only kept to support `prisma migrate` usage by `prisma lens` but its not being used by it directly.


#### Revert migration

`prisma migrate` does not support reverting applied migrations.

`prisma lens` support reverting applied migrations at any depth since it keeps a copy of the prisma schema every time it creates
a migration.


#### Applying migrations

`prisma migrate` is applying all migrations, without using transactions and only in one direction (e.g up), if your migration fail halfway the database is left in undetermined state until manually fixed

`prisma lens` can apply as many migration steps as you wish in both directions to bring your database to the desired state. Each migration step is being run inside a transaction and is being rolled back on errors

## Known limits and missing features

#### Shadow database override

Currently, there is no support for specifying shadow database url, the database name is randomly assigned 
and the same credentials and host are used as the source database.

As such, using Prisma Lens for generating migrations against cloud hosted shadow databases is not supported.

It is entirely supported to perform migrations (i.e `npx plens migrate`) on cloud hosted databases. Just not using `makemigrations` command with them.

#### So many logs

Currently, even with verbose logging option turned off the you will still see every one of `prisma migrate` console logs
when running `prisma lens` commands. Annoying, I know.

#### Databases support

At the moment `prisma lens` only officially support and tested against `postgresql`, this is due to some raw db queries
used internally to perform the different functions. It's possible that these queries are written in a syntax recognized
by other relational databases but those have not been tested against.

If you're interested in helping with this issue feel free to submit a pull request, adding your [query builder file](./src/queryBuilders)

## Going back to prisma migrate

If you're unhappy with Prisma Lens or simply want to go back to the built in `prisma migrate` tool its easy to do so.
1. run `npx plens migrate` to bring your database to the latest version
2. In the migrations folder, for each migration directory delete all the files except for the `migration.sql`
3. if installed locally, uninstall prisma lens with `npm uninstall prisma-lens`

## Troubleshooting

#### Error: P4001 The introspected database was empty while running plens prepare

your database is empty so it cannot be used to generate the schema (maybe due to previous failure).
Update your prisma schema to an initial point you want to support and run `npx prisma db push`.
Then run `npx plens prepare` again

