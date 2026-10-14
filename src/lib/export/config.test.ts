/** @jest-environment node */

import { getExportRpcUrls, getExportStorageNamespace } from "./config"

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

describe("per-chain export RPC configuration", () => {
  const original = process.env.EXPORT_RPC_URLS
  afterEach(() => {
    if (original === undefined) delete process.env.EXPORT_RPC_URLS
    else process.env.EXPORT_RPC_URLS = original
  })

  it("requires only the requested chain's endpoints", () => {
    process.env.EXPORT_RPC_URLS = JSON.stringify({
      1: ["https://ethereum.example"],
    })
    expect(getExportRpcUrls(1)).toEqual(["https://ethereum.example"])
    expect(() => getExportRpcUrls(763373)).toThrow(
      "No export RPC configured for chain 763373",
    )
    process.env.EXPORT_RPC_URLS = JSON.stringify({
      763373: ["https://ink.example"],
    })
    expect(getExportRpcUrls(763373)).toEqual(["https://ink.example"])
  })
})
