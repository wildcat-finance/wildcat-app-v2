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
})
