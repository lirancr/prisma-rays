import minimist from 'minimist'

const processArguments: any = minimist(process.argv.slice(2))

const assertRequiredArguments = (...requiredArguments: string[]) => {
    requiredArguments.forEach(arg => {
        const argValue = processArguments[arg]

        if (!(arg in processArguments)) {
            throw new Error(`Missing process argument "${arg}"`)
        }

        if (!argValue) {
            throw new Error(`Missing/invalid value for process argument "${arg}"="${argValue}"`)
        }
    })

    return processArguments
}


export default assertRequiredArguments
