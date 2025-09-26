import { useQuery } from "@tanstack/react-query"
import {
  getDeploymentAddress,
  SupportedChainId,
  Token,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import { defaultAbiCoder } from "ethers/lib/utils"
import { getAddress } from "viem"

import { convertTokenAmount, toMainnetToken } from "@/lib/token-conversion"

import { useCurrentNetwork } from "../useCurrentNetwork"

const QUOTE_URL = "https://api.bebop.xyz/pmm/ethereum/v3/quote"

export type BebopPMMQuoteOptions = {
  buyToken: Token
  sellTokenAmount?: TokenAmount
  takerAddress: string
  feeBips?: number
}

export type BebopPMMQuoteToken = {
  amount: string
  decimals: number
  priceUsd: number
  symbol: string
  price: number
  priceBeforeFee: number
}

type BebopPMMSingleOrderToSign = {
  partner_id: number
  expiry: number
  taker_address: string
  maker_address: string
  maker_nonce: string
  taker_token: string
  maker_token: string
  taker_amount: string
  maker_amount: string
  receiver: string
  packed_commands: string
}

type BebopPMMQuoteTxData = {
  to: string
  value: string
  data: string
  from: string
  gas: number
  gasPrice: number
}

export type BebopPMMQuoteResponse = {
  requestId: string
  type: string
  status: string
  quoteId: string
  chainId: number
  approvalType: string
  nativeToken: string
  taker: string
  receiver: string
  expiry: number
  slippage: number
  gasFee: {
    native: string
    usd: number
  }
  buyTokens: {
    [key: string]: BebopPMMQuoteToken & {
      minimumAmount: string
      amountBeforeFee: string
      deltaFromExpected: number
    }
  }
  sellTokens: {
    [key: string]: BebopPMMQuoteToken
  }
  settlementAddress: string
  approvalTarget: string
  requiredSignatures: string[]
  priceImpact: number
  warnings: {
    code: number
    message: string
  }[]
  tx: BebopPMMQuoteTxData | null
  makers: string[]
  toSign: BebopPMMSingleOrderToSign
  onchainOrderType: string
  partialFillOffset: number
}

export const BebopPMMWarningCodes = {
  101: {
    name: "InvalidApiRequest",
    description:
      "The API request is invalid - incorrect format or missing required fields",
  },
  102: {
    name: "InsufficientLiquidity",
    description:
      "There is insufficient liquidity to serve the requested trade size for the given tokens",
  },
  103: {
    name: "GasCalculationError",
    description:
      "There was a failure in calculating the gas estimate for this quotes transaction cost - this can occur when gas is fluctuating wildly",
  },
  104: {
    name: "MinSize",
    description:
      "User is trying to trade smaller than the minimum acceptable size for the given tokens",
  },
  105: {
    name: "TokenNotSupported",
    description:
      "The token user is trying to trade is not supported by Bebop at the moment",
  },
  106: {
    name: "GasExceedsSize",
    description: "Execution cost (gas) doesn't cover the trade size",
  },
  107: {
    name: "UnexpectedPermitsError",
    description:
      "Unexpected error when a user approves tokens via Permit or Permit2 signatures",
  },
}

export type BebopPMMQuoteWarning =
  (typeof BebopPMMWarningCodes)[keyof typeof BebopPMMWarningCodes]

export type BebopPMMQuote = {
  expiry: number
  slippage: number
  priceImpact: number
  buyTokenAmount: TokenAmount
  sellTokenAmount: TokenAmount
  tx: BebopPMMQuoteTxData | null
  makers: string[]
  warnings: BebopPMMQuoteWarning[]
  settlementAddress: string
  approvalTarget: string
}

export async function fetchBebopPMMQuote({
  buyToken,
  sellTokenAmount,
  takerAddress,
  feeBips,
}: BebopPMMQuoteOptions): Promise<BebopPMMQuote> {
  if (!sellTokenAmount) {
    throw Error("Sell token amount is required")
  }
  const fakeTakerAddress = "0x5Bad996643a924De21b6b2875c85C33F3c5bBcB6"
  const params = [
    `sell_tokens=${getAddress(sellTokenAmount.token.address)}`,
    `buy_tokens=${getAddress(buyToken.address)}`,
    `sell_amounts=${sellTokenAmount.raw.toString()}`,
    `taker_address=${fakeTakerAddress}`,
    `approval_type=Standard`,
    `skip_validation=true`,
    `skip_taker_checks=true`,
    `gasless=false`,
    `expiry_type=standard`,
    `fee=${feeBips ?? 0}`,
    `is_ui=false`,
  ]

  const url = [QUOTE_URL, "?", params.join("&")].join("")
  console.log(`Querying Bebop Quote: `, url)
  const result = await fetch(url)
  const data = (await result.json()) as BebopPMMQuoteResponse
  console.log(`Bebop Quote Response: `, data)
  const buyTokens = Object.values(data.buyTokens)
  const sellTokens = Object.values(data.sellTokens)
  if (buyTokens.length !== 1) {
    throw new Error(`Expected 1 buy token, got ${buyTokens.length}`)
  }
  if (sellTokens.length !== 1) {
    throw new Error(`Expected 1 sell token, got ${sellTokens.length}`)
  }
  if (data.tx) {
    data.tx.data = data.tx.data.replaceAll(
      fakeTakerAddress.slice(2).toLowerCase(),
      takerAddress.slice(2).toLowerCase(),
    )
  }
  const quote: BebopPMMQuote = {
    expiry: data.expiry,
    slippage: data.slippage,
    priceImpact: data.priceImpact,
    buyTokenAmount: buyToken.getAmount(buyTokens[0].minimumAmount),
    sellTokenAmount: sellTokenAmount.token.getAmount(sellTokens[0].amount),
    tx: data.tx,
    makers: data.makers,
    warnings: data.warnings.map(
      (w) => BebopPMMWarningCodes[w.code as keyof typeof BebopPMMWarningCodes],
    ),
    settlementAddress: data.settlementAddress,
    approvalTarget: data.approvalTarget,
  }
  return quote
}

const encodeMockExecute = (
  inputTokenAmount: TokenAmount,
  outputTokenAmount: TokenAmount,
) => {
  const inputData = defaultAbiCoder.encode(
    ["address", "uint256", "address", "uint256", "bool"],
    [
      inputTokenAmount.token.address,
      inputTokenAmount.raw,
      outputTokenAmount.token.address,
      outputTokenAmount.raw,
      false,
    ],
  )
  return [`0x8df4504f`, inputData.replace("0x", "")].join("")
}

export function useGetBebopPMMQuote(options: BebopPMMQuoteOptions) {
  const { isTestnet } = useCurrentNetwork()
  // If the network is testnet, we need to convert the token to the mainnet version
  const usableInput =
    options.sellTokenAmount && isTestnet
      ? toMainnetToken(options.sellTokenAmount)
      : options.sellTokenAmount
  const usableOutput = isTestnet
    ? toMainnetToken(options.buyToken)
    : options.buyToken
  return useQuery({
    queryKey: [
      "bebop-pmm-quote",
      usableInput?.format(18, true) ?? "",
      usableOutput.address,
    ],
    enabled:
      !!options.sellTokenAmount &&
      !!usableInput &&
      !!usableOutput &&
      usableInput.gt(0),
    queryFn: () =>
      fetchBebopPMMQuote({
        ...options,
        sellTokenAmount: usableInput,
        buyToken: usableOutput,
      }).then((quote): BebopPMMQuote => {
        if (!options.sellTokenAmount) {
          throw Error("Sell token amount is required")
        }
        if (isTestnet) {
          const buyTokenAmount = convertTokenAmount(
            quote.buyTokenAmount,
            options.buyToken,
          )
          const sellTokenAmount = convertTokenAmount(
            quote.sellTokenAmount,
            options.sellTokenAmount.token,
          )
          return {
            ...quote,
            tx: {
              ...quote.tx,
              /// Replace quote input data and target address with mock execute function call and target address
              data: encodeMockExecute(sellTokenAmount, buyTokenAmount),
              to: getDeploymentAddress(
                SupportedChainId.Sepolia,
                "BebopSettlementContract",
              ),
            },
            /// Convert the token amounts to the sepolia token amounts
            buyTokenAmount,
            sellTokenAmount,
          } as BebopPMMQuote
        }
        return quote
      }),
  })
}
