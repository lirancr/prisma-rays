const execa = require('execa')
const { databaseUrl, databaseUrlEnvVarName, schema } = require('./config')

module.exports = {
	commandSync: (cmd) => {
		return execa.commandSync(cmd, {
			stderr: 'inherit',
			stdout: 'inherit',
			stdin: 'inherit',
		})
	},
	prismaSync: (cmd, env = {}) => {
		const defaultEnv = {
			[databaseUrlEnvVarName]: databaseUrl,
		}

		return execa.commandSync(`npx prisma ${cmd} --schema ${schema}`, {
			stderr: 'inherit',
			stdout: 'inherit',
			stdin: 'inherit',
			env: {
				...defaultEnv,
				...env,
			},
		})
	},
	ask: (question) => {
		return new Promise((resolve) => {
			const readline = require('readline').createInterface({
				input: process.stdin,
				output: process.stdout
			});

			readline.question(question, (answer) => {
				readline.close();
				resolve(answer)
			});
		})
	}
}
