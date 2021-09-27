import * as fs from "fs"
import * as path from "path"
import { migrationsPath } from './config'

export  { migrationsPath }
export const getMigrationFolders = (): string[] => {
    if (!fs.existsSync(migrationsPath)) {
        return []
    }
    return fs.readdirSync(migrationsPath).filter((f) => fs.lstatSync(path.join(migrationsPath, f)).isDirectory()).sort()
}
