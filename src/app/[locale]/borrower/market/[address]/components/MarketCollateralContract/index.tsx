import { useState } from "react"

import { Box, Typography } from "@mui/material"
import { Market } from "@wildcatfi/wildcat-sdk"

import { UnderlyingAssetSelect } from "@/app/[locale]/borrower/create-market/components/UnderlyingAssetSelect"
import { useTokenMetadata } from "@/app/[locale]/borrower/create-market/hooks/useTokenMetadata"
import { ContractActions } from "@/app/[locale]/borrower/market/[address]/components/MarketCollateralContract/components/ContractActions"
import { CreateContractForm } from "@/app/[locale]/borrower/market/[address]/components/MarketCollateralContract/components/CreateContractForm"

export type MarketCollateralContractType = {
  market: Market
  tokenCollateralAsset: string
  setTokenCollateralAsset: React.Dispatch<React.SetStateAction<string>>
  hasContract: boolean
  setHasContract: React.Dispatch<React.SetStateAction<boolean>>
}

export const MarketCollateralContract = ({
  market,
  tokenCollateralAsset,
  setTokenCollateralAsset,
  hasContract,
  setHasContract,
}: MarketCollateralContractType) => {
  const { data: assetData } = useTokenMetadata({
    address: tokenCollateralAsset.toLowerCase(),
  })

  return (
    <Box sx={{ width: "100%" }}>
      {!hasContract && (
        <CreateContractForm
          market={market}
          tokenAsset={tokenCollateralAsset}
          setTokenAsset={setTokenCollateralAsset}
          setHasContract={setHasContract}
        />
      )}

      {hasContract && <ContractActions market={market} token={assetData} />}
    </Box>
  )
}
