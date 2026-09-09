/* eslint-disable no-await-in-loop */

import { ExportJobStatus } from "@prisma/client"

export const EXPORT_RETENTION_DAYS = 30
export const EXPORT_CLEANUP_BATCH_SIZE = 100
export const EXPORT_CLEANUP_MAX_BATCHES = 10

type CleanupDatabase = {
  exportJob: {
    findMany(
      args: unknown,
    ): Promise<{ id: string; artifactKey: string | null }[]>
    deleteMany(args: unknown): Promise<unknown>
  }
  exportArtifact: {
    findMany(args: unknown): Promise<{ key: string }[]>
    deleteMany(args: unknown): Promise<unknown>
  }
}

export async function cleanupExpiredExportJobs(
  database: CleanupDatabase,
  removeObjects: (keys: string[]) => Promise<void>,
  now = new Date(),
) {
  const completedBefore = new Date(
    now.getTime() - EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1_000,
  )
  let deleted = 0
  for (let batch = 0; batch < EXPORT_CLEANUP_MAX_BATCHES; batch += 1) {
    const jobs = await database.exportJob.findMany({
      where: {
        status: {
          in: [
            ExportJobStatus.Completed,
            ExportJobStatus.Failed,
            ExportJobStatus.Cancelled,
          ],
        },
        completedAt: { lt: completedBefore },
      },
      orderBy: [{ completedAt: "asc" }, { id: "asc" }],
      take: EXPORT_CLEANUP_BATCH_SIZE,
      select: { id: true, artifactKey: true },
    })
    if (jobs.length === 0) break
    const jobIds = jobs.map(({ id }) => id)
    const jobArtifacts = await database.exportArtifact.findMany({
      where: { jobId: { in: jobIds } },
      select: { key: true },
    })
    await removeObjects([
      ...new Set([
        ...jobs.flatMap(({ artifactKey }) =>
          artifactKey ? [artifactKey] : [],
        ),
        ...jobArtifacts.map(({ key }) => key),
      ]),
    ])
    await database.exportArtifact.deleteMany({
      where: { jobId: { in: jobIds } },
    })
    await database.exportJob.deleteMany({
      where: { id: { in: jobIds } },
    })
    deleted += jobs.length
    if (jobs.length < EXPORT_CLEANUP_BATCH_SIZE) break
  }
  for (let batch = 0; batch < EXPORT_CLEANUP_MAX_BATCHES; batch += 1) {
    const artifacts = await database.exportArtifact.findMany({
      where: {
        kind: "Part",
        lastAccessedAt: { lt: completedBefore },
      },
      orderBy: [{ lastAccessedAt: "asc" }, { key: "asc" }],
      take: EXPORT_CLEANUP_BATCH_SIZE,
      select: { key: true },
    })
    if (artifacts.length === 0) break
    const keys = artifacts.map(({ key }) => key)
    await removeObjects(keys)
    await database.exportArtifact.deleteMany({ where: { key: { in: keys } } })
    if (artifacts.length < EXPORT_CLEANUP_BATCH_SIZE) break
  }
  return deleted
}
