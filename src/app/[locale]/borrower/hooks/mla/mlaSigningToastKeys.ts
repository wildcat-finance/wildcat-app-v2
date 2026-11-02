/**
 * Signing without a template signs the refusal message rather than an
 * agreement, so no toast may claim an MLA was signed. The keys stay literal so
 * the locale checker can verify both branches.
 */
const MLA_SIGNING_TOAST_KEYS = {
  agreement: {
    pending: "createNewMarket.mla.signing.agreement.pending",
    success: "createNewMarket.mla.signing.agreement.success",
    error: "createNewMarket.mla.signing.agreement.error",
  },
  refusal: {
    pending: "createNewMarket.mla.signing.refusal.pending",
    success: "createNewMarket.mla.signing.refusal.success",
    error: "createNewMarket.mla.signing.refusal.error",
  },
} as const

export const getMlaSigningToastKeys = (mlaTemplateId: number | undefined) =>
  MLA_SIGNING_TOAST_KEYS[mlaTemplateId === undefined ? "refusal" : "agreement"]
