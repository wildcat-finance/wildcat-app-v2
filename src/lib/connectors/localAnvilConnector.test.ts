import {
  ANVIL_DEFAULT_ACCOUNTS,
  getLocalAnvilAccount,
  localAnvilConnector,
} from "./localAnvilConnector"

const mockRequest = jest.fn()
// wagmi ships ESM only; its createConnector is the identity function.
jest.mock("wagmi", () => ({ createConnector: (fn: unknown) => fn }))
jest.mock("viem", () => {
  const actual = jest.requireActual("viem")
  return {
    ...actual,
    http: () => () => ({ request: mockRequest, type: "http" }),
  }
})

const config = {
  chains: [{ id: 11155111 }],
  emitter: { emit: jest.fn() },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

const make = () =>
  localAnvilConnector({
    rpcUrl: "http://127.0.0.1:18545",
    chainId: 11155111,
    accounts: ANVIL_DEFAULT_ACCOUNTS,
  })(config)

describe("localAnvilConnector", () => {
  beforeEach(() => mockRequest.mockReset())

  it("exposes anvil's default accounts and forwards requests to the RPC", async () => {
    mockRequest.mockResolvedValueOnce("0xaa36a7")
    const c = make()
    expect(c.name).toBe("Local Anvil")
    expect(c.id).toBe("localAnvil")
    expect(c.type).toBe("localAnvil")
    expect(ANVIL_DEFAULT_ACCOUNTS).toHaveLength(10)
    expect(getLocalAnvilAccount(1)).toBe(ANVIL_DEFAULT_ACCOUNTS[1])
    const provider = await c.getProvider()
    await expect(provider.request({ method: "eth_chainId" })).resolves.toBe(
      "0xaa36a7",
    )
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: "eth_chainId" }),
    )
  })

  it("answers eth_accounts locally with the connected account", async () => {
    const c = make()
    const provider = await c.getProvider()
    await expect(provider.request({ method: "eth_accounts" })).resolves.toEqual(
      [ANVIL_DEFAULT_ACCOUNTS[0]],
    )
    expect(mockRequest).not.toHaveBeenCalled()
  })

  it("connects with the first account by default and a chosen index on request", async () => {
    const c = make()
    expect((await c.connect()).accounts[0]).toBe(ANVIL_DEFAULT_ACCOUNTS[0])
    expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await c.connect({ withAccountIndex: 2 } as any)).accounts[0],
    ).toBe(ANVIL_DEFAULT_ACCOUNTS[2])
    expect((await c.getAccounts())[0]).toBe(ANVIL_DEFAULT_ACCOUNTS[2])
    expect((await c.connect()).chainId).toBe(11155111)
  })

  it("only switches to its own chain", async () => {
    const c = make()
    await expect(c.switchChain!({ chainId: 11155111 })).resolves.toEqual({
      id: 11155111,
    })
    await expect(c.switchChain!({ chainId: 1 })).rejects.toThrow(
      /only serves chain/,
    )
  })

  it("signs through the RPC as a JSON-RPC account", async () => {
    mockRequest.mockResolvedValueOnce("0xsig")
    const c = make()
    const provider = await c.getProvider()
    await expect(
      provider.request({
        method: "personal_sign",
        params: ["0x68656c6c6f", ANVIL_DEFAULT_ACCOUNTS[0]],
      }),
    ).resolves.toBe("0xsig")
  })
})
