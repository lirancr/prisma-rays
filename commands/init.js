const path = require('path')
const fs = require('fs')
const { DEFAULT_CONFIG_FILE_NAME } = require('../constants');

/**
 *
 * @return {Promise<void>}
 */
module.exports = async () => {
    console.log('Setting up Prisma Lens for your project')

    console.log('Creating lensconfig file')
    const configFilePath = path.resolve(DEFAULT_CONFIG_FILE_NAME)
    fs.copyFileSync(
        path.join(__dirname, '..', 'templates', 'lensconfig.template.js'),
        configFilePath,
    )

    console.log(`Your project is ready. Review the generated config file at:\n${configFilePath}`)
}
