import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const useStaged = process.argv.includes('--staged')

const EXPECTED_NODE_VERSION = '22.22.1'
const EXPECTED_NODE_ENGINE = `>=${EXPECTED_NODE_VERSION} <23`
const EXPECTED_NPM_VERSION = '11.12.0'
const EXPECTED_PACKAGE_MANAGER = `npm@${EXPECTED_NPM_VERSION}`

const REQUIRED_NPMRC = new Map([
  ['engine-strict', 'true'],
  ['ignore-scripts', 'true'],
  ['save-exact', 'true'],
  ['save-prefix', ''],
  ['min-release-age', '7'],
  ['allow-git', 'none'],
])

const DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]

const NUMERIC_IDENTIFIER = '0|[1-9]\\d*'
const NON_NUMERIC_IDENTIFIER = '\\d*[a-zA-Z-][0-9a-zA-Z-]*'
const PRERELEASE_IDENTIFIER = `(?:${NUMERIC_IDENTIFIER}|${NON_NUMERIC_IDENTIFIER})`
const BUILD_IDENTIFIER = '[0-9a-zA-Z-]+'
const EXACT_SEMVER = new RegExp(
  `^(?:${NUMERIC_IDENTIFIER})\\.(?:${NUMERIC_IDENTIFIER})\\.(?:${NUMERIC_IDENTIFIER})` +
    `(?:-${PRERELEASE_IDENTIFIER}(?:\\.${PRERELEASE_IDENTIFIER})*)?` +
    `(?:\\+${BUILD_IDENTIFIER}(?:\\.${BUILD_IDENTIFIER})*)?$`,
)

function readFile(gitPath) {
  if (!useStaged) {
    return fs.readFileSync(path.resolve(rootDir, gitPath), 'utf8')
  }

  try {
    return execFileSync('git', ['show', `:${gitPath}`], {
      cwd: rootDir,
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    })
  } catch {
    throw new Error(`${gitPath} is not staged. Stage it before committing.`)
  }
}

function readJson(gitPath) {
  try {
    return JSON.parse(readFile(gitPath))
  } catch (error) {
    throw new Error(`Unable to parse ${gitPath}: ${error.message}`)
  }
}

function parseNpmrc(contents) {
  const values = new Map()
  const invalidLines = []

  contents.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) return

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) {
      invalidLines.push({ line: index + 1, value: trimmed })
      return
    }

    values.set(trimmed.slice(0, separatorIndex).trim(), trimmed.slice(separatorIndex + 1).trim())
  })

  return { values, invalidLines }
}

const pkg = readJson('package.json')
const lock = readJson('package-lock.json')
const lockRoot = lock.packages?.[''] ?? {}
const offenders = []
const lockOffenders = []
const policyOffenders = []

function checkPolicy() {
  const nvmrc = readFile('.nvmrc').trim()
  const { values: npmrc, invalidLines } = parseNpmrc(readFile('.npmrc'))

  if (pkg.packageManager !== EXPECTED_PACKAGE_MANAGER) {
    policyOffenders.push({
      setting: 'package.json.packageManager',
      expected: EXPECTED_PACKAGE_MANAGER,
      actual: pkg.packageManager ?? 'missing',
    })
  }

  if (pkg.engines?.node !== EXPECTED_NODE_ENGINE) {
    policyOffenders.push({
      setting: 'package.json.engines.node',
      expected: EXPECTED_NODE_ENGINE,
      actual: pkg.engines?.node ?? 'missing',
    })
  }

  if (pkg.engines?.npm !== EXPECTED_NPM_VERSION) {
    policyOffenders.push({
      setting: 'package.json.engines.npm',
      expected: EXPECTED_NPM_VERSION,
      actual: pkg.engines?.npm ?? 'missing',
    })
  }

  if (nvmrc !== EXPECTED_NODE_VERSION) {
    policyOffenders.push({
      setting: '.nvmrc',
      expected: EXPECTED_NODE_VERSION,
      actual: nvmrc || 'missing',
    })
  }

  for (const { line, value } of invalidLines) {
    policyOffenders.push({
      setting: `.npmrc:${line}`,
      expected: 'key=value',
      actual: value,
    })
  }

  for (const [key, expected] of REQUIRED_NPMRC) {
    if (npmrc.get(key) !== expected) {
      policyOffenders.push({
        setting: `.npmrc ${key}`,
        expected,
        actual: npmrc.get(key) ?? 'missing',
      })
    }
  }
}

function check(section, deps = {}) {
  const lockDeps = lockRoot[section] ?? {}

  for (const [name, spec] of Object.entries(deps)) {
    if (!EXACT_SEMVER.test(spec)) {
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

checkPolicy()

for (const section of DEPENDENCY_SECTIONS) {
  check(section, pkg[section])
}

if (policyOffenders.length > 0) {
  console.error('\nDependency policy configuration is invalid:\n')
  for (const { setting, expected, actual } of policyOffenders) {
    console.error(`  ${setting}: expected "${expected}", got "${actual}"`)
  }
}

if (offenders.length > 0) {
  console.error('\nNon-exact versions found in package.json:\n')
  for (const { section, name, spec } of offenders) {
    console.error(`  ${section}.${name}: "${spec}"`)
  }
  console.error(
    '\nAll dependency versions must be exact SemVer versions (e.g. "1.2.3" or "1.2.3-beta.1"), without ^, ~, *, >=, aliases, git URLs, file paths, or dist-tags.',
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

if (policyOffenders.length > 0 || offenders.length > 0 || lockOffenders.length > 0) {
  process.exit(1)
}

console.log('Dependency policy, exact versions, and package-lock.json root sync are valid.')
