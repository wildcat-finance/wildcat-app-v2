/**
 * Indexed lender data may replace the local draft until the borrower starts
 * editing it. This keeps polling live without clobbering unsaved changes.
 */
export const shouldSyncPolicyLenderDraft = <TRow extends { status: string }>(
  rows: readonly TRow[],
): boolean => rows.every(({ status }) => status === "old")
