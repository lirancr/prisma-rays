import * as path from 'path'
import { DEFAULT_CONFIG_FILE_NAME } from '../constants'
import type {InitCommand} from "../types"
import { copyFileSync } from '../utils'

const command: InitCommand = async () => {
    console.log('Setting up Prisma Lens for your project')

    console.log('Creating lensconfig file')
    const configFilePath = path.resolve(DEFAULT_CONFIG_FILE_NAME)
    copyFileSync(
        path.join(__dirname, '..', 'templates', 'lensconfig.template.js'),
        configFilePath,
    )

    console.log(`Your project is ready. Review the generated config file at:\n${configFilePath}`)
}

export default command
module.exports = command
