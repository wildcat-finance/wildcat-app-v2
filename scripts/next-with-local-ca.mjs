import { existsSync } from "fs"
import os from "os"
import path from "path"
import { spawn } from "child_process"

// this is just for local dev, it essentially just looks for the mkcert root CA and sets NODE_EXTRA_CA_CERTS so that
// node can trust https://localhost/otlp locally to mimic how this will work in prod
// if youre wanting to run the otel stack locally check the package.json script variants

const nextBin = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
)

const candidateRoots = [
  process.env.NODE_EXTRA_CA_CERTS,
  path.join(os.homedir(), "AppData", "Local", "mkcert", "rootCA.pem"),
  path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "mkcert",
    "rootCA.pem",
  ),
  path.join(os.homedir(), ".local", "share", "mkcert", "rootCA.pem"),
  path.join(os.homedir(), ".mkcert", "rootCA.pem"),
].filter(Boolean)

const trustedRoot = candidateRoots.find((candidate) => existsSync(candidate))
const env = { ...process.env }

if (trustedRoot) {
  env.NODE_EXTRA_CA_CERTS = trustedRoot
} else {
  console.warn(
    "Local mkcert root CA not found. HTTPS OTLP to https://localhost/otlp may fail.",
  )
}

const args = process.argv.slice(2)
const child = spawn(process.execPath, [nextBin, ...args], {
  stdio: "inherit",
  env,
})

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
