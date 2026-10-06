/** @jest-environment node */

// Opt in with a migrated, disposable Postgres database:
// EXPORT_TEST_DATABASE_URL=postgresql://... npx jest admission.integration.test.ts

import { randomUUID } from "node:crypto"

import { PrismaClient } from "@prisma/client"

import {
  admitExportJobWithClient as admitWithSubscriber,
  cancelExportSubscriptionWithClient,
  ExportAdmissionError,
} from "./admission"
import { claimPartBuildWithClient } from "./partBuild"
import { reserveProviderSlots } from "./providerThrottle"
import { CanonicalExportRequest } from "../types"

const admitExportJobWithClient = (
  database: PrismaClient,
  request: CanonicalExportRequest,
  hash: string,
  ip: string,
) => admitWithSubscriber(database, request, hash, ip, ip)

const databaseUrl = process.env.EXPORT_TEST_DATABASE_URL
const describeWithDatabase = databaseUrl ? describe : describe.skip

describeWithDatabase("export job coordination against Postgres", () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl ?? "postgresql://invalid" } },
  })
  const testId = `admission-test-${randomUUID()}`
  const request: CanonicalExportRequest = {
    chainId: 1,
    markets: ["0x1111111111111111111111111111111111111111"],
    statements: [],
    addresses: [],
    format: "pdf",
    snapshotBlock: "123",
    snapshotBlockHash: `0x${"1".repeat(64)}`,
  }

  afterEach(async () => {
    await prisma.exportJob.deleteMany({
      where: { requestIp: { startsWith: testId } },
    })
  })

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
  it("serializes joins against final-subscriber cancellation", async () => {
    const hash = randomUUID()
    const original = await admitExportJobWithClient(
      prisma,
      request,
      hash,
      `${testId}-original`,
    )
    const [, joined] = await Promise.all([
      cancelExportSubscriptionWithClient(
        prisma,
        original.jobId,
        `${testId}-original`,
      ),
      admitExportJobWithClient(prisma, request, hash, `${testId}-joined`),
    ])
    const job = await prisma.exportJob.findUniqueOrThrow({
      where: { id: joined.jobId },
      include: { subscriptions: true },
    })
    expect(job.status).toBe("Queued")
    expect(job.subscriptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clientId: `${testId}-joined`,
          cancelledAt: null,
        }),
      ]),
    )
    await cancelExportSubscriptionWithClient(
      prisma,
      joined.jobId,
      `${testId}-joined`,
    )
  })

  it("gives simultaneous builders one part owner and recovers a terminal owner's claim", async () => {
    const first = await admitExportJobWithClient(
      prisma,
      request,
      randomUUID(),
      `${testId}-part-first`,
    )
    const second = await admitExportJobWithClient(
      prisma,
      request,
      randomUUID(),
      `${testId}-part-second`,
    )
    const key = `${testId}-part-key`
    const claims = await Promise.all([
      claimPartBuildWithClient(prisma, key, first.jobId),
      claimPartBuildWithClient(prisma, key, second.jobId),
    ])
    expect(claims.filter(Boolean)).toHaveLength(1)
    const owner = claims[0] ? first : second
    const waiter = claims[0] ? second : first
    await prisma.exportJob.update({
      where: { id: owner.jobId },
      data: { status: "Failed" },
    })
    expect(await claimPartBuildWithClient(prisma, key, waiter.jobId)).toBe(true)
    await prisma.exportJob.updateMany({
      where: { id: { in: [first.jobId, second.jobId] } },
      data: { status: "Cancelled" },
    })
  })

  it("cascades subscriptions and claims when expired jobs are removed", async () => {
    const job = await admitExportJobWithClient(
      prisma,
      request,
      randomUUID(),
      `${testId}-cascade`,
    )
    const key = `${testId}-cascade-part`
    await claimPartBuildWithClient(prisma, key, job.jobId)
    await prisma.exportJob.delete({ where: { id: job.jobId } })
    expect(
      await prisma.exportJobSubscription.count({ where: { jobId: job.jobId } }),
    ).toBe(0)
    expect(await prisma.exportPartBuild.count({ where: { key } })).toBe(0)
  })
})
