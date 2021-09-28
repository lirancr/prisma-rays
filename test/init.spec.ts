import * as path from 'path'
import * as fs from 'fs'
import {withSchema} from "./testkit/testkit";

const schema = ``

describe('Init', () => {
    test('Create lensconfig', withSchema ({ schema, dontInit: true },
        async ({ plens, testProjectPath }) =>{
            const plensconfigPath = path.join(testProjectPath, 'lensconfig.js')
            // delete previously created config file
            if (fs.existsSync(plensconfigPath)) {
                fs.rmSync(plensconfigPath)
            }

            expect(fs.existsSync(plensconfigPath)).toBe(false)

            plens('init')

            expect(fs.existsSync(plensconfigPath)).toBe(true)
    }))
})
