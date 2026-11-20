/// Whether an agreement signed at `timeSigned` may use a template retired at
/// `retiredAt`. Retiring stops new signatures only: an agreement signed while
/// the template was offered keeps it, so a market whose deployment was still
/// pending (a Safe collecting approvals, say) can still have its MLA uploaded.
/// The signing time comes from the borrower within the signing window, so a
/// borrower can use their own just-retired custom MLA for up to that window.
export const isMlaTemplateSignableAt = (
  retiredAt: Date | string | null | undefined,
  timeSigned: number,
) => retiredAt == null || timeSigned < new Date(retiredAt).getTime()

const RETIRED_MLA_TEMPLATE_ERROR = "RetiredMlaTemplateError"

/// Refuses to fill a template for signing once it is retired, before anything
/// is signed or deployed with it.
export const assertMlaTemplateSignableAt = (
  template: { name: string; retiredAt?: Date | string | null },
  timeSigned: number,
) => {
  if (!isMlaTemplateSignableAt(template.retiredAt, timeSigned)) {
    const error = new Error(
      `The MLA "${template.name}" has been retired. Choose another MLA and sign again.`,
    )
    error.name = RETIRED_MLA_TEMPLATE_ERROR
    throw error
  }
}

export const isRetiredMlaTemplateError = (error: unknown): error is Error =>
  error instanceof Error && error.name === RETIRED_MLA_TEMPLATE_ERROR
