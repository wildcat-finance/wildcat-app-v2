/* eslint-disable no-await-in-loop */

import { SubgraphUrls } from "@wildcatfi/wildcat-sdk"

import { querySubgraph } from "@/lib/protocol-stats/subgraph"

import { ExportChainId } from "../types"

const PAGE_SIZE = 1_000
const ZERO_ADDRESS = `0x${"0".repeat(40)}`

type CatalogPage = {
  markets: {
    id: string
    name: string
    symbol: string
    borrower: string
    isClosed: boolean
    isRegistered: boolean
  }[]
}

export type ExportMarketOption = {
  address: string
  name: string
  symbol: string
  borrower: string
  isActive: boolean
}

export async function fetchExportMarketCatalog(
  chainId: ExportChainId,
): Promise<ExportMarketOption[]> {
  const url = SubgraphUrls[chainId]
  if (!url) throw new Error(`No market catalogue for chain ${chainId}`)

  const markets: ExportMarketOption[] = []
  let after = ZERO_ADDRESS
  let page: CatalogPage["markets"]
  do {
    const data = await querySubgraph<CatalogPage>(
      url,
      `{
        markets(
          first: ${PAGE_SIZE}
          where: { version: V2, id_gt: ${JSON.stringify(after)} }
          orderBy: id
          orderDirection: asc
        ) {
          id
          name
          symbol
          borrower
          isClosed
          isRegistered
        }
      }`,
    )
    page = data.markets
    markets.push(
      ...page.map((market) => ({
        address: market.id.toLowerCase(),
        name: market.name,
        symbol: market.symbol,
        borrower: market.borrower.toLowerCase(),
        isActive: market.isRegistered && !market.isClosed,
      })),
    )
    if (page.length > 0) after = page[page.length - 1].id
  } while (page.length === PAGE_SIZE)

  return markets
}
