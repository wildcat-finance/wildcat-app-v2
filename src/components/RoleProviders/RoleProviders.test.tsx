/* eslint-disable import/no-extraneous-dependencies */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import {
  getDeploymentAddress,
  iOpenTermHooksAbi,
  kycRoleProviderAbi,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import {
  type Address,
  decodeFunctionData,
  encodeErrorResult,
  getAddress,
  type Hex,
} from "viem"

import { KycAdminSection } from "@/app/[locale]/admin/components/KycAdminSection"
import { useEthersProvider } from "@/hooks/useEthersSigner"

import { MarketRoleProviders } from "./MarketRoleProviders"

const chainId = SupportedChainId.Sepolia
const admin = "0x1111111111111111111111111111111111111111"
const lender = "0x2222222222222222222222222222222222222222"
const hooks = "0x3333333333333333333333333333333333333333"
const kyc = getDeploymentAddress(chainId, "KYCRoleProvider")
const mockWallet = jest.fn()
const mockSafe = jest.fn()
const mockTimestamp = jest.fn()
const mockMembers = jest.fn()
const mockSelected = jest.fn()

jest.mock("wagmi", () => ({ useAccount: () => mockWallet() }))
jest.mock("@safe-global/safe-apps-react-sdk", () => ({
  useSafeAppsSDK: () => mockSafe(),
}))
jest.mock("@/hooks/useEthersSigner", () => ({ useEthersProvider: jest.fn() }))
jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => mockSelected(),
}))
jest.mock("@/providers/SubgraphProvider", () => ({
  useSubgraphClient: () => ({}),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  getKycEnrollmentTimestamp: (...args: unknown[]) => mockTimestamp(...args),
  getRoleProviderAuthority: (...args: unknown[]) => mockMembers(...args),
}))

const mockBytecode = jest.fn()
const mockRead = jest.fn()
const mockSend = jest.fn()
const mockReceipt = jest.fn()
const mockCall = jest.fn()
const mockWait = jest.fn()
const mockEstimate = jest.fn()
const mockMulticall = jest.fn()
const connected = useEthersProvider as jest.MockedFunction<
  typeof useEthersProvider
>

function mount(element: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>{element}</QueryClientProvider>,
  )
}

// jsdom and Node use different Uint8Array constructors. Keep viem's real ABI codec.
const { encode } = TextEncoder.prototype
beforeAll(() => {
  jest
    .spyOn(TextEncoder.prototype, "encode")
    .mockImplementation(function encodeInRealm(this: TextEncoder, input) {
      return Uint8Array.from(encode.call(this, input))
    })
})
afterAll(() => jest.restoreAllMocks())

beforeEach(() => {
  jest.clearAllMocks()
  mockSelected.mockReturnValue({ chainId })
  mockSafe.mockReturnValue({ connected: false, sdk: {} })
  mockWallet.mockReturnValue({ address: admin, chainId })
  mockRead.mockReset().mockResolvedValue(admin)
  mockBytecode.mockReset().mockResolvedValue("0x6000")
  mockMembers.mockResolvedValue({ kind: "kyc", members: [] })
  mockTimestamp.mockResolvedValue(BigInt(0))
  mockSend.mockResolvedValue("0xabc")
  mockReceipt.mockResolvedValue({ status: "success" })
  mockEstimate.mockReset().mockResolvedValue(BigInt(31000))
  mockMulticall.mockReset().mockResolvedValue([])
  connected.mockReturnValue({
    publicClient: {
      getBytecode: mockBytecode,
      readContract: mockRead,
      multicall: mockMulticall,
      estimateGas: mockEstimate,
      waitForTransactionReceipt: mockReceipt,
      call: mockCall,
    },
    walletClient: {
      account: { address: admin },
      chain: { id: chainId },
      sendTransaction: mockSend,
    },
    provider: { waitForTransaction: mockWait },
    targetChainId: chainId,
  } as unknown as ReturnType<typeof useEthersProvider>)
})

it("enrolls and removes the selected wallet using live state while the index lags", async () => {
  let enrolled = false
  mockTimestamp.mockImplementation(async () =>
    enrolled ? BigInt(1730000000) : BigInt(0),
  )
  mockSend.mockImplementation(
    async ({ to, data }: { to: string; data: Hex }) => {
      expect(to.toLowerCase()).toBe(kyc.toLowerCase())
      const call = decodeFunctionData({ abi: kycRoleProviderAbi, data })
      expect(call.args).toEqual([lender])
      expect(call.functionName).toBe(enrolled ? "removeMember" : "addMember")
      enrolled = !enrolled
      return "0xabc"
    },
  )
  mount(<KycAdminSection />)
  const input = await screen.findByLabelText("admin.kyc.wallet")
  fireEvent.change(input, { target: { value: "0x00" } })
  expect(
    (
      screen.getByRole("button", {
        name: "admin.kyc.addWallet",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true)
  fireEvent.change(input, { target: { value: lender } })
  await screen.findByText("admin.kyc.unlisted")
  fireEvent.click(screen.getByRole("button", { name: "admin.kyc.addWallet" }))
  await screen.findByText("admin.kyc.enrolledSince")
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "admin.kyc.removeWallet",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  )
  fireEvent.click(
    screen.getByRole("button", { name: "admin.kyc.removeWallet" }),
  )
  await screen.findByText("admin.kyc.unlisted")
  expect(mockSend).toHaveBeenCalledTimes(2)
  expect(mockReceipt).toHaveBeenCalledTimes(2)
})

it.each([
  [lender, chainId, "common.kyc.adminOnly"],
  [admin, SupportedChainId.Mainnet, "common.kyc.network"],
])(
  "gates membership by current authority and chain",
  async (address, walletChain, reason) => {
    mockWallet.mockReturnValue({ address, chainId: walletChain })
    mount(<KycAdminSection />)
    await screen.findByText(String(reason))
    expect(screen.queryByLabelText("admin.kyc.wallet")).toBeNull()
    expect(mockMembers).not.toHaveBeenCalled()
  },
)

it("stops a write if authority changes after the initial read", async () => {
  mount(<KycAdminSection />)
  fireEvent.change(await screen.findByLabelText("admin.kyc.wallet"), {
    target: { value: lender },
  })
  await screen.findByText("admin.kyc.unlisted")
  mockRead.mockResolvedValue(lender)
  fireEvent.click(screen.getByRole("button", { name: "admin.kyc.addWallet" }))
  await screen.findByRole("alert")
  expect(mockSend).not.toHaveBeenCalled()
})

it("waits for the Safe execution receipt before reporting a membership change", async () => {
  const safeSend = jest.fn().mockResolvedValue({ safeTxHash: "0xsafe" })
  const safeExecution = jest
    .fn()
    .mockResolvedValue({ txStatus: "SUCCESS", txHash: "0xexecuted" })
  mockSafe.mockReturnValue({
    connected: true,
    safe: { chainId, safeAddress: admin },
    sdk: { txs: { send: safeSend, getBySafeTxHash: safeExecution } },
  })
  mockWallet.mockReturnValue({ address: lender, chainId })
  mockWait.mockResolvedValue({ status: 0 })
  mount(<KycAdminSection />)
  fireEvent.change(await screen.findByLabelText("admin.kyc.wallet"), {
    target: { value: lender },
  })
  await screen.findByText("admin.kyc.unlisted")
  fireEvent.click(screen.getByRole("button", { name: "admin.kyc.addWallet" }))
  await waitFor(() => expect(mockWait).toHaveBeenCalledWith("0xexecuted"))
  await screen.findByRole("alert")
  expect(screen.queryByText("common.kyc.confirmed")).toBeNull()
  expect(mockCall).toHaveBeenCalledWith(
    expect.objectContaining({ account: admin }),
  )
  expect(mockSend).not.toHaveBeenCalled()
})

describe("batch membership", () => {
  const first = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  const second = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  const third = "0xcccccccccccccccccccccccccccccccccccccccc"
  const enrolled = new Set<string>()
  const button = (name: string) =>
    screen.getByRole("button", { name }) as HTMLButtonElement
  const paste = async (value: string) =>
    fireEvent.change(await screen.findByLabelText("admin.kyc.bulk.wallets"), {
      target: { value },
    })

  beforeEach(() => {
    enrolled.clear()
    mockMulticall.mockImplementation(
      async ({
        contracts,
      }: {
        contracts: { address: string; functionName: string; args: [string] }[]
      }) =>
        contracts.map(({ address, functionName, args }) => {
          expect(address.toLowerCase()).toBe(kyc.toLowerCase())
          expect(functionName).toBe("addedAt")
          return BigInt(enrolled.has(args[0].toLowerCase()) ? 1730000000 : 0)
        }),
    )
  })

  it("sends one call for the wallets a batch can change", async () => {
    enrolled.add(third)
    const calls: { functionName: string; members: string[] }[] = []
    mockSend.mockImplementation(
      async ({ to, data }: { to: string; data: Hex }) => {
        expect(to.toLowerCase()).toBe(kyc.toLowerCase())
        const call = decodeFunctionData({ abi: kycRoleProviderAbi, data })
        const members = (call.args as [string[]])[0].map((member) =>
          member.toLowerCase(),
        )
        calls.push({ functionName: call.functionName, members })
        members.forEach((member) =>
          call.functionName === "addMembers"
            ? enrolled.add(member)
            : enrolled.delete(member),
        )
        return "0xabc"
      },
    )
    mount(<KycAdminSection />)
    // The checksummed repeat of `first` would revert the batch if it were sent.
    await paste(`${first}\n${second}, ${third} ${getAddress(first)}`)
    await waitFor(() =>
      expect(button("admin.kyc.bulk.add").disabled).toBe(false),
    )
    fireEvent.click(button("admin.kyc.bulk.add"))
    await screen.findByText("common.kyc.confirmed")
    expect(calls).toEqual([
      { functionName: "addMembers", members: [first, second] },
    ])
    expect(button("admin.kyc.bulk.add").disabled).toBe(true)
    fireEvent.click(button("admin.kyc.bulk.remove"))
    await waitFor(() => expect(mockSend).toHaveBeenCalledTimes(2))
    await screen.findByText("common.kyc.confirmed")
    expect(calls[1]).toEqual({
      functionName: "removeMembers",
      members: [first, second, third],
    })
    expect(enrolled.size).toBe(0)
  })

  it.each([
    ["an invalid entry", `${first}\nnot-a-wallet`],
    [
      "more wallets than the limit",
      Array.from(
        { length: 101 },
        (_, index) => `0x${(index + 1).toString(16).padStart(40, "0")}`,
      ).join("\n"),
    ],
  ])("blocks a batch with %s before reading or sending", async (_, value) => {
    mount(<KycAdminSection />)
    await paste(value)
    await screen.findByRole("alert")
    expect(button("admin.kyc.bulk.add").disabled).toBe(true)
    expect(button("admin.kyc.bulk.remove").disabled).toBe(true)
    expect(mockMulticall).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
  })

  it("explains a rejected batch and checks the list again", async () => {
    mockEstimate.mockRejectedValue(
      Object.assign(new Error("execution reverted"), {
        data: encodeErrorResult({
          abi: kycRoleProviderAbi,
          errorName: "MemberAlreadyExists",
        }),
      }),
    )
    mount(<KycAdminSection />)
    await paste(`${first}\n${second}`)
    await waitFor(() =>
      expect(button("admin.kyc.bulk.add").disabled).toBe(false),
    )
    const reads = mockMulticall.mock.calls.length
    fireEvent.click(button("admin.kyc.bulk.add"))
    // Only the batch form reports it, with the batch wording.
    expect((await screen.findByRole("alert")).textContent).toBe(
      "admin.kyc.bulk.alreadyEnrolled",
    )
    expect(mockSend).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(mockMulticall.mock.calls.length).toBeGreaterThan(reads),
    )
  })
})

it("manages the market's shared policy and distinguishes a zero TTL from absence", async () => {
  let seconds: number | null = null
  mockRead.mockImplementation(async ({ address, functionName, args }) => {
    if (functionName === "isPullProvider") {
      expect(address.toLowerCase()).toBe(kyc.toLowerCase())
      return true
    }
    expect(address).toBe(hooks)
    if (functionName === "borrower") return admin
    expect(functionName).toBe("getRoleProvider")
    expect(args[0].toLowerCase()).toBe(kyc.toLowerCase())
    return seconds === null
      ? BigInt(0)
      : BigInt(seconds) * BigInt(2) ** BigInt(224) + BigInt(1)
  })
  mockSend.mockImplementation(
    async ({ to, data }: { to: Address; data: Hex }) => {
      expect(to).toBe(hooks)
      const call = decodeFunctionData({ abi: iOpenTermHooksAbi, data })
      if (call.functionName === "removeRoleProvider") seconds = null
      else if (call.functionName === "addRoleProvider")
        seconds = Number(call.args[1])
      else throw new Error("Unexpected policy call")
      return "0xabc"
    },
  )
  mount(
    <MarketRoleProviders
      policy={{ chainId, address: hooks, roleProviders: [] }}
    />,
  )
  await screen.findByText("borrower.kyc.detached")
  fireEvent.click(
    await screen.findByRole("button", { name: "borrower.kyc.attach" }),
  )
  await screen.findByText("borrower.kyc.attached")
  const input = screen.getByLabelText("borrower.kyc.ttl")
  fireEvent.change(input, { target: { value: "4294967296" } })
  expect(
    (
      screen.getByRole("button", {
        name: "borrower.kyc.updateTtl",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true)
  fireEvent.change(input, { target: { value: "600" } })
  fireEvent.click(
    screen.getByRole("button", { name: "borrower.kyc.updateTtl" }),
  )
  await waitFor(() => expect(seconds).toBe(600))
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "borrower.kyc.detach",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  )
  fireEvent.click(screen.getByRole("button", { name: "borrower.kyc.detach" }))
  await screen.findByRole("dialog")
  expect(mockSend).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByRole("button", { name: "common.buttons.cancel" }))
  expect(mockSend).toHaveBeenCalledTimes(2)
  fireEvent.click(
    await screen.findByRole("button", { name: "borrower.kyc.detach" }),
  )
  fireEvent.click(
    await screen.findByRole("button", { name: "common.buttons.confirm" }),
  )
  await screen.findByText("borrower.kyc.detached")
  expect(mockSend).toHaveBeenCalledTimes(3)
})

it("does not show a KYC deployment on an unsupported network", async () => {
  mockSelected.mockReturnValue({ chainId: SupportedChainId.Mainnet })
  mount(<KycAdminSection />)
  await screen.findByText("admin.kyc.unsupported")
  expect(mockRead).not.toHaveBeenCalled()
})

it.each(["no code", "invalid interface", "explicit push", "pull"])(
  "validates a custom contract before attachment: %s",
  async (kind) => {
    mockBytecode.mockImplementation(async ({ address }) =>
      address === lender && kind === "no code" ? undefined : "0x6000",
    )
    mockRead.mockImplementation(async ({ functionName, address }) => {
      if (functionName === "borrower") return admin
      if (functionName === "getRoleProvider") return BigInt(0)
      if (address === lender && kind === "invalid interface")
        throw Error("invalid response")
      return address !== lender || kind === "pull"
    })
    mount(
      <MarketRoleProviders
        policy={{ chainId, address: hooks, roleProviders: [] }}
      />,
    )
    fireEvent.mouseDown(
      await screen.findByRole("combobox", {
        name: /borrower\.kyc\.selectProvider/,
      }),
    )
    fireEvent.click(screen.getByRole("option", { name: "borrower.kyc.custom" }))
    fireEvent.change(screen.getByLabelText("borrower.kyc.provider"), {
      target: { value: lender },
    })
    const attach = screen.getByRole("button", {
      name: "borrower.kyc.attach",
    }) as HTMLButtonElement
    if (kind === "no code" || kind === "invalid interface") {
      await screen.findByRole("alert")
      expect(attach.disabled).toBe(true)
      expect(mockSend).not.toHaveBeenCalled()
      return
    }
    await screen.findByText("borrower.kyc.detached")
    if (kind === "explicit push") {
      expect(attach.disabled).toBe(true)
      expect(screen.getByText("borrower.kyc.pushNotice")).toBeTruthy()
      const ttl = screen.getByLabelText("borrower.kyc.ttl")
      fireEvent.change(ttl, { target: { value: "0" } })
      expect(attach.disabled).toBe(false)
      fireEvent.change(ttl, { target: { value: "60" } })
    }
    fireEvent.click(attach)
    await waitFor(() => expect(mockSend).toHaveBeenCalledTimes(1))
    const tx = mockSend.mock.calls[0][0]
    expect(tx.to).toBe(hooks)
    expect(
      decodeFunctionData({ abi: iOpenTermHooksAbi, data: tx.data }),
    ).toEqual({
      functionName: "addRoleProvider",
      args: [lender, kind === "explicit push" ? 60 : 0],
    })
  },
)
