import { MarketValidationSchemaType } from "./validationSchema"

/**
 * Stable fingerprint of the complete deployment form. Safe recovery uses this
 * after a transaction is proposed or a market is deployed, where restoring
 * anything except the exact deployment would be unsafe.
 */
export const getCreateMarketFormFingerprint = (
  values: Partial<MarketValidationSchemaType>,
): string =>
  JSON.stringify(
    Object.keys(values)
      .sort()
      .map((key) => [
        key,
        values[key as keyof MarketValidationSchemaType] ?? null,
      ]),
  )

/**
 * An MLA covers the market terms, so any form change needs a new signature.
 * A refusal only covers the predicted market and signing time; those are
 * checked separately immediately before deployment. Keep the mode here so a
 * refusal can never be reused as an agreement, or vice versa.
 */
export const getCreateMarketSignatureFingerprint = (
  values: Partial<MarketValidationSchemaType>,
): string =>
  values.mla === "noMLA"
    ? JSON.stringify([["mla", "noMLA"]])
    : getCreateMarketFormFingerprint(values)
