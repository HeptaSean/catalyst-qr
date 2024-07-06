import { nodePolyfills } from 'vite-plugin-node-polyfills'
import * as fs from 'fs'
import * as path from 'path'

function stripRootWASM() {
    return {
        name: 'strip-root-wasm',
        respolveId (source) {
            return source === 'virtual-module' ? source : null
        },
        writeBundle (outputOptions, inputOptions) {
            fs.readdirSync(outputOptions.dir)
              .filter(filename => filename.endsWith('.wasm'))
              .forEach(filename => {
                  fs.rm(path.join(outputOptions.dir, filename), {},
                        () => console.log(`Deleted ${filename}`))
              })
        }
    }
}

export default {
    base: '/catalyst-qr/',
    plugins: [
        nodePolyfills(),
        stripRootWASM(),
    ],
}
