import { z } from "zod"

import { EXPORT_CHAIN_IDS, ExportChainId } from "./types"

const rpcConfigSchema = z.record(z.string(), z.array(z.string().url()).min(1))

export function getExportRpcUrls(): Record<ExportChainId, string[]> {
  const raw = process.env.EXPORT_RPC_URLS
  if (!raw) throw new Error("EXPORT_RPC_URLS is required")

  const parsed = rpcConfigSchema.parse(JSON.parse(raw))
  return Object.fromEntries(
    EXPORT_CHAIN_IDS.map((chainId) => {
      const urls = parsed[String(chainId)]
      if (!urls)
        throw new Error(`No export RPC configured for chain ${chainId}`)
      return [chainId, urls]
    }),
  ) as Record<ExportChainId, string[]>
}

export function getExportStorageConfig() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = process.env.EXPORT_STORAGE_BUCKET
  if (!url || !serviceRoleKey || !bucket) {
    throw new Error(
      "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and EXPORT_STORAGE_BUCKET are required",
    )
  }
  return { url, serviceRoleKey, bucket }
}

export function getExportStorageNamespace() {
  const explicit = process.env.EXPORT_STORAGE_NAMESPACE
  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "local"
  const branch = process.env.VERCEL_GIT_COMMIT_REF
  const value = explicit ?? [environment, branch].filter(Boolean).join("-")
  const normalized = value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")
  if (!normalized || normalized.length > 100) {
    throw new Error("EXPORT_STORAGE_NAMESPACE is invalid")
  }
  return normalized
}

export function getEtherscanApiKey() {
  const value = process.env.ETHERSCAN_API_KEY
  if (!value) throw new Error("ETHERSCAN_API_KEY is required")
  return value
}
