"use client"

import { useQuery } from "@tanstack/react-query"
import {
  MarketAccount,
  MarketVersion,
  SignerOrProvider,
  SupportedChainId,
  getLenderAccountsForAllMarkets,
  getLensV2Contract,
  getSubgraphClient,
} from "@wildcatfi/wildcat-sdk"
import { BigNumber, constants, providers } from "ethers"

import { BorrowerWithName } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import { TOKENS_ADDRESSES } from "@/utils/constants"

const CHAIN_ID = SupportedChainId.Mainnet

const subgraphClient = getSubgraphClient(CHAIN_ID)

const rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? ""
}`
const provider = new providers.JsonRpcProvider(rpcUrl)

function chunkV2Accounts(accounts: MarketAccount[]): MarketAccount[][] {
  const v2 = accounts.filter((a) => a.market.version === MarketVersion.V2)
  if (CHAIN_ID === SupportedChainId.Mainnet) {
    const isWeth = (a: MarketAccount) =>
      a.market.underlyingToken.address.toLowerCase() === TOKENS_ADDRESSES.WETH
    return [...v2.filter(isWeth).map((a) => [a]), v2.filter((a) => !isWeth(a))]
  }
  return [v2]
}

async function applyLensUpdates(accounts: MarketAccount[]) {
  const lensV2 = getLensV2Contract(CHAIN_ID, provider as SignerOrProvider)
  const chunks = chunkV2Accounts(accounts)

  await Promise.all(
    chunks.map(async (chunk) => {
      if (chunk.length === 0) return
      const updates = await lensV2.getMarketsDataWithLenderStatus(
        constants.AddressZero,
        chunk.map((a) => a.market.address),
      )
      chunk.forEach((account, i) => {
        const update = updates[i]
        account.market.updateWith(update.market)
        account.updateWith({
          ...update.lenderStatus,
          normalizedBalance: BigNumber.from(0),
          scaledBalance: BigNumber.from(0),
          underlyingBalance: BigNumber.from(0),
          underlyingApproval: BigNumber.from(0),
        })
      })
    }),
  )

  return accounts
}

export function useEmbedMarkets() {
  const { data: accounts, isLoading: isLoadingMarkets } = useQuery({
    queryKey: ["embed-markets"],
    queryFn: async () => {
      const initial = await getLenderAccountsForAllMarkets(subgraphClient, {
        chainId: CHAIN_ID,
        fetchPolicy: "network-only",
        signerOrProvider: provider,
        lender: constants.AddressZero,
      })
      return applyLensUpdates(initial)
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  })

  const { data: borrowers, isLoading: isLoadingBorrowers } = useQuery({
    queryKey: ["embed-borrower-names"],
    queryFn: async () => {
      const res = await fetch(`/api/borrower-names?chainId=${CHAIN_ID}`)
      return res.json() as Promise<BorrowerWithName[]>
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  return {
    accounts: accounts ?? [],
    borrowers,
    isLoading: isLoadingMarkets || isLoadingBorrowers,
  }
}
