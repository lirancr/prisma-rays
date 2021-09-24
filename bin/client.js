#! /usr/bin/env node
const execa = require('execa')
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2).join(' ')
const indexFilePath = path.normalize(path.join(__dirname, '..', 'src', 'index.js'))
const envFilePath = path.normalize(path.resolve('.env'))

if (!fs.existsSync(envFilePath)) {
	throw new Error(`Could not find ".env" file in ${path.dirname(envFilePath)}`)
}

execa.commandSync(`dotenv -e ${envFilePath} -- node ${indexFilePath} ${args}`, {
	stderr: 'inherit',
	stdout: 'inherit',
	stdin: 'inherit',
})
