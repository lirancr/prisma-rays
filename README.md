[![Build Status](https://app.travis-ci.com/lirancr/prisma-rays.svg?branch=master)](https://app.travis-ci.com/lirancr/prisma-rays)
[![NPM Version](https://badge.fury.io/js/prisma-rays.svg?style=flat)](https://www.npmjs.com/package/prisma-rays)

# Prisma Rays 💫
### Prisma ORM migration tool for developers who want control.

prisma rays is a schema migration management tool built for [prisma ORM](https://www.prisma.io/).
It is meant to be used as a drop in replacement to the builtin `prisma migrate` cli.
Providing many management improvements and a more intuitive api.

## Why to use Prisma Rays

Fair question, the wonderful devs on [prisma migrate](https://www.prisma.io/migrate) have made a great job on the builtin migration tool.
In fact, Prisma Rays uses prisma migrate under the hood to generate its own migrations, so you don't have to worry about differences between schema parsers.

However, prisma migrate is littered with all kind of counterintuitive behaviours and lack support for some flows which can be useful.

See a feel list of differences between the two in the [Prisma Rays vs Prisma Migrate](#prisma-rays-vs-prisma-migrate) section

Prisma Rays is heavily inspired by the UX given by the [Django](https://www.djangoproject.com/) framework builtin migration tool.

## Getting started

#### prerequisites
- [prisma cli](https://www.npmjs.com/package/prisma) installed on your project
- [prisma client](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases/install-prisma-client-typescript-postgres) installed on your project
- existing `postgres`/`mysql` database (other [relational databases](https://www.prisma.io/docs/reference/database-reference/supported-databases) might also be supported but were not tested against at the moment)
- `prisma.schema` file with database connection url provided from `.env` file
- if using the auto-generated shadow database, your user credentials to the database should have the [appropriate permissions](https://www.prisma.io/docs/concepts/components/prisma-migrate/shadow-database#shadow-database-user-permissions) for shadow database creation

#### Installation

1. Install package `npm i  prisma-rays`

   You may also install as global package instead of using `npx`
2. in your project's root directory run `npx rays init`
3. Open the generated `raysconfig.js` file and update it according to your project's setup (see [Configuration](#configuration) section for details).

if your project's database is brand new (i.e has no tables), make sure your prisma schema contain at least one model and run `npx rays push`

If your project does not have existing migrations created from `prisma migrate` you can opt in to `prisma rays`
by running `npx rays prepare`. Otherwise, see [Adding to existing projects](#adding-to-existing-projects)

#### Adding to existing projects

1. make sure your database is currently at the starting state that fits your project.
2. remove all folders in your migrations directory, only keep the `migration_lock.toml` file.
3. run `npx rays prepare`

## Prisma rays workflow

With prisma rays your typical workflow will look like this:
1. Modify your prisma schema file
2. generate migrations based on changes using `makemigrations` command
3. repeat steps 1 + 2 until you're ready to apply them.
4. When you wish to apply the generated migrations run the `migrate` command
5. push migration files to version control

In production, your workflow should typically be to simply apply your migrations after you've pulled the changes from version control.

## Configuration

Prisma Rays has a single configuration file `raysconfig.js`

#### Configuration options

Option | Values | description
--- | --- | ---
migrationsDir | string | A path to your prisma migrations directory
schemaPath | string | A path to your prisma schema file
databaseUrl | string | A connection url to your database (this is the same as value set in your `.env` file)
shadowDatabaseName | string / null | The name of your shadow database if you wish to use predefined one instead of auto-create on each make-migration process. Must be accessible using the same credentials and schema as your database
verboseLogging | boolean | Whether to enable verbose logging by default (instead of requiring `--log` flag)

#### Basic configuration

For most setups you only need to set your `migrationsDir` and  `schemaPath` and `databaseUrl`.

#### Configuring to work with cloud hosted / fixed shadow database

Prisma Rays (and the underlying Prisma Migrate) uses shadow database to generate migration files based on schema changes without affecting your database.
Using Prisma Rays require 2 separate shadow databases - one for prisma rays and another for prisma migrate.
With the basic configuration those databases are automatically created and dropped when creating migrations.

There are however, cases where you might what to override this behaviour and specify your own shadow databases:
- You don't have the appropriate permissions to create and drop databases.
- Your database is hosted on a cloud service (which does not normally support creating and dropping database instances)
- You use Prisma Rays migration generating in your CI system (for example Prisma Rays tests run on CI)

It's important to note that shadow databases only play a role when creating migrations (as part of `prepare` or `makemigration`).
if you only need apply/revert migrations you do not need this special setup.

When overriding the the shadow database behavior, instead of creating and dropping the shadow database, both Prisma Rays and Prisma Migrate
simply drop all the tables in them and reuse them.

*Configuration*

1. In your `raysconfig.js` file update the `shadowDatabaseName` property to match the name of your shadow database to be used by prisma rays.

   This database must be accessible using the same credentials as your database. For example:
   ```
   databaseUrl='postgresql://user:password@dbhost:5432/mydb?schema=public'`
   shadowDatabaseName='mydb_rays_shadow'`
   ```

   Shadow database url will be: `postgresql://user:password@dbhost:5432/mydb_rays_shadow?schema=public`


2. configure shadow database for Prisma Migrate by setting `shadowDatabaseUrl` in your schema. read more on [prisma migrate docs](https://www.prisma.io/docs/concepts/components/prisma-migrate/shadow-database#cloud-hosted-shadow-databases-must-be-created-manually)

   ```
   datasource db {
      provider          = "postgresql"
      url               = "postgresql://user:password@dbhost:5432/mydb?schema=public"
      shadowDatabaseUrl = "postgresql://user:password@dbhost:5432/mydb_prisma_shadow?schema=public"
   }
   ```

   This database must be different from shadow database set for prisma rays


## Usage

Optional global cli options with any command:

Option | Values | description
--- | --- | ---
log | None | Run command with verbose logging.
conf | File path | path to your  raysconfig file.
help | None | prints the help chapter on the specific command.

### Commands

#### init

`npx rays init`

Setup prisma rays for your project, creating an initial `raysconfig.js` file

init is only ever required once in the entire lifespan of a project

#### prepare

`npx rays prepare <options>`

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

`npx rays prepare --y`

#### makemigration

`npx rays makemigration --name <name> <options>`

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

`npx rays makemigration --name myFirstMigration`

create a migration or blank if no changes, suffixed by `myFirstMigration`:

`npx rays makemigration --name myFirstMigration --blank`


#### migrate

`npx rays migrate <options>`

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

`npx rays migrate`

mark all un-applied migrations as applied without running them:

`npx rays migrate --fake`

apply migrations up/down to `myFirstMigration_20211109182020`:

`npx rays migrate --name myFirstMigration_20211109182020`

mark un-applied migrations up/down to `myFirstMigration_20211109182020` as applied/reverted without running them:

`npx rays migrate --name myFirstMigration_20211109182020 --fake`


#### push

`npx rays push <options>`

Options:

Option | Values | Required | description
--- | --- | --- | ---
y | None | No | approve database reset

Reset your database to the current state of your schema, this mechanism does not use migrations api and instead
rebuild the database based on the schema.
This command usually required for new projects which never applied any schema to it

**example usage:**

`npx rays push --y`


#### status

`npx rays status`

log the migration and schema status against the database structure

## migration.js

Prisma Rays work with javascript files to manage migrations. Each migration file (a.k.a step)
exposes too functions:

- up - run during forward migration
- down - run during backward migration

these functions can be modified to perform different actions over your database with one exception:
- do not change the database structure or modify the generated sql calls in the migration script.
  why ? because those bits of code must be aligned with the generated `migration.sql` which `prisma migrate` depends on.

You can of course step in between commands to perform your own logic such as changing the data of your models and so on.

For data related operations. your up and down migrations receive a [client api](#client-api) object which can be used to interact with the
database during the migration process.

Because of this, `migration.js` files doesn't even need to run any structure changes sql at all. you can use a blank migration
to apply database wide data manipulation.

in addition to the migration script, prisma rays also create a copy of each migration step schema so it can be reverted to at any time.


#### Client API

The migration functions are given a `client` object which is connected to the database within the migration transaction.
The client api is as follows:

```typescript
interface IDatabaseClientApi {
   query: (query: string, params?: any[]) => Promise<unknown[]>
   execute: (query: string, params?: any[]) => Promise<void>
}
```

use `query` for command to SELECT data from your database, the result is an array of objects matching your query (i.e rows)

use `execute` for commands that you do not expect to get result back for such as INSERT and UPDATE

both functions accept a query string and an optional array of arguments to be safely escaped into the resulting query.

**example usage** 

query data with hard coded values (not recommended):

`const rows = await query('SELECT * FROM users WHERE firstname = "John" AND lastname = "Doe"')`

query data with parameters - use the `:?` markup as a parameter insertion point (useful when your parameters derive from unknown source such as user generated content in order to avoid SQL injection):

`const rows = await query('SELECT * FROM users WHERE firstname = :? AND lastname = :?', ['John', 'Doe'])`

**WARNING:** Do not build query string in runtime yourself based on uncontrolled data source (such as user provided data), doing so will expose your database do SQL injection
and potential catastrophe

for example **DO NOT DO THIS:**
```
const fname = ...
const lname = ...
const rows = await query('SELECT * FROM users WHERE firstname = "' + fname + '" AND lastname = " + lname + "')
```

## Prisma Rays vs Prisma Migrate

#### Creating migrations

In `prisma migrate`, attempting to create multiple migrations without applying any of them is not supported. if you attempt
to create another migration while you have an un-applied migration pending it will by applied first.

In `prisma rays`, creating migrations is completely separated from applying the migration, so you can create as many of those as you
want.


#### Migration format

`prisma migrate` only supports an SQL file as your migration. This might impose some limits on what you can do with migrations.

`prisma rays` on the other hand uses a plain js file as your migration, so you can use it to perform complex data manipulations
and easily resolve data related issues during schema changes.

For example assume you're adding a new non-null column to an existing table and need to provide a default value, 
with `prisma rays` you can just populate a value in your migration file before the sql which create the non-null constraint.
`prisma migrate` overcome this issue (in development) by offering you to reset the database

Because `prisma rays` uses `prisma migrate` under the hood, you will still see `migration.sql` file created. This file is only kept to support `prisma migrate` usage by `prisma rays` but its not being used by it directly.


#### Revert migration

`prisma migrate` does not support reverting applied migrations.

`prisma rays` support reverting applied migrations at any depth since it keeps a copy of the prisma schema every time it creates
a migration.


#### Applying migrations

`prisma migrate` is applying all migrations, without using transactions and only in one direction (e.g up), if your migration fail halfway the database is left in undetermined state until manually fixed

`prisma rays` can apply as many migration steps as you wish in both directions to bring your database to the desired state. Each migration step is being run inside a transaction and is being rolled back on errors

## Known limits and missing features

#### So many logs

Currently, even with verbose logging option turned off the you will still see every one of `prisma migrate` console logs
when running `prisma rays` commands. Annoying, I know.

#### Databases support

At the moment `prisma rays` only supports `postgresql` & `mysql`,  (2 out of 3 relational databases prisma migration supports).
This is due to some raw db queries used internally to perform the different functions.

If you're interested in helping with this issue feel free to submit a pull request, adding your [engine file](./src/engines)`

## Going back to prisma migrate

If you're unhappy with Prisma Rays or simply want to go back to the built in `prisma migrate` tool its easy to do so.
1. run `npx rays migrate` to bring your database to the latest version
2. In the migrations folder, for each migration directory delete all the files except for the `migration.sql`
3. if installed locally, uninstall prisma rays with `npm uninstall prisma-rays`

## Troubleshooting

#### Error: P4001 The introspected database was empty while running rays prepare

your database is empty so it cannot be used to generate the schema.
Update your prisma schema to an initial point you want to support and run `npx rays push`.
Then run `npx rays prepare` again

