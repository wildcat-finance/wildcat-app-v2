import { type RoleProvider } from "@wildcatfi/wildcat-sdk"

// The hooks contract stores "this provider holds no slot in the pull list" as
// the maximum uint24. The on-chain lens surfaces that raw value; the subgraph
// reports the same absence as -1. Both mean "not a pull provider".
const NULL_PROVIDER_INDEX = 2 ** 24 - 1

/**
 * Whether a policy has a role provider lenders can pull a credential from - the
 * open access role provider attached at deployment. That is what makes a policy
 * lender self-onboarding; without it every credential has to be granted by the
 * borrower, which is a manually operated allowlist.
 *
 * Keyed on `pullProviderIndex`, never on the `isPullProvider` boolean. The hooks
 * constructor registers the borrower as a push-only provider on every policy,
 * and the subgraph reports that entry with `isPullProvider: true` next to
 * `pullProviderIndex: -1`. Trusting the boolean made every policy - including
 * freshly deployed borrower operated allowlists - read back as self-onboarding.
 *
 * Counting providers is wrong for the same reason: whether the borrower entry is
 * enumerated depends on the data source, and revoked providers stay in the list
 * with `isApproved: false`.
 */
export const hasActivePullRoleProvider = (
  roleProviders: readonly Pick<
    RoleProvider,
    "isApproved" | "pullProviderIndex"
  >[],
): boolean =>
  roleProviders.some(
    ({ isApproved, pullProviderIndex }) =>
      isApproved &&
      pullProviderIndex >= 0 &&
      pullProviderIndex !== NULL_PROVIDER_INDEX,
  )
