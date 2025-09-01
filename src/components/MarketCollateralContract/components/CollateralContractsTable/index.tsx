import { useMemo } from "react"

import { Box, Button, IconButton, SvgIcon, Typography } from "@mui/material"
import { DataGrid, GridColDef, GridValidRowModel } from "@mui/x-data-grid"
import { MarketCollateralV1, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { MarketWithdrawalRequetstCell } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/style"
import LinkIcon from "@/assets/icons/link_icon.svg"
import { AddressButtons } from "@/components/Header/HeaderButton/ProfileDialog/style"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { useGetTokenPrices } from "@/hooks/useGetTokenPrices"
import { COLORS } from "@/theme/colors"
import { tokenAmountComparator } from "@/utils/comparators"
import { formatTokenWithCommas } from "@/utils/formatters"

export type CollateralContractsTableProps = {
  collateralContracts: MarketCollateralV1[]
  setSelectedCollateralContract: (
    collateralContract: MarketCollateralV1 | undefined,
  ) => void
}

export type TypeSafeColDef<
  R extends GridValidRowModel,
  F extends string | void = void,
> = GridColDef<R> & {
  field: keyof R | "action" | F
}

export const CollateralContractsTable = ({
  collateralContracts,
  setSelectedCollateralContract,
}: CollateralContractsTableProps) => {
  const { t } = useTranslation()
  const allTokens = useMemo(
    () =>
      // filter to only unique tokens
      collateralContracts
        .map((contract) => [
          contract.collateralAsset,
          contract.market.underlyingToken,
        ])
        .flat()
        .filter(
          (token, index, self) =>
            self.findIndex((ti) => ti.address === token.address) === index,
        ),
    [collateralContracts],
  )
  const { data: tokenPrices } = useGetTokenPrices(allTokens)

  const getTokenValueSuffix = (amount: TokenAmount) => {
    if (amount.gt(0) && tokenPrices) {
      const tokenPrice = tokenPrices[amount.token.address.toLowerCase()]
      if (tokenPrice) {
        const value = +amount.format() * tokenPrice.usdPrice
        return `$${new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)}`
      }
    }
    return ""
  }

  const columns: TypeSafeColDef<MarketCollateralV1>[] = [
    {
      sortable: false,
      field: "collateralAsset",
      headerName: t("collateral.list.asset"),
      flex: 1.5,
      minWidth: 200,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value: collateralAsset }) => (
        <Box
          sx={{
            display: "flex",
            gap: "4px",
          }}
        >
          <Typography variant="text3">{collateralAsset.name}</Typography>

          <LinkGroup
            linkValue={`${EtherscanBaseUrl}/address/${collateralAsset.address}`}
            copyValue={collateralAsset.address}
          />
        </Box>
      ),
    },
    {
      field: "availableCollateral",
      headerName: t("collateral.list.availableCollateral"),
      flex: 1,
      minWidth: 176,
      headerAlign: "right",
      align: "right",
      sortComparator: (a: TokenAmount, b: TokenAmount) =>
        tokenAmountComparator(a, b),
      renderCell: ({ value: availableCollateral }) => (
        <Box display="flex" flexDirection="column">
          <Typography variant="text3">
            {formatTokenWithCommas(availableCollateral, {
              withSymbol: true,
            })}
          </Typography>

          <Typography variant="text4" color={COLORS.santasGrey}>
            {getTokenValueSuffix(availableCollateral) || "$0"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "totalDeposited",
      headerName: t("collateral.list.totalDeposited"),
      flex: 1,
      minWidth: 176,
      headerAlign: "right",
      align: "right",
      sortComparator: (a: TokenAmount, b: TokenAmount) =>
        !a || !b ? 0 : tokenAmountComparator(a, b),
      renderCell: ({ value: totalDeposited }) => (
        <Box display="flex" flexDirection="column">
          <Typography variant="text3">
            {formatTokenWithCommas(totalDeposited, {
              withSymbol: true,
            })}
          </Typography>

          <Typography variant="text4" color={COLORS.santasGrey}>
            {getTokenValueSuffix(totalDeposited) || "$0"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "totalLiquidated",
      headerName: t("collateral.list.totalLiquidated"),
      minWidth: 176,
      headerAlign: "right",
      align: "right",
      sortComparator: (a: TokenAmount, b: TokenAmount) =>
        !a || !b ? 0 : tokenAmountComparator(a, b),
      renderCell: ({ value: totalLiquidated }) => (
        <Box display="flex" flexDirection="column">
          <Typography variant="text3">
            {formatTokenWithCommas(totalLiquidated, {
              withSymbol: true,
            })}
          </Typography>

          <Typography variant="text4" color={COLORS.santasGrey}>
            {getTokenValueSuffix(totalLiquidated) || "$0"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "contract",
      sortable: false,
      headerName: "",
      minWidth: 100,
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: ({ row }) => (
        <Button
          variant="contained"
          color="secondary"
          size="small"
          onClick={() => setSelectedCollateralContract(row)}
        >
          View
        </Button>
      ),
    },
  ]

  if (collateralContracts.length === 0) return null

  return (
    <DataGrid
      sx={{
        overflow: "auto",
        maxWidth: "calc(100vw - 267px)",
        paddingRight: "16px",

        "& .MuiDataGrid-row": {
          "&:hover": {
            bgcolor: "transparent",
          },
        },

        "& .MuiDataGrid-columnHeader": {
          padding: 0,
        },

        "& .MuiDataGrid-cell": {
          padding: 0,
          minHeight: "52px",
          height: "auto",
          cursor: "default",
        },
      }}
      rows={collateralContracts || []}
      columns={columns}
      columnHeaderHeight={40}
      getRowHeight={() => "auto"}
      getRowId={(row) => row.address}
    />
  )
}
