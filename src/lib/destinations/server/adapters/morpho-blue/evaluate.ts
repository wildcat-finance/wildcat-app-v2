import { toHuman } from "@/lib/protocol-stats/format"

import type { MorphoCurator, MorphoMarket } from "./api"
import { MIN_CURATED_SHARE, MIN_CURATED_SUPPLY_USD } from "./constants"
import type { MorphoMarketParams } from "./onchain"
import type { AdapterOutput } from "../types"

type SupplyingVault = {
  name: string | null
  share: number
  curators: string[]
  addresses: string[]
}

const toBigInt = (value: number | string): bigint | null => {
  try {
    return typeof value === "string" ? BigInt(value) : BigInt(Math.trunc(value))
  } catch {
    return null
  }
}

const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]/g, "")

export const evaluateMorphoMarket = ({
  appSlug,
  market,
  onchain,
}: {
  appSlug: string
  market: MorphoMarket
  onchain: MorphoMarketParams | undefined
}): AdapterOutput | null => {
  const { state, loanAsset, collateralAsset } = market
  if (!state) return null
  if (market.warnings?.some((warning) => warning.level === "RED")) return null

  const asOf = Number(toBigInt(state.timestamp) ?? 0)

  // The API row must describe the market Morpho stores under this id.
  const apiLltv = toBigInt(market.lltv)
  if (
    !onchain ||
    apiLltv === null ||
    !sameId(onchain.collateralToken, collateralAsset.address) ||
    !sameId(onchain.loanToken, loanAsset.address) ||
    Math.abs(Number(onchain.lltv) - Number(apiLltv)) > 1e3
  ) {
    return null
  }

  const supplyRaw = toBigInt(state.supplyAssets) ?? BigInt(0)
  const liquidityRaw = toBigInt(state.liquidityAssets) ?? BigInt(0)
  if (supplyRaw <= BigInt(0)) return null

  const shareOfSupply = (raw: bigint) =>
    Math.min(1, Number((raw * BigInt(10_000)) / supplyRaw) / 10_000)

  let curatedRaw = BigInt(0)
  const vaults: SupplyingVault[] = []
  const addVault = (
    name: string | null | undefined,
    supplied: bigint,
    curatorEntries: MorphoCurator[] | null | undefined,
    ownAddresses: (string | null | undefined)[],
  ) => {
    curatedRaw += supplied
    const addresses = [
      ...ownAddresses,
      ...(curatorEntries ?? []).flatMap(
        (curator) => curator.addresses?.map(({ address }) => address) ?? [],
      ),
    ].flatMap((address) => (address ? [address.toLowerCase()] : []))
    vaults.push({
      name: name || null,
      share: shareOfSupply(supplied),
      curators: (curatorEntries ?? []).flatMap((curator) =>
        curator.name ? [curator.name] : [],
      ),
      addresses: Array.from(new Set(addresses)),
    })
  }

  market.supplyingVaults?.forEach((vault) => {
    if (!vault.listed || !vault.state) return
    const allocation = vault.state.allocation?.find((entry) =>
      sameId(entry.market.marketId, market.marketId),
    )
    const supplied = allocation ? toBigInt(allocation.supplyAssets) : null
    if (!supplied || supplied <= BigInt(0)) return
    addVault(vault.name, supplied, vault.state.curators, [
      vault.state.owner,
      vault.state.curator,
    ])
  })

  market.supplyingVaultV2s?.forEach((vault) => {
    if (!vault.listed) return
    const supplied = (vault.caps?.items ?? []).reduce((sum, cap) => {
      const capMarket = cap.data?.market?.marketId
      if (
        cap.data?.kind !== "MarketV1CapData" ||
        !capMarket ||
        !sameId(capMarket, market.marketId)
      ) {
        return sum
      }
      return sum + (toBigInt(cap.allocation) ?? BigInt(0))
    }, BigInt(0))
    if (supplied <= BigInt(0)) return
    addVault(vault.name, supplied, vault.curators?.items, [
      vault.owner?.address,
      vault.curator?.address,
    ])
  })

  const curatedShare = shareOfSupply(curatedRaw)
  const price = loanAsset.price?.usd ?? null
  const supplyUsd =
    state.supplyAssetsUsd ??
    (price !== null ? toHuman(supplyRaw, loanAsset.decimals) * price : null)
  const availableLiquidity = toHuman(liquidityRaw, loanAsset.decimals)
  const availableLiquidityUsd =
    state.liquidityAssetsUsd ??
    (price !== null ? availableLiquidity * price : null)

  if (supplyUsd === null || availableLiquidityUsd === null) return null
  if (curatedShare < MIN_CURATED_SHARE) return null
  if (supplyUsd * curatedShare < MIN_CURATED_SUPPLY_USD) return null

  const marketId = market.marketId.toLowerCase()
  const url = `https://app.morpho.org/${appSlug}/variable/${marketId}/${slug(
    loanAsset.symbol,
  )}-${slug(collateralAsset.symbol)}`
  const venueName = `${collateralAsset.symbol} / ${loanAsset.symbol}`
  const leadVaultName = [...vaults]
    .sort((a, b) => b.share - a.share)
    .find((vault) => vault.name)?.name

  return {
    venueKey: marketId,
    destination: {
      route: "BORROW_AGAINST",
      title: leadVaultName ?? venueName,
      token: {
        address: collateralAsset.address,
        symbol: collateralAsset.symbol,
        form: "wrapper",
      },
      loanAsset: { address: loanAsset.address },
      url,
      curators: Array.from(new Set(vaults.flatMap((vault) => vault.curators))),
      figures: {
        lltv: toHuman(onchain.lltv, 18),
        borrowApy: state.avgBorrowApy ?? null,
        availableLiquidityUsd,
        asOf,
      },
      notices: [],
    },
    counterparties: vaults.map(({ curators, addresses, share }) => ({
      names: curators,
      addresses,
      weight: share,
    })),
  }
}
