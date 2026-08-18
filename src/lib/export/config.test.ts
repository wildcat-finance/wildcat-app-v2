/** @jest-environment node */

import { getExportStorageNamespace } from "./config"

describe("export storage namespace", () => {
  const original = process.env

  afterEach(() => {
    process.env = original
  })

  it("isolates preview branches by default", () => {
    process.env = {
      ...original,
      EXPORT_STORAGE_NAMESPACE: undefined,
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_REF: "feat/exports",
    }
    expect(getExportStorageNamespace()).toBe("preview-feat-exports")
  })

  it("honours an explicit stable namespace", () => {
    process.env = { ...original, EXPORT_STORAGE_NAMESPACE: "Production_V2" }
    expect(getExportStorageNamespace()).toBe("production_v2")
  })
})
