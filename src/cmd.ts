import * as execa from 'execa'
import { databaseUrl, databaseUrlEnvVarName, schema } from './config'
import { createInterface } from 'readline'

export const commandSync = (cmd: string): unknown => {
		return execa.commandSync(cmd, {
			stderr: 'inherit',
			stdout: 'inherit',
			stdin: 'inherit',
		})
	}

export const prismaSync = (cmd: string, env: object = {}): unknown => {
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
}

export const ask = (question: string): Promise<string> => {
	return new Promise((resolve) => {
		const readline = createInterface({
			input: process.stdin,
			output: process.stdout
		});

		readline.question(question, (answer: string) => {
			readline.close();
			resolve(answer)
		});
	})
}
