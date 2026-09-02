import type { ServiceAgreementPartyInput } from "@/app/api/service-agreement/interface"
import { ROUTES } from "@/routes"
import { isServiceAgreementPath } from "@/utils/serviceAgreementParty"

/**
 * A return target is a navigation destination named by the URL, so it is input
 * under the caller's control and this module is the allowlist that makes it
 * safe to hand to `router.push`.
 *
 * The rule is: parse first, then check the parsed pathname against known
 * prefixes. A substring check on the raw string is not enough, because
 * "/lender/../../evil" satisfies one and resolves to "/evil". Anything that
 * fails is refused whole and replaced by the party root; nothing is partially
 * sanitised and then trusted.
 *
 * Before this existed the agreement page navigated by browser history, which
 * sent a user who opened the URL directly out of the application, in one case
 * immediately after a successful signature. See issue 32 for the same defect
 * on the lender market sidebar.
 */
const ALLOWED_PREFIXES = [ROUTES.lender.root, ROUTES.borrower.root]

const PARSE_ORIGIN = "https://return-target.invalid"

export const partyRoot = (party: ServiceAgreementPartyInput): string =>
  party === "Borrower" ? ROUTES.borrower.root : ROUTES.lender.root

/** The validated in-app path, or null when the value cannot be trusted. */
export const parseReturnTarget = (
  value: string | null | undefined,
): string | null => {
  if (!value) return null

  // Must be a bare path on this origin. A scheme, an authority, a
  // protocol-relative "//host" prefix, or a backslash a browser may fold into
  // one are all refused rather than repaired.
  if (!value.startsWith("/")) return null
  if (value.startsWith("//")) return null
  if (value.includes("\\")) return null

  let url: URL
  try {
    url = new URL(value, PARSE_ORIGIN)
  } catch {
    return null
  }
  if (url.origin !== PARSE_ORIGIN) return null

  const { pathname } = url
  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
  if (!allowed) return null

  // Next canonicalizes trailing slashes. Compare that canonical route so an
  // equivalent agreement URL cannot return straight back into this page.
  const routePathname = pathname.replace(/\/+$/, "")
  if (isServiceAgreementPath(routePathname)) return null

  return `${pathname}${url.search}`
}

export const resolveReturnTarget = (
  value: string | null | undefined,
  party: ServiceAgreementPartyInput,
): string => parseReturnTarget(value) ?? partyRoot(party)

export const readReturnTargetParam = (search: string): string | null =>
  new URLSearchParams(search).get("returnTo")

/** The target carried on the current URL, or the party root. */
export const currentReturnTarget = (
  party: ServiceAgreementPartyInput,
): string => {
  if (typeof window === "undefined") return partyRoot(party)
  return resolveReturnTarget(
    readReturnTargetParam(window.location.search),
    party,
  )
}

/**
 * Attach the page being left to an agreement redirect, so the agreement page
 * can return there. The value is validated here too, so a target the consumer
 * would refuse never reaches the URL in the first place.
 */
export const withReturnTarget = (
  redirectPath: string,
  from: string | null,
): string => {
  if (!isServiceAgreementPath(redirectPath)) return redirectPath

  const search = typeof window === "undefined" ? "" : window.location.search
  const target = parseReturnTarget(from ? `${from}${search}` : null)
  if (!target) return redirectPath

  return `${redirectPath}?returnTo=${encodeURIComponent(target)}`
}
