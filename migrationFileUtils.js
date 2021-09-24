const fs = require("fs");
const path = require("path");
const { migrationsPath } = require("./config");

const getMigrationFolders = () => {
    if (!fs.existsSync(migrationsPath)) {
        return []
    }
    return fs.readdirSync(migrationsPath).filter((f) => fs.lstatSync(path.join(migrationsPath, f)).isDirectory()).sort()
}

module.exports = {
    migrationsPath,
    getMigrationFolders,
}
