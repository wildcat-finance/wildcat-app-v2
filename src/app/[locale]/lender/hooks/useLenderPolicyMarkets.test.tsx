/* eslint-disable import/no-extraneous-dependencies */
import { PropsWithChildren } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
import { buildSchema, DocumentNode, execute, validate } from "graphql"

import { useLenderPolicyMarkets } from "./useLenderPolicyMarkets"

const mockNetwork = jest.fn()
const mockWallet = jest.fn()
const mockQuery = jest.fn()

jest.mock("@/hooks/useCurrentNetwork", () => ({
  useCurrentNetwork: () => mockNetwork(),
}))
jest.mock("@/hooks/useEthersSigner", () => ({
  useEthersProvider: () => mockWallet(),
}))
jest.mock("@/providers/SubgraphProvider", () => ({
  useSubgraphClient: () => ({ query: mockQuery }),
}))
jest.mock("./useLendersMarkets", () => ({
  LENDER_DASHBOARD_INDEXED_REFRESH_INTERVAL: 60_000,
}))
jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  logger: { error: jest.fn() },
}))

// Match the queried subgraph fields and their default page limits. Executing
// the actual documents catches missing cursors/limits as well as invalid joins.
const schemaDefinition = `
  scalar Bytes
  enum OrderBy { id }
  enum OrderDirection { asc desc }
  input RoleProviderMember_filter { account: Bytes, isMember: Boolean, id_gt: ID }
  input RoleProvider_filter { providerInstance_in: [String!], isApproved: Boolean, id_gt: ID }
  input LenderHooksAccess_filter { lender: Bytes, isBlockedFromDeposits: Boolean, id_gt: ID }
  type Provider { id: ID! }
  type Hooks { id: ID! }
  type Membership { id: ID!, provider: Provider! }
  type Attachment { id: ID!, hooks: Hooks! }
  type LastProvider { isApproved: Boolean! }
  type Access { id: ID!, hooks: Hooks!, lastProvider: LastProvider }
  type Query {
    roleProviderMembers(first: Int = 100, orderBy: OrderBy, orderDirection: OrderDirection, where: RoleProviderMember_filter): [Membership!]!
    roleProviders(first: Int = 100, orderBy: OrderBy, orderDirection: OrderDirection, where: RoleProvider_filter): [Attachment!]!
    lenderHooksAccesses(first: Int = 100, orderBy: OrderBy, orderDirection: OrderDirection, where: LenderHooksAccess_filter): [Access!]!
  }
`
const schema = buildSchema(schemaDefinition)
const legacySchema = buildSchema(
  schemaDefinition.replaceAll("id_gt: ID", "id_gt: String"),
)

const address = (id: number) => `0x${id.toString(16).padStart(40, "0")}`
const lender = address(100)
const hookA = address(200)
const hookB = address(201)
const hookC = address(202)
const marketA = address(300)
const marketB = address(301)
const marketC = address(302)

const membership = (id: number) => ({
  id: address(id),
  account: lender,
  isMember: true,
  provider: { id: address(id) },
})
const attachment = (id: number, providerId = 1, hooksAddress = hookA) => ({
  id: address(id),
  providerInstance: address(providerId),
  isApproved: true,
  hooks: { id: hooksAddress },
})
const access = (id: number, hooksAddress = hookB) => ({
  id: address(id),
  lender,
  isBlockedFromDeposits: false,
  lastProvider: { isApproved: true },
  hooks: { id: hooksAddress },
})
const account = (marketAddress: string, hooksAddress: string): MarketAccount =>
  ({
    market: {
      address: marketAddress,
      hooksConfig: { hooksAddress },
    },
  }) as MarketAccount

type Collection =
  | "roleProviderMembers"
  | "roleProviders"
  | "lenderHooksAccesses"
type PageArguments = { first: number; where: { id_gt: string } }
let members: ReturnType<typeof membership>[]
let attachments: ReturnType<typeof attachment>[]
let accesses: ReturnType<typeof access>[]
let failedCollections: Set<Collection>
let failLaterAccessPage: boolean
let accounts: MarketAccount[]

const page = <T extends { id: string }>(
  collection: Collection,
  rows: T[],
  { first, where }: PageArguments,
) => {
  if (
    failedCollections.has(collection) ||
    (failLaterAccessPage && collection === "lenderHooksAccesses" && where.id_gt)
  ) {
    throw new Error("Subgraph request failed")
  }
  return rows
    .filter(({ id }) => id > where.id_gt)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, first)
}

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const rendered = renderHook(() => useLenderPolicyMarkets(accounts), {
    wrapper,
  })
  return { ...rendered, client }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockNetwork.mockReturnValue({ targetChainId: 11155111 })
  mockWallet.mockReturnValue({ address: lender })
  members = [membership(1)]
  attachments = [attachment(1)]
  accesses = [access(1)]
  failedCollections = new Set()
  failLaterAccessPage = false
  accounts = [
    account(marketA, hookA),
    account(marketB, hookB),
    account(marketC, hookC),
  ]
  mockQuery.mockImplementation(
    async ({
      query,
      variables,
    }: {
      query: DocumentNode
      variables: Record<string, unknown>
    }) => {
      const querySchema =
        mockNetwork().targetChainId === 11155111 ? schema : legacySchema
      const errors = validate(querySchema, query)
      if (errors.length) throw errors[0]
      const response = await execute({
        schema: querySchema,
        document: query,
        variableValues: variables,
        rootValue: {
          roleProviderMembers: (
            args: PageArguments & {
              where: { account: string; isMember: boolean }
            },
          ) =>
            page(
              "roleProviderMembers",
              members.filter(
                (row) =>
                  row.account === args.where.account &&
                  row.isMember === args.where.isMember,
              ),
              args,
            ),
          roleProviders: (
            args: PageArguments & {
              where: { providerInstance_in: string[]; isApproved: boolean }
            },
          ) =>
            page(
              "roleProviders",
              attachments.filter(
                (row) =>
                  args.where.providerInstance_in.includes(
                    row.providerInstance,
                  ) && row.isApproved === args.where.isApproved,
              ),
              args,
            ),
          lenderHooksAccesses: (
            args: PageArguments & {
              where: { lender: string; isBlockedFromDeposits: boolean }
            },
          ) =>
            page(
              "lenderHooksAccesses",
              accesses.filter(
                (row) =>
                  row.lender === args.where.lender &&
                  row.isBlockedFromDeposits ===
                    args.where.isBlockedFromDeposits,
              ),
              args,
            ),
        },
      })
      if (response.errors?.length) throw response.errors[0]
      return response
    },
  )
})

it("combines both grant sources and deduplicates their markets", async () => {
  accesses.push(access(2, hookA))
  const { result } = setup()
  await waitFor(() =>
    expect([...result.current.policyMarkets]).toEqual([marketA, marketB]),
  )
})

it.each([1, 9745, 9746])(
  "uses only direct hook grants on legacy chain %i",
  async (chainId) => {
    mockNetwork.mockReturnValue({ targetChainId: chainId })
    const { result } = setup()
    await waitFor(() =>
      expect([...result.current.policyMarkets]).toEqual([marketB]),
    )
    expect(mockQuery).toHaveBeenCalledTimes(1)
  },
)

it.each(["roleProviderMembers", "roleProviders"] as const)(
  "retains membership grants when %s fails while updating the other source",
  async (collection) => {
    const { result, client } = setup()
    await waitFor(() =>
      expect([...result.current.policyMarkets]).toEqual([marketA, marketB]),
    )
    failedCollections.add(collection)
    accesses = [access(1, hookC)]
    await act(async () => {
      await client.refetchQueries()
    })
    await waitFor(() =>
      expect([...result.current.policyMarkets]).toEqual([marketA, marketC]),
    )
  },
)

it("retains direct grants when their refresh fails while updating membership", async () => {
  const { result, client } = setup()
  await waitFor(() =>
    expect([...result.current.policyMarkets]).toEqual([marketA, marketB]),
  )
  failedCollections.add("lenderHooksAccesses")
  attachments = [attachment(1, 1, hookC)]
  await act(async () => {
    await client.refetchQueries()
  })
  await waitFor(() =>
    expect([...result.current.policyMarkets]).toEqual([marketB, marketC]),
  )
})

it("shows a successful source even if the other source fails on first load", async () => {
  failedCollections.add("roleProviderMembers")
  const { result } = setup()
  await waitFor(() =>
    expect([...result.current.policyMarkets]).toEqual([marketB]),
  )
})

it("removes a revoked membership after a successful refresh", async () => {
  const { result, client } = setup()
  await waitFor(() =>
    expect([...result.current.policyMarkets]).toEqual([marketA, marketB]),
  )
  members = []
  await act(async () => {
    await client.refetchQueries()
  })
  await waitFor(() =>
    expect([...result.current.policyMarkets]).toEqual([marketB]),
  )
})

it("does not publish an incomplete direct-grant page when a later page fails", async () => {
  const { result, client } = setup()
  await waitFor(() =>
    expect([...result.current.policyMarkets]).toEqual([marketA, marketB]),
  )
  accesses = Array.from({ length: 1001 }, (_, i) => access(i + 1, hookC))
  failLaterAccessPage = true
  await act(async () => {
    await client.refetchQueries()
  })
  expect(
    client
      .getQueryCache()
      .getAll()
      .some((query) => query.state.status === "error"),
  ).toBe(true)
  expect([...result.current.policyMarkets]).toEqual([marketA, marketB])
})

it.each(["memberships", "attachments", "direct grants"])(
  "paginates more than 1000 %s",
  async (collection) => {
    accesses = []
    if (collection === "memberships") {
      members = Array.from({ length: 1001 }, (_, i) => membership(i + 1))
      attachments = [attachment(1, 1001, hookC)]
    } else if (collection === "attachments") {
      attachments = Array.from({ length: 1001 }, (_, i) =>
        attachment(i + 1, 1, i === 1000 ? hookC : hookA),
      )
    } else {
      members = []
      accesses = Array.from({ length: 1001 }, (_, i) =>
        access(i + 1, i === 1000 ? hookC : hookB),
      )
    }
    const { result } = setup()
    await waitFor(() =>
      expect(result.current.policyMarkets.has(marketC)).toBe(true),
    )
    expect(
      mockQuery.mock.calls.some(
        ([request]) => request.variables.where.id_gt !== "",
      ),
    ).toBe(true)
  },
)

it.each(["membership", "direct grant"])(
  "includes all 101 catalogue markets on one hook through %s",
  async (source) => {
    accounts = Array.from({ length: 101 }, (_, i) =>
      account(address(1000 + i), hookA),
    )
    if (source === "membership") accesses = []
    else {
      members = []
      accesses = [access(1, hookA)]
    }
    const { result } = setup()
    await waitFor(() => expect(result.current.policyMarkets.size).toBe(101))
  },
)

it("uses cached hook grants when the catalogue gains another market", async () => {
  const { result, rerender } = setup()
  await waitFor(() =>
    expect([...result.current.policyMarkets]).toEqual([marketA, marketB]),
  )
  const calls = mockQuery.mock.calls.length
  accounts = [...accounts, account(address(999), hookA)]
  rerender()
  expect(result.current.policyMarkets.has(address(999))).toBe(true)
  expect(mockQuery).toHaveBeenCalledTimes(calls)
})

it.each(["disconnect", "wallet", "chain"])(
  "does not carry grants across a %s change",
  async (change) => {
    const { result, rerender } = setup()
    await waitFor(() =>
      expect([...result.current.policyMarkets]).toEqual([marketA, marketB]),
    )
    if (change === "chain") mockNetwork.mockReturnValue({ targetChainId: 1 })
    else
      mockWallet.mockReturnValue({
        address: change === "wallet" ? address(101) : undefined,
      })
    rerender()
    expect(result.current.policyMarkets.size).toBe(0)
  },
)
