import { useState } from "react"
import * as React from "react"

import { Box, Skeleton, SvgIcon, Typography } from "@mui/material"
import { GridColDef, GridValidRowModel } from "@mui/x-data-grid"
import { MarketAccount, MarketCollateralV1 } from "@wildcatfi/wildcat-sdk"

import Coins from "@/assets/icons/coins_icon.svg"
import { CollateralHeader } from "@/components/MarketCollateralContract/components/CollateralHeader"
import { ContractActions } from "@/components/MarketCollateralContract/components/ContractActions"
import { CreateContractForm } from "@/components/MarketCollateralContract/components/CreateContractForm"
import { useGetCollateralContracts } from "@/hooks/useGetCollateralContracts"
import { COLORS } from "@/theme/colors"

import { CollateralContractsTable } from "./components/CollateralContractsTable"

export type TypeSafeColDef<
  R extends GridValidRowModel,
  F extends string | void = void,
> = GridColDef<R> & {
  field: keyof R | "action" | F
}

export type MarketCollateralContractProps = {
  marketAccount: MarketAccount
  hideActions?: boolean
}

export const MarketCollateralContract = ({
  marketAccount,
  hideActions,
}: MarketCollateralContractProps) => {
  const { market } = marketAccount
  const { data: collateralContracts, isLoading } =
    useGetCollateralContracts(market)

  const [selectedCollateralContract, setSelectedCollateralContract] =
    useState<MarketCollateralV1>()

  const contractName = selectedCollateralContract?.collateralAsset.name

  if (isLoading)
    return (
      <Box
        display="flex"
        flexDirection="column"
        padding="32px 16px"
        rowGap="8px"
      >
        <Skeleton
          height="52px"
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
        <Skeleton
          height="52px"
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
        <Skeleton
          height="52px"
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
        <Skeleton
          height="52px"
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
      </Box>
    )

  return (
    <Box sx={{ width: "100%" }}>
      {selectedCollateralContract && (
        <Box
          sx={{
            backgroundColor: COLORS.oasis,
            padding: "12px 16px",
            borderRadius: "12px",
            marginBottom: "24px",

            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <Coins />
          <Typography variant="text3" color={COLORS.butteredRum}>
            Collateral cannot be reclaimed until the underlying market is
            terminated.
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          flexDirection: collateralContracts?.length === 0 ? "column" : "row",
          justifyContent: "space-between",
          alignItems:
            collateralContracts?.length === 0 ? "flex-start" : "center",
        }}
      >
        <CollateralHeader
          contractName={contractName}
          contractsNumber={collateralContracts?.length}
          handleBackClick={() => setSelectedCollateralContract(undefined)}
          isBorrower={marketAccount.isBorrower}
        />

        {!selectedCollateralContract &&
          marketAccount.isBorrower &&
          !market.isClosed && (
            <CreateContractForm
              market={market}
              existingCollateralContracts={collateralContracts || []}
            />
          )}
      </Box>

      {!selectedCollateralContract && (
        <CollateralContractsTable
          collateralContracts={collateralContracts || []}
          setSelectedCollateralContract={setSelectedCollateralContract}
        />
      )}

      {selectedCollateralContract && (
        <ContractActions
          marketAccount={marketAccount}
          collateralContract={selectedCollateralContract}
          hideActions={hideActions}
        />
      )}
    </Box>
  )
}
