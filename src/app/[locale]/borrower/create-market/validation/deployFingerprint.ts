import { MarketValidationSchemaType } from "./validationSchema"

/**
 * Stable fingerprint of the whole create-market form, used to decide whether a
 * market agreement signature still covers what is about to be deployed.
 *
 * The pre-deploy guard rebuilds the MLA message and compares it against the
 * signed one, which only sees the parameters that appear in the agreement text.
 * Policy-level settings are absent from it - access control above all, but also
 * the policy selection, its name and the wrapper - so changing them after
 * signing left the signature valid, nothing asked for a re-sign, and the
 * confirmation screen could advertise a selection the signature never covered.
 *
 * Fingerprint every field rather than maintaining a second list of
 * "policy-relevant" ones: an incomplete list is what caused the bug, and a new
 * form field would silently fall through the same gap.
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
