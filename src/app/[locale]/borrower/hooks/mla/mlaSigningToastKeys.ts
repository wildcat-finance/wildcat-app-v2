/**
 * Signing without a template signs the refusal message rather than an
 * agreement, so no toast may claim an MLA was signed. The keys stay literal so
 * the locale checker can verify both branches.
 */
const MLA_SIGNING_TOAST_KEYS = {
  agreement: {
    pending: "borrower.createMarket.mla.signing.agreement.pending",
    success: "borrower.createMarket.mla.signing.agreement.success",
    error: "borrower.createMarket.mla.signing.agreement.error",
  },
  refusal: {
    pending: "borrower.createMarket.mla.signing.refusal.pending",
    success: "borrower.createMarket.mla.signing.refusal.success",
    error: "borrower.createMarket.mla.signing.refusal.error",
  },
} as const

export const getMlaSigningToastKeys = (mlaTemplateId: number | undefined) =>
  MLA_SIGNING_TOAST_KEYS[mlaTemplateId === undefined ? "refusal" : "agreement"]
