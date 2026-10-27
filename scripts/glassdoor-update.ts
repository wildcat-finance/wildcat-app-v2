import { loadEnvConfig } from "@next/env"
import { PrismaClient } from "@prisma/client"

import { runGlassDoorUpdate } from "../src/lib/glassdoor/pipeline/update"

// Runs one Glass Door update against the database and storage in .env,
// outside the Workflow runtime. On an empty database this is the backfill:
// with no function time limit, it admits every new market and builds them all.

async function main() {
  loadEnvConfig(process.cwd())
  const database = new PrismaClient()
  try {
    const result = await runGlassDoorUpdate({
      database,
      newMarketsPerRun: Number.POSITIVE_INFINITY,
      firstBuildBudgetMs: Number.POSITIVE_INFINITY,
      log: (message) =>
        process.stdout.write(`${new Date().toISOString()} ${message}\n`),
    })
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } finally {
    await database.$disconnect()
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  )
  process.exitCode = 1
})
