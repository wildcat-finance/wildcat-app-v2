import { prisma } from "@/lib/db"

import { runGlassDoorUpdate } from "../pipeline/update"

// One durable step: the update is idempotent (committed scan ranges and
// create-only datasets are reused, and every run stages its own publication),
// so a retried step simply runs the update again.

async function runUpdate() {
  "use step"

  return runGlassDoorUpdate({
    database: prisma,
    log: (message) => {
      // eslint-disable-next-line no-console
      console.log(`[Glass Door] ${message}`)
    },
  })
}

export async function glassDoorUpdateWorkflow() {
  "use workflow"

  return runUpdate()
}
