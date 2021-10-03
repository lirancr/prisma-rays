import * as path from 'path'
import { DEFAULT_CONFIG_FILE_NAME } from '../constants'
import type {InitCommand} from "../types"
import { copyFile } from '../utils'

const command: InitCommand = async () => {
    console.log('Setting up Prisma Rays for your project')

    console.log('Creating raysconfig file')
    const configFilePath = path.resolve(DEFAULT_CONFIG_FILE_NAME)
    await copyFile(
        path.join(__dirname, '..', 'templates', 'raysconfig.template.js'),
        configFilePath,
    )

    console.log(`Your project is ready. Review the generated config file at:\n${configFilePath}`)
}

export default command
module.exports = command
