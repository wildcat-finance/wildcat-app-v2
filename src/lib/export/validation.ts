import { createHash } from "node:crypto"

import { z } from "zod"

import {
  CanonicalExportRequest,
  EXPORT_CHAIN_IDS,
  ExportRequest,
  MAX_EXPORT_ADDRESSES,
  MAX_EXPORT_MARKETS,
} from "./types"
import { EXPORT_PIPELINE_VERSION } from "./version"

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/)
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value,
    "Invalid calendar date",
  )

const exportRequestSchema = z
  .object({
    chainId: z
      .number()
      .refine((value) => EXPORT_CHAIN_IDS.includes(value as never)),
    markets: z.union([
      z.literal("all"),
      z.array(address).min(1).max(MAX_EXPORT_MARKETS),
    ]),
    statements: z
      .array(z.enum(["market_condition", "position", "borrower"]))
      .max(3)
      .default(["market_condition"]),
    addresses: z.array(address).max(MAX_EXPORT_ADDRESSES).default([]),
    dateFrom: isoDate.optional(),
    dateTo: isoDate.optional(),
    format: z.enum(["pdf", "xlsx"]).default("pdf"),
    snapshotBlock: z.string().regex(/^\d+$/).optional(),
  })
  .superRefine((value, context) => {
    if (value.statements.includes("position") && value.addresses.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["addresses"],
        message: "At least one address is required for position statements",
      })
    }
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateTo"],
        message: "dateTo must be on or after dateFrom",
      })
    }
  })

export function parseExportRequest(value: unknown): ExportRequest {
  const parsed = exportRequestSchema.parse(value)
  return parsed as ExportRequest
}

export function canonicalizeExportRequest(
  request: ExportRequest,
  snapshotBlock: number,
  snapshotBlockHash: string,
): CanonicalExportRequest {
  return {
    chainId: request.chainId,
    markets:
      request.markets === "all"
        ? "all"
        : [
            ...new Set(request.markets.map((item) => item.toLowerCase())),
          ].sort(),
    statements: [
      ...new Set(request.statements),
    ].sort() as CanonicalExportRequest["statements"],
    addresses: [
      ...new Set(request.addresses.map((item) => item.toLowerCase())),
    ].sort(),
    ...(request.dateFrom ? { dateFrom: request.dateFrom } : {}),
    ...(request.dateTo ? { dateTo: request.dateTo } : {}),
    format: request.format,
    snapshotBlock: String(snapshotBlock),
    snapshotBlockHash: snapshotBlockHash.toLowerCase(),
  }
}

export function hashExportRequest(request: CanonicalExportRequest) {
  return createHash("sha256")
    .update(
      JSON.stringify({ ...request, pipelineVersion: EXPORT_PIPELINE_VERSION }),
    )
    .digest("hex")
}
