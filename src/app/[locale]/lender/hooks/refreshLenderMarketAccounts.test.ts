import {
  getLensV2Contract,
  Market,
  MarketAccount,
  MarketVersion,
  refreshLenderAccountState,
  SignerOrProvider,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"

import { MarketStatus, getMarketStatus } from "@/utils/marketStatus"

import { refreshLenderMarketAccounts } from "./refreshLenderMarketAccounts"

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  getLensV2Contract: jest.fn(),
  refreshLenderAccountState: jest.fn(),
}))

const getLensV2ContractMock = jest.mocked(getLensV2Contract)
const refreshLenderAccountStateMock = jest.mocked(refreshLenderAccountState)

describe("refreshLenderMarketAccounts", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("hydrates live market state before the lender page derives its status", async () => {
    const marketAddress = "0x0000000000000000000000000000000000000001"
    const delinquencyGracePeriod = 3_600
    const provider = {} as SignerOrProvider
    const marketState = {
      timeDelinquent: 0,
      isIncurringPenalties: false,
    }
    const market = {
      address: marketAddress,
      version: MarketVersion.V2,
      underlyingToken: {
        address: "0x0000000000000000000000000000000000000002",
      },
      isClosed: false,
      isDelinquent: true,
      delinquencyGracePeriod,
      updateWith(update: { timeDelinquent: number }) {
        marketState.timeDelinquent = update.timeDelinquent
        marketState.isIncurringPenalties =
          marketState.timeDelinquent > delinquencyGracePeriod
      },
    } as unknown as Market
    const marketAccount = { market } as MarketAccount
    const getMarketsData = jest.fn().mockResolvedValue([
      {
        timeDelinquent: 3_601,
      },
    ])

    getLensV2ContractMock.mockReturnValue({
      getMarketsData,
    } as unknown as ReturnType<typeof getLensV2Contract>)
    refreshLenderAccountStateMock.mockResolvedValue([marketAccount])

    const result = await refreshLenderMarketAccounts(
      SupportedChainId.Sepolia,
      provider,
      undefined,
      [marketAccount],
    )

    expect(result).toEqual([marketAccount])
    expect(getMarketsData).toHaveBeenCalledWith([marketAddress])
    expect(refreshLenderAccountStateMock).toHaveBeenCalledWith(
      SupportedChainId.Sepolia,
      provider,
      undefined,
      [marketAccount],
    )
    expect(
      getMarketStatus(
        market.isClosed,
        market.isDelinquent,
        marketState.isIncurringPenalties,
      ),
    ).toBe(MarketStatus.PENALTY)
  })

  it("bounds large market refreshes without splitting the lender-state read", async () => {
    const provider = {} as SignerOrProvider
    const marketAccounts = Array.from({ length: 85 }, (_, index) => {
      const address = `0x${(index + 1).toString(16).padStart(40, "0")}`
      return {
        market: {
          address,
          version: MarketVersion.V2,
          underlyingToken: {
            address: "0x0000000000000000000000000000000000000002",
          },
          updateWith: jest.fn(),
        },
      } as unknown as MarketAccount
    })
    let inFlight = 0
    let maxInFlight = 0
    const getMarketsData = jest.fn(async (addresses: string[]) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await Promise.resolve()
      inFlight -= 1
      return addresses.map(() => ({}))
    })

    getLensV2ContractMock.mockReturnValue({
      getMarketsData,
    } as unknown as ReturnType<typeof getLensV2Contract>)
    refreshLenderAccountStateMock.mockResolvedValue(marketAccounts)

    await refreshLenderMarketAccounts(
      SupportedChainId.Sepolia,
      provider,
      undefined,
      marketAccounts,
    )

    expect(
      getMarketsData.mock.calls.map(([addresses]) => addresses.length),
    ).toEqual([40, 40, 5])
    expect(maxInFlight).toBe(2)
    expect(refreshLenderAccountStateMock).toHaveBeenCalledTimes(1)
    expect(refreshLenderAccountStateMock).toHaveBeenCalledWith(
      SupportedChainId.Sepolia,
      provider,
      undefined,
      marketAccounts,
    )
  })
})
