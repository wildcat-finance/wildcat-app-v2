import { useState } from "react"

import { Box, Skeleton } from "@mui/material"
import { DataGrid, GridColDef, GridValidRowModel } from "@mui/x-data-grid"
import {
  Market,
  MarketAccount,
  MarketCollateralV1,
} from "@wildcatfi/wildcat-sdk"

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
  hideDeposit?: boolean
}

export const MarketCollateralContract = ({
  marketAccount,
  hideDeposit,
}: MarketCollateralContractProps) => {
  const { market } = marketAccount
  const { data: collateralContracts, isLoading } =
    useGetCollateralContracts(market)

  const [selectedCollateralContract, setSelectedCollateralContract] =
    useState<MarketCollateralV1>()

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
      {!selectedCollateralContract && (
        <>
          <CollateralContractsTable
            collateralContracts={collateralContracts || []}
            setSelectedCollateralContract={setSelectedCollateralContract}
          />

          {marketAccount.isBorrower && (
            <CreateContractForm
              market={market}
              existingCollateralContracts={collateralContracts || []}
            />
          )}
        </>
      )}

      {selectedCollateralContract && (
        <ContractActions
          marketAccount={marketAccount}
          collateralContract={selectedCollateralContract}
          handleBackClick={() => setSelectedCollateralContract(undefined)}
          hideDeposit={hideDeposit}
        />
      )}
    </Box>
  )
}
