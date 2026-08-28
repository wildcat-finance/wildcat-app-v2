import type {
  PolicyAccessListMember,
  PolicyMarketsAndLenders,
} from "@wildcatfi/wildcat-sdk"

import { mergePolicyLenderAccess } from "./policyLenderAccess"

type PolicyLender = PolicyMarketsAndLenders["lenders"][number]

const ACCESS_MEMBER = "0x0000000000000000000000000000000000000001"
const CREDENTIAL_LENDER = "0x0000000000000000000000000000000000000002"

const makeAccessListMember = (address: string): PolicyAccessListMember =>
  ({
    address,
    memberships: [
      {
        provider: { providerAddress: "0xprovider" },
        membership: {
          account: address,
          updatedAt: { blockTimestamp: 123n },
        },
      },
    ],
  }) as PolicyAccessListMember

const makeLender = (address: string): PolicyLender =>
  ({
    address,
    addedTimestamp: 456,
    credential: { lastProvider: { providerAddress: "0xprovider" } },
    activeMarkets: [],
  }) as unknown as PolicyLender

describe("mergePolicyLenderAccess", () => {
  it("surfaces AccessList members without fabricating credentials", () => {
    expect(
      mergePolicyLenderAccess([], [makeAccessListMember(ACCESS_MEMBER)]),
    ).toEqual([
      expect.objectContaining({
        address: ACCESS_MEMBER,
        lender: undefined,
        sources: ["access-list"],
        isAuthorized: true,
        addedTimestamp: 123,
      }),
    ])
  })

  it("deduplicates members with credential history and retains both sources", () => {
    const [row] = mergePolicyLenderAccess(
      [makeLender(ACCESS_MEMBER.toUpperCase())],
      [makeAccessListMember(ACCESS_MEMBER)],
    )

    expect(row.sources).toEqual(["access-list", "credential"])
    expect(row.lender?.address).toBe(ACCESS_MEMBER.toUpperCase())
    expect(row.accessListMember?.address).toBe(ACCESS_MEMBER)
  })

  it("retains credential-only lender history", () => {
    expect(
      mergePolicyLenderAccess([makeLender(CREDENTIAL_LENDER)], []),
    ).toEqual([
      expect.objectContaining({
        address: CREDENTIAL_LENDER,
        sources: ["credential"],
        isAuthorized: true,
        addedTimestamp: 456,
      }),
    ])
  })
})
