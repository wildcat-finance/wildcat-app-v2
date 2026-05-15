import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const pkgPath = path.resolve(rootDir, 'package.json')
const lockPath = path.resolve(rootDir, 'package-lock.json')
const useStaged = process.argv.includes('--staged')

const EXACT = /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/

function readFile(filePath, gitPath) {
  if (!useStaged) {
    return fs.readFileSync(filePath, 'utf8')
  }

  return execFileSync('git', ['show', `:${gitPath}`], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  })
}

const pkg = JSON.parse(readFile(pkgPath, 'package.json'))
const lock = JSON.parse(readFile(lockPath, 'package-lock.json'))
const lockRoot = lock.packages?.[''] ?? {}
const offenders = []
const lockOffenders = []

function check(section, deps = {}) {
  const lockDeps = lockRoot[section] ?? {}

  for (const [name, spec] of Object.entries(deps)) {
    if (!EXACT.test(spec)) {
      offenders.push({ section, name, spec })
    }
    if (lockDeps[name] !== spec) {
      lockOffenders.push({ section, name, spec, lockSpec: lockDeps[name] ?? 'missing' })
    }
  }

  for (const [name, lockSpec] of Object.entries(lockDeps)) {
    if (!(name in deps)) {
      lockOffenders.push({ section, name, spec: 'missing', lockSpec })
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
    'Use `npm install <pkg>` - .npmrc sets save-exact=true so new installs are pinned.\n',
  )
}

if (lockOffenders.length > 0) {
  console.error('\npackage-lock.json is out of sync with package.json:\n')
  for (const { section, name, spec, lockSpec } of lockOffenders) {
    console.error(`  ${section}.${name}: package.json="${spec}", package-lock="${lockSpec}"`)
  }
  console.error(
    '\nRun `npm install --package-lock-only --ignore-scripts --audit=false --fund=false` and stage package-lock.json.\n',
  )
}

if (offenders.length > 0 || lockOffenders.length > 0) {
  process.exit(1)
}

console.log('All dependency versions are exact and package-lock.json is in sync.')
