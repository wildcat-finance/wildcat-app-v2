/** @jest-environment node */

// Opt in with a migrated, disposable Postgres database:
// EXPORT_TEST_DATABASE_URL=postgresql://... npx jest admission.integration.test.ts

import { randomUUID } from "node:crypto"

import { PrismaClient } from "@prisma/client"

import { admitExportJobWithClient, ExportAdmissionError } from "./admission"
import { reserveProviderSlots } from "./providerThrottle"
import { CanonicalExportRequest } from "../types"

const databaseUrl = process.env.EXPORT_TEST_DATABASE_URL
const describeWithDatabase = databaseUrl ? describe : describe.skip

describeWithDatabase("export job coordination against Postgres", () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl ?? "postgresql://invalid" } },
  })
  const testId = `admission-test-${randomUUID()}`
  const request: CanonicalExportRequest = {
    chainId: 1,
    markets: "all",
    statements: [],
    addresses: [],
    format: "pdf",
    snapshotBlock: "123",
    snapshotBlockHash: `0x${"1".repeat(64)}`,
  }

  afterAll(async () => {
    await prisma.exportJob.deleteMany({
      where: { requestIp: { startsWith: testId } },
    })
    await prisma.exportProviderThrottle.deleteMany({
      where: { key: { startsWith: testId } },
    })
    await prisma.$disconnect()
  })

  it("creates one job for simultaneous identical requests", async () => {
    const paramsHash = randomUUID()
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        admitExportJobWithClient(
          prisma,
          request,
          paramsHash,
          `${testId}-${index}`,
        ),
      ),
    )

    expect(results.filter((result) => result.created)).toHaveLength(1)
    expect(new Set(results.map((result) => result.jobId)).size).toBe(1)
    await prisma.exportJob.updateMany({
      where: { paramsHash },
      data: { status: "Cancelled" },
    })
  })

  it("reserves ordered provider slots atomically", async () => {
    const slots = await Promise.all(
      Array.from({ length: 6 }, () =>
        reserveProviderSlots(prisma, `${testId}-provider`, 100, 1),
      ),
    )
    const times = slots.map((slot) => slot.getTime()).sort((a, b) => a - b)

    expect(new Set(times).size).toBe(times.length)
    times.slice(1).forEach((time, index) => {
      expect(time - times[index]).toBeGreaterThanOrEqual(100)
    })
  })

  it("admits concurrent jobs up to the global capacity", async () => {
    const requests = Array.from({ length: 8 }, (_, index) => ({
      paramsHash: randomUUID(),
      requestIp: `${testId}-capacity-${index}`,
    }))
    const settled = await Promise.allSettled(
      requests.map(({ paramsHash, requestIp }) =>
        admitExportJobWithClient(prisma, request, paramsHash, requestIp),
      ),
    )
    const rejected = settled.filter((result) => result.status === "rejected")
    const results = settled.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    )

    expect(rejected).toHaveLength(0)
    expect(results.every((result) => result.created)).toBe(true)
    await expect(
      admitExportJobWithClient(
        prisma,
        request,
        randomUUID(),
        `${testId}-over-capacity`,
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ExportAdmissionError>>({
        unavailable: false,
        message: "Export capacity is currently full; try again shortly",
      }),
    )
  })
})
