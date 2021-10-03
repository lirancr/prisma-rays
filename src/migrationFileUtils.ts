import * as fs from "fs"
import * as path from "path"
import { migrationsPath } from './config'
import { mkdir, readdir } from './utils'

export  { migrationsPath }
export const getMigrationFolders = async (): Promise<string[]> => {
    if (!fs.existsSync(migrationsPath)) {
        await mkdir(migrationsPath)
        return []
    }
    const files = await readdir(migrationsPath)
    return files.filter((f) => fs.lstatSync(path.join(migrationsPath, f)).isDirectory()).sort()
}
