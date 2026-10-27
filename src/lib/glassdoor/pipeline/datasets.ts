import { getExportStorageNamespace } from "../../export/config"
import {
  exportObjectExists,
  getExportObject,
  listExportObjects,
  putExportObject,
  removeExportObjects,
} from "../../export/jobs/storage"
import {
  deserializeDataset,
  serializeDataset,
} from "../../export/serialize/dataset"
import { MarketDataset } from "../../export/types"
import { EXPORT_PIPELINE_VERSION } from "../../export/version"

// Analytics keeps its own checked datasets under an `analytics/` folder of the
// export bucket, outside the export's 30-day cleanup of `parts/`. Every
// rebuild adds one, so each market keeps only its newest two plus the newest
// of each earlier month.

export const analyticsDatasetKey = (dataset: MarketDataset) =>
  [
    getExportStorageNamespace(),
    "analytics",
    `v${EXPORT_PIPELINE_VERSION}`,
    dataset.market.chainId,
    dataset.market.address,
    `${dataset.snapshotBlock}-${dataset.snapshotBlockHash}.json.gz`,
  ].join("/")

/** Whether a stored dataset is from this pipeline version; older ones can't be checkpoints. */
export const isCurrentDatasetKey = (key: string) =>
  key.split("/").includes(`v${EXPORT_PIPELINE_VERSION}`)

/** Uploads are create-only, so a retried save of the same dataset is a no-op. */
export async function saveAnalyticsDataset(dataset: MarketDataset) {
  const key = analyticsDatasetKey(dataset)
  try {
    await putExportObject(key, serializeDataset(dataset), "application/gzip")
  } catch (error) {
    if (!(await exportObjectExists(key))) throw error
  }
  return key
}

export async function loadAnalyticsDataset(key: string) {
  return deserializeDataset(await getExportObject(key))
}

const DATASET_NAME = /^(\d+)-0x[0-9a-f]+\.json\.gz$/
const NEWEST_KEPT = 2

/**
 * Dataset names to delete from one market's folder: all but the newest two,
 * the newest of each UTC month by upload time, and `current`. Names that are
 * not datasets are left alone.
 */
export function datasetsToPrune(
  objects: { name: string; createdAt: string }[],
  current: string,
) {
  const datasets = objects
    .filter((object) => DATASET_NAME.test(object.name))
    .sort(
      (a, b) =>
        Number(DATASET_NAME.exec(b.name)![1]) -
        Number(DATASET_NAME.exec(a.name)![1]),
    )
  const months = new Set<string>()
  return datasets
    .filter((object, index) => {
      const month = object.createdAt.slice(0, 7)
      const newestOfMonth = !months.has(month)
      months.add(month)
      return index >= NEWEST_KEPT && !newestOfMonth && object.name !== current
    })
    .map((object) => object.name)
}

/** Applies the retention rule to the folder of a market's current dataset. */
export async function pruneAnalyticsDatasets(currentKey: string) {
  const slash = currentKey.lastIndexOf("/")
  const folder = currentKey.slice(0, slash)
  const names = datasetsToPrune(
    await listExportObjects(folder),
    currentKey.slice(slash + 1),
  )
  await removeExportObjects(names.map((name) => `${folder}/${name}`))
  return names.length
}
