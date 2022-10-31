const { get } = require('https')
const { name, version } = require('../package.json')

const getLatestVersion = () => new Promise((resolve, reject) => {
    get(`https://registry.npmjs.org/${name}/latest`, (res) => {
        let data = []
        res.on('data', (chunk) => {
            data.push(chunk)
        })
        res.on('end', () => {
            resolve(JSON.parse(data.join('')).version)
        })
    }).on('error', (err) => {
        console.log('failed to retrieve latest package version from registry', err)
        reject(err)
    })
})

const parseVersion = (semverString) => {
    const [, major, minor, patch] = /(\d+)\.(\d+)\..*?(\d+)/g.exec(semverString)
    return [major || 0, minor || 0, patch || 0]
}

/**
 * compare two semver strings
 * @param v1str first semver string
 * @param v2str second semver string
 * @returns {number} 1 if v1str is greater than v2str, -1 if v1str is less than v2str, 0 if they are equal
 */
const compareVersions = (v1str, v2str) => {
    console.log('comparing versions', v1str, v2str)
    const v1 = parseVersion(v1str)
    const v2 = parseVersion(v2str)
    for (let i = 0; i < v1.length; i++) {
        if (v1[i] > v2[i]) {
            return 1
        }
        if (v1[i] < v2[i]) {
            return -1
        }
    }
    return 0
}

const main = async () => {
    console.log('validating package version availability for publishing')
    const latestVersion = await getLatestVersion()
    if (compareVersions(version, latestVersion) < 0) {
        console.error(`package.json version ${version} is less than latest published version ${latestVersion}`)
        process.exit(1)
    }
    console.log('package.json version is available')
}

main()
