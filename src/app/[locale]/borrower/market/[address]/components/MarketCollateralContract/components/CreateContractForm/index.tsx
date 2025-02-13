import { Dispatch, SetStateAction, useState } from "react"

import { Box, Button, Typography } from "@mui/material"
import { Market, Token } from "@wildcatfi/wildcat-sdk"

import { UnderlyingAssetSelect } from "@/app/[locale]/borrower/create-market/components/UnderlyingAssetSelect"
import { useTokensList } from "@/app/[locale]/borrower/create-market/components/UnderlyingAssetSelect/hooks/useTokensList"
import { TokenInfo } from "@/app/api/tokens-list/interface"
import { COLORS } from "@/theme/colors"

export type CreateContractFormType = {
  market: Market
  tokenAsset: string
  setTokenAsset: Dispatch<SetStateAction<string>>
  setHasContract: Dispatch<SetStateAction<boolean>>
}

export const CreateContractForm = ({
  market,
  tokenAsset,
  setTokenAsset,
  setHasContract,
}: CreateContractFormType) => {
  const { handleChange, handleSelect, query, setQuery, isLoading, tokens } =
    useTokensList()

  const handleTokenSelect = (asset: TokenInfo | null) => {
    setTokenAsset((asset ? asset.address : "0x") as `0x${string}`)
  }

  const handleClickConfirm = () => {
    setHasContract(true)
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
        <Typography variant="title3" marginBottom="4px">
          Collateral Contract
        </Typography>
        <Typography
          variant="text3"
          color={COLORS.santasGrey}
          marginBottom="24px"
        >
          Firstly, select an asset to create a contract
        </Typography>

        <Box sx={{ display: "flex", gap: "10px" }}>
          <Box sx={{ width: "300px" }}>
            <UnderlyingAssetSelect
              handleTokenSelect={handleTokenSelect}
              tokens={tokens}
              isLoading={isLoading}
              setQuery={setQuery}
              query={query}
              handleSelect={handleSelect}
              value={tokenAsset}
              handleChange={handleChange}
            />
          </Box>

          <Button
            variant="contained"
            size="large"
            sx={{ width: "140px" }}
            disabled={tokenAsset === ""}
            onClick={handleClickConfirm}
          >
            Create
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
