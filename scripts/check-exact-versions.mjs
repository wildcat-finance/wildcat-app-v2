import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgPath = path.resolve(__dirname, '..', 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

const EXACT = /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/

const offenders = []

function check(section, deps) {
  if (!deps) return
  for (const [name, spec] of Object.entries(deps)) {
    if (!EXACT.test(spec)) {
      offenders.push({ section, name, spec })
    }
  }
}

check('dependencies', pkg.dependencies)
check('devDependencies', pkg.devDependencies)
check('peerDependencies', pkg.peerDependencies)
check('optionalDependencies', pkg.optionalDependencies)

if (offenders.length > 0) {
  console.error('\nNon-exact versions found in package.json:\n')
  for (const { section, name, spec } of offenders) {
    console.error(`  ${section}.${name}: "${spec}"`)
  }
  console.error(
    '\nAll dependency versions must be exact (e.g. "1.2.3"), without ^, ~, *, >=, etc.',
  )
  console.error(
    'Use `npm install <pkg>` — .npmrc sets save-exact=true so new installs are pinned.\n',
  )
  process.exit(1)
}

console.log('All dependency versions are exact.')
