#!/usr/bin/env node
// Re-run ONE UAT row against an already-fixtured fork: `npm run board:one -- LEN-16`.
import { spawnSync } from "node:child_process"

const id = process.argv[2]
if (!id || !/^(M\d+|[A-Z][A-Z0-9]{1,3}-M?\d{1,3}[a-z]?(-[A-Z]{2,3})?)$/.test(id)) {
  console.error("usage: npm run board:one -- <UAT id>   (LEN-16, LEN-07b, MKT-M01, M5)")
  process.exit(2)
}
console.error(
  [
    "e2e/CONVENTIONS.md § Running a suite: -g runs ONE test out of a serial suite.",
    "Suites whose setup DESTROYS state the later tests rebuild (admin's clean slate, onboarding's",
    "ToU rollback) must be run whole — filtering there either runs the subset on stale state or",
    "wrecks the board for everything filtered out. Use this for a read-only re-check of one row;",
    "otherwise run the whole file, then run it whole again.",
    "",
  ].join("\n"),
)
const r = spawnSync(
  "npx",
  ["playwright", "test", "--project=board", "--no-deps", "-g", `${id}:`],
  { stdio: "inherit", env: { ...process.env, PW_VIDEO: process.env.PW_VIDEO ?? "on" } },
)
process.exit(r.status ?? 1)
