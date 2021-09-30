#! /usr/bin/env node
const execa = require('execa')
const path = require('path')

const args = process.argv.slice(2).join(' ')
const indexFilePath = path.normalize(path.join(__dirname, '..', 'build', 'index.js'))

execa.commandSync(`node ${indexFilePath} ${args}`, {
	stdio: 'inherit',
})
