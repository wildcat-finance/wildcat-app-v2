import type {
  PolicyAccessListMember,
  PolicyMarketsAndLenders,
} from "@wildcatfi/wildcat-sdk"

type PolicyLender = PolicyMarketsAndLenders["lenders"][number]

export type PolicyLenderAccessSource =
  | "access-list"
  | "credential"
  | "controller"

export type PolicyLenderAccess = {
  address: string
  lender?: PolicyLender
  accessListMember?: PolicyAccessListMember
  sources: PolicyLenderAccessSource[]
  isAuthorized: boolean
  addedTimestamp: number
}

export const POLICY_LENDER_ACCESS_SOURCE_KEY: Record<
  PolicyLenderAccessSource,
  string
> = {
  "access-list": "borrower.policies.lenders.accessSources.accessList",
  credential: "borrower.policies.lenders.accessSources.credential",
  controller: "borrower.policies.lenders.accessSources.controller",
}

/**
 * Keep current AccessList membership separate from credential history while
 * still producing one row per lender for policy views.
 */
export const mergePolicyLenderAccess = (
  lenders: PolicyLender[],
  accessListMembers: PolicyAccessListMember[],
): PolicyLenderAccess[] => {
  const rows = new Map<string, PolicyLenderAccess>()

  lenders.forEach((lender) => {
    const sources: PolicyLenderAccessSource[] = []
    if (lender.credential) sources.push("credential")
    if (lender.isAuthorizedOnController) sources.push("controller")

    rows.set(lender.address.toLowerCase(), {
      address: lender.address,
      lender,
      sources,
      isAuthorized:
        lender.credential?.lastProvider !== undefined ||
        lender.isAuthorizedOnController === true,
      addedTimestamp: lender.addedTimestamp,
    })
  })

  accessListMembers.forEach((accessListMember) => {
    const key = accessListMember.address.toLowerCase()
    const existing = rows.get(key)
    const membershipTimestamp = Math.min(
      ...accessListMember.memberships.map(({ membership }) =>
        Number(membership.updatedAt.blockTimestamp),
      ),
    )

    rows.set(key, {
      address: existing?.address ?? accessListMember.address,
      lender: existing?.lender,
      accessListMember,
      sources: ["access-list", ...(existing?.sources ?? [])],
      isAuthorized: true,
      addedTimestamp: existing?.addedTimestamp ?? membershipTimestamp,
    })
  })

  return Array.from(rows.values()).sort((a, b) =>
    a.address.localeCompare(b.address),
  )
}
